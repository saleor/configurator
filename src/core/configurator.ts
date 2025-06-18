import { logger } from "../lib/logger";
import type { ServiceContainer } from "./service-container";

/**
 * @description Parsing the configuration and triggering the commands.
 */
export class SaleorConfigurator {
  constructor(private readonly services: ServiceContainer) {}

  async push() {
    logger.debug("Starting push process");
    const config = await this.services.configStorage.load();
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

    if (config.categories) {
      logger.debug(`Bootstrapping ${config.categories.length} categories`);
      bootstrapTasks.push(
        this.services.category.bootstrapCategories(config.categories)
      );
    }

    try {
      // Execute first batch of tasks (entities without dependencies)
      await Promise.all(bootstrapTasks);
      logger.info("Initial bootstrap tasks completed");

      // Execute entities that depend on the first batch
      const secondaryTasks = [];

      if (config.warehouses) {
        logger.debug(`Bootstrapping ${config.warehouses.length} warehouses`);
        secondaryTasks.push(
          this.services.warehouse.upsertWarehouses(config.warehouses)
        );
      }

      if (config.collections) {
        logger.debug(`Bootstrapping ${config.collections.length} collections`);
        secondaryTasks.push(
          this.services.collection.upsertCollections(config.collections)
        );
      }

      await Promise.all(secondaryTasks);
      logger.info("Secondary bootstrap tasks completed");

      // Execute entities that depend on the previous batches
      const tertiaryTasks = [];

      if (config.shippingZones) {
        logger.debug(`Bootstrapping ${config.shippingZones.length} shipping zones`);
        tertiaryTasks.push(
          this.services.shipping.upsertShippingZones(config.shippingZones)
        );
      }

      if (config.taxClasses) {
        logger.debug(`Bootstrapping ${config.taxClasses.length} tax classes`);
        tertiaryTasks.push(
          this.services.tax.upsertTaxClasses(config.taxClasses)
        );
      }

      await Promise.all(tertiaryTasks);
      logger.info("Tertiary bootstrap tasks completed");

      // Execute entities that depend on all the previous batches
      const quaternaryTasks = [];

      if (config.taxConfigurations) {
        logger.debug(`Bootstrapping ${config.taxConfigurations.length} tax configurations`);
        quaternaryTasks.push(
          this.services.tax.configureTaxSettings(config.taxConfigurations)
        );
      }

      if (config.products) {
        logger.debug(`Bootstrapping ${config.products.length} products`);
        quaternaryTasks.push(
          this.services.product.upsertProducts(config.products)
        );
      }

      if (config.pages) {
        logger.debug(`Bootstrapping ${config.pages.length} pages`);
        quaternaryTasks.push(
          this.services.page.upsertPages(config.pages)
        );
      }

      await Promise.all(quaternaryTasks);
      logger.info("Quaternary bootstrap tasks completed");

      // Execute entities that depend on products and pages
      const quinaryTasks = [];

      if (config.vouchers) {
        logger.debug(`Bootstrapping ${config.vouchers.length} vouchers`);
        quinaryTasks.push(
          this.services.voucher.upsertVouchers(config.vouchers)
        );
      }

      if (config.sales) {
        logger.debug(`Bootstrapping ${config.sales.length} sales`);
        quinaryTasks.push(
          this.services.voucher.upsertSales(config.sales)
        );
      }

      if (config.giftCards) {
        if (config.giftCards.individual) {
          logger.debug(`Bootstrapping ${config.giftCards.individual.length} individual gift cards`);
          quinaryTasks.push(
            this.services.giftCard.createGiftCards(config.giftCards.individual)
          );
        }
        
        if (config.giftCards.bulk) {
          logger.debug(`Bootstrapping bulk gift cards`);
          quinaryTasks.push(
            Promise.all(
              config.giftCards.bulk.map((bulk) =>
                this.services.giftCard.bulkCreateGiftCards(bulk)
              )
            )
          );
        }
      }

      if (config.menus) {
        logger.debug(`Bootstrapping ${config.menus.length} menus`);
        quinaryTasks.push(
          this.services.menu.upsertMenus(config.menus)
        );
      }

      await Promise.all(quinaryTasks);
      logger.info("Quinary bootstrap tasks completed");

      // Execute translations last as they depend on all entities
      if (config.translations) {
        logger.debug(`Bootstrapping ${config.translations.length} translations`);
        await this.services.translation.applyTranslations(config.translations);
        logger.info("Translations applied successfully");
      }

      logger.info("Bootstrap process completed successfully");
    } catch (error) {
      logger.error("Bootstrap process failed", { error });
      throw error;
    }
  }

  async pull() {
    logger.info("Starting pull process");
    try {
      const config = await this.services.configuration.retrieve();
      logger.info("Configuration retrieved successfully");
      return config;
    } catch (error) {
      logger.error("Failed to retrieve configuration", { error });
      throw error;
    }
  }
}
