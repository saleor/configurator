import yaml from "yaml";
import { cliConsole } from "../../cli/console";
import { logger } from "../../lib/logger";
import { shouldIncludeSection } from "../../lib/utils/selective-options";
import type { SaleorConfig } from "../../modules/config/schema/schema";
import { ConfigurationLoadError, RemoteConfigurationError } from "../errors/configuration-errors";
import type { ServiceContainer } from "../service-container";
import {
  AttributesComparator,
  CategoryComparator,
  ChannelComparator,
  CollectionComparator,
  type EntityComparator,
  MenuComparator,
  ModelComparator,
  PageTypeComparator,
  ProductComparator,
  ProductTypeComparator,
  ShippingZoneComparator,
  ShopComparator,
  TaxClassComparator,
  WarehouseComparator,
} from "./comparators";
import { DiffComparisonError } from "./errors";
import { IntrospectDiffFormatter } from "./formatters";
import type {
  ConfigurationSection,
  DiffOptions,
  DiffResult,
  DiffServiceIntrospectOptions,
  DiffSummary,
  IntrospectDiffOptions,
  IntrospectDiffResult,
} from "./types";

/**
 * Configuration for the diff service
 */
export interface DiffServiceConfig {
  /** Whether to include debug logging */
  readonly enableDebugLogging?: boolean;
  /** Timeout for remote configuration retrieval in milliseconds */
  readonly remoteTimeoutMs?: number;
  /** Maximum number of concurrent comparisons */
  readonly maxConcurrentComparisons?: number;
}

/**
 * Default configuration for the diff service
 */
const DEFAULT_CONFIG: Required<DiffServiceConfig> = {
  enableDebugLogging: false,
  remoteTimeoutMs: 120000, // Increased to 2 minutes to handle sequential API calls with delays
  maxConcurrentComparisons: 5,
};

/**
 * Service for comparing local and remote Saleor configurations
 * Follows Single Responsibility Principle by delegating entity comparisons to specialized comparators
 */
export class DiffService {
  private readonly config: Required<DiffServiceConfig>;
  private readonly comparators: ReadonlyMap<string, EntityComparator>;

  constructor(
    private readonly services: ServiceContainer,
    config: DiffServiceConfig = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.comparators = this.createComparators();
  }

  /**
   * Compares local and remote configurations and returns a summary of differences
   * @param options - Optional diff options (e.g., skipMedia)
   * @returns Promise resolving to diff summary
   * @throws {ConfigurationLoadError} When local configuration cannot be loaded
   * @throws {RemoteConfigurationError} When remote configuration cannot be retrieved
   * @throws {DiffComparisonError} When comparison fails
   */
  async compare(options?: DiffOptions): Promise<DiffSummary> {
    const startTime = Date.now();
    logger.info("Starting diff comparison", { skipMedia: options?.skipMedia });

    try {
      // Load configurations concurrently for better performance
      const [localConfig, remoteConfig] = await Promise.all([
        this.loadLocalConfiguration(),
        this.loadRemoteConfiguration(),
      ]);

      if (this.config.enableDebugLogging) {
        logger.debug("Configurations loaded", {
          localConfig: this.sanitizeConfig(localConfig),
          remoteConfig: this.sanitizeConfig(remoteConfig),
        });
      }

      // Perform comparisons with options
      const results = await this.performComparisons(localConfig, remoteConfig, options);

      // Calculate summary statistics
      const summary = this.calculateSummary(results);

      const duration = Date.now() - startTime;
      logger.info("Diff comparison completed", {
        totalChanges: summary.totalChanges,
        creates: summary.creates,
        updates: summary.updates,
        deletes: summary.deletes,
        durationMs: duration,
      });

      return summary;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Failed to compare configurations", {
        error: error instanceof Error ? error.message : String(error),
        durationMs: duration,
      });

      // Re-throw with more context if it's not already a custom error
      if (
        error instanceof ConfigurationLoadError ||
        error instanceof RemoteConfigurationError ||
        error instanceof DiffComparisonError
      ) {
        throw error;
      }

