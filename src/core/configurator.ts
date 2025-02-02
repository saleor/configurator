import type { Client } from "@urql/core";
import {
  type AttributeOperations,
  AttributeRepository,
} from "../modules/attribute/repository";
import { AttributeService } from "../modules/attribute/service";
import {
  type ChannelOperations,
  ChannelRepository,
} from "../modules/channel/repository";
import { ChannelService } from "../modules/channel/service";
import { ConfigurationService } from "../modules/config/service";
import {
  type PageTypeOperations,
  PageTypeRepository,
} from "../modules/page-type/repository";
import { PageTypeService } from "../modules/page-type/service";
import {
  type ProductTypeOperations,
  ProductTypeRepository,
} from "../modules/product-type/repository";
import { ProductTypeService } from "../modules/product-type/service";
import {
  type ShopOperations,
  ShopRepository,
} from "../modules/shop/repository";
import { ShopService } from "../modules/shop/service";
import { YamlConfigurationManager } from "../modules/config/yaml-manager";

/**
 * @description Parsing the configuration and triggering the commands.
 */
export class SaleorConfigurator {
  private readonly services: {
    attribute: AttributeService;
    channel: ChannelService;
    pageType: PageTypeService;
    productType: ProductTypeService;
    shop: ShopService;
  };

  constructor(private readonly client: Client) {
    const repositories = this.createRepositories(client);
    this.services = this.createServices(repositories);
  }

  private createRepositories(client: Client) {
    return {
      attribute: new AttributeRepository(client),
      channel: new ChannelRepository(client),
      pageType: new PageTypeRepository(client),
      productType: new ProductTypeRepository(client),
      shop: new ShopRepository(client),
    } as const;
  }

  private createServices(repositories: {
    attribute: AttributeOperations;
    channel: ChannelOperations;
    pageType: PageTypeOperations;
    productType: ProductTypeOperations;
    shop: ShopOperations;
  }) {
    const attributeService = new AttributeService(repositories.attribute);

    return {
      attribute: attributeService,
      channel: new ChannelService(repositories.channel),
      pageType: new PageTypeService(repositories.pageType, attributeService),
      productType: new ProductTypeService(
        repositories.productType,
        attributeService
      ),
      shop: new ShopService(repositories.shop),
    } as const;
  }

  async bootstrap() {
    const yamlManager = new YamlConfigurationManager();
    const config = await yamlManager.load();

    const bootstrapTasks = [];

    if (config.shop) {
      bootstrapTasks.push(this.services.shop.updateSettings(config.shop));
    }

    if (config.productTypes) {
      bootstrapTasks.push(
        Promise.all(
          config.productTypes.map((productType) =>
            this.services.productType.bootstrapProductType({
              name: productType.name,
              attributes: productType.attributes,
            })
          )
        )
      );
    }

    if (config.channels) {
      bootstrapTasks.push(
        this.services.channel.bootstrapChannels(config.channels)
      );
    }

    if (config.pageTypes) {
      bootstrapTasks.push(
        Promise.all(
          config.pageTypes.map((pageType) =>
            this.services.pageType.bootstrapPageType(pageType)
          )
        )
      );
    }

    if (config.attributes) {
      bootstrapTasks.push(
        Promise.all(
          config.attributes.map((attribute) => {
            if (!attribute.type) {
              throw new Error(
                "When bootstrapping attributes, the type (PRODUCT_TYPE or PAGE_TYPE) is required"
              );
            }

            return this.services.attribute.bootstrapAttributes({
              attributeInputs: [attribute],
              type: attribute.type,
            });
          })
        )
      );
    }

    await Promise.all(bootstrapTasks);

    console.log("Bootstrap finished");
  }

  async retrieve() {
    const configurationService = ConfigurationService.createDefault(
      this.client
    );
    const config = await configurationService.retrieve();

    console.log("Retrieve finished");

    return config;
  }
}
