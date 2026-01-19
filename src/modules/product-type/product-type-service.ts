import { logger } from "../../lib/logger";
import { ServiceErrorWrapper } from "../../lib/utils/error-wrapper";
import type { AttributeService } from "../attribute/attribute-service";
import { isReferencedAttribute } from "../attribute/attribute-service";
import type { Attribute } from "../attribute/repository";
import {
  type AttributeInput,
  type SimpleAttribute,
  VARIANT_SELECTION_SUPPORTED_TYPES,
} from "../config/schema/attribute.schema";
import type { ProductTypeInput } from "../config/schema/schema";
import {
  ProductTypeAttributeValidationError,
  ProductTypeCreationError,
  ProductTypeUpdateError,
} from "./errors";
import type { AttributeAssignmentInput, ProductType, ProductTypeOperations } from "./repository";

/** Type guard to check if an attribute has variantSelection enabled */
function hasVariantSelection(
  attr: AttributeInput
): attr is AttributeInput & { variantSelection: true } {
  return "variantSelection" in attr && attr.variantSelection === true;
}

/** Get the name of an attribute (handles both inline and referenced formats) */
function getAttributeName(attr: AttributeInput): string {
  return isReferencedAttribute(attr) ? attr.attribute : attr.name;
}

/** Build a map of attribute names to variantSelection for attributes with variantSelection: true */
function buildVariantSelectionMap(
  attributes: AttributeInput[],
  filterFn: (attr: AttributeInput) => boolean
): Map<string, true> {
  return new Map(
    attributes
      .filter(filterFn)
      .filter(hasVariantSelection)
      .map((attr) => [getAttributeName(attr), true] as const)
  );
}

/** Build a map of ALL attribute names to their variantSelection value (true or false) */
function buildFullVariantSelectionMap(attributes: AttributeInput[]): Map<string, boolean> {
  return new Map(
    attributes.map((attr) => [getAttributeName(attr), hasVariantSelection(attr)] as const)
  );
}

/** Extract referenced attribute names from input attributes */
function getReferencedAttributeNames(attributes: AttributeInput[]): string[] {
  return attributes.filter(isReferencedAttribute).map((attr) => attr.attribute);
}

/** Validate variantSelection against attribute input types */
function validateVariantSelectionInputTypes(
  variantSelectionNames: string[],
  attributesByName: Map<string, Attribute>,
  productTypeName: string
): void {
  for (const attrName of variantSelectionNames) {
    const attr = attributesByName.get(attrName);
    if (!attr) {
      logger.warn(
        'Attribute "%s" referenced with variantSelection not found in resolved attributes for product type "%s"',
        attrName,
        productTypeName
      );
      continue;
    }
    if (!attr.inputType) {
      logger.debug(
        'Skipping variantSelection validation for attribute "%s" - no inputType available',
        attrName
      );
      continue;
    }

    const isSupported = VARIANT_SELECTION_SUPPORTED_TYPES.includes(
      attr.inputType as (typeof VARIANT_SELECTION_SUPPORTED_TYPES)[number]
    );

    if (!isSupported) {
      throw new ProductTypeAttributeValidationError(
        `Attribute "${attrName}" has variantSelection: true but input type "${attr.inputType}" does not support variant selection. ` +
          `Supported input types are: ${VARIANT_SELECTION_SUPPORTED_TYPES.join(", ")}`,
        productTypeName,
        attrName
      );
    }
  }
}

export class ProductTypeService {
  constructor(
    private repository: ProductTypeOperations,
    private attributeService: AttributeService
  ) {}

  private async upsert({
    name,
    isShippingRequired = false,
  }: {
    name: string;
    isShippingRequired?: boolean;
  }) {
    return ServiceErrorWrapper.wrapServiceCall(
      "upsert product type",
      "product type",
      name,
      async () => {
        logger.debug("Looking up product type", { name });
        const existingProductType = await this.repository.getProductTypeByName(name);

        if (existingProductType) {
          logger.debug("Found existing product type", {
            id: existingProductType.id,
            name: existingProductType.name,
          });
          return existingProductType;
        }

        logger.debug("Creating new product type", { name, isShippingRequired });

        return this.repository.createProductType({
          name,
          kind: "NORMAL",
          hasVariants: true,
          isShippingRequired,
          taxClass: null,
        });
      },
      ProductTypeCreationError
    );
  }

