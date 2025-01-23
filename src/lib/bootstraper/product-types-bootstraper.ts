import type { SaleorConfig } from "../configurator";
import type {
  Attribute,
  ProductType,
  BootstrapClient,
} from "../saleor-client/bootstrap-client";
import { AttributeBootstraper } from "./attribute-bootstraper";

type ProductTypeWithAttributesInput = NonNullable<
  SaleorConfig["productTypes"]
>[number];

/**
 * @description Orchestrating the mutations needed to create product types in Saleor.
 */
export class ProductTypeBootstraper {
  constructor(private client: BootstrapClient) {}

  private async getOrCreateProductType(name: string): Promise<ProductType> {
    const productType = await this.client.getProductTypeByName(name);

    const isProductType = productType?.name === name;

    if (!isProductType) {
      console.log("Product type not found, creating...");
      return this.client.createProductType({ name });
    }

    console.log("Product type already exists", productType);

    return productType;
  }

  private filterOutExistingAttributes(
    productType: ProductType,
    attributes: Attribute[]
  ) {
    const productTypeAttributesNames = productType.productAttributes?.map(
      (attribute) => attribute.name
    );

    return attributes.filter(
      (attribute) => !productTypeAttributesNames?.includes(attribute.name)
    );
  }

  async bootstrapProductType(input: ProductTypeWithAttributesInput) {
    console.log("Bootstrapping product type", input);
    const attributeBootstraper = new AttributeBootstraper(this.client);
    const attributes = await attributeBootstraper.bootstrapAttributes({
      attributeInputs: input.attributes,
      type: "PRODUCT_TYPE",
    });

    const productType = await this.getOrCreateProductType(input.name);

    const attributesToAssign = this.filterOutExistingAttributes(
      productType,
      attributes
    );

    if (!attributesToAssign.length) {
      console.log("No attributes to assign");
      return;
    }

    await this.client.assignAttributesToProductType({
      productTypeId: productType.id,
      attributeIds: attributesToAssign.map((attribute) => attribute.id),
    });

    console.log("Attributes assigned to product type");
  }
}
