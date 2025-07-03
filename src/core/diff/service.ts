import { logger } from "../../lib/logger";
import type { ServiceContainer } from "../service-container";
import type { SaleorConfig } from "../../modules/config/schema";
import type { DiffSummary, DiffResult } from "./types";
import {
  ShopComparator,
  ChannelComparator,
  ProductTypeComparator,
  PageTypeComparator,
  CategoryComparator,
  type EntityComparator,
} from "./comparators";
import { ConfigurationLoadError, RemoteConfigurationError, DiffComparisonError } from "./errors";

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
  remoteTimeoutMs: 30000,
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
   * @returns Promise resolving to diff summary
   * @throws {ConfigurationLoadError} When local configuration cannot be loaded
   * @throws {RemoteConfigurationError} When remote configuration cannot be retrieved
   * @throws {DiffComparisonError} When comparison fails
   */
  async compare(): Promise<DiffSummary> {
    const startTime = Date.now();
    logger.info("Starting diff comparison");

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

      // Perform comparisons
      const results = await this.performComparisons(localConfig, remoteConfig);

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
        `Diff comparison failed: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Compares configurations from introspect perspective (remote as source, local as target)
   * Shows what will change in the local configuration when pulling from remote
   * @returns Promise resolving to diff summary
   * @throws {ConfigurationLoadError} When local configuration cannot be loaded
   * @throws {RemoteConfigurationError} When remote configuration cannot be retrieved
   * @throws {DiffComparisonError} When comparison fails
   */
  async compareForIntrospect(): Promise<DiffSummary> {
    const startTime = Date.now();
    logger.info("Starting diff comparison for introspect");

    try {
      // Load configurations concurrently for better performance
      const [localConfig, remoteConfig] = await Promise.all([
        this.loadLocalConfiguration(),
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
      const results = await this.performComparisons(remoteConfig, localConfig);

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
        `Introspect diff comparison failed: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Creates and configures entity comparators
   */
  private createComparators(): ReadonlyMap<string, EntityComparator> {
    return new Map([
      ["shop", new ShopComparator() as EntityComparator],
      ["channels", new ChannelComparator() as EntityComparator],
      ["productTypes", new ProductTypeComparator() as EntityComparator],
      ["pageTypes", new PageTypeComparator() as EntityComparator],
      ["categories", new CategoryComparator() as EntityComparator],
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
        `Failed to load local configuration: ${error instanceof Error ? error.message : String(error)}`
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
        `Failed to retrieve remote configuration: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Performs all entity comparisons
   */
  private async performComparisons(
    localConfig: SaleorConfig,
    remoteConfig: SaleorConfig
  ): Promise<readonly DiffResult[]> {
    const comparisons: Array<Promise<readonly DiffResult[]>> = [];

    // Shop settings comparison
    if (this.comparators.has("shop")) {
      comparisons.push(this.performComparison("shop", localConfig.shop, remoteConfig.shop));
    }

    // Entity array comparisons
    const entityTypes = ["channels", "productTypes", "pageTypes", "categories"] as const;

    for (const entityType of entityTypes) {
      if (this.comparators.has(entityType)) {
        comparisons.push(
          this.performComparison(
            entityType,
            localConfig[entityType] || [],
            remoteConfig[entityType] || []
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
    remote: unknown
  ): Promise<readonly DiffResult[]> {
    try {
      const comparator = this.comparators.get(entityType);
      if (!comparator) {
        logger.warn(`No comparator found for entity type: ${entityType}`);
        return [];
      }

      const results = await comparator.compare(local, remote);

      if (this.config.enableDebugLogging && results.length > 0) {
        logger.debug(`Comparison completed for ${entityType}`, {
          entityType,
          changesFound: results.length,
        });
      }

      return results;
    } catch (error) {
      throw new DiffComparisonError(
        `Failed to compare ${entityType}: ${error instanceof Error ? error.message : String(error)}`,
        entityType,
        error instanceof Error ? error : undefined
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
      delete sanitized.shop.defaultMailSenderAddress;
      delete sanitized.shop.customerSetPasswordUrl;
    }

    return sanitized;
  }
}
