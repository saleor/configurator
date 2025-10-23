import type { CombinedError } from "@urql/core";
import { beforeEach, describe, expect, it, type MockedFunction, vi } from "vitest";
import { GraphQLError } from "../errors/graphql";
import { logger } from "../logger";
import { ServiceErrorWrapper } from "./error-wrapper";

// Type for GraphQL error objects in CombinedError
type GraphQLErrorObject = {
  message: string;
  locations?: unknown;
  path?: unknown;
  extensions?: unknown;
};

// Mock dependencies
vi.mock("../errors/graphql");
vi.mock("../logger");

const mockedGraphQLError = GraphQLError as unknown as {
  fromCombinedError: MockedFunction<typeof GraphQLError.fromCombinedError>;
};

const mockedLogger = logger as unknown as {
  debug: MockedFunction<typeof logger.debug>;
  error: MockedFunction<typeof logger.error>;
  warn: MockedFunction<typeof logger.warn>;
};

// Custom test error class
class TestServiceError extends Error {
  constructor(
    message: string,
    public entityIdentifier?: unknown
  ) {
    super(message);
    this.name = "TestServiceError";
  }
}

// Mock GraphQLError class
class MockGraphQLError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "GraphQLError";
  }

  getRecoverySuggestions(): string[] {
    return [];
  }
}

// Mock CombinedError from URQL
const createMockCombinedError = (message: string): CombinedError => {
  const graphQLError: GraphQLErrorObject = { message };
  return {
    name: "CombinedError",
    message,
    graphQLErrors: [graphQLError],
    networkError: undefined,
    response: {},
  } as CombinedError;
};

