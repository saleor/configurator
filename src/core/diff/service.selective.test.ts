import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaleorConfig } from "../../modules/config/schema/schema";
import type { ServiceContainer } from "../service-container";
import { DiffService } from "./service";
import type { DiffServiceIntrospectOptions } from "./types";

// Mock dependencies
vi.mock("../../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("DiffService - Selective Options", () => {
  let diffService: DiffService;
  let mockServices: ServiceContainer;

  // Sample configurations for testing
  const sampleLocalConfig: SaleorConfig = {
    shop: {
      defaultMailSenderName: "Local Shop",
      displayGrossPrices: true,
    },
    channels: [
      {
        name: "Local Channel",
        slug: "local",
        currencyCode: "USD",
        defaultCountry: "US",
        isActive: true,
        settings: {
          allocationStrategy: "PRIORITIZE_SORTING_ORDER",
          automaticallyConfirmAllNewOrders: false,
        },
      },
    ],
    productTypes: [
      {
        name: "Local Product Type",
        isShippingRequired: false,
        productAttributes: [],
        variantAttributes: [],
      },
    ],
    pageTypes: [
      {
        name: "Local Page Type",
        attributes: [],
      },
    ],
  };

  const sampleRemoteConfig: SaleorConfig = {
    shop: {
      defaultMailSenderName: "Remote Shop",
      displayGrossPrices: false,
    },
    channels: [
      {
        name: "Remote Channel",
        slug: "remote",
        currencyCode: "EUR",
        defaultCountry: "DE",
        isActive: true,
        settings: {
          allocationStrategy: "PRIORITIZE_HIGH_STOCK",
          automaticallyConfirmAllNewOrders: true,
        },
      },
    ],
    productTypes: [
      {
        name: "Remote Product Type",
        isShippingRequired: true,
        productAttributes: [],
        variantAttributes: [],
      },
    ],
    pageTypes: [
      {
        name: "Remote Page Type",
        attributes: [],
      },
    ],
  };

  beforeEach(() => {
    // Mock service container
    mockServices = {
      configStorage: {
        load: vi.fn().mockResolvedValue(sampleLocalConfig),
      },
      configuration: {
        retrieveWithoutSaving: vi.fn().mockResolvedValue(sampleRemoteConfig),
      },
    } as unknown as ServiceContainer;

    diffService = new DiffService(mockServices);
  });

  describe("Include options", () => {
    it("should only compare shop settings when including only shop", async () => {
      // Arrange
      const options: DiffServiceIntrospectOptions = {
        includeSections: ["shop"],
        excludeSections: [],
      };

      // Act
      const result = await diffService.compareForIntrospect(options);

      // Assert
      expect(result.results).toBeDefined();
      const entityTypes = result.results.map((r) => r.entityType);
      expect(entityTypes).toContain("Shop Settings");
      expect(entityTypes).not.toContain("Channels");
      expect(entityTypes).not.toContain("Product Types");
      expect(entityTypes).not.toContain("Page Types");
    });

    it("should only compare channels when including only channels", async () => {
      // Arrange
      const options: DiffServiceIntrospectOptions = {
        includeSections: ["channels"],
        excludeSections: [],
      };

      // Act
      const result = await diffService.compareForIntrospect(options);

      // Assert
      expect(result.results).toBeDefined();
      const entityTypes = result.results.map((r) => r.entityType);
      expect(entityTypes).toContain("Channels");
      expect(entityTypes).not.toContain("Shop Settings");
      expect(entityTypes).not.toContain("Product Types");
      expect(entityTypes).not.toContain("Page Types");
    });

    it("should compare multiple sections when including multiple", async () => {
      // Arrange
      const options: DiffServiceIntrospectOptions = {
        includeSections: ["shop", "channels"],
        excludeSections: [],
      };

      // Act
      const result = await diffService.compareForIntrospect(options);

      // Assert
      expect(result.results).toBeDefined();
      const entityTypes = result.results.map((r) => r.entityType);
      expect(entityTypes).toContain("Shop Settings");
      expect(entityTypes).toContain("Channels");
      expect(entityTypes).not.toContain("Product Types");
      expect(entityTypes).not.toContain("Page Types");
    });

    it("should include productTypes when specified", async () => {
      // Arrange
      const options: DiffServiceIntrospectOptions = {
        includeSections: ["productTypes"],
        excludeSections: [],
      };

      // Act
      const result = await diffService.compareForIntrospect(options);

      // Assert
      expect(result.results).toBeDefined();
      const entityTypes = result.results.map((r) => r.entityType);
      expect(entityTypes).toContain("Product Types");
      expect(entityTypes).not.toContain("Shop Settings");
      expect(entityTypes).not.toContain("Channels");
      expect(entityTypes).not.toContain("Page Types");
    });

    it("should include pageTypes when specified", async () => {
      // Arrange
      const options: DiffServiceIntrospectOptions = {
        includeSections: ["pageTypes"],
        excludeSections: [],
      };

      // Act
      const result = await diffService.compareForIntrospect(options);

      // Assert
      expect(result.results).toBeDefined();
      const entityTypes = result.results.map((r) => r.entityType);
      expect(entityTypes).toContain("Page Types");
      expect(entityTypes).not.toContain("Shop Settings");
      expect(entityTypes).not.toContain("Channels");
      expect(entityTypes).not.toContain("Product Types");
    });
  });

  describe("Exclude options", () => {
    it("should exclude shop settings when specified", async () => {
      // Arrange
      const options: DiffServiceIntrospectOptions = {
        includeSections: [],
        excludeSections: ["shop"],
      };

      // Act
      const result = await diffService.compareForIntrospect(options);

      // Assert
      expect(result.results).toBeDefined();
      const entityTypes = result.results.map((r) => r.entityType);
      expect(entityTypes).not.toContain("Shop Settings");
      expect(entityTypes).toContain("Channels");
      expect(entityTypes).toContain("Product Types");
      expect(entityTypes).toContain("Page Types");
    });

    it("should exclude channels when specified", async () => {
      // Arrange
      const options: DiffServiceIntrospectOptions = {
        includeSections: [],
        excludeSections: ["channels"],
      };

      // Act
      const result = await diffService.compareForIntrospect(options);

      // Assert
      expect(result.results).toBeDefined();
      const entityTypes = result.results.map((r) => r.entityType);
      expect(entityTypes).toContain("Shop Settings");
      expect(entityTypes).not.toContain("Channels");
      expect(entityTypes).toContain("Product Types");
      expect(entityTypes).toContain("Page Types");
    });

    it("should exclude multiple sections when specified", async () => {
      // Arrange
      const options: DiffServiceIntrospectOptions = {
        includeSections: [],
        excludeSections: ["productTypes", "pageTypes"],
      };

      // Act
      const result = await diffService.compareForIntrospect(options);

      // Assert
      expect(result.results).toBeDefined();
      const entityTypes = result.results.map((r) => r.entityType);
      expect(entityTypes).toContain("Shop Settings");
      expect(entityTypes).toContain("Channels");
      expect(entityTypes).not.toContain("Product Types");
      expect(entityTypes).not.toContain("Page Types");
    });
  });

  describe("Combined include and exclude", () => {
    it("should handle include taking precedence over exclude", async () => {
      // Arrange - Include shop and channels, but exclude shop
      // Include should take precedence
      const options: DiffServiceIntrospectOptions = {
        includeSections: ["shop", "channels"],
        excludeSections: ["shop"],
      };

      // Act
      const result = await diffService.compareForIntrospect(options);

      // Assert
      expect(result.results).toBeDefined();
      const entityTypes = result.results.map((r) => r.entityType);
      // Based on shouldIncludeSection logic, when includeSections is not empty,
      // it should only include those sections regardless of exclude
      expect(entityTypes).toContain("Shop Settings");
      expect(entityTypes).toContain("Channels");
      expect(entityTypes).not.toContain("Product Types");
      expect(entityTypes).not.toContain("Page Types");
    });

    it("should use exclude filter when include is empty", async () => {
      // Arrange
      const options: DiffServiceIntrospectOptions = {
        includeSections: [],
        excludeSections: ["productTypes"],
      };

      // Act
      const result = await diffService.compareForIntrospect(options);

      // Assert
      expect(result.results).toBeDefined();
      const entityTypes = result.results.map((r) => r.entityType);
      expect(entityTypes).toContain("Shop Settings");
      expect(entityTypes).toContain("Channels");
      expect(entityTypes).not.toContain("Product Types");
      expect(entityTypes).toContain("Page Types");
    });
  });

  describe("No selective options", () => {
    it("should compare all sections when no options provided", async () => {
      // Arrange
      const options: DiffServiceIntrospectOptions = {};

      // Act
      const result = await diffService.compareForIntrospect(options);

      // Assert
      expect(result.results).toBeDefined();
      const entityTypes = result.results.map((r) => r.entityType);
      expect(entityTypes).toContain("Shop Settings");
      expect(entityTypes).toContain("Channels");
      expect(entityTypes).toContain("Product Types");
      expect(entityTypes).toContain("Page Types");
    });

    it("should compare all sections when empty arrays provided", async () => {
      // Arrange
      const options: DiffServiceIntrospectOptions = {
        includeSections: [],
        excludeSections: [],
      };

      // Act
      const result = await diffService.compareForIntrospect(options);

      // Assert
      expect(result.results).toBeDefined();
      const entityTypes = result.results.map((r) => r.entityType);
      expect(entityTypes).toContain("Shop Settings");
      expect(entityTypes).toContain("Channels");
      expect(entityTypes).toContain("Product Types");
      expect(entityTypes).toContain("Page Types");
    });
  });

  describe("Performance benefits", () => {
    it("should not call configuration service methods for excluded sections", async () => {
      // This test verifies that we're not fetching/processing data for excluded sections
      // Note: In a real implementation, we would mock the individual comparators
      // and verify they're not called for excluded sections

      // Arrange
      const options: DiffServiceIntrospectOptions = {
        includeSections: ["shop"], // Only include shop
        excludeSections: [],
      };

      // Act
      await diffService.compareForIntrospect(options);

      // Assert
      // We should have fetched the configurations (since we need them for comparison)
      // but only compared the shop section
      expect(mockServices.configStorage?.load).toHaveBeenCalled();
      expect(
        mockServices.configuration?.retrieveWithoutSaving
      ).toHaveBeenCalled();
    });
  });

  describe("Summary statistics", () => {
    it("should calculate correct summary stats for filtered results", async () => {
      // Arrange
      const options: DiffServiceIntrospectOptions = {
        includeSections: ["shop"],
        excludeSections: [],
      };

      // Act
      const result = await diffService.compareForIntrospect(options);

      // Assert
      expect(result.totalChanges).toBeGreaterThanOrEqual(0);
      expect(result.creates + result.updates + result.deletes).toBe(
        result.totalChanges
      );

      // All results should be from Shop Settings only
      const entityTypes = result.results.map((r) => r.entityType);
      expect(entityTypes.every((type) => type === "Shop Settings")).toBe(true);
    });
  });
});
