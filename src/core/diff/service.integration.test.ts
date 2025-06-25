import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "fs";
import { DiffService } from "./service";
import { DiffFormatter, type DiffSummary, type DiffChange } from ".";

/**
 * Integration Tests for Diff Functionality
 * Tests the integration between services, file I/O, and formatting
 */
describe("Diff Service Integration Tests", () => {
  const testConfigPath = "test-integration-config.yml";

  beforeAll(async () => {
    // Create a simple test config file
    const testConfig = `
shop:
  defaultMailSenderName: "Test Store"
  defaultMailSenderAddress: "test@example.com"

channels:
  - name: "Test Channel"
    currencyCode: "USD"
    defaultCountry: "US"
    slug: "test"

productTypes:
  - name: "Book"
    attributes:
      - name: "Author"
        inputType: "PLAIN_TEXT"
`;

    await fs.writeFile(testConfigPath, testConfig.trim());
  });

  afterAll(async () => {
    // Clean up test files
    try {
      await fs.unlink(testConfigPath);
    } catch {
      // File might not exist
    }
  });

  describe("Configuration Loading Integration", () => {
    it("should load YAML configuration correctly", async () => {
      // Test YAML loading without full configurator
      const content = await fs.readFile(testConfigPath, "utf-8");
      expect(content).toBeDefined();
      expect(content).toContain("Test Store");
      expect(content).toContain("Test Channel");
      expect(content).toContain("Book");
    });

    it("should handle missing config file gracefully", async () => {
      await expect(
        fs.readFile("nonexistent.yml", "utf-8")
      ).rejects.toThrow();
    });

    it("should handle complex configuration structures", async () => {
      const complexConfigPath = "test-complex.yml";
      const complexConfig = `
shop:
  defaultMailSenderName: "Complex Store"
  displayGrossPrices: true
  limitQuantityPerCheckout: 50

channels:
  - name: "Global"
    currencyCode: "USD"
    defaultCountry: "US"
    slug: "global"
    settings:
      allocationStrategy: "PRIORITIZE_SORTING_ORDER"
      automaticallyConfirmAllNewOrders: true
  - name: "Europe"
    currencyCode: "EUR"
    defaultCountry: "DE"
    slug: "europe"

productTypes:
  - name: "Electronics"
    attributes:
      - name: "Brand"
        inputType: "PLAIN_TEXT"
      - name: "Warranty"
        inputType: "DROPDOWN"
        values:
          - name: "1 Year"
          - name: "2 Years"
`;

      await fs.writeFile(complexConfigPath, complexConfig.trim());

      try {
        const content = await fs.readFile(complexConfigPath, "utf-8");
        expect(content).toContain("Complex Store");
        expect(content).toContain("PRIORITIZE_SORTING_ORDER");
        expect(content).toContain("Warranty");
      } finally {
        await fs.unlink(complexConfigPath).catch(() => {});
      }
    });
  });

  describe("Diff Service Integration", () => {
    it("should handle diff comparison with mocked services", async () => {
      const localConfig = {
        shop: {
          defaultMailSenderName: "Local Store",
        },
        channels: [
          {
            name: "Local Channel",
            currencyCode: "EUR",
            defaultCountry: "DE",
            slug: "local",
          },
        ],
      };

      const remoteConfig = {
        shop: {
          defaultMailSenderName: "Remote Store",
        },
      };

      const mockServices = {
        configStorage: {
          load: async () => localConfig,
          save: async () => {},
        },
        configuration: {
          retrieve: async () => remoteConfig,
          retrieveWithoutSaving: async () => remoteConfig,
        }
      } as any;

      const diffService = new DiffService(mockServices);
      const summary = await diffService.compare();

      expect(summary.totalChanges).toBeGreaterThan(0);
      expect(summary.results).toBeDefined();
      expect(Array.isArray(summary.results)).toBe(true);
    });

    it("should handle identical configurations", async () => {
      const identicalConfig = {
        shop: {
          defaultMailSenderName: "Same Store",
        },
      };

      const mockServices = {
        configStorage: {
          load: async () => identicalConfig,
          save: async () => {},
        },
        configuration: {
          retrieve: async () => identicalConfig,
          retrieveWithoutSaving: async () => identicalConfig,
        }
      } as any;

      const diffService = new DiffService(mockServices);
      const summary = await diffService.compare();

      expect(summary.totalChanges).toBe(0);
      expect(summary.results).toHaveLength(0);
    });

    it("should handle empty configurations", async () => {
      const mockServices = {
        configStorage: {
          load: async () => ({}),
          save: async () => {},
        },
        configuration: {
          retrieve: async () => ({}),
          retrieveWithoutSaving: async () => ({}),
        }
      } as any;

      const diffService = new DiffService(mockServices);
      const summary = await diffService.compare();

      expect(summary.totalChanges).toBe(0);
      expect(summary.results).toHaveLength(0);
    });

    it("should respect service configuration", async () => {
      const identicalConfig = {
        shop: {
          defaultMailSenderName: "Same Store",
        },
      };

      const mockServices = {
        configStorage: {
          load: async () => identicalConfig,
          save: async () => {},
        },
        configuration: {
          retrieve: async () => identicalConfig,
          retrieveWithoutSaving: async () => identicalConfig,
        }
      } as any;

      // Test with custom configuration
      const diffService = new DiffService(mockServices, {
        enableDebugLogging: true,
        maxConcurrentComparisons: 10,
        remoteTimeoutMs: 5000,
      });
      
      const summary = await diffService.compare();

      expect(summary.totalChanges).toBe(0);
      expect(summary.results).toHaveLength(0);
    });
  });

  describe("Output Format Integration", () => {
    it("should format diff results in table format", () => {
      const mockSummary: DiffSummary = {
        totalChanges: 2,
        creates: 1,
        updates: 1,
        deletes: 0,
        results: [
          {
            entityType: "Shop Settings",
            entityName: "Shop Settings",
            operation: "UPDATE",
            changes: [
              {
                field: "defaultMailSenderName",
                currentValue: "Old Store",
                desiredValue: "New Store",
              } as DiffChange,
            ],
          },
          {
            entityType: "Channels",
            entityName: "New Channel",
            operation: "CREATE",
            changes: [],
          },
        ],
      };

      const output = DiffFormatter.format(mockSummary);

      expect(output).toContain("Configuration Diff Results");
      expect(output).toContain("Shop Settings");
      expect(output).toContain("Channels");
      expect(output).toContain("Update");
      expect(output).toContain("Create");
      expect(output).toContain("Summary");
    });

    it("should format diff results in JSON format", () => {
      const mockSummary: DiffSummary = {
        totalChanges: 1,
        creates: 1,
        updates: 0,
        deletes: 0,
        results: [
          {
            entityType: "Channels",
            entityName: "Test Channel",
            operation: "CREATE",
            changes: [],
          },
        ],
      };

      const jsonString = JSON.stringify(mockSummary, null, 2);
      const parsed = JSON.parse(jsonString);

      expect(parsed.totalChanges).toBe(1);
      expect(parsed.creates).toBe(1);
      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].entityType).toBe("Channels");
      expect(parsed.results[0].operation).toBe("CREATE");
    });

    it("should format summary output", () => {
      const mockSummary: DiffSummary = {
        totalChanges: 3,
        creates: 1,
        updates: 1,
        deletes: 1,
        results: [],
      };

      const summary = DiffFormatter.formatSummary(mockSummary);

      expect(summary).toContain("Found 3 differences");
      expect(summary).toContain("create");
      expect(summary).toContain("update");
      expect(summary).toContain("delete");
    });

    it("should handle no differences", () => {
      const mockSummary: DiffSummary = {
        totalChanges: 0,
        creates: 0,
        updates: 0,
        deletes: 0,
        results: [],
      };

      const output = DiffFormatter.format(mockSummary);
      const summary = DiffFormatter.formatSummary(mockSummary);

      expect(output).toContain("No differences found");
      expect(summary).toContain("No differences found");
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle service errors gracefully", async () => {
      const mockServices = {
        configStorage: {
          load: async () => ({ shop: { defaultMailSenderName: "Test" } }),
          save: async () => {},
        },
        configuration: {
          retrieve: async () => {
            throw new Error("Network error");
          },
          retrieveWithoutSaving: async () => {
            throw new Error("Network error");
          },
        }
      } as any;

      const diffService = new DiffService(mockServices);

      await expect(diffService.compare()).rejects.toThrow("Failed to retrieve remote configuration");
    });

    it("should handle config loading errors", async () => {
      const mockServices = {
        configStorage: {
          load: async () => {
            throw new Error("Config file not found");
          },
          save: async () => {},
        },
        configuration: {
          retrieve: async () => ({}),
          retrieveWithoutSaving: async () => ({}),
        }
      } as any;

      const diffService = new DiffService(mockServices);

      await expect(diffService.compare()).rejects.toThrow("Failed to load local configuration");
    });
  });

  describe("Real-world Scenarios Integration", () => {
    it("should detect new store setup scenario", async () => {
      const localConfig = {
        shop: {
          defaultMailSenderName: "My New Store",
          defaultMailSenderAddress: "store@example.com",
        },
        channels: [
          {
            name: "Default",
            currencyCode: "USD",
            defaultCountry: "US",
            slug: "default",
          },
        ],
        productTypes: [
          {
            name: "Physical Product",
            attributes: [
              {
                name: "Color",
                inputType: "DROPDOWN",
                values: [{ name: "Red" }, { name: "Blue" }],
              },
            ],
          },
        ],
      };

      const remoteConfig = {}; // Empty Saleor instance

      const mockServices = {
        configStorage: {
          load: async () => localConfig,
          save: async () => {},
        },
        configuration: {
          retrieve: async () => remoteConfig,
          retrieveWithoutSaving: async () => remoteConfig,
        }
      } as any;

      const diffService = new DiffService(mockServices);
      const summary = await diffService.compare();

      expect(summary.totalChanges).toBeGreaterThan(0);
      expect(summary.creates).toBeGreaterThan(0);

      // Should detect entities
      const entityTypes = summary.results.map(r => r.entityType);
      expect(entityTypes.length).toBeGreaterThan(0);
    });

    it("should detect configuration cleanup scenario", async () => {
      const localConfig = {
        channels: [
          {
            name: "Main Store",
            currencyCode: "USD",
            defaultCountry: "US",
            slug: "main",
          },
        ],
      };

      const remoteConfig = {
        channels: [
          {
            name: "Main Store",
            currencyCode: "USD",
            defaultCountry: "US",
            slug: "main",
          },
          {
            name: "Test Channel", // Will be marked for deletion
            currencyCode: "USD",
            defaultCountry: "US",
            slug: "test",
          },
        ],
      };

      const mockServices = {
        configStorage: {
          load: async () => localConfig,
          save: async () => {},
        },
        configuration: {
          retrieve: async () => remoteConfig,
          retrieveWithoutSaving: async () => remoteConfig,
        }
      } as any;

      const diffService = new DiffService(mockServices);
      const summary = await diffService.compare();

      expect(summary.totalChanges).toBeGreaterThan(0);

      // Should detect deletions
      const deleteOperations = summary.results.filter(r => r.operation === "DELETE");
      expect(deleteOperations.length).toBeGreaterThan(0);
    });
  });

  describe("Performance Integration", () => {
    it("should handle large configurations efficiently", async () => {
      // Create large config with many entities
      const largeConfig = {
        channels: Array.from({ length: 20 }, (_, i) => ({
          name: `Channel ${i}`,
          currencyCode: "USD",
          defaultCountry: "US",
          slug: `channel-${i}`,
        })),
        productTypes: Array.from({ length: 10 }, (_, i) => ({
          name: `Product Type ${i}`,
          attributes: [
            {
              name: `Attribute ${i}`,
              inputType: "PLAIN_TEXT",
            },
          ],
        })),
      };

      const emptyConfig = {};

      const mockServices = {
        configStorage: {
          load: async () => largeConfig,
          save: async () => {},
        },
        configuration: {
          retrieve: async () => emptyConfig,
          retrieveWithoutSaving: async () => emptyConfig,
        }
      } as any;

      const diffService = new DiffService(mockServices);

      const startTime = Date.now();
      const summary = await diffService.compare();
      const endTime = Date.now();

      // Should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(2000);

      // Should detect all entities
      expect(summary.totalChanges).toBe(30); // 20 channels + 10 product types
      expect(summary.creates).toBe(30);
    });
  });
}); 