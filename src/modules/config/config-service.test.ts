import { describe, expect, it, vi } from "vitest";
import { ConfigurationService } from "./config-service";
import type { ConfigurationOperations, RawSaleorConfig } from "./repository";
import type { ProductInput, SaleorConfig } from "./schema/schema";

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

  describe("mapProducts", () => {
    it("should map product media into external URL entries", () => {
      const service = new ConfigurationService(
        { fetchConfig: vi.fn() } as unknown as ConfigurationOperations,
        createMockStorage()
      );

      const edges = [
        {
          node: {
            id: "prod-1",
            name: "Poster",
            slug: "poster",
            description: null,
            productType: { id: "pt-1", name: "Posters" },
            category: { id: "cat-1", name: "Posters", slug: "posters" },
            taxClass: null,
            attributes: [],
            variants: [],
            channelListings: [],
            media: [
              {
                url: " https://store.saleor/thumbnail/XYZ/4096/ ",
                alt: " Hero Poster ",
                metadata: [
                  {
                    key: "configurator.externalUrl",
                    value: " https://cdn.example.com/poster.jpg ",
                  },
                  { key: "ignored", value: "value" },
                ],
              },
              {
                url: "  ",
                alt: "Whitespace URL",
              },
            ],
          },
        },
      ] as unknown as NonNullable<RawSaleorConfig["products"]>["edges"];

      const products = (service as any).mapProducts(edges) as ProductInput[];

      expect(products).toHaveLength(1);
      expect(products[0].media).toEqual([
        {
          externalUrl: "https://cdn.example.com/poster.jpg",
          alt: "Hero Poster",
        },
      ]);
    });

    it("should fallback to Saleor media URL when metadata is absent", () => {
      const service = new ConfigurationService(
        { fetchConfig: vi.fn() } as unknown as ConfigurationOperations,
        createMockStorage()
      );

      const media = (service as any).mapProductMedia([
        {
          url: " https://cdn.example.com/poster.jpg ",
          alt: " Poster alt ",
          metadata: null,
        },
      ]);

      expect(media).toEqual([
        {
          externalUrl: "https://cdn.example.com/poster.jpg",
          alt: "Poster alt",
        },
      ]);
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
        products: [],
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

    it("should handle different attribute input types", async () => {
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
                    choices: { edges: [] },
                  },
                  {
                    id: "attr-2",
                    name: "Size",
                    type: "PRODUCT_TYPE",
                    inputType: "PLAIN_TEXT",
                    choices: null,
                  },
                ],
                assignedVariantAttributes: [],
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
        attributes: {
          edges: [
            {
              node: {
                id: "attr-1",
                name: "Color",
                slug: "color",
                type: "PRODUCT_TYPE",
                inputType: "DROPDOWN",
                entityType: null,
                choices: { edges: [{ node: { id: "c1", name: "Red", value: "red" } }] },
              },
            },
            {
              node: {
                id: "attr-2",
                name: "Size",
                slug: "size",
                type: "PRODUCT_TYPE",
                inputType: "PLAIN_TEXT",
                entityType: null,
                choices: null,
              },
            },
          ],
        },
      };

      const service = new ConfigurationService(new MockRepository(rawConfig), createMockStorage());
      const result = await service.retrieveWithoutSaving();
      // All attribute definitions should live under top-level attributes
      expect(result.attributes).toBeDefined();
      expect(result.attributes).toHaveLength(2);
      // First is dropdown with values
      expect(result.attributes?.[0]).toHaveProperty("values");
      // Second is plain text without values
      expect(result.attributes?.[1]).not.toHaveProperty("values");
      // Product type attributes should become references
      const ptAttrs = result.productTypes?.[0]?.productAttributes as unknown[];
      expect(ptAttrs).toBeDefined();
      expect(ptAttrs?.length).toBe(2);
      expect(ptAttrs?.every((a) => typeof (a as any).attribute === "string")).toBe(true);
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

  describe("CXE-1197: SKU mapping preserves empty values", () => {
    it("should preserve empty SKU instead of defaulting to variant ID", () => {
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
        products: {
          edges: [
            {
              node: {
                id: "prod-123",
                name: "Test Product",
                slug: "test-product",
                description: null,
                productType: { id: "pt-1", name: "Book" },
                category: { id: "cat-1", name: "Fiction", slug: "fiction" },
                taxClass: null,
                attributes: [],
                variants: [
                  {
                    id: "variant-456",
                    name: "Test Variant",
                    sku: null, // Empty SKU
                    weight: null,
                    attributes: [],
                    channelListings: [],
                  },
                ],
                channelListings: [],
                media: [],
              },
            },
          ],
        },
      };

      const service = new ConfigurationService(new MockRepository(rawConfig), createMockStorage());
      const result = service.mapConfig(rawConfig);

      // SKU should be empty string, NOT the variant ID
      expect(result.products?.[0]?.variants?.[0]?.sku).toBe("");
      expect(result.products?.[0]?.variants?.[0]?.sku).not.toBe("variant-456");
    });

    it("should preserve actual SKU values when present", () => {
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
        products: {
          edges: [
            {
              node: {
                id: "prod-123",
                name: "Test Product",
                slug: "test-product",
                description: null,
                productType: { id: "pt-1", name: "Book" },
                category: { id: "cat-1", name: "Fiction", slug: "fiction" },
                taxClass: null,
                attributes: [],
                variants: [
                  {
                    id: "variant-456",
                    name: "Test Variant",
                    sku: "ACTUAL-SKU-123",
                    weight: null,
                    attributes: [],
                    channelListings: [],
                  },
                ],
                channelListings: [],
                media: [],
              },
            },
          ],
        },
      };

      const service = new ConfigurationService(new MockRepository(rawConfig), createMockStorage());
      const result = service.mapConfig(rawConfig);

      expect(result.products?.[0]?.variants?.[0]?.sku).toBe("ACTUAL-SKU-123");
    });
  });

  describe("CXE-1195: Product channel listing includes availability fields", () => {
    it("should map isAvailableForPurchase from raw config", () => {
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
        products: {
          edges: [
            {
              node: {
                id: "prod-123",
                name: "Test Product",
                slug: "test-product",
                description: null,
                productType: { id: "pt-1", name: "Book" },
                category: { id: "cat-1", name: "Fiction", slug: "fiction" },
                taxClass: null,
                attributes: [],
                variants: [],
                channelListings: [
                  {
                    id: "listing-1",
                    channel: { id: "ch-1", slug: "default-channel" },
                    isPublished: true,
                    publishedAt: "2024-01-01T00:00:00Z",
                    visibleInListings: true,
                    isAvailableForPurchase: true,
                    availableForPurchaseAt: "2024-01-15T00:00:00Z",
                  },
                ],
                media: [],
              },
            },
          ],
        },
      };

      const service = new ConfigurationService(new MockRepository(rawConfig), createMockStorage());
      const result = service.mapConfig(rawConfig);

      const channelListing = result.products?.[0]?.channelListings?.[0];
      expect(channelListing).toEqual(
        expect.objectContaining({
          isAvailableForPurchase: true,
          availableForPurchaseAt: "2024-01-15T00:00:00Z",
        })
      );
    });

    it("should handle missing availability fields gracefully", () => {
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
        products: {
          edges: [
            {
              node: {
                id: "prod-123",
                name: "Test Product",
                slug: "test-product",
                description: null,
                productType: { id: "pt-1", name: "Book" },
                category: { id: "cat-1", name: "Fiction", slug: "fiction" },
                taxClass: null,
                attributes: [],
                variants: [],
                channelListings: [
                  {
                    id: "listing-1",
                    channel: { id: "ch-1", slug: "default-channel" },
                    isPublished: true,
                    publishedAt: null,
                    visibleInListings: true,
                    // No isAvailableForPurchase or availableForPurchaseAt
                  },
                ],
                media: [],
              },
            },
          ],
        },
      };

      const service = new ConfigurationService(new MockRepository(rawConfig), createMockStorage());
      const result = service.mapConfig(rawConfig);

      const channelListing = result.products?.[0]?.channelListings?.[0];
      // Should not throw, fields should be undefined
      expect(channelListing?.isAvailableForPurchase).toBeUndefined();
      expect(channelListing?.availableForPurchaseAt).toBeUndefined();
    });
  });

  describe("CXE-1196: Menu URL type coercion", () => {
    it("should coerce valid URL strings and trim whitespace", () => {
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
        menus: {
          edges: [
            {
              node: {
                id: "menu-1",
                name: "Main Menu",
                slug: "main-menu",
                items: [
                  {
                    id: "item-1",
                    name: "External Link",
                    menu: { id: "menu-1" },
                    parent: null,
                    category: null,
                    collection: null,
                    page: null,
                    level: 0,
                    children: [],
                    url: "  https://example.com  ", // With whitespace
                  },
                ],
              },
            },
          ],
        },
      };

      const service = new ConfigurationService(new MockRepository(rawConfig), createMockStorage());
      const result = service.mapConfig(rawConfig);

      expect(result.menus?.[0]?.items?.[0]?.url).toBe("https://example.com");
    });

    it("should set URL to undefined when not a string", () => {
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
        menus: {
          edges: [
            {
              node: {
                id: "menu-1",
                name: "Main Menu",
                slug: "main-menu",
                items: [
                  {
                    id: "item-1",
                    name: "Category Link",
                    menu: { id: "menu-1" },
                    parent: null,
                    category: { id: "cat-1", slug: "category", name: "Category" },
                    collection: null,
                    page: null,
                    level: 0,
                    children: [],
                    url: null, // null value
                  },
                ],
              },
            },
          ],
        },
      };

      const service = new ConfigurationService(new MockRepository(rawConfig), createMockStorage());
      const result = service.mapConfig(rawConfig);

      expect(result.menus?.[0]?.items?.[0]?.url).toBeUndefined();
    });

    it("should set URL to undefined when string is only whitespace", () => {
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
        menus: {
          edges: [
            {
              node: {
                id: "menu-1",
                name: "Main Menu",
                slug: "main-menu",
                items: [
                  {
                    id: "item-1",
                    name: "Empty URL",
                    menu: { id: "menu-1" },
                    parent: null,
                    category: null,
                    collection: null,
                    page: null,
                    level: 0,
                    children: [],
                    url: "   ", // Only whitespace
                  },
                ],
              },
            },
          ],
        },
      };

      const service = new ConfigurationService(new MockRepository(rawConfig), createMockStorage());
      const result = service.mapConfig(rawConfig);

      expect(result.menus?.[0]?.items?.[0]?.url).toBeUndefined();
    });

    it("should apply same coercion to child menu items", () => {
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
        menus: {
          edges: [
            {
              node: {
                id: "menu-1",
                name: "Main Menu",
                slug: "main-menu",
                items: [
                  {
                    id: "item-1",
                    name: "Parent",
                    menu: { id: "menu-1" },
                    parent: null,
                    category: null,
                    collection: null,
                    page: null,
                    level: 0,
                    children: [
                      {
                        id: "child-1",
                        name: "Child Link",
                        url: "  https://child.example.com  ",
                        category: null,
                        collection: null,
                        page: null,
                      },
                    ],
                    url: null,
                  },
                ],
              },
            },
          ],
        },
      };

      const service = new ConfigurationService(new MockRepository(rawConfig), createMockStorage());
      const result = service.mapConfig(rawConfig);

      expect(result.menus?.[0]?.items?.[0]?.children?.[0]?.url).toBe("https://child.example.com");
    });
  });
});
