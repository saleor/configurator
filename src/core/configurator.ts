import type { BaseCommandArgs } from "../cli/command";
import { cliConsole } from "../cli/console";
import { BulkOperationProgress } from "../cli/progress";
import { createClient } from "../lib/graphql/client";
import { logger } from "../lib/logger";
import { DiffFormatter, DiffService } from "./diff";
import { ServiceComposer, type ServiceContainer } from "./service-container";

export class SaleorConfigurator {
  constructor(private readonly services: ServiceContainer) {}

  async push() {
    const config = await this.services.configStorage.load();
    logger.debug("Configuration loaded", { config });

    cliConsole.progress.info("Starting push operation");

    // Shop settings
    if (config.shop) {
      cliConsole.progress.start("Updating shop settings");
      try {
        await this.services.shop.updateSettings(config.shop);
        cliConsole.progress.succeed("Shop settings updated");
      } catch (error) {
        cliConsole.progress.fail("Failed to update shop settings");
        throw error;
      }
    }

    // Channels (before products)
    if (config.channels && config.channels.length > 0) {
      const progress = new BulkOperationProgress(
        config.channels.length,
        "Creating channels",
        cliConsole.progress
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
        cliConsole.progress
      );
      progress.start();

      for (const productType of config.productTypes) {
        try {
          await this.services.productType.bootstrapProductType(productType);
          progress.increment(productType.name);
        } catch (error) {
          progress.addFailure(productType.name, error as Error);
          logger.error(`Failed to create product type: ${productType.name}`, {
            error,
          });
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
        cliConsole.progress
      );
      progress.start();

      for (const pageType of config.pageTypes) {
        try {
          await this.services.pageType.bootstrapPageType(pageType);
          progress.increment(pageType.name);
        } catch (error) {
          progress.addFailure(pageType.name, error as Error);
          logger.error(`Failed to create page type: ${pageType.name}`, {
            error,
          });
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
        cliConsole.progress
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
        cliConsole.progress
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

    cliConsole.progress.info("Push operation completed successfully");
  }

  async introspect() {
    cliConsole.progress.start("Retrieving configuration from Saleor");
    try {
      const config = await this.services.configuration.retrieve();
      cliConsole.progress.succeed("Configuration retrieved successfully");
      return config;
    } catch (error) {
      cliConsole.progress.fail("Failed to retrieve configuration");
      logger.error("Failed to retrieve configuration", { error });
      throw error;
    }
  }

  async diff() {
    cliConsole.progress.start("Comparing local and remote configurations");
    try {
      const diffService = new DiffService(this.services);

      const summary = await diffService.compare();
      cliConsole.progress.succeed("Configuration comparison completed");

      const output = DiffFormatter.format(summary);

      return {
        summary,
        output,
      };
    } catch (error) {
      cliConsole.progress.fail("Failed to compare configurations");
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
