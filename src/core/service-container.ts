import type { Client } from "@urql/core";
import { logger } from "../lib/logger";
import { AttributeService } from "../modules/attribute/attribute-service";
import { AttributeRepository } from "../modules/attribute/repository";
import { CategoryService } from "../modules/category/category-service";
import { CategoryRepository } from "../modules/category/repository";
import { ChannelService } from "../modules/channel/channel-service";
import { ChannelRepository } from "../modules/channel/repository";
import { CollectionService } from "../modules/collection/collection-service";
import { CollectionRepository } from "../modules/collection/repository";
import { ConfigurationService } from "../modules/config/config-service";
import { ConfigurationRepository } from "../modules/config/repository";
import { YamlConfigurationManager } from "../modules/config/yaml-manager";
import { PageTypeService } from "../modules/page-type/page-type-service";
import { PageTypeRepository } from "../modules/page-type/repository";
import { ProductService } from "../modules/product/product-service";
import { ProductRepository } from "../modules/product/repository";
import { ProductTypeService } from "../modules/product-type/product-type-service";
import { ProductTypeRepository } from "../modules/product-type/repository";
import { ShopService } from "../modules/shop/shop-service";
import { ShopRepository } from "../modules/shop/repository";
import { WarehouseService } from "../modules/warehouse/warehouse-service";
import { WarehouseRepository } from "../modules/warehouse/repository";
import { ShippingService } from "../modules/shipping/shipping-service";
import { ShippingRepository } from "../modules/shipping/repository";
import { TaxService } from "../modules/tax/tax-service";
import { TaxRepository } from "../modules/tax/repository";
import { VoucherService } from "../modules/voucher/voucher-service";
import { VoucherRepository } from "../modules/voucher/repository";
import { GiftCardService } from "../modules/gift-card/gift-card-service";
import { GiftCardRepository } from "../modules/gift-card/repository";
import { MenuService } from "../modules/menu/menu-service";
import { MenuRepository } from "../modules/menu/repository";
import { PageService } from "../modules/page/page-service";
import { PageRepository } from "../modules/page/repository";
import { TranslationService } from "../modules/translation/translation-service";
import { TranslationRepository } from "../modules/translation/repository";

export interface ServiceContainer {
  readonly channel: ChannelService;
  readonly pageType: PageTypeService;
  readonly productType: ProductTypeService;
  readonly shop: ShopService;
  readonly configuration: ConfigurationService;
  readonly configStorage: YamlConfigurationManager;
  readonly category: CategoryService;
  readonly warehouse: WarehouseService;
  readonly collection: CollectionService;
  readonly product: ProductService;
  readonly attribute: AttributeService;
  readonly shipping: ShippingService;
  readonly tax: TaxService;
  readonly voucher: VoucherService;
  readonly giftCard: GiftCardService;
  readonly menu: MenuService;
  readonly page: PageService;
  readonly translation: TranslationService;
}

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
      warehouse: new WarehouseRepository(client),
      collection: new CollectionRepository(client),
      product: new ProductRepository(client),
      shipping: new ShippingRepository(client),
      tax: new TaxRepository(client),
      voucher: new VoucherRepository(client),
      giftCard: new GiftCardRepository(client),
      menu: new MenuRepository(client),
      page: new PageRepository(client),
      translation: new TranslationRepository(client),
    } as const;

    logger.debug("Creating services");
    const attributeService = new AttributeService(repositories.attribute);
    const configStorage = new YamlConfigurationManager(configPath);
    const configurationService = new ConfigurationService(
      repositories.configuration,
      configStorage
    );
    
    const channelService = new ChannelService(repositories.channel);
    const categoryService = new CategoryService(repositories.category);
    const productTypeService = new ProductTypeService(
      repositories.productType,
      attributeService
    );
    const collectionService = new CollectionService(
      repositories.collection,
      channelService
    );
    const productService = new ProductService(
      repositories.product,
      channelService,
      productTypeService,
      categoryService,
      collectionService,
      attributeService
    );
    const pageTypeService = new PageTypeService(repositories.pageType, attributeService);
    const pageService = new PageService(
      repositories.page,
      pageTypeService,
      attributeService
    );
    const menuService = new MenuService(
      repositories.menu,
      categoryService,
      collectionService,
      pageService
    );
    const shippingService = new ShippingService(repositories.shipping, channelService);
    const taxService = new TaxService(repositories.tax, channelService);
    const voucherService = new VoucherService(
      repositories.voucher, 
      channelService, 
      categoryService, 
      collectionService, 
      productService
    );
    const giftCardService = new GiftCardService(repositories.giftCard);
    const translationService = new TranslationService(
      repositories.translation,
      productService,
      collectionService,
      categoryService,
      pageService,
      shippingService,
      menuService,
      attributeService
    );

    return {
      channel: channelService,
      pageType: pageTypeService,
      productType: productTypeService,
      shop: new ShopService(repositories.shop),
      configuration: configurationService,
      configStorage,
      category: categoryService,
      warehouse: new WarehouseService(repositories.warehouse),
      collection: collectionService,
      product: productService,
      attribute: attributeService,
      shipping: shippingService,
      tax: taxService,
      voucher: voucherService,
      giftCard: giftCardService,
      menu: menuService,
      page: pageService,
      translation: translationService,
    };
  }
}
