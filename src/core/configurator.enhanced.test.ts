import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SaleorConfigurator } from "./configurator";
import type { ServiceContainer } from "./service-container";

// Mock dependencies
vi.mock("./service-container");
vi.mock("./diff-service");
vi.mock("../lib/logger");

describe("SaleorConfigurator enhanced functionality", () => {
  let configurator: SaleorConfigurator;
  let mockServices: Partial<ServiceContainer>;

  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();

    // Mock service container
    mockServices = {
      configuration: {
        retrieve: vi.fn(),
      },
      configStorage: {
        load: vi.fn(),
      },
      shop: {
        updateSettings: vi.fn(),
      },
      channel: {
        bootstrapChannels: vi.fn(),
      },
      productType: {
        bootstrapProductType: vi.fn(),
      },
      pageType: {
        bootstrapPageType: vi.fn(),
      },
      category: {
        bootstrapCategories: vi.fn(),
      },
    } as any;

    // Create configurator instance with mocked services
    configurator = new SaleorConfigurator(mockServices as ServiceContainer);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("introspect method", () => {
    it("should successfully introspect and return configuration", async () => {
      // Arrange
      const mockRemoteConfig = {
        shop: { headerText: "Test Shop" },
        channels: [
          { name: "Test Channel", slug: "test", currencyCode: "USD", defaultCountry: "US" },
        ],
      };

      mockServices.configuration!.retrieve = vi.fn().mockResolvedValue(mockRemoteConfig);

      // Act
      const result = await configurator.introspect();

      // Assert
      expect(mockServices.configuration!.retrieve).toHaveBeenCalled();
      expect(result).toEqual(mockRemoteConfig);
    });

    it("should handle service composition errors", async () => {
      // Arrange
      const error = new Error("GraphQL composition failed");
      mockServices.configuration!.retrieve = vi.fn().mockRejectedValue(error);

      // Act & Assert
      await expect(configurator.introspect()).rejects.toThrow("GraphQL composition failed");
    });

    it("should introspect with empty configuration", async () => {
      // Arrange
      const emptyConfig = {};
      mockServices.configuration!.retrieve = vi.fn().mockResolvedValue(emptyConfig);

      // Act
      const result = await configurator.introspect();

      // Assert
      expect(result).toEqual(emptyConfig);
    });

    it("should handle complex configuration introspection", async () => {
      // Arrange
      const complexConfig = {
        shop: {
          headerText: "Complex Shop",
          description: "A complex shop configuration",
          trackInventoryByDefault: true,
        },
        channels: [
          { name: "Channel 1", slug: "ch1", currencyCode: "USD", defaultCountry: "US" },
          { name: "Channel 2", slug: "ch2", currencyCode: "EUR", defaultCountry: "DE" },
        ],
        productTypes: [{ name: "Product Type 1", attributes: [] }],
      };

      mockServices.configuration!.retrieve = vi.fn().mockResolvedValue(complexConfig);

      // Act
      const result = await configurator.introspect();

      // Assert
      expect(result).toEqual(complexConfig);
    });

    it("should handle concurrent introspect operations", async () => {
      // Arrange
      const config1 = { shop: { headerText: "Shop 1" } };
      const config2 = { shop: { headerText: "Shop 2" } };

      const mockRetrieve = vi.fn().mockResolvedValueOnce(config1).mockResolvedValueOnce(config2);

      mockServices.configuration!.retrieve = mockRetrieve;

      // Act
      const [result1, result2] = await Promise.all([
        configurator.introspect(),
        configurator.introspect(),
      ]);

      // Assert
      expect(result1).toEqual(config1);
      expect(result2).toEqual(config2);
      expect(mockServices.configuration!.retrieve).toHaveBeenCalledTimes(2);
    });
  });

  describe("error handling scenarios", () => {
    it("should handle network errors gracefully", async () => {
      // Arrange
      const networkError = new Error("Network request failed");
      mockServices.configuration!.retrieve = vi.fn().mockRejectedValue(networkError);

      // Act & Assert
      await expect(configurator.introspect()).rejects.toThrow("Network request failed");
    });

    it("should handle authentication errors", async () => {
      // Arrange
      const authError = new Error("GraphQL Error: Unauthorized (401)");
      mockServices.configuration!.retrieve = vi.fn().mockRejectedValue(authError);

      // Act & Assert
      await expect(configurator.introspect()).rejects.toThrow("GraphQL Error: Unauthorized (401)");
    });
  });

  describe("integration scenarios", () => {
    it("should handle complex configuration with all sections", async () => {
      // Arrange
      const complexConfig = {
        shop: {
          headerText: "Complex Shop",
          description: "A shop with all features",
          trackInventoryByDefault: true,
        },
        channels: [
          {
            name: "Web Channel",
            slug: "web",
            currencyCode: "USD",
            defaultCountry: "US",
            settings: {
              allocationStrategy: "PRIORITIZE_HIGH_STOCK",
              automaticallyConfirmAllNewOrders: true,
            },
          },
          {
            name: "Mobile Channel",
            slug: "mobile",
            currencyCode: "EUR",
            defaultCountry: "DE",
          },
        ],
        productTypes: [
          {
            name: "Digital Product",
            attributes: [
              {
                name: "Format",
                inputType: "DROPDOWN",
                values: [{ name: "PDF" }, { name: "Video" }],
              },
            ],
          },
        ],
        categories: [
          {
            name: "Electronics",
            subcategories: [{ name: "Phones" }, { name: "Computers" }],
          },
        ],
      };

      mockServices.configuration!.retrieve = vi.fn().mockResolvedValue(complexConfig);

      // Act
      const result = await configurator.introspect();

      // Assert
      expect(result).toEqual(complexConfig);
    });
  });
});
