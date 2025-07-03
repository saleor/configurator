import { logger } from "../lib/logger";
import { ServiceComposer, type ServiceContainer } from "./service-container";
import { DiffService } from "./diff";
import { DiffFormatter } from "./diff";
import { createClient } from "../lib/graphql/client";
import type { BaseCommandArgs } from "../cli/command";

export class SaleorConfigurator {
  constructor(private readonly services: ServiceContainer) {}

  async push() {
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
            this.services.productType.bootstrapProductType(productType)
          )
        )
      );
    }

    // Channels are added first to ensure they're ready before products (which reference them)
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

    if (config.products) {
      logger.debug(`Bootstrapping ${config.products.length} products`);
      bootstrapTasks.push(
        this.services.product.bootstrapProducts(config.products)
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

  async introspect() {
    logger.info("Starting introspect process");
    try {
      const config = await this.services.configuration.retrieve();
      logger.info("Configuration retrieved successfully");
      return config;
    } catch (error) {
      logger.error("Failed to retrieve configuration", { error });
      throw error;
    }
  }

  async diff() {
    logger.info("Starting diff process");

    try {
      const diffService = new DiffService(this.services);

      const summary = await diffService.compare();
      const output = DiffFormatter.format(summary);

      return {
        summary,
        output,
      };
    } catch (error) {
      logger.error("Failed to diff configurations", { error });
      throw error;
    }
  }
}

export function createConfigurator(baseArgs: BaseCommandArgs) {
  const { url, token, config: configPath } = baseArgs;

  const client = createClient(token, url);
  const services = ServiceComposer.compose(client, configPath);
  return new SaleorConfigurator(services);
}
