/**
 * Constants for bulk operation configurations
 *
 * This file centralizes all magic numbers and strings used in bulk operations
 * to improve maintainability and make configuration changes easier.
 */

/**
 * Threshold values for determining when to use bulk operations vs sequential processing
 */
export const BulkOperationThresholds = {
  /**
   * Number of attributes above which bulk mutations are used instead of sequential processing
   * Below this threshold, sequential processing is used for better error granularity
   */
  ATTRIBUTES: 10,

  /**
   * Number of models above which sequential processing with delays is used instead of parallel processing
   * Models are more prone to rate limiting, so we use a lower threshold
   */
  MODELS: 5,

  /**
   * Number of products above which bulk mutations are used instead of sequential processing
   * Below this threshold, sequential processing is used for better error granularity
   */
  PRODUCTS: 10,

  /**
   * Number of categories above which level-based parallel processing is used
   * Below this threshold, simple sequential processing with delays is sufficient
   */
  CATEGORIES: 10,

  /**
   * Number of shipping zones above which sequential processing with delays is used
   * instead of parallel processing to prevent rate limiting
   */
  SHIPPING_ZONES_SEQUENTIAL: 3,
} as const;

/**
 * Delay configurations for rate limiting protection
 */
export const DelayConfig = {
  /**
   * Default delay in milliseconds between processing chunks
   * Used to prevent rate limiting when processing large batches
   */
  DEFAULT_CHUNK_DELAY_MS: 500,

  /**
   * Delay in milliseconds between processing individual models
   * Lower than chunk delay as models are processed one at a time
   */
  MODEL_PROCESSING_DELAY_MS: 100,

  /**
   * Delay in milliseconds between processing category tree levels
   * Applied between levels (not items) to minimize total wait time
   */
  CATEGORY_LEVEL_DELAY_MS: 200,
} as const;

/**
 * Chunk size configurations for batch processing
 */
export const ChunkSizeConfig = {
  /**
   * Default number of items to process in each chunk
   * Used across all bulk operations unless overridden
   */
  DEFAULT_CHUNK_SIZE: 10,

  /**
   * Chunk size specifically for product types
   * Product types are less prone to rate limiting
   */
  PRODUCT_TYPES_CHUNK_SIZE: 10,

  /**
   * Maximum concurrent categories to create within a level
   * Controls parallelism for sibling categories
   */
  CATEGORIES_CONCURRENCY: 5,
} as const;

/**
 * Retry configuration for GraphQL client
 */
export const RetryConfig = {
  /**
   * Initial delay in milliseconds before the first retry attempt
   */
  INITIAL_DELAY_MS: 1000,

  /**
   * Maximum delay in milliseconds between retry attempts
   */
  MAX_DELAY_MS: 15000,

  /**
   * Maximum number of retry attempts before giving up
   */
  MAX_ATTEMPTS: 3,

  /**
   * Whether to add random jitter to retry delays to prevent thundering herd
   */
  USE_RANDOM_DELAY: true,
} as const;

/**
 * Error policy options for bulk mutations
 */
export const ErrorPolicy = {
  /**
   * Continue processing even if individual items fail
   * Failed items will be reported separately
   */
  IGNORE_FAILED: "IGNORE_FAILED",

  /**
   * Stop processing on first failure
   * All subsequent items will not be processed
   */
  REJECT_EVERYTHING: "REJECT_EVERYTHING",

  /**
   * Reject only failed items
   * Successful items will be committed
   */
  REJECT_FAILED_ROWS: "REJECT_FAILED_ROWS",
} as const;

/**
 * Logging messages for bulk operations
 */
export const BulkOperationMessages = {
  NO_ITEMS: "No items to process in chunks",
  SEQUENTIAL_PROCESSING: (count: number, entityType: string) =>
    `Processing ${count} ${entityType} sequentially (small config)`,
  BULK_PROCESSING: (count: number, entityType: string) =>
    `Processing ${count} ${entityType} via bulk operations`,
  SEQUENTIAL_WITH_DELAY: (count: number, entityType: string, delayMs: number) =>
    `Processing ${count} ${entityType} sequentially with ${delayMs}ms delay to avoid rate limiting`,
  CHUNK_PROCESSING_START: (
    itemCount: number,
    entityType: string,
    chunkCount: number,
    chunkSize: number,
    delayMs: number
  ) =>
    `Processing ${itemCount} ${entityType} in ${chunkCount} chunks of ${chunkSize} with ${delayMs}ms delay`,
  CHUNK_COMPLETE: (chunkNumber: number, totalChunks: number, successCount: number) =>
    `Completed chunk ${chunkNumber}/${totalChunks} with ${successCount} successes`,
  PROCESSING_COMPLETE: (itemsProcessed: number, chunksProcessed: number) =>
    `Chunked processing completed successfully: ${itemsProcessed} items in ${chunksProcessed} chunks`,
  PROCESSING_COMPLETE_WITH_FAILURES: (
    successCount: number,
    failureCount: number,
    chunksProcessed: number
  ) =>
    `Chunked processing completed with ${failureCount} failures (${successCount} successes, ${chunksProcessed} chunks)`,
} as const;

/**
 * Stage names for deployment pipeline
 */
export const StageNames = {
  VALIDATION: "Validating configuration",
  SHOP_SETTINGS: "Updating shop settings",
  PRODUCT_TYPES: "Managing product types",
  ATTRIBUTES: "Managing attributes",
  CHANNELS: "Managing channels",
  PAGE_TYPES: "Managing page types",
  MODEL_TYPES: "Managing model types",
  COLLECTIONS: "Managing collections",
  MENUS: "Managing menus",
  MODELS: "Managing models",
  CATEGORIES: "Managing categories",
  WAREHOUSES: "Managing warehouses",
  TAX_CLASSES: "Managing tax classes",
  SHIPPING_ZONES: "Managing shipping zones",
  ATTRIBUTE_CHOICES_PREFLIGHT: "Preparing attribute choices",
  PRODUCTS: "Managing products",
} as const;

/**
 * Entity type names for logging and error reporting
 */
export const EntityTypes = {
  SHOP_SETTINGS: "Shop Settings",
  PRODUCT_TYPES: "Product Types",
  ATTRIBUTES: "Attributes",
  CHANNELS: "Channels",
  PAGE_TYPES: "Page Types",
  MODEL_TYPES: "Model Types",
  COLLECTIONS: "Collections",
  MENUS: "Menus",
  MODELS: "Models",
  CATEGORIES: "Categories",
  WAREHOUSES: "Warehouses",
  TAX_CLASSES: "TaxClasses",
  SHIPPING_ZONES: "Shipping Zones",
  PRODUCTS: "Products",
} as const;
