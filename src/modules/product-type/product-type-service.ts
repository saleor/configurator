import type { ProductTypeInput, ProductTypeCreateInput, ProductTypeUpdateInput } from "../config/schema";
import { logger } from "../../lib/logger";
import type { AttributeService } from "../attribute/attribute-service";
import type { ProductTypeOperations, ProductType } from "./repository";

export class ProductTypeService {
  constructor(
    private repository: ProductTypeOperations,
    private attributeService: AttributeService
  ) {}

  private async upsert(name: string, hasVariantAttributes: boolean = false) {
    logger.debug("Looking up product type", { name });
    const existingProductType =
      await this.repository.getProductTypeByName(name);
    if (existingProductType) {
      logger.debug("Found existing product type", {
        id: existingProductType.id,
        name: existingProductType.name,
      });
      return existingProductType;
    }

    logger.debug("Creating new product type", { name, hasVariants: hasVariantAttributes });
    return this.repository.createProductType({
      name,
      kind: "NORMAL",
      hasVariants: hasVariantAttributes,
      isShippingRequired: false,
      taxClass: null,
    });
  }

  private filterOutAssignedAttributes(
    productType: ProductType,
    attributeIds: string[],
    assignmentType: "productAttributes" | "variantAttributes"
  ) {
    const existingAttributeIds = new Set(
      assignmentType === "productAttributes" 
        ? productType.productAttributes?.map((attr) => attr.id) ?? []
        : productType.variantAttributes?.map((attr) => attr.id) ?? []
    );
    const filteredIds = attributeIds.filter(
      (id) => !existingAttributeIds.has(id)
    );

    return filteredIds;
  }

  async createProductType(input: ProductTypeCreateInput) {
    logger.debug("Creating new product type", { name: input.name });
    return this.repository.createProductType({
      name: input.name,
      kind: "NORMAL",
      hasVariants: false,
      isShippingRequired: false,
      taxClass: null,
    });
  }

  async updateProductType(productType: ProductType, input: ProductTypeUpdateInput) {
    logger.debug("Updating product type", { 
      id: productType.id, 
      name: input.name 
    });

    // Handle product attributes
    if (input.productAttributes) {
      await this.handleAttributes(productType, input.productAttributes, "PRODUCT_TYPE", "productAttributes");
    }

    // Handle variant attributes 
    if (input.variantAttributes) {
      await this.handleAttributes(productType, input.variantAttributes, "PRODUCT_TYPE", "variantAttributes");
    }

    logger.debug("Product type update completed", {
      name: input.name,
      productAttributesCount: input.productAttributes?.length || 0,
      variantAttributesCount: input.variantAttributes?.length || 0,
    });
  }

  private async handleAttributes(
    productType: ProductType, 
    attributes: ProductTypeUpdateInput["productAttributes"], 
    attributeType: "PRODUCT_TYPE",
    assignmentType: "productAttributes" | "variantAttributes"
  ) {
    if (!attributes) return;

    // Check which attributes exist globally in Saleor
    const allExistingAttributes = await this.attributeService.repo.getAttributesByNames({
      names: attributes.map(a => a.name),
      type: attributeType,
    });

    const existingAttributeNames = allExistingAttributes?.map(attr => attr.name) || [];
    const assignedAttributeNames = assignmentType === "productAttributes" 
      ? productType.productAttributes?.map(attr => attr.name) || []
      : productType.variantAttributes?.map(attr => attr.name) || [];
    
    // Separate attributes into create vs update vs assign
    const attributesToCreate = attributes.filter(
      (a) => !existingAttributeNames.includes(a.name)
    );
    
    const attributesToUpdate = attributes.filter(
      (a) => existingAttributeNames.includes(a.name) && assignedAttributeNames.includes(a.name)
    );

    const attributesToAssign = attributes.filter(
      (a) => existingAttributeNames.includes(a.name) && !assignedAttributeNames.includes(a.name)
    );

    // Handle attribute updates
    const updatedAttributes = [];
    if (attributesToUpdate.length > 0) {
      logger.debug("Updating existing attributes", { count: attributesToUpdate.length, type: assignmentType });
      
      // Get existing attributes from Saleor to compare values
      const existingAttributes = await this.attributeService.repo.getAttributesByNames({
        names: attributesToUpdate.map(a => a.name),
        type: attributeType,
      });

      if (allExistingAttributes) {
        for (const inputAttr of attributesToUpdate) {
          const existingAttr = allExistingAttributes.find(attr => attr.name === inputAttr.name);
          if (existingAttr) {
            const updated = await this.attributeService.updateAttribute({
              ...inputAttr,
              type: attributeType,
            }, existingAttr);
            updatedAttributes.push(updated);
          }
        }
      }
    }

    // Handle attribute creation
    const createdAttributes = [];
    if (attributesToCreate.length > 0) {
      logger.debug("Creating new attributes", { count: attributesToCreate.length });
      const newAttributes = await this.attributeService.bootstrapAttributes({
        attributeInputs: attributesToCreate.map((a) => ({
          ...a,
          type: attributeType,
        })),
      });
      createdAttributes.push(...newAttributes);
    }

    // Get existing attributes that need to be assigned
    const existingAttributesToAssign = [];
    if (attributesToAssign.length > 0 && allExistingAttributes) {
      for (const inputAttr of attributesToAssign) {
        const existingAttr = allExistingAttributes.find(attr => attr.name === inputAttr.name);
        if (existingAttr) {
          existingAttributesToAssign.push(existingAttr.id);
        }
      }
    }

    // Assign new attributes to product type
    const allAttributeIdsToAssign = [
      ...createdAttributes.map((attr) => attr.id),
      ...existingAttributesToAssign
    ];

    if (allAttributeIdsToAssign.length > 0) {
      const attributesToAssignFiltered = this.filterOutAssignedAttributes(
        productType,
        allAttributeIdsToAssign,
        assignmentType
      );

      if (attributesToAssignFiltered.length > 0) {
        logger.debug("Assigning attributes to product type", {
          type: assignmentType,
          count: attributesToAssignFiltered.length,
        });

        try {
          if (assignmentType === "productAttributes") {
            await this.repository.assignAttributesToProductType({
              productTypeId: productType.id,
              attributeIds: attributesToAssignFiltered,
            });
          } else {
            await this.repository.assignVariantAttributesToProductType({
              productTypeId: productType.id,
              attributeIds: attributesToAssignFiltered,
            });
          }
          logger.debug("Successfully assigned attributes to product type", {
            type: assignmentType,
            count: attributesToAssignFiltered.length,
          });
        } catch (error) {
          logger.error("Failed to assign attributes to product type", {
            error: error instanceof Error ? error.message : "Unknown error",
            type: assignmentType,
            count: attributesToAssignFiltered.length,
          });
          throw error;
        }
      }
    }

    logger.debug("Attribute handling completed", {
      type: assignmentType,
      createdAttributes: createdAttributes.length,
      updatedAttributes: updatedAttributes.length,
    });

    return productType;
  }

  async bootstrapProductType(input: ProductTypeInput) {
    logger.debug("Bootstrapping product type", {
      name: input.name,
    });

    // Determine if this product type needs variants enabled
    const hasVariantAttributes = 'variantAttributes' in input && 
      input.variantAttributes && 
      input.variantAttributes.length > 0;

    const productType = await this.upsert(input.name, hasVariantAttributes);

    // Check if this is an update input (has productAttributes or variantAttributes)
    if ('productAttributes' in input || 'variantAttributes' in input) {
      return this.updateProductType(productType, input as ProductTypeUpdateInput);
    }

    // It's a create input, return the created/found product type
    return productType;
  }
}
