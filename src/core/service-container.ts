import type { Client } from "@urql/core";
import { logger } from "../lib/logger";
import { AttributeService } from "../modules/attribute/attribute-service";
import { AttributeRepository } from "../modules/attribute/repository";
import { ChannelService } from "../modules/channel/channel-service";
import { ChannelRepository } from "../modules/channel/repository";
import { ConfigurationService } from "../modules/config/config-service";
import { ConfigurationRepository } from "../modules/config/repository";
import { YamlConfigurationManager } from "../modules/config/yaml-manager";
import { PageTypeService } from "../modules/page-type/page-type-service";
import { PageTypeRepository } from "../modules/page-type/repository";
import { ProductTypeService } from "../modules/product-type/product-type-service";
import { ProductTypeRepository } from "../modules/product-type/repository";
import { ShopService } from "../modules/shop/shop-service";
import { ShopRepository } from "../modules/shop/repository";

export interface ServiceContainer {
  readonly attribute: AttributeService;
  readonly channel: ChannelService;
  readonly pageType: PageTypeService;
  readonly productType: ProductTypeService;
  readonly shop: ShopService;
  readonly configuration: ConfigurationService;
  readonly configStorage: YamlConfigurationManager;
}

export class ServiceComposer {
  static compose(client: Client): ServiceContainer {
    logger.debug("Creating repositories");
    const repositories = {
      attribute: new AttributeRepository(client),
      channel: new ChannelRepository(client),
      pageType: new PageTypeRepository(client),
      productType: new ProductTypeRepository(client),
      shop: new ShopRepository(client),
      configuration: new ConfigurationRepository(client),
    } as const;

    logger.debug("Creating services");
    const attributeService = new AttributeService(repositories.attribute);
    const configStorage = new YamlConfigurationManager();
    const configurationService = new ConfigurationService(
      repositories.configuration,
      configStorage
    );

    return {
      attribute: attributeService,
      channel: new ChannelService(repositories.channel),
      pageType: new PageTypeService(repositories.pageType, attributeService),
      productType: new ProductTypeService(
        repositories.productType,
        attributeService
      ),
      shop: new ShopService(repositories.shop),
      configuration: configurationService,
      configStorage,
    };
  }
}
