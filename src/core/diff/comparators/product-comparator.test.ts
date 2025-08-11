import { describe, expect, it } from "vitest";
import { ProductComparator } from "./product-comparator";

describe("ProductComparator", () => {
  const comparator = new ProductComparator();

  const sampleProduct = {
    name: "Sample Product",
    productType: "Clothing",
    category: "Apparel",
    attributes: {
      color: "red",
      size: ["S", "M", "L"]
    },
    variants: [
      {
        name: "Red S",
        sku: "RED-S"
      }
    ]
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
        entityName: "Sample Product",
        desired: sampleProduct,
      });
    });

    it("should detect product deletion", () => {
      const local: typeof sampleProduct[] = [];
      const remote = [sampleProduct];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        operation: "DELETE",
        entityType: "Products",
        entityName: "Sample Product",
        current: sampleProduct,
      });
    });

    it("should detect product updates", () => {
      const localProduct = {
        ...sampleProduct,
        productType: "Electronics"
      };
      const local = [localProduct];
      const remote = [sampleProduct];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0].operation).toBe("UPDATE");
      expect(results[0].entityType).toBe("Products");
      expect(results[0].entityName).toBe("Sample Product");
      expect(results[0].changes).toContainEqual({
        field: "productType",
        currentValue: "Clothing",
        desiredValue: "Electronics",
        description: 'productType: "Clothing" → "Electronics"'
      });
    });

    it("should detect attribute changes", () => {
      const localProduct = {
        ...sampleProduct,
        attributes: {
          color: "blue",
          size: ["M", "L", "XL"]
        }
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
        description: 'Attribute "color": "red" → "blue"'
      });
    });

    it("should detect variant count changes", () => {
      const localProduct = {
        ...sampleProduct,
        variants: [
          { name: "Red S", sku: "RED-S" },
          { name: "Blue M", sku: "BLUE-M" }
        ]
      };
      const local = [localProduct];
      const remote = [sampleProduct];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0].operation).toBe("UPDATE");
      expect(results[0].changes).toContainEqual({
        field: "variants.length",
        currentValue: 1,
        desiredValue: 2,
        description: "Variant count changed: 1 → 2"
      });
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
        productType: "Simple",
        category: "Basic",
        variants: []
      };
      
      const local = [productWithoutAttributes];
      const remote = [productWithoutAttributes];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(0);
    });
  });
});