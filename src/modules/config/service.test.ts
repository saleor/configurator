import { describe, it, expect, vi } from "vitest";
import { ConfigurationService } from "./service";
import type { ConfigurationOperations, RawSaleorConfig } from "./repository";
import type { SaleorConfig } from "./schema";
import { YamlConfigurationManager } from "./yaml-manager";

const mockRawShopData: RawSaleorConfig["shop"] = {
  defaultMailSenderName: "Test Store",
  defaultMailSenderAddress: "test@example.com",
  displayGrossPrices: false,
  enableAccountConfirmationByEmail: false,
  limitQuantityPerCheckout: 10,
  trackInventoryByDefault: false,
  reserveStockDurationAnonymousUser: 60,
  reserveStockDurationAuthenticatedUser: 60,
  defaultDigitalMaxDownloads: 10,
  defaultDigitalUrlValidDays: 10,
  defaultWeightUnit: "KG" as const,
  allowLoginWithoutConfirmation: false,
  companyAddress: {
    streetAddress1: "123 Main St",
    streetAddress2: "Suite 101",
    city: "San Francisco",
    cityArea: "Downtown",
    postalCode: "94105",
    country: { code: "US" },
    countryArea: "CA",
    companyName: "Saleor Commerce",
    phone: "+1 234 567 8901",
  },
};

const mockMappedShopData: SaleorConfig["shop"] = {
  defaultMailSenderName: "Test Store",
  defaultMailSenderAddress: "test@example.com",
  displayGrossPrices: false,
  enableAccountConfirmationByEmail: false,
  limitQuantityPerCheckout: 10,
  trackInventoryByDefault: false,
  reserveStockDurationAnonymousUser: 60,
  reserveStockDurationAuthenticatedUser: 60,
  defaultDigitalMaxDownloads: 10,
  defaultDigitalUrlValidDays: 10,
  defaultWeightUnit: "KG" as const,
  allowLoginWithoutConfirmation: false,
  companyAddress: {
    streetAddress1: "123 Main St",
    streetAddress2: "Suite 101",
    city: "San Francisco",
    cityArea: "Downtown",
    postalCode: "94105",
    country: {
      code: "US",
    },
    countryArea: "CA",
    companyName: "Saleor Commerce",
    phone: "+1 234 567 8901",
  },
};

class MockRepository implements ConfigurationOperations {
  constructor(private mockData: RawSaleorConfig) {}

  async fetchConfig(): Promise<RawSaleorConfig> {
    return this.mockData;
  }
}

