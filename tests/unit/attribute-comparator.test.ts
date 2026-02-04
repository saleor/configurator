import { describe, expect, it } from "vitest";
import { AttributesComparator } from "../../src/core/diff/comparators/attributes-comparator";
import type { DiffResult } from "../../src/core/diff/types";
import type { FullAttribute } from "../../src/modules/config/schema/attribute.schema";

describe("AttributesComparator with product and content attributes", () => {
  describe("Product Attributes Comparator", () => {
    const comparator = new AttributesComparator("Product Attributes");

    it("uses 'Product Attributes' as entity type", () => {
      const local: FullAttribute[] = [
        { name: "Color", inputType: "DROPDOWN", type: "PRODUCT_TYPE", values: [{ name: "Red" }] },
      ];
      const remote: FullAttribute[] = [];
      const results = comparator.compare(local, remote);

      expect(results.length).toBe(1);
      expect(results[0].entityType).toBe("Product Attributes");
    });

    it("detects create for new product attribute", () => {
      const local: FullAttribute[] = [
        { name: "Brand", inputType: "PLAIN_TEXT", type: "PRODUCT_TYPE" },
      ];
      const remote: FullAttribute[] = [];
      const results = comparator.compare(local, remote);

      expect(
        results.some((r: DiffResult) => r.operation === "CREATE" && r.entityName === "Brand")
      ).toBe(true);
    });

    it("detects update for changed product attribute", () => {
      const local: FullAttribute[] = [
        {
          name: "Size",
          inputType: "DROPDOWN",
          type: "PRODUCT_TYPE",
          values: [{ name: "S" }, { name: "M" }],
        },
      ];
      const remote: FullAttribute[] = [
        { name: "Size", inputType: "DROPDOWN", type: "PRODUCT_TYPE", values: [{ name: "S" }] },
      ];
      const results = comparator.compare(local, remote);

      expect(
        results.some((r: DiffResult) => r.operation === "UPDATE" && r.entityName === "Size")
      ).toBe(true);
    });

    it("detects delete for removed product attribute", () => {
      const local: FullAttribute[] = [];
      const remote: FullAttribute[] = [
        { name: "Material", inputType: "PLAIN_TEXT", type: "PRODUCT_TYPE" },
      ];
      const results = comparator.compare(local, remote);

      expect(
        results.some((r: DiffResult) => r.operation === "DELETE" && r.entityName === "Material")
      ).toBe(true);
    });
  });

  describe("Content Attributes Comparator", () => {
    const comparator = new AttributesComparator("Content Attributes");

    it("uses 'Content Attributes' as entity type", () => {
      const local: FullAttribute[] = [
        { name: "Author", inputType: "PLAIN_TEXT", type: "PAGE_TYPE" },
      ];
      const remote: FullAttribute[] = [];
      const results = comparator.compare(local, remote);

      expect(results.length).toBe(1);
      expect(results[0].entityType).toBe("Content Attributes");
    });

    it("detects create for new content attribute", () => {
      const local: FullAttribute[] = [
        { name: "PublishDate", inputType: "DATE", type: "PAGE_TYPE" },
      ];
      const remote: FullAttribute[] = [];
      const results = comparator.compare(local, remote);

      expect(
        results.some((r: DiffResult) => r.operation === "CREATE" && r.entityName === "PublishDate")
      ).toBe(true);
    });

    it("detects update for changed content attribute", () => {
      const local: FullAttribute[] = [
        {
          name: "Category",
          inputType: "DROPDOWN",
          type: "PAGE_TYPE",
          values: [{ name: "News" }, { name: "Blog" }],
        },
      ];
      const remote: FullAttribute[] = [
        { name: "Category", inputType: "DROPDOWN", type: "PAGE_TYPE", values: [{ name: "News" }] },
      ];
      const results = comparator.compare(local, remote);

      expect(
        results.some((r: DiffResult) => r.operation === "UPDATE" && r.entityName === "Category")
      ).toBe(true);
    });

    it("detects delete for removed content attribute", () => {
      const local: FullAttribute[] = [];
      const remote: FullAttribute[] = [
        { name: "Summary", inputType: "RICH_TEXT", type: "PAGE_TYPE" },
      ];
      const results = comparator.compare(local, remote);

      expect(
        results.some((r: DiffResult) => r.operation === "DELETE" && r.entityName === "Summary")
      ).toBe(true);
    });
  });

  describe("Default Attributes Comparator (backward compatibility)", () => {
    const comparator = new AttributesComparator();

    it("uses 'Attributes' as default entity type", () => {
      const local: FullAttribute[] = [
        { name: "Test", inputType: "PLAIN_TEXT", type: "PRODUCT_TYPE" },
      ];
      const remote: FullAttribute[] = [];
      const results = comparator.compare(local, remote);

      expect(results.length).toBe(1);
      expect(results[0].entityType).toBe("Attributes");
    });
  });
});
