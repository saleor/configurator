import type { Client } from "@urql/core";
import { AttributeBootstraper } from "./bootstraper/attribute-bootstraper";
import { BootstrapClient } from "./bootstraper/bootstrap-client";
import { ChannelBootstraper } from "./bootstraper/channel-bootstraper";
import { PageTypeBootstraper } from "./bootstraper/page-types-bootstraper";
import { ProductTypeBootstraper } from "./bootstraper/product-types-bootstraper";
import { ShopBootstraper } from "./bootstraper/shop-bootstraper";
import { ConfigurationRetriever } from "./retrieve/configuration-retriever";
import { YamlConfigurationManager } from "./retrieve/yaml-configuration-manager";

/**
 * @description Parsing the configuration and triggering the commands.
 */
export class SaleorConfigurator {
  private bootstrapClient: BootstrapClient;

  constructor(private client: Client) {
    this.bootstrapClient = new BootstrapClient(client);
  }

  async bootstrap() {
    const yamlManager = new YamlConfigurationManager();
    const config = await yamlManager.load();

    if (config.shop) {
      const shopBootstraper = new ShopBootstraper(this.bootstrapClient);
      await shopBootstraper.bootstrapShop(config.shop);
    }

    if (config.productTypes) {
      const productTypeBootstraper = new ProductTypeBootstraper(
        this.bootstrapClient
      );

      for (const productType of config.productTypes) {
        await productTypeBootstraper.bootstrapProductType(productType);
      }
    }

    if (config.channels) {
      const channelBootstraper = new ChannelBootstraper(this.bootstrapClient);

      for (const channel of config.channels) {
        await channelBootstraper.bootstrapChannel(channel);
      }
    }

    if (config.pageTypes) {
      const pageTypeBootstraper = new PageTypeBootstraper(this.bootstrapClient);

      for (const pageType of config.pageTypes) {
        await pageTypeBootstraper.bootstrapPageType(pageType);
      }
    }

    if (config.attributes) {
      const attributeBootstraper = new AttributeBootstraper(
        this.bootstrapClient
      );

      for (const attribute of config.attributes) {
        if (!attribute.type) {
          throw new Error(
            "When bootstrapping attributes, the type (PRODUCT_TYPE or PAGE_TYPE) is required"
          );
        }

        await attributeBootstraper.bootstrapAttributes({
          attributeInputs: [attribute],
          type: attribute.type,
        });
      }
    }
  }

  async retrieve() {
    const configurationRetriever = new ConfigurationRetriever(this.client);
    return configurationRetriever.retrieve();
  }
}
