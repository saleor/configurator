import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductInput } from "../config/schema/schema";
import { PRODUCT_MEDIA_SOURCE_METADATA_KEY } from "./media-metadata";
import { ProductService } from "./product-service";
import type { ProductOperations } from "./repository";

const mockRepository: ProductOperations = {
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  createProductVariant: vi.fn(),
  updateProductVariant: vi.fn(),
  getProductByName: vi.fn(),
  getProductBySlug: vi.fn(),
  getProductsBySlugs: vi.fn(),
  getProductVariantBySku: vi.fn(),
  getProductTypeByName: vi.fn(),
  getCategoryByName: vi.fn(),
  getCategoryBySlug: vi.fn(),
  getCategoryByPath: vi.fn(),
  getAttributeByName: vi.fn(),
  getChannelBySlug: vi.fn(),
  updateProductChannelListings: vi.fn(),
  updateProductVariantChannelListings: vi.fn(),
  listProductMedia: vi.fn(),
  createProductMedia: vi.fn(),
  updateProductMedia: vi.fn(),
  deleteProductMedia: vi.fn(),
  replaceAllProductMedia: vi.fn(),
  bulkCreateProducts: vi.fn(),
  bulkCreateVariants: vi.fn(),
  bulkUpdateVariants: vi.fn(),
};

