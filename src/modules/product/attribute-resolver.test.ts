import { beforeEach, describe, expect, it, vi } from "vitest";
import { AttributeResolver } from "./attribute-resolver";
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

describe("AttributeResolver", () => {
  let resolver: AttributeResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new AttributeResolver(mockRepository);
  });

  describe("resolveAttributes", () => {
    it("should handle plain text attributes", async () => {
      // Mock attribute lookup
      vi.mocked(mockRepository.getAttributeByName).mockResolvedValue({
        id: "attr-1",
        name: "author",
        inputType: "PLAIN_TEXT",
        entityType: null,
        choices: null,
      });

      const attributes = {
        author: "Jane Smith",
      };

      const result = await resolver.resolveAttributes(attributes);

      expect(result).toEqual([
        {
          id: "attr-1",
          plainText: "Jane Smith",
        },
      ]);
      expect(mockRepository.getAttributeByName).toHaveBeenCalledWith("author");
    });

    it("should handle multiselect attributes with valid choices", async () => {
      vi.mocked(mockRepository.getAttributeByName).mockResolvedValue({
        id: "attr-tech",
        name: "Technology",
        inputType: "MULTISELECT",
        entityType: null,
        choices: {
          edges: [
            { node: { id: "tech-solar", name: "Solar", value: "solar" } },
            { node: { id: "tech-wind", name: "Wind", value: "wind" } },
          ],
        },
      });

      const result = await resolver.resolveAttributes({ Technology: ["Solar", "Wind"] });
      expect(result).toEqual([
        {
          id: "attr-tech",
          multiselect: [{ id: "tech-solar" }, { id: "tech-wind" }],
        } as any,
      ]);
    });

    it("should resolve reference to PRODUCT_VARIANT by SKU", async () => {
      vi.mocked(mockRepository.getAttributeByName).mockResolvedValue({
        id: "attr-ref-var",
        name: "Related Variant",
        inputType: "REFERENCE",
        entityType: "PRODUCT_VARIANT",
        choices: null,
      } as any);

      vi.mocked(mockRepository.getProductVariantBySku).mockResolvedValue({
        id: "var-1",
        name: "Variant 1",
        sku: "SKU-1",
        weight: { value: 1 },
        channelListings: [],
      } as any);

      const result = await resolver.resolveAttributes({ "Related Variant": "SKU-1" });
      expect(result).toEqual([{ id: "attr-ref-var", references: ["var-1"] }]);
    });

    it("should handle plain text attributes with arrays", async () => {
      vi.mocked(mockRepository.getAttributeByName).mockResolvedValue({
        id: "attr-1",
        name: "keywords",
        inputType: "PLAIN_TEXT",
        entityType: null,
        choices: null,
      });

      const attributes = {
        keywords: ["science", "technology", "future"],
      };

      const result = await resolver.resolveAttributes(attributes);

      // For plain text, we keep only the first value (consistent mapping)
      expect(result).toEqual([
        {
          id: "attr-1",
          plainText: "science",
        },
      ]);
    });

    it("should handle dropdown attributes with valid choices", async () => {
      vi.mocked(mockRepository.getAttributeByName).mockResolvedValue({
        id: "attr-2",
        name: "size",
        inputType: "DROPDOWN",
        entityType: null,
        choices: {
          edges: [
            { node: { id: "size-s", name: "Small", value: "small" } },
            { node: { id: "size-m", name: "Medium", value: "medium" } },
            { node: { id: "size-l", name: "Large", value: "large" } },
          ],
        },
      });

      const attributes = {
        size: ["Small", "Large"],
      };

      const result = await resolver.resolveAttributes(attributes);

      // DROPDOWN uses single value; first choice wins
      expect(result).toEqual([
        {
          id: "attr-2",
          dropdown: { id: "size-s" },
        },
      ]);
    });

    it("should handle dropdown attributes with choice values instead of names", async () => {
      vi.mocked(mockRepository.getAttributeByName).mockResolvedValue({
        id: "attr-2",
        name: "color",
        inputType: "DROPDOWN",
        entityType: null,
        choices: {
          edges: [
            { node: { id: "color-red", name: "Red", value: "red" } },
            { node: { id: "color-blue", name: "Blue", value: "blue" } },
          ],
        },
      });

      const attributes = {
        color: "red", // Using value instead of name
      };

      const result = await resolver.resolveAttributes(attributes);

      expect(result).toEqual([
        {
          id: "attr-2",
          dropdown: { id: "color-red" },
        },
      ]);
    });

    it("should warn and skip invalid dropdown choices", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      vi.mocked(mockRepository.getAttributeByName).mockResolvedValue({
        id: "attr-2",
        name: "size",
        inputType: "DROPDOWN",
        entityType: null,
        choices: {
          edges: [
            { node: { id: "size-s", name: "Small", value: "small" } },
            { node: { id: "size-m", name: "Medium", value: "medium" } },
          ],
        },
      });

      const attributes = {
        size: ["Small", "ExtraLarge"], // ExtraLarge doesn't exist
      };

      const result = await resolver.resolveAttributes(attributes);

      expect(result).toEqual([
        {
          id: "attr-2",
          dropdown: { id: "size-s" },
        },
      ]);

      consoleSpy.mockRestore();
    });

    it("should handle reference attributes with existing products", async () => {
      vi.mocked(mockRepository.getAttributeByName).mockResolvedValue({
        id: "attr-3",
        name: "related-product",
        inputType: "REFERENCE",
        entityType: null,
        choices: null,
      });

      vi.mocked(mockRepository.getProductByName).mockResolvedValue({
        id: "prod-123",
        name: "Related Book",
        slug: "related-book",
        productType: { id: "pt-1", name: "Book" },
        category: { id: "cat-1", name: "Fiction" },
        media: [],
      } as any);

      const attributes = {
        "related-product": "Related Book",
      };

      const result = await resolver.resolveAttributes(attributes);

      expect(result).toEqual([
        {
          id: "attr-3",
          references: ["prod-123"],
        },
      ]);
      expect(mockRepository.getProductByName).toHaveBeenCalledWith("Related Book");
    });

    it("should warn and skip reference attributes for missing products", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      vi.mocked(mockRepository.getAttributeByName).mockResolvedValue({
        id: "attr-3",
        name: "related-product",
        inputType: "REFERENCE",
        entityType: null,
        choices: null,
      });

      vi.mocked(mockRepository.getProductByName).mockResolvedValue(null);

      const attributes = {
        "related-product": "Nonexistent Product",
      };

      const result = await resolver.resolveAttributes(attributes);

      expect(result).toEqual([]); // Attribute omitted when reference cannot be resolved

      consoleSpy.mockRestore();
    });

    it("should handle mixed attribute types", async () => {
      vi.mocked(mockRepository.getAttributeByName)
        .mockResolvedValueOnce({
          id: "attr-text",
          name: "author",
          inputType: "PLAIN_TEXT",
          entityType: null,
          choices: null,
        })
        .mockResolvedValueOnce({
          id: "attr-dropdown",
          name: "genre",
          inputType: "DROPDOWN",
          entityType: null,
          choices: {
            edges: [
              { node: { id: "genre-fiction", name: "Fiction", value: "fiction" } },
              { node: { id: "genre-nonfiction", name: "Non-Fiction", value: "nonfiction" } },
            ],
          },
        })
        .mockResolvedValueOnce({
          id: "attr-ref",
          name: "series",
          inputType: "REFERENCE",
          entityType: null,
          choices: null,
        });

      vi.mocked(mockRepository.getProductByName).mockResolvedValue({
        id: "prod-series",
        name: "Book Series",
        slug: "book-series",
        productType: { id: "pt-1", name: "Book" },
        category: { id: "cat-1", name: "Fiction" },
        media: [],
      } as any);

      const attributes = {
        author: "Jane Smith",
        genre: "Fiction",
        series: "Book Series",
      };

      const result = await resolver.resolveAttributes(attributes);

      expect(result).toHaveLength(3);
      expect(result).toContainEqual({ id: "attr-text", plainText: "Jane Smith" });
      expect(result).toContainEqual({ id: "attr-dropdown", dropdown: { id: "genre-fiction" } });
      expect(result).toContainEqual({ id: "attr-ref", references: ["prod-series"] });
    });

    it("should handle empty attributes", async () => {
      const result = await resolver.resolveAttributes({});
      expect(result).toEqual([]);
    });

    it("should handle undefined attributes", async () => {
      const result = await resolver.resolveAttributes(undefined);
      expect(result).toEqual([]);
    });

    it("should skip attributes that don't exist in the system", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      vi.mocked(mockRepository.getAttributeByName).mockResolvedValue(null);

      const attributes = {
        "nonexistent-attribute": "some value",
      };

      const result = await resolver.resolveAttributes(attributes);

      expect(result).toEqual([]);

      consoleSpy.mockRestore();
    });
  });
});
