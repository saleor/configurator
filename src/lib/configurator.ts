import type { SaleorBuilder } from "./builder";

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

type AttributeInput = {
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
  constructor(private client: SaleorBuilder) {}

  bootstrap(config: SaleorConfig) {
    if (config.productTypes) {
      config.productTypes.forEach((productType) => {
        this.client.createProductTypeWithAttributes(productType);
      });
    }
  }
}