describe("ServiceErrorWrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("wrapServiceCall", () => {
    describe("Successful Operations", () => {
      it("should return result from successful operation", async () => {
        const mockResult = { id: "test-id", name: "Test Entity" };
        const mockFn = vi.fn().mockResolvedValue(mockResult);

        const result = await ServiceErrorWrapper.wrapServiceCall(
          "create",
          "Product",
          "test-product",
          mockFn
        );

        expect(result).toBe(mockResult);
        expect(mockFn).toHaveBeenCalledOnce();
        expect(mockedLogger.debug).toHaveBeenCalledWith("Starting create", {
          entityType: "Product",
          entityIdentifier: "test-product",
        });
        expect(mockedLogger.debug).toHaveBeenCalledWith("Completed create", {
          entityType: "Product",
          entityIdentifier: "test-product",
        });
      });

      it("should handle operation without entity identifier", async () => {
        const mockResult = "success";
        const mockFn = vi.fn().mockResolvedValue(mockResult);

        const result = await ServiceErrorWrapper.wrapServiceCall(
          "validate",
          "Configuration",
          undefined,
          mockFn
        );

        expect(result).toBe(mockResult);
        expect(mockedLogger.debug).toHaveBeenCalledWith("Starting validate", {
          entityType: "Configuration",
          entityIdentifier: undefined,
        });
        expect(mockedLogger.debug).toHaveBeenCalledWith("Completed validate", {
          entityType: "Configuration",
          entityIdentifier: undefined,
        });
      });
    });

    describe("Error Handling", () => {
      it("should re-throw existing error of expected type", async () => {
        const originalError = new TestServiceError("Specific error", "entity-id");
        const mockFn = vi.fn().mockRejectedValue(originalError);

        await expect(
          ServiceErrorWrapper.wrapServiceCall(
            "update",
            "Product",
            "product-id",
            mockFn,
            TestServiceError
          )
        ).rejects.toThrow(originalError);

        expect(mockedLogger.error).toHaveBeenCalledWith("Failed update", {
          entityType: "Product",
          entityIdentifier: "product-id",
          error: "Specific error",
        });
      });

      it("should handle GraphQL errors with proper context", async () => {
        const combinedError = createMockCombinedError("GraphQL validation error");
        const mockFn = vi.fn().mockRejectedValue(combinedError);
        const wrappedError = new MockGraphQLError("Wrapped GraphQL error", "GRAPHQL_ERROR");

        mockedGraphQLError.fromCombinedError.mockReturnValue(wrappedError as GraphQLError);

        await expect(
          ServiceErrorWrapper.wrapServiceCall("create", "Category", "electronics", mockFn)
        ).rejects.toThrow(wrappedError);

        expect(mockedGraphQLError.fromCombinedError).toHaveBeenCalledWith(
          "Failed to create for Category 'electronics'",
          combinedError
        );
        expect(mockedLogger.error).toHaveBeenCalledWith("Failed create", {
          entityType: "Category",
          entityIdentifier: "electronics",
          error: "[object Object]",
        });
      });

      it("should wrap error in provided ErrorClass", async () => {
        const originalError = new Error("Original error message");
        const mockFn = vi.fn().mockRejectedValue(originalError);

        await expect(
          ServiceErrorWrapper.wrapServiceCall(
            "delete",
            "Product",
            "product-123",
            mockFn,
            TestServiceError
          )
        ).rejects.toThrow(TestServiceError);

        try {
          await ServiceErrorWrapper.wrapServiceCall(
            "delete",
            "Product",
            "product-123",
            mockFn,
            TestServiceError
          );
        } catch (error) {
          expect(error).toBeInstanceOf(TestServiceError);
          expect((error as TestServiceError).message).toBe(
            "Failed to delete for Product 'product-123': Original error message"
          );
          expect((error as TestServiceError).entityIdentifier).toBe("product-123");
        }
      });

      it("should provide default error wrapping", async () => {
        const originalError = new Error("Something went wrong");
        const mockFn = vi.fn().mockRejectedValue(originalError);

        await expect(
          ServiceErrorWrapper.wrapServiceCall("sync", "Channel", "us-store", mockFn)
        ).rejects.toThrow("Failed to sync for Channel 'us-store': Something went wrong");
      });

      it("should handle non-Error objects", async () => {
        const mockFn = vi.fn().mockRejectedValue("String error");

        await expect(
          ServiceErrorWrapper.wrapServiceCall("process", "Data", "data-id", mockFn)
        ).rejects.toThrow("Failed to process for Data 'data-id': String error");

        expect(mockedLogger.error).toHaveBeenCalledWith("Failed process", {
          entityType: "Data",
          entityIdentifier: "data-id",
          error: "String error",
        });
      });

      it("should format context without entity identifier", async () => {
        const originalError = new Error("Context test");
        const mockFn = vi.fn().mockRejectedValue(originalError);

        await expect(
          ServiceErrorWrapper.wrapServiceCall("validate", "Schema", undefined, mockFn)
        ).rejects.toThrow("Failed to validate for Schema: Context test");
      });
    });

    describe("GraphQL Error Detection", () => {
      it("should correctly identify CombinedError objects", async () => {
        const graphQLError: GraphQLErrorObject = { message: "Field error" };
        const validCombinedError: CombinedError = {
          name: "CombinedError",
          message: "GraphQL error",
          graphQLErrors: [graphQLError],
          networkError: undefined,
          response: {},
        } as CombinedError;

        const mockFn = vi.fn().mockRejectedValue(validCombinedError);
        const wrappedError = new MockGraphQLError("Handled GraphQL error", "GRAPHQL_ERROR");
        mockedGraphQLError.fromCombinedError.mockReturnValue(wrappedError as GraphQLError);

        await expect(
          ServiceErrorWrapper.wrapServiceCall("test", "Entity", "id", mockFn)
        ).rejects.toThrow(wrappedError);

        expect(mockedGraphQLError.fromCombinedError).toHaveBeenCalledTimes(1);
      });

      it("should not treat regular errors as CombinedErrors", async () => {
        const regularError = new Error("Regular error");
        // Add graphQLErrors property but not as array to test type guard
        (regularError as unknown as { graphQLErrors: string }).graphQLErrors = "not an array";

        const mockFn = vi.fn().mockRejectedValue(regularError);

        await expect(
          ServiceErrorWrapper.wrapServiceCall("test", "Entity", "id", mockFn)
        ).rejects.toThrow("Failed to test for Entity 'id': Regular error");

        expect(mockedGraphQLError.fromCombinedError).not.toHaveBeenCalled();
      });

      it("should handle null and undefined errors properly", async () => {
        const nullError = null;
        const mockFn = vi.fn().mockRejectedValue(nullError);

        await expect(
          ServiceErrorWrapper.wrapServiceCall("test", "Entity", "id", mockFn)
        ).rejects.toThrow("Failed to test for Entity 'id': null");

        expect(mockedGraphQLError.fromCombinedError).not.toHaveBeenCalled();
      });
    });
  });

  describe("wrapBatch", () => {
    const testItems = [
      { id: "1", name: "Item 1" },
      { id: "2", name: "Item 2" },
      { id: "3", name: "Item 3" },
      { id: "4", name: "Item 4" },
    ];

    const getIdentifier = (item: (typeof testItems)[0]) => item.name;

    describe("All Successful Operations", () => {
      it("should process all items successfully", async () => {
        const processFn = vi
          .fn()
          .mockResolvedValueOnce("Result 1")
          .mockResolvedValueOnce("Result 2")
          .mockResolvedValueOnce("Result 3")
          .mockResolvedValueOnce("Result 4");

        const result = await ServiceErrorWrapper.wrapBatch(
          testItems,
          "transform",
          getIdentifier,
          processFn
        );

        expect(result.successes).toHaveLength(4);
        expect(result.failures).toHaveLength(0);
        expect(result.successes[0]).toEqual({ item: testItems[0], result: "Result 1" });
        expect(result.successes[1]).toEqual({ item: testItems[1], result: "Result 2" });
        expect(processFn).toHaveBeenCalledTimes(4);
        expect(mockedLogger.warn).not.toHaveBeenCalled();
      });
    });

    describe("Mixed Success and Failure", () => {
      it("should handle mixed results correctly", async () => {
        const error2 = new Error("Failed item 2");
        const error4 = new Error("Failed item 4");

        const processFn = vi
          .fn()
          .mockResolvedValueOnce("Success 1")
          .mockRejectedValueOnce(error2)
          .mockResolvedValueOnce("Success 3")
          .mockRejectedValueOnce(error4);

        const result = await ServiceErrorWrapper.wrapBatch(
          testItems,
          "process",
          getIdentifier,
          processFn
        );

        expect(result.successes).toHaveLength(2);
        expect(result.failures).toHaveLength(2);

        expect(result.successes[0]).toEqual({ item: testItems[0], result: "Success 1" });
        expect(result.successes[1]).toEqual({ item: testItems[2], result: "Success 3" });

        expect(result.failures[0]).toEqual({ item: testItems[1], error: error2 });
        expect(result.failures[1]).toEqual({ item: testItems[3], error: error4 });

        expect(mockedLogger.warn).toHaveBeenCalledWith("process completed with 2 failures", {
          successCount: 2,
          failureCount: 2,
          failedItems: ["Item 2", "Item 4"],
        });
      });
    });

    describe("All Failed Operations", () => {
      it("should handle all failures", async () => {
        const errors = [
          new Error("Error 1"),
          new Error("Error 2"),
          new Error("Error 3"),
          new Error("Error 4"),
        ];

        const processFn = vi
          .fn()
          .mockRejectedValueOnce(errors[0])
          .mockRejectedValueOnce(errors[1])
          .mockRejectedValueOnce(errors[2])
          .mockRejectedValueOnce(errors[3]);

        const result = await ServiceErrorWrapper.wrapBatch(
          testItems,
          "deploy",
          getIdentifier,
          processFn
        );

        expect(result.successes).toHaveLength(0);
        expect(result.failures).toHaveLength(4);

        testItems.forEach((item, index) => {
          expect(result.failures[index]).toEqual({
            item,
            error: errors[index],
          });
        });

        expect(mockedLogger.warn).toHaveBeenCalledWith("deploy completed with 4 failures", {
          successCount: 0,
          failureCount: 4,
          failedItems: ["Item 1", "Item 2", "Item 3", "Item 4"],
        });
      });
    });

    describe("Error Handling", () => {
      it("should convert non-Error objects to Error instances", async () => {
        const processFn = vi
          .fn()
          .mockResolvedValueOnce("Success")
          .mockRejectedValueOnce("String error")
          .mockRejectedValueOnce(null)
          .mockRejectedValueOnce({ message: "Object error" });

        const result = await ServiceErrorWrapper.wrapBatch(
          testItems,
          "convert",
          getIdentifier,
          processFn
        );

        expect(result.successes).toHaveLength(1);
        expect(result.failures).toHaveLength(3);

        // Check that all failures have Error instances
        result.failures.forEach(({ error }) => {
          expect(error).toBeInstanceOf(Error);
        });

        expect(result.failures[0].error.message).toBe("String error");
        expect(result.failures[1].error.message).toBe("null");
        expect(result.failures[2].error.message).toBe("[object Object]");
      });

      it("should handle empty items array", async () => {
        const processFn = vi.fn();

        const result = await ServiceErrorWrapper.wrapBatch([], "empty", getIdentifier, processFn);

        expect(result.successes).toHaveLength(0);
        expect(result.failures).toHaveLength(0);
        expect(processFn).not.toHaveBeenCalled();
        expect(mockedLogger.warn).not.toHaveBeenCalled();
      });
    });

    describe("Real-World Scenarios", () => {
      interface Product {
        name: string;
        slug: string;
        productType?: string;
        category?: string;
      }

      const products: Product[] = [
        {
          name: "T-Shirt Basic",
          slug: "t-shirt-basic",
          productType: "Clothing",
          category: "Apparel",
        },
        { name: "Laptop Pro", slug: "laptop-pro", productType: "Electronics" }, // Missing category
        { name: "Book Guide", slug: "", category: "Books" }, // Empty slug
        {
          name: "Phone Case",
          slug: "phone-case",
          productType: "Accessories",
          category: "Electronics",
        },
      ];

      it("should simulate product creation with realistic errors", async () => {
        const processFn = vi
          .fn()
          .mockResolvedValueOnce({ id: "1", name: "T-Shirt Basic" })
          .mockRejectedValueOnce(new Error("Category 'Electronics' not found"))
          .mockRejectedValueOnce(new Error("slug is required"))
          .mockResolvedValueOnce({ id: "4", name: "Phone Case" });

        const result = await ServiceErrorWrapper.wrapBatch(
          products,
          "create product",
          (product) => product.name,
          processFn
        );

        expect(result.successes).toHaveLength(2);
        expect(result.failures).toHaveLength(2);

        // Verify successful creations
        expect(result.successes[0].item.name).toBe("T-Shirt Basic");
        expect(result.successes[1].item.name).toBe("Phone Case");

        // Verify failures with specific error messages
        expect(result.failures[0].item.name).toBe("Laptop Pro");
        expect(result.failures[0].error.message).toContain("Category 'Electronics' not found");

        expect(result.failures[1].item.name).toBe("Book Guide");
        expect(result.failures[1].error.message).toContain("slug is required");

        expect(mockedLogger.warn).toHaveBeenCalledWith("create product completed with 2 failures", {
          successCount: 2,
          failureCount: 2,
          failedItems: ["Laptop Pro", "Book Guide"],
        });
      });

      it("should handle network errors during batch processing", async () => {
        const networkError = new Error("ECONNREFUSED: Connection refused");
        const timeoutError = new Error("ETIMEDOUT: Request timeout");

        const processFn = vi
          .fn()
          .mockResolvedValueOnce({ success: true })
          .mockRejectedValueOnce(networkError)
          .mockRejectedValueOnce(timeoutError)
          .mockResolvedValueOnce({ success: true });

        const result = await ServiceErrorWrapper.wrapBatch(
          products,
          "sync to remote",
          (product) => product.slug || product.name,
          processFn
        );

        expect(result.successes).toHaveLength(2);
        expect(result.failures).toHaveLength(2);

        expect(result.failures[0].error).toBe(networkError);
        expect(result.failures[1].error).toBe(timeoutError);

        expect(mockedLogger.warn).toHaveBeenCalledWith("sync to remote completed with 2 failures", {
          successCount: 2,
          failureCount: 2,
          failedItems: ["laptop-pro", "Book Guide"], // Uses name when slug is empty
        });
      });
    });

    describe("Concurrency Control", () => {
      it("should process items with concurrency limit", async () => {
        const items = Array.from({ length: 10 }, (_, i) => ({ id: String(i + 1) }));
        const processFn = vi.fn().mockImplementation((item) =>
          Promise.resolve(`Result ${item.id}`)
        );

        const result = await ServiceErrorWrapper.wrapBatch(
          items,
          "process",
          (item) => item.id,
          processFn,
          { concurrency: 3 }
        );

        expect(result.successes).toHaveLength(10);
        expect(result.failures).toHaveLength(0);
        expect(processFn).toHaveBeenCalledTimes(10);
      });

      it("should respect batch concurrency limits", async () => {
        const items = Array.from({ length: 6 }, (_, i) => ({ id: String(i + 1) }));
        let activeCount = 0;
        let maxActive = 0;

        const processFn = vi.fn().mockImplementation(async () => {
          activeCount++;
          maxActive = Math.max(maxActive, activeCount);
          await new Promise((resolve) => setTimeout(resolve, 10));
          activeCount--;
          return "success";
        });

        await ServiceErrorWrapper.wrapBatch(
          items,
          "process",
          (item) => item.id,
          processFn,
          { concurrency: 2 }
        );

        // With concurrency=2 and 6 items, max active should never exceed 2
        expect(maxActive).toBeLessThanOrEqual(2);
        expect(maxActive).toBeGreaterThan(0);
      });

      it("should add delay between batches", async () => {
        const items = Array.from({ length: 4 }, (_, i) => ({ id: String(i + 1) }));
        const batchStartTimes: number[] = [];

        const processFn = vi.fn().mockImplementation(async (item) => {
          // Record when each batch starts processing
          const itemIndex = items.findIndex(i => i.id === item.id);
          if (itemIndex % 2 === 0) {
            // First item of each batch
            batchStartTimes.push(Date.now());
          }
          return "success";
        });

        const delayMs = 50;
        await ServiceErrorWrapper.wrapBatch(
          items,
          "process",
          (item) => item.id,
          processFn,
          { concurrency: 2, delayMs }
        );

        expect(processFn).toHaveBeenCalledTimes(4);
        expect(batchStartTimes.length).toBeGreaterThanOrEqual(2);

        // Check that there's a delay between batch starts
        if (batchStartTimes.length >= 2) {
          const actualDelay = batchStartTimes[1] - batchStartTimes[0];
          // Allow some tolerance for timing
          expect(actualDelay).toBeGreaterThanOrEqual(delayMs - 10);
        }
      });

      it("should handle mixed results with concurrency", async () => {
        const items = Array.from({ length: 6 }, (_, i) => ({ id: String(i + 1) }));

        const processFn = vi.fn().mockImplementation((item) => {
          const id = parseInt(item.id);
          if (id % 2 === 0) {
            return Promise.reject(new Error(`Failed ${id}`));
          }
          return Promise.resolve(`Success ${id}`);
        });

        const result = await ServiceErrorWrapper.wrapBatch(
          items,
          "process",
          (item) => item.id,
          processFn,
          { concurrency: 2 }
        );

        expect(result.successes).toHaveLength(3);
        expect(result.failures).toHaveLength(3);

        // Verify successful items (1, 3, 5)
        expect(result.successes.map(s => s.item.id)).toEqual(["1", "3", "5"]);

        // Verify failed items (2, 4, 6)
        expect(result.failures.map(f => f.item.id)).toEqual(["2", "4", "6"]);
      });

      it("should handle concurrency=1 as sequential processing", async () => {
        const items = Array.from({ length: 5 }, (_, i) => ({ id: String(i + 1) }));
        const order: string[] = [];

        const processFn = vi.fn().mockImplementation(async (item) => {
          order.push(`start-${item.id}`);
          await new Promise((resolve) => setTimeout(resolve, 10));
          order.push(`end-${item.id}`);
          return "success";
        });

        await ServiceErrorWrapper.wrapBatch(
          items,
          "process",
          (item) => item.id,
          processFn,
          { concurrency: 1 }
        );

        // With concurrency=1, each item should complete before the next starts
        expect(order).toEqual([
          "start-1", "end-1",
          "start-2", "end-2",
          "start-3", "end-3",
          "start-4", "end-4",
          "start-5", "end-5",
        ]);
      });
    });

    describe("Sequential Processing", () => {
      it("should process items sequentially with delay", async () => {
        const items = Array.from({ length: 3 }, (_, i) => ({ id: String(i + 1) }));
        const timestamps: number[] = [];

        const processFn = vi.fn().mockImplementation(async () => {
          timestamps.push(Date.now());
          return "success";
        });

        const delayMs = 50;
        await ServiceErrorWrapper.wrapBatch(
          items,
          "process",
          (item) => item.id,
          processFn,
          { sequential: true, delayMs }
        );

        expect(timestamps).toHaveLength(3);

        // Check delays between items (no delay before first item)
        const delay1 = timestamps[1] - timestamps[0];
        const delay2 = timestamps[2] - timestamps[1];

        // Allow some tolerance for timing
        expect(delay1).toBeGreaterThanOrEqual(delayMs - 10);
        expect(delay2).toBeGreaterThanOrEqual(delayMs - 10);
      });
    });
  });

  describe("Edge Cases and Error Boundaries", () => {
    it("should handle undefined function parameter", async () => {
      const undefinedFn = undefined as unknown as () => Promise<void>;

      await expect(
        ServiceErrorWrapper.wrapServiceCall("test", "Entity", "id", undefinedFn)
      ).rejects.toThrow();
    });

    it("should handle async function that throws synchronously", async () => {
      const syncThrowFn = () => {
        throw new Error("Synchronous error");
      };

      await expect(
        ServiceErrorWrapper.wrapServiceCall("test", "Entity", "id", syncThrowFn)
      ).rejects.toThrow("Failed to test for Entity 'id': Synchronous error");
    });

    it("should handle very long entity names and operation names", async () => {
      const longOperation = "a".repeat(1000);
      const longEntityType = "b".repeat(500);
      const longIdentifier = "c".repeat(500);

      const mockFn = vi.fn().mockRejectedValue(new Error("Test error"));

      await expect(
        ServiceErrorWrapper.wrapServiceCall(longOperation, longEntityType, longIdentifier, mockFn)
      ).rejects.toThrow();

      expect(mockedLogger.error).toHaveBeenCalledWith(`Failed ${longOperation}`, {
        entityType: longEntityType,
        entityIdentifier: longIdentifier,
        error: "Test error",
      });
    });

    it("should handle special characters in entity identifiers", async () => {
      const specialIdentifier = "test@#$%^&*()[]{}|\\:;\"'<>?,./";
      const mockFn = vi.fn().mockResolvedValue("success");

      const result = await ServiceErrorWrapper.wrapServiceCall(
        "process",
        "Entity",
        specialIdentifier,
        mockFn
      );

      expect(result).toBe("success");
      expect(mockedLogger.debug).toHaveBeenCalledWith("Starting process", {
        entityType: "Entity",
        entityIdentifier: specialIdentifier,
      });
    });
  });
});
