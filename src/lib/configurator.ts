import { ProductTypeBootstraper } from "./bootstraper/product-types-bootstraper";
import { ChannelBootstraper } from "./bootstraper/channel-bootstraper";
import type { CountryCode, SaleorClient } from "./saleor-client";

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

export type ChannelInput = {
  name: string;
  currencyCode: string;
  defaultCountry: CountryCode;
  slug: string;
};

export type SaleorConfig = {
  productTypes?: Array<{
    name: string;
    attributes: AttributeInput[];
  }>;
  channels?: Array<ChannelInput>;
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

    if (config.channels) {
      const channelBootstraper = new ChannelBootstraper(this.client);

      config.channels.forEach((channel) => {
        channelBootstraper.bootstrapChannel(channel);
      });
    }
  }
}
