import type { ProductType, SaleorClient } from "../saleor-client";
import type { AttributeInput, SaleorConfig } from "../configurator";

type ProductTypeWithAttributesInput = NonNullable<
  SaleorConfig["productTypes"]
>[number];

/**
 * @description Orchestrating the mutations needed to create product types in Saleor.
 */
export class ProductTypeBootstraper {
  constructor(private client: SaleorClient) {}

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

  private async getOrCreateAttributes(attributeInputs: AttributeInput[]) {
    const names = attributeInputs.map((attribute) => attribute.name);
    const attributes = await this.client.getAttributesByNames(names);

    if (!attributes) {
      console.log("Attributes not found, creating...");
      return await Promise.all(
        attributeInputs.map((attribute) => {
          const slug = attribute.name.toLowerCase().replace(/ /g, "-");
          const type = "PRODUCT_TYPE";
          const name = attribute.name;
          const inputType = attribute.inputType;

          if (attribute.inputType === "DROPDOWN") {
            return this.client.createAttribute({
              name,
              type,
              slug,
              inputType,
              values: attribute.values.map((value) => ({
                name: value.name,
              })),
            });
          }

          return this.client.createAttribute({
            name,
            type,
            slug,
            inputType: attribute.inputType,
          });
        })
      );
    }

    console.log("Attributes already exist", attributes);

    return attributes;
  }

  private async verifyIfAttributesExist(
    productType: ProductType,
    attributeInputs: AttributeInput[]
  ) {
    const names = attributeInputs.map((attribute) => attribute.name);

    const productTypeAttributesNames = productType.productAttributes?.map(
      (attribute) => attribute.name
    );

    return names.every((name) => productTypeAttributesNames?.includes(name));
  }

  async bootstrapProductType(input: ProductTypeWithAttributesInput) {
    const attributes = await this.getOrCreateAttributes(input.attributes);

    const productType = await this.getOrCreateProductType(input.name);

    const isAttributesAlreadyAssigned = await this.verifyIfAttributesExist(
      productType,
      input.attributes
    );

    if (isAttributesAlreadyAssigned) {
      console.log("Attributes already assigned to product type");
      return;
    }

    await this.client.assignAttributesToProductType({
      productTypeId: productType.id,
      attributeIds: attributes.map((attribute) => attribute.id),
    });

    console.log("Attributes assigned to product type");
  }
}
