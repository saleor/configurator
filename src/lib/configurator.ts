import type { Client } from "@urql/core";
import { AttributeBootstraper } from "./bootstraper/attribute-bootstraper";
import { BootstrapClient } from "./bootstraper/bootstrap-client";
import { ChannelBootstraper } from "./bootstraper/channel-bootstraper";
import { PageTypeBootstraper } from "./bootstraper/page-types-bootstraper";
import { ProductTypeBootstraper } from "./bootstraper/product-types-bootstraper";
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
      const attributeBootstraper = new AttributeBootstraper(
        this.bootstrapClient
      );

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

  async retrieve() {
    const configurationRetriever = new ConfigurationRetriever(this.client);
    return configurationRetriever.retrieve();
  }
}
