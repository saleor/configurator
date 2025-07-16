import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import type { MockInstance } from "vitest";
import { createTempDirectory } from "../test-helpers/filesystem";
import { createFetchMock } from "../test-helpers/graphql-mocks";
import { createComplexConfig, createInvalidConfig, createLargeConfig, createConfigFile } from "../test-helpers/config-file-builder";
import type { TempDirectory } from "../test-helpers/filesystem";
import { deployHandler } from "./deploy";

const TEST_URL = "https://test.saleor.cloud/graphql/";
const TEST_TOKEN = "test-token";

type FetchMockCall = [string | URL | Request, RequestInit | undefined];

describe("Deploy Command - Integration Tests", () => {
  let tempDir: TempDirectory;
  let fetchSpy: MockInstance<typeof fetch>;

  beforeEach(() => {
    tempDir = createTempDirectory();
    
    // Use the enhanced fetch mock from graphql-mocks
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(createFetchMock());
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
          defaultCountry: "US"
        })
        .saveToFile(tempDir);

      // Act
      let deployError: Error | undefined;
      try {
        await deployHandler({
          url: TEST_URL,
          token: TEST_TOKEN,
          config: configPath,
          quiet: false,
          ci: true,
        });
      } catch (error) {
        deployError = error as Error;
      }

      // Assert - Verify actual behavior
      expect(deployError).toBeUndefined();
      
      // Verify GraphQL queries were called for diff (fetching current config)
      const configFetchCalls = (fetchSpy!.mock.calls as FetchMockCall[]).filter((call) => {
        const body = call[1]?.body?.toString();
        return body && (
          body.includes('GetConfig') ||
          body.includes('shop') ||
          body.includes('channels')
        );
      });
      expect(configFetchCalls.length).toBeGreaterThan(0);
      
      // Verify shop update mutation was called
      const shopUpdateCalls = (fetchSpy!.mock.calls as FetchMockCall[]).filter((call) => {
        const body = call[1]?.body?.toString();
        return body && body.includes('shopSettingsUpdate');
      });
      expect(shopUpdateCalls.length).toBeGreaterThan(0);
      
      // Verify request contains expected data
      const shopUpdateBody = (shopUpdateCalls as FetchMockCall[])[0]?.[1]?.body?.toString();
      expect(shopUpdateBody).toContain("Updated Shop Name");
      
      // Verify authentication header
      expect((fetchSpy!.mock.calls as FetchMockCall[])[0]?.[1]?.headers).toMatchObject({
        'authorization': `Bearer ${TEST_TOKEN}`,
        'content-type': 'application/json'
      });
    });

    it("should handle no changes scenario gracefully", async () => {
      // Arrange: Create minimal config
      const configPath = createConfigFile()
        .withShop({ defaultMailSenderName: "Test Shop" })
        .saveToFile(tempDir);
        
      // Use custom mock that exactly matches the config
      fetchSpy!.mockImplementation(async (url: string | URL | Request, options?: RequestInit) => {
        const body = JSON.parse((options as RequestInit | undefined)?.body as string || '{}');
        if (body.operationName === 'GetConfig' || body.query?.includes('shop')) {
          return new Response(JSON.stringify({
            data: {
              shop: { 
                defaultMailSenderName: "Test Shop",
                // Only return fields that are in the schema, rest will be undefined
              },
              channels: [],
              productTypes: { edges: [] },
              pageTypes: { edges: [] },
            }
          }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({ data: {} }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      });

      // Act
      let deployError: Error | undefined;
      try {
        await deployHandler({
          url: TEST_URL,
          token: TEST_TOKEN,
          config: configPath,
          quiet: false,
          ci: true, // Use CI mode to avoid confirmation prompt
        });
      } catch (error) {
        deployError = error as Error;
      }

      // Assert - Should exit with no changes
      expect(deployError).toBeUndefined();
      
      // Should have called GraphQL to fetch current config for diff
      const configFetchCalls = (fetchSpy!.mock.calls as FetchMockCall[]).filter((call) => {
        const body = call[1]?.body?.toString();
        return body && (
          body.includes('GetConfig') ||
          body.includes('shop') ||
          body.includes('channels')
        );
      });
      expect(configFetchCalls.length).toBeGreaterThan(0);
      
      // Should NOT have called any mutations (no changes)
      const mutationCalls = (fetchSpy!.mock.calls as FetchMockCall[]).filter((call) => {
        const body = call[1]?.body?.toString();
        return body && (
          body.includes('shopSettingsUpdate') ||
          body.includes('channelCreate') ||
          body.includes('channelUpdate')
        );
      });
      expect(mutationCalls.length).toBe(0);
    });

    it("should deploy complex configuration with multiple entity types", async () => {
      // Arrange
      const configPath = createComplexConfig()
        .saveToFile(tempDir);

      // Act
      let deployError: Error | undefined;
      try {
        await deployHandler({
          url: TEST_URL,
          token: TEST_TOKEN,
          config: configPath,
          quiet: false,
          ci: true,
        });
      } catch (error) {
        deployError = error as Error;
      }

      // Assert - Verify multiple entity types were processed
      expect(deployError).toBeUndefined();
      
      // Verify shop update
      const shopCalls = (fetchSpy!.mock.calls as FetchMockCall[]).filter((call) => {
        const body = call[1]?.body?.toString();
        return body && body.includes('shopSettingsUpdate');
      });
      expect(shopCalls.length).toBeGreaterThan(0);
      
      // Verify channel operations
      const channelCalls = (fetchSpy!.mock.calls as FetchMockCall[]).filter((call) => {
        const body = call[1]?.body?.toString();
        return body && body.includes('channel');
      });
      expect(channelCalls.length).toBeGreaterThan(0);
      
      // Verify product type operations
      const productTypeCalls = (fetchSpy!.mock.calls as FetchMockCall[]).filter((call) => {
        const body = call[1]?.body?.toString();
        return body && body.includes('productType');
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
          defaultCountry: "GB"
        })
        .saveToFile(tempDir);

      // Act
      let deployError: Error | undefined;
      try {
        await deployHandler({
          url: TEST_URL,
          token: TEST_TOKEN,
          config: configPath,
          ci: true,
          quiet: false,
        });
      } catch (error) {
        deployError = error as Error;
      }

      // Assert - Verify force mode worked
      expect(deployError).toBeUndefined();
      
      // In force mode, should still compute diff and execute mutations
      const mutationCalls = (fetchSpy!.mock.calls as FetchMockCall[]).filter((call) => {
        const body = call[1]?.body?.toString();
        return body && body.includes('shopSettingsUpdate');
      });
      expect(mutationCalls.length).toBeGreaterThan(0);
    });

  });

  describe("Expected Failure Scenarios", () => {
    it("should fail gracefully with authentication errors", async () => {
      // Arrange: Mock auth error response
      fetchSpy!.mockResolvedValueOnce(new Response(
        JSON.stringify({
          errors: [{ message: "Authentication required" }]
        }),
        {
          status: 401,
          statusText: "Unauthorized",
          headers: { 'content-type': 'application/json' }
        }
      ));

      const configPath = createConfigFile()
        .withShop({ defaultMailSenderName: "Test Shop" })
        .withChannel({
          name: "Default Channel",
          slug: "default-channel",
          currencyCode: "USD",
          defaultCountry: "US"
        })
        .saveToFile(tempDir);

      // Act
      let deployError: Error | undefined;
      try {
        await deployHandler({
          url: TEST_URL,
          token: "invalid-token",
          config: configPath,
          ci: true,
          quiet: false,
        });
      } catch (error) {
        deployError = error as Error;
      }

      // Assert - Verify proper error handling
      expect(deployError).toBeDefined();
      expect(deployError?.message).toContain("Unauthorized");
      
      // Should have attempted the request
      expect(fetchSpy!).toHaveBeenCalledWith(
        TEST_URL,
        expect.objectContaining({
          headers: expect.objectContaining({
            'authorization': 'Bearer invalid-token'
          })
        })
      );
    });

    it("should fail gracefully with network errors", async () => {
      // Arrange: Mock network error
      fetchSpy!.mockRejectedValueOnce(new Error("Network connection failed"));

      const configPath = createConfigFile()
        .withShop({ defaultMailSenderName: "Test Shop" })
        .withChannel({
          name: "Default Channel",
          slug: "default-channel",
          currencyCode: "USD",
          defaultCountry: "US"
        })
        .saveToFile(tempDir);

      // Act
      let deployError: Error | undefined;
      try {
        await deployHandler({
          url: TEST_URL,
          token: TEST_TOKEN,
          config: configPath,
          ci: true,
          quiet: false,
        });
      } catch (error) {
        deployError = error as Error;
      }

      // Assert - Verify network error handling
      expect(deployError).toBeDefined();
      expect(deployError?.message).toContain("Network");
      
      // Should have attempted the request
      expect(fetchSpy!).toHaveBeenCalledWith(
        TEST_URL,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'authorization': `Bearer ${TEST_TOKEN}`
          })
        })
      );
    });

    it("should fail when configuration file is missing", async () => {
      // Act
      let deployError: Error | undefined;
      try {
        await deployHandler({
          url: TEST_URL,
          token: TEST_TOKEN,
          config: "non-existent-config.yml",
          ci: true,
          quiet: false,
        });
      } catch (error) {
        deployError = error as Error;
      }

      // Assert - Verify file not found error
      expect(deployError).toBeDefined();
      expect(deployError?.message).toContain("not found");
      
      // Should NOT have made any network requests
      expect(fetchSpy!).not.toHaveBeenCalled();
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

      // Act
      let deployError: Error | undefined;
      try {
        await deployHandler({
          url: TEST_URL,
          token: TEST_TOKEN,
          config: configPath,
          ci: true,
          quiet: false,
        });
      } catch (error) {
        deployError = error as Error;
      }

      // Assert - Verify YAML parsing error
      expect(deployError).toBeDefined();
      expect(
        deployError?.message.includes("Implicit keys") || 
        deployError?.message.includes("YAML") ||
        deployError?.message.includes("configuration")
      ).toBe(true);
      
      // Should NOT have made any network requests
      expect(fetchSpy!).not.toHaveBeenCalled();
    });

    it("should fail with validation errors from server", async () => {
      // Arrange: Create invalid config using builder
      const configPath = createInvalidConfig()
        .saveToFile(tempDir);

      // Act
      let deployError: Error | undefined;
      try {
        await deployHandler({
          url: TEST_URL,
          token: TEST_TOKEN,
          config: configPath,
          quiet: false,
          ci: true,
        });
      } catch (error) {
        deployError = error as Error;
      }

      // Assert - Verify validation error handling
      expect(deployError).toBeDefined();
      expect(
        deployError?.message.includes("Configuration file doesn't match") || 
        deployError?.message.includes("validation") || 
        deployError?.message.includes("Invalid") ||
        deployError?.message.includes("expected schema")
      ).toBe(true);
      
      // Should NOT have made any network requests (config validation fails first)
      expect(fetchSpy!).not.toHaveBeenCalled();
    });
  });

  describe("Performance and Edge Cases", () => {
    it("should handle large configuration files efficiently", async () => {
      // Arrange: Generate large config
      const configPath = createLargeConfig({
        channelCount: 3,
        productTypeCount: 5,
        pageTypeCount: 3,
        categoryCount: 4
      }).saveToFile(tempDir);

      const startTime = Date.now();

      // Act
      let deployError: Error | undefined;
      try {
        await deployHandler({
          url: TEST_URL,
          token: TEST_TOKEN,
          config: configPath,
          quiet: false,
          ci: true,
        });
      } catch (error) {
        deployError = error as Error;
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert - Verify performance and correctness
      expect(deployError).toBeUndefined();
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      
      // Verify multiple mutations were sent for different entity types
      const allMutations = (fetchSpy!.mock.calls as FetchMockCall[]).filter((call) => {
        const body = call[1]?.body?.toString();
        return body && body.includes('mutation');
      });
      expect(allMutations.length).toBeGreaterThan(5); // Should have multiple mutations
    });
  });
}); 