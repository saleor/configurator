import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolverAttribute } from "../attribute/attribute-cache";
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

function createResolverWithCache(
  attributes: Record<string, ResolverAttribute>
): AttributeResolver {
  return new AttributeResolver(mockRepository, {
    getAttributeByNameFromCache: (name) => attributes[name] ?? null,
  });
}

describe("AttributeResolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveAttributes", () => {
    it("should handle plain text attributes", async () => {
      const resolver = createResolverWithCache({
        author: {
          id: "attr-1",
          name: "author",
          inputType: "PLAIN_TEXT",
          entityType: null,
          choices: null,
        },
      });

      const result = await resolver.resolveAttributes({ author: "Jane Smith" });

      expect(result).toEqual([{ id: "attr-1", plainText: "Jane Smith" }]);
    });

    it("should handle multiselect attributes with valid choices", async () => {
      const resolver = createResolverWithCache({
        Technology: {
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
        },
      });

      const result = await resolver.resolveAttributes({
        Technology: ["Solar", "Wind"],
      });
      expect(result).toEqual([
        {
          id: "attr-tech",
          multiselect: [{ id: "tech-solar" }, { id: "tech-wind" }],
        } as unknown,
      ]);
    });

    it("should resolve reference to PRODUCT_VARIANT by SKU", async () => {
      const resolver = createResolverWithCache({
        "Related Variant": {
          id: "attr-ref-var",
          name: "Related Variant",
          inputType: "REFERENCE",
          entityType: "PRODUCT_VARIANT",
          choices: null,
        },
      });

      vi.mocked(mockRepository.getProductVariantBySku).mockResolvedValue({
        id: "var-1",
        name: "Variant 1",
        sku: "SKU-1",
        weight: { value: 1 },
        channelListings: [],
      } as never);

      const result = await resolver.resolveAttributes({
        "Related Variant": "SKU-1",
      });
      expect(result).toEqual([{ id: "attr-ref-var", references: ["var-1"] }]);
    });

    it("should handle plain text attributes with arrays", async () => {
      const resolver = createResolverWithCache({
        keywords: {
          id: "attr-1",
          name: "keywords",
          inputType: "PLAIN_TEXT",
          entityType: null,
          choices: null,
        },
      });

      const result = await resolver.resolveAttributes({
        keywords: ["science", "technology", "future"],
      });

      // For plain text, we keep only the first value (consistent mapping)
      expect(result).toEqual([{ id: "attr-1", plainText: "science" }]);
    });

    it("should handle dropdown attributes with valid choices", async () => {
      const resolver = createResolverWithCache({
        size: {
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
        },
      });

      const result = await resolver.resolveAttributes({
        size: ["Small", "Large"],
      });

      // DROPDOWN uses single value; first choice wins
      expect(result).toEqual([
        { id: "attr-2", dropdown: { id: "size-s" } },
      ]);
    });

    it("should handle dropdown attributes with choice values instead of names", async () => {
      const resolver = createResolverWithCache({
        color: {
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
        },
      });

      const result = await resolver.resolveAttributes({ color: "red" });

      expect(result).toEqual([
        { id: "attr-2", dropdown: { id: "color-red" } },
      ]);
    });

    it("should warn and skip invalid dropdown choices", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const resolver = createResolverWithCache({
        size: {
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
        },
      });

      const result = await resolver.resolveAttributes({
        size: ["Small", "ExtraLarge"], // ExtraLarge doesn't exist
      });

      expect(result).toEqual([
        { id: "attr-2", dropdown: { id: "size-s" } },
      ]);

      consoleSpy.mockRestore();
    });

    it("should handle reference attributes with existing products", async () => {
      const resolver = createResolverWithCache({
        "related-product": {
          id: "attr-3",
          name: "related-product",
          inputType: "REFERENCE",
          entityType: null,
          choices: null,
        },
      });

      vi.mocked(mockRepository.getProductByName).mockResolvedValue({
        id: "prod-123",
        name: "Related Book",
        slug: "related-book",
        productType: { id: "pt-1", name: "Book" },
        category: { id: "cat-1", name: "Fiction" },
        media: [],
      } as never);

      const result = await resolver.resolveAttributes({
        "related-product": "Related Book",
      });

      expect(result).toEqual([
        { id: "attr-3", references: ["prod-123"] },
      ]);
      expect(mockRepository.getProductByName).toHaveBeenCalledWith(
        "Related Book"
      );
    });

    it("should warn and skip reference attributes for missing products", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const resolver = createResolverWithCache({
        "related-product": {
          id: "attr-3",
          name: "related-product",
          inputType: "REFERENCE",
          entityType: null,
          choices: null,
        },
      });

      vi.mocked(mockRepository.getProductByName).mockResolvedValue(null);

      const result = await resolver.resolveAttributes({
        "related-product": "Nonexistent Product",
      });

      expect(result).toEqual([]); // Attribute omitted when reference cannot be resolved

      consoleSpy.mockRestore();
    });

    it("should handle mixed attribute types", async () => {
      const resolver = createResolverWithCache({
        author: {
          id: "attr-text",
          name: "author",
          inputType: "PLAIN_TEXT",
          entityType: null,
          choices: null,
        },
        genre: {
          id: "attr-dropdown",
          name: "genre",
          inputType: "DROPDOWN",
          entityType: null,
          choices: {
            edges: [
              {
                node: {
                  id: "genre-fiction",
                  name: "Fiction",
                  value: "fiction",
                },
              },
              {
                node: {
                  id: "genre-nonfiction",
                  name: "Non-Fiction",
                  value: "nonfiction",
                },
              },
            ],
          },
        },
        series: {
          id: "attr-ref",
          name: "series",
          inputType: "REFERENCE",
          entityType: null,
          choices: null,
        },
      });

      vi.mocked(mockRepository.getProductByName).mockResolvedValue({
        id: "prod-series",
        name: "Book Series",
        slug: "book-series",
        productType: { id: "pt-1", name: "Book" },
        category: { id: "cat-1", name: "Fiction" },
        media: [],
      } as never);

      const result = await resolver.resolveAttributes({
        author: "Jane Smith",
        genre: "Fiction",
        series: "Book Series",
      });

      expect(result).toHaveLength(3);
      expect(result).toContainEqual({
        id: "attr-text",
        plainText: "Jane Smith",
      });
      expect(result).toContainEqual({
        id: "attr-dropdown",
        dropdown: { id: "genre-fiction" },
      });
      expect(result).toContainEqual({
        id: "attr-ref",
        references: ["prod-series"],
      });
    });

    it("should handle empty attributes", async () => {
      const resolver = createResolverWithCache({});
      const result = await resolver.resolveAttributes({});
      expect(result).toEqual([]);
    });

    it("should handle undefined attributes", async () => {
      const resolver = createResolverWithCache({});
      const result = await resolver.resolveAttributes(undefined);
      expect(result).toEqual([]);
    });

    it("should throw when attribute is not in cache", async () => {
      const resolver = createResolverWithCache({});

      await expect(
        resolver.resolveAttributes({ "nonexistent-attribute": "some value" })
      ).rejects.toThrow(/not found in attribute cache/i);
    });
  });

  describe("cache-only resolution", () => {
    it("should throw when attribute is not in cache", async () => {
      const resolver = createResolverWithCache({});

      await expect(
        resolver.resolveAttributes({ "Missing Attr": "value" })
      ).rejects.toThrow(/not found in attribute cache/i);
    });

    it("should resolve attribute from cache without API call", async () => {
      const resolver = createResolverWithCache({
        color: {
          id: "attr-color",
          name: "color",
          inputType: "DROPDOWN",
          entityType: null,
          choices: {
            edges: [
              { node: { id: "c-red", name: "Red", value: "red" } },
            ],
          },
        },
      });

      const result = await resolver.resolveAttributes({ color: "Red" });

      expect(result).toEqual([
        { id: "attr-color", dropdown: { id: "c-red" } },
      ]);
      // Verify no API call was made for attribute lookup
      expect(mockRepository.getAttributeByName).not.toHaveBeenCalled();
    });
  });
});