  async updateProductType(productType: ProductType, input: ProductTypeInput) {
    return ServiceErrorWrapper.wrapServiceCall(
      "update product type",
      "product type",
      input.name,
      async () => {
        logger.debug("Updating product type", {
          id: productType.id,
          name: input.name,
          input,
        });

        const { createdAttributes: createdProductAttrs, updatedAttributes: updatedProductAttrs } =
          await this.upsertAndAssignAttributes(
            productType,
            input.productAttributes?.map((a) => ({ ...a, type: "PRODUCT_TYPE" })) ?? [],
            "PRODUCT"
          );

        const { createdAttributes: createdVariantAttrs, updatedAttributes: updatedVariantAttrs } =
          await this.upsertAndAssignAttributes(
            productType,
            input.variantAttributes?.map((a) => ({ ...a, type: "PRODUCT_TYPE" })) ?? [],
            "VARIANT"
          );

        logger.debug("Product type update completed", {
          name: input.name,
          createdAttributes: createdProductAttrs.length + createdVariantAttrs.length,
          updatedAttributes: updatedProductAttrs.length + updatedVariantAttrs.length,
        });

        return productType;
      },
      ProductTypeUpdateError
    );
  }

  private async getExistingAttributesToAssign(
    productType: ProductType,
    inputAttributes: AttributeInput[]
  ): Promise<AttributeAssignmentInput[]> {
    const referencedAttrNames = getReferencedAttributeNames(inputAttributes);

    if (referencedAttrNames.length === 0) {
      return [];
    }

    // Fetch referenced attribute metadata for validation and assignment
    const resolvedAttributes = await this.attributeService.repo.getAttributesByNames({
      names: referencedAttrNames,
      type: "PRODUCT_TYPE",
    });

    // Fail-fast: validate resolution succeeded before doing any more work
    if (!resolvedAttributes) {
      logger.error("Failed to resolve referenced attributes", {
        productTypeName: productType.name,
        attributeNames: referencedAttrNames,
      });
      throw new ProductTypeAttributeValidationError(
        `Failed to resolve referenced attributes for product type "${productType.name}". ` +
          `This may indicate a network issue or that the attributes do not exist: ${referencedAttrNames.join(", ")}`,
        productType.name ?? "unknown",
        referencedAttrNames.join(", ")
      );
    }

    // Build lookup maps from resolved data
    const attributesByName = new Map(
      resolvedAttributes
        .filter((attr): attr is Attribute & { name: string } => Boolean(attr.name))
        .map((attr) => [attr.name, attr] as const)
    );

    // Build variantSelection map and validate input types (fail-fast)
    const variantSelectionByName = buildVariantSelectionMap(inputAttributes, isReferencedAttribute);
    validateVariantSelectionInputTypes(
      [...variantSelectionByName.keys()],
      attributesByName,
      productType.name ?? "unknown"
    );

    // Filter out already-assigned attributes
    const existingAttributeNames = new Set(
      [
        ...(productType.productAttributes?.map((a) => a.name) ?? []),
        ...(productType.variantAttributes?.map((a) => a.name) ?? []),
      ].filter((name): name is string => name !== null)
    );

    // Return attribute assignments with variantSelection
    return resolvedAttributes
      .filter((attr) => attr.name && !existingAttributeNames.has(attr.name))
      .map((attr) => ({
        id: attr.id,
        variantSelection: attr.name ? variantSelectionByName.get(attr.name) : undefined,
      }));
  }

