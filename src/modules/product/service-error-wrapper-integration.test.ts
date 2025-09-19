import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductError } from "./errors";
import { ProductService } from "./product-service";
import { ProductRepository } from "./repository";

describe("ServiceErrorWrapper Integration - ProductService", () => {
  let mockClient: any;
  let repository: ProductRepository;
  let service: ProductService;
  let getCategoryByPathSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockClient = {
      mutation: vi.fn(),
      query: vi.fn(),
    };

    repository = new ProductRepository(mockClient);
    service = new ProductService(repository);
    getCategoryByPathSpy = vi
      .spyOn(repository, "getCategoryByPath")
      .mockResolvedValue({ id: "cat-1", name: "Fiction" });
  });

  afterEach(() => {
    getCategoryByPathSpy.mockRestore();
  });

  describe("Repository Error Handling (Raw Errors)", () => {
    it("should throw raw GraphQL errors from repository methods", async () => {
      const graphqlError = new Error("GraphQL network error");
      mockClient.query.mockResolvedValue({
        error: graphqlError,
        data: null,
      });

      await expect(repository.getProductBySlug("test-product")).rejects.toThrow(
        "GraphQL network error"
      );
    });

    it("should throw raw business errors from repository methods", async () => {
      mockClient.mutation.mockResolvedValue({
        data: {
          productCreate: {
            product: null,
            errors: [{ message: "Product name is required" }, { message: "Invalid category" }],
          },
        },
        error: null,
      });

      await expect(
        repository.createProduct({
          name: "Test Product",
          slug: "test-product",
          productType: "type-1",
          category: "cat-1",
        })
      ).rejects.toThrow("Failed to create product: Product name is required, Invalid category");
    });

    it("should not wrap errors in repository layer", async () => {
      const rawError = new Error("Raw repository error");
      mockClient.mutation.mockResolvedValue({
        error: rawError,
        data: null,
      });

      await expect(repository.updateProduct("prod-1", { name: "Updated" })).rejects.toThrow(
        "Raw repository error"
      );
      // Ensure error is not wrapped with ProductError or ServiceErrorWrapper context
      await expect(
        repository.updateProduct("prod-1", { name: "Updated" })
      ).rejects.not.toBeInstanceOf(ProductError);
    });
  });

  describe("Service Layer Error Handling (ServiceErrorWrapper)", () => {
    it("should wrap repository errors with ServiceErrorWrapper context", async () => {
      const rawError = new Error("Raw GraphQL error");

      // Mock other dependencies to succeed
      (mockClient.query as any).mockImplementation((query: any) => {
        const queryName = query?.definitions?.[0]?.name?.value;
        if (queryName === "GetProductTypeByName") {
          return Promise.resolve({
            data: { productTypes: { edges: [{ node: { id: "type-1", name: "Book" } }] } },
            error: null,
          });
        }
        if (queryName === "GetCategoryBySlug") {
          return Promise.resolve({
            data: {
              category: { id: "cat-1", name: "Fiction", slug: "fiction", parent: null },
            },
            error: null,
          });
        }
        if (queryName === "GetProductBySlug") {
          // This call should fail with raw error
          return Promise.resolve({
            error: rawError,
            data: null,
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      const productInput = {
        name: "Test Book",
        slug: "test-book",
        productType: "Book",
        category: "fiction",
        variants: [],
      };

      await expect(service.bootstrapProduct(productInput)).rejects.toThrow(ProductError);
      await expect(service.bootstrapProduct(productInput)).rejects.toThrow(
        /Failed to lookup product by slug for product 'test-book'/
      );
    });

    it("should provide business-friendly error messages", async () => {
      // Mock successful reference resolution
      (mockClient.query as any).mockImplementation((query: any) => {
        const queryName = query?.definitions?.[0]?.name?.value;
        if (queryName === "GetProductTypeByName") {
          return Promise.resolve({
            data: { productTypes: { edges: [] } }, // No product type found
            error: null,
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      const productInput = {
        name: "Test Book",
        slug: "test-book",
        productType: "NonexistentType",
        category: "fiction",
        variants: [],
      };

      await expect(service.bootstrapProduct(productInput)).rejects.toThrow(ProductError);
      await expect(service.bootstrapProduct(productInput)).rejects.toThrow(
        /Product type "NonexistentType" not found/
      );
      await expect(service.bootstrapProduct(productInput)).rejects.toThrow(
        /Make sure it exists in your productTypes configuration/
      );
    });

    it("should include entity context in error messages", async () => {
      (mockClient.query as any).mockImplementation((query: any) => {
        const queryName = query?.definitions?.[0]?.name?.value;
        if (queryName === "GetProductTypeByName") {
          return Promise.resolve({
            data: { productTypes: { edges: [{ node: { id: "type-1", name: "Book" } }] } },
            error: null,
          });
        }
        if (queryName === "GetCategoryBySlug") {
          return Promise.resolve({
            data: { category: null }, // No category found
            error: null,
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      getCategoryByPathSpy.mockResolvedValue(null);

      const productInput = {
        name: "Test Book",
        slug: "test-book",
        productType: "Book",
        category: "nonexistent-category",
        variants: [],
      };

      await expect(service.bootstrapProduct(productInput)).rejects.toThrow(ProductError);
      await expect(service.bootstrapProduct(productInput)).rejects.toThrow(
        /Failed to resolve category reference for category 'nonexistent-category'/
      );
    });

    it("should handle product creation errors with proper context", async () => {
      // Mock successful reference resolution
      (mockClient.query as any).mockImplementation((query: any) => {
        const queryName = query?.definitions?.[0]?.name?.value;
        if (queryName === "GetProductTypeByName") {
          return Promise.resolve({
            data: { productTypes: { edges: [{ node: { id: "type-1", name: "Book" } }] } },
            error: null,
          });
        }
        if (queryName === "GetCategoryBySlug") {
          return Promise.resolve({
            data: { category: { id: "cat-1", name: "Fiction", slug: "fiction", parent: null } },
            error: null,
          });
        }
        if (queryName === "GetProductBySlug") {
          return Promise.resolve({
            data: { product: null }, // No existing product
            error: null,
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      // Mock createProduct to fail
      const createError = new Error("Database constraint violation");
      mockClient.mutation.mockResolvedValue({
        error: createError,
        data: null,
      });

      const productInput = {
        name: "Test Book",
        slug: "test-book",
        productType: "Book",
        category: "fiction",
        variants: [],
      };

      await expect(service.bootstrapProduct(productInput)).rejects.toThrow(ProductError);
      await expect(service.bootstrapProduct(productInput)).rejects.toThrow(
        /Failed to create product for product 'Test Book'/
      );
    });

    it("should handle variant creation errors with proper context", async () => {
      // Mock successful product creation
      (mockClient.query as any).mockImplementation((query: any) => {
        const queryName = query?.definitions?.[0]?.name?.value;
        if (queryName === "GetProductTypeByName") {
          return Promise.resolve({
            data: { productTypes: { edges: [{ node: { id: "type-1", name: "Book" } }] } },
            error: null,
          });
        }
        if (queryName === "GetCategoryBySlug") {
          return Promise.resolve({
            data: { category: { id: "cat-1", name: "Fiction", slug: "fiction", parent: null } },
            error: null,
          });
        }
        if (queryName === "GetProductBySlug") {
          return Promise.resolve({
            data: { product: null },
            error: null,
          });
        }
        if (queryName === "GetProductVariantBySku") {
          return Promise.resolve({
            data: { productVariants: { edges: [] } },
            error: null,
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      (mockClient.mutation as any).mockImplementation((mutation: any) => {
        const mutationName = mutation?.definitions?.[0]?.name?.value;
        if (mutationName === "CreateProduct") {
          return Promise.resolve({
            data: {
              productCreate: {
                product: { id: "prod-1", name: "Test Book" },
                errors: [],
              },
            },
            error: null,
          });
        }
        if (mutationName === "CreateProductVariant") {
          return Promise.resolve({
            error: new Error("SKU already exists"),
            data: null,
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      const productInput = {
        name: "Test Book",
        slug: "test-book",
        productType: "Book",
        category: "fiction",
        variants: [
          {
            name: "Hardcover",
            sku: "BOOK-HC-001",
          },
        ],
      };

      await expect(service.bootstrapProduct(productInput)).rejects.toThrow(ProductError);
      await expect(service.bootstrapProduct(productInput)).rejects.toThrow(
        /Failed to create product variant for product variant 'BOOK-HC-001'/
      );
    });
  });

  describe("Architecture Compliance", () => {
    it("should not import GraphQL error types in repository", async () => {
      // This is a design test - ensures repository doesn't import GraphQL error handling
      const fs = await import("node:fs");
      const path = await import("node:path");
      const repositoryPath = path.resolve(__dirname, "./repository.ts");
      const repositorySource = fs.readFileSync(repositoryPath, "utf8");

      expect(repositorySource).not.toContain("GraphQLError");
      expect(repositorySource).not.toContain("GraphQLUnknownError");
      expect(repositorySource).not.toContain("fromCombinedError");
      expect(repositorySource).not.toContain("fromGraphQLErrors");
    });

    it("should use ServiceErrorWrapper in service layer", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const servicePath = path.resolve(__dirname, "./product-service.ts");
      const serviceSource = fs.readFileSync(servicePath, "utf8");

      expect(serviceSource).toContain("ServiceErrorWrapper");
      expect(serviceSource).toContain("wrapServiceCall");
    });

    it("should follow proper error handling pattern", async () => {
      // Verify that service methods wrap repository calls
      const rawError = new Error("Test error");
      mockClient.query.mockResolvedValue({
        error: rawError,
        data: null,
      });

      // When repository throws raw error, service should wrap it with business context
      try {
        await service.bootstrapProduct({
          name: "Test",
          slug: "test",
          productType: "Type",
          category: "cat",
          variants: [],
        });
        expect.fail("Should have thrown an error");
      } catch (error) {
        // Error should be wrapped with business context by ServiceErrorWrapper
        expect(error).toBeInstanceOf(ProductError);
        expect((error as Error).message).toContain("Failed to resolve product type reference");
        expect((error as Error).message).toContain("product type 'Type'");
      }
    });
  });

  describe("Error Message Quality", () => {
    it("should provide helpful suggestions for category errors", async () => {
      (mockClient.query as any).mockImplementation((query: any) => {
        const queryName = query?.definitions?.[0]?.name?.value;
        if (queryName === "GetProductTypeByName") {
          return Promise.resolve({
            data: { productTypes: { edges: [{ node: { id: "type-1", name: "Book" } }] } },
            error: null,
          });
        }
        if (queryName === "GetCategoryBySlug") {
          return Promise.resolve({
            data: { category: null },
            error: null,
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      getCategoryByPathSpy.mockResolvedValue(null);

      const productInput = {
        name: "Test Book",
        slug: "test-book",
        productType: "Book",
        category: "invalid/nested/path",
        variants: [],
      };

      await expect(service.bootstrapProduct(productInput)).rejects.toThrow(
        /For nested categories, use the format 'parent-slug\/child-slug'/
      );
      await expect(service.bootstrapProduct(productInput)).rejects.toThrow(
        /Run introspect command to see available categories/
      );
    });

    it("should provide different suggestions for simple vs nested categories", async () => {
      (mockClient.query as any).mockImplementation((query: any) => {
        const queryName = query?.definitions?.[0]?.name?.value;
        if (queryName === "GetProductTypeByName") {
          return Promise.resolve({
            data: { productTypes: { edges: [{ node: { id: "type-1", name: "Book" } }] } },
            error: null,
          });
        }
        if (queryName === "GetCategoryBySlug") {
          return Promise.resolve({
            data: { category: null },
            error: null,
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      getCategoryByPathSpy.mockResolvedValue(null);

      const productInput = {
        name: "Test Book",
        slug: "test-book",
        productType: "Book",
        category: "simple-category",
        variants: [],
      };

      await expect(service.bootstrapProduct(productInput)).rejects.toThrow(
        /For subcategories, you can reference them directly by slug/
      );
      await expect(service.bootstrapProduct(productInput)).rejects.toThrow(
        /or with full path \(e.g., 'groceries\/juices'\)/
      );
    });
  });
});
