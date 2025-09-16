import { describe, expect, it } from "vitest";
import { ProductComparator } from "./product-comparator";

describe("ProductComparator", () => {
  const comparator = new ProductComparator();

  const sampleProduct = {
    name: "Sample Product",
    slug: "sample-product",
    productType: "Clothing",
    category: "Apparel",
    attributes: {
      color: "red",
      size: ["S", "M", "L"],
    },
    variants: [
      {
        name: "Red S",
        sku: "RED-S",
      },
    ],
  };

  describe("compare", () => {
    it("should detect product creation", () => {
      const local = [sampleProduct];
      const remote: typeof local = [];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        operation: "CREATE",
        entityType: "Products",
        entityName: "sample-product",
        desired: sampleProduct,
      });
    });

    it("should detect product deletion", () => {
      const local: (typeof sampleProduct)[] = [];
      const remote = [sampleProduct];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        operation: "DELETE",
        entityType: "Products",
        entityName: "sample-product",
        current: sampleProduct,
      });
    });

    it("should detect product updates", () => {
      const localProduct = {
        ...sampleProduct,
        productType: "Electronics",
      };
      const local = [localProduct];
      const remote = [sampleProduct];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0].operation).toBe("UPDATE");
      expect(results[0].entityType).toBe("Products");
      expect(results[0].entityName).toBe("sample-product");
      expect(results[0].changes).toContainEqual({
        field: "productType",
        currentValue: "Clothing",
        desiredValue: "Electronics",
        description: 'productType: "Clothing" → "Electronics"',
      });
    });

    it("should detect attribute changes", () => {
      const localProduct = {
        ...sampleProduct,
        attributes: {
          color: "blue",
          size: ["M", "L", "XL"],
        },
      };
      const local = [localProduct];
      const remote = [sampleProduct];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0].operation).toBe("UPDATE");
      expect(results[0].changes).toContainEqual({
        field: "attributes.color",
        currentValue: "red",
        desiredValue: "blue",
        description: 'Attribute "color": "red" → "blue"',
      });
    });

    it("should detect variant changes", () => {
      const localProduct = {
        ...sampleProduct,
        variants: [
          { name: "Red S", sku: "RED-S" },
          { name: "Blue M", sku: "BLUE-M" },
        ],
      };
      const local = [localProduct];
      const remote = [sampleProduct];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0].operation).toBe("UPDATE");
      // The BLUE-M variant exists in local but not in remote, so it will be added
      const blueVariantChange = results[0].changes?.find(
        (change) => change.field === "variants.BLUE-M"
      );
      expect(blueVariantChange).toBeDefined();
      expect(blueVariantChange?.description).toMatch(/will be added|will be removed/);
    });

    it("should return no changes for identical products", () => {
      const local = [sampleProduct];
      const remote = [sampleProduct];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(0);
    });

    it("should handle products with no attributes", () => {
      const productWithoutAttributes = {
        name: "Simple Product",
        slug: "simple-product",
        productType: "Simple",
        category: "Basic",
        variants: [],
      };

      const local = [productWithoutAttributes];
      const remote = [productWithoutAttributes];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(0);
    });

    it("should ignore attribute array reordering (normalized comparison)", () => {
      const remote = [
        {
          ...sampleProduct,
          attributes: { colors: ["red", "blue", "green"] },
        },
      ];
      const local = [
        {
          ...sampleProduct,
          attributes: { colors: ["green", "red", "blue"] },
        },
      ];

      const results = comparator.compare(local, remote);
      expect(results).toHaveLength(0);
    });

    it("should treat equivalent publishedAt formats as equal", () => {
      // Arrange
      const remote = [
        {
          ...sampleProduct,
          channelListings: [
            {
              channel: "default",
              isPublished: true,
              publishedAt: "2025-09-12T01:57:53.540000+00:00",
              visibleInListings: true,
            },
          ],
        },
      ];
      const local = [
        {
          ...sampleProduct,
          channelListings: [
            {
              channel: "default",
              isPublished: true,
              publishedAt: "2025-09-12T01:57:53.540Z",
              visibleInListings: true,
            },
          ],
        },
      ];

      // Act
      const results = comparator.compare(local, remote);

      // Assert
      expect(results).toHaveLength(0);
    });

    it("compares description by visible text only", () => {
      // Arrange
      const remote = [
        {
          ...sampleProduct,
          // JSON with the same text
          description:
            '{"time":123,"blocks":[{"id":"b1","type":"paragraph","data":{"text":"Hello <b>world</b>!"}}]}' ,
        },
      ];
      const local = [
        {
          ...sampleProduct,
          description: "Hello world!",
        },
      ];

      // Act
      const results = comparator.compare(local, remote);

      // Assert
      expect(results).toHaveLength(0);
    });
  });
});
