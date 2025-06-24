import { describe, it, expect, vi, beforeEach } from "vitest";
import { DiffService } from "./diff-service";
import type { ServiceContainer } from "./service-container";
import type { SaleorConfig } from "../modules/config/schema";

describe("DiffService", () => {
  let diffService: DiffService;
  let mockServices: ServiceContainer;

  beforeEach(() => {
    // Arrange: Mock services
    mockServices = {
      configStorage: {
        load: vi.fn(),
        save: vi.fn(),
      },
      configuration: {
        retrieve: vi.fn(),
        retrieveWithoutSaving: vi.fn(),
      },
    } as any;

    diffService = new DiffService(mockServices);
  });

  describe("compareChannels", () => {
    it("should detect channel creation", async () => {
      // Arrange: Local has a channel that remote doesn't have
      const localConfig: SaleorConfig = {
        channels: [
          {
            name: "Germany",
            currencyCode: "EUR",
            defaultCountry: "DE",
            slug: "germany",
          },
        ],
      };

      const remoteConfig: SaleorConfig = {
        channels: [],
      };

      mockServices.configStorage.load = vi.fn().mockResolvedValue(localConfig);
      mockServices.configuration.retrieveWithoutSaving = vi.fn().mockResolvedValue(remoteConfig);

      // Act
      const summary = await diffService.compare();

      // Assert
      expect(summary.totalChanges).toBe(1);
      expect(summary.creates).toBe(1);
      expect(summary.updates).toBe(0);
      expect(summary.deletes).toBe(0);
      expect(summary.results[0]).toMatchObject({
        operation: "CREATE",
        entityType: "Channels",
        entityName: "Germany",
      });
    });

    it("should detect channel deletion", async () => {
      // Arrange: Remote has a channel that local doesn't have
      const localConfig: SaleorConfig = {
        channels: [],
      };

      const remoteConfig: SaleorConfig = {
        channels: [
          {
            name: "Germany",
            currencyCode: "EUR",
            defaultCountry: "DE",
            slug: "germany",
          },
        ],
      };

      mockServices.configStorage.load = vi.fn().mockResolvedValue(localConfig);
      mockServices.configuration.retrieveWithoutSaving = vi.fn().mockResolvedValue(remoteConfig);

      // Act
      const summary = await diffService.compare();

      // Assert
      expect(summary.totalChanges).toBe(1);
      expect(summary.creates).toBe(0);
      expect(summary.updates).toBe(0);
      expect(summary.deletes).toBe(1);
      expect(summary.results[0]).toMatchObject({
        operation: "DELETE",
        entityType: "Channels",
        entityName: "Germany",
      });
    });

    it("should detect channel updates", async () => {
      // Arrange: Same channel name but different properties
      const localConfig: SaleorConfig = {
        channels: [
          {
            name: "Germany",
            currencyCode: "EUR",
            defaultCountry: "DE",
            slug: "germany-new",
          },
        ],
      };

      const remoteConfig: SaleorConfig = {
        channels: [
          {
            name: "Germany",
            currencyCode: "USD",
            defaultCountry: "DE",
            slug: "germany",
          },
        ],
      };

      mockServices.configStorage.load = vi.fn().mockResolvedValue(localConfig);
      mockServices.configuration.retrieveWithoutSaving = vi.fn().mockResolvedValue(remoteConfig);

      // Act
      const summary = await diffService.compare();

      // Assert
      expect(summary.totalChanges).toBe(1);
      expect(summary.creates).toBe(0);
      expect(summary.updates).toBe(1);
      expect(summary.deletes).toBe(0);
      expect(summary.results[0]).toMatchObject({
        operation: "UPDATE",
        entityType: "Channels",
        entityName: "Germany",
      });
      expect(summary.results[0].changes).toHaveLength(2);
    });
  });

  describe("compareProductTypes", () => {
    it("should detect product type with new attributes", async () => {
      // Arrange: Product type with attributes in local but not in remote
      const localConfig: SaleorConfig = {
        productTypes: [
          {
            name: "ProductTypeA",
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

      const remoteConfig: SaleorConfig = {
        productTypes: [
          {
            name: "ProductTypeA",
            attributes: [],
          },
        ],
      };

      mockServices.configStorage.load = vi.fn().mockResolvedValue(localConfig);
      mockServices.configuration.retrieveWithoutSaving = vi.fn().mockResolvedValue(remoteConfig);

      // Act
      const summary = await diffService.compare();

      // Assert
      expect(summary.totalChanges).toBe(1);
      expect(summary.updates).toBe(1);
      expect(summary.results[0]).toMatchObject({
        operation: "UPDATE",
        entityType: "Product Types",
        entityName: "ProductTypeA",
      });
      expect(summary.results[0].changes).toHaveLength(1);
      expect(summary.results[0].changes?.[0].description).toContain('Attribute "Color" added');
    });
  });

  describe("compareShopSettings", () => {
    it("should detect shop settings changes", async () => {
      // Arrange: Different shop settings
      const localConfig: SaleorConfig = {
        shop: {
          defaultMailSenderName: "New Shop",
          displayGrossPrices: true,
        },
      };

      const remoteConfig: SaleorConfig = {
        shop: {
          defaultMailSenderName: "Old Shop",
          displayGrossPrices: false,
        },
      };

      mockServices.configStorage.load = vi.fn().mockResolvedValue(localConfig);
      mockServices.configuration.retrieveWithoutSaving = vi.fn().mockResolvedValue(remoteConfig);

      // Act
      const summary = await diffService.compare();

      // Assert
      expect(summary.totalChanges).toBe(1);
      expect(summary.updates).toBe(1);
      expect(summary.results[0].entityType).toBe("Shop Settings");
      expect(summary.results[0].changes).toHaveLength(2);
    });
  });

  describe("error handling", () => {
    it("should handle configuration loading errors", async () => {
      // Arrange: Config loading throws error
      mockServices.configStorage.load = vi.fn().mockRejectedValue(new Error("Config file not found"));

      // Act & Assert
      await expect(diffService.compare()).rejects.toThrow("Config file not found");
    });

    it("should handle remote configuration retrieval errors", async () => {
      // Arrange: Remote config retrieval throws error
      mockServices.configStorage.load = vi.fn().mockResolvedValue({});
      mockServices.configuration.retrieveWithoutSaving = vi.fn().mockRejectedValue(new Error("Network error"));

      // Act & Assert
      await expect(diffService.compare()).rejects.toThrow("Network error");
    });
  });

  describe("no differences", () => {
    it("should return empty summary when configs are identical", async () => {
      // Arrange: Identical configurations
      const config: SaleorConfig = {
        channels: [{
          name: "Default",
          currencyCode: "USD",
          defaultCountry: "US",
          slug: "default",
        }],
        productTypes: [{
          name: "Product",
        }],
      };

      mockServices.configStorage.load = vi.fn().mockResolvedValue(config);
      mockServices.configuration.retrieveWithoutSaving = vi.fn().mockResolvedValue(config);

      // Act
      const summary = await diffService.compare();

      // Assert
      expect(summary.totalChanges).toBe(0);
      expect(summary.creates).toBe(0);
      expect(summary.updates).toBe(0);
      expect(summary.deletes).toBe(0);
      expect(summary.results).toHaveLength(0);
    });
  });

  describe("real-world scenarios", () => {
    it("should detect new store setup scenario", async () => {
      // Arrange: Setting up a new store with basic configuration
      const localConfig: SaleorConfig = {
        shop: {
          defaultMailSenderName: "My New Store",
          defaultMailSenderAddress: "store@example.com",
          displayGrossPrices: true,
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
                values: [
                  { name: "Red" },
                  { name: "Blue" },
                  { name: "Green" },
                ],
              },
            ],
          },
        ],
      };

      // Empty Saleor instance
      const remoteConfig: SaleorConfig = {};

      mockServices.configStorage.load = vi.fn().mockResolvedValue(localConfig);
      mockServices.configuration.retrieveWithoutSaving = vi.fn().mockResolvedValue(remoteConfig);

      // Act
      const summary = await diffService.compare();

      // Assert
      expect(summary.totalChanges).toBe(3); // shop + channel + product type
      expect(summary.creates).toBe(3);
      expect(summary.updates).toBe(0);
      expect(summary.deletes).toBe(0);

      // Verify entities are detected correctly
      const entityTypes = summary.results.map(r => r.entityType);
      expect(entityTypes).toContain("Shop Settings");
      expect(entityTypes).toContain("Channels");
      expect(entityTypes).toContain("Product Types");
    });

    it("should detect multi-channel expansion scenario", async () => {
      // Arrange: Adding new international channels to existing store
      const localConfig: SaleorConfig = {
        channels: [
          {
            name: "US Store",
            currencyCode: "USD",
            defaultCountry: "US",
            slug: "us",
          },
          {
            name: "EU Store", // New channel
            currencyCode: "EUR",
            defaultCountry: "DE",
            slug: "eu",
            settings: {
              allocationStrategy: "PRIORITIZE_SORTING_ORDER",
            },
          },
          {
            name: "UK Store", // New channel
            currencyCode: "GBP",
            defaultCountry: "GB",
            slug: "uk",
          },
        ],
      };

      const remoteConfig: SaleorConfig = {
        channels: [
          {
            name: "US Store", // Existing
            currencyCode: "USD",
            defaultCountry: "US",
            slug: "us",
          },
        ],
      };

      mockServices.configStorage.load = vi.fn().mockResolvedValue(localConfig);
      mockServices.configuration.retrieveWithoutSaving = vi.fn().mockResolvedValue(remoteConfig);

      // Act
      const summary = await diffService.compare();

      // Assert
      expect(summary.totalChanges).toBe(2); // 2 new channels
      expect(summary.creates).toBe(2);
      expect(summary.updates).toBe(0);
      expect(summary.deletes).toBe(0);

      // Verify new channels are detected
      const newChannels = summary.results
        .filter(r => r.operation === "CREATE" && r.entityType === "Channels")
        .map(r => r.entityName);
      expect(newChannels).toContain("EU Store");
      expect(newChannels).toContain("UK Store");
    });

    it("should detect attribute updates scenario", async () => {
      // Arrange: Expanding product attributes for better catalog
      const localConfig: SaleorConfig = {
        productTypes: [
          {
            name: "Clothing",
            attributes: [
              {
                name: "Size", // Existing
                inputType: "DROPDOWN",
                values: [
                  { name: "S" },
                  { name: "M" },
                  { name: "L" },
                  { name: "XL" }, // New value
                ],
              },
              {
                name: "Material", // New attribute
                inputType: "DROPDOWN",
                values: [
                  { name: "Cotton" },
                  { name: "Polyester" },
                ],
              },
            ],
          },
        ],
      };

      const remoteConfig: SaleorConfig = {
        productTypes: [
          {
            name: "Clothing",
            attributes: [
              {
                name: "Size",
                inputType: "DROPDOWN",
                values: [
                  { name: "S" },
                  { name: "M" },
                  { name: "L" },
                ],
              },
            ],
          },
        ],
      };

      mockServices.configStorage.load = vi.fn().mockResolvedValue(localConfig);
      mockServices.configuration.retrieveWithoutSaving = vi.fn().mockResolvedValue(remoteConfig);

      // Act
      const summary = await diffService.compare();

      // Assert
      expect(summary.totalChanges).toBe(1);
      expect(summary.updates).toBe(1);

      const clothingUpdate = summary.results.find(
        r => r.entityType === "Product Types" && r.entityName === "Clothing"
      );
      expect(clothingUpdate).toBeDefined();
      expect(clothingUpdate?.changes?.length).toBeGreaterThan(0);
    });

    it("should detect configuration cleanup scenario", async () => {
      // Arrange: Removing unused entities (what would be deleted)
      const localConfig: SaleorConfig = {
        channels: [
          {
            name: "Main Store",
            currencyCode: "USD",
            defaultCountry: "US",
            slug: "main",
          },
        ],
      };

      const remoteConfig: SaleorConfig = {
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
          {
            name: "Old Channel", // Will be marked for deletion
            currencyCode: "EUR",
            defaultCountry: "DE",
            slug: "old",
          },
        ],
      };

      mockServices.configStorage.load = vi.fn().mockResolvedValue(localConfig);
      mockServices.configuration.retrieveWithoutSaving = vi.fn().mockResolvedValue(remoteConfig);

      // Act
      const summary = await diffService.compare();

      // Assert
      expect(summary.totalChanges).toBe(2);
      expect(summary.deletes).toBe(2);

      const deletedChannels = summary.results
        .filter(r => r.operation === "DELETE")
        .map(r => r.entityName);
      expect(deletedChannels).toContain("Test Channel");
      expect(deletedChannels).toContain("Old Channel");
    });
  });

  describe("output formatting", () => {
    it("should format complex diff scenarios correctly", async () => {
      // Arrange: Complex scenario with multiple changes
      const localConfig: SaleorConfig = {
        shop: {
          defaultMailSenderName: "Updated Store",
        },
        channels: [
          {
            name: "New Channel",
            currencyCode: "EUR",
            defaultCountry: "DE",
            slug: "new",
          },
        ],
        productTypes: [
          {
            name: "Updated Product",
            attributes: [
              {
                name: "New Attribute",
                inputType: "PLAIN_TEXT",
              },
            ],
          },
        ],
      };

      const remoteConfig: SaleorConfig = {
        shop: {
          defaultMailSenderName: "Old Store",
        },
        channels: [
          {
            name: "Old Channel",
            currencyCode: "USD",
            defaultCountry: "US",
            slug: "old",
          },
        ],
        productTypes: [
          {
            name: "Updated Product",
            attributes: [],
          },
        ],
      };

      mockServices.configStorage.load = vi.fn().mockResolvedValue(localConfig);
      mockServices.configuration.retrieveWithoutSaving = vi.fn().mockResolvedValue(remoteConfig);

      // Act
      const summary = await diffService.compare();

      // Assert: Test table format exists and contains expected sections
      const { DiffFormatter } = await import("../lib/types/diff");
      const tableOutput = DiffFormatter.format(summary);
      expect(tableOutput).toContain("📊 Configuration Diff Results");
      expect(tableOutput).toContain("🏪 Shop Settings");
      expect(tableOutput).toContain("🌐 Channels");
      expect(tableOutput).toContain("📦 Product Types");
      expect(tableOutput).toContain("📈 Summary");

      // Test summary format
      const summaryOutput = DiffFormatter.formatSummary(summary);
      expect(summaryOutput).toContain("Found");
      expect(summaryOutput).toContain("difference");

      // Test JSON serialization
      const jsonString = JSON.stringify(summary);
      const parsedSummary = JSON.parse(jsonString);
      expect(parsedSummary.totalChanges).toBe(summary.totalChanges);
      expect(parsedSummary.results).toHaveLength(summary.results.length);
    });
  });

  describe("performance", () => {
    it("should handle large configurations efficiently", async () => {
      // Arrange: Create large config with many entities
      const largeConfig: SaleorConfig = {
        channels: Array.from({ length: 20 }, (_, i) => ({
          name: `Channel ${i}`,
          currencyCode: "USD",
          defaultCountry: "US",
          slug: `channel-${i}`,
        })),
        productTypes: Array.from({ length: 30 }, (_, i) => ({
          name: `Product Type ${i}`,
          attributes: Array.from({ length: 3 }, (_, j) => ({
            name: `Attribute ${j}`,
            inputType: "PLAIN_TEXT" as const,
          })),
        })),
      };

      const emptyConfig: SaleorConfig = {};

      mockServices.configStorage.load = vi.fn().mockResolvedValue(largeConfig);
      mockServices.configuration.retrieveWithoutSaving = vi.fn().mockResolvedValue(emptyConfig);

      // Act
      const startTime = Date.now();
      const summary = await diffService.compare();
      const endTime = Date.now();

      // Assert: Should complete quickly
      expect(endTime - startTime).toBeLessThan(1000);

      // Should detect all entities
      expect(summary.totalChanges).toBe(50); // 20 channels + 30 product types
      expect(summary.creates).toBe(50);
    });
  });

  describe("edge cases", () => {
    it("should handle empty configurations", async () => {
      // Arrange: Both configs empty
      const emptyConfig: SaleorConfig = {};

      mockServices.configStorage.load = vi.fn().mockResolvedValue(emptyConfig);
      mockServices.configuration.retrieveWithoutSaving = vi.fn().mockResolvedValue(emptyConfig);

      // Act
      const summary = await diffService.compare();

      // Assert
      expect(summary.totalChanges).toBe(0);
      expect(summary.results).toHaveLength(0);
    });

    it("should handle partial configurations", async () => {
      // Arrange: Different sections in each config
      const localConfig: SaleorConfig = {
        shop: {
          defaultMailSenderName: "Partial Store",
        },
      };

      const remoteConfig: SaleorConfig = {
        channels: [
          {
            name: "Remote Channel",
            currencyCode: "USD",
            defaultCountry: "US",
            slug: "remote",
          },
        ],
      };

      mockServices.configStorage.load = vi.fn().mockResolvedValue(localConfig);
      mockServices.configuration.retrieveWithoutSaving = vi.fn().mockResolvedValue(remoteConfig);

      // Act
      const summary = await diffService.compare();

      // Assert
      expect(summary.totalChanges).toBe(2); // 1 create + 1 delete
      expect(summary.creates).toBe(1); // Shop settings
      expect(summary.deletes).toBe(1); // Channel
    });
  });
}); 