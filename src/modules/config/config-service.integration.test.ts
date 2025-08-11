import { describe, expect, it, vi } from "vitest";
import { ConfigurationService } from "./config-service";
import type { ConfigurationOperations, RawSaleorConfig } from "./repository";
import type { ConfigurationStorage } from "./yaml-manager";

describe("ConfigurationService - Integration Test for Nested Categories", () => {
  it("should correctly handle complex nested category structure during introspection", async () => {
    // Simulate a real-world response from Saleor with nested categories
    const mockRawConfig: RawSaleorConfig = {
      shop: {
        name: "Test Shop",
        enableAccountConfirmationByEmail: false,
        defaultMailSenderName: "Test Shop",
        defaultMailSenderAddress: "shop@example.com",
        customerSetPasswordUrl: "https://example.com/reset",
      },
      channels: [
        {
          id: "1",
          name: "Default Channel",
          slug: "default-channel",
          isActive: true,
          currencyCode: "USD",
          defaultCountry: { code: "US" },
          checkoutSettings: {
            useLegacyErrorFlow: false,
            automaticallyCompleteFullyPaidCheckouts: true,
          },
          orderSettings: {
            automaticallyConfirmAllNewOrders: true,
            automaticallyFulfillNonShippableGiftCard: true,
            expireOrdersAfter: "30",
            deleteExpiredOrdersAfter: "30",
            markAsPaidStrategy: "PAYMENT_FLOW",
            allowUnpaidOrders: false,
            includeDraftOrderInVoucherUsage: false,
          },
          paymentSettings: {
            defaultTransactionFlowStrategy: "CHARGE",
          },
          stockSettings: {
            allocationStrategy: "PRIORITIZE_SORTING_ORDER",
          },
        },
      ],
      productTypes: null,
      pageTypes: null,
      categories: {
        edges: [
          // Root level categories
          {
            node: {
              id: "cat-1",
              name: "Electronics",
              slug: "electronics",
              level: 0,
              parent: null,
            },
          },
          {
            node: {
              id: "cat-2",
              name: "Clothing",
              slug: "clothing",
              level: 0,
              parent: null,
            },
          },
          // Second level categories
          {
            node: {
              id: "cat-3",
              name: "Computers",
              slug: "computers",
              level: 1,
              parent: {
                id: "cat-1",
                slug: "electronics",
              },
            },
          },
          {
            node: {
              id: "cat-4",
              name: "Mobile Devices",
              slug: "mobile-devices",
              level: 1,
              parent: {
                id: "cat-1",
                slug: "electronics",
              },
            },
          },
          {
            node: {
              id: "cat-5",
              name: "Men's Clothing",
              slug: "mens-clothing",
              level: 1,
              parent: {
                id: "cat-2",
                slug: "clothing",
              },
            },
          },
          {
            node: {
              id: "cat-6",
              name: "Women's Clothing",
              slug: "womens-clothing",
              level: 1,
              parent: {
                id: "cat-2",
                slug: "clothing",
              },
            },
          },
          // Third level categories
          {
            node: {
              id: "cat-7",
              name: "Laptops",
              slug: "laptops",
              level: 2,
              parent: {
                id: "cat-3",
                slug: "computers",
              },
            },
          },
          {
            node: {
              id: "cat-8",
              name: "Desktops",
              slug: "desktops",
              level: 2,
              parent: {
                id: "cat-3",
                slug: "computers",
              },
            },
          },
          {
            node: {
              id: "cat-9",
              name: "Smartphones",
              slug: "smartphones",
              level: 2,
              parent: {
                id: "cat-4",
                slug: "mobile-devices",
              },
            },
          },
          {
            node: {
              id: "cat-10",
              name: "Tablets",
              slug: "tablets",
              level: 2,
              parent: {
                id: "cat-4",
                slug: "mobile-devices",
              },
            },
          },
          // Fourth level categories (very deep nesting)
          {
            node: {
              id: "cat-11",
              name: "Gaming Laptops",
              slug: "gaming-laptops",
              level: 3,
              parent: {
                id: "cat-7",
                slug: "laptops",
              },
            },
          },
          {
            node: {
              id: "cat-12",
              name: "Business Laptops",
              slug: "business-laptops",
              level: 3,
              parent: {
                id: "cat-7",
                slug: "laptops",
              },
            },
          },
          {
            node: {
              id: "cat-13",
              name: "Android Phones",
              slug: "android-phones",
              level: 3,
              parent: {
                id: "cat-9",
                slug: "smartphones",
              },
            },
          },
          {
            node: {
              id: "cat-14",
              name: "iPhones",
              slug: "iphones",
              level: 3,
              parent: {
                id: "cat-9",
                slug: "smartphones",
              },
            },
          },
        ],
      },
      shippingZones: null,
      warehouses: null,
    };

    const mockRepository: ConfigurationOperations = {
      fetchConfig: vi.fn().mockResolvedValue(mockRawConfig),
    };

    const mockStorage: ConfigurationStorage = {
      save: vi.fn(),
      read: vi.fn(),
    };

    const service = new ConfigurationService(mockRepository, mockStorage);

    // Test retrieve method which includes mapping
    const result = await service.retrieve();

    // Verify the nested structure is correctly built
    expect(result.categories).toEqual([
      {
        name: "Electronics",
        slug: "electronics",
        subcategories: [
          {
            name: "Computers",
            slug: "computers",
            subcategories: [
              {
                name: "Laptops",
                slug: "laptops",
                subcategories: [
                  {
                    name: "Gaming Laptops",
                    slug: "gaming-laptops",
                  },
                  {
                    name: "Business Laptops",
                    slug: "business-laptops",
                  },
                ],
              },
              {
                name: "Desktops",
                slug: "desktops",
              },
            ],
          },
          {
            name: "Mobile Devices",
            slug: "mobile-devices",
            subcategories: [
              {
                name: "Smartphones",
                slug: "smartphones",
                subcategories: [
                  {
                    name: "Android Phones",
                    slug: "android-phones",
                  },
                  {
                    name: "iPhones",
                    slug: "iphones",
                  },
                ],
              },
              {
                name: "Tablets",
                slug: "tablets",
              },
            ],
          },
        ],
      },
      {
        name: "Clothing",
        slug: "clothing",
        subcategories: [
          {
            name: "Men's Clothing",
            slug: "mens-clothing",
          },
          {
            name: "Women's Clothing",
            slug: "womens-clothing",
          },
        ],
      },
    ]);

    // Verify storage was called with the correct structure
    expect(mockStorage.save).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: result.categories,
      })
    );
  });

  it("should handle out-of-order categories (children before parents in the list)", async () => {
    const mockRawConfig: RawSaleorConfig = {
      shop: null,
      channels: null,
      productTypes: null,
      pageTypes: null,
      categories: {
        edges: [
          // Child category appears before parent in the list
          {
            node: {
              id: "cat-2",
              name: "Laptops",
              slug: "laptops",
              level: 1,
              parent: {
                id: "cat-1",
                slug: "electronics",
              },
            },
          },
          // Parent appears after child
          {
            node: {
              id: "cat-1",
              name: "Electronics",
              slug: "electronics",
              level: 0,
              parent: null,
            },
          },
          // Deep nested child appears first
          {
            node: {
              id: "cat-3",
              name: "Gaming Laptops",
              slug: "gaming-laptops",
              level: 2,
              parent: {
                id: "cat-2",
                slug: "laptops",
              },
            },
          },
        ],
      },
      shippingZones: null,
      warehouses: null,
    };

    const mockRepository: ConfigurationOperations = {
      fetchConfig: vi.fn().mockResolvedValue(mockRawConfig),
    };

    const mockStorage: ConfigurationStorage = {
      save: vi.fn(),
      read: vi.fn(),
    };

    const service = new ConfigurationService(mockRepository, mockStorage);
    const result = await service.retrieve();

    // Even with out-of-order categories, the structure should be correctly built
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
});