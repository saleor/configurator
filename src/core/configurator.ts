import type { BaseCommandArgs } from "../cli/command";
import { cliConsole } from "../cli/console";
import { BulkOperationProgress } from "../cli/progress";
import { createClient } from "../lib/graphql/client";
import { logger } from "../lib/logger";
import { DiffFormatter, DiffService } from "./diff";
import { PartialDeploymentError } from "./errors/deployment-errors";
import { ServiceComposer, type ServiceContainer } from "./service-container";

export class SaleorConfigurator {
  constructor(public readonly services: ServiceContainer) {}

  /**
   * Get the service container for advanced usage
   * @internal
   */
  get serviceContainer(): ServiceContainer {
    return this.services;
  }

  async push() {
    const config = await this.services.configStorage.load();
    logger.debug("Configuration loaded", { config });

    cliConsole.progress.info("Starting push operation");

    // Track completed and failed operations for better error reporting
    const completedOperations: string[] = [];
    const failedOperations: { operation: string; error: string }[] = [];

    // Shop settings
    if (config.shop) {
      cliConsole.progress.start("Updating shop settings");
      try {
        await this.services.shop.updateSettings(config.shop);
        cliConsole.progress.succeed("Shop settings updated");
        completedOperations.push("Shop settings updated");
      } catch (error) {
        cliConsole.progress.fail("Failed to update shop settings");
        const errorMessage = error instanceof Error ? error.message : String(error);
        failedOperations.push({ operation: "Update shop settings", error: errorMessage });
        
        // For critical operations like shop settings, fail immediately
        throw new PartialDeploymentError(
          "Push operation failed",
          completedOperations,
          failedOperations,
          { stage: "shop settings" },
          error
        );
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
        completedOperations.push(`Created ${config.channels.length} channels`);
      } catch (error) {
        progress.complete();
        const errorMessage = error instanceof Error ? error.message : String(error);
        failedOperations.push({ operation: "Create channels", error: errorMessage });
        
        throw new PartialDeploymentError(
          "Push operation failed during channel creation",
          completedOperations,
          failedOperations,
          { stage: "channels", totalChannels: config.channels.length },
          error
        );
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

      let successCount = 0;
      for (const productType of config.productTypes) {
        try {
          await this.services.productType.bootstrapProductType(productType);
          progress.increment(productType.name);
          successCount++;
        } catch (error) {
          progress.addFailure(productType.name, error as Error);
          logger.error(`Failed to create product type: ${productType.name}`, {
            error,
          });
          const errorMessage = error instanceof Error ? error.message : String(error);
          failedOperations.push({ operation: `Create product type: ${productType.name}`, error: errorMessage });
        }
      }

      progress.complete();
      
      if (successCount > 0) {
        completedOperations.push(`Created ${successCount} product types`);
      }
      
      if (progress.hasFailures()) {
        throw new PartialDeploymentError(
          "Push operation failed during product type creation",
          completedOperations,
          failedOperations,
          { stage: "productTypes", totalProductTypes: config.productTypes.length, successCount },
          new Error("Some product types failed to create. Check the logs for details.")
        );
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

      let successCount = 0;
      for (const pageType of config.pageTypes) {
        try {
          await this.services.pageType.bootstrapPageType(pageType);
          progress.increment(pageType.name);
          successCount++;
        } catch (error) {
          progress.addFailure(pageType.name, error as Error);
          logger.error(`Failed to create page type: ${pageType.name}`, {
            error,
          });
          const errorMessage = error instanceof Error ? error.message : String(error);
          failedOperations.push({ operation: `Create page type: ${pageType.name}`, error: errorMessage });
        }
      }

      progress.complete();
      
      if (successCount > 0) {
        completedOperations.push(`Created ${successCount} page types`);
      }
      
      if (progress.hasFailures()) {
        throw new PartialDeploymentError(
          "Push operation failed during page type creation",
          completedOperations,
          failedOperations,
          { stage: "pageTypes", totalPageTypes: config.pageTypes.length, successCount },
          new Error("Some page types failed to create. Check the logs for details.")
        );
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
        completedOperations.push(`Created ${config.categories.length} categories`);
      } catch (error) {
        progress.complete();
        const errorMessage = error instanceof Error ? error.message : String(error);
        failedOperations.push({ operation: "Create categories", error: errorMessage });
        
        throw new PartialDeploymentError(
          "Push operation failed during category creation",
          completedOperations,
          failedOperations,
          { stage: "categories", totalCategories: config.categories.length },
          error
        );
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
        completedOperations.push(`Created ${config.products.length} products`);
      } catch (error) {
        progress.complete();
        const errorMessage = error instanceof Error ? error.message : String(error);
        failedOperations.push({ operation: "Create products", error: errorMessage });
        
        throw new PartialDeploymentError(
          "Push operation failed during product creation",
          completedOperations,
          failedOperations,
          { stage: "products", totalProducts: config.products.length },
          error
        );
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
