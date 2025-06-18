import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProductService } from "./product-service";
import type { ProductOperations, Product } from "./repository";
import type { ChannelService } from "../channel/channel-service";
import type { ProductTypeService } from "../product-type/product-type-service";
import type { CategoryService } from "../category/category-service";
import type { CollectionService } from "../collection/collection-service";
import type { AttributeService } from "../attribute/attribute-service";

describe("ProductService", () => {
  let service: ProductService;
  let mockRepository: ProductOperations;
  let mockChannelService: ChannelService;
  let mockProductTypeService: ProductTypeService;
  let mockCategoryService: CategoryService;
  let mockCollectionService: CollectionService;
  let mockAttributeService: AttributeService;

  beforeEach(() => {
    mockRepository = {
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      getProductBySlug: vi.fn(),
      updateProductChannelListings: vi.fn(),
      addProductsToCollection: vi.fn(),
    };
    
    mockChannelService = {
      getAllChannels: vi.fn().mockResolvedValue([
        { id: "channel-1", slug: "default", name: "Default" },
        { id: "channel-2", slug: "mobile", name: "Mobile" },
      ]),
    } as any;

    mockProductTypeService = {
      getProductTypeByName: vi.fn(),
    } as any;

    mockCategoryService = {
      getCategoryBySlug: vi.fn(),
    } as any;

    mockCollectionService = {} as any;

    mockAttributeService = {
      getAttributeByName: vi.fn(),
    } as any;

    service = new ProductService(
      mockRepository,
      mockChannelService,
      mockProductTypeService,
      mockCategoryService,
      mockCollectionService,
      mockAttributeService
    );
  });

  describe("upsertProducts", () => {
    it("should create product when it doesn't exist", async () => {
      // Arrange
      const productInput = {
        name: "Test Product",
        slug: "test-product",
        description: "A test product",
        productTypeName: "Book",
        categorySlug: "fiction",
        weight: 0.5,
        rating: 4.5,
        attributes: [
          { name: "Author", value: "John Doe" },
          { name: "Pages", value: 300 },
        ],
        channelListings: [
          {
            channelSlug: "default",
            isPublished: true,
            visibleInListings: true,
            isAvailableForPurchase: true,
          },
        ],
      };

      const productType = { id: "pt-1", name: "Book" };
      const category = { id: "cat-1", name: "Fiction", slug: "fiction" };
      const attribute1 = { id: "attr-1", name: "Author", inputType: "PLAIN_TEXT" as const };
      const attribute2 = { id: "attr-2", name: "Pages", inputType: "NUMERIC" as const };

      const createdProduct: Product = {
        id: "1",
        name: "Test Product",
        slug: "test-product",
        productType: { id: "pt-1", name: "Book" },
        category: { id: "cat-1", name: "Fiction" },
        collections: [],
      };

      vi.mocked(mockRepository.getProductBySlug).mockResolvedValue(null);
      vi.mocked(mockProductTypeService.getProductTypeByName).mockResolvedValue(productType);
      vi.mocked(mockCategoryService.getCategoryBySlug).mockResolvedValue(category);
      vi.mocked(mockAttributeService.getAttributeByName)
        .mockResolvedValueOnce(attribute1)
        .mockResolvedValueOnce(attribute2);
      vi.mocked(mockRepository.createProduct).mockResolvedValue(createdProduct);
      vi.mocked(mockRepository.updateProductChannelListings).mockResolvedValue(createdProduct);

      // Act
      await service.upsertProducts([productInput]);

      // Assert
      expect(mockRepository.getProductBySlug).toHaveBeenCalledWith("test-product", "default");
      expect(mockProductTypeService.getProductTypeByName).toHaveBeenCalledWith("Book");
      expect(mockCategoryService.getCategoryBySlug).toHaveBeenCalledWith("fiction");
      expect(mockAttributeService.getAttributeByName).toHaveBeenCalledWith("Author");
      expect(mockAttributeService.getAttributeByName).toHaveBeenCalledWith("Pages");
      
      expect(mockRepository.createProduct).toHaveBeenCalledWith({
        name: "Test Product",
        slug: "test-product",
        description: "A test product",
        productType: "pt-1",
        category: "cat-1",
        attributes: [
          { id: "attr-1", plainText: "John Doe" },
          { id: "attr-2", numeric: "300" },
        ],
        weight: 0.5,
        rating: 4.5,
      });

      expect(mockRepository.updateProductChannelListings).toHaveBeenCalledWith("1", {
        updateChannels: [
          {
            channelId: "channel-1",
            isPublished: true,
            publishedAt: undefined,
            visibleInListings: true,
            isAvailableForPurchase: true,
            availableForPurchaseAt: undefined,
          },
        ],
      });
    });

    it("should update product when it exists", async () => {
      // Arrange
      const productInput = {
        name: "Updated Product",
        slug: "test-product",
        description: "Updated description",
        productTypeName: "Book",
      };

      const existingProduct: Product = {
        id: "1",
        name: "Test Product",
        slug: "test-product",
        productType: { id: "pt-1", name: "Book" },
      };

      vi.mocked(mockRepository.getProductBySlug).mockResolvedValue(existingProduct);
      vi.mocked(mockRepository.updateProduct).mockResolvedValue({
        ...existingProduct,
        name: "Updated Product",
        description: "Updated description",
      });

      // Act
      await service.upsertProducts([productInput]);

      // Assert
      expect(mockRepository.getProductBySlug).toHaveBeenCalledWith("test-product", "default");
      expect(mockRepository.updateProduct).toHaveBeenCalledWith("1", {
        name: "Updated Product",
        description: "Updated description",
        category: undefined,
        attributes: [],
        weight: undefined,
        rating: undefined,
      });
      expect(mockRepository.createProduct).not.toHaveBeenCalled();
    });

    it("should handle different attribute input types", async () => {
      // Arrange
      const productInput = {
        name: "Complex Product",
        slug: "complex-product",
        productTypeName: "Complex",
        attributes: [
          { name: "Dropdown", value: "Option1" },
          { name: "Multiselect", value: ["A", "B"] },
          { name: "Boolean", value: true },
          { name: "Date", value: "2024-01-01" },
          { name: "RichText", value: "<p>Rich content</p>" },
        ],
      };

      const productType = { id: "pt-1", name: "Complex" };
      const attributes = [
        { id: "attr-1", name: "Dropdown", inputType: "DROPDOWN" as const },
        { id: "attr-2", name: "Multiselect", inputType: "MULTISELECT" as const },
        { id: "attr-3", name: "Boolean", inputType: "BOOLEAN" as const },
        { id: "attr-4", name: "Date", inputType: "DATE" as const },
        { id: "attr-5", name: "RichText", inputType: "RICH_TEXT" as const },
      ];

      vi.mocked(mockRepository.getProductBySlug).mockResolvedValue(null);
      vi.mocked(mockProductTypeService.getProductTypeByName).mockResolvedValue(productType);
      attributes.forEach((attr, index) => {
        vi.mocked(mockAttributeService.getAttributeByName).mockResolvedValueOnce(attr);
      });
      vi.mocked(mockRepository.createProduct).mockResolvedValue({ id: "1" } as Product);

      // Act
      await service.upsertProducts([productInput]);

      // Assert
      expect(mockRepository.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: [
            { id: "attr-1", dropdown: { value: "Option1" } },
            { id: "attr-2", multiselect: [{ value: "A" }, { value: "B" }] },
            { id: "attr-3", boolean: true },
            { id: "attr-4", date: "2024-01-01" },
            { id: "attr-5", richText: "<p>Rich content</p>" },
          ],
        })
      );
    });

    it("should throw error if product type not found", async () => {
      // Arrange
      const productInput = {
        name: "Test Product",
        slug: "test-product",
        productTypeName: "NonExistent",
      };

      vi.mocked(mockRepository.getProductBySlug).mockResolvedValue(null);
      vi.mocked(mockProductTypeService.getProductTypeByName).mockResolvedValue(null);

      // Act & Assert
      await expect(service.upsertProducts([productInput])).rejects.toThrow(
        "Product type not found: NonExistent"
      );
    });

    it("should throw error if category not found", async () => {
      // Arrange
      const productInput = {
        name: "Test Product",
        slug: "test-product",
        productTypeName: "Book",
        categorySlug: "non-existent",
      };

      const productType = { id: "pt-1", name: "Book" };

      vi.mocked(mockRepository.getProductBySlug).mockResolvedValue(null);
      vi.mocked(mockProductTypeService.getProductTypeByName).mockResolvedValue(productType);
      vi.mocked(mockCategoryService.getCategoryBySlug).mockResolvedValue(null);

      // Act & Assert
      await expect(service.upsertProducts([productInput])).rejects.toThrow(
        "Category not found: non-existent"
      );
    });

    it("should throw error if channel not found in channel listings", async () => {
      // Arrange
      const productInput = {
        name: "Test Product",
        slug: "test-product",
        productTypeName: "Book",
        channelListings: [
          { channelSlug: "non-existent" },
        ],
      };

      const productType = { id: "pt-1", name: "Book" };

      vi.mocked(mockRepository.getProductBySlug).mockResolvedValue(null);
      vi.mocked(mockProductTypeService.getProductTypeByName).mockResolvedValue(productType);
      vi.mocked(mockRepository.createProduct).mockResolvedValue({ id: "1" } as Product);

      // Act & Assert
      await expect(service.upsertProducts([productInput])).rejects.toThrow(
        "Channel not found: non-existent"
      );
    });
  });
}); 