import type { BaseCommandArgs } from "../cli/command";
import { createClient } from "../lib/graphql/client";
import { logger } from "../lib/logger";
import { OraProgressReporter, BulkOperationProgress } from "../lib/progress";
import { DiffFormatter, DiffService } from "./diff";
import { ServiceComposer, type ServiceContainer } from "./service-container";

export class SaleorConfigurator {
  constructor(private readonly services: ServiceContainer) {}

  async push() {
    const reporter = new OraProgressReporter();
    const config = await this.services.configStorage.load();
    logger.debug("Configuration loaded", { config });

    reporter.info("Starting push operation");

    // Shop settings
    if (config.shop) {
      reporter.start("Updating shop settings");
      try {
        await this.services.shop.updateSettings(config.shop);
        reporter.succeed("Shop settings updated");
      } catch (error) {
        reporter.fail("Failed to update shop settings");
        throw error;
      }
    }

    // Channels (before products)
    if (config.channels && config.channels.length > 0) {
      const progress = new BulkOperationProgress(
        config.channels.length,
        "Creating channels",
        reporter
      );
      progress.start();
      
      try {
        await this.services.channel.bootstrapChannels(config.channels);
        progress.complete();
      } catch (error) {
        progress.complete();
        throw error;
      }
    }

    // Product types
    if (config.productTypes && config.productTypes.length > 0) {
      const progress = new BulkOperationProgress(
        config.productTypes.length,
        "Creating product types",
        reporter
      );
      progress.start();
      
      for (const productType of config.productTypes) {
        try {
          await this.services.productType.bootstrapProductType(productType);
          progress.increment(productType.name);
        } catch (error) {
          progress.addFailure(productType.name, error as Error);
          logger.error(`Failed to create product type: ${productType.name}`, { error });
        }
      }
      
      progress.complete();
      if (progress.hasFailures()) {
        throw new Error("Some product types failed to create. Check the logs for details.");
      }
    }

    // Page types
    if (config.pageTypes && config.pageTypes.length > 0) {
      const progress = new BulkOperationProgress(
        config.pageTypes.length,
        "Creating page types",
        reporter
      );
      progress.start();
      
      for (const pageType of config.pageTypes) {
        try {
          await this.services.pageType.bootstrapPageType(pageType);
          progress.increment(pageType.name);
        } catch (error) {
          progress.addFailure(pageType.name, error as Error);
          logger.error(`Failed to create page type: ${pageType.name}`, { error });
        }
      }
      
      progress.complete();
      if (progress.hasFailures()) {
        throw new Error("Some page types failed to create. Check the logs for details.");
      }
    }

    // Categories
    if (config.categories && config.categories.length > 0) {
      const progress = new BulkOperationProgress(
        config.categories.length,
        "Creating categories",
        reporter
      );
      progress.start();
      
      try {
        await this.services.category.bootstrapCategories(config.categories);
        progress.complete();
      } catch (error) {
        progress.complete();
        throw error;
      }
    }

    // Products
    if (config.products && config.products.length > 0) {
      const progress = new BulkOperationProgress(
        config.products.length,
        "Creating products",
        reporter
      );
      progress.start();
      
      try {
        await this.services.product.bootstrapProducts(config.products);
        progress.complete();
      } catch (error) {
        progress.complete();
        throw error;
      }
    }

    reporter.info("Push operation completed successfully");
  }

  async introspect() {
    const reporter = new OraProgressReporter();
    
    reporter.start("Retrieving configuration from Saleor");
    try {
      const config = await this.services.configuration.retrieve();
      reporter.succeed("Configuration retrieved successfully");
      return config;
    } catch (error) {
      reporter.fail("Failed to retrieve configuration");
      logger.error("Failed to retrieve configuration", { error });
      throw error;
    }
  }

  async diff() {
    const reporter = new OraProgressReporter();
    
    reporter.start("Comparing local and remote configurations");
    try {
      const diffService = new DiffService(this.services);

      const summary = await diffService.compare();
      reporter.succeed("Configuration comparison completed");
      
      const output = DiffFormatter.format(summary);

      return {
        summary,
        output,
      };
    } catch (error) {
      reporter.fail("Failed to compare configurations");
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