describe("ProductService", () => {
  let service: ProductService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProductService(mockRepository);
    vi.mocked(mockRepository.listProductMedia).mockResolvedValue([]);
    vi.mocked(mockRepository.createProductMedia).mockResolvedValue({
      id: "media-1",
      url: "https://cdn.example.com/default.jpg",
      alt: "Default",
      type: "IMAGE",
    } as any);
    vi.mocked(mockRepository.updateProductMedia).mockImplementation(
      async (id, input) =>
        ({
          id,
          url: "https://cdn.example.com/default.jpg",
          alt: input.alt ?? "",
          type: "IMAGE",
        }) as any
    );
    vi.mocked(mockRepository.deleteProductMedia).mockResolvedValue();
  });

  describe("resolveProductTypeReference", () => {
    it("should resolve existing product type", async () => {
      vi.mocked(mockRepository.getProductTypeByName).mockResolvedValue({
        id: "pt-123",
        name: "Book",
      });

      // Use reflection to access private method for testing
      const result = await (service as any).resolveProductTypeReference("Book");

      expect(result).toBe("pt-123");
      expect(mockRepository.getProductTypeByName).toHaveBeenCalledWith("Book");
    });

    it("should throw ProductError when product type not found", async () => {
      vi.mocked(mockRepository.getProductTypeByName).mockResolvedValue(null);

      await expect((service as any).resolveProductTypeReference("NonexistentType")).rejects.toThrow(
        'Product type "NonexistentType" not found. Make sure it exists in your productTypes configuration.'
      );
    });
  });

  describe("resolveCategoryReference", () => {
    it("should resolve existing category", async () => {
      vi.mocked(mockRepository.getCategoryByPath).mockResolvedValue({
        id: "cat-456",
        name: "Fiction",
      });

      const result = await (service as any).resolveCategoryReference("fiction");

      expect(result).toBe("cat-456");
      expect(mockRepository.getCategoryByPath).toHaveBeenCalledWith("fiction");
    });

    it("should throw ProductError when category not found", async () => {
      vi.mocked(mockRepository.getCategoryByPath).mockResolvedValue(null);

      await expect((service as any).resolveCategoryReference("nonexistent")).rejects.toThrow(
        "Category \"nonexistent\" not found. Make sure it exists in your categories configuration. Categories must be referenced by their slug (not name). For subcategories, you can reference them directly by slug (e.g., 'juices') or with full path (e.g., 'groceries/juices'). Run introspect command to see available categories."
      );
    });

    it("should throw ProductError with hierarchical path guidance when nested category not found", async () => {
      vi.mocked(mockRepository.getCategoryByPath).mockResolvedValue(null);

      await expect(
        (service as any).resolveCategoryReference("groceries/nonexistent")
      ).rejects.toThrow(
        "Category \"groceries/nonexistent\" not found. Make sure it exists in your categories configuration. Categories must be referenced by their slug (not name). For nested categories, use the format 'parent-slug/child-slug'. Run introspect command to see available categories."
      );
    });
  });

  describe("resolveChannelReference", () => {
    it("should resolve existing channel", async () => {
      vi.mocked(mockRepository.getChannelBySlug).mockResolvedValue({
        id: "ch-789",
        slug: "default-channel",
        name: "Default Channel",
        currencyCode: "USD",
      });

      const result = await (service as any).resolveChannelReference("default-channel");

      expect(result).toBe("ch-789");
      expect(mockRepository.getChannelBySlug).toHaveBeenCalledWith("default-channel");
    });

    it("should throw ProductError when channel not found", async () => {
      vi.mocked(mockRepository.getChannelBySlug).mockResolvedValue(null);

      await expect((service as any).resolveChannelReference("nonexistent-channel")).rejects.toThrow(
        'Channel "nonexistent-channel" not found. Make sure it exists in your channels configuration.'
      );
    });
  });

  describe("resolveChannelListings", () => {
    it("should resolve channel listings with valid channels", async () => {
      vi.mocked(mockRepository.getChannelBySlug)
        .mockResolvedValueOnce({
          id: "ch-1",
          slug: "us-store",
          name: "US Store",
          currencyCode: "USD",
        })
        .mockResolvedValueOnce({
          id: "ch-2",
          slug: "eu-store",
          name: "EU Store",
          currencyCode: "EUR",
        });

      const channelListings = [
        {
          channel: "us-store",
          isPublished: true,
          visibleInListings: true,
        },
        {
          channel: "eu-store",
          isPublished: false,
          visibleInListings: true,
          publishedAt: "2024-01-01",
        },
      ];

      const result = await (service as any).resolveChannelListings(channelListings);

      expect(result).toEqual({
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
            visibleInListings: true,
            publishedAt: "2024-01-01",
          },
        ],
      });
    });

    it("should handle empty channel listings", async () => {
      const result = await (service as any).resolveChannelListings([]);

      expect(result).toEqual({
        updateChannels: [],
      });
    });
  });

  describe("resolveVariantChannelListings", () => {
    it("should resolve variant channel listings with pricing", async () => {
      vi.mocked(mockRepository.getChannelBySlug)
        .mockResolvedValueOnce({
          id: "ch-1",
          slug: "us-store",
          name: "US Store",
          currencyCode: "USD",
        })
        .mockResolvedValueOnce({
          id: "ch-2",
          slug: "eu-store",
          name: "EU Store",
          currencyCode: "EUR",
        });

      const channelListings = [
        {
          channel: "us-store",
          price: 29.99,
          costPrice: 15.0,
        },
        {
          channel: "eu-store",
          price: 24.99,
        },
      ];

      const result = await (service as any).resolveVariantChannelListings(channelListings);

      expect(result).toEqual([
        {
          channelId: "ch-1",
          price: 29.99,
          costPrice: 15.0,
        },
        {
          channelId: "ch-2",
          price: 24.99,
          costPrice: undefined,
        },
      ]);
    });

    it("should handle empty variant channel listings", async () => {
      const result = await (service as any).resolveVariantChannelListings([]);

      expect(result).toEqual([]);
    });
  });

  describe("createProductVariants", () => {
    const mockProduct = {
      id: "prod-1",
      name: "Test Product",
      slug: "test-product",
      productType: { id: "pt-1", name: "Book" },
      category: { id: "cat-1", name: "Fiction" },
      media: [],
    };

    it("should create new variants when SKUs don't exist", async () => {
      vi.mocked(mockRepository.getProductVariantBySku).mockResolvedValue(null);
      vi.mocked(mockRepository.getAttributeByName).mockResolvedValue({
        id: "attr-1",
        name: "format",
        inputType: "PLAIN_TEXT",
        entityType: null,
        choices: null,
      });
      vi.mocked(mockRepository.createProductVariant)
        .mockResolvedValueOnce({
          id: "var-1",
          name: "Hardcover",
          sku: "BOOK-HC-001",
          weight: { value: 1.2 },
          channelListings: [],
        })
        .mockResolvedValueOnce({
          id: "var-2",
          name: "Paperback",
          sku: "BOOK-PB-001",
          weight: { value: 0.8 },
          channelListings: [],
        });

      const variants = [
        {
          name: "Hardcover",
          sku: "BOOK-HC-001",
          weight: 1.2,
          attributes: { format: "hardcover" },
        },
        {
          name: "Paperback",
          sku: "BOOK-PB-001",
          weight: 0.8,
          attributes: { format: "paperback" },
        },
      ];

      const result = await (service as any).createProductVariants(mockProduct, variants);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Hardcover");
      expect(result[1].name).toBe("Paperback");
      expect(mockRepository.createProductVariant).toHaveBeenCalledTimes(2);
      expect(mockRepository.updateProductVariant).not.toHaveBeenCalled();
    });

    it("should update existing variants when SKUs already exist", async () => {
      vi.mocked(mockRepository.getProductVariantBySku).mockResolvedValue({
        id: "existing-var-1",
        name: "Old Name",
        sku: "BOOK-HC-001",
        weight: { value: 1.0 },
        channelListings: [],
      });
      vi.mocked(mockRepository.getAttributeByName).mockResolvedValue({
        id: "attr-1",
        name: "format",
        inputType: "PLAIN_TEXT",
        entityType: null,
        choices: null,
      });
      vi.mocked(mockRepository.updateProductVariant).mockResolvedValue({
        id: "existing-var-1",
        name: "Updated Hardcover",
        sku: "BOOK-HC-001",
        weight: { value: 1.5 },
        channelListings: [],
      });

      const variants = [
        {
          name: "Updated Hardcover",
          sku: "BOOK-HC-001",
          weight: 1.5,
          attributes: { format: "hardcover-deluxe" },
        },
      ];

      const result = await (service as any).createProductVariants(mockProduct, variants);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Updated Hardcover");
      expect(mockRepository.updateProductVariant).toHaveBeenCalledWith("existing-var-1", {
        name: "Updated Hardcover",
        sku: "BOOK-HC-001",
        trackInventory: true,
        weight: 1.5,
        attributes: [{ id: "attr-1", plainText: "hardcover-deluxe" }],
      });
      expect(mockRepository.createProductVariant).not.toHaveBeenCalled();
    });

    it("should handle mixed new and existing variants", async () => {
      vi.mocked(mockRepository.getProductVariantBySku)
        .mockResolvedValueOnce({
          id: "existing-var-1",
          name: "Existing Variant",
          sku: "BOOK-HC-001",
          weight: { value: 1.0 },
          channelListings: [],
        })
        .mockResolvedValueOnce(null); // New variant

      vi.mocked(mockRepository.getAttributeByName).mockResolvedValue({
        id: "attr-1",
        name: "format",
        inputType: "PLAIN_TEXT",
        entityType: null,
        choices: null,
      });

      vi.mocked(mockRepository.updateProductVariant).mockResolvedValue({
        id: "existing-var-1",
        name: "Updated Hardcover",
        sku: "BOOK-HC-001",
        weight: { value: 1.2 },
        channelListings: [],
      });

      vi.mocked(mockRepository.createProductVariant).mockResolvedValue({
        id: "new-var-1",
        name: "Paperback",
        sku: "BOOK-PB-001",
        weight: { value: 0.8 },
        channelListings: [],
      });

      const variants = [
        {
          name: "Updated Hardcover",
          sku: "BOOK-HC-001", // Existing SKU
          weight: 1.2,
          attributes: { format: "hardcover" },
        },
        {
          name: "Paperback",
          sku: "BOOK-PB-001", // New SKU
          weight: 0.8,
          attributes: { format: "paperback" },
        },
      ];

      const result = await (service as any).createProductVariants(mockProduct, variants);

      expect(result).toHaveLength(2);
      expect(mockRepository.updateProductVariant).toHaveBeenCalledTimes(1);
      expect(mockRepository.createProductVariant).toHaveBeenCalledTimes(1);
    });
  });

  describe("description update fallback", () => {
    it("retries product update without description when update fails due to description", async () => {
      const existingProduct = {
        id: "prod-1",
        name: "Test Book",
        slug: "test-book",
        description: "Old desc",
        productType: { id: "pt-1", name: "Book" },
        category: { id: "cat-1", name: "Fiction", slug: "fiction" },
        defaultVariant: { id: "variant-1" },
        variants: [{ id: "variant-1", sku: "BOOK-001", name: "Test Book Variant" }],
        media: [],
      };

      vi.mocked(mockRepository.getProductBySlug).mockResolvedValue(existingProduct);
      vi.mocked(mockRepository.getProductTypeByName).mockResolvedValue({
        id: "pt-1",
        name: "Book",
      });
      vi.mocked(mockRepository.getCategoryByPath).mockResolvedValue({
        id: "cat-1",
        name: "Fiction",
      });

      // First call (with description) fails, second (without) succeeds
      vi.mocked(mockRepository.updateProduct)
        .mockRejectedValueOnce(new Error("Invalid JSON in description"))
        .mockResolvedValueOnce(existingProduct);

      // No variants to simplify
      vi.mocked(mockRepository.getProductVariantBySku).mockResolvedValue(null);
      vi.mocked(mockRepository.createProductVariant).mockResolvedValue({
        id: "var-1",
        name: "Default",
        sku: "B1",
        weight: { value: 0 },
        channelListings: [],
      } as any);

      const input: ProductInput = {
        name: "Test Book",
        slug: "test-book",
        productType: "Book",
        category: "Fiction",
        description: "New description",
        variants: [{ name: "Default", sku: "B1" }],
      };

      await service.bootstrapProduct(input);

      expect(mockRepository.updateProduct).toHaveBeenCalledTimes(2);
    });
  });
  describe("bootstrapProduct", () => {
    const mockProductInput: ProductInput = {
      name: "Test Book",
      slug: "test-book",
      productType: "Book",
      category: "Fiction",
      variants: [
        {
          name: "Hardcover",
          sku: "BOOK-001-HC",
          weight: 1.2,
          channelListings: [],
        },
      ],
    };

    it("should create a new product when it doesn't exist", async () => {
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
      vi.mocked(mockRepository.getProductVariantBySku).mockResolvedValue(null);

      const mockProduct = {
        id: "prod-1",
        name: "Test Book",
        slug: "test-book",
        productType: { id: "pt-1", name: "Book" },
        category: { id: "cat-1", name: "Fiction" },
        media: [],
      };

      const mockVariant = {
        id: "var-1",
        name: "Hardcover",
        sku: "BOOK-001-HC",
        weight: { value: 1.2 },
        channelListings: [],
      };

      vi.mocked(mockRepository.createProduct).mockResolvedValue(mockProduct);
      vi.mocked(mockRepository.createProductVariant).mockResolvedValue(mockVariant);

      const result = await service.bootstrapProduct(mockProductInput);

      expect(mockRepository.createProduct).toHaveBeenCalledWith({
        name: "Test Book",
        slug: "test-book",
        productType: "pt-1",
        category: "cat-1",
        attributes: [],
      });

      expect(mockRepository.createProductVariant).toHaveBeenCalledWith({
        product: "prod-1",
        name: "Hardcover",
        sku: "BOOK-001-HC",
        trackInventory: true,
        weight: 1.2,
        attributes: [],
      });

      expect(result.product).toEqual(mockProduct);
      expect(result.variants).toHaveLength(1);
    });

    it("should use existing product when it exists", async () => {
      const existingProduct = {
        id: "prod-1",
        name: "Test Book",
        slug: "test-book",
        description: "A test book for unit testing",
        productType: { id: "pt-1", name: "Book" },
        category: { id: "cat-1", name: "Fiction", slug: "fiction" },
        defaultVariant: { id: "variant-1" },
        variants: [{ id: "variant-1", sku: "BOOK-001", name: "Test Book Variant" }],
        media: [],
      };

      // Set up all required mocks
      vi.mocked(mockRepository.getProductBySlug).mockResolvedValue(existingProduct);
      vi.mocked(mockRepository.getProductTypeByName).mockResolvedValue({
        id: "pt-1",
        name: "Book",
      });
      vi.mocked(mockRepository.getCategoryByPath).mockResolvedValue({
        id: "cat-1",
        name: "Fiction",
      });
      vi.mocked(mockRepository.getProductVariantBySku).mockResolvedValue(null);

      const mockVariant = {
        id: "var-1",
        name: "Hardcover",
        sku: "BOOK-001-HC",
        weight: { value: 1.2 },
        channelListings: [],
      };

      vi.mocked(mockRepository.updateProduct).mockResolvedValue(existingProduct);
      vi.mocked(mockRepository.createProductVariant).mockResolvedValue(mockVariant);

      const result = await service.bootstrapProduct(mockProductInput);

      expect(mockRepository.createProduct).not.toHaveBeenCalled();
      expect(mockRepository.updateProduct).toHaveBeenCalledWith("prod-1", {
        name: "Test Book",
        slug: "test-book",
        category: "cat-1",
        attributes: [],
      });
      expect(result.product).toEqual(existingProduct);
    });

    it("should create external product media when provided", async () => {
      vi.mocked(mockRepository.getProductBySlug).mockResolvedValue(null);
      vi.mocked(mockRepository.getProductTypeByName).mockResolvedValue({
        id: "pt-1",
        name: "Book",
      });
      vi.mocked(mockRepository.getCategoryByPath).mockResolvedValue({
        id: "cat-1",
        name: "Fiction",
      });
      vi.mocked(mockRepository.getProductVariantBySku).mockResolvedValue(null);

      const mockProduct = {
        id: "prod-1",
        name: "Test Book",
        slug: "test-book",
        productType: { id: "pt-1", name: "Book" },
        category: { id: "cat-1", name: "Fiction" },
        media: [],
      };

      const mockVariant = {
        id: "var-1",
        name: "Hardcover",
        sku: "BOOK-001-HC",
        channelListings: [],
      };

      vi.mocked(mockRepository.createProduct).mockResolvedValue(mockProduct);
      vi.mocked(mockRepository.createProductVariant).mockResolvedValue(mockVariant as any);
      vi.mocked(mockRepository.listProductMedia).mockResolvedValueOnce([]);

      await service.bootstrapProduct({
        ...mockProductInput,
        media: [
          {
            externalUrl: "https://cdn.example.com/promo.jpg",
            alt: "Promo shot",
          },
        ],
      });

      expect(mockRepository.replaceAllProductMedia).toHaveBeenCalledWith("prod-1", [
        {
          product: "prod-1",
          mediaUrl: "https://cdn.example.com/promo.jpg",
          alt: "Promo shot",
        },
      ]);
    });

    it("should update alt text when product media already exists", async () => {
      const existingProduct = {
        id: "prod-1",
        name: "Test Book",
        slug: "test-book",
        productType: { id: "pt-1", name: "Book" },
        category: { id: "cat-1", name: "Fiction", slug: "fiction" },
      };

      vi.mocked(mockRepository.getProductBySlug).mockResolvedValue(existingProduct as any);
      vi.mocked(mockRepository.getProductTypeByName).mockResolvedValue({
        id: "pt-1",
        name: "Book",
      });
      vi.mocked(mockRepository.getCategoryByPath).mockResolvedValue({
        id: "cat-1",
        name: "Fiction",
      });
      vi.mocked(mockRepository.getProductVariantBySku).mockResolvedValue(null);
      vi.mocked(mockRepository.updateProduct).mockResolvedValue(existingProduct as any);
      vi.mocked(mockRepository.listProductMedia).mockResolvedValueOnce([
        {
          id: "media-1",
          url: "https://cdn.example.com/promo.jpg",
          alt: "Old alt",
          type: "IMAGE",
        } as any,
      ]);

      await service.bootstrapProduct({
        ...mockProductInput,
        media: [
          {
            externalUrl: "https://cdn.example.com/promo.jpg",
            alt: "New alt",
          },
        ],
      });

      expect(mockRepository.replaceAllProductMedia).toHaveBeenCalledWith("prod-1", [
        {
          product: "prod-1",
          mediaUrl: "https://cdn.example.com/promo.jpg",
          alt: "New alt",
        },
      ]);
    });

    it("should not create duplicate media entries for repeated URLs", async () => {
      vi.mocked(mockRepository.getProductBySlug).mockResolvedValue(null);
      vi.mocked(mockRepository.getProductTypeByName).mockResolvedValue({
        id: "pt-1",
        name: "Book",
      });
      vi.mocked(mockRepository.getCategoryByPath).mockResolvedValue({
        id: "cat-1",
        name: "Fiction",
      });
      vi.mocked(mockRepository.getProductVariantBySku).mockResolvedValue(null);

      const mockProduct = {
        id: "prod-1",
        name: "Test Book",
        slug: "test-book",
        productType: { id: "pt-1", name: "Book" },
        category: { id: "cat-1", name: "Fiction" },
        media: [],
      };

      vi.mocked(mockRepository.createProduct).mockResolvedValue(mockProduct as any);
      vi.mocked(mockRepository.createProductVariant).mockResolvedValue({
        id: "variant-1",
        name: "Hardcover",
        sku: "BOOK-001-HC",
        channelListings: [],
      } as any);

      await service.bootstrapProduct({
        ...mockProductInput,
        media: [
          { externalUrl: "https://cdn.example.com/promo.jpg" },
          { externalUrl: "https://cdn.example.com/promo.jpg", alt: "Duplicate alt" },
        ],
      });

      expect(mockRepository.replaceAllProductMedia).toHaveBeenCalledWith("prod-1", [
        {
          product: "prod-1",
          mediaUrl: "https://cdn.example.com/promo.jpg",
          // Only first occurrence should be kept, no alt text
        },
      ]);
    });

    it("should throw error when product type doesn't exist", async () => {
      vi.mocked(mockRepository.getProductBySlug).mockResolvedValue(null);
      vi.mocked(mockRepository.getProductTypeByName).mockResolvedValue(null);

      await expect(service.bootstrapProduct(mockProductInput)).rejects.toThrow(
        'Product type "Book" not found'
      );
    });

    it("should throw error when category doesn't exist", async () => {
      vi.mocked(mockRepository.getProductBySlug).mockResolvedValue(null);
      vi.mocked(mockRepository.getProductTypeByName).mockResolvedValue({
        id: "pt-1",
        name: "Book",
      });
      vi.mocked(mockRepository.getCategoryByPath).mockResolvedValue(null);

      await expect(service.bootstrapProduct(mockProductInput)).rejects.toThrow(
        'Category "Fiction" not found'
      );
    });
  });

  describe("bootstrapProducts", () => {
    it("should process multiple products sequentially", async () => {
      const products: ProductInput[] = [
        {
          name: "Book 1",
          slug: "book-1",
          productType: "Book",
          category: "Fiction",
          variants: [{ name: "Default", sku: "B1", channelListings: [] }],
        },
        {
          name: "Book 2",
          slug: "book-2",
          productType: "Book",
          category: "Fiction",
          variants: [{ name: "Default", sku: "B2", channelListings: [] }],
        },
      ];

      // Mock successful responses for all calls
      vi.mocked(mockRepository.getProductBySlug).mockResolvedValue(null);
      vi.mocked(mockRepository.getProductTypeByName).mockResolvedValue({
        id: "pt-1",
        name: "Book",
      });
      vi.mocked(mockRepository.getCategoryByPath).mockResolvedValue({
        id: "cat-1",
        name: "Fiction",
      });
      vi.mocked(mockRepository.getProductVariantBySku).mockResolvedValue(null);
      vi.mocked(mockRepository.createProduct).mockResolvedValue({
        id: "prod-1",
        name: "Book 1",
        slug: "book-1",
        productType: { id: "pt-1", name: "Book" },
        category: { id: "cat-1", name: "Fiction" },
        media: [],
      });
      vi.mocked(mockRepository.createProductVariant).mockResolvedValue({
        id: "var-1",
        name: "Default",
        sku: "B1",
        weight: { value: 0 },
        channelListings: [],
      });

      await service.bootstrapProducts(products);

      expect(mockRepository.createProduct).toHaveBeenCalledTimes(2);
      expect(mockRepository.createProductVariant).toHaveBeenCalledTimes(2);
    });
  });

  describe("syncProductMedia - Media Replacement", () => {
    const mockProduct = {
      id: "prod-1",
      name: "Test Product",
      slug: "test-product",
      productType: { id: "pt-1", name: "Book" },
      category: { id: "cat-1", name: "Fiction" },
      media: [],
    };

    beforeEach(() => {
      vi.mocked(mockRepository.replaceAllProductMedia).mockResolvedValue([
        {
          id: "media-1",
          url: "https://example.com/image1.jpg",
          alt: "Image 1",
          type: "IMAGE",
        },
        {
          id: "media-2",
          url: "https://example.com/image2.jpg",
          alt: "Image 2",
          type: "IMAGE",
        },
      ] as any);
    });

    it("should replace all media when provided with new media URLs", async () => {
      const mediaInputs = [
        { externalUrl: "https://example.com/image1.jpg", alt: "Image 1" },
        { externalUrl: "https://example.com/image2.jpg", alt: "Image 2" },
      ];

      await (service as any).syncProductMedia(mockProduct, mediaInputs);

      expect(mockRepository.replaceAllProductMedia).toHaveBeenCalledTimes(1);
      expect(mockRepository.replaceAllProductMedia).toHaveBeenCalledWith("prod-1", [
        {
          product: "prod-1",
          mediaUrl: "https://example.com/image1.jpg",
          alt: "Image 1",
        },
        {
          product: "prod-1",
          mediaUrl: "https://example.com/image2.jpg",
          alt: "Image 2",
        },
      ]);
    });

    it("should handle empty media array by skipping when no changes needed", async () => {
      // Mock existing empty media (equivalent to desired empty array)
      vi.mocked(mockRepository.listProductMedia).mockResolvedValue([]);

      await (service as any).syncProductMedia(mockProduct, []);

      expect(mockRepository.listProductMedia).toHaveBeenCalledWith("prod-1");
      // Should skip replacement since both arrays are empty (equivalent)
      expect(mockRepository.replaceAllProductMedia).not.toHaveBeenCalled();
    });

    it("should filter out invalid media URLs and normalize valid ones", async () => {
      const mediaInputs = [
        { externalUrl: "  https://example.com/image1.jpg  ", alt: "Image 1" },
        { externalUrl: "", alt: "Empty URL" }, // Should be filtered out
        { externalUrl: "https://example.com/image2.jpg", alt: "Image 2" },
        { externalUrl: null as any, alt: "Null URL" }, // Should be filtered out
      ];

      await (service as any).syncProductMedia(mockProduct, mediaInputs);

      expect(mockRepository.replaceAllProductMedia).toHaveBeenCalledTimes(1);
      expect(mockRepository.replaceAllProductMedia).toHaveBeenCalledWith("prod-1", [
        {
          product: "prod-1",
          mediaUrl: "https://example.com/image1.jpg", // Normalized (trimmed)
          alt: "Image 1",
        },
        {
          product: "prod-1",
          mediaUrl: "https://example.com/image2.jpg",
          alt: "Image 2",
        },
      ]);
    });

    it("should deduplicate media URLs keeping first occurrence", async () => {
      const mediaInputs = [
        { externalUrl: "https://example.com/image1.jpg", alt: "Image 1 First" },
        { externalUrl: "https://example.com/image2.jpg", alt: "Image 2" },
        { externalUrl: "https://example.com/image1.jpg", alt: "Image 1 Duplicate" }, // Should be filtered out
      ];

      await (service as any).syncProductMedia(mockProduct, mediaInputs);

      expect(mockRepository.replaceAllProductMedia).toHaveBeenCalledTimes(1);
      expect(mockRepository.replaceAllProductMedia).toHaveBeenCalledWith("prod-1", [
        {
          product: "prod-1",
          mediaUrl: "https://example.com/image1.jpg",
          alt: "Image 1 First", // First occurrence kept
        },
        {
          product: "prod-1",
          mediaUrl: "https://example.com/image2.jpg",
          alt: "Image 2",
        },
      ]);
    });

    it("should handle media without alt text", async () => {
      const mediaInputs = [
        { externalUrl: "https://example.com/image1.jpg" }, // No alt
        { externalUrl: "https://example.com/image2.jpg", alt: "Image 2" },
      ];

      await (service as any).syncProductMedia(mockProduct, mediaInputs);

      expect(mockRepository.replaceAllProductMedia).toHaveBeenCalledWith("prod-1", [
        {
          product: "prod-1",
          mediaUrl: "https://example.com/image1.jpg",
          // alt should not be included if not provided
        },
        {
          product: "prod-1",
          mediaUrl: "https://example.com/image2.jpg",
          alt: "Image 2",
        },
      ]);
    });

    it("should use product slug as reference in debug logs when available", async () => {
      const productWithSlug = { ...mockProduct, slug: "test-product-slug" } as any;
      const mediaInputs = [{ externalUrl: "https://example.com/image1.jpg" }];

      await (service as any).syncProductMedia(productWithSlug, mediaInputs);

      expect(mockRepository.replaceAllProductMedia).toHaveBeenCalledTimes(1);
      // The method should still use the product ID for the actual API call
      expect(mockRepository.replaceAllProductMedia).toHaveBeenCalledWith("prod-1", [
        {
          product: "prod-1",
          mediaUrl: "https://example.com/image1.jpg",
        },
      ]);
    });

    it("should propagate errors from replaceAllProductMedia", async () => {
      const error = new Error("Failed to replace media");
      vi.mocked(mockRepository.replaceAllProductMedia).mockRejectedValue(error);
      vi.mocked(mockRepository.listProductMedia).mockResolvedValue([]); // No existing media

      const mediaInputs = [{ externalUrl: "https://example.com/image1.jpg" }];

      await expect((service as any).syncProductMedia(mockProduct, mediaInputs)).rejects.toThrow(
        "Failed to replace media"
      );
    });
  });

  describe("Intelligent Media Comparison - URL Transformation Handling", () => {
    const mockProduct = {
      id: "prod-1",
      name: "Test Product",
      slug: "test-product",
      productType: { id: "pt-1", name: "Book" },
      category: { id: "cat-1", name: "Fiction" },
      media: [],
    };

    beforeEach(() => {
      vi.mocked(mockRepository.listProductMedia).mockResolvedValue([]);
    });

    describe("extractMediaFingerprint", () => {
      it("should extract media ID from Saleor thumbnail URLs", () => {
        const service = new ProductService(mockRepository);
        const saleorUrl =
          "https://store-rzalldyg.saleor.cloud/thumbnail/UHJvZHVjdE1lZGlhOjg5/4096/";

        const fingerprint = (service as any).extractMediaFingerprint(saleorUrl);

        expect(fingerprint).toBe("saleor:UHJvZHVjdE1lZGlhOjg5");
      });

      it("should create domain+filename fingerprint for external URLs", () => {
        const service = new ProductService(mockRepository);
        const externalUrl = "https://upload.wikimedia.org/commons/9/94/Ashmolean.jpg";

        const fingerprint = (service as any).extractMediaFingerprint(externalUrl);

        expect(fingerprint).toBe("external:upload.wikimedia.org:Ashmolean.jpg");
      });

      it("should handle URLs without filenames", () => {
        const service = new ProductService(mockRepository);
        const urlWithoutFilename = "https://example.com/path/";

        const fingerprint = (service as any).extractMediaFingerprint(urlWithoutFilename);

        expect(fingerprint).toBe("external:example.com:");
      });

      it("should fallback to normalized URL for invalid URLs", () => {
        const service = new ProductService(mockRepository);
        const invalidUrl = "not-a-valid-url";

        const fingerprint = (service as any).extractMediaFingerprint(invalidUrl);

        expect(fingerprint).toBe("url:not-a-valid-url");
      });
    });

    describe("areMediaArraysEquivalent", () => {
      it("should consider arrays equivalent when counts differ", () => {
        const service = new ProductService(mockRepository);
        const desired = [{ externalUrl: "https://example.com/image1.jpg" }];
        const existing = [
          { url: "https://example.com/image1.jpg", alt: undefined },
          { url: "https://example.com/image2.jpg", alt: undefined },
        ];

        const result = (service as any).areMediaArraysEquivalent(desired, existing);

        expect(result).toBe(false);
      });

      it("should consider empty arrays equivalent", () => {
        const service = new ProductService(mockRepository);
        const desired: any[] = [];
        const existing: any[] = [];

        const result = (service as any).areMediaArraysEquivalent(desired, existing);

        expect(result).toBe(true);
      });

      it("should recognize same content when metadata stores the source URL", () => {
        const service = new ProductService(mockRepository);
        const desired = [
          {
            externalUrl: "https://upload.wikimedia.org/commons/9/94/Ashmolean.jpg",
            alt: "Museum photo",
          },
        ];
        const existing = [
          {
            url: "https://store-rzalldyg.saleor.cloud/thumbnail/UHJvZHVjdE1lZGlhOjg5/4096/",
            alt: "Museum photo",
            metadata: [
              {
                key: PRODUCT_MEDIA_SOURCE_METADATA_KEY,
                value: "https://upload.wikimedia.org/commons/9/94/Ashmolean.jpg",
              },
            ],
          },
        ];

        const result = (service as any).areMediaArraysEquivalent(desired, existing);

        expect(result).toBe(true);
      });

      it("should detect alt text differences", () => {
        const service = new ProductService(mockRepository);
        const desired = [
          {
            externalUrl: "https://example.com/image.jpg",
            alt: "New alt text",
          },
        ];
        const existing = [
          {
            url: "https://example.com/image.jpg",
            alt: "Old alt text",
          },
        ];

        const result = (service as any).areMediaArraysEquivalent(desired, existing);

        expect(result).toBe(false);
      });

      it("should handle missing alt text correctly", () => {
        const service = new ProductService(mockRepository);
        const desired = [{ externalUrl: "https://example.com/image.jpg" }]; // No alt
        const existing = [{ url: "https://example.com/image.jpg", alt: undefined }];

        const result = (service as any).areMediaArraysEquivalent(desired, existing);

        expect(result).toBe(true);
      });
    });

    describe("syncProductMedia with intelligent comparison", () => {
      it("should skip update when media is functionally equivalent", async () => {
        const service = new ProductService(mockRepository);

        // Mock existing media that's equivalent to what we want to set
        vi.mocked(mockRepository.listProductMedia).mockResolvedValue([
          {
            id: "media-1",
            url: "https://store-rzalldyg.saleor.cloud/thumbnail/UHJvZHVjdE1lZGlhOjg5/4096/",
            alt: "Test image",
            type: "IMAGE",
            metadata: [
              {
                key: PRODUCT_MEDIA_SOURCE_METADATA_KEY,
                value: "https://upload.wikimedia.org/commons/9/94/Ashmolean.jpg",
              },
            ],
          },
        ]);

        const mediaInputs = [
          {
            externalUrl: "https://upload.wikimedia.org/commons/9/94/Ashmolean.jpg",
            alt: "Test image",
          },
        ];

        await (service as any).syncProductMedia(mockProduct, mediaInputs);

        // Should fetch existing media for comparison
        expect(mockRepository.listProductMedia).toHaveBeenCalledWith("prod-1");

        // Should NOT call replaceAllProductMedia since media is equivalent
        expect(mockRepository.replaceAllProductMedia).not.toHaveBeenCalled();
      });

      it("should perform update when media differs", async () => {
        const service = new ProductService(mockRepository);

        // Mock existing media that's different from what we want
        vi.mocked(mockRepository.listProductMedia).mockResolvedValue([
          {
            id: "media-1",
            url: "https://example.com/old-image.jpg",
            alt: "Old image",
            type: "IMAGE",
            metadata: [
              {
                key: PRODUCT_MEDIA_SOURCE_METADATA_KEY,
                value: "https://example.com/old-image.jpg",
              },
            ],
          } as any,
        ]);

        // Mock successful replacement
        vi.mocked(mockRepository.replaceAllProductMedia).mockResolvedValue([
          {
            id: "media-2",
            url: "https://example.com/new-image.jpg",
            alt: "New image",
            type: "IMAGE",
          } as any,
        ]);

        const mediaInputs = [
          {
            externalUrl: "https://example.com/new-image.jpg",
            alt: "New image",
          },
        ];

        await (service as any).syncProductMedia(mockProduct, mediaInputs);

        // Should fetch existing media for comparison
        expect(mockRepository.listProductMedia).toHaveBeenCalledWith("prod-1");

        // Should call replaceAllProductMedia since media differs
        expect(mockRepository.replaceAllProductMedia).toHaveBeenCalledWith("prod-1", [
          {
            product: "prod-1",
            mediaUrl: "https://example.com/new-image.jpg",
            alt: "New image",
          },
        ]);
      });

      it("should handle errors during media comparison gracefully", async () => {
        const service = new ProductService(mockRepository);

        // Mock listProductMedia to throw an error
        const error = new Error("Failed to fetch existing media");
        vi.mocked(mockRepository.listProductMedia).mockRejectedValue(error);

        const mediaInputs = [{ externalUrl: "https://example.com/image.jpg" }];

        await expect((service as any).syncProductMedia(mockProduct, mediaInputs)).rejects.toThrow(
          "Failed to fetch existing media"
        );
      });
    });
  });

  describe("CXE-1194: Bulk variant creation groups by product", () => {
    beforeEach(() => {
      // Setup common mocks for bulk operations
      vi.mocked(mockRepository.getProductsBySlugs).mockResolvedValue([]);
      vi.mocked(mockRepository.getProductTypeByName).mockResolvedValue({
        id: "pt-1",
        name: "Book",
      });
      vi.mocked(mockRepository.getCategoryByPath).mockResolvedValue({
        id: "cat-1",
        name: "Fiction",
      });
    });

    it("should call bulkCreateVariants with product ID at top level", async () => {
      // Setup: Mock successful product creation
      vi.mocked(mockRepository.bulkCreateProducts).mockResolvedValue({
        count: 1,
        results: [
          {
            product: {
              id: "product-123",
              name: "Test Product",
              slug: "test-product",
              description: null,
              productType: { id: "pt-1", name: "Book" },
              category: { id: "cat-1", name: "Fiction" },
              channelListings: [],
              media: [],
            },
            errors: [],
          },
        ],
        errors: [],
      });

      vi.mocked(mockRepository.bulkCreateVariants).mockResolvedValue({
        productVariants: [{ id: "variant-1", name: "Variant 1", sku: "SKU-1" }],
        results: [{ productVariant: { id: "variant-1", sku: "SKU-1" }, errors: [] }],
        errors: [],
      } as any);

      // Execute: Bootstrap products with variants
      await service.bootstrapProductsBulk([
        {
          name: "Test Product",
          slug: "test-product",
          productType: "Book",
          category: "Fiction",
          variants: [{ name: "Variant 1", sku: "SKU-1" }],
        },
      ]);

      // Assert: Verify product ID is at top level, not in variant input
      expect(mockRepository.bulkCreateVariants).toHaveBeenCalledWith(
        expect.objectContaining({
          product: "product-123", // Product ID at top level
        })
      );

      // Verify the variant inputs don't contain product field
      const callArgs = vi.mocked(mockRepository.bulkCreateVariants).mock.calls[0][0];
      expect(callArgs.variants).toBeDefined();
      expect(callArgs.variants[0]).not.toHaveProperty("product");
    });

    it("should group variants by product when creating for multiple products", async () => {
      // Setup: Two products created
      vi.mocked(mockRepository.bulkCreateProducts).mockResolvedValue({
        count: 2,
        results: [
          {
            product: {
              id: "product-A",
              name: "Product A",
              slug: "product-a",
              description: null,
              productType: { id: "pt-1", name: "Book" },
              category: { id: "cat-1", name: "Fiction" },
              channelListings: [],
              media: [],
            },
            errors: [],
          },
          {
            product: {
              id: "product-B",
              name: "Product B",
              slug: "product-b",
              description: null,
              productType: { id: "pt-1", name: "Book" },
              category: { id: "cat-1", name: "Fiction" },
              channelListings: [],
              media: [],
            },
            errors: [],
          },
        ],
        errors: [],
      });

      vi.mocked(mockRepository.bulkCreateVariants).mockResolvedValue({
        productVariants: [],
        results: [],
        errors: [],
      } as any);

      // Execute
      await service.bootstrapProductsBulk([
        {
          name: "Product A",
          slug: "product-a",
          productType: "Book",
          category: "Fiction",
          variants: [{ name: "V1", sku: "SKU-A1" }],
        },
        {
          name: "Product B",
          slug: "product-b",
          productType: "Book",
          category: "Fiction",
          variants: [{ name: "V2", sku: "SKU-B1" }],
        },
      ]);

      // Assert: Called once per product (not once for all variants)
      expect(mockRepository.bulkCreateVariants).toHaveBeenCalledTimes(2);

      // Verify each call has the correct product ID
      const calls = vi.mocked(mockRepository.bulkCreateVariants).mock.calls;
      const productIds = calls.map((call) => call[0].product);
      expect(productIds).toContain("product-A");
      expect(productIds).toContain("product-B");
    });

    it("should include channelListings in bulk create input instead of updating separately", async () => {
      // Setup: Mock channel resolution
      vi.mocked(mockRepository.getChannelBySlug).mockResolvedValue({
        id: "channel-123",
        name: "Default Channel",
      } as any);

      vi.mocked(mockRepository.bulkCreateProducts).mockResolvedValue({
        count: 1,
        results: [
          {
            product: {
              id: "product-123",
              name: "Test Product",
              slug: "test-product",
              description: null,
              productType: { id: "pt-1", name: "Book" },
              category: { id: "cat-1", name: "Fiction" },
              channelListings: [],
              media: [],
            },
            errors: [],
          },
        ],
        errors: [],
      });

      vi.mocked(mockRepository.bulkCreateVariants).mockResolvedValue({
        productVariants: [{ id: "variant-1", name: "Variant 1", sku: "SKU-1" }],
        results: [{ productVariant: { id: "variant-1", sku: "SKU-1" }, errors: [] }],
        errors: [],
      } as any);

      // Execute: Bootstrap products with variants that have channel listings
      await service.bootstrapProductsBulk([
        {
          name: "Test Product",
          slug: "test-product",
          productType: "Book",
          category: "Fiction",
          variants: [
            {
              name: "Variant 1",
              sku: "SKU-1",
              channelListings: [
                {
                  channel: "default-channel",
                  price: 19.99,
                  costPrice: 10.0,
                },
              ],
            },
          ],
        },
      ]);

      // Assert: Verify channelListings are included in bulk create call
      expect(mockRepository.bulkCreateVariants).toHaveBeenCalledWith(
        expect.objectContaining({
          product: "product-123",
          variants: expect.arrayContaining([
            expect.objectContaining({
              sku: "SKU-1",
              channelListings: [
                {
                  channelId: "channel-123",
                  price: 19.99,
                  costPrice: 10.0,
                },
              ],
            }),
          ]),
        })
      );

      // Assert: Verify updateProductVariantChannelListings is NOT called
      // (channel listings should be set during bulk create, not separately)
      expect(mockRepository.updateProductVariantChannelListings).not.toHaveBeenCalled();
    });
  });
});
