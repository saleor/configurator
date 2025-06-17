import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProductService } from "./product-service";
import type { ProductOperations } from "./repository";
import type { ProductInput } from "../config/schema";

const mockRepository: ProductOperations = {
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  createProductVariant: vi.fn(),
  updateProductVariant: vi.fn(),
  getProductByName: vi.fn(),
  getProductVariantBySku: vi.fn(),
  getProductTypeByName: vi.fn(),
  getCategoryByName: vi.fn(),
  getCategoryByPath: vi.fn(),
  getAttributeByName: vi.fn(),
};

describe("ProductService", () => {
  let service: ProductService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProductService(mockRepository);
  });

  describe("bootstrapProduct", () => {
    const mockProductInput: ProductInput = {
      name: "Test Book",
      productType: "Book",
      category: "Fiction",
      description: "A test book product",
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
      vi.mocked(mockRepository.getProductByName).mockResolvedValue(null);
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
      });

      expect(mockRepository.createProductVariant).toHaveBeenCalledWith({
        product: "prod-1",
        name: "Hardcover",
        sku: "BOOK-001-HC",
        trackInventory: true,
        weight: 1.2,
        stocks: [{ warehouse: "", quantity: 100 }],
      });

      expect(result.product).toEqual(mockProduct);
      expect(result.variants).toHaveLength(1);
    });

    it("should use existing product when it exists", async () => {
      const existingProduct = {
        id: "prod-1",
        name: "Test Book",
        productType: { id: "pt-1", name: "Book" },
        category: { id: "cat-1", name: "Fiction" },
      };

      vi.mocked(mockRepository.getProductByName).mockResolvedValue(existingProduct);

      const mockVariant = {
        id: "var-1",
        name: "Hardcover",
        sku: "BOOK-001-HC",
        weight: { value: 1.2 },
        channelListings: [],
      };

      vi.mocked(mockRepository.createProductVariant).mockResolvedValue(mockVariant);

      const result = await service.bootstrapProduct(mockProductInput);

      expect(mockRepository.createProduct).not.toHaveBeenCalled();
      expect(result.product).toEqual(existingProduct);
    });

    it("should throw error when product type doesn't exist", async () => {
      vi.mocked(mockRepository.getProductByName).mockResolvedValue(null);
      vi.mocked(mockRepository.getProductTypeByName).mockResolvedValue(null);

      await expect(service.bootstrapProduct(mockProductInput)).rejects.toThrow(
        'Product type "Book" not found'
      );
    });

    it("should throw error when category doesn't exist", async () => {
      vi.mocked(mockRepository.getProductByName).mockResolvedValue(null);
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
          productType: "Book",
          category: "Fiction",
          variants: [{ name: "Default", sku: "B1", channelListings: [] }],
        },
        {
          name: "Book 2", 
          productType: "Book",
          category: "Fiction",
          variants: [{ name: "Default", sku: "B2", channelListings: [] }],
        },
      ];

      // Mock successful responses for all calls
      vi.mocked(mockRepository.getProductByName).mockResolvedValue(null);
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