      throw new DiffComparisonError(
        `Diff comparison failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Compares configurations from introspect perspective (remote as source, local as target)
   * Shows what will change in the local configuration when pulling from remote
   * @param options - Options for selective filtering
   * @returns Promise resolving to diff summary
   * @throws {ConfigurationLoadError} When local configuration cannot be loaded
   * @throws {RemoteConfigurationError} When remote configuration cannot be retrieved
   * @throws {DiffComparisonError} When comparison fails
   */
  async compareForIntrospect(options: DiffServiceIntrospectOptions = {}): Promise<DiffSummary> {
    const { includeSections, excludeSections } = options;
    const startTime = Date.now();
    logger.info("Starting diff comparison for introspect");

    try {
      // Load configurations concurrently for better performance
      const [localConfig, remoteConfig] = await Promise.all([
        this.loadLocalConfigurationTolerant(),
        this.loadRemoteConfiguration(),
      ]);

      if (this.config.enableDebugLogging) {
        logger.debug("Configurations loaded for introspect", {
          localConfig: this.sanitizeConfig(localConfig),
          remoteConfig: this.sanitizeConfig(remoteConfig),
        });
      }

      // Perform comparisons with swapped order (remote as source, local as target)
      // This shows what will be removed/added/updated in the local file
      const results = await this.performSelectiveComparisons(remoteConfig, localConfig, {
        includeSections,
        excludeSections,
      });

      // Calculate summary statistics
      const summary = this.calculateSummary(results);

      const duration = Date.now() - startTime;
      logger.info("Introspect diff comparison completed", {
        totalChanges: summary.totalChanges,
        creates: summary.creates,
        updates: summary.updates,
        deletes: summary.deletes,
        durationMs: duration,
      });

      return summary;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Failed to compare configurations for introspect", {
        error: error instanceof Error ? error.message : String(error),
        durationMs: duration,
      });

      // Re-throw with more context if it's not already a custom error
      if (
        error instanceof ConfigurationLoadError ||
        error instanceof RemoteConfigurationError ||
        error instanceof DiffComparisonError
      ) {
        throw error;
      }

      throw new DiffComparisonError(
        `Introspect diff comparison failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Loads local configuration in a tolerant mode for introspect flows.
   * If validation fails, treat local config as empty to allow seamless overwrite.
   */
  private async loadLocalConfigurationTolerant(): Promise<SaleorConfig> {
    try {
      const config = await this.services.configStorage.load();
      return config || {};
    } catch (error) {
      logger.warn("Local configuration invalid; proceeding as empty for introspect", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {} as SaleorConfig;
    }
  }

  /**
   * Performs diff for introspect with formatting and output handling
   * @param options - Options for diff formatting and filtering
   * @returns Promise resolving to diff result with formatted output
   */
  async diffForIntrospectWithFormatting(
    options: IntrospectDiffOptions = {}
  ): Promise<IntrospectDiffResult> {
    const { format = "table", quiet = false, includeSections, excludeSections } = options;

    logger.info("Starting diff process for introspect");

    try {
      if (!quiet) {
        logger.info("📥 Loading local configuration...");
      }

      if (!quiet) {
        logger.info("🌐 Fetching remote configuration...");
      }

      const summary = await this.compareForIntrospect({
        includeSections,
        excludeSections,
      });

      if (!quiet) {
        logger.info("🔍 Analyzing differences...\n");
      }

      // Format output (filtering is now handled in diff service)
      let formattedOutput: string | undefined;
      const introspectFormatter = new IntrospectDiffFormatter();

      switch (format) {
        case "json":
          formattedOutput = JSON.stringify(summary, null, 2);
          break;
        case "yaml": {
          formattedOutput = yaml.stringify(summary);
          break;
        }
        default:
          if (summary.totalChanges > 0) {
            formattedOutput = introspectFormatter.format(summary);
          }
      }

      if (!quiet && formattedOutput) {
        cliConsole.info(formattedOutput);
      }

      logger.info("Introspect diff process completed successfully", {
        totalChanges: summary.totalChanges,
        creates: summary.creates,
        updates: summary.updates,
        deletes: summary.deletes,
      });

      return {
        summary,
        formattedOutput: quiet ? formattedOutput : undefined,
      };
    } catch (error) {
      logger.error("Failed to perform introspect diff", { error });
      throw error;
    }
  }

  /**
   * Creates and configures entity comparators
   */
  private createComparators(): ReadonlyMap<string, EntityComparator> {
    return new Map([
      ["shop", new ShopComparator() as EntityComparator],
      ["channels", new ChannelComparator() as EntityComparator],
      ["attributes", new AttributesComparator() as EntityComparator],
      ["productAttributes", new AttributesComparator("Product Attributes") as EntityComparator],
      ["contentAttributes", new AttributesComparator("Content Attributes") as EntityComparator],
      ["productTypes", new ProductTypeComparator() as EntityComparator],
      ["pageTypes", new PageTypeComparator() as EntityComparator],
      ["modelTypes", new PageTypeComparator() as EntityComparator], // ModelTypes use PageType comparator
      ["categories", new CategoryComparator() as EntityComparator],
      ["products", new ProductComparator() as EntityComparator],
      ["collections", new CollectionComparator() as EntityComparator],
      ["menus", new MenuComparator() as EntityComparator],
      ["models", new ModelComparator() as EntityComparator],
      ["warehouses", new WarehouseComparator() as EntityComparator],
      ["shippingZones", new ShippingZoneComparator() as EntityComparator],
      ["taxClasses", new TaxClassComparator() as EntityComparator],
    ]);
  }

  /**
   * Loads local configuration with error handling
   */
  private async loadLocalConfiguration(): Promise<SaleorConfig> {
    try {
      const config = await this.services.configStorage.load();
      return config || {};
    } catch (error) {
      throw new ConfigurationLoadError(
        `Failed to load local configuration: ${
          error instanceof Error ? error.message : String(error)
        }`
        // Could extract file path from error if available
      );
    }
  }

  /**
   * Loads remote configuration with error handling and timeout
   */
  private async loadRemoteConfiguration(): Promise<SaleorConfig> {
    try {
      // Apply timeout to remote configuration retrieval
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              `Remote configuration retrieval timed out after ${this.config.remoteTimeoutMs}ms`
            )
          );
        }, this.config.remoteTimeoutMs);
      });

      const configPromise = this.services.configuration.retrieveWithoutSaving();
      const config = await Promise.race([configPromise, timeoutPromise]);

      return config || {};
    } catch (error) {
      throw new RemoteConfigurationError(
        `Failed to retrieve remote configuration: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Performs all entity comparisons
   */
  private async performComparisons(
    localConfig: SaleorConfig,
    remoteConfig: SaleorConfig,
    options?: DiffOptions
  ): Promise<readonly DiffResult[]> {
    const comparisons: Promise<readonly DiffResult[]>[] = [];

    // Shop settings comparison
    if (this.comparators.has("shop")) {
      comparisons.push(
        this.performComparison("shop", localConfig.shop, remoteConfig.shop, options)
      );
    }

    // Entity array comparisons
    const entityTypes = [
      "channels",
      "attributes",
      "productTypes",
      "pageTypes",
      "modelTypes",
      "categories",
      "products",
      "collections",
      "menus",
      "models",
      "warehouses",
      "shippingZones",
      "taxClasses",
    ] as const;

    for (const entityType of entityTypes) {
      if (this.comparators.has(entityType)) {
        comparisons.push(
          this.performComparison(
            entityType,
            localConfig[entityType] || [],
            remoteConfig[entityType] || [],
            options
          )
        );
      }
    }

    // Execute comparisons with concurrency limit
    const results = await this.executeConcurrently(comparisons);
    return results.flat();
  }

  /**
   * Performs selective entity comparisons based on include/exclude options
   */
  private async performSelectiveComparisons(
    localConfig: SaleorConfig,
    remoteConfig: SaleorConfig,
    options: DiffServiceIntrospectOptions
  ): Promise<readonly DiffResult[]> {
    const { includeSections, excludeSections } = options;
    const comparisons: Promise<readonly DiffResult[]>[] = [];

    // Helper function to check if section should be included
    const shouldInclude = (section: ConfigurationSection): boolean => {
      return shouldIncludeSection(section, {
        includeSections: includeSections || [],
        excludeSections: excludeSections || [],
      });
    };

    // Shop settings comparison
    if (shouldInclude("shop") && this.comparators.has("shop")) {
      comparisons.push(this.performComparison("shop", localConfig.shop, remoteConfig.shop));
    }

    // Entity array comparisons
    const entityTypeMappings: Record<string, ConfigurationSection> = {
      channels: "channels",
      attributes: "attributes",
      productTypes: "productTypes",
      pageTypes: "pageTypes",
      modelTypes: "modelTypes",
      categories: "categories",
      products: "products",
      collections: "collections",
      menus: "menus",
      models: "models",
      warehouses: "warehouses",
      shippingZones: "shippingZones",
      taxClasses: "taxClasses",
    };

    for (const [entityType, section] of Object.entries(entityTypeMappings)) {
      if (shouldInclude(section) && this.comparators.has(entityType)) {
        comparisons.push(
          this.performComparison(
            entityType,
            localConfig[entityType as keyof SaleorConfig] || [],
            remoteConfig[entityType as keyof SaleorConfig] || []
          )
        );
      }
    }

    // Execute comparisons with concurrency limit
    const results = await this.executeConcurrently(comparisons);
    return results.flat();
  }

  /**
   * Performs a single entity comparison with error handling
   */
  private async performComparison(
    entityType: string,
    local: unknown,
    remote: unknown,
    options?: DiffOptions
  ): Promise<readonly DiffResult[]> {
    try {
      const comparator = this.comparators.get(entityType);
      if (!comparator) {
        logger.warn(`No comparator found for entity type: ${entityType}`);
        return [];
      }

      // Pass options to comparator for entities that support it (e.g., products with skipMedia)
      const results = await comparator.compare(local, remote, options);

      if (this.config.enableDebugLogging && results.length > 0) {
        logger.debug(`Comparison completed for ${entityType}`, {
          entityType,
          changesFound: results.length,
        });
      }

      return results;
    } catch (error) {
      throw new DiffComparisonError(
        `Failed to compare ${entityType}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Executes promises with concurrency limit
   */
  private async executeConcurrently<T>(promises: readonly Promise<T>[]): Promise<T[]> {
    const results: T[] = [];
    const executing = new Set<Promise<void>>();

    for (const promise of promises) {
      const executePromise = promise.then((result) => {
        results.push(result);
        executing.delete(executePromise);
      });

      executing.add(executePromise);

      if (executing.size >= this.config.maxConcurrentComparisons) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Calculates summary statistics from diff results
   */
  private calculateSummary(results: readonly DiffResult[]): DiffSummary {
    const creates = results.filter((r) => r.operation === "CREATE").length;
    const updates = results.filter((r) => r.operation === "UPDATE").length;
    const deletes = results.filter((r) => r.operation === "DELETE").length;

    return {
      totalChanges: results.length,
      creates,
      updates,
      deletes,
      results,
    };
  }

  /**
   * Sanitizes configuration for logging (removes sensitive data)
   */
  private sanitizeConfig(config: SaleorConfig): unknown {
    // Create a deep copy and remove sensitive fields
    const sanitized = JSON.parse(JSON.stringify(config));

    // Remove potentially sensitive shop settings
    if (sanitized.shop) {
      sanitized.shop.defaultMailSenderAddress = undefined;
      sanitized.shop.customerSetPasswordUrl = undefined;
    }

    return sanitized;
  }
}