  private async upsertAndAssignAttributes(
    productType: ProductType,
    inputAttributes: AttributeInput[],
    type: "PRODUCT" | "VARIANT"
  ) {
    const updatedAttributes = await this.updateAttributes(productType, inputAttributes);

    const createdAttributes = await this.createAttributes(productType, inputAttributes);

    const existingAttributesToAssign = await this.getExistingAttributesToAssign(
      productType,
      inputAttributes
    );

    logger.debug("Existing attributes to assign", {
      inputAttributes,
      existingAttributesToAssign: existingAttributesToAssign.length,
      productTypeName: productType.name,
    });

    // Build variantSelection map for inline (non-referenced) attributes
    const variantSelectionByName = buildVariantSelectionMap(
      inputAttributes,
      (attr) => !isReferencedAttribute(attr)
    );

    // Map created attributes to assignment inputs with variantSelection
    const createdAttributeAssignments: AttributeAssignmentInput[] = createdAttributes.map((a) => {
      if (!a.name) {
        logger.warn("Created attribute has no name, variantSelection cannot be applied", {
          attributeId: a.id,
          productTypeName: productType.name,
        });
      }
      return {
        id: a.id,
        variantSelection: a.name ? variantSelectionByName.get(a.name) : undefined,
      };
    });

    const attributesToAssign = [...createdAttributeAssignments, ...existingAttributesToAssign];

    if (attributesToAssign.length > 0) {
      await this.repository.assignAttributesToProductType({
        productTypeId: productType.id,
        attributes: attributesToAssign,
        type,
      });
    }

    // Update variantSelection on already-assigned attributes (VARIANT type only)
    if (type === "VARIANT") {
      await this.updateExistingAttributeAssignments(productType, inputAttributes);
    }

    return { createdAttributes, updatedAttributes };
  }

  /**
   * Updates variantSelection on attributes that are already assigned to the product type.
   * This handles the case where a user changes variantSelection on an existing assignment.
   */
  private async updateExistingAttributeAssignments(
    productType: ProductType,
    inputAttributes: AttributeInput[]
  ): Promise<void> {
    // Check if repository supports updates (optional method)
    if (!this.repository.updateAttributeAssignments) {
      logger.debug("Repository does not support updateAttributeAssignments, skipping");
      return;
    }

    // Get already-assigned variant attributes with their IDs
    const existingVariantAttrs = productType.variantAttributes ?? [];
    if (existingVariantAttrs.length === 0) {
      return;
    }

    // Build map of desired variantSelection from input (for both inline and referenced)
    const desiredVariantSelection = buildFullVariantSelectionMap(inputAttributes);

    // Find attributes that need updating
    // Currently-assigned attributes have variantSelection=false by default if not set
    // We need to find ones where desired !== current
    const attributesToUpdate: Array<{ id: string; variantSelection: boolean }> = [];

    for (const existingAttr of existingVariantAttrs) {
      if (!existingAttr.name) continue;

      const desiredValue = desiredVariantSelection.get(existingAttr.name);
      // If the attribute is not in the input, skip it (no desired change)
      if (desiredValue === undefined) continue;

      // We need to compare against the current state in Saleor
      // Since the ProductType response doesn't include variantSelection status,
      // we always update to the desired value when it's defined in input
      // This ensures the desired state is applied
      attributesToUpdate.push({
        id: existingAttr.id,
        variantSelection: desiredValue,
      });
    }

    if (attributesToUpdate.length === 0) {
      logger.debug("No existing attribute assignments need variantSelection updates");
      return;
    }

    logger.debug("Updating variantSelection on existing attribute assignments", {
      productTypeName: productType.name,
      updates: attributesToUpdate.map((u) => ({
        id: u.id,
        variantSelection: u.variantSelection,
      })),
    });

    await this.repository.updateAttributeAssignments({
      productTypeId: productType.id,
      operations: attributesToUpdate,
    });
  }

