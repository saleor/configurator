import type { Client } from "@urql/core";
import { logger } from "../lib/logger";
import { AttributeService } from "../modules/attribute/attribute-service";
import { AttributeRepository } from "../modules/attribute/repository";
import { CategoryService } from "../modules/category/category-service";
import { CategoryRepository } from "../modules/category/repository";
import { ChannelService } from "../modules/channel/channel-service";
import { ChannelRepository } from "../modules/channel/repository";
import { ConfigurationService } from "../modules/config/config-service";
import { ConfigurationRepository } from "../modules/config/repository";
import { YamlConfigurationManager } from "../modules/config/yaml-manager";
import { PageTypeService } from "../modules/page-type/page-type-service";
import { PageTypeRepository } from "../modules/page-type/repository";
import { ProductService } from "../modules/product/product-service";
import { ProductRepository } from "../modules/product/repository";
import { ProductTypeService } from "../modules/product-type/product-type-service";
import { ProductTypeRepository } from "../modules/product-type/repository";
import { ShopRepository } from "../modules/shop/repository";
import { ShopService } from "../modules/shop/shop-service";

export interface ServiceContainer {
  readonly channel: ChannelService;
  readonly pageType: PageTypeService;
  readonly productType: ProductTypeService;
  readonly shop: ShopService;
  readonly configuration: ConfigurationService;
  readonly configStorage: YamlConfigurationManager;
  readonly category: CategoryService;
  readonly product: ProductService;
}

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class ServiceComposer {
  static compose(client: Client, configPath?: string): ServiceContainer {
    logger.debug("Creating repositories");
    const repositories = {
      attribute: new AttributeRepository(client),
      channel: new ChannelRepository(client),
      pageType: new PageTypeRepository(client),
      productType: new ProductTypeRepository(client),
      shop: new ShopRepository(client),
      configuration: new ConfigurationRepository(client),
      category: new CategoryRepository(client),
      product: new ProductRepository(client),
    } as const;

    logger.debug("Creating services");
    const attributeService = new AttributeService(repositories.attribute);
    const configStorage = new YamlConfigurationManager(configPath);
    const configurationService = new ConfigurationService(
      repositories.configuration,
      configStorage
    );

    return {
      channel: new ChannelService(repositories.channel),
      pageType: new PageTypeService(repositories.pageType, attributeService),
      productType: new ProductTypeService(repositories.productType, attributeService),
      shop: new ShopService(repositories.shop),
      configuration: configurationService,
      configStorage,
      category: new CategoryService(repositories.category),
      product: new ProductService(repositories.product),
    };
  }
}
