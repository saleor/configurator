import type { BaseCommandArgs } from "../cli/command";
import { createClient } from "../lib/graphql/client";
import { logger } from "../lib/logger";
import { DiffFormatter, DiffService, IntrospectDiffFormatter } from "./diff";
import { ServiceComposer, type ServiceContainer } from "./service-container";

export type IntrospectDiffOptions = {
  format?: "table" | "json" | "summary";
  filter?: string[];
  quiet?: boolean;
};

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

  async diffForIntrospect(options: IntrospectDiffOptions = {}) {
    const { format = "table", filter, quiet = false } = options;

    logger.info("Starting diff process for introspect");

    try {
      if (!quiet) {
        console.log("📥 Loading local configuration...");
      }

      const diffService = new DiffService(this.services);

      if (!quiet) {
        console.log("🌐 Fetching remote configuration...");
      }

      const summary = await diffService.compareForIntrospect();

      if (!quiet) {
        console.log("🔍 Analyzing differences...\n");
      }

      // Apply filter if specified
      let filteredSummary = summary;
      if (filter && filter.length > 0) {
        const filterSet = new Set(filter.map((f: string) => f.toLowerCase()));
        const filteredResults = summary.results.filter((result) =>
          filterSet.has(result.entityType.toLowerCase().replace(/\s+/g, ""))
        );

        filteredSummary = {
          ...summary,
          results: filteredResults,
          totalChanges: filteredResults.length,
          creates: filteredResults.filter((r) => r.operation === "CREATE").length,
          updates: filteredResults.filter((r) => r.operation === "UPDATE").length,
          deletes: filteredResults.filter((r) => r.operation === "DELETE").length,
        };
      }

      // Format and display output
      let formattedOutput: string;
      const introspectFormatter = new IntrospectDiffFormatter();

      switch (format) {
        case "json":
          formattedOutput = JSON.stringify(filteredSummary, null, 2);
          break;
        case "summary":
          formattedOutput = DiffFormatter.formatSummary(filteredSummary);
          break;
        case "table":
        default:
          formattedOutput = introspectFormatter.format(filteredSummary);
      }

      console.log(formattedOutput);

      logger.info("Introspect diff process completed successfully", {
        totalChanges: filteredSummary.totalChanges,
        creates: filteredSummary.creates,
        updates: filteredSummary.updates,
        deletes: filteredSummary.deletes,
      });

      return filteredSummary;
    } catch (error) {
      logger.error("Failed to diff configurations for introspect", { error });
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
