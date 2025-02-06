import type { SaleorConfig } from "../config/schema";
import { logger } from "../../lib/logger";
import type { AttributeService } from "../attribute/attribute-service";
import type { ProductTypeOperations, ProductType } from "./repository";

type ProductTypeInput = NonNullable<SaleorConfig["productTypes"]>[number];

export class ProductTypeService {
  constructor(
    private repository: ProductTypeOperations,
    private attributeService: AttributeService
  ) {}

  private async getOrCreate(name: string) {
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

    logger.debug("Creating new product type", { name });
    return this.repository.createProductType({
      name,
      kind: "NORMAL",
      hasVariants: false,
      isShippingRequired: false,
      taxClass: null,
    });
  }

  private filterOutAssignedAttributes(
    productType: ProductType,
    attributeIds: string[]
  ) {
    const existingAttributeIds = new Set(
      productType.productAttributes?.map((attr) => attr.id) ?? []
    );
    const filteredIds = attributeIds.filter(
      (id) => !existingAttributeIds.has(id)
    );

    return filteredIds;
  }

  async bootstrapProductType({
    name,
    attributes,
  }: {
    name: string;
    attributes: ProductTypeInput["attributes"];
  }) {
    logger.debug("Bootstrapping product type", {
      name,
      attributeCount: attributes?.length ?? 0,
    });

    const productType = await this.getOrCreate(name);

    if (!attributes?.length) {
      logger.debug("No attributes to bootstrap for product type", { name });
      return productType;
    }

    logger.debug("Creating attributes for product type", {
      productType: name,
      attributeCount: attributes.length,
    });

    const createdAttributes = await this.attributeService.bootstrapAttributes({
      attributeInputs: attributes.map((a) => ({
        ...a,
        type: "PRODUCT_TYPE",
      })),
    });

    if (!createdAttributes.length) {
      logger.debug("No new attributes to assign to product type", { name });
      return productType;
    }

    const attributesToAssign = this.filterOutAssignedAttributes(
      productType,
      createdAttributes.map((attr) => attr.id)
    );

    if (attributesToAssign.length > 0) {
      logger.debug("Assigning attributes to product type", {
        name,
        count: attributesToAssign.length,
      });

      try {
        await this.repository.assignAttributesToProductType({
          productTypeId: productType.id,
          attributeIds: attributesToAssign,
        });
        logger.debug("Successfully assigned attributes to product type", {
          name,
          count: attributesToAssign.length,
        });
      } catch (error) {
        logger.error("Failed to assign attributes to product type", {
          error: error instanceof Error ? error.message : "Unknown error",
          name,
          count: attributesToAssign.length,
        });
        throw error;
      }
    }

    return productType;
  }
}
