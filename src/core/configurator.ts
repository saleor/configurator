import { logger } from "../lib/logger";
import type { ServiceContainer } from "./service-container";
import { DiffService } from "./diff";
import { DiffFormatter } from "./diff";

export interface DiffOptions {
  format?: "table" | "json" | "summary";
  filter?: string[];
  quiet?: boolean;
}

/**
 * @description Parsing the configuration and triggering the commands.
 */
export class SaleorConfigurator {
  constructor(private readonly services: ServiceContainer) {}

  async push() {
    logger.debug("Starting push process");
    const config = await this.services.configStorage.load();
    logger.debug("Configuration loaded", { config });

    try {
      // Phase 1: Shop settings (can run independently)
      if (config.shop) {
        logger.debug("Bootstrapping shop settings");
        await this.services.shop.updateSettings(config.shop);
      }

      // Phase 2: Foundation entities that don't depend on each other
      const foundationTasks = [];
      
      if (config.channels) {
        logger.debug(`Bootstrapping ${config.channels.length} channels`);
        foundationTasks.push(
          this.services.channel.bootstrapChannels(config.channels)
        );
      }

      if (config.productTypes) {
        logger.debug(`Bootstrapping ${config.productTypes.length} product types`);
        foundationTasks.push(
          Promise.all(
            config.productTypes.map((productType) =>
              this.services.productType.bootstrapProductType(productType)
            )
          )
        );
      }

      if (config.pageTypes) {
        logger.debug(`Bootstrapping ${config.pageTypes.length} page types`);
        foundationTasks.push(
          Promise.all(
            config.pageTypes.map((pageType) =>
              this.services.pageType.bootstrapPageType(pageType)
            )
          )
        );
      }

      if (config.categories) {
        logger.debug(`Bootstrapping ${config.categories.length} categories`);
        foundationTasks.push(
          this.services.category.bootstrapCategories(config.categories)
        );
      }

      // Wait for all foundation entities to complete
      if (foundationTasks.length > 0) {
        await Promise.all(foundationTasks);
        logger.debug("Foundation entities created successfully");
      }

      // Phase 3: Products (depend on productTypes, channels, and categories)
      if (config.products) {
        logger.debug(`Bootstrapping ${config.products.length} products`);
        await this.services.product.bootstrapProducts(config.products);
      }

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

  async diff(options: DiffOptions = {}) {
    const { format = "table", filter, quiet = false } = options;
    
    logger.info("Starting diff process");
    
    try {
      if (!quiet) {
        console.log("📥 Loading local configuration...");
      }
      
      const diffService = new DiffService(this.services);
      
      if (!quiet) {
        console.log("🌐 Fetching remote configuration...");
      }
      
      const summary = await diffService.compare();
      
      if (!quiet) {
        console.log("🔍 Analyzing differences...\n");
      }
      
      // Apply filter if specified
      let filteredSummary = summary;
      if (filter && filter.length > 0) {
        const filterSet = new Set(filter.map(f => f.toLowerCase()));
        const filteredResults = summary.results.filter(result => 
          filterSet.has(result.entityType.toLowerCase().replace(/\s+/g, ""))
        );
        
        filteredSummary = {
          ...summary,
          results: filteredResults,
          totalChanges: filteredResults.length,
          creates: filteredResults.filter(r => r.operation === "CREATE").length,
          updates: filteredResults.filter(r => r.operation === "UPDATE").length,
          deletes: filteredResults.filter(r => r.operation === "DELETE").length,
        };
      }
      
      // Format and display output
      let formattedOutput: string;
      
      switch (format) {
        case "json":
          formattedOutput = JSON.stringify(filteredSummary, null, 2);
          break;
        case "summary":
          formattedOutput = DiffFormatter.formatSummary(filteredSummary);
          break;
        case "table":
        default:
          formattedOutput = DiffFormatter.format(filteredSummary);
      }
      
      console.log(formattedOutput);
      
      logger.info("Diff process completed successfully", {
        totalChanges: filteredSummary.totalChanges,
        creates: filteredSummary.creates,
        updates: filteredSummary.updates,
        deletes: filteredSummary.deletes,
      });
      
      return filteredSummary;
    } catch (error) {
      logger.error("Failed to diff configurations", { error });
      throw error;
    }
  }
}
