import { logger } from "../lib/logger";
import type { ServiceContainer } from "./service-container";

/**
 * @description Parsing the configuration and triggering the commands.
 */
export class SaleorConfigurator {
  constructor(private readonly services: ServiceContainer) {}

  async bootstrap() {
    logger.info("Starting bootstrap process");
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
            });
          })
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
      await Promise.all(bootstrapTasks);
      logger.info("Bootstrap process completed successfully");
    } catch (error) {
      logger.error("Bootstrap process failed", { error });
      throw error;
    }
  }

  async retrieve() {
    logger.info("Starting configuration retrieval");
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
