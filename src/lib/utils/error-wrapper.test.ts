import { describe, expect, it, vi, beforeEach, type MockedFunction } from "vitest";
import type { CombinedError } from "@urql/core";
import { ServiceErrorWrapper } from "./error-wrapper";
import { GraphQLError } from "../errors/graphql";
import { logger } from "../logger";

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
  constructor(message: string, public entityIdentifier?: string) {
    super(message);
    this.name = "TestServiceError";
  }
}

// Mock CombinedError from URQL
const createMockCombinedError = (message: string): CombinedError => ({
  message,
  graphQLErrors: [{ message }],
  networkError: null,
  response: {},
}) as CombinedError;

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
        expect(mockedLogger.debug).toHaveBeenCalledWith(
          "Starting create",
          { entityType: "Product", entityIdentifier: "test-product" }
        );
        expect(mockedLogger.debug).toHaveBeenCalledWith(
          "Completed create", 
          { entityType: "Product", entityIdentifier: "test-product" }
        );
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
        expect(mockedLogger.debug).toHaveBeenCalledWith(
          "Starting validate",
          { entityType: "Configuration", entityIdentifier: undefined }
        );
        expect(mockedLogger.debug).toHaveBeenCalledWith(
          "Completed validate",
          { entityType: "Configuration", entityIdentifier: undefined }
        );
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

        expect(mockedLogger.error).toHaveBeenCalledWith(
          "Failed update",
          {
            entityType: "Product",
            entityIdentifier: "product-id", 
            error: "Specific error"
          }
        );
      });

      it("should handle GraphQL errors with proper context", async () => {
        const combinedError = createMockCombinedError("GraphQL validation error");
        const mockFn = vi.fn().mockRejectedValue(combinedError);
        const wrappedError = new Error("Wrapped GraphQL error");

        mockedGraphQLError.fromCombinedError.mockReturnValue(wrappedError);

        await expect(
          ServiceErrorWrapper.wrapServiceCall(
            "create",
            "Category",
            "electronics", 
            mockFn
          )
        ).rejects.toThrow(wrappedError);

        expect(mockedGraphQLError.fromCombinedError).toHaveBeenCalledWith(
          "Failed to create for Category 'electronics'",
          combinedError
        );
        expect(mockedLogger.error).toHaveBeenCalledWith(
          "Failed create",
          {
            entityType: "Category",
            entityIdentifier: "electronics",
            error: "[object Object]"
          }
        );
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
          expect(error.message).toBe("Failed to delete for Product 'product-123': Original error message");
          expect((error as TestServiceError).entityIdentifier).toBe("product-123");
        }
      });

      it("should provide default error wrapping", async () => {
        const originalError = new Error("Something went wrong");
        const mockFn = vi.fn().mockRejectedValue(originalError);

        await expect(
          ServiceErrorWrapper.wrapServiceCall(
            "sync",
            "Channel",
            "us-store",
            mockFn
          )
        ).rejects.toThrow("Failed to sync for Channel 'us-store': Something went wrong");
      });

      it("should handle non-Error objects", async () => {
        const mockFn = vi.fn().mockRejectedValue("String error");

        await expect(
          ServiceErrorWrapper.wrapServiceCall(
            "process",
            "Data",
            "data-id", 
            mockFn
          )
        ).rejects.toThrow("Failed to process for Data 'data-id': String error");

        expect(mockedLogger.error).toHaveBeenCalledWith(
          "Failed process",
          {
            entityType: "Data",
            entityIdentifier: "data-id",
            error: "String error"
          }
        );
      });

      it("should format context without entity identifier", async () => {
        const originalError = new Error("Context test");
        const mockFn = vi.fn().mockRejectedValue(originalError);

        await expect(
          ServiceErrorWrapper.wrapServiceCall(
            "validate",
            "Schema",
            undefined,
            mockFn
          )
        ).rejects.toThrow("Failed to validate for Schema: Context test");
      });
    });

    describe("GraphQL Error Detection", () => {
      it("should correctly identify CombinedError objects", async () => {
        const validCombinedError: CombinedError = {
          message: "GraphQL error",
          graphQLErrors: [{ message: "Field error" }],
          networkError: null,
          response: {},
        } as CombinedError;

        const mockFn = vi.fn().mockRejectedValue(validCombinedError);
        const wrappedError = new Error("Handled GraphQL error");
        mockedGraphQLError.fromCombinedError.mockReturnValue(wrappedError);

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

    const getIdentifier = (item: typeof testItems[0]) => item.name;

    describe("All Successful Operations", () => {
      it("should process all items successfully", async () => {
        const processFn = vi.fn()
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
        
        const processFn = vi.fn()
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

        expect(mockedLogger.warn).toHaveBeenCalledWith(
          "process completed with 2 failures",
          {
            successCount: 2,
            failureCount: 2,
            failedItems: ["Item 2", "Item 4"]
          }
        );
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

        const processFn = vi.fn()
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
            error: errors[index]
          });
        });

        expect(mockedLogger.warn).toHaveBeenCalledWith(
          "deploy completed with 4 failures",
          {
            successCount: 0,
            failureCount: 4,
            failedItems: ["Item 1", "Item 2", "Item 3", "Item 4"]
          }
        );
      });
    });

    describe("Error Handling", () => {
      it("should convert non-Error objects to Error instances", async () => {
        const processFn = vi.fn()
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

        const result = await ServiceErrorWrapper.wrapBatch(
          [],
          "empty",
          getIdentifier,
          processFn
        );

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
        { name: "T-Shirt Basic", slug: "t-shirt-basic", productType: "Clothing", category: "Apparel" },
        { name: "Laptop Pro", slug: "laptop-pro", productType: "Electronics" }, // Missing category
        { name: "Book Guide", slug: "", category: "Books" }, // Empty slug
        { name: "Phone Case", slug: "phone-case", productType: "Accessories", category: "Electronics" },
      ];

      it("should simulate product creation with realistic errors", async () => {
        const processFn = vi.fn()
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

        expect(mockedLogger.warn).toHaveBeenCalledWith(
          "create product completed with 2 failures",
          {
            successCount: 2,
            failureCount: 2,
            failedItems: ["Laptop Pro", "Book Guide"]
          }
        );
      });

      it("should handle network errors during batch processing", async () => {
        const networkError = new Error("ECONNREFUSED: Connection refused");
        const timeoutError = new Error("ETIMEDOUT: Request timeout");

        const processFn = vi.fn()
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

        expect(mockedLogger.warn).toHaveBeenCalledWith(
          "sync to remote completed with 2 failures",
          {
            successCount: 2, 
            failureCount: 2,
            failedItems: ["laptop-pro", "Book Guide"] // Uses name when slug is empty
          }
        );
      });
    });
  });

  describe("Edge Cases and Error Boundaries", () => {
    it("should handle undefined function parameter", async () => {
      const undefinedFn = undefined as unknown as () => Promise<void>;
      
      await expect(
        ServiceErrorWrapper.wrapServiceCall(
          "test",
          "Entity", 
          "id",
          undefinedFn
        )
      ).rejects.toThrow();
    });

    it("should handle async function that throws synchronously", async () => {
      const syncThrowFn = () => {
        throw new Error("Synchronous error");
      };

      await expect(
        ServiceErrorWrapper.wrapServiceCall(
          "test",
          "Entity",
          "id", 
          syncThrowFn
        )
      ).rejects.toThrow("Failed to test for Entity 'id': Synchronous error");
    });

    it("should handle very long entity names and operation names", async () => {
      const longOperation = "a".repeat(1000);
      const longEntityType = "b".repeat(500); 
      const longIdentifier = "c".repeat(500);
      
      const mockFn = vi.fn().mockRejectedValue(new Error("Test error"));

      await expect(
        ServiceErrorWrapper.wrapServiceCall(
          longOperation,
          longEntityType,
          longIdentifier,
          mockFn
        )
      ).rejects.toThrow();

      expect(mockedLogger.error).toHaveBeenCalledWith(
        `Failed ${longOperation}`,
        {
          entityType: longEntityType,
          entityIdentifier: longIdentifier,
          error: "Test error"
        }
      );
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
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        "Starting process",
        { entityType: "Entity", entityIdentifier: specialIdentifier }
      );
    });
  });
});