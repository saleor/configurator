import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaleorConfig } from "../../modules/config/schema/schema";
import { ConfigurationLoadError, RemoteConfigurationError } from "../errors/configuration-errors";
import type { ServiceContainer } from "../service-container";
import { DiffService } from "./service";

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
    } as unknown as ServiceContainer;

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
        entityName: "germany",
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
        entityName: "germany",
      });
    });

    it("should detect channel updates", async () => {
      // Arrange: Same channel slug but different properties
      const localConfig: SaleorConfig = {
        channels: [
          {
            name: "Germany Store",
            currencyCode: "EUR",
            defaultCountry: "DE",
            slug: "germany",
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
        entityName: "germany",
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
            isShippingRequired: false,
            productAttributes: [
              {
                name: "Color",
                inputType: "DROPDOWN",
                values: [{ name: "Red" }, { name: "Blue" }],
              },
            ],
            variantAttributes: [],
          },
        ],
      };

      const remoteConfig: SaleorConfig = {
        productTypes: [
          {
            name: "ProductTypeA",
            isShippingRequired: false,
            productAttributes: [],
            variantAttributes: [],
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

    it("should detect product type creation with attributes", async () => {
      // Arrange: Product type with attributes in local but not in remote at all
      const localConfig: SaleorConfig = {
        productTypes: [
          {
            name: "Book",
            isShippingRequired: false,
            productAttributes: [
              {
                name: "Author",
                inputType: "PLAIN_TEXT",
              },
              {
                name: "Genre",
                inputType: "DROPDOWN",
                values: [{ name: "Fiction" }, { name: "Non-Fiction" }, { name: "Fantasy" }],
              },
              {
                name: "Related Books",
                inputType: "REFERENCE",
                entityType: "PRODUCT",
              },
            ],
            variantAttributes: [],
          },
        ],
      };

      const remoteConfig: SaleorConfig = {
        productTypes: [],
      };

      mockServices.configStorage.load = vi.fn().mockResolvedValue(localConfig);
      mockServices.configuration.retrieveWithoutSaving = vi.fn().mockResolvedValue(remoteConfig);

      // Act
      const summary = await diffService.compare();

      // Assert
      expect(summary.totalChanges).toBe(1);
      expect(summary.creates).toBe(1);
      expect(summary.results[0]).toMatchObject({
        operation: "CREATE",
        entityType: "Product Types",
        entityName: "Book",
      });

      // Should have changes array with all 3 attributes
      expect(summary.results[0].changes).toHaveLength(3);
      expect(summary.results[0].changes?.[0].description).toContain(
        'Attribute "Author" will be created'
      );
      expect(summary.results[0].changes?.[1].description).toContain(
        'Attribute "Genre" will be created'
      );
      expect(summary.results[0].changes?.[2].description).toContain(
        'Attribute "Related Books" will be created'
      );
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
      mockServices.configStorage.load = vi
        .fn()
        .mockRejectedValue(new Error("Config file not found"));

      // Act & Assert
      await expect(diffService.compare()).rejects.toThrow(ConfigurationLoadError);
      await expect(diffService.compare()).rejects.toThrow("Failed to load local configuration");
    });

    it("should handle remote configuration retrieval errors", async () => {
      // Arrange: Remote config retrieval throws error
      mockServices.configStorage.load = vi.fn().mockResolvedValue({});
      mockServices.configuration.retrieveWithoutSaving = vi
        .fn()
        .mockRejectedValue(new Error("Network error"));

      // Act & Assert
      await expect(diffService.compare()).rejects.toThrow(RemoteConfigurationError);
      await expect(diffService.compare()).rejects.toThrow(
        "Failed to retrieve remote configuration"
      );
    });

    it("should handle timeout for remote configuration", async () => {
      // Arrange: Create service with short timeout
      const serviceWithTimeout = new DiffService(mockServices, {
        remoteTimeoutMs: 100,
      });

      mockServices.configStorage.load = vi.fn().mockResolvedValue({});
      mockServices.configuration.retrieveWithoutSaving = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 200)) // Takes longer than timeout
      );

      // Act & Assert
      await expect(serviceWithTimeout.compare()).rejects.toThrow(RemoteConfigurationError);
      await expect(serviceWithTimeout.compare()).rejects.toThrow("timed out");
    });
  });

  describe("no differences", () => {
    it("should return empty summary when configs are identical", async () => {
      // Arrange: Identical configurations
      const config: SaleorConfig = {
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
            name: "Product",
            isShippingRequired: false,
          },
        ],
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

  describe("service configuration", () => {
    it("should use custom configuration", async () => {
      // Arrange: Create service with debug logging enabled
      const serviceWithDebug = new DiffService(mockServices, {
        enableDebugLogging: true,
        maxConcurrentComparisons: 2,
      });

      const config: SaleorConfig = {};
      mockServices.configStorage.load = vi.fn().mockResolvedValue(config);
      mockServices.configuration.retrieveWithoutSaving = vi.fn().mockResolvedValue(config);

      // Act
      const summary = await serviceWithDebug.compare();

      // Assert
      expect(summary.totalChanges).toBe(0);
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
            isShippingRequired: true,
            productAttributes: [
              {
                name: "Color",
                inputType: "DROPDOWN",
                values: [{ name: "Red" }, { name: "Blue" }, { name: "Green" }],
              },
            ],
            variantAttributes: [],
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
      const entityTypes = summary.results.map((r) => r.entityType);
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
        .filter((r) => r.operation === "CREATE" && r.entityType === "Channels")
        .map((r) => r.entityName);
      expect(newChannels).toContain("eu");
      expect(newChannels).toContain("uk");
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
        .filter((r) => r.operation === "DELETE")
        .map((r) => r.entityName);
      expect(deletedChannels).toContain("test");
      expect(deletedChannels).toContain("old");
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
          isShippingRequired: false,
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

  describe("compareForIntrospect", () => {
    it("should detect entities to add to local from remote", async () => {
      // Arrange: Remote has entities that local doesn't have
      const localConfig: SaleorConfig = {
        channels: [],
      };

      const remoteConfig: SaleorConfig = {
        channels: [
          {
            name: "Default Channel",
            currencyCode: "USD",
            defaultCountry: "US",
            slug: "default",
          },
        ],
      };

      mockServices.configStorage.load = vi.fn().mockResolvedValue(localConfig);
      mockServices.configuration.retrieveWithoutSaving = vi.fn().mockResolvedValue(remoteConfig);

      // Act
      const summary = await diffService.compareForIntrospect();

      // Assert - from introspect perspective, this is a CREATE (will be added to local)
      expect(summary.totalChanges).toBe(1);
      expect(summary.creates).toBe(1);
      expect(summary.updates).toBe(0);
      expect(summary.deletes).toBe(0);
      expect(summary.results[0]).toMatchObject({
        operation: "CREATE",
        entityType: "Channels",
        entityName: "default",
      });
    });

    it("should detect entities to remove from local", async () => {
      // Arrange: Local has entities that remote doesn't have
      const localConfig: SaleorConfig = {
        channels: [
          {
            name: "Old Channel",
            currencyCode: "EUR",
            defaultCountry: "DE",
            slug: "old",
          },
        ],
        productTypes: [
          {
            name: "Deprecated Type",
            isShippingRequired: false,
            productAttributes: [],
            variantAttributes: [],
          },
        ],
      };

      const remoteConfig: SaleorConfig = {
        channels: [],
        productTypes: [],
      };

      mockServices.configStorage.load = vi.fn().mockResolvedValue(localConfig);
      mockServices.configuration.retrieveWithoutSaving = vi.fn().mockResolvedValue(remoteConfig);

      // Act
      const summary = await diffService.compareForIntrospect();

      // Assert - from introspect perspective, these are DELETEs (will be removed from local)
      expect(summary.totalChanges).toBe(2);
      expect(summary.creates).toBe(0);
      expect(summary.updates).toBe(0);
      expect(summary.deletes).toBe(2);

      const deletions = summary.results.filter((r) => r.operation === "DELETE");
      expect(deletions).toHaveLength(2);
      expect(deletions.map((r) => r.entityName)).toContain("old");
      expect(deletions.map((r) => r.entityName)).toContain("Deprecated Type");
    });

    it("should detect entities to update in local", async () => {
      // Arrange: Both have entities but with different properties
      const localConfig: SaleorConfig = {
        shop: {
          defaultMailSenderName: "Local Shop",
          displayGrossPrices: false,
        },
      };

      const remoteConfig: SaleorConfig = {
        shop: {
          defaultMailSenderName: "Remote Shop",
          displayGrossPrices: true,
        },
      };

      mockServices.configStorage.load = vi.fn().mockResolvedValue(localConfig);
      mockServices.configuration.retrieveWithoutSaving = vi.fn().mockResolvedValue(remoteConfig);

      // Act
      const summary = await diffService.compareForIntrospect();

      // Assert - from introspect perspective, this is an UPDATE
      expect(summary.totalChanges).toBe(1);
      expect(summary.creates).toBe(0);
      expect(summary.updates).toBe(1);
      expect(summary.deletes).toBe(0);
      expect(summary.results[0]).toMatchObject({
        operation: "UPDATE",
        entityType: "Shop Settings",
        entityName: "Shop Settings",
      });
    });

    it("should handle empty remote (will clear local)", async () => {
      // Arrange: Local has everything, remote is empty
      const localConfig: SaleorConfig = {
        shop: {
          defaultMailSenderName: "My Shop",
        },
        channels: [
          {
            name: "Channel 1",
            currencyCode: "USD",
            defaultCountry: "US",
            slug: "ch1",
          },
        ],
        productTypes: [
          {
            name: "Product Type 1",
            isShippingRequired: false,
            productAttributes: [],
            variantAttributes: [],
          },
        ],
      };

      const remoteConfig: SaleorConfig = {};

      mockServices.configStorage.load = vi.fn().mockResolvedValue(localConfig);
      mockServices.configuration.retrieveWithoutSaving = vi.fn().mockResolvedValue(remoteConfig);

      // Act
      const summary = await diffService.compareForIntrospect();

      // Assert - everything will be deleted from local
      expect(summary.totalChanges).toBe(3);
      expect(summary.creates).toBe(0);
      expect(summary.updates).toBe(0);
      expect(summary.deletes).toBe(3);
    });

    it("should handle error scenarios", async () => {
      // Arrange: Config loading throws error
      mockServices.configStorage.load = vi
        .fn()
        .mockRejectedValue(new Error("Config file not found"));

      // Act & Assert
      await expect(diffService.compareForIntrospect()).rejects.toThrow(ConfigurationLoadError);
    });
  });
});
