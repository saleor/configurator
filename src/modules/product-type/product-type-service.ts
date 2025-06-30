import type {
  ProductTypeInput,
  ProductTypeCreateInput,
  ProductTypeUpdateInput,
} from "../config/schema";
import { logger } from "../../lib/logger";
import type { AttributeService } from "../attribute/attribute-service";
import type { ProductTypeOperations, ProductType } from "./repository";

export class ProductTypeService {
  constructor(
    private repository: ProductTypeOperations,
    private attributeService: AttributeService
  ) {}

  private async upsert(name: string) {
    logger.debug("Looking up product type", { name });
    const existingProductType = await this.repository.getProductTypeByName(name);
    if (existingProductType) {
      logger.debug("Found existing product type", {
        id: existingProductType.id,
        name: existingProductType.name,
      });
      return existingProductType;
    }

    logger.debug("Creating new product type", { name });
    return this.repository.createProductType({
      name,
      kind: "NORMAL",
      hasVariants: false,
      isShippingRequired: false,
      taxClass: null,
    });
  }

  private filterOutAssignedAttributes(productType: ProductType, attributeIds: string[]) {
    const existingAttributeIds = new Set(
      productType.productAttributes?.map((attr) => attr.id) ?? []
    );
    const filteredIds = attributeIds.filter((id) => !existingAttributeIds.has(id));

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
      name: input.name,
    });

    // Get existing attributes by name for this product type
    const existingAttributeNames = productType.productAttributes?.map((attr) => attr.name) || [];

    // Separate attributes into create vs update
    const attributesToCreate = input.attributes.filter(
      (a) => !existingAttributeNames.includes(a.name)
    );

    const attributesToUpdate = input.attributes.filter((a) =>
      existingAttributeNames.includes(a.name)
    );

    // Handle attribute updates
    const updatedAttributes = [];
    if (attributesToUpdate.length > 0) {
      logger.debug("Updating existing attributes", { count: attributesToUpdate.length });

      // Get existing attributes from Saleor to compare values
      const existingAttributes = await this.attributeService.repo.getAttributesByNames({
        names: attributesToUpdate.map((a) => a.name),
        type: "PRODUCT_TYPE",
      });

      if (existingAttributes) {
        for (const inputAttr of attributesToUpdate) {
          const existingAttr = existingAttributes.find((attr) => attr.name === inputAttr.name);
          if (existingAttr) {
            const updated = await this.attributeService.updateAttribute(
              {
                ...inputAttr,
                type: "PRODUCT_TYPE",
              },
              existingAttr
            );
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
          type: "PRODUCT_TYPE",
        })),
      });
      createdAttributes.push(...newAttributes);
    }

    // Assign new attributes to product type
    if (createdAttributes.length > 0) {
      const attributesToAssign = this.filterOutAssignedAttributes(
        productType,
        createdAttributes.map((attr) => attr.id)
      );

      if (attributesToAssign.length > 0) {
        logger.debug("Assigning new attributes to product type", {
          name: input.name,
          count: attributesToAssign.length,
        });

        try {
          await this.repository.assignAttributesToProductType({
            productTypeId: productType.id,
            attributeIds: attributesToAssign,
          });
          logger.debug("Successfully assigned attributes to product type", {
            name: input.name,
            count: attributesToAssign.length,
          });
        } catch (error) {
          logger.error("Failed to assign attributes to product type", {
            error: error instanceof Error ? error.message : "Unknown error",
            name: input.name,
            count: attributesToAssign.length,
          });
          throw error;
        }
      }
    }

    logger.debug("Product type update completed", {
      name: input.name,
      createdAttributes: createdAttributes.length,
      updatedAttributes: updatedAttributes.length,
    });

    return productType;
  }

  async bootstrapProductType(input: ProductTypeInput) {
    logger.debug("Bootstrapping product type", {
      name: input.name,
    });

    const productType = await this.upsert(input.name);

    // Check if this is an update input (has attributes)
    if ("attributes" in input) {
      return this.updateProductType(productType, input as ProductTypeUpdateInput);
    }

    // It's a create input, return the created/found product type
    return productType;
  }
}