  private async updateAttributes(
    productType: ProductType,
    inputAttributes: AttributeInput[]
  ): Promise<Attribute[]> {
    const existingAttributeNames = new Set(
      productType.productAttributes?.map((attr) => attr.name) ?? []
    );

    const attributesToUpdate = inputAttributes.filter(
      (a): a is SimpleAttribute => !isReferencedAttribute(a) && existingAttributeNames.has(a.name)
    );

    if (attributesToUpdate.length === 0) {
      return [];
    }

    logger.debug("Updating existing attributes", { count: attributesToUpdate.length });

    const existingAttributes = await this.attributeService.repo.getAttributesByNames({
      names: attributesToUpdate.map((a) => a.name),
      type: "PRODUCT_TYPE",
    });

    if (!existingAttributes) {
      return [];
    }

    const updatedAttributes: Attribute[] = [];
    for (const inputAttr of attributesToUpdate) {
      const existingAttr = existingAttributes.find((attr) => attr.name === inputAttr.name);
      if (existingAttr) {
        const updated = await this.attributeService.updateAttribute(
          { ...inputAttr, type: "PRODUCT_TYPE" },
          existingAttr
        );
        updatedAttributes.push(updated);
      }
    }

    return updatedAttributes;
  }

  private async createAttributes(
    productType: ProductType,
    inputAttributes: AttributeInput[]
  ): Promise<Attribute[]> {
    const existingAttributeNames = new Set([
      ...(productType.productAttributes?.map((attr) => attr.name) ?? []),
      ...(productType.variantAttributes?.map((attr) => attr.name) ?? []),
    ]);

    const attributesToProcess = inputAttributes.filter(
      (a): a is SimpleAttribute => !isReferencedAttribute(a) && !existingAttributeNames.has(a.name)
    );

    const newAttributes: Attribute[] = [];

    for (const attributeInput of attributesToProcess) {
      // Check if the attribute already exists globally
      const existingAttributes = await this.attributeService.repo.getAttributesByNames({
        names: [attributeInput.name],
        type: "PRODUCT_TYPE",
      });

      if (existingAttributes && existingAttributes.length > 0) {
        // Reuse existing global attribute from previous deployment or another product type
        const existingAttribute = existingAttributes[0];
        logger.debug("Reusing existing global attribute", {
          attributeName: attributeInput.name,
          attributeId: existingAttribute.id,
          productTypeName: productType.name,
        });
        newAttributes.push(existingAttribute);
        continue;
      }

      // Create the attribute since it doesn't exist
      const createdAttributes = await this.attributeService.bootstrapAttributes({
        attributeInputs: [{ ...attributeInput, type: "PRODUCT_TYPE" }],
      });
      newAttributes.push(createdAttributes[0]);
    }

    return newAttributes;
  }

  async bootstrapProductType(input: ProductTypeInput) {
    logger.debug("Bootstrapping product type", {
      name: input.name,
      isShippingRequired: input.isShippingRequired,
    });

    // Validate REFERENCE attributes have entityType
    const allAttributes = [...(input.productAttributes || []), ...(input.variantAttributes || [])];
    for (const attr of allAttributes) {
      if (!isReferencedAttribute(attr) && "inputType" in attr && attr.inputType === "REFERENCE") {
        if (!("entityType" in attr) || !attr.entityType) {
          throw new ProductTypeAttributeValidationError(
            `Attribute "${attr.name}" is a REFERENCE type but missing required 'entityType'. ` +
              `Please specify entityType as "PAGE", "PRODUCT", or "PRODUCT_VARIANT" in your config.`,
            input.name,
            attr.name
          );
        }
      }
    }

    // Validate variantSelection is only used on variant attributes with supported input types
    // Note: For referenced attributes, validation happens in getExistingAttributesToAssign
    for (const attr of input.variantAttributes ?? []) {
      if (!hasVariantSelection(attr)) continue;
      if (isReferencedAttribute(attr)) continue;
      if (!("inputType" in attr)) continue;

      const isSupported = VARIANT_SELECTION_SUPPORTED_TYPES.includes(
        attr.inputType as (typeof VARIANT_SELECTION_SUPPORTED_TYPES)[number]
      );

      if (!isSupported) {
        throw new ProductTypeAttributeValidationError(
          `Attribute "${attr.name}" has variantSelection: true but input type "${attr.inputType}" does not support variant selection. ` +
            `Supported input types are: ${VARIANT_SELECTION_SUPPORTED_TYPES.join(", ")}`,
          input.name,
          attr.name
        );
      }
    }

    const productType = await this.upsert({
      name: input.name,
      isShippingRequired: input.isShippingRequired,
    });

    return this.updateProductType(productType, input);
  }
}
