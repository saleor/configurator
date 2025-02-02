import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ConfigurationRetriever,
  DefaultConfigurationMapper,
  type ConfigurationFetcher,
  type ConfigurationMapper,
} from "./configuration-retriever";
import type { RawSaleorConfig } from "./retriever-client";
import type { SaleorConfig } from "../config-schema";
import type { ConfigurationStorage } from "../yaml-configuration-manager";

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

class MockFetcher implements ConfigurationFetcher {
  constructor(private mockData: RawSaleorConfig) {}

  async fetchConfig(): Promise<RawSaleorConfig> {
    return this.mockData;
  }
}

class MockMapper implements ConfigurationMapper {
  mapConfig(rawConfig: RawSaleorConfig): SaleorConfig {
    return {
      shop: mockMappedShopData,
      channels: [],
      productTypes: [],
      pageTypes: [],
      attributes: [],
    };
  }
}

class MockStorage implements ConfigurationStorage {
  save = vi.fn().mockResolvedValue(undefined);
  load = vi.fn().mockResolvedValue({} as SaleorConfig);
}

describe("ConfigurationRetriever", () => {
  describe("retrieve method", () => {
    it("should fetch, map and save configuration", async () => {
      const mockRawConfig: RawSaleorConfig = {
        shop: mockRawShopData,
        channels: [],
        productTypes: { edges: [] },
        pageTypes: { edges: [] },
        attributes: { edges: [] },
      };

      const fetcher = new MockFetcher(mockRawConfig);
      const mapper = new MockMapper();
      const storage = new MockStorage();

      const retriever = new ConfigurationRetriever(fetcher, mapper, storage);

      const result = await retriever.retrieve();

      expect(result).toEqual({
        shop: mockMappedShopData,
        channels: [],
        productTypes: [],
        pageTypes: [],
        attributes: [],
      });
      expect(storage.save).toHaveBeenCalledWith(result);
    });

    it("should propagate errors from fetcher", async () => {
      const fetcher = {
        fetchConfig: vi.fn().mockRejectedValue(new Error("Fetch failed")),
      };
      const mapper = new MockMapper();
      const storage = new MockStorage();

      const retriever = new ConfigurationRetriever(fetcher, mapper, storage);

      await expect(retriever.retrieve()).rejects.toThrow("Fetch failed");
      expect(storage.save).not.toHaveBeenCalled();
    });

    it("should propagate errors from mapper", async () => {
      const mockRawConfig: RawSaleorConfig = {
        shop: mockRawShopData,
        channels: [],
        productTypes: { edges: [] },
        pageTypes: { edges: [] },
        attributes: { edges: [] },
      };

      const fetcher = new MockFetcher(mockRawConfig);
      const mapper = {
        mapConfig: vi.fn().mockImplementation(() => {
          throw new Error("Mapping failed");
        }),
      };
      const storage = new MockStorage();

      const retriever = new ConfigurationRetriever(fetcher, mapper, storage);

      await expect(retriever.retrieve()).rejects.toThrow("Mapping failed");
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

      const fetcher = new MockFetcher(mockRawConfig);
      const mapper = new MockMapper();
      const storage = {
        save: vi.fn().mockRejectedValue(new Error("Save failed")),
        load: vi.fn().mockResolvedValue({} as SaleorConfig),
      };

      const retriever = new ConfigurationRetriever(fetcher, mapper, storage);

      await expect(retriever.retrieve()).rejects.toThrow("Save failed");
    });
  });

  describe("createDefault", () => {
    it("should create instance with correct dependencies", () => {
      const mockClient = {} as any;
      const retriever = ConfigurationRetriever.createDefault(mockClient);

      expect(retriever).toBeInstanceOf(ConfigurationRetriever);
      // We can't easily test private fields, but we can verify it's properly constructed
      expect(retriever.retrieve).toBeInstanceOf(Function);
    });
  });
});

describe("DefaultConfigurationMapper", () => {
  let mapper: DefaultConfigurationMapper;

  beforeEach(() => {
    mapper = new DefaultConfigurationMapper();
  });

  describe("mapConfig", () => {
    it("should handle empty raw config", () => {
      const emptyConfig: RawSaleorConfig = {
        shop: mockRawShopData,
        channels: [],
        productTypes: { edges: [] },
        pageTypes: { edges: [] },
        attributes: { edges: [] },
      };

      const result = mapper.mapConfig(emptyConfig);

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

      const result = mapper.mapConfig(completeConfig);

      expect(result.shop?.defaultMailSenderName).toBe("Test Store");
      expect(result.channels?.[0]?.name).toBe("Default Channel");
      expect(result.productTypes?.[0]?.attributes).toHaveLength(1);
      expect(result.pageTypes?.[0]?.attributes).toHaveLength(1);
    });
  });

  describe("attribute mapping", () => {
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

      const result = mapper.mapConfig(rawConfig);
      const attributes = result.productTypes?.[0]?.attributes;

      expect(attributes).toBeDefined();
      expect(attributes).toHaveLength(2);
      expect(attributes?.[0]).toHaveProperty("values");
      expect(attributes?.[1]).not.toHaveProperty("values");
    });
  });
});
