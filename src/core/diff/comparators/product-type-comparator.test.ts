import { describe, expect, it } from "vitest";
import { ProductTypeComparator } from "./product-type-comparator";

describe("ProductTypeComparator", () => {
  describe("variantSelection changes", () => {
    it("should detect variantSelection change from false to true", () => {
      const comparator = new ProductTypeComparator();

      const local = [
        {
          name: "T-Shirt",
          isShippingRequired: true,
          productAttributes: [],
          variantAttributes: [
            {
              name: "Color",
              inputType: "DROPDOWN" as const,
              type: "PRODUCT_TYPE" as const,
              values: [{ name: "Red" }],
              variantSelection: true,
            },
          ],
        },
      ];

      const remote = [
        {
          name: "T-Shirt",
          isShippingRequired: true,
          productAttributes: [],
          variantAttributes: [
            {
              name: "Color",
              inputType: "DROPDOWN" as const,
              type: "PRODUCT_TYPE" as const,
              values: [{ name: "Red" }],
              variantSelection: false,
            },
          ],
        },
      ];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0].operation).toBe("UPDATE");
      expect(results[0].changes).toHaveLength(1);
      expect(results[0].changes?.[0].field).toBe("attributes.Color.variantSelection");
      expect(results[0].changes?.[0].currentValue).toBe(false);
      expect(results[0].changes?.[0].desiredValue).toBe(true);
    });

    it("should detect variantSelection change from true to false", () => {
      const comparator = new ProductTypeComparator();

      const local = [
        {
          name: "T-Shirt",
          isShippingRequired: true,
          productAttributes: [],
          variantAttributes: [
            {
              name: "Size",
              inputType: "DROPDOWN" as const,
              type: "PRODUCT_TYPE" as const,
              values: [{ name: "S" }],
              variantSelection: false,
            },
          ],
        },
      ];

      const remote = [
        {
          name: "T-Shirt",
          isShippingRequired: true,
          productAttributes: [],
          variantAttributes: [
            {
              name: "Size",
              inputType: "DROPDOWN" as const,
              type: "PRODUCT_TYPE" as const,
              values: [{ name: "S" }],
              variantSelection: true,
            },
          ],
        },
      ];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0].operation).toBe("UPDATE");
      expect(results[0].changes).toHaveLength(1);
      expect(results[0].changes?.[0].field).toBe("attributes.Size.variantSelection");
      expect(results[0].changes?.[0].currentValue).toBe(true);
      expect(results[0].changes?.[0].desiredValue).toBe(false);
    });

    it("should not report change when variantSelection is the same", () => {
      const comparator = new ProductTypeComparator();

      const local = [
        {
          name: "T-Shirt",
          isShippingRequired: true,
          productAttributes: [],
          variantAttributes: [
            {
              name: "Color",
              inputType: "DROPDOWN" as const,
              type: "PRODUCT_TYPE" as const,
              values: [{ name: "Red" }],
              variantSelection: true,
            },
          ],
        },
      ];

      const remote = [
        {
          name: "T-Shirt",
          isShippingRequired: true,
          productAttributes: [],
          variantAttributes: [
            {
              name: "Color",
              inputType: "DROPDOWN" as const,
              type: "PRODUCT_TYPE" as const,
              values: [{ name: "Red" }],
              variantSelection: true,
            },
          ],
        },
      ];

      const results = comparator.compare(local, remote);

      // No changes - product types are identical
      expect(results).toHaveLength(0);
    });

    it("should treat undefined as false when comparing variantSelection", () => {
      const comparator = new ProductTypeComparator();

      const local = [
        {
          name: "T-Shirt",
          isShippingRequired: true,
          productAttributes: [],
          variantAttributes: [
            {
              name: "Color",
              inputType: "DROPDOWN" as const,
              type: "PRODUCT_TYPE" as const,
              values: [{ name: "Red" }],
              // variantSelection is undefined (omitted)
            },
          ],
        },
      ];

      const remote = [
        {
          name: "T-Shirt",
          isShippingRequired: true,
          productAttributes: [],
          variantAttributes: [
            {
              name: "Color",
              inputType: "DROPDOWN" as const,
              type: "PRODUCT_TYPE" as const,
              values: [{ name: "Red" }],
              variantSelection: false,
            },
          ],
        },
      ];

      const results = comparator.compare(local, remote);

      // Both are effectively false, so no changes
      expect(results).toHaveLength(0);
    });

    it("should detect variantSelection: true when remote has undefined", () => {
      const comparator = new ProductTypeComparator();

      const local = [
        {
          name: "T-Shirt",
          isShippingRequired: true,
          productAttributes: [],
          variantAttributes: [
            {
              name: "Color",
              inputType: "DROPDOWN" as const,
              type: "PRODUCT_TYPE" as const,
              values: [{ name: "Red" }],
              variantSelection: true,
            },
          ],
        },
      ];

      const remote = [
        {
          name: "T-Shirt",
          isShippingRequired: true,
          productAttributes: [],
          variantAttributes: [
            {
              name: "Color",
              inputType: "DROPDOWN" as const,
              type: "PRODUCT_TYPE" as const,
              values: [{ name: "Red" }],
              // No variantSelection - undefined, treated as false
            },
          ],
        },
      ];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0].operation).toBe("UPDATE");
      expect(results[0].changes).toHaveLength(1);
      expect(results[0].changes?.[0].field).toBe("attributes.Color.variantSelection");
      expect(results[0].changes?.[0].currentValue).toBe(false);
      expect(results[0].changes?.[0].desiredValue).toBe(true);
    });

    it("should detect variantSelection change with referenced attribute format", () => {
      const comparator = new ProductTypeComparator();

      // Local config uses referenced attribute format { attribute: "Color", variantSelection: true }
      const local = [
        {
          name: "T-Shirt",
          isShippingRequired: true,
          productAttributes: [],
          variantAttributes: [
            {
              attribute: "Color",
              variantSelection: true,
            },
          ],
        },
      ];

      // Remote has full attribute definition (from introspection)
      const remote = [
        {
          name: "T-Shirt",
          isShippingRequired: true,
          productAttributes: [],
          variantAttributes: [
            {
              attribute: "Color",
              variantSelection: false,
            },
          ],
        },
      ];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0].operation).toBe("UPDATE");
      expect(results[0].changes).toHaveLength(1);
      expect(results[0].changes?.[0].field).toBe("attributes.Color.variantSelection");
      expect(results[0].changes?.[0].currentValue).toBe(false);
      expect(results[0].changes?.[0].desiredValue).toBe(true);
    });
  });
});
