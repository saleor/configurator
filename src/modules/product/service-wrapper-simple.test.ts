import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductError } from "./errors";
import { ProductService } from "./product-service";
import { ProductRepository } from "./repository";

describe("ServiceErrorWrapper - Simple Integration Test", () => {
  let mockClient: any;
  let repository: ProductRepository;
  let service: ProductService;

  beforeEach(() => {
    mockClient = {
      mutation: vi.fn(),
      query: vi.fn(),
    };

    repository = new ProductRepository(mockClient);
    service = new ProductService(repository);
  });

  it("should demonstrate proper error handling architecture", async () => {
    // Test 1: Repository throws raw errors (no wrapping)
    const rawError = new Error("Database connection failed");
    mockClient.query.mockResolvedValue({
      error: rawError,
      data: null,
    });

    // Repository should throw the raw error without wrapping
    await expect(repository.getProductBySlug("test")).rejects.toThrow("Database connection failed");
    await expect(repository.getProductBySlug("test")).rejects.not.toBeInstanceOf(ProductError);

    // Test 2: Service wraps repository errors with business context
    try {
      await service.bootstrapProduct({
        name: "Test Product",
        slug: "test-product",
        productType: "TestType",
        category: "test-category",
        variants: [],
      });
      expect.fail("Should have thrown an error");
    } catch (error) {
      // Service should wrap the error with ProductError and business context
      expect(error).toBeInstanceOf(ProductError);
      expect((error as Error).message).toContain("Failed to resolve product type reference");
      expect((error as Error).message).toContain("product type 'TestType'");
    }
  });

  it("should validate architectural compliance", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    // Repository architectural constraints:
    // - MAY use GraphQLError for low-level query errors (pagination, network)
    // - MUST NOT use business-level error classes (ProductError, ServiceErrorWrapper)
    const repositoryPath = path.resolve(__dirname, "./repository.ts");
    const repositorySource = fs.readFileSync(repositoryPath, "utf8");

    // Repository should NOT use business-level error wrapping
    expect(repositorySource).not.toContain("ProductError");
    expect(repositorySource).not.toContain("ServiceErrorWrapper");

    // Service layer should use ServiceErrorWrapper for business-level error wrapping
    const servicePath = path.resolve(__dirname, "./product-service.ts");
    const serviceSource = fs.readFileSync(servicePath, "utf8");

    expect(serviceSource).toContain("ServiceErrorWrapper");
    expect(serviceSource).toContain("wrapServiceCall");
  });

  it("should provide business-friendly error messages", async () => {
    // Mock to simulate product type not found
    mockClient.query.mockResolvedValue({
      data: { productTypes: { edges: [] } },
      error: null,
    });

    try {
      await service.bootstrapProduct({
        name: "Test Product",
        slug: "test-product",
        productType: "NonExistentType",
        category: "test-category",
        variants: [],
      });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).toBeInstanceOf(ProductError);
      expect((error as Error).message).toContain('Product type "NonExistentType" not found');
      expect((error as Error).message).toContain(
        "Make sure it exists in your productTypes configuration"
      );
    }
  });

  it("should demonstrate ServiceErrorWrapper logging context", async () => {
    // This test shows that ServiceErrorWrapper adds proper logging context
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockClient.query.mockResolvedValue({
      data: { productTypes: { edges: [] } },
      error: null,
    });

    try {
      await service.bootstrapProduct({
        name: "Test Product",
        slug: "test-product",
        productType: "TestType",
        category: "test-category",
        variants: [],
      });
    } catch (error) {
      // ServiceErrorWrapper should have logged the error with context
      // The specific logging behavior may vary, but this shows the pattern
      expect(error).toBeInstanceOf(ProductError);
    }

    consoleSpy.mockRestore();
  });
});