describe("ConfigurationService", () => {
  describe("retrieve method", () => {
    it("should fetch, map and save configuration", async () => {
      const mockRawConfig: RawSaleorConfig = {
        shop: mockRawShopData,
        channels: [],
        productTypes: { edges: [] },
        pageTypes: { edges: [] },
        attributes: { edges: [] },
      };

      const repository = new MockRepository(mockRawConfig);
      const storage = new YamlConfigurationManager();
      storage.save = vi.fn().mockResolvedValue(undefined);
      storage.load = vi.fn().mockResolvedValue({} as SaleorConfig);

      const service = new ConfigurationService(repository, storage);
      const result = await service.retrieve();

      expect(result.shop).toEqual(mockMappedShopData);
      expect(result.channels).toEqual([]);
      expect(result.productTypes).toEqual([]);
      expect(result.pageTypes).toEqual([]);
      expect(result.attributes).toEqual([]);
      expect(storage.save).toHaveBeenCalledWith(result);
    });

    it("should propagate errors from repository", async () => {
      const repository = {
        fetchConfig: vi.fn().mockRejectedValue(new Error("Fetch failed")),
      };
      const storage = new YamlConfigurationManager();
      storage.save = vi.fn().mockResolvedValue(undefined);

      const service = new ConfigurationService(repository, storage);

      await expect(service.retrieve()).rejects.toThrow("Fetch failed");
      expect(storage.save).not.toHaveBeenCalled();
    });

    it("should propagate errors from storage", async () => {
      const mockRawConfig: RawSaleorConfig = {
        shop: mockRawShopData,
        channels: [],
        productTypes: { edges: [] },
        pageTypes: { edges: [] },
        attributes: { edges: [] },
      };

      const repository = new MockRepository(mockRawConfig);
      const storage = new YamlConfigurationManager();
      storage.save = vi.fn().mockRejectedValue(new Error("Save failed"));

      const service = new ConfigurationService(repository, storage);

      await expect(service.retrieve()).rejects.toThrow("Save failed");
    });
  });

  describe("mapConfig method", () => {
    it("should handle empty raw config", () => {
      const emptyConfig: RawSaleorConfig = {
        shop: mockRawShopData,
        channels: [],
        productTypes: { edges: [] },
        pageTypes: { edges: [] },
        attributes: { edges: [] },
      };

      const service = new ConfigurationService(new MockRepository(emptyConfig));
      const result = service.mapConfig(emptyConfig);

      expect(result).toEqual({
        shop: mockMappedShopData,
        channels: [],
        productTypes: [],
        pageTypes: [],
        attributes: [],
      });
    });

    it("should map complete raw config", () => {
      const completeConfig: RawSaleorConfig = {
        shop: {
          ...mockRawShopData,
          companyAddress: {
            streetAddress1: "123 Test St",
            streetAddress2: "Suite 100",
            city: "Test City",
            cityArea: "Test Area",
            postalCode: "12345",
            country: { code: "US" },
            countryArea: "Test State",
            companyName: "Test Company",
            phone: "123-456-7890",
          },
        },
        channels: [
          {
            id: "channel-1",
            name: "Default Channel",
            currencyCode: "USD",
            defaultCountry: { code: "US" },
            slug: "default-channel",
            checkoutSettings: {
              useLegacyErrorFlow: false,
              automaticallyCompleteFullyPaidCheckouts: true,
            },
            paymentSettings: {
              defaultTransactionFlowStrategy: "CHARGE",
            },
            stockSettings: {
              allocationStrategy: "PRIORITIZE_SORTING_ORDER",
            },
            orderSettings: {
              automaticallyConfirmAllNewOrders: true,
              automaticallyFulfillNonShippableGiftCard: true,
              expireOrdersAfter: "30",
              deleteExpiredOrdersAfter: "60",
              markAsPaidStrategy: "PAYMENT_FLOW",
              allowUnpaidOrders: false,
              includeDraftOrderInVoucherUsage: false,
            },
          },
        ],
        productTypes: {
          edges: [
            {
              node: {
                id: "product-type-1",
                name: "Test Product Type",
                productAttributes: [
                  {
                    id: "attr-1",
                    name: "Color",
                    type: "PRODUCT_TYPE",
                    inputType: "DROPDOWN",
                    choices: {
                      edges: [
                        { node: { name: "Red" } },
                        { node: { name: "Blue" } },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
        pageTypes: {
          edges: [
            {
              node: {
                id: "page-type-1",
                name: "Test Page Type",
                attributes: [
                  {
                    id: "attr-2",
                    name: "Layout",
                    type: "PAGE_TYPE",
                    inputType: "DROPDOWN",
                    choices: {
                      edges: [
                        { node: { name: "Full Width" } },
                        { node: { name: "Sidebar" } },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
        attributes: { edges: [] },
      };

      const service = new ConfigurationService(
        new MockRepository(completeConfig)
      );
      const result = service.mapConfig(completeConfig);

      expect(result.shop?.defaultMailSenderName).toBe("Test Store");
      expect(result.channels?.[0]?.name).toBe("Default Channel");
      expect(result.productTypes?.[0]?.attributes).toHaveLength(1);
      expect(result.pageTypes?.[0]?.attributes).toHaveLength(1);
    });

    it("should handle different attribute input types", () => {
      const rawConfig: RawSaleorConfig = {
        shop: mockRawShopData,
        channels: [],
        productTypes: {
          edges: [
            {
              node: {
                id: "product-type-1",
                name: "Test Type",
                productAttributes: [
                  {
                    id: "attr-1",
                    name: "Color",
                    type: "PRODUCT_TYPE",
                    inputType: "DROPDOWN",
                    choices: {
                      edges: [{ node: { name: "Red" } }],
                    },
                  },
                  {
                    id: "attr-2",
                    name: "Size",
                    type: "PRODUCT_TYPE",
                    inputType: "PLAIN_TEXT",
                    choices: null,
                  },
                ],
              },
            },
          ],
        },
        pageTypes: { edges: [] },
        attributes: { edges: [] },
      };

      const service = new ConfigurationService(new MockRepository(rawConfig));
      const result = service.mapConfig(rawConfig);
      const attributes = result.productTypes?.[0]?.attributes;

      expect(attributes).toBeDefined();
      expect(attributes).toHaveLength(2);
      expect(attributes?.[0]).toHaveProperty("values");
      expect(attributes?.[1]).not.toHaveProperty("values");
    });
  });

  describe("createDefault", () => {
    it("should create instance with correct dependencies", () => {
      const mockClient = {} as any;
      const service = ConfigurationService.createDefault(mockClient);

      expect(service).toBeInstanceOf(ConfigurationService);
      expect(service.retrieve).toBeInstanceOf(Function);
      expect(service.mapConfig).toBeInstanceOf(Function);
    });
  });
});
