import { logger } from "../../lib/logger";
import type { AttributeService } from "../attribute/attribute-service";
import type {
  AttributeInput,
  ProductTypeCreateInput,
  ProductTypeInput,
  ProductTypeUpdateInput,
} from "../config/schema";
import type { ProductType, ProductTypeOperations } from "./repository";

export class ProductTypeService {
  constructor(
    private repository: ProductTypeOperations,
    private attributeService: AttributeService
  ) {}

  private async upsert(name: string) {
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

  async updateProductType(
    productType: ProductType,
    input: ProductTypeUpdateInput
  ) {
    logger.debug("Updating product type", {
      id: productType.id,
      name: input.name,
    });

    const {
      createdAttributes: createdProductAttrs,
      updatedAttributes: updatedProductAttrs,
    } = await this.upsertAndAssignAttributes(
      productType,
      input.productAttributes.map((a) => ({ ...a, type: "PRODUCT_TYPE" })),
      "PRODUCT"
    );

    const {
      createdAttributes: createdVariantAttrs,
      updatedAttributes: updatedVariantAttrs,
    } = await this.upsertAndAssignAttributes(
      productType,
      input.variantAttributes.map((a) => ({ ...a, type: "PRODUCT_TYPE" })),
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

    if (createdAttributes.length > 0) {
      await this.assignAttributesToProductType(
        productType,
        createdAttributes.map((a) => a.id),
        type
      );
    }

    return { createdAttributes, updatedAttributes };
  }

  private async updateAttributes(
    productType: ProductType,
    inputAttributes: AttributeInput[]
  ) {
    const existingAttributeNames =
      productType.productAttributes?.map((attr) => attr.name) || [];
    const attributesToUpdate = inputAttributes.filter((a) =>
      existingAttributeNames.includes(a.name)
    );
    const updatedAttributes = [];
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
    const existingAttributeNames =
      productType.productAttributes?.map((attr) => attr.name) || [];
    const attributesToCreate = inputAttributes.filter(
      (a) => !existingAttributeNames.includes(a.name)
    );
    if (attributesToCreate.length === 0) return [];
    logger.debug("Creating new attributes", {
      count: attributesToCreate.length,
    });
    const newAttributes = await this.attributeService.bootstrapAttributes({
      attributeInputs: attributesToCreate.map((a) => ({
        ...a,
        type: "PRODUCT_TYPE",
      })),
    });
    return newAttributes;
  }

  private async assignAttributesToProductType(
    productType: ProductType,
    attributeIds: string[],
    type: "PRODUCT" | "VARIANT"
  ) {
    const attributesToAssign = this.filterOutAssignedAttributes(
      productType,
      attributeIds
    );
    if (attributesToAssign.length > 0) {
      logger.debug("Assigning new attributes", {
        count: attributesToAssign.length,
      });
      await this.repository.assignAttributesToProductType({
        productTypeId: productType.id,
        attributeIds: attributesToAssign,
        type: "PRODUCT",
      });
    }
  }

  async bootstrapProductType(input: ProductTypeInput) {
    logger.debug("Bootstrapping product type", {
      name: input.name,
    });

    const productType = await this.upsert(input.name);

    // Check if this is an update input (has attributes)
    if ("attributes" in input) {
      return this.updateProductType(
        productType,
        input as ProductTypeUpdateInput
      );
    }

    // It's a create input, return the created/found product type
    return productType;
  }
}
