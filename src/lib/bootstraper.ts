import type { SaleorClient } from "./saleor-client";
import type { SaleorConfig } from "./configurator";

type ProductTypeWithAttributesInput = NonNullable<
  SaleorConfig["productTypes"]
>[number];

/**
 * @description Orchestrating the mutations needed to create data types in Saleor.
 */
export class SaleorBootstraper {
  constructor(private client: SaleorClient) {}

  async createProductTypeWithAttributes(input: ProductTypeWithAttributesInput) {
    const attributes = await Promise.all(
      input.attributes.map((attribute) => {
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

    if (!attributes) {
      throw new Error("Failed to create attributes");
    }

    console.log("Attributes created", attributes);

    const productType = await this.client.createProductType({
      name: input.name,
    });

    if (!productType) {
      throw new Error("Failed to create product type");
    }

    console.log("Product type created", productType);

    await this.client.assignAttributesToProductType({
      productTypeId: productType.id,
      attributeIds: attributes.map((attribute) => attribute.id),
    });

    console.log("Attributes assigned to product type");
  }
}
