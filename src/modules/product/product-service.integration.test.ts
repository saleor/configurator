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
          choices: null,
        })
        .mockResolvedValueOnce({
          id: "attr-2",
          name: "isbn",
          inputType: "PLAIN_TEXT",
          choices: null,
        })
        .mockResolvedValueOnce({
          id: "attr-3",
          name: "format",
          inputType: "DROPDOWN",
          choices: {
            edges: [
              { node: { id: "choice-1", name: "Hardcover", value: "hardcover" } },
              { node: { id: "choice-2", name: "Paperback", value: "paperback" } },
            ],
          },
        });

      // Mock channels
      vi.mocked(mockRepository.getChannelBySlug)
        .mockResolvedValueOnce({ id: "ch-1", slug: "default-channel", name: "Default Channel" })
        .mockResolvedValueOnce({ id: "ch-2", slug: "secondary-channel", name: "Secondary Channel" })
        .mockResolvedValueOnce({ id: "ch-1", slug: "default-channel", name: "Default Channel" })
        .mockResolvedValueOnce({ id: "ch-2", slug: "secondary-channel", name: "Secondary Channel" })
        .mockResolvedValueOnce({ id: "ch-1", slug: "default-channel", name: "Default Channel" });

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
        attributes: [
          { id: "attr-1", values: ["Test Author"] },
          { id: "attr-2", values: ["978-0-123456-78-9"] },
        ],
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

      // Verify dropdown choices were resolved to IDs
      expect(mockRepository.createProduct).toHaveBeenCalledWith({
        name: "Test Product",
        slug: "test-product",
        productType: "pt-1",
        category: "cat-1",
        attributes: [
          { id: "attr-color", values: ["red-id"] },
          { id: "attr-size", values: ["small-id", "medium-id"] },
        ],
      });

      expect(mockRepository.createProductVariant).toHaveBeenCalledWith({
        product: "prod-1",
        name: "Default",
        sku: "TEST-001",
        trackInventory: true,
        weight: 0.5,
        attributes: [{ id: "attr-material", values: ["Cotton"] }],
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
            productType: { id: "pt-x", name: "Main" },
            category: { id: "cat-x", name: "Main" },
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

      // Verify reference was resolved to product ID
      expect(mockRepository.createProduct).toHaveBeenCalledWith({
        name: "Accessory Product",
        slug: "accessory-product",
        productType: "pt-1",
        category: "cat-1",
        attributes: [{ id: "attr-ref", values: ["ref-prod-1"] }],
      });
    });
  });
});
