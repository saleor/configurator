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

    const bootstrapTasks = [];

    if (config.shop) {
      const shopBootstraper = new ShopBootstraper(this.bootstrapClient);
      bootstrapTasks.push(shopBootstraper.bootstrapShop(config.shop));
    }

    if (config.productTypes) {
      const productTypeBootstraper = new ProductTypeBootstraper(
        this.bootstrapClient
      );

      bootstrapTasks.push(
        Promise.all(
          config.productTypes.map((productType) =>
            productTypeBootstraper.bootstrapProductType(productType)
          )
        )
      );
    }

    if (config.channels) {
      const channelBootstraper = new ChannelBootstraper(this.bootstrapClient);

      bootstrapTasks.push(
        Promise.all(
          config.channels.map((channel) =>
            channelBootstraper.bootstrapChannel(channel)
          )
        )
      );
    }

    if (config.pageTypes) {
      const pageTypeBootstraper = new PageTypeBootstraper(this.bootstrapClient);

      bootstrapTasks.push(
        Promise.all(
          config.pageTypes.map((pageType) =>
            pageTypeBootstraper.bootstrapPageType(pageType)
          )
        )
      );
    }

    if (config.attributes) {
      const attributeBootstraper = new AttributeBootstraper(
        this.bootstrapClient
      );

      bootstrapTasks.push(
        Promise.all(
          config.attributes.map((attribute) => {
            if (!attribute.type) {
              throw new Error(
                "When bootstrapping attributes, the type (PRODUCT_TYPE or PAGE_TYPE) is required"
              );
            }

            return attributeBootstraper.bootstrapAttributes({
              attributeInputs: [attribute],
              type: attribute.type,
            });
          })
        )
      );
    }

    await Promise.all(bootstrapTasks);
  }

  async retrieve() {
    const configurationRetriever = new ConfigurationRetriever(this.client);
    return configurationRetriever.retrieve();
  }
}
