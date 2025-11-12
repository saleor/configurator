import { logger } from "../logger";

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
 * Splits an array into chunks of a specified size
 */
function splitIntoChunks<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Processes items in chunks with configurable delay between chunks
 *
 * This utility is designed to prevent rate limiting by:
 * - Splitting large arrays into smaller batches
 * - Adding delays between batch processing
 * - Handling errors gracefully without stopping the entire process
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
  const { chunkSize = 10, delayMs = 500, entityType = "items" } = options;

  if (items.length === 0) {
    logger.debug("No items to process in chunks");
    return { successes: [], failures: [], chunksProcessed: 0 };
  }

  const chunks = splitIntoChunks(items, chunkSize);
  const totalChunks = chunks.length;

  logger.info(`Processing ${items.length} ${entityType} in ${totalChunks} chunks`, {
    chunkSize,
    delayMs,
    totalItems: items.length,
  });

  const successes: Array<{ item: T; result: R }> = [];
  const failures: Array<{ item: T; error: Error }> = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkNumber = i + 1;

    try {
      logger.debug(`Processing chunk ${chunkNumber}/${totalChunks}`, {
        itemsInChunk: chunk.length,
      });

      const result = await processFn(chunk);

      // If the processor returns an array, assume each result corresponds to an item
      if (Array.isArray(result) && result.length > 0) {
        chunk.forEach((item, idx) => {
          if (idx < result.length) {
            successes.push({ item, result: result[idx] as R });
          }
        });
      } else if (Array.isArray(result) && result.length === 0) {
        // Empty array means successful processing but no individual results
        // Treat as single "success" result for all items
        chunk.forEach((item) => {
          successes.push({ item, result: result as R });
        });
      } else {
        // If single result, associate with all items in chunk
        chunk.forEach((item) => {
          successes.push({ item, result });
        });
      }

      logger.debug(`Completed chunk ${chunkNumber}/${totalChunks}`, {
        successCount: chunk.length,
      });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));

      logger.error(`Failed to process chunk ${chunkNumber}/${totalChunks}`, {
        error: errorObj.message,
        itemsInChunk: chunk.length,
      });

      // Mark all items in the failed chunk as failures
      chunk.forEach((item) => {
        failures.push({ item, error: errorObj });
      });
    }

    // Add delay between chunks (but not after the last chunk)
    if (i < chunks.length - 1 && delayMs > 0) {
      logger.debug(`Waiting ${delayMs}ms before next chunk`, {
        nextChunk: chunkNumber + 1,
      });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const summary = {
    successes,
    failures,
    chunksProcessed: totalChunks,
  };

  if (failures.length > 0) {
    logger.warn(`Chunked processing completed with ${failures.length} failures`, {
      successCount: successes.length,
      failureCount: failures.length,
      chunksProcessed: totalChunks,
    });
  } else {
    logger.info(`Chunked processing completed successfully`, {
      itemsProcessed: successes.length,
      chunksProcessed: totalChunks,
    });
  }

  return summary;
}

/**
 * Chunked processor utility
 * Provides consistent chunked processing with rate limiting protection
 */
export const ChunkedProcessor = {
  processInChunks,
  splitIntoChunks,
};
