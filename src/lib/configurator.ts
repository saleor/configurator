import { ProductTypeBootstraper } from "./bootstraper/product-types-bootstraper";
import type { SaleorClient } from "./saleor-client";

type AttributeTypeInput =
  | {
      inputType: "DROPDOWN";
      values: { name: string }[];
    }
  | {
      inputType: "PLAIN_TEXT";
    }
  | {
      inputType: "NUMERIC";
    };

export type AttributeInput = {
  name: string;
} & AttributeTypeInput;

export type SaleorConfig = {
  productTypes?: Array<{
    name: string;
    attributes: AttributeInput[];
  }>;
};

/**
 * @description Parsing the configuration and triggering the commands.
 */
export class SaleorConfigurator {
  constructor(private client: SaleorClient) {}

  bootstrap(config: SaleorConfig) {
    if (config.productTypes) {
      const productTypeBootstraper = new ProductTypeBootstraper(this.client);

      config.productTypes.forEach((productType) => {
        productTypeBootstraper.bootstrapProductType(productType);
      });
    }
  }
}
