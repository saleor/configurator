import { describe, it, expect, vi, beforeEach } from "vitest";
import { ServiceContainer } from "../../core/service-container";
import { SaleorConfigurator } from "../../core/configurator";
import type { SaleorConfig } from "../../modules/config/schema";

describe("Complete E-commerce Setup Flow", () => {
  let configurator: SaleorConfigurator;
  let mockServices: ServiceContainer;
  let mockConfigStorage: any;

  beforeEach(() => {
    // Mock all services
    mockConfigStorage = {
      load: vi.fn(),
    };

    mockServices = {
      configStorage: mockConfigStorage,
      shop: {
        updateSettings: vi.fn(),
      },
      channel: {
        bootstrapChannels: vi.fn().mockResolvedValue([
          { id: "channel-1", slug: "default" },
        ]),
      },
      productType: {
        bootstrapProductType: vi.fn().mockResolvedValue({
          id: "pt-1",
          name: "Book",
        }),
      },
      pageType: {
        bootstrapPageType: vi.fn(),
      },
      category: {
        bootstrapCategories: vi.fn().mockResolvedValue([
          { id: "cat-1", name: "Fiction" },
        ]),
      },
      warehouse: {
        upsertWarehouses: vi.fn(),
      },
      collection: {
        upsertCollections: vi.fn(),
      },
      product: {
        upsertProducts: vi.fn(),
      },
      attribute: {
        bootstrapAttributes: vi.fn(),
      },
      configuration: {
        retrieve: vi.fn(),
      },
    } as any;

    configurator = new SaleorConfigurator(mockServices);
  });

  it("should set up a complete e-commerce store configuration", async () => {
    // Arrange - Complete store configuration
    const completeConfig: SaleorConfig = {
      shop: {
        defaultMailSenderName: "Test Store",
        defaultMailSenderAddress: "store@test.com",
        displayGrossPrices: true,
        trackInventoryByDefault: true,
        defaultWeightUnit: "KG",
      },
      channels: [
        {
          name: "Default Channel",
          slug: "default",
          currencyCode: "USD",
          defaultCountry: "US",
          settings: {
            automaticallyConfirmAllNewOrders: true,
            allowUnpaidOrders: false,
            markAsPaidStrategy: "TRANSACTION_FLOW",
          },
        },
      ],
      productTypes: [
        {
          name: "Book",
          attributes: [
            { name: "Author", inputType: "PLAIN_TEXT" },
            { name: "ISBN", inputType: "PLAIN_TEXT" },
            { name: "Pages", inputType: "NUMERIC" },
            { name: "Genre", inputType: "DROPDOWN", values: [
              { name: "Fiction" },
              { name: "Non-Fiction" },
            ]},
          ],
        },
        {
          name: "Electronics",
          attributes: [
            { name: "Brand", inputType: "PLAIN_TEXT" },
            { name: "Model", inputType: "PLAIN_TEXT" },
            { name: "Warranty", inputType: "NUMERIC" },
          ],
        },
      ],
      pageTypes: [
        {
          name: "Blog Post",
          attributes: [
            { name: "Title", inputType: "PLAIN_TEXT" },
            { name: "Content", inputType: "RICH_TEXT" },
            { name: "Published Date", inputType: "DATE" },
          ],
        },
      ],
      categories: [
        {
          name: "Books",
          subcategories: [
            { name: "Fiction" },
            { name: "Non-Fiction" },
          ],
        },
        {
          name: "Electronics",
          subcategories: [
            { name: "Computers" },
            { name: "Mobile Devices" },
          ],
        },
      ],
      warehouses: [
        {
          name: "Main Warehouse",
          slug: "main-warehouse",
          email: "warehouse@test.com",
          address: {
            streetAddress1: "123 Storage St",
            city: "New York",
            postalCode: "10001",
            country: "US",
          },
        },
        {
          name: "European Warehouse",
          slug: "eu-warehouse",
          email: "eu-warehouse@test.com",
          address: {
            streetAddress1: "456 Europa Ave",
            city: "Berlin",
            postalCode: "10115",
            country: "DE",
          },
        },
      ],
      collections: [
        {
          name: "Summer Reading",
          slug: "summer-reading",
          description: "Best books for summer vacation",
          isPublished: true,
          channelListings: [
            {
              channelSlug: "default",
              isPublished: true,
            },
          ],
        },
        {
          name: "Tech Essentials",
          slug: "tech-essentials",
          description: "Must-have tech products",
          isPublished: true,
          channelListings: [
            {
              channelSlug: "default",
              isPublished: true,
            },
          ],
        },
      ],
      products: [
        {
          name: "The Great Adventure",
          slug: "the-great-adventure",
          description: "An exciting adventure novel",
          productTypeName: "Book",
          categorySlug: "fiction",
          collections: ["summer-reading"],
          weight: 0.5,
          rating: 4.5,
          attributes: [
            { name: "Author", value: "Jane Smith" },
            { name: "ISBN", value: "978-1234567890" },
            { name: "Pages", value: 350 },
            { name: "Genre", value: "Fiction" },
          ],
          channelListings: [
            {
              channelSlug: "default",
              isPublished: true,
              visibleInListings: true,
              isAvailableForPurchase: true,
            },
          ],
          variants: [
            {
              sku: "TGA-HARDCOVER",
              name: "Hardcover",
              weight: 0.7,
              trackInventory: true,
              channelListings: [
                {
                  channelSlug: "default",
                  price: 29.99,
                  costPrice: 15.00,
                },
              ],
              stocks: [
                {
                  warehouseSlug: "main-warehouse",
                  quantity: 100,
                },
                {
                  warehouseSlug: "eu-warehouse",
                  quantity: 50,
                },
              ],
            },
            {
              sku: "TGA-EBOOK",
              name: "E-book",
              weight: 0,
              trackInventory: false,
              channelListings: [
                {
                  channelSlug: "default",
                  price: 14.99,
                  costPrice: 2.00,
                },
              ],
            },
          ],
        },
        {
          name: "Pro Laptop",
          slug: "pro-laptop",
          description: "High-performance laptop for professionals",
          productTypeName: "Electronics",
          categorySlug: "computers",
          collections: ["tech-essentials"],
          weight: 2.5,
          rating: 4.8,
          attributes: [
            { name: "Brand", value: "TechCorp" },
            { name: "Model", value: "ProBook X1" },
            { name: "Warranty", value: 24 },
          ],
          channelListings: [
            {
              channelSlug: "default",
              isPublished: true,
              visibleInListings: true,
              isAvailableForPurchase: true,
            },
          ],
          variants: [
            {
              sku: "PL-16GB-512GB",
              name: "16GB RAM / 512GB SSD",
              weight: 2.5,
              trackInventory: true,
              channelListings: [
                {
                  channelSlug: "default",
                  price: 1499.99,
                  costPrice: 900.00,
                },
              ],
              stocks: [
                {
                  warehouseSlug: "main-warehouse",
                  quantity: 25,
                },
                {
                  warehouseSlug: "eu-warehouse",
                  quantity: 15,
                },
              ],
            },
            {
              sku: "PL-32GB-1TB",
              name: "32GB RAM / 1TB SSD",
              weight: 2.5,
              trackInventory: true,
              channelListings: [
                {
                  channelSlug: "default",
                  price: 1999.99,
                  costPrice: 1200.00,
                },
              ],
              stocks: [
                {
                  warehouseSlug: "main-warehouse",
                  quantity: 10,
                },
                {
                  warehouseSlug: "eu-warehouse",
                  quantity: 5,
                },
              ],
            },
          ],
        },
      ],
    };

    mockConfigStorage.load.mockResolvedValue(completeConfig);

    // Act
    await configurator.push();

    // Assert - Verify all entities were created in the correct order
    // 1. Shop settings should be updated first
    expect(mockServices.shop.updateSettings).toHaveBeenCalledWith(completeConfig.shop);

    // 2. Channels should be created
    expect(mockServices.channel.bootstrapChannels).toHaveBeenCalledWith(completeConfig.channels);

    // 3. Product types with attributes
    expect(mockServices.productType.bootstrapProductType).toHaveBeenCalledTimes(2);
    expect(mockServices.productType.bootstrapProductType).toHaveBeenCalledWith({
      name: "Book",
      attributes: expect.arrayContaining([
        expect.objectContaining({ name: "Author" }),
        expect.objectContaining({ name: "ISBN" }),
        expect.objectContaining({ name: "Pages" }),
        expect.objectContaining({ name: "Genre" }),
      ]),
    });

    // 4. Page types
    expect(mockServices.pageType.bootstrapPageType).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Blog Post" })
    );

    // 5. Categories with hierarchy
    expect(mockServices.category.bootstrapCategories).toHaveBeenCalledWith(completeConfig.categories);

    // 6. Warehouses (needed for inventory)
    expect(mockServices.warehouse.upsertWarehouses).toHaveBeenCalledWith(completeConfig.warehouses);

    // 7. Collections
    expect(mockServices.collection.upsertCollections).toHaveBeenCalledWith(completeConfig.collections);

    // 8. Products with variants and inventory
    expect(mockServices.product.upsertProducts).toHaveBeenCalledWith(completeConfig.products);
  });

  it("should handle partial configurations correctly", async () => {
    // Arrange - Minimal configuration
    const minimalConfig: SaleorConfig = {
      channels: [
        {
          name: "Default",
          slug: "default",
          currencyCode: "USD",
          defaultCountry: "US",
        },
      ],
      productTypes: [
        {
          name: "Simple Product",
          attributes: [],
        },
      ],
    };

    mockConfigStorage.load.mockResolvedValue(minimalConfig);

    // Act
    await configurator.push();

    // Assert - Only specified entities should be processed
    expect(mockServices.shop.updateSettings).not.toHaveBeenCalled();
    expect(mockServices.channel.bootstrapChannels).toHaveBeenCalled();
    expect(mockServices.productType.bootstrapProductType).toHaveBeenCalled();
    expect(mockServices.pageType.bootstrapPageType).not.toHaveBeenCalled();
    expect(mockServices.category.bootstrapCategories).not.toHaveBeenCalled();
    expect(mockServices.warehouse.upsertWarehouses).not.toHaveBeenCalled();
    expect(mockServices.collection.upsertCollections).not.toHaveBeenCalled();
    expect(mockServices.product.upsertProducts).not.toHaveBeenCalled();
  });

  it("should handle errors gracefully and maintain order", async () => {
    // Arrange
    const config: SaleorConfig = {
      channels: [{ name: "Test", slug: "test", currencyCode: "USD", defaultCountry: "US" }],
      products: [{ 
        name: "Test Product", 
        slug: "test-product", 
        productTypeName: "Book" 
      }],
    };

    mockConfigStorage.load.mockResolvedValue(config);
    mockServices.channel.bootstrapChannels.mockRejectedValue(new Error("Channel creation failed"));

    // Act & Assert
    await expect(configurator.push()).rejects.toThrow("Channel creation failed");
    
    // Products should not be created if channels fail
    expect(mockServices.product.upsertProducts).not.toHaveBeenCalled();
  });
}); 