import type { SaleorConfig } from "../../config/schema";
import type { AttributeService } from "../attribute/service";
import type { ProductTypeOperations, ProductType } from "./repository";

type ProductTypeInput = NonNullable<SaleorConfig["productTypes"]>[number];

export class ProductTypeService {
  constructor(
    private repository: ProductTypeOperations,
    private attributeService: AttributeService
  ) {}

  private async getOrCreate(name: string) {
    const existingProductType =
      await this.repository.getProductTypeByName(name);
    if (existingProductType) {
      return existingProductType;
    }

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
    return attributeIds.filter((id) => !existingAttributeIds.has(id));
  }

  async bootstrapProductType({
    name,
    attributes,
  }: {
    name: string;
    attributes: ProductTypeInput["attributes"];
  }) {
    const productType = await this.getOrCreate(name);

    if (!attributes?.length) {
      return productType;
    }

    const createdAttributes = await this.attributeService.bootstrapAttributes({
      attributeInputs: attributes,
      type: "PRODUCT_TYPE",
    });

    if (!createdAttributes.length) {
      return productType;
    }

    const attributesToAssign = this.filterOutAssignedAttributes(
      productType,
      createdAttributes.map((attr) => attr.id)
    );

    if (attributesToAssign.length > 0) {
      await this.repository.assignAttributesToProductType({
        productTypeId: productType.id,
        attributeIds: attributesToAssign,
      });
    }

    return productType;
  }
}
