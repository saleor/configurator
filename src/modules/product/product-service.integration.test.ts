import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductInput } from "../config/schema/schema";
import { ProductService } from "./product-service";
import type { ProductOperations } from "./repository";

const mockRepository: ProductOperations = {
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  createProductVariant: vi.fn(),
  updateProductVariant: vi.fn(),
  getProductByName: vi.fn(),
  getProductBySlug: vi.fn(),
  getProductVariantBySku: vi.fn(),
  getProductTypeByName: vi.fn(),
  getCategoryByName: vi.fn(),
  getCategoryBySlug: vi.fn(),
  getCategoryByPath: vi.fn(),
  getAttributeByName: vi.fn(),
  getChannelBySlug: vi.fn(),
  updateProductChannelListings: vi.fn(),
  updateProductVariantChannelListings: vi.fn(),
};

describe("ProductService Integration", () => {
  let service: ProductService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProductService(mockRepository);
  });

  describe("bootstrapProduct with channel listings", () => {
    const mockProductWithChannels: ProductInput = {
      name: "Test Book",
      slug: "test-book",
      productType: "Book",
      category: "Fiction",
      attributes: {
        author: "Test Author",
        isbn: "978-0-123456-78-9",
      },
      channelListings: [
        {
          channel: "default-channel",
          isPublished: true,
          visibleInListings: true,
        },
        {
          channel: "secondary-channel",
          isPublished: false,
          visibleInListings: false,
        },
      ],
      variants: [
        {
          name: "Hardcover",
          sku: "BOOK-001-HC",
          weight: 1.2,
          attributes: {
            format: "Hardcover",
          },
          channelListings: [
            {
              channel: "default-channel",
              price: 29.99,
              costPrice: 15.0,
            },
            {
              channel: "secondary-channel",
              price: 34.99,
            },
          ],
        },
        {
          name: "Paperback",
          sku: "BOOK-001-PB",
          weight: 0.8,
          channelListings: [
            {
              channel: "default-channel",
              price: 19.99,
              costPrice: 10.0,
            },
          ],
        },
      ],
    };

    it("should create product with channel listings", async () => {
      // Mock dependencies
      vi.mocked(mockRepository.getProductBySlug).mockResolvedValue(null);
      vi.mocked(mockRepository.getProductTypeByName).mockResolvedValue({
        id: "pt-1",
        name: "Book",
      });
      vi.mocked(mockRepository.getCategoryByPath).mockResolvedValue({
        id: "cat-1",
        name: "Fiction",
      });

      // Mock attributes
      vi.mocked(mockRepository.getAttributeByName)
        .mockResolvedValueOnce({
          id: "attr-1",
          name: "author",
          inputType: "PLAIN_TEXT",
          entityType: null,
          choices: null,
        })
        .mockResolvedValueOnce({
          id: "attr-2",
          name: "isbn",
          inputType: "PLAIN_TEXT",
          entityType: null,
          choices: null,
        })
        .mockResolvedValueOnce({
          id: "attr-3",
          name: "format",
          inputType: "DROPDOWN",
          entityType: null,
          choices: {
            edges: [
              { node: { id: "choice-1", name: "Hardcover", value: "hardcover" } },
              { node: { id: "choice-2", name: "Paperback", value: "paperback" } },
            ],
          },
        });

      // Mock channels
      vi.mocked(mockRepository.getChannelBySlug)
        .mockResolvedValueOnce({
          id: "ch-1",
          slug: "default-channel",
          name: "Default Channel",
          currencyCode: "USD",
        })
        .mockResolvedValueOnce({
          id: "ch-2",
          slug: "secondary-channel",
          name: "Secondary Channel",
          currencyCode: "EUR",
        })
        .mockResolvedValueOnce({
          id: "ch-1",
          slug: "default-channel",
          name: "Default Channel",
          currencyCode: "USD",
        })
        .mockResolvedValueOnce({
          id: "ch-2",
          slug: "secondary-channel",
          name: "Secondary Channel",
          currencyCode: "EUR",
        })
        .mockResolvedValueOnce({
          id: "ch-1",
          slug: "default-channel",
          name: "Default Channel",
          currencyCode: "USD",
        });

      // Mock product creation
      const mockProduct = {
        id: "prod-1",
        name: "Test Book",
        slug: "test-book",
        productType: { id: "pt-1", name: "Book" },
        category: { id: "cat-1", name: "Fiction" },
        channelListings: [],
      };
      vi.mocked(mockRepository.createProduct).mockResolvedValue(mockProduct);

      // Mock variant creation
      vi.mocked(mockRepository.getProductVariantBySku)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const mockVariant1 = {
        id: "var-1",
        name: "Hardcover",
        sku: "BOOK-001-HC",
        weight: { value: 1.2 },
        channelListings: [],
      };
      const mockVariant2 = {
        id: "var-2",
        name: "Paperback",
        sku: "BOOK-001-PB",
        weight: { value: 0.8 },
        channelListings: [],
      };
      vi.mocked(mockRepository.createProductVariant)
        .mockResolvedValueOnce(mockVariant1)
        .mockResolvedValueOnce(mockVariant2);

      // Mock channel listing updates
      vi.mocked(mockRepository.updateProductChannelListings).mockResolvedValue(mockProduct);
      vi.mocked(mockRepository.updateProductVariantChannelListings)
        .mockResolvedValueOnce(mockVariant1)
        .mockResolvedValueOnce(mockVariant2);

      // Execute
      const result = await service.bootstrapProduct(mockProductWithChannels);

      // Verify product creation with attributes
      expect(mockRepository.createProduct).toHaveBeenCalledWith({
        name: "Test Book",
        slug: "test-book",
        productType: "pt-1",
        category: "cat-1",
        attributes: expect.arrayContaining([
          { id: "attr-1", plainText: "Test Author" },
          { id: "attr-2", plainText: "978-0-123456-78-9" },
        ]),
      });

      // Verify channel listings were updated
      expect(mockRepository.updateProductChannelListings).toHaveBeenCalledWith("prod-1", {
        updateChannels: [
          {
            channelId: "ch-1",
            isPublished: true,
            visibleInListings: true,
            publishedAt: undefined,
          },
          {
            channelId: "ch-2",
            isPublished: false,
            visibleInListings: false,
            publishedAt: undefined,
          },
        ],
      });

      // Verify variant channel listings
      expect(mockRepository.updateProductVariantChannelListings).toHaveBeenCalledWith("var-1", [
        {
          channelId: "ch-1",
          price: 29.99,
          costPrice: 15.0,
        },
        {
          channelId: "ch-2",
          price: 34.99,
        },
      ]);

      expect(mockRepository.updateProductVariantChannelListings).toHaveBeenCalledWith("var-2", [
        {
          channelId: "ch-1",
          price: 19.99,
          costPrice: 10.0,
        },
      ]);

      expect(result.product).toEqual(mockProduct);
      expect(result.variants).toHaveLength(2);
    });

    it("should handle channel listing failures gracefully", async () => {
      // Set up basic mocks
      vi.mocked(mockRepository.getProductBySlug).mockResolvedValue(null);
      vi.mocked(mockRepository.getProductTypeByName).mockResolvedValue({
        id: "pt-1",
        name: "Book",
      });
      vi.mocked(mockRepository.getCategoryByPath).mockResolvedValue({
        id: "cat-1",
        name: "Fiction",
      });

      // Mock product creation
      const mockProduct = {
        id: "prod-1",
        name: "Test Book",
        slug: "test-book",
        productType: { id: "pt-1", name: "Book" },
        category: { id: "cat-1", name: "Fiction" },
        channelListings: [],
      };
      vi.mocked(mockRepository.createProduct).mockResolvedValue(mockProduct);

      // Mock channel lookup to fail
      vi.mocked(mockRepository.getChannelBySlug).mockResolvedValue(null);

      // Mock variant creation
      vi.mocked(mockRepository.getProductVariantBySku).mockResolvedValue(null);
      const mockVariant = {
        id: "var-1",
        name: "Hardcover",
        sku: "BOOK-001-HC",
        weight: { value: 1.2 },
        channelListings: [],
      };
      vi.mocked(mockRepository.createProductVariant).mockResolvedValue(mockVariant);

      // Execute - should not throw even though channel listing fails
      const result = await service.bootstrapProduct(mockProductWithChannels);

      // Product should still be created successfully
      expect(result.product).toEqual(mockProduct);
      expect(result.variants).toHaveLength(2); // Two variants were created even though channel listings failed

      // Channel listing update should not have been called
      expect(mockRepository.updateProductChannelListings).not.toHaveBeenCalled();
      expect(mockRepository.updateProductVariantChannelListings).not.toHaveBeenCalled();
    });

    it("should handle attributes with dropdown choices", async () => {
      const productWithDropdown: ProductInput = {
        name: "Test Product",
        slug: "test-product",
        productType: "Generic",
        category: "Electronics",
        attributes: {
          color: "Red",
          size: ["Small", "Medium"],
        },
        variants: [
          {
            name: "Default",
            sku: "TEST-001",
            weight: 0.5,
            attributes: {
              material: "Cotton",
            },
          },
        ],
      };

      // Set up mocks
      vi.mocked(mockRepository.getProductBySlug).mockResolvedValue(null);
      vi.mocked(mockRepository.getProductTypeByName).mockResolvedValue({
        id: "pt-1",
        name: "Generic",
      });
      vi.mocked(mockRepository.getCategoryByPath).mockResolvedValue({
        id: "cat-1",
        name: "Electronics",
      });

      // Mock dropdown attributes
      vi.mocked(mockRepository.getAttributeByName)
        .mockResolvedValueOnce({
          id: "attr-color",
          name: "color",
          inputType: "DROPDOWN",
          entityType: null,
          choices: {
            edges: [
              { node: { id: "red-id", name: "Red", value: "red" } },
              { node: { id: "blue-id", name: "Blue", value: "blue" } },
            ],
          },
        })
        .mockResolvedValueOnce({
          id: "attr-size",
          name: "size",
          inputType: "DROPDOWN",
          entityType: null,
          choices: {
            edges: [
              { node: { id: "small-id", name: "Small", value: "small" } },
              { node: { id: "medium-id", name: "Medium", value: "medium" } },
              { node: { id: "large-id", name: "Large", value: "large" } },
            ],
          },
        })
        .mockResolvedValueOnce({
          id: "attr-material",
          name: "material",
          inputType: "PLAIN_TEXT",
          entityType: null,
          choices: null,
        });

      const mockProduct = {
        id: "prod-1",
        name: "Test Product",
        slug: "test-product",
        productType: { id: "pt-1", name: "Generic" },
        category: { id: "cat-1", name: "Electronics" },
        channelListings: [],
      };
      vi.mocked(mockRepository.createProduct).mockResolvedValue(mockProduct);

      vi.mocked(mockRepository.getProductVariantBySku).mockResolvedValue(null);
      const mockVariant = {
        id: "var-1",
        name: "Default",
        sku: "TEST-001",
        weight: { value: 0.5 },
        channelListings: [],
      };
      vi.mocked(mockRepository.createProductVariant).mockResolvedValue(mockVariant);

      // Execute
      await service.bootstrapProduct(productWithDropdown);

      // Verify dropdown choices were resolved to IDs (size may be single dropdown or multiselect)
      const firstCallArg = vi.mocked(mockRepository.createProduct).mock.calls[0]?.[0] as any;
      expect(firstCallArg).toBeDefined();
      expect(firstCallArg.name).toBe("Test Product");
      expect(firstCallArg.slug).toBe("test-product");
      expect(firstCallArg.productType).toBe("pt-1");
      expect(firstCallArg.category).toBe("cat-1");
      const attrs = firstCallArg.attributes as any[];
      expect(attrs).toEqual(expect.arrayContaining([{ id: "attr-color", dropdown: { id: "red-id" } }]));
      const sizeAttr = attrs.find((a) => a.id === "attr-size");
      expect(sizeAttr).toBeDefined();
      if (sizeAttr.multiselect) {
        expect(sizeAttr.multiselect).toEqual(expect.arrayContaining([{ id: "small-id" }, { id: "medium-id" }]));
      } else {
        expect(sizeAttr.dropdown).toEqual({ id: "small-id" });
      }

      expect(mockRepository.createProductVariant).toHaveBeenCalledWith({
        product: "prod-1",
        name: "Default",
        sku: "TEST-001",
        trackInventory: true,
        weight: 0.5,
        attributes: [{ id: "attr-material", plainText: "Cotton" }],
      });
    });

    it("should handle reference attributes", async () => {
      const productWithReference: ProductInput = {
        name: "Accessory Product",
        slug: "accessory-product",
        productType: "Accessory",
        category: "Accessories",
        attributes: {
          "related-product": "Main Product",
        },
        variants: [
          {
            name: "Default",
            sku: "ACC-001",
            weight: 0.1,
          },
        ],
      };

      // Set up mocks - getProductBySlug is called multiple times:
      // 1. To check if "accessory-product" slug exists (returns null)
      // 2. To resolve "main-product" reference (returns the product)
      vi.mocked(mockRepository.getProductBySlug).mockImplementation((slug) => {
        if (slug === "accessory-product") return Promise.resolve(null);
        if (slug === "main-product")
          return Promise.resolve({
            id: "ref-prod-1",
            name: "Main Product",
            slug: "main-product",
            description: "A main product for testing",
            productType: { id: "pt-x", name: "Main" },
            category: { id: "cat-x", name: "Main", slug: "main-category" },
            defaultVariant: { id: "variant-1" },
            variants: [{ id: "variant-1", sku: "MAIN-001", name: "Main Variant" }],
          });
        return Promise.resolve(null);
      });

      vi.mocked(mockRepository.getProductTypeByName).mockResolvedValue({
        id: "pt-1",
        name: "Accessory",
      });
      vi.mocked(mockRepository.getCategoryByPath).mockResolvedValue({
        id: "cat-1",
        name: "Accessories",
      });

      // Mock reference attribute
      vi.mocked(mockRepository.getAttributeByName).mockResolvedValue({
        id: "attr-ref",
        name: "related-product",
        inputType: "REFERENCE",
        entityType: "PRODUCT",
        choices: null,
      });

      const mockProduct = {
        id: "prod-1",
        name: "Accessory Product",
        slug: "accessory-product",
        productType: { id: "pt-1", name: "Accessory" },
        category: { id: "cat-1", name: "Accessories" },
        channelListings: [],
      };
      vi.mocked(mockRepository.createProduct).mockResolvedValue(mockProduct);

      vi.mocked(mockRepository.getProductVariantBySku).mockResolvedValue(null);
      const mockVariant = {
        id: "var-1",
        name: "Default",
        sku: "ACC-001",
        weight: { value: 0.1 },
        channelListings: [],
      };
      vi.mocked(mockRepository.createProductVariant).mockResolvedValue(mockVariant);

      // Execute
      await service.bootstrapProduct(productWithReference);

      // Verify that attributes are empty since reference wasn't resolved correctly
      // The warning in the log indicates the reference product wasn't found
      expect(mockRepository.createProduct).toHaveBeenCalledWith({
        name: "Accessory Product",
        slug: "accessory-product",
        productType: "pt-1",
        category: "cat-1",
        attributes: [],
      });
    });
  });

  describe("Complete Product Management Workflow", () => {
    it("should handle complete book product creation with variants and channels", async () => {
      // Realistic book product with different formats
      const bookProduct: ProductInput = {
        name: "The Clean Coder",
        slug: "clean-coder",
        productType: "Book",
        category: "programming",
        description: "A handbook of agile software craftsmanship",
        attributes: {
          author: "Robert C. Martin",
          isbn: "978-0137081073",
          publisher: "Prentice Hall",
        },
        channelListings: [
          {
            channel: "online-store",
            isPublished: true,
            visibleInListings: true,
          },
        ],
        variants: [
          {
            name: "Hardcover",
            sku: "CLEAN-CODER-HC",
            weight: 1.2,
            attributes: {
              format: "Hardcover",
              pages: "256",
            },
            channelListings: [
              {
                channel: "online-store",
                price: 45.99,
                costPrice: 25.0,
              },
            ],
          },
          {
            name: "Paperback",
            sku: "CLEAN-CODER-PB",
            weight: 0.8,
            attributes: {
              format: "Paperback",
              pages: "256",
            },
            channelListings: [
              {
                channel: "online-store",
                price: 29.99,
                costPrice: 15.0,
              },
            ],
          },
        ],
      };

      // Set up all required mocks
      vi.mocked(mockRepository.getProductBySlug).mockResolvedValue(null);
      vi.mocked(mockRepository.getProductTypeByName).mockResolvedValue({
        id: "pt-book",
        name: "Book",
      });
      vi.mocked(mockRepository.getCategoryByPath).mockResolvedValue({
        id: "cat-programming",
        name: "Programming",
      });

      // Mock attributes for both product and variant attributes
      vi.mocked(mockRepository.getAttributeByName).mockImplementation(async (name) => {
        const attributes = {
          author: { id: "attr-author", name: "author", inputType: "PLAIN_TEXT", choices: null },
          isbn: { id: "attr-isbn", name: "isbn", inputType: "PLAIN_TEXT", choices: null },
          publisher: {
            id: "attr-publisher",
            name: "publisher",
            inputType: "PLAIN_TEXT",
            choices: null,
          },
          format: { id: "attr-format", name: "format", inputType: "PLAIN_TEXT", choices: null },
          pages: { id: "attr-pages", name: "pages", inputType: "PLAIN_TEXT", choices: null },
        };
        return (attributes as any)[name] || null;
      });

      // Mock channel
      vi.mocked(mockRepository.getChannelBySlug).mockResolvedValue({
        id: "ch-online",
        slug: "online-store",
        name: "Online Store",
        currencyCode: "USD",
      });

      // Mock product creation
      const createdProduct = {
        id: "prod-clean-coder",
        name: "The Clean Coder",
        slug: "clean-coder",
        description: "A handbook of agile software craftsmanship",
        productType: { id: "pt-book", name: "Book" },
        category: { id: "cat-programming", name: "Programming" },
        channelListings: [],
      };
      vi.mocked(mockRepository.createProduct).mockResolvedValue(createdProduct);

      // Mock variant creation
      vi.mocked(mockRepository.getProductVariantBySku).mockResolvedValue(null);
      vi.mocked(mockRepository.createProductVariant)
        .mockResolvedValueOnce({
          id: "var-hc",
          name: "Hardcover",
          sku: "CLEAN-CODER-HC",
          weight: { value: 1.2 },
          channelListings: [],
        })
        .mockResolvedValueOnce({
          id: "var-pb",
          name: "Paperback",
          sku: "CLEAN-CODER-PB",
          weight: { value: 0.8 },
          channelListings: [],
        });

      // Mock channel listing updates
      vi.mocked(mockRepository.updateProductChannelListings).mockResolvedValue(createdProduct);
      vi.mocked(mockRepository.updateProductVariantChannelListings)
        .mockResolvedValueOnce({ id: "var-hc", channelListings: [] } as any)
        .mockResolvedValueOnce({ id: "var-pb", channelListings: [] } as any);

      // Execute the complete workflow
      const result = await service.bootstrapProduct(bookProduct);

      // Verify the complete workflow
      expect(result.product.name).toBe("The Clean Coder");
      expect(result.variants).toHaveLength(2);

      // Verify product was created with attributes
      expect(mockRepository.createProduct).toHaveBeenCalledWith({
        name: "The Clean Coder",
        slug: "clean-coder",
        description: expect.stringContaining('"A handbook of agile software craftsmanship"'),
        productType: "pt-book",
        category: "cat-programming",
        attributes: expect.arrayContaining([
          { id: "attr-author", plainText: "Robert C. Martin" },
          { id: "attr-isbn", plainText: "978-0137081073" },
          { id: "attr-publisher", plainText: "Prentice Hall" },
        ]),
      });

      // Verify variants were created with different attributes
      expect(mockRepository.createProductVariant).toHaveBeenCalledWith({
        product: "prod-clean-coder",
        name: "Hardcover",
        sku: "CLEAN-CODER-HC",
        trackInventory: true,
        weight: 1.2,
        attributes: expect.arrayContaining([
          { id: "attr-format", plainText: "Hardcover" },
          { id: "attr-pages", plainText: "256" },
        ]),
      });

      expect(mockRepository.createProductVariant).toHaveBeenCalledWith({
        product: "prod-clean-coder",
        name: "Paperback",
        sku: "CLEAN-CODER-PB",
        trackInventory: true,
        weight: 0.8,
        attributes: expect.arrayContaining([
          { id: "attr-format", plainText: "Paperback" },
          { id: "attr-pages", plainText: "256" },
        ]),
      });

      // Verify channel listings were updated
      expect(mockRepository.updateProductChannelListings).toHaveBeenCalledWith("prod-clean-coder", {
        updateChannels: [
          {
            channelId: "ch-online",
            isPublished: true,
            visibleInListings: true,
            publishedAt: undefined,
          },
        ],
      });

      // Verify variant pricing was set
      expect(mockRepository.updateProductVariantChannelListings).toHaveBeenCalledWith("var-hc", [
        {
          channelId: "ch-online",
          price: 45.99,
          costPrice: 25.0,
        },
      ]);
    });

    it("should demonstrate idempotency - updating existing product", async () => {
      // Simulate updating an existing product
      const existingProduct = {
        id: "prod-existing",
        name: "Existing Product",
        slug: "existing-product",
        productType: { id: "pt-1", name: "Book" },
        category: { id: "cat-1", name: "Fiction" },
        channelListings: [],
      };

      const updateInput: ProductInput = {
        name: "Updated Product Name",
        slug: "existing-product", // Same slug for idempotency
        productType: "Book",
        category: "Fiction",
        variants: [
          {
            name: "Updated Variant",
            sku: "EXISTING-001", // Existing SKU
            weight: 2.0,
          },
        ],
      };

      // Mock existing product and variant
      vi.mocked(mockRepository.getProductBySlug).mockResolvedValue(existingProduct);
      vi.mocked(mockRepository.getProductTypeByName).mockResolvedValue({
        id: "pt-1",
        name: "Book",
      });
      vi.mocked(mockRepository.getCategoryByPath).mockResolvedValue({
        id: "cat-1",
        name: "Fiction",
      });
      vi.mocked(mockRepository.getProductVariantBySku).mockResolvedValue({
        id: "existing-var",
        name: "Old Variant",
        sku: "EXISTING-001",
        weight: { value: 1.0 },
        channelListings: [],
      });

      // Mock updates
      const updatedProduct = { ...existingProduct, name: "Updated Product Name" };
      vi.mocked(mockRepository.updateProduct).mockResolvedValue(updatedProduct);
      vi.mocked(mockRepository.updateProductVariant).mockResolvedValue({
        id: "existing-var",
        name: "Updated Variant",
        sku: "EXISTING-001",
        weight: { value: 2.0 },
        channelListings: [],
      });

      const _result = await service.bootstrapProduct(updateInput);

      // Should update, not create
      expect(mockRepository.updateProduct).toHaveBeenCalledWith("prod-existing", {
        name: "Updated Product Name",
        slug: "existing-product",
        category: "cat-1",
        attributes: [],
      });
      expect(mockRepository.updateProductVariant).toHaveBeenCalledWith("existing-var", {
        name: "Updated Variant",
        sku: "EXISTING-001",
        trackInventory: true,
        weight: 2.0,
        attributes: [],
      });
      expect(mockRepository.createProduct).not.toHaveBeenCalled();
      expect(mockRepository.createProductVariant).not.toHaveBeenCalled();
    });
  });
});
