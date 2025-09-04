/**
 * Integration tests for the comprehensive error handling system
 *
 * This test suite demonstrates the complete error flow from service operations
 * through to user-facing error messages with actionable recovery suggestions.
 */

import type { CombinedError } from "@urql/core";
import { beforeEach, describe, expect, it, type MockedFunction, vi } from "vitest";
import { StageAggregateError } from "../core/deployment/errors";
import { GraphQLError } from "../lib/errors/graphql";
import { ErrorRecoveryGuide } from "../lib/errors/recovery-guide";
import { logger } from "../lib/logger";
import { ServiceErrorWrapper } from "../lib/utils/error-wrapper";

// Extended error interfaces for tests
interface MockGraphQLError extends Error {
  toJSON: () => { message: string };
  [Symbol.toStringTag]: string;
}

interface MockServiceError extends Error {
  code: string;
  getRecoverySuggestions: () => string[];
}

// Mock dependencies
vi.mock("../lib/errors/graphql");
vi.mock("../lib/logger");

const mockedGraphQLError = GraphQLError as unknown as {
  fromCombinedError: MockedFunction<typeof GraphQLError.fromCombinedError>;
};

const mockedLogger = logger as unknown as {
  debug: MockedFunction<typeof logger.debug>;
  error: MockedFunction<typeof logger.error>;
  warn: MockedFunction<typeof logger.warn>;
};

// Mock service implementations
interface Product {
  name: string;
  slug: string;
  productType: string;
  category?: string;
  attributes?: Record<string, string>;
}

interface ProductType {
  name: string;
  attributes: string[];
}

interface Category {
  name: string;
  slug: string;
  parent?: string;
}

class MockProductService {
  async createProduct(product: Product): Promise<{ id: string; name: string }> {
    return ServiceErrorWrapper.wrapServiceCall(
      "create product",
      "Product",
      product.name,
      async () => {
        // Simulate various failure conditions
        if (!product.slug) {
          throw new Error("slug is required");
        }

        if (product.slug === "duplicate-slug") {
          throw new Error("Duplicate slug 'duplicate-slug'");
        }

        if (product.productType === "NonexistentType") {
          throw new Error("Product type 'NonexistentType' not found");
        }

        if (product.category === "NonexistentCategory") {
          throw new Error("Category 'NonexistentCategory' not found");
        }

        if (product.attributes?.color === "missing-attribute") {
          throw new Error("Attribute 'color' not found");
        }

        if (product.name === "NetworkError") {
          throw new Error("connect ECONNREFUSED 127.0.0.1:8000");
        }

        if (product.name === "PermissionError") {
          throw new Error("Permission denied: insufficient privileges");
        }

        if (product.name === "GraphQLError") {
          const mockGraphQLError = new Error(
            'Variable "$input" of type ProductCreateInput! was provided invalid value'
          ) as MockGraphQLError;
          mockGraphQLError.toJSON = () => ({ message: mockGraphQLError.message });
          mockGraphQLError[Symbol.toStringTag] = "GraphQLError";
          mockGraphQLError.name = "GraphQLError";

          const combinedError: CombinedError = {
            name: "CombinedError",
            message: 'Variable "$input" of type ProductCreateInput! was provided invalid value',
            graphQLErrors: [mockGraphQLError],
            networkError: undefined,
            response: {},
          } as CombinedError;
          throw combinedError;
        }

        // Success case
        return { id: `product-${Date.now()}`, name: product.name };
      }
    );
  }
}

class MockProductTypeService {
  async createProductType(productType: ProductType): Promise<{ id: string; name: string }> {
    return ServiceErrorWrapper.wrapServiceCall(
      "create product type",
      "ProductType",
      productType.name,
      async () => {
        if (productType.attributes.includes("missing-attribute")) {
          throw new Error("Failed to resolve referenced attributes");
        }

        if (productType.name === "RequiresEntityType") {
          throw new Error("Entity type is required for reference attribute 'brand'");
        }

        return { id: `product-type-${Date.now()}`, name: productType.name };
      }
    );
  }
}

class MockCategoryService {
  async createCategory(category: Category): Promise<{ id: string; name: string }> {
    return ServiceErrorWrapper.wrapServiceCall(
      "create category",
      "Category",
      category.name,
      async () => {
        if (category.parent === "NonexistentParent") {
          throw new Error("Category 'NonexistentParent' not found");
        }

        return { id: `category-${Date.now()}`, name: category.name };
      }
    );
  }
}

