import { afterEach, beforeEach, describe, expect, it, type MockedFunction, vi } from "vitest";
import { logger } from "../logger";
import { ChunkedProcessor, processInChunks } from "./chunked-processor";

// Mock dependencies
vi.mock("../logger");

const mockedLogger = logger as unknown as {
  debug: MockedFunction<typeof logger.debug>;
  info: MockedFunction<typeof logger.info>;
  warn: MockedFunction<typeof logger.warn>;
  error: MockedFunction<typeof logger.error>;
};

describe("ChunkedProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("splitIntoChunks", () => {
    it("should split array into chunks of specified size", () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const chunks = ChunkedProcessor.splitIntoChunks(items, 3);

      expect(chunks).toHaveLength(4);
      expect(chunks[0]).toEqual([1, 2, 3]);
      expect(chunks[1]).toEqual([4, 5, 6]);
      expect(chunks[2]).toEqual([7, 8, 9]);
      expect(chunks[3]).toEqual([10]);
    });

    it("should handle empty arrays", () => {
      const chunks = ChunkedProcessor.splitIntoChunks([], 5);
      expect(chunks).toHaveLength(0);
    });

    it("should handle chunk size larger than array", () => {
      const items = [1, 2, 3];
      const chunks = ChunkedProcessor.splitIntoChunks(items, 10);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual([1, 2, 3]);
    });

    it("should handle chunk size of 1", () => {
      const items = [1, 2, 3];
      const chunks = ChunkedProcessor.splitIntoChunks(items, 1);

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toEqual([1]);
      expect(chunks[1]).toEqual([2]);
      expect(chunks[2]).toEqual([3]);
    });
  });

  describe("processInChunks", () => {
    describe("Empty Arrays", () => {
      it("should handle empty items array", async () => {
        const processFn = vi.fn();

        const result = await processInChunks([], processFn);

        expect(result.successes).toHaveLength(0);
        expect(result.failures).toHaveLength(0);
        expect(result.chunksProcessed).toBe(0);
        expect(processFn).not.toHaveBeenCalled();
        expect(mockedLogger.debug).toHaveBeenCalledWith("No items to process in chunks");
      });
    });

    describe("Successful Operations", () => {
      it("should process all items successfully in chunks", async () => {
        const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

        const processFn = vi.fn().mockImplementation(async (chunk: typeof items) => {
          return chunk.map((item) => ({ ...item, processed: true }));
        });

        const promise = processInChunks(items, processFn, {
          chunkSize: 10,
          delayMs: 100,
          entityType: "products",
        });

        // Fast-forward through all delays
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result.successes).toHaveLength(25);
        expect(result.failures).toHaveLength(0);
        expect(result.chunksProcessed).toBe(3);
        expect(processFn).toHaveBeenCalledTimes(3);

        // Verify logging - using new message format
        expect(mockedLogger.info).toHaveBeenCalledWith(
          expect.stringContaining("Processing 25 products in 3 chunks")
        );

        expect(mockedLogger.info).toHaveBeenCalledWith(
          expect.stringContaining("Chunked processing completed successfully"),
          expect.objectContaining({
            entityType: "products",
          })
        );
      });

      it("should process single chunk without delay", async () => {
        const items = [1, 2, 3, 4, 5];
        const processFn = vi.fn().mockResolvedValue(items.map((i) => i * 2));

        const result = await processInChunks(items, processFn, {
          chunkSize: 10,
          delayMs: 500,
        });

        expect(result.successes).toHaveLength(5);
        expect(result.chunksProcessed).toBe(1);
        expect(processFn).toHaveBeenCalledTimes(1);

        // No delay should happen for single chunk
        expect(mockedLogger.debug).not.toHaveBeenCalledWith(
          expect.stringContaining("Waiting"),
          expect.anything()
        );
      });

      it("should add delays between chunks", async () => {
        const items = [1, 2, 3, 4, 5, 6];
        const processFn = vi.fn().mockResolvedValue([]);

        const promise = processInChunks(items, processFn, {
          chunkSize: 2,
          delayMs: 300,
        });

        // First chunk processes immediately
        await vi.advanceTimersByTimeAsync(0);
        expect(processFn).toHaveBeenCalledTimes(1);

        // Wait for delay and second chunk
        await vi.advanceTimersByTimeAsync(300);
        expect(processFn).toHaveBeenCalledTimes(2);

        // Wait for delay and third chunk
        await vi.advanceTimersByTimeAsync(300);
        expect(processFn).toHaveBeenCalledTimes(3);

        await promise;

        expect(mockedLogger.debug).toHaveBeenCalledWith(
          expect.stringContaining("Waiting 300ms before next chunk"),
          expect.objectContaining({
            nextChunk: 2,
          })
        );
        expect(mockedLogger.debug).toHaveBeenCalledWith(
          expect.stringContaining("Waiting 300ms before next chunk"),
          expect.objectContaining({
            nextChunk: 3,
          })
        );
      });

      it("should use default options when not specified", async () => {
        const items = Array.from({ length: 15 }, (_, i) => i);
        const processFn = vi.fn().mockResolvedValue([]);

        const promise = processInChunks(items, processFn);
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result.chunksProcessed).toBe(2); // 15 items / 10 per chunk = 2 chunks
        expect(processFn).toHaveBeenCalledTimes(2);

        // Check default values were used - simplified check
        expect(mockedLogger.info).toHaveBeenCalledWith(
          expect.stringContaining("Processing 15 items")
        );
      });
    });

    describe("Error Handling", () => {
      it("should handle chunk processing failure", async () => {
        const items = [1, 2, 3, 4, 5, 6];
        const error = new Error("Processing failed");

        const processFn = vi
          .fn()
          .mockResolvedValueOnce([10, 20]) // First chunk succeeds
          .mockRejectedValueOnce(error) // Second chunk fails
          .mockResolvedValueOnce([50, 60]); // Third chunk succeeds

        const result = await processInChunks(items, processFn, {
          chunkSize: 2,
          delayMs: 0,
        });

        expect(result.successes).toHaveLength(4); // 2 from first + 2 from third
        expect(result.failures).toHaveLength(2); // 2 from second chunk
        expect(result.chunksProcessed).toBe(3);

        // Verify all items from failed chunk are marked as failures
        expect(result.failures[0].item).toBe(3);
        expect(result.failures[1].item).toBe(4);
        expect(result.failures[0].error).toBe(error);
        expect(result.failures[1].error).toBe(error);

        expect(mockedLogger.error).toHaveBeenCalledWith(
          expect.stringContaining("Failed to process chunk 2/3"),
          expect.objectContaining({
            error: "Processing failed",
            itemsInChunk: 2,
          })
        );

        expect(mockedLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining("Chunked processing completed with 2 failures"),
          expect.anything()
        );
      });

      it("should convert non-Error objects to Error instances", async () => {
        const items = [1, 2];
        const processFn = vi.fn().mockRejectedValue("String error");

        const result = await processInChunks(items, processFn, { chunkSize: 2 });

        expect(result.failures).toHaveLength(2);
        expect(result.failures[0].error).toBeInstanceOf(Error);
        expect(result.failures[0].error.message).toBe("String error");
      });

      it("should continue processing after chunk failure", async () => {
        const items = Array.from({ length: 15 }, (_, i) => i + 1);

        const processFn = vi
          .fn()
          .mockResolvedValueOnce(items.slice(0, 5).map((i) => i * 2)) // Chunk 1 succeeds with results
          .mockRejectedValueOnce(new Error("Chunk 2 failed")) // Chunk 2 fails
          .mockResolvedValueOnce(items.slice(10, 15).map((i) => i * 2)); // Chunk 3 succeeds with results

        const result = await processInChunks(items, processFn, {
          chunkSize: 5,
          delayMs: 0,
        });

        expect(result.chunksProcessed).toBe(3);
        expect(result.successes).toHaveLength(10); // Items from chunks 1 and 3
        expect(result.failures).toHaveLength(5); // Items from chunk 2
        expect(processFn).toHaveBeenCalledTimes(3);
      });

      it("should handle all chunks failing", async () => {
        const items = [1, 2, 3, 4];
        const processFn = vi.fn().mockRejectedValue(new Error("All failed"));

        const result = await processInChunks(items, processFn, {
          chunkSize: 2,
          delayMs: 0,
        });

        expect(result.successes).toHaveLength(0);
        expect(result.failures).toHaveLength(4);
        expect(result.chunksProcessed).toBe(2);

        expect(mockedLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining("Chunked processing completed with 4 failures"),
          expect.anything()
        );
      });
    });

    describe("Result Mapping", () => {
      it("should handle array results correctly", async () => {
        const items = [
          { slug: "product-1", name: "Product 1" },
          { slug: "product-2", name: "Product 2" },
        ];

        const processFn = vi.fn().mockResolvedValue([
          { id: "1", slug: "product-1" },
          { id: "2", slug: "product-2" },
        ]);

        const result = await processInChunks(items, processFn, { chunkSize: 2 });

        expect(result.successes).toHaveLength(2);
        expect(result.successes[0].item).toEqual(items[0]);
        expect(result.successes[0].result).toEqual({ id: "1", slug: "product-1" });
        expect(result.successes[1].item).toEqual(items[1]);
        expect(result.successes[1].result).toEqual({ id: "2", slug: "product-2" });
      });

      it("should handle single result for entire chunk", async () => {
        const items = [1, 2, 3];
        const processFn = vi.fn().mockResolvedValue({ status: "success", count: 3 });

        const result = await processInChunks(items, processFn, { chunkSize: 5 });

        expect(result.successes).toHaveLength(3);
        // Each item gets the same result
        result.successes.forEach((success) => {
          expect(success.result).toEqual({ status: "success", count: 3 });
        });
      });

      it("should handle mismatched array lengths gracefully", async () => {
        const items = [1, 2, 3, 4, 5];
        // Processor returns fewer results than input items
        const processFn = vi.fn().mockResolvedValue([10, 20]);

        const result = await processInChunks(items, processFn, { chunkSize: 5 });

        // Each item gets matched with result by index, extras get the whole array
        expect(result.successes).toHaveLength(5);
        expect(result.successes[0].item).toBe(1);
        expect(result.successes[0].result).toBe(10);
        expect(result.successes[1].item).toBe(2);
        expect(result.successes[1].result).toBe(20);
        // Items beyond result array length get the whole result array
        expect(result.successes[2].result).toEqual([10, 20]);
      });
    });

    describe("Real-World Scenarios", () => {
      interface ProductType {
        slug: string;
        name: string;
        weight?: string;
      }

      it("should process product types in chunks", async () => {
        const productTypes: ProductType[] = Array.from({ length: 25 }, (_, i) => ({
          slug: `type-${i + 1}`,
          name: `Product Type ${i + 1}`,
        }));

        const processFn = vi.fn().mockImplementation(async (chunk: ProductType[]) => {
          return chunk.map((pt) => ({ id: `id-${pt.slug}`, ...pt }));
        });

        const promise = processInChunks(productTypes, processFn, {
          chunkSize: 10,
          delayMs: 500,
          entityType: "product types",
        });

        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result.successes).toHaveLength(25);
        expect(result.failures).toHaveLength(0);
        expect(result.chunksProcessed).toBe(3);

        // Verify chunks are correct sizes
        expect(processFn).toHaveBeenNthCalledWith(1, productTypes.slice(0, 10));
        expect(processFn).toHaveBeenNthCalledWith(2, productTypes.slice(10, 20));
        expect(processFn).toHaveBeenNthCalledWith(3, productTypes.slice(20, 25));
      });

      it("should handle warehouse stock updates with rate limiting", async () => {
        interface StockUpdate {
          warehouse: string;
          sku: string;
          quantity: number;
        }

        const stockUpdates: StockUpdate[] = Array.from({ length: 50 }, (_, i) => ({
          warehouse: `warehouse-${(i % 5) + 1}`,
          sku: `SKU-${i + 1}`,
          quantity: Math.floor(Math.random() * 100),
        }));

        const processFn = vi.fn().mockImplementation(async (chunk: StockUpdate[]) => {
          // Simulate API response
          return chunk.map((update) => ({ ...update, updated: true }));
        });

        const promise = processInChunks(stockUpdates, processFn, {
          chunkSize: 10,
          delayMs: 1000,
          entityType: "stock updates",
        });

        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result.successes).toHaveLength(50);
        expect(result.chunksProcessed).toBe(5);
        expect(processFn).toHaveBeenCalledTimes(5);

        // Verify delays between chunks
        expect(mockedLogger.debug).toHaveBeenCalledWith(
          expect.stringContaining("Waiting 1000ms before next chunk"),
          expect.objectContaining({
            nextChunk: 2,
          })
        );
      });

      it("should handle mixed success and failure in product collection updates", async () => {
        interface Collection {
          slug: string;
          name: string;
          products: string[];
        }

        const collections: Collection[] = [
          { slug: "summer", name: "Summer Sale", products: ["p1", "p2"] },
          { slug: "winter", name: "Winter Sale", products: ["p3", "p4"] },
          { slug: "invalid", name: "Invalid Collection", products: [] }, // Will fail
          { slug: "spring", name: "Spring Sale", products: ["p5"] },
        ];

        const processFn = vi
          .fn()
          .mockResolvedValueOnce([]) // First chunk (2 items) succeeds
          .mockRejectedValueOnce(new Error("Invalid collection: no products")); // Second chunk fails

        const promise = processInChunks(collections, processFn, {
          chunkSize: 2,
          delayMs: 100,
          entityType: "collections",
        });

        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result.successes).toHaveLength(2);
        expect(result.failures).toHaveLength(2);
        expect(result.chunksProcessed).toBe(2);

        expect(result.failures[0].item.slug).toBe("invalid");
        expect(result.failures[1].item.slug).toBe("spring");
      });
    });

    describe("Performance and Timing", () => {
      it("should respect delay timing between chunks", async () => {
        const items = [1, 2, 3, 4, 5, 6];
        const processFn = vi.fn().mockResolvedValue([]);
        const delayMs = 250;

        const promise = processInChunks(items, processFn, {
          chunkSize: 2,
          delayMs,
        });

        // Initial chunk processes immediately
        await vi.advanceTimersByTimeAsync(0);
        expect(processFn).toHaveBeenCalledTimes(1);

        // After first delay, second chunk should process
        await vi.advanceTimersByTimeAsync(delayMs);
        expect(processFn).toHaveBeenCalledTimes(2);

        // After second delay, third chunk should process
        await vi.advanceTimersByTimeAsync(delayMs);
        expect(processFn).toHaveBeenCalledTimes(3);

        await promise;

        const result = await promise;
        expect(result.chunksProcessed).toBe(3);
      });

      it("should not add delay after the last chunk", async () => {
        const items = [1, 2, 3, 4];
        const processFn = vi.fn().mockResolvedValue([]);

        const promise = processInChunks(items, processFn, {
          chunkSize: 2,
          delayMs: 100,
        });

        await vi.runAllTimersAsync();
        await promise;

        // Should only log waiting for chunks 1->2, not after chunk 2
        const waitingCalls = mockedLogger.debug.mock.calls.filter(
          (call) => typeof call[0] === "string" && call[0].includes("Waiting")
        );
        expect(waitingCalls).toHaveLength(1);
      });

      it("should process chunks sequentially not concurrently", async () => {
        const items = [1, 2, 3, 4, 5, 6];
        const processingOrder: number[] = [];

        const processFn = vi.fn().mockImplementation(async (chunk: number[]) => {
          processingOrder.push(chunk[0]);
          return [];
        });

        await processInChunks(items, processFn, {
          chunkSize: 2,
          delayMs: 0,
        });

        // Verify chunks were processed in order
        expect(processingOrder).toEqual([1, 3, 5]);
        expect(processFn).toHaveBeenCalledTimes(3);
      });
    });
  });
});
