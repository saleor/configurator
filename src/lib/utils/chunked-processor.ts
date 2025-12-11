import { logger } from "../logger";
import { BulkOperationMessages, ChunkSizeConfig, DelayConfig } from "./bulk-operation-constants";

/**
 * Options for chunked processing
 */
export interface ChunkedProcessorOptions {
  /**
   * Number of items to process in each chunk
   * @default 10
   */
  chunkSize?: number;

  /**
   * Delay in milliseconds between processing chunks
   * @default 500
   */
  delayMs?: number;

  /**
   * Entity type for logging context (e.g., "product types", "warehouses")
   */
  entityType?: string;
}

/**
 * Result of chunked processing
 */
export interface ChunkedProcessorResult<T, R> {
  /**
   * Successfully processed items with their results
   */
  successes: Array<{ item: T; result: R }>;

  /**
   * Failed items with their errors
   */
  failures: Array<{ item: T; error: Error }>;

  /**
   * Total number of chunks processed
   */
  chunksProcessed: number;
}

/**
 * Configuration for chunk splitting
 */
interface ChunkSplitConfig {
  readonly chunkSize: number;
}

/**
 * Configuration for delay between chunk processing
 */
interface DelayBetweenChunksConfig {
  readonly delayMs: number;
}

/**
 * Splits an array into chunks of a specified size
 * Follows Single Responsibility Principle - only handles array splitting logic
 */
class ChunkSplitter<T> {
  constructor(private readonly config: ChunkSplitConfig) {}

  /**
   * Splits items into chunks
   * @param items - Array of items to split
   * @returns Array of chunks
   */
  split(items: T[]): T[][] {
    const chunks: T[][] = [];
    const { chunkSize } = this.config;

    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }

    return chunks;
  }
}

/**
 * Handles delay between processing operations
 * Follows Single Responsibility Principle - only handles timing logic
 */
class ChunkDelayManager {
  constructor(private readonly config: DelayBetweenChunksConfig) {}

  /**
   * Creates a delay promise
   * @returns Promise that resolves after the configured delay
   */
  async delay(): Promise<void> {
    if (this.config.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.config.delayMs));
    }
  }

  /**
   * Logs delay information
   * @param currentChunk - Current chunk number (1-indexed)
   * @param nextChunk - Next chunk number (1-indexed)
   */
  logDelay(currentChunk: number, nextChunk: number): void {
    if (this.config.delayMs > 0) {
      logger.debug(`Waiting ${this.config.delayMs}ms before next chunk`, {
        currentChunk,
        nextChunk,
      });
    }
  }
}

/**
 * Handles result mapping for chunk processing
 * Follows Single Responsibility Principle - only handles result transformation
 */
class ChunkResultMapper<T, R> {
  /**
   * Maps processing result to success entries
   * Handles both array and single result types
   *
   * @param chunk - Items that were processed
   * @param result - Result from processing function
   * @returns Array of success entries
   */
  mapToSuccesses(chunk: T[], result: R): Array<{ item: T; result: R }> {
    // If the processor returns an array, assume each result corresponds to an item
    if (Array.isArray(result) && result.length > 0) {
      return chunk.map((item, idx) => ({
        item,
        result: idx < result.length ? (result[idx] as R) : result,
      }));
    }

    // Empty array or single result - associate with all items in chunk
    return chunk.map((item) => ({ item, result }));
  }

  /**
   * Creates failure entries for all items in a chunk
   *
   * @param chunk - Items that failed processing
   * @param error - Error that occurred during processing
   * @returns Array of failure entries
   */
  mapToFailures(chunk: T[], error: Error): Array<{ item: T; error: Error }> {
    return chunk.map((item) => ({ item, error }));
  }
}

/**
 * Processor for handling chunked operations
 * Follows Open/Closed Principle - extensible through configuration
 * Follows Dependency Inversion - depends on abstractions (options) not concrete implementations
 */
