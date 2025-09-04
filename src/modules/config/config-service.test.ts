import { describe, expect, it, vi } from "vitest";
import { ConfigurationService } from "./config-service";
import type { ConfigurationOperations, RawSaleorConfig } from "./repository";
import type { SaleorConfig } from "./schema/schema";

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
};

class MockRepository implements ConfigurationOperations {
  constructor(private mockData: RawSaleorConfig) {}

  async fetchConfig(): Promise<RawSaleorConfig> {
    return this.mockData;
  }
}

const createMockStorage = () => ({
  save: vi.fn().mockResolvedValue(undefined),
  load: vi.fn().mockResolvedValue({} as SaleorConfig),
});

describe("ConfigurationService", () => {
  describe("retrieve method", () => {
    it("should fetch, map and save configuration", async () => {
      const mockRawConfig: RawSaleorConfig = {
        shop: mockRawShopData,
        channels: [],
        productTypes: { edges: [] },
        pageTypes: { edges: [] },
        categories: { edges: [] },
        warehouses: { edges: [] },
        shippingZones: { edges: [] },
        taxClasses: { edges: [] },
        collections: { edges: [] },
        pages: { edges: [] },
        menus: { edges: [] },
      };

      const repository = new MockRepository(mockRawConfig);
      const storage = createMockStorage();

      const service = new ConfigurationService(repository, storage);
      const result = await service.retrieve();

      expect(result.shop).toEqual(mockMappedShopData);
      expect(result.channels).toEqual([]);
      expect(result.productTypes).toEqual([]);
      expect(result.pageTypes).toEqual([]);
      expect(storage.save).toHaveBeenCalledWith(result);
    });

    it("should propagate errors from repository", async () => {
      const repository = {
        fetchConfig: vi.fn().mockRejectedValue(new Error("Fetch failed")),
      };
      const storage = createMockStorage();

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
        categories: { edges: [] },
        warehouses: { edges: [] },
        shippingZones: { edges: [] },
        taxClasses: { edges: [] },
        collections: { edges: [] },
        pages: { edges: [] },
        menus: { edges: [] },
      };

      const repository = new MockRepository(mockRawConfig);
      const storage = createMockStorage();
      storage.save.mockRejectedValue(new Error("Save failed"));

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
        categories: { edges: [] },
        warehouses: { edges: [] },
        shippingZones: { edges: [] },
        taxClasses: { edges: [] },
        collections: { edges: [] },
        pages: { edges: [] },
        menus: { edges: [] },
      };

      const service = new ConfigurationService(
        new MockRepository(emptyConfig),
        createMockStorage()
      );
      const result = service.mapConfig(emptyConfig);

      expect(result).toEqual({
        shop: mockMappedShopData,
        channels: [],
        productTypes: [],
        pageTypes: [],
        modelTypes: [],
        categories: [],
        warehouses: [],
        shippingZones: [],
        taxClasses: [],
        collections: [],
        models: [],
        menus: [],
      });
    });

    it("should map complete raw config", () => {
      const completeConfig: RawSaleorConfig = {
        shop: {
          ...mockRawShopData,
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
                isShippingRequired: false,
                productAttributes: [
                  {
                    id: "attr-1",
                    name: "Color",
                    type: "PRODUCT_TYPE",
                    inputType: "DROPDOWN",
                    choices: {
                      edges: [{ node: { name: "Red" } }, { node: { name: "Blue" } }],
                    },
                  },
                ],
                assignedVariantAttributes: [
                  {
                    attribute: {
                      id: "attr-2",
                      name: "Size",
                      type: "PRODUCT_TYPE",
                      inputType: "PLAIN_TEXT",
                      choices: null,
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
                      edges: [{ node: { name: "Full Width" } }, { node: { name: "Sidebar" } }],
                    },
                  },
                ],
              },
            },
          ],
        },
        categories: { edges: [] },
        warehouses: { edges: [] },
        shippingZones: { edges: [] },
        taxClasses: { edges: [] },
        collections: { edges: [] },
        pages: { edges: [] },
        menus: { edges: [] },
      };

      const service = new ConfigurationService(
        new MockRepository(completeConfig),
        createMockStorage()
      );
      const result = service.mapConfig(completeConfig);

      expect(
        (result.shop as unknown as { defaultMailSenderName: string })?.defaultMailSenderName
      ).toBe("Test Store");
      expect(result.channels?.[0]?.name).toBe("Default Channel");
      expect(
        (
          result.productTypes?.[0] as unknown as {
            productAttributes: unknown[];
          }
        )?.productAttributes
      ).toHaveLength(1);
      expect(
        (result.pageTypes?.[0] as unknown as { attributes: unknown[] })?.attributes
      ).toHaveLength(1);
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
                isShippingRequired: false,
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
                assignedVariantAttributes: [
                  {
                    attribute: {
                      id: "attr-3",
                      name: "Size",
                      type: "PRODUCT_TYPE",
                      inputType: "PLAIN_TEXT",
                      choices: null,
                    },
                  },
                ],
              },
            },
          ],
        },
        pageTypes: { edges: [] },
        categories: { edges: [] },
        warehouses: { edges: [] },
        shippingZones: { edges: [] },
        taxClasses: { edges: [] },
        collections: { edges: [] },
        pages: { edges: [] },
        menus: { edges: [] },
      };

      const service = new ConfigurationService(new MockRepository(rawConfig), createMockStorage());
      const result = service.mapConfig(rawConfig);
      const attributes = result.productTypes?.[0]?.productAttributes;
      console.log(result.productTypes?.[0]);

      expect(attributes).toBeDefined();
      expect(attributes).toHaveLength(2);
      expect(attributes?.[0]).toHaveProperty("values");
      expect(attributes?.[1]).not.toHaveProperty("values");
    });
  });

  describe("createDefault", () => {
    it("should create instance with correct dependencies", () => {
      const service = new ConfigurationService(
        new MockRepository({} as RawSaleorConfig),
        createMockStorage()
      );

      expect(service).toBeInstanceOf(ConfigurationService);
      expect(service.retrieve).toBeInstanceOf(Function);
      expect(service.mapConfig).toBeInstanceOf(Function);
    });
  });

  describe("mapCategories - nested category support", () => {
    it("should map flat categories correctly", () => {
      const rawConfig: RawSaleorConfig = {
        shop: mockRawShopData,
        channels: [],
        productTypes: { edges: [] },
        pageTypes: { edges: [] },
        categories: {
          edges: [
            {
              node: {
                id: "1",
                name: "Electronics",
                slug: "electronics",
                level: 0,
                parent: null,
              },
            },
            {
              node: {
                id: "2",
                name: "Clothing",
                slug: "clothing",
                level: 0,
                parent: null,
              },
            },
          ],
        },
        warehouses: { edges: [] },
        shippingZones: { edges: [] },
        taxClasses: { edges: [] },
        collections: { edges: [] },
        pages: { edges: [] },
        menus: { edges: [] },
      };

      const service = new ConfigurationService(new MockRepository(rawConfig), createMockStorage());
      const result = service.mapConfig(rawConfig);

      expect(result.categories).toEqual([
        {
          name: "Electronics",
          slug: "electronics",
        },
        {
          name: "Clothing",
          slug: "clothing",
        },
      ]);
    });

    it("should build nested tree from flat list with parent references", () => {
      const rawConfig: RawSaleorConfig = {
        shop: mockRawShopData,
        channels: [],
        productTypes: { edges: [] },
        pageTypes: { edges: [] },
        categories: {
          edges: [
            {
              node: {
                id: "1",
                name: "Electronics",
                slug: "electronics",
                level: 0,
                parent: null,
              },
            },
            {
              node: {
                id: "2",
                name: "Laptops",
                slug: "laptops",
                level: 1,
                parent: { id: "1", slug: "electronics" },
              },
            },
            {
              node: {
                id: "3",
                name: "Gaming Laptops",
                slug: "gaming-laptops",
                level: 2,
                parent: { id: "2", slug: "laptops" },
              },
            },
          ],
        },
        warehouses: { edges: [] },
        shippingZones: { edges: [] },
        taxClasses: { edges: [] },
        collections: { edges: [] },
        pages: { edges: [] },
        menus: { edges: [] },
      };

      const service = new ConfigurationService(new MockRepository(rawConfig), createMockStorage());
      const result = service.mapConfig(rawConfig);

      expect(result.categories).toEqual([
        {
          name: "Electronics",
          slug: "electronics",
          subcategories: [
            {
              name: "Laptops",
              slug: "laptops",
              subcategories: [
                {
                  name: "Gaming Laptops",
                  slug: "gaming-laptops",
                },
              ],
            },
          ],
        },
      ]);
    });

    it("should handle categories in random order", () => {
      const rawConfig: RawSaleorConfig = {
        shop: mockRawShopData,
        channels: [],
        productTypes: { edges: [] },
        pageTypes: { edges: [] },
        categories: {
          edges: [
            // Child before parent
            {
              node: {
                id: "3",
                name: "Gaming Laptops",
                slug: "gaming-laptops",
                level: 2,
                parent: { id: "2", slug: "laptops" },
              },
            },
            {
              node: {
                id: "1",
                name: "Electronics",
                slug: "electronics",
                level: 0,
                parent: null,
              },
            },
            {
              node: {
                id: "2",
                name: "Laptops",
                slug: "laptops",
                level: 1,
                parent: { id: "1", slug: "electronics" },
              },
            },
          ],
        },
        warehouses: { edges: [] },
        shippingZones: { edges: [] },
        taxClasses: { edges: [] },
        collections: { edges: [] },
        pages: { edges: [] },
        menus: { edges: [] },
      };

      const service = new ConfigurationService(new MockRepository(rawConfig), createMockStorage());
      const result = service.mapConfig(rawConfig);

      expect(result.categories).toEqual([
        {
          name: "Electronics",
          slug: "electronics",
          subcategories: [
            {
              name: "Laptops",
              slug: "laptops",
              subcategories: [
                {
                  name: "Gaming Laptops",
                  slug: "gaming-laptops",
                },
              ],
            },
          ],
        },
      ]);
    });

    it("should handle multiple root categories with subcategories", () => {
      const rawConfig: RawSaleorConfig = {
        shop: mockRawShopData,
        channels: [],
        productTypes: { edges: [] },
        pageTypes: { edges: [] },
        categories: {
          edges: [
            {
              node: {
                id: "1",
                name: "Electronics",
                slug: "electronics",
                level: 0,
                parent: null,
              },
            },
            {
              node: {
                id: "2",
                name: "Laptops",
                slug: "laptops",
                level: 1,
                parent: { id: "1", slug: "electronics" },
              },
            },
            {
              node: {
                id: "3",
                name: "Clothing",
                slug: "clothing",
                level: 0,
                parent: null,
              },
            },
            {
              node: {
                id: "4",
                name: "Mens",
                slug: "mens",
                level: 1,
                parent: { id: "3", slug: "clothing" },
              },
            },
          ],
        },
        warehouses: { edges: [] },
        shippingZones: { edges: [] },
        taxClasses: { edges: [] },
        collections: { edges: [] },
        pages: { edges: [] },
        menus: { edges: [] },
      };

      const service = new ConfigurationService(new MockRepository(rawConfig), createMockStorage());
      const result = service.mapConfig(rawConfig);

      expect(result.categories).toEqual([
        {
          name: "Electronics",
          slug: "electronics",
          subcategories: [
            {
              name: "Laptops",
              slug: "laptops",
            },
          ],
        },
        {
          name: "Clothing",
          slug: "clothing",
          subcategories: [
            {
              name: "Mens",
              slug: "mens",
            },
          ],
        },
      ]);
    });

    it("should handle empty categories array", () => {
      const rawConfig: RawSaleorConfig = {
        shop: mockRawShopData,
        channels: [],
        productTypes: { edges: [] },
        pageTypes: { edges: [] },
        categories: { edges: [] },
        warehouses: { edges: [] },
        shippingZones: { edges: [] },
        taxClasses: { edges: [] },
        collections: { edges: [] },
        pages: { edges: [] },
        menus: { edges: [] },
      };

      const service = new ConfigurationService(new MockRepository(rawConfig), createMockStorage());
      const result = service.mapConfig(rawConfig);

      expect(result.categories).toEqual([]);
    });

    it("should handle null categories", () => {
      const rawConfig: RawSaleorConfig = {
        shop: mockRawShopData,
        channels: [],
        productTypes: { edges: [] },
        pageTypes: { edges: [] },
        categories: null,
        warehouses: { edges: [] },
        shippingZones: { edges: [] },
        taxClasses: { edges: [] },
        collections: { edges: [] },
        pages: { edges: [] },
        menus: { edges: [] },
      };

      const service = new ConfigurationService(new MockRepository(rawConfig), createMockStorage());
      const result = service.mapConfig(rawConfig);

      expect(result.categories).toEqual([]);
    });
  });
});
