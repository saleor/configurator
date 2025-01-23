import { ProductTypeBootstraper } from "./bootstraper/product-types-bootstraper";
import { ChannelBootstraper } from "./bootstraper/channel-bootstraper";
import { PageTypeBootstraper } from "./bootstraper/page-types-bootstraper";
import { AttributeBootstraper } from "./bootstraper/attribute-bootstraper";
import {
  BootstrapClient,
  type CountryCode,
} from "./saleor-client/bootstrap-client";
import type { Client } from "@urql/core";

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
    }
  | {
      inputType: "MULTISELECT";
      values: { name: string }[];
    }
  | {
      inputType: "DATE";
    }
  | {
      inputType: "BOOLEAN";
    }
  | {
      inputType: "RICH_TEXT";
    }
  | {
      inputType: "SWATCH";
      values: { name: string }[];
    }
  | {
      inputType: "DATE_TIME";
    }
  | {
      inputType: "FILE";
    };

export type AttributeInput = {
  name: string;
  type?: "PRODUCT_TYPE" | "PAGE_TYPE";
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
  attributes?: Array<AttributeInput>;
};

/**
 * @description Parsing the configuration and triggering the commands.
 */
export class SaleorConfigurator {
  private bootstrapClient: BootstrapClient;

  constructor(private client: Client) {
    this.bootstrapClient = new BootstrapClient(client);
  }

  bootstrap(config: SaleorConfig) {
    if (config.productTypes) {
      const productTypeBootstraper = new ProductTypeBootstraper(
        this.bootstrapClient
      );

      config.productTypes.forEach((productType) => {
        productTypeBootstraper.bootstrapProductType(productType);
      });
    }

    if (config.channels) {
      const channelBootstraper = new ChannelBootstraper(this.bootstrapClient);

      config.channels.forEach((channel) => {
        channelBootstraper.bootstrapChannel(channel);
      });
    }

    if (config.pageTypes) {
      const pageTypeBootstraper = new PageTypeBootstraper(this.bootstrapClient);

      config.pageTypes.forEach((pageType) => {
        pageTypeBootstraper.bootstrapPageType(pageType);
      });
    }

    if (config.attributes) {
      const attributeBootstraper = new AttributeBootstraper(this.client);

      config.attributes.forEach((attribute) => {
        if (!attribute.type) {
          throw new Error(
            "When bootstrapping attributes, the type (PRODUCT_TYPE or PAGE_TYPE) is required"
          );
        }

        attributeBootstraper.bootstrapAttributes({
          attributeInputs: [attribute],
          type: attribute.type,
        });
      });
    }
  }
}
