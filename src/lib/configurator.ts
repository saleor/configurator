import { ProductTypeBootstraper } from "./bootstraper/product-types-bootstraper";
import { ChannelBootstraper } from "./bootstraper/channel-bootstraper";
import type { CountryCode, SaleorClient } from "./saleor-client";
import { PageTypeBootstraper } from "./bootstraper/page-types-bootstraper";

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

type ProductTypeInput = {
  name: string;
  attributes: AttributeInput[];
};

export type PageTypeInput = {
  name: string;
  attributes: AttributeInput[];
};

export type SaleorConfig = {
  productTypes?: Array<ProductTypeInput>;
  channels?: Array<ChannelInput>;
  pageTypes?: Array<PageTypeInput>;
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

    if (config.pageTypes) {
      const pageTypeBootstraper = new PageTypeBootstraper(this.client);

      config.pageTypes.forEach((pageType) => {
        pageTypeBootstraper.bootstrapPageType(pageType);
      });
    }
  }
}
