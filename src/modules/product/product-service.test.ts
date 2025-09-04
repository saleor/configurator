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

describe("ProductService", () => {
  let service: ProductService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProductService(mockRepository);
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

      await expect((service as any).resolveProductTypeReference("NonexistentType"))
        .rejects.toThrow('Product type "NonexistentType" not found. Make sure it exists in your productTypes configuration.');
    });
  });

  describe("resolveCategoryReference", () => {
    it("should resolve existing category", async () => {
      vi.mocked(mockRepository.getCategoryByPath).mockResolvedValue({
        id: "cat-456",
        name: "Fiction",
        slug: "fiction",
      });

      const result = await (service as any).resolveCategoryReference("fiction");

      expect(result).toBe("cat-456");
      expect(mockRepository.getCategoryByPath).toHaveBeenCalledWith("fiction");
    });

    it("should throw ProductError when category not found", async () => {
      vi.mocked(mockRepository.getCategoryByPath).mockResolvedValue(null);

      await expect((service as any).resolveCategoryReference("nonexistent"))
        .rejects.toThrow('Category "nonexistent" not found. Make sure it exists in your categories configuration. Categories must be referenced by their slug (not name). For subcategories, you can reference them directly by slug (e.g., \'juices\') or with full path (e.g., \'groceries/juices\'). Run introspect command to see available categories.');
    });

    it("should throw ProductError with hierarchical path guidance when nested category not found", async () => {
      vi.mocked(mockRepository.getCategoryByPath).mockResolvedValue(null);

      await expect((service as any).resolveCategoryReference("groceries/nonexistent"))
        .rejects.toThrow('Category "groceries/nonexistent" not found. Make sure it exists in your categories configuration. Categories must be referenced by their slug (not name). For nested categories, use the format \'parent-slug/child-slug\'. Run introspect command to see available categories.');
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

      await expect((service as any).resolveChannelReference("nonexistent-channel"))
        .rejects.toThrow('Channel "nonexistent-channel" not found. Make sure it exists in your channels configuration.');
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
          costPrice: 15.00,
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
          costPrice: 15.00,
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
    };

    it("should create new variants when SKUs don't exist", async () => {
      vi.mocked(mockRepository.getProductVariantBySku).mockResolvedValue(null);
      vi.mocked(mockRepository.getAttributeByName).mockResolvedValue({
        id: "attr-1",
        name: "format",
        inputType: "PLAIN_TEXT",
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
        attributes: [{ id: "attr-1", values: ["hardcover-deluxe"] }],
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
        productType: { id: "pt-1", name: "Book" },
        category: { id: "cat-1", name: "Fiction" },
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
        productType: { id: "pt-1", name: "Book" },
        category: { id: "cat-1", name: "Fiction" },
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
});