// Mock deployment orchestrator
class MockDeploymentOrchestrator {
  constructor(
    private productService = new MockProductService(),
    private productTypeService = new MockProductTypeService(),
    private categoryService = new MockCategoryService()
  ) {}

  async deployProducts(products: Product[]): Promise<void> {
    const { successes, failures } = await ServiceErrorWrapper.wrapBatch(
      products,
      "deploy products",
      (product) => product.name,
      async (product) => {
        const result = await this.productService.createProduct(product);
        return result.id;
      }
    );

    if (failures.length > 0) {
      const successNames = successes.map((s) => s.item.name);
      const failureDetails = failures.map((f) => ({
        entity: f.item.name,
        error: f.error,
      }));

      throw new StageAggregateError("Creating Products", failureDetails, successNames);
    }
  }

  async deployProductTypes(productTypes: ProductType[]): Promise<void> {
    const { successes, failures } = await ServiceErrorWrapper.wrapBatch(
      productTypes,
      "deploy product types",
      (pt) => pt.name,
      async (productType) => {
        const result = await this.productTypeService.createProductType(productType);
        return result.id;
      }
    );

    if (failures.length > 0) {
      const successNames = successes.map((s) => s.item.name);
      const failureDetails = failures.map((f) => ({
        entity: f.item.name,
        error: f.error,
      }));

      throw new StageAggregateError("Creating Product Types", failureDetails, successNames);
    }
  }

  async deployCategories(categories: Category[]): Promise<void> {
    const { successes, failures } = await ServiceErrorWrapper.wrapBatch(
      categories,
      "deploy categories",
      (category) => category.name,
      async (category) => {
        const result = await this.categoryService.createCategory(category);
        return result.id;
      }
    );

    if (failures.length > 0) {
      const successNames = successes.map((s) => s.item.name);
      const failureDetails = failures.map((f) => ({
        entity: f.item.name,
        error: f.error,
      }));

      throw new StageAggregateError("Creating Categories", failureDetails, successNames);
    }
  }
}

