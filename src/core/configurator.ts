import type { Client } from "@urql/core";
import { logger } from "../lib/logger";
import { AttributeService } from "../modules/attribute/attribute-service";
import {
  type AttributeOperations,
  AttributeRepository,
} from "../modules/attribute/repository";
import { ChannelService } from "../modules/channel/channel-service";
import {
  type ChannelOperations,
  ChannelRepository,
} from "../modules/channel/repository";
import { ConfigurationService } from "../modules/config/config-service";
import { YamlConfigurationManager } from "../modules/config/yaml-manager";
import { PageTypeService } from "../modules/page-type/page-type-service";
import {
  type PageTypeOperations,
  PageTypeRepository,
} from "../modules/page-type/repository";
import { ProductTypeService } from "../modules/product-type/product-type-service";
import {
  type ProductTypeOperations,
  ProductTypeRepository,
} from "../modules/product-type/repository";
import {
  type ShopOperations,
  ShopRepository,
} from "../modules/shop/repository";
import { ShopService } from "../modules/shop/shop-service";

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
    logger.debug("Creating repositories");
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
    logger.debug("Creating services");
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
    logger.info("Starting bootstrap process");
    const yamlManager = new YamlConfigurationManager();
    const config = await yamlManager.load();
    logger.debug("Configuration loaded", { config });

    const bootstrapTasks = [];

    if (config.shop) {
      logger.debug("Bootstrapping shop settings");
      bootstrapTasks.push(this.services.shop.updateSettings(config.shop));
    }

    if (config.productTypes) {
      logger.debug(`Bootstrapping ${config.productTypes.length} product types`);
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
      logger.debug(`Bootstrapping ${config.channels.length} channels`);
      bootstrapTasks.push(
        this.services.channel.bootstrapChannels(config.channels)
      );
    }

    if (config.pageTypes) {
      logger.debug(`Bootstrapping ${config.pageTypes.length} page types`);
      bootstrapTasks.push(
        Promise.all(
          config.pageTypes.map((pageType) =>
            this.services.pageType.bootstrapPageType(pageType)
          )
        )
      );
    }

    if (config.attributes) {
      logger.debug(`Bootstrapping ${config.attributes.length} attributes`);
      bootstrapTasks.push(
        Promise.all(
          config.attributes.map((attribute) => {
            if (!attribute.type) {
              const error = new Error(
                "When bootstrapping attributes, the type (PRODUCT_TYPE or PAGE_TYPE) is required"
              );
              logger.error("Attribute type missing", { attribute });
              throw error;
            }

            return this.services.attribute.bootstrapAttributes({
              attributeInputs: [attribute],
              type: attribute.type,
            });
          })
        )
      );
    }

    try {
      await Promise.all(bootstrapTasks);
      logger.info("Bootstrap process completed successfully");
    } catch (error) {
      logger.error("Bootstrap process failed", { error });
      throw error;
    }
  }

  async retrieve() {
    logger.info("Starting configuration retrieval");
    const configurationService = ConfigurationService.createDefault(
      this.client
    );
    try {
      const config = await configurationService.retrieve();
      logger.info("Configuration retrieved successfully");
      return config;
    } catch (error) {
      logger.error("Failed to retrieve configuration", { error });
      throw error;
    }
  }
}
