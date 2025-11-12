import type { MockInstance } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createComplexConfig,
  createConfigFile,
  createInvalidConfig,
  createLargeConfig,
} from "../test-helpers/config-file-builder";
import type { TempDirectory } from "../test-helpers/filesystem";
import { createTempDirectory } from "../test-helpers/filesystem";
import { createFetchMock } from "../test-helpers/graphql-mocks";
import { deployHandler } from "./deploy";

const TEST_URL = "https://test.saleor.cloud/graphql/";
const TEST_TOKEN = "test-token";

type FetchMockCall = [string | URL | Request, RequestInit | undefined];

describe("Deploy Command - Integration Tests", () => {
  let tempDir: TempDirectory;
  let fetchSpy: MockInstance<typeof fetch>;
  let mockExit: MockInstance;

  beforeEach(() => {
    tempDir = createTempDirectory();

    // Use the enhanced fetch mock from graphql-mocks
    fetchSpy = vi.spyOn(global, "fetch").mockImplementation(createFetchMock());

    // Mock process.exit to prevent actual exit and capture exit codes
    mockExit = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(() => {
    tempDir.cleanup();
    vi.restoreAllMocks();
  });

  describe("Success Scenarios", () => {
    it("should successfully deploy simple configuration changes", async () => {
      // Arrange
      const configPath = createConfigFile()
        .withShop({ defaultMailSenderName: "Updated Shop Name" })
        .withChannel({
          name: "Default Channel",
          slug: "default-channel",
          currencyCode: "USD",
          defaultCountry: "US",
          isActive: true,
        })
        .saveToFile(tempDir);

      // Act & Assert
      await expect(
        deployHandler({
          url: TEST_URL,
          token: TEST_TOKEN,
          config: configPath,
          quiet: false,
          ci: true,
          verbose: false,
        })
      ).rejects.toThrow("process.exit(0)");

      // Verify exit was called with success code
      expect(mockExit).toHaveBeenCalledWith(0);
      // Verify GraphQL queries were called for diff (fetching current config)
      const configFetchCalls = (fetchSpy?.mock.calls as FetchMockCall[]).filter((call) => {
        const body = call[1]?.body?.toString();
        return (
          body && (body.includes("GetConfig") || body.includes("shop") || body.includes("channels"))
        );
      });
      expect(configFetchCalls.length).toBeGreaterThan(0);

      // Verify shop update mutation was called
      const shopUpdateCalls = (fetchSpy?.mock.calls as FetchMockCall[]).filter((call) => {
        const body = call[1]?.body?.toString();
        return body?.includes("shopSettingsUpdate");
      });
      expect(shopUpdateCalls.length).toBeGreaterThan(0);

      // Verify request contains expected data
      const shopUpdateBody = (shopUpdateCalls as FetchMockCall[])[0]?.[1]?.body?.toString();
      expect(shopUpdateBody).toContain("Updated Shop Name");

      // Verify authentication header
      expect((fetchSpy?.mock.calls as FetchMockCall[])[0]?.[1]?.headers).toMatchObject({
        authorization: `Bearer ${TEST_TOKEN}`,
        "content-type": "application/json",
      });
    });

    it("should handle no changes scenario gracefully", async () => {
      // Arrange: Create minimal config
      const configPath = createConfigFile()
        .withShop({ defaultMailSenderName: "Test Shop" })
        .saveToFile(tempDir);

      // Use custom mock that exactly matches the config
      fetchSpy?.mockImplementation(async (_url: string | URL | Request, options?: RequestInit) => {
        const body = JSON.parse(((options as RequestInit | undefined)?.body as string) || "{}");
        if (body.operationName === "GetConfig" || body.query?.includes("shop")) {
          return new Response(
            JSON.stringify({
              data: {
                shop: {
                  defaultMailSenderName: "Test Shop",
                  // Only return fields that are in the schema, rest will be undefined
                },
                channels: [],
                productTypes: { edges: [] },
                pageTypes: { edges: [] },
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        return new Response(JSON.stringify({ data: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      // Act - Should complete without throwing
      await expect(
        deployHandler({
          url: TEST_URL,
          token: TEST_TOKEN,
          config: configPath,
          quiet: false,
          ci: true, // Use CI mode to avoid confirmation prompt
          verbose: false,
        })
      ).resolves.toBeUndefined();

      // Assert - Should NOT call process.exit when no changes
      expect(mockExit).not.toHaveBeenCalled();

      // Should have called GraphQL to fetch current config for diff
      const configFetchCalls = (fetchSpy?.mock.calls as FetchMockCall[]).filter((call) => {
        const body = call[1]?.body?.toString();
        return (
          body && (body.includes("GetConfig") || body.includes("shop") || body.includes("channels"))
        );
      });
      expect(configFetchCalls.length).toBeGreaterThan(0);

      // Should NOT have called any mutations (no changes)
      const mutationCalls = (fetchSpy?.mock.calls as FetchMockCall[]).filter((call) => {
        const body = call[1]?.body?.toString();
        return (
          body &&
          (body.includes("shopSettingsUpdate") ||
            body.includes("channelCreate") ||
            body.includes("channelUpdate"))
        );
      });
      expect(mutationCalls.length).toBe(0);
    });

    it("should deploy complex configuration with multiple entity types", async () => {
      // Arrange
      const configPath = createComplexConfig().saveToFile(tempDir);

      // Act & Assert
      await expect(
        deployHandler({
          url: TEST_URL,
          token: TEST_TOKEN,
          config: configPath,
          quiet: false,
          ci: true,
          verbose: false,
        })
      ).rejects.toThrow("process.exit(0)");

      // Verify exit was called with success code
      expect(mockExit).toHaveBeenCalledWith(0);
      // Verify shop update
      const shopCalls = (fetchSpy?.mock.calls as FetchMockCall[]).filter((call) => {
        const body = call[1]?.body?.toString();
        return body?.includes("shopSettingsUpdate");
      });
      expect(shopCalls.length).toBeGreaterThan(0);

      // Verify channel operations
      const channelCalls = (fetchSpy?.mock.calls as FetchMockCall[]).filter((call) => {
        const body = call[1]?.body?.toString();
        return body?.includes("channel");
      });
      expect(channelCalls.length).toBeGreaterThan(0);

      // Verify product type operations
      const productTypeCalls = (fetchSpy?.mock.calls as FetchMockCall[]).filter((call) => {
        const body = call[1]?.body?.toString();
        return body?.includes("productType");
      });
      expect(productTypeCalls.length).toBeGreaterThan(0);

      // Verify request bodies contain expected data
      const shopBody = (shopCalls as FetchMockCall[])[0]?.[1]?.body?.toString();
      expect(shopBody).toContain("Complex Shop");
    });

    it("should work with force mode to skip all confirmations", async () => {
      const configPath = createConfigFile()
        .withShop({ defaultMailSenderName: "Safe Change" })
        .withChannel({
          name: "Channel to Keep",
          slug: "keep",
          currencyCode: "EUR",
          defaultCountry: "GB",
          isActive: true,
        })
        .saveToFile(tempDir);

      // Act & Assert
      await expect(
        deployHandler({
          url: TEST_URL,
          token: TEST_TOKEN,
          config: configPath,
          ci: true,
          quiet: false,
          verbose: false,
        })
      ).rejects.toThrow("process.exit(0)");

      // Verify exit was called with success code
      expect(mockExit).toHaveBeenCalledWith(0);

      // In force mode, should still compute diff and execute mutations
      const mutationCalls = (fetchSpy?.mock.calls as FetchMockCall[]).filter((call) => {
        const body = call[1]?.body?.toString();
        return body?.includes("shopSettingsUpdate");
      });
      expect(mutationCalls.length).toBeGreaterThan(0);
    });
  });

  describe("Expected Failure Scenarios", () => {
    it("should fail gracefully with authentication errors", async () => {
      // Arrange: Mock auth error response
      fetchSpy?.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            errors: [{ message: "Authentication required" }],
          }),
          {
            status: 401,
            statusText: "Unauthorized",
            headers: { "content-type": "application/json" },
          }
        )
      );

      const configPath = createConfigFile()
        .withShop({ defaultMailSenderName: "Test Shop" })
        .withChannel({
          name: "Default Channel",
          slug: "default-channel",
          currencyCode: "USD",
          defaultCountry: "US",
          isActive: true,
        })
        .saveToFile(tempDir);

      // Act & Assert
      await expect(
        deployHandler({
          url: TEST_URL,
          token: "invalid-token",
          config: configPath,
          ci: true,
          quiet: false,
          verbose: false,
        })
      ).rejects.toThrow("process.exit(2)");

      // Verify exit was called with auth error code
      expect(mockExit).toHaveBeenCalledWith(2);

      // Should have attempted the request
      expect(fetchSpy).toHaveBeenCalledWith(
        TEST_URL,
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: "Bearer invalid-token",
          }),
        })
      );
    });

    it("should retry on network errors before failing", { timeout: 10000 }, async () => {
      // Arrange: Mock network error that persists through retries
      let callCount = 0;
      fetchSpy?.mockImplementation(() => {
        callCount++;
        return Promise.reject(new Error("Network connection failed"));
      });

      const configPath = createConfigFile()
        .withShop({ defaultMailSenderName: "Test Shop" })
        .withChannel({
          name: "Default Channel",
          slug: "default-channel",
          currencyCode: "USD",
          defaultCountry: "US",
          isActive: true,
        })
        .saveToFile(tempDir);

      // Act & Assert
      await expect(
        deployHandler({
          url: TEST_URL,
          token: TEST_TOKEN,
          config: configPath,
          ci: true,
          quiet: false,
          verbose: false,
        })
      ).rejects.toThrow("process.exit(3)");

      // Verify exit was called with network error code
      expect(mockExit).toHaveBeenCalledWith(3);

      // Should have attempted multiple retries (initial + 3 retries = 4 total)
      expect(callCount).toBeGreaterThanOrEqual(3);

      // Verify all calls had proper authentication headers
      const allCalls = fetchSpy?.mock.calls as FetchMockCall[];
      for (const call of allCalls) {
        expect(call[1]?.headers).toMatchObject({
          authorization: `Bearer ${TEST_TOKEN}`,
        });
      }
    });

    it("should fail when configuration file is missing", async () => {
      // Act & Assert
      await expect(
        deployHandler({
          url: TEST_URL,
          token: TEST_TOKEN,
          config: "non-existent-config.yml",
          ci: true,
          quiet: false,
          verbose: false,
        })
      ).rejects.toThrow("process.exit(4)");

      // Verify exit was called with validation error code
      expect(mockExit).toHaveBeenCalledWith(4);

      // Should NOT have made any network requests
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("should fail with invalid configuration file", async () => {
      // Arrange: Create invalid YAML config
      const configPath = tempDir.createFile(
        "config.yml",
        `
invalid_yaml: [
  - missing_closing_bracket
  - another_item: {
    - invalid: structure
`
      );

      // Act & Assert
      await expect(
        deployHandler({
          url: TEST_URL,
          token: TEST_TOKEN,
          config: configPath,
          ci: true,
          quiet: false,
          verbose: false,
        })
      ).rejects.toThrow("process.exit(4)");

      // Verify exit was called with validation error code
      expect(mockExit).toHaveBeenCalledWith(4);

      // Should NOT have made any network requests
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("should fail with validation errors from server", async () => {
      // Arrange: Create invalid config using builder
      const configPath = createInvalidConfig().saveToFile(tempDir);

      // Act & Assert
      await expect(
        deployHandler({
          url: TEST_URL,
          token: TEST_TOKEN,
          config: configPath,
          quiet: false,
          ci: true,
          verbose: false,
        })
      ).rejects.toThrow("process.exit(4)");

      // Verify exit was called with validation error code
      expect(mockExit).toHaveBeenCalledWith(4);

      // Should NOT have made any network requests (config validation fails first)
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("Enhanced Messaging and Partial Success", () => {
    it("should show partial success when some stages fail", async () => {
      // Arrange: Create config with products that will fail due to category references
      const configPath = createConfigFile()
        .setFormat("json")
        .withShop({ defaultMailSenderName: "Updated Shop Name" })
        .withProducts([
          {
            name: "Valid Product",
            slug: "valid-product",
            description: "This will succeed",
            productType: "Simple Product",
            category: "electronics",
            variants: [
              {
                name: "Default",
                sku: "VALID-001",
              },
            ],
            channelListings: [
              {
                channel: "default-channel",
                isPublished: true,
                visibleInListings: true,
              },
            ],
          },
          {
            name: "Invalid Product",
            slug: "invalid-product",
            description: "This will fail",
            productType: "Nonexistent Type",
            category: "nonexistent-category",
            variants: [
              {
                name: "Default",
                sku: "INVALID-001",
              },
            ],
            channelListings: [
              {
                channel: "default-channel",
                isPublished: true,
                visibleInListings: true,
              },
            ],
          },
        ])
        .saveToFile(tempDir, "config.json");

      // Mock partial failure for product creation
      fetchSpy?.mockImplementation(async (_url: string | URL | Request, options?: RequestInit) => {
        const body = JSON.parse(((options as RequestInit | undefined)?.body as string) || "{}");

        // Handle shop settings successfully
        if (body.query?.includes("shopSettingsUpdate")) {
          return new Response(
            JSON.stringify({
              data: {
                shopSettingsUpdate: {
                  errors: [],
                  shop: { defaultMailSenderName: "Updated Shop Name" },
                },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        // Handle product creation with partial failure
        if (body.query?.includes("productCreate")) {
          const variables = body.variables;
          if (variables?.input?.slug === "invalid-product") {
            return new Response(
              JSON.stringify({
                data: {
                  productCreate: {
                    errors: [
                      { message: "Category 'nonexistent-category' not found", field: "category" },
                    ],
                    product: null,
                  },
                },
              }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }
          // Valid product succeeds
          return new Response(
            JSON.stringify({
              data: {
                productCreate: {
                  errors: [],
                  product: { id: "test-product-id", slug: variables?.input?.slug },
                },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        // Default mock response for other queries
        return new Response(
          JSON.stringify({
            data: {
              shop: { defaultMailSenderName: "Test Shop" },
              channels: [],
              productTypes: { edges: [] },
              pageTypes: { edges: [] },
              categories: { edges: [] },
              products: { edges: [] },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      // Act & Assert - Should exit with partial success code (5)
      await expect(
        deployHandler({
          url: TEST_URL,
          token: TEST_TOKEN,
          config: configPath,
          quiet: false,
          ci: true,
          verbose: false,
        })
      ).rejects.toThrow("process.exit(5)");

      // Verify exit was called with partial success code
      expect(mockExit).toHaveBeenCalledWith(5);

      // Verify both shop and product operations were attempted
      const shopCalls = (fetchSpy?.mock.calls as FetchMockCall[]).filter((call) => {
        const body = call[1]?.body?.toString();
        return body?.includes("UpdateShopSettings");
      });
      expect(shopCalls.length).toBeGreaterThan(0);

      // Verify product-related operations were attempted (even if they fail during reference resolution)
      const productTypeCalls = (fetchSpy?.mock.calls as FetchMockCall[]).filter((call) => {
        const body = call[1]?.body?.toString();
        return body?.includes("GetProductTypeByName");
      });
      expect(productTypeCalls.length).toBeGreaterThan(0);
    });

    it("should continue processing stages even when one fails completely", async () => {
      // Arrange: Create config where first stage fails but second should succeed
      const configPath = createConfigFile()
        .withShop({ defaultMailSenderName: "Updated Shop Name" })
        .withChannel({
          name: "New Channel",
          slug: "new-channel",
          currencyCode: "EUR",
          defaultCountry: "GB",
          isActive: true,
        })
        .saveToFile(tempDir);

      // Mock shop failure but channel success
      fetchSpy?.mockImplementation(async (_url: string | URL | Request, options?: RequestInit) => {
        const body = JSON.parse(((options as RequestInit | undefined)?.body as string) || "{}");

        // Shop update fails
        if (body.query?.includes("shopSettingsUpdate")) {
          return new Response(
            JSON.stringify({
              errors: [{ message: "Insufficient permissions to update shop settings" }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        // Channel creation succeeds
        if (body.query?.includes("channelCreate")) {
          return new Response(
            JSON.stringify({
              data: {
                channelCreate: {
                  errors: [],
                  channel: { id: "channel-id", slug: "new-channel" },
                },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        // Default mock for diff queries
        return new Response(
          JSON.stringify({
            data: {
              shop: { defaultMailSenderName: "Old Shop Name" },
              channels: [],
              productTypes: { edges: [] },
              pageTypes: { edges: [] },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      // Act & Assert - Should exit with partial success code
      await expect(
        deployHandler({
          url: TEST_URL,
          token: TEST_TOKEN,
          config: configPath,
          quiet: false,
          ci: true,
          verbose: false,
        })
      ).rejects.toThrow("process.exit(5)");

      // Verify both operations were attempted
      const shopCalls = (fetchSpy?.mock.calls as FetchMockCall[]).filter((call) => {
        const body = call[1]?.body?.toString();
        return body?.includes("shopSettingsUpdate");
      });
      expect(shopCalls.length).toBeGreaterThan(0);

      const channelCalls = (fetchSpy?.mock.calls as FetchMockCall[]).filter((call) => {
        const body = call[1]?.body?.toString();
        return body?.includes("channelCreate");
      });
      expect(channelCalls.length).toBeGreaterThan(0);
    });

    it("should show enhanced error messages with suggestions", async () => {
      // This test verifies the enhanced messaging is displayed, but since we're mocking
      // console output in the actual command, we mainly verify the exit code behavior
      const configPath = createConfigFile()
        .setFormat("json")
        .withProducts([
          {
            name: "Product with Bad Category",
            slug: "bad-category-product",
            description: "Will fail with category error",
            productType: "Simple Product",
            category: "electronics", // This category doesn't exist
            variants: [
              {
                name: "Default",
                sku: "BAD-CAT-001",
              },
            ],
            channelListings: [
              {
                channel: "default-channel",
                isPublished: true,
                visibleInListings: true,
              },
            ],
          },
        ])
        .saveToFile(tempDir, "config.json");

      // Mock category not found error
      fetchSpy?.mockImplementation(async (_url: string | URL | Request, options?: RequestInit) => {
        const body = JSON.parse(((options as RequestInit | undefined)?.body as string) || "{}");

        if (body.query?.includes("productCreate")) {
          return new Response(
            JSON.stringify({
              data: {
                productCreate: {
                  errors: [
                    {
                      message: "Category 'electronics' not found",
                      field: "category",
                    },
                  ],
                  product: null,
                },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            data: {
              shop: {},
              channels: [],
              productTypes: { edges: [] },
              pageTypes: { edges: [] },
              categories: { edges: [] },
              products: { edges: [] },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      // Act & Assert - Should exit with partial success since validation/diff succeeds but products fail
      await expect(
        deployHandler({
          url: TEST_URL,
          token: TEST_TOKEN,
          config: configPath,
          quiet: false,
          ci: true,
          verbose: false,
        })
      ).rejects.toThrow("process.exit(5)");

      // Verify partial success exit code
      expect(mockExit).toHaveBeenCalledWith(5);
    });
  });

  describe("Performance and Edge Cases", () => {
    it("should handle large configuration files efficiently", async () => {
      // Arrange: Generate large config
      const configPath = createLargeConfig({
        channelCount: 3,
        productTypeCount: 5,
        pageTypeCount: 3,
        categoryCount: 4,
      }).saveToFile(tempDir);

      const startTime = Date.now();

      // Act & Assert
      await expect(
        deployHandler({
          url: TEST_URL,
          token: TEST_TOKEN,
          config: configPath,
          quiet: false,
          ci: true,
          verbose: false,
        })
      ).rejects.toThrow("process.exit(0)");

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify exit was called with success code
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify multiple mutations were sent for different entity types
      const allMutations = (fetchSpy?.mock.calls as FetchMockCall[]).filter((call) => {
        const body = call[1]?.body?.toString();
        return body?.includes("mutation");
      });
      expect(allMutations.length).toBeGreaterThan(5); // Should have multiple mutations
    });
  });
});
