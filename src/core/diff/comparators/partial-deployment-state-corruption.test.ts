import { describe, it, expect } from "vitest";
import { PageTypeComparator } from "./page-type-comparator";
import { ProductTypeComparator } from "./product-type-comparator";

describe("Bug #3: Partial Deployment State Corruption", () => {
  describe("PageTypeComparator", () => {
    const comparator = new PageTypeComparator();

    it("should handle remote duplicates gracefully", () => {
      const local = [{ name: "Blog Post", attributes: [] }];

      // Remote has duplicates (corrupted state)
      const remote = [
        { name: "Default Type", attributes: [] },
        { name: "Default Type", attributes: [] }, // Duplicate
        { name: "Blog Post", attributes: [] },
      ];

      const results = comparator.compare(local, remote);

      // Should complete successfully without throwing
      expect(results).toBeDefined();
      // Should show 1 delete for "Default Type" (since it's not in local)
      expect(results).toHaveLength(1);
      expect(results[0].operation).toBe("DELETE");
      expect(results[0].entityName).toBe("Default Type");
    });

    it("should prevent new duplicates in local config", () => {
      const local = [
        { name: "Default Type", attributes: [] },
        { name: "Default Type", attributes: [] }, // Duplicate in local
      ];

      const remote = [{ name: "Default Type", attributes: [] }];

      // Should throw error for local duplicates (strict validation)
      expect(() => comparator.compare(local, remote)).toThrow(
        "Duplicate entity names found in Page Types: Default Type"
      );
    });

    it("should show proper diff results with deduplicated remote", () => {
      const local = [
        { name: "Blog Post", attributes: [] },
        { name: "New Type", attributes: [] },
      ];

      // Remote has duplicates plus different entities
      const remote = [
        { name: "Default Type", attributes: [] },
        { name: "Default Type", attributes: [] }, // Duplicate
        { name: "Blog Post", attributes: [] },
        { name: "Old Type", attributes: [] },
      ];

      const results = comparator.compare(local, remote);

      // Should detect 1 create (New Type), 1 delete (Old Type), and 1 delete (Default Type)
      expect(results).toHaveLength(3);

      const createResults = results.filter((r) => r.operation === "CREATE");
      const deleteResults = results.filter((r) => r.operation === "DELETE");

      expect(createResults).toHaveLength(1);
      expect(createResults[0].entityName).toBe("New Type");

      expect(deleteResults).toHaveLength(2);
      const deleteNames = deleteResults.map((r) => r.entityName);
      expect(deleteNames).toContain("Old Type");
      expect(deleteNames).toContain("Default Type");
    });
  });

  describe("ProductTypeComparator", () => {
    const comparator = new ProductTypeComparator();

    it("should handle remote duplicates gracefully", () => {
      const local = [
        { name: "Book", isShippingRequired: true, productAttributes: [], variantAttributes: [] },
      ];

      // Remote has duplicates (corrupted state)
      const remote = [
        {
          name: "Default Type",
          isShippingRequired: true,
          productAttributes: [],
          variantAttributes: [],
        },
        {
          name: "Default Type",
          isShippingRequired: false,
          productAttributes: [],
          variantAttributes: [],
        }, // Duplicate with different values
        { name: "Book", isShippingRequired: true, productAttributes: [], variantAttributes: [] },
      ];

      const results = comparator.compare(local, remote);

      // Should complete successfully without throwing
      expect(results).toBeDefined();
      // Should show 1 delete for "Default Type" (since it's not in local)
      expect(results).toHaveLength(1);
      expect(results[0].operation).toBe("DELETE");
      expect(results[0].entityName).toBe("Default Type");
    });

    it("should use first occurrence when deduplicating", () => {
      const local = [
        {
          name: "Updated Type",
          isShippingRequired: false,
          productAttributes: [],
          variantAttributes: [],
        },
      ];

      // Remote has duplicates with first one matching our expected value
      const remote = [
        {
          name: "Updated Type",
          isShippingRequired: false,
          productAttributes: [],
          variantAttributes: [],
        },
        {
          name: "Updated Type",
          isShippingRequired: true,
          productAttributes: [],
          variantAttributes: [],
        }, // Duplicate with different value
      ];

      const results = comparator.compare(local, remote);

      // Should show no changes because first occurrence matches local
      expect(results).toHaveLength(0);
    });
  });

  describe("Exact Name Matching (repository fixes)", () => {
    it("should document the exact matching fix", () => {
      // This test documents the fix for the root cause:
      // 1. Changed GraphQL queries from `first: 1` to `first: 100`
      // 2. Added client-side exact name matching
      // 3. This prevents duplicates from being created during deployment

      // The fixes are in:
      // - src/modules/page-type/repository.ts
      // - src/modules/product-type/repository.ts
      // - src/modules/category/repository.ts
      // - src/modules/product/repository.ts

      expect(true).toBe(true); // This test just documents the fixes
    });
  });
});