class ChunkedOperationProcessor<T, R> {
  private readonly splitter: ChunkSplitter<T>;
  private readonly delayManager: ChunkDelayManager;
  private readonly resultMapper: ChunkResultMapper<T, R>;
  private readonly entityType: string;

  constructor(private readonly options: Required<ChunkedProcessorOptions>) {
    this.splitter = new ChunkSplitter({ chunkSize: options.chunkSize });
    this.delayManager = new ChunkDelayManager({ delayMs: options.delayMs });
    this.resultMapper = new ChunkResultMapper();
    this.entityType = options.entityType;
  }

  /**
   * Processes all items in chunks
   *
   * @param items - Items to process
   * @param processFn - Function to process each chunk
   * @returns Promise resolving to processing results
   */
  async process(
    items: T[],
    processFn: (chunk: T[]) => Promise<R>
  ): Promise<ChunkedProcessorResult<T, R>> {
    if (items.length === 0) {
      logger.debug(BulkOperationMessages.NO_ITEMS);
      return this.createEmptyResult();
    }

    const chunks = this.splitter.split(items);
    this.logProcessingStart(items.length, chunks.length);

    const successes: Array<{ item: T; result: R }> = [];
    const failures: Array<{ item: T; error: Error }> = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkNumber = i + 1;

      await this.processChunk(chunk, chunkNumber, chunks.length, processFn, successes, failures);

      // Add delay between chunks (but not after the last chunk)
      if (i < chunks.length - 1) {
        this.delayManager.logDelay(chunkNumber, chunkNumber + 1);
        await this.delayManager.delay();
      }
    }

    return this.createResult(successes, failures, chunks.length);
  }

  /**
   * Processes a single chunk
   */
  private async processChunk(
    chunk: T[],
    chunkNumber: number,
    totalChunks: number,
    processFn: (chunk: T[]) => Promise<R>,
    successes: Array<{ item: T; result: R }>,
    failures: Array<{ item: T; error: Error }>
  ): Promise<void> {
    try {
      this.logChunkStart(chunkNumber, totalChunks, chunk.length);
      const result = await processFn(chunk);
      const chunkSuccesses = this.resultMapper.mapToSuccesses(chunk, result);
      successes.push(...chunkSuccesses);
      this.logChunkSuccess(chunkNumber, totalChunks, chunk.length);
    } catch (error) {
      const errorObj = this.normalizeError(error);
      const chunkFailures = this.resultMapper.mapToFailures(chunk, errorObj);
      failures.push(...chunkFailures);
      this.logChunkFailure(chunkNumber, totalChunks, chunk.length, errorObj);
    }
  }

  /**
   * Normalizes any thrown value to an Error instance
   */
  private normalizeError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  }

  /**
   * Creates an empty result
   */
  private createEmptyResult(): ChunkedProcessorResult<T, R> {
    return { successes: [], failures: [], chunksProcessed: 0 };
  }

  /**
   * Creates the final result object
   */
  private createResult(
    successes: Array<{ item: T; result: R }>,
    failures: Array<{ item: T; error: Error }>,
    chunksProcessed: number
  ): ChunkedProcessorResult<T, R> {
    this.logFinalResults(successes.length, failures.length, chunksProcessed);
    return { successes, failures, chunksProcessed };
  }

  /**
   * Logging methods - extracted for clarity and maintainability
   */

  private logProcessingStart(itemCount: number, chunkCount: number): void {
    logger.info(
      BulkOperationMessages.CHUNK_PROCESSING_START(
        itemCount,
        this.entityType,
        chunkCount,
        this.options.chunkSize,
        this.options.delayMs
      )
    );
  }

  private logChunkStart(chunkNumber: number, totalChunks: number, itemCount: number): void {
    logger.debug(`Processing chunk ${chunkNumber}/${totalChunks}`, {
      itemsInChunk: itemCount,
      entityType: this.entityType,
    });
  }

  private logChunkSuccess(chunkNumber: number, totalChunks: number, successCount: number): void {
    logger.debug(BulkOperationMessages.CHUNK_COMPLETE(chunkNumber, totalChunks, successCount), {
      entityType: this.entityType,
    });
  }

  private logChunkFailure(
    chunkNumber: number,
    totalChunks: number,
    itemCount: number,
    error: Error
  ): void {
    logger.error(`Failed to process chunk ${chunkNumber}/${totalChunks}`, {
      error: error.message,
      itemsInChunk: itemCount,
      entityType: this.entityType,
    });
  }

  private logFinalResults(
    successCount: number,
    failureCount: number,
    chunksProcessed: number
  ): void {
    if (failureCount > 0) {
      logger.warn(
        BulkOperationMessages.PROCESSING_COMPLETE_WITH_FAILURES(
          successCount,
          failureCount,
          chunksProcessed
        ),
        {
          entityType: this.entityType,
        }
      );
    } else {
      logger.info(BulkOperationMessages.PROCESSING_COMPLETE(successCount, chunksProcessed), {
        entityType: this.entityType,
      });
    }
  }
}