describe("Error Handling Integration", () => {
  let orchestrator: MockDeploymentOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new MockDeploymentOrchestrator();

    // Mock GraphQL error conversion
    mockedGraphQLError.fromCombinedError.mockImplementation(
      (message: string, _error: CombinedError) => {
        const mockError = new Error(`GraphQL Error: ${message}`) as MockServiceError;
        mockError.code = "GRAPHQL_ERROR";
        mockError.getRecoverySuggestions = () => ["Check your GraphQL query"];
        return mockError;
      }
    );
  });

  describe("Single Entity Error Scenarios", () => {
    it("should provide helpful recovery suggestions for validation errors", async () => {
      const productsWithValidationErrors: Product[] = [
        { name: "Valid Product", slug: "valid-product", productType: "Clothing" },
        { name: "Invalid Product", slug: "", productType: "Clothing" }, // Missing slug
      ];

      try {
        await orchestrator.deployProducts(productsWithValidationErrors);
        expect.fail("Should have thrown StageAggregateError");
      } catch (error) {
        expect(error).toBeInstanceOf(StageAggregateError);

        const stageError = error as StageAggregateError;
        expect(stageError.successes).toEqual(["Valid Product"]);
        expect(stageError.failures).toHaveLength(1);
        expect(stageError.failures[0].entity).toBe("Invalid Product");

        const userMessage = stageError.getUserMessage();

        // Verify error message structure
        expect(userMessage).toContain("❌ Creating Products - 1 of 2 failed");
        expect(userMessage).toContain("✅ Successful:");
        expect(userMessage).toContain("• Valid Product");
        expect(userMessage).toContain("❌ Failed:");
        expect(userMessage).toContain("• Invalid Product");
        expect(userMessage).toContain("slug is required");

        // Verify recovery suggestions
        expect(userMessage).toContain("→ Fix: Add the required field 'slug' to your configuration");
        expect(userMessage).toContain("→ Check: Review the schema documentation");
        expect(userMessage).toContain("→ Run: cat SCHEMA.md");
      }
    });

    it("should provide helpful recovery suggestions for entity not found errors", async () => {
      const productsWithMissingDependencies: Product[] = [
        { name: "Good Product", slug: "good-product", productType: "Clothing" },
        { name: "Bad Product Type", slug: "bad-product-type", productType: "NonexistentType" },
        {
          name: "Bad Category",
          slug: "bad-category",
          productType: "Clothing",
          category: "NonexistentCategory",
        },
      ];

      try {
        await orchestrator.deployProducts(productsWithMissingDependencies);
        expect.fail("Should have thrown StageAggregateError");
      } catch (error) {
        const stageError = error as StageAggregateError;
        const userMessage = stageError.getUserMessage();

        expect(userMessage).toContain("❌ Creating Products - 2 of 3 failed");
        expect(userMessage).toContain("• Good Product");

        // Check product type error suggestions
        expect(userMessage).toContain("• Bad Product Type");
        expect(userMessage).toContain(
          "→ Fix: Ensure product type 'NonexistentType' exists or is defined before products that use it"
        );
        expect(userMessage).toContain(
          "→ Run: saleor-configurator introspect --include=productTypes"
        );

        // Check category error suggestions
        expect(userMessage).toContain("• Bad Category");
        expect(userMessage).toContain(
          "→ Fix: Ensure category 'NonexistentCategory' exists or will be created earlier in deployment"
        );
        expect(userMessage).toContain("→ Run: saleor-configurator introspect --include=categories");
      }
    });

    it("should provide helpful recovery suggestions for attribute errors", async () => {
      const productsWithAttributeErrors: Product[] = [
        {
          name: "Attribute Error Product",
          slug: "attribute-error",
          productType: "Clothing",
          attributes: { color: "missing-attribute" },
        },
      ];

      try {
        await orchestrator.deployProducts(productsWithAttributeErrors);
        expect.fail("Should have thrown StageAggregateError");
      } catch (error) {
        const stageError = error as StageAggregateError;
        const userMessage = stageError.getUserMessage();

        expect(userMessage).toContain("• Attribute Error Product");
        expect(userMessage).toContain(
          "→ Fix: Create the attribute 'color' first or reference an existing one"
        );
        expect(userMessage).toContain("→ Check: View available attributes");
        expect(userMessage).toContain("→ Run: saleor-configurator introspect --include=attributes");
      }
    });

    it("should provide helpful recovery suggestions for permission errors", async () => {
      const productsWithPermissionErrors: Product[] = [
        { name: "PermissionError", slug: "permission-error", productType: "Clothing" },
      ];

      try {
        await orchestrator.deployProducts(productsWithPermissionErrors);
        expect.fail("Should have thrown StageAggregateError");
      } catch (error) {
        const stageError = error as StageAggregateError;
        const userMessage = stageError.getUserMessage();

        expect(userMessage).toContain(
          "→ Fix: Check that your API token has the required permissions"
        );
        expect(userMessage).toContain("→ Check: Verify token permissions in Saleor dashboard");
        expect(userMessage).toContain("→ Run: saleor-configurator diff --token YOUR_TOKEN");
      }
    });

    it("should provide helpful recovery suggestions for network errors", async () => {
      const productsWithNetworkErrors: Product[] = [
        { name: "NetworkError", slug: "network-error", productType: "Clothing" },
      ];

      try {
        await orchestrator.deployProducts(productsWithNetworkErrors);
        expect.fail("Should have thrown StageAggregateError");
      } catch (error) {
        const stageError = error as StageAggregateError;
        const userMessage = stageError.getUserMessage();

        expect(userMessage).toContain(
          "→ Fix: Check your network connection and Saleor instance URL"
        );
        expect(userMessage).toContain("→ Check: Verify the instance is accessible");
        expect(userMessage).toContain("→ Run: curl -I YOUR_SALEOR_URL/graphql/");
      }
    });

    it("should handle GraphQL errors properly", async () => {
      const productsWithGraphQLErrors: Product[] = [
        { name: "GraphQLError", slug: "graphql-error", productType: "Clothing" },
      ];

      try {
        await orchestrator.deployProducts(productsWithGraphQLErrors);
        expect.fail("Should have thrown StageAggregateError");
      } catch (error) {
        const stageError = error as StageAggregateError;
        const userMessage = stageError.getUserMessage();

        expect(userMessage).toContain("GraphQL Error:");
        // The GraphQL error gets wrapped, so we get fallback suggestions
        expect(userMessage).toContain("→ Fix: Review the error message for details");

        expect(mockedGraphQLError.fromCombinedError).toHaveBeenCalled();
      }
    });
  });

  describe("Complex Multi-Entity Scenarios", () => {
    it("should handle mixed error types with comprehensive recovery suggestions", async () => {
      const mixedErrorProducts: Product[] = [
        { name: "Success 1", slug: "success-1", productType: "Clothing" },
        { name: "Success 2", slug: "success-2", productType: "Electronics" },
        { name: "Validation Error", slug: "", productType: "Clothing" },
        { name: "Missing ProductType", slug: "missing-pt", productType: "NonexistentType" },
        {
          name: "Missing Category",
          slug: "missing-cat",
          productType: "Clothing",
          category: "NonexistentCategory",
        },
        { name: "PermissionError", slug: "perm-error", productType: "Clothing" },
        { name: "NetworkError", slug: "net-error", productType: "Clothing" },
      ];

      try {
        await orchestrator.deployProducts(mixedErrorProducts);
        expect.fail("Should have thrown StageAggregateError");
      } catch (error) {
        const stageError = error as StageAggregateError;
        const userMessage = stageError.getUserMessage();

        // Verify header shows correct counts
        expect(userMessage).toContain("❌ Creating Products - 5 of 7 failed");

        // Verify successes are listed
        expect(userMessage).toContain("✅ Successful:");
        expect(userMessage).toContain("• Success 1");
        expect(userMessage).toContain("• Success 2");

        // Verify all types of failures with their specific recovery suggestions
        expect(userMessage).toContain("❌ Failed:");

        // Validation error
        expect(userMessage).toContain("• Validation Error");
        expect(userMessage).toContain("→ Fix: Add the required field 'slug' to your configuration");

        // Entity not found errors
        expect(userMessage).toContain("• Missing ProductType");
        expect(userMessage).toContain(
          "→ Fix: Ensure product type 'NonexistentType' exists or is defined before products that use it"
        );

        expect(userMessage).toContain("• Missing Category");
        expect(userMessage).toContain(
          "→ Fix: Ensure category 'NonexistentCategory' exists or will be created earlier in deployment"
        );

        // Permission error
        expect(userMessage).toContain("• PermissionError");
        expect(userMessage).toContain(
          "→ Fix: Check that your API token has the required permissions"
        );

        // Network error
        expect(userMessage).toContain("• NetworkError");
        expect(userMessage).toContain(
          "→ Fix: Check your network connection and Saleor instance URL"
        );

        // General suggestions
        expect(userMessage).toContain("General suggestions:");
        expect(userMessage).toContain("1. Review the individual errors below");
        expect(userMessage).toContain("2. Fix the issues and run deploy again");
        expect(userMessage).toContain("3. Use --include flag to deploy only specific entities");
      }
    });
  });

  describe("Product Type and Category Error Scenarios", () => {
    it("should provide specific recovery suggestions for product type attribute errors", async () => {
      const productTypesWithErrors: ProductType[] = [
        { name: "Valid Type", attributes: ["color", "size"] },
        { name: "Missing Attributes", attributes: ["missing-attribute", "size"] },
        { name: "RequiresEntityType", attributes: ["brand"] },
      ];

      try {
        await orchestrator.deployProductTypes(productTypesWithErrors);
        expect.fail("Should have thrown StageAggregateError");
      } catch (error) {
        const stageError = error as StageAggregateError;
        const userMessage = stageError.getUserMessage();

        expect(userMessage).toContain("❌ Creating Product Types - 2 of 3 failed");
        expect(userMessage).toContain("• Valid Type");

        // Check attribute resolution error
        expect(userMessage).toContain("• Missing Attributes");
        expect(userMessage).toContain(
          "→ Fix: Ensure referenced attributes exist and match the correct type (PRODUCT_TYPE or PAGE_TYPE)"
        );
        expect(userMessage).toContain("→ Run: saleor-configurator introspect --include=attributes");

        // Check entity type required error
        expect(userMessage).toContain("• RequiresEntityType");
        expect(userMessage).toContain(
          "→ Fix: Add entityType field to the 'brand' reference attribute in your config"
        );
        expect(userMessage).toContain(
          "→ Check: Valid values are: PAGE, PRODUCT, or PRODUCT_VARIANT"
        );
      }
    });

    it("should handle category dependency errors", async () => {
      const categoriesWithErrors: Category[] = [
        { name: "Root Category", slug: "root" },
        { name: "Valid Child", slug: "valid-child", parent: "root" },
        { name: "Invalid Parent", slug: "invalid-parent", parent: "NonexistentParent" },
      ];

      try {
        await orchestrator.deployCategories(categoriesWithErrors);
        expect.fail("Should have thrown StageAggregateError");
      } catch (error) {
        const stageError = error as StageAggregateError;
        const userMessage = stageError.getUserMessage();

        expect(userMessage).toContain("❌ Creating Categories - 1 of 3 failed");
        expect(userMessage).toContain("• Root Category");
        expect(userMessage).toContain("• Valid Child");

        expect(userMessage).toContain("• Invalid Parent");
        expect(userMessage).toContain("Category 'NonexistentParent' not found");
        expect(userMessage).toContain("→ Fix: Ensure category");
      }
    });
  });

  describe("Real-World Deployment Scenario", () => {
    it("should demonstrate complete error handling flow for e-commerce catalog setup", async () => {
      // Simulate a realistic e-commerce catalog deployment with multiple error types
      const realisticProductCatalog: Product[] = [
        // Successful products
        { name: "Basic T-Shirt", slug: "basic-tshirt", productType: "Clothing" },
        { name: "Running Shoes", slug: "running-shoes", productType: "Footwear" },

        // Configuration errors
        { name: "Invalid Product 1", slug: "", productType: "Clothing" },
        { name: "Duplicate Slug Product", slug: "duplicate-slug", productType: "Clothing" },

        // Dependency errors
        { name: "Missing ProductType Product", slug: "missing-pt", productType: "NonexistentType" },
        {
          name: "Missing Category Product",
          slug: "missing-cat",
          productType: "Clothing",
          category: "NonexistentCategory",
        },
        {
          name: "Missing Attribute Product",
          slug: "missing-attr",
          productType: "Clothing",
          attributes: { color: "missing-attribute" },
        },

        // System errors
        { name: "NetworkError", slug: "network-fail", productType: "Clothing" },
        { name: "PermissionError", slug: "perm-fail", productType: "Clothing" },
        { name: "GraphQLError", slug: "graphql-fail", productType: "Clothing" },
      ];

      try {
        await orchestrator.deployProducts(realisticProductCatalog);
        expect.fail("Should have thrown StageAggregateError");
      } catch (error) {
        expect(error).toBeInstanceOf(StageAggregateError);

        const stageError = error as StageAggregateError;
        expect(stageError.successes).toHaveLength(2);
        expect(stageError.failures).toHaveLength(8);

        const userMessage = stageError.getUserMessage();
        console.log("=== EXAMPLE ERROR MESSAGE OUTPUT ===");
        console.log(userMessage);
        console.log("=== END ERROR MESSAGE ===");

        // Verify comprehensive error message structure
        expect(userMessage).toContain("❌ Creating Products - 8 of 10 failed");

        // Verify successes section
        expect(userMessage).toContain("✅ Successful:");
        expect(userMessage).toContain("• Basic T-Shirt");
        expect(userMessage).toContain("• Running Shoes");

        // Verify failures section with specific recovery suggestions
        expect(userMessage).toContain("❌ Failed:");

        // Configuration error suggestions
        expect(userMessage).toContain("→ Fix: Add the required field 'slug' to your configuration");
        expect(userMessage).toContain("→ Fix: Use a unique slug");

        // Dependency error suggestions
        expect(userMessage).toContain(
          "→ Fix: Ensure product type 'NonexistentType' exists or is defined before products that use it"
        );
        expect(userMessage).toContain("→ Fix: Ensure category");
        expect(userMessage).toContain(
          "→ Fix: Create the attribute 'color' first or reference an existing one"
        );

        // System error suggestions
        expect(userMessage).toContain(
          "→ Fix: Check your network connection and Saleor instance URL"
        );
        expect(userMessage).toContain(
          "→ Fix: Check that your API token has the required permissions"
        );
        // GraphQL error gets wrapped so the pattern might not match exactly

        // Verify general suggestions
        expect(userMessage).toContain("General suggestions:");
        expect(userMessage).toContain("1. Review the individual errors below");
        expect(userMessage).toContain("2. Fix the issues and run deploy again");
        expect(userMessage).toContain("3. Use --include flag to deploy only specific entities");
        expect(userMessage).toContain("4. Run 'saleor-configurator diff' to check current state");

        // Verify logging was called appropriately
        expect(mockedLogger.warn).toHaveBeenCalledWith(
          "deploy products completed with 8 failures",
          {
            successCount: 2,
            failureCount: 8,
            failedItems: expect.arrayContaining([
              "Invalid Product 1",
              "Duplicate Slug Product",
              "Missing ProductType Product",
              "Missing Category Product",
              "Missing Attribute Product",
              "NetworkError",
              "PermissionError",
              "GraphQLError",
            ]),
          }
        );
      }
    });
  });

  describe("Error Recovery Guide Integration", () => {
    it("should demonstrate standalone recovery guide functionality", () => {
      const testErrors = [
        "Entity type is required for reference attribute 'brand'",
        "Attribute 'color' not found",
        "Category 'Electronics/Smartphones' not found",
        "Channel 'us-store' not found",
        "Product type 'T-Shirt' not found",
        "Duplicate slug 'electronics'",
        "slug is required",
        "Permission denied: insufficient privileges",
        "connect ECONNREFUSED 127.0.0.1:8000",
        'Variable "$input" of type ProductCreateInput! was provided invalid value',
      ];

      testErrors.forEach((errorMessage) => {
        const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);
        const formatted = ErrorRecoveryGuide.formatSuggestions(suggestions);

        console.log(`\nError: "${errorMessage}"`);
        console.log("Recovery Suggestions:");
        formatted.forEach((suggestion) => {
          console.log(`  ${suggestion}`);
        });

        // Verify that specific suggestions are provided (not just fallback)
        expect(suggestions.length).toBeGreaterThan(0);
        const hasSpecificSuggestion = suggestions.some(
          (s) => s.fix !== "Review the error message for details"
        );
        expect(hasSpecificSuggestion).toBe(true);
      });
    });

    it("should provide fallback suggestions for unknown errors", () => {
      const unknownError = "Some completely unknown error that doesn't match any pattern";
      const suggestions = ErrorRecoveryGuide.getSuggestions(unknownError);
      const formatted = ErrorRecoveryGuide.formatSuggestions(suggestions);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].fix).toBe("Review the error message for details");
      expect(suggestions[0].check).toBe(
        "Check your configuration against the current Saleor state"
      );
      expect(suggestions[0].command).toBe("saleor-configurator diff --verbose");

      console.log(`\nUnknown Error: "${unknownError}"`);
      console.log("Fallback Recovery Suggestions:");
      formatted.forEach((suggestion) => {
        console.log(`  ${suggestion}`);
      });
    });
  });

  describe("Error Message Quality Comparison", () => {
    it("should demonstrate improved error messages vs basic error messages", () => {
      const basicError = new Error("Failed to create products");
      const enhancedError = new StageAggregateError(
        "Creating Products",
        [
          { entity: "T-Shirt", error: new Error("Attribute 'color' not found") },
          { entity: "Hoodie", error: new Error("Category 'Clothing/Hoodies' not found") },
        ],
        ["Jeans", "Sneakers"]
      );

      console.log("\n=== BASIC ERROR MESSAGE ===");
      console.log(basicError.message);
      console.log("Stack:", basicError.stack?.split("\n")[0]);

      console.log("\n=== ENHANCED ERROR MESSAGE ===");
      console.log(enhancedError.getUserMessage());

      // The enhanced error provides:
      // 1. Clear success/failure breakdown
      // 2. Specific error details for each failed entity
      // 3. Actionable recovery suggestions
      // 4. Commands to run for diagnosis
      // 5. Context about what succeeded vs failed

      expect(enhancedError.getUserMessage()).toContain("✅ Successful:");
      expect(enhancedError.getUserMessage()).toContain("❌ Failed:");
      expect(enhancedError.getUserMessage()).toContain("→ Fix:");
      expect(enhancedError.getUserMessage()).toContain("→ Run:");
      expect(enhancedError.getUserMessage()).toContain("General suggestions:");
    });
  });
});
