import { logger } from "../../lib/logger";
import type { AttributeService } from "../attribute/attribute-service";
import { isReferencedAttribute } from "../attribute/attribute-service";
import { DuplicateAttributeDefinitionError } from "../attribute/errors";
import type {
  AttributeInput,
  SimpleAttribute,
} from "../config/schema/attribute.schema";
import type { ProductTypeInput } from "../config/schema/schema";
import type { ProductType, ProductTypeOperations } from "./repository";

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
    logger.debug("Looking up product type", { name });
    const existingProductType = await this.repository.getProductTypeByName(
      name
    );

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
  }

  async updateProductType(productType: ProductType, input: ProductTypeInput) {
    logger.debug("Updating product type", {
      id: productType.id,
      name: input.name,
      input,
    });

    const {
      createdAttributes: createdProductAttrs,
      updatedAttributes: updatedProductAttrs,
    } = await this.upsertAndAssignAttributes(
      productType,
      input.productAttributes?.map((a) => ({ ...a, type: "PRODUCT_TYPE" })) ??
        [],
      "PRODUCT"
    );

    const {
      createdAttributes: createdVariantAttrs,
      updatedAttributes: updatedVariantAttrs,
    } = await this.upsertAndAssignAttributes(
      productType,
      input.variantAttributes?.map((a) => ({ ...a, type: "PRODUCT_TYPE" })) ??
        [],
      "VARIANT"
    );

    logger.debug("Product type update completed", {
      name: input.name,
      createdAttributes:
        createdProductAttrs.length + createdVariantAttrs.length,
      updatedAttributes:
        updatedProductAttrs.length + updatedVariantAttrs.length,
    });

    return productType;
  }

  private async getExistingAttributesToAssign(
    productType: ProductType,
    inputAttributes: AttributeInput[]
  ) {
    const existingAttributeNames = [
      ...(productType.productAttributes?.map((a) => a.name) ?? []),
      ...(productType.variantAttributes?.map((a) => a.name) ?? []),
    ].filter((name): name is string => name !== null);

    const referencedAttributeIds =
      await this.attributeService.resolveReferencedAttributes(
        inputAttributes,
        "PRODUCT_TYPE",
        existingAttributeNames
      );

    return referencedAttributeIds;
  }

  private async upsertAndAssignAttributes(
    productType: ProductType,
    inputAttributes: AttributeInput[],
    type: "PRODUCT" | "VARIANT"
  ) {
    const updatedAttributes = await this.updateAttributes(
      productType,
      inputAttributes
    );

    const createdAttributes = await this.createAttributes(
      productType,
      inputAttributes
    );

    const existingAttributeIdsToAssign =
      await this.getExistingAttributesToAssign(productType, inputAttributes);

    logger.debug("Existing attributes to assign", {
      inputAttributes,
      existingAttributeIdsToAssign: existingAttributeIdsToAssign.length,
      productTypeName: productType.name,
    });

    const attributeToAssignIds = [
      ...createdAttributes.map((a) => a.id),
      ...existingAttributeIdsToAssign,
    ];

    if (attributeToAssignIds.length > 0) {
      await this.repository.assignAttributesToProductType({
        productTypeId: productType.id,
        attributeIds: attributeToAssignIds,
        type,
      });
    }

    return { createdAttributes, updatedAttributes };
  }

  private async updateAttributes(
    productType: ProductType,
    inputAttributes: AttributeInput[]
  ) {
    const updatedAttributes = [];

    const existingAttributeNames =
      productType.productAttributes?.map((attr) => attr.name) || [];

    const attributesToUpdate = inputAttributes.filter((a) => {
      // Exclude attributes that are referenced by slug, they are only meant to be assigned to the product type
      if (isReferencedAttribute(a)) {
        return false;
      }

      return existingAttributeNames.includes(a.name);
    }) as SimpleAttribute[];

    if (attributesToUpdate.length > 0) {
      logger.debug("Updating existing attributes", {
        count: attributesToUpdate.length,
      });
      const existingAttributes =
        await this.attributeService.repo.getAttributesByNames({
          names: attributesToUpdate.map((a) => a.name),
          type: "PRODUCT_TYPE",
        });
      if (existingAttributes) {
        for (const inputAttr of attributesToUpdate) {
          const existingAttr = existingAttributes.find(
            (attr) => attr.name === inputAttr.name
          );
          if (existingAttr) {
            const updated = await this.attributeService.updateAttribute(
              { ...inputAttr, type: "PRODUCT_TYPE" },
              existingAttr
            );
            updatedAttributes.push(updated);
          }
        }
      }
    }
    return updatedAttributes;
  }

  private async createAttributes(
    productType: ProductType,
    inputAttributes: AttributeInput[]
  ) {
    const existingProductAttributeNames =
      productType.productAttributes?.map((attr) => attr.name) || [];

    const existingVariantAttributeNames =
      productType.variantAttributes?.map((attr) => attr.name) || [];

    const attributesToProcess = inputAttributes.filter((a) => {
      // Exclude attributes that are referenced by slug, they are only meant to be assigned to the product type
      if (isReferencedAttribute(a)) {
        return false;
      }

      return (
        !existingProductAttributeNames.includes(a.name) &&
        !existingVariantAttributeNames.includes(a.name)
      );
    }) as SimpleAttribute[];

    const newAttributes = [];

    for (const attributeInput of attributesToProcess) {
      // Check if the attribute already exists globally
      const existingAttributes =
        await this.attributeService.repo.getAttributesByNames({
          names: [attributeInput.name],
          type: "PRODUCT_TYPE",
        });

      if (existingAttributes && existingAttributes.length > 0) {
        // Attribute already exists globally, suggest using reference syntax
        throw new DuplicateAttributeDefinitionError(
          `Attribute "${attributeInput.name}" is already defined elsewhere in the configuration. Use reference syntax instead: "attribute: ${attributeInput.name}". This encourages reuse and prevents conflicts.`
        );
      }

      // Create the attribute since it doesn't exist
      const createdAttributes = await this.attributeService.bootstrapAttributes(
        {
          attributeInputs: [
            {
              ...attributeInput,
              type: "PRODUCT_TYPE",
            },
          ],
        }
      );

      const createdAttribute = createdAttributes[0];

      newAttributes.push(createdAttribute);
    }

    return newAttributes;
  }

  async bootstrapProductType(input: ProductTypeInput) {
    logger.debug("Bootstrapping product type", {
      name: input.name,
      isShippingRequired: input.isShippingRequired,
    });

    const productType = await this.upsert({
      name: input.name,
      isShippingRequired: input.isShippingRequired,
    });

    return this.updateProductType(productType, input);
  }
}