/**
 * Processes items in chunks with configurable delay between chunks
 *
 * This utility is designed to prevent rate limiting by:
 * - Splitting large arrays into smaller batches
 * - Adding delays between batch processing
 * - Handling errors gracefully without stopping the entire process
 *
 * Follows SOLID principles:
 * - Single Responsibility: Each class has one clear purpose
 * - Open/Closed: Extensible through configuration without modification
 * - Liskov Substitution: All implementations follow their contracts
 * - Interface Segregation: Clean, focused interfaces
 * - Dependency Inversion: Depends on abstractions (options) not concrete implementations
 *
 * @template T - The type of items to process
 * @template R - The type of results returned by the processor
 *
 * @param items - Array of items to process
 * @param processFn - Async function that processes a chunk of items
 * @param options - Configuration options for chunk size, delay, and logging
 *
 * @returns Promise resolving to results with successes, failures, and metrics
 *
 * @example
 * ```typescript
 * const productTypes = [...]; // Array of product type inputs
 *
 * const result = await processInChunks(
 *   productTypes,
 *   async (chunk) => await createProductTypes(chunk),
 *   {
 *     chunkSize: 10,
 *     delayMs: 500,
 *     entityType: "product types"
 *   }
 * );
 *
 * console.log(`Processed ${result.successes.length} items successfully`);
 * console.log(`Failed ${result.failures.length} items`);
 * ```
 */
export async function processInChunks<T, R>(
  items: T[],
  processFn: (chunk: T[]) => Promise<R>,
  options: ChunkedProcessorOptions = {}
): Promise<ChunkedProcessorResult<T, R>> {
  const defaultedOptions: Required<ChunkedProcessorOptions> = {
    chunkSize: options.chunkSize ?? ChunkSizeConfig.DEFAULT_CHUNK_SIZE,
    delayMs: options.delayMs ?? DelayConfig.DEFAULT_CHUNK_DELAY_MS,
    entityType: options.entityType ?? "items",
  };

  const processor = new ChunkedOperationProcessor<T, R>(defaultedOptions);
  return processor.process(items, processFn);
}

/**
 * Splits an array into chunks of a specified size
 * Exported for use in other modules that need chunk splitting without processing
 *
 * @param items - Array to split
 * @param chunkSize - Size of each chunk
 * @returns Array of chunks
 */
export function splitIntoChunks<T>(items: T[], chunkSize: number): T[][] {
  const splitter = new ChunkSplitter<T>({ chunkSize });
  return splitter.split(items);
}

/**
 * Chunked processor utility
 * Provides consistent chunked processing with rate limiting protection
 */
export const ChunkedProcessor = {
  processInChunks,
  splitIntoChunks,
};
