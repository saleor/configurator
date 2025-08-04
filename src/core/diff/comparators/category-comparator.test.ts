import { describe, expect, it } from "vitest";
import { CategoryComparator } from "./category-comparator";

describe("CategoryComparator", () => {
  const comparator = new CategoryComparator();

  it("should detect parent-child relationship changes", () => {
    const local = [
      {
        name: "Electronics",
        slug: "electronics",
        subcategories: [
          { name: "Phones", slug: "phones" },
          { name: "Laptops", slug: "laptops" },
        ],
      },
    ];

    const remote = [
      {
        name: "Electronics",
        slug: "electronics",
        subcategories: [
          { name: "Phones", slug: "phones" },
          // Laptops removed
        ],
      },
    ];

    const results = comparator.compare(local, remote);

    expect(results).toHaveLength(1);
    expect(results[0].operation).toBe("UPDATE");
    expect(results[0].entityName).toBe("electronics");

    // Should detect the subcategory difference
    const changes = results[0].changes;
    expect(changes).toBeDefined();
    expect(changes).toHaveLength(1);
    expect(changes?.[0]?.field).toBe("subcategories");
    expect(changes?.[0]?.description).toContain("Laptops");
  });

  it("should detect nested parent-child relationships", () => {
    const local = [
      {
        name: "Electronics",
        slug: "electronics",
        subcategories: [
          {
            name: "Laptops",
            slug: "laptops",
            subcategories: [
              { name: "Gaming Laptops", slug: "gaming-laptops" },
              { name: "Business Laptops", slug: "business-laptops" },
            ],
          },
        ],
      },
    ];

    const remote = [
      {
        name: "Electronics",
        slug: "electronics",
        subcategories: [
          {
            name: "Laptops",
            slug: "laptops",
            subcategories: [
              { name: "Gaming Laptops", slug: "gaming-laptops" },
              // Business Laptops removed
            ],
          },
        ],
      },
    ];

    const results = comparator.compare(local, remote);

    expect(results).toHaveLength(1);
    expect(results[0].operation).toBe("UPDATE");
    expect(results[0].entityName).toBe("electronics");

    // Should detect nested subcategory differences
    const changes = results[0].changes;
    expect(changes).toBeDefined();
    expect(changes?.length).toBeGreaterThan(0);
    expect(
      changes?.some(
        (change) =>
          change.field === "subcategories" && change.description?.includes("Business Laptops")
      )
    ).toBe(true);
  });

  it("should properly show parent context in nested changes", () => {
    const local = [
      {
        name: "Electronics",
        slug: "electronics",
        subcategories: [
          {
            name: "Laptops",
            slug: "laptops",
            subcategories: [
              { name: "Gaming Laptops", slug: "gaming-laptops" },
              { name: "Business Laptops", slug: "business-laptops" },
            ],
          },
        ],
      },
    ];

    const remote = [
      {
        name: "Electronics",
        slug: "electronics",
        subcategories: [
          {
            name: "Laptops",
            slug: "laptops",
            subcategories: [{ name: "Gaming Laptops", slug: "gaming-laptops" }],
          },
        ],
      },
    ];

    const results = comparator.compare(local, remote);
    const changes = results[0].changes;
    expect(changes).toBeDefined();

    // Should show parent context in the description
    const changeWithContext = changes?.find(
      (change) =>
        change.description?.includes('In "Laptops"') &&
        change.description?.includes("Business Laptops")
    );

    expect(changeWithContext).toBeDefined();
    expect(changeWithContext?.description).toContain(
      'In "Laptops": Subcategory "Business Laptops" added'
    );
  });

  it("should handle duplicate category names with different slugs correctly", () => {
    // This test case reproduces the "Accessories" duplicate issue
    const local = [
      {
        name: "Accessories",
        slug: "accessories",
      },
    ];

    const remote = [
      {
        name: "Accessories",
        slug: "accessories",
      },
      {
        name: "Accessories",
        slug: "accessories-2",
      },
    ];

    // Should not throw an error as slugs are different
    const results = comparator.compare(local, remote);

    // Should detect the extra remote category as a DELETE
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(1);
    expect(results[0].operation).toBe("DELETE");
    expect(results[0].entityName).toBe("accessories-2");
  });

  it("should handle categories with same names but different slugs as different entities", () => {
    const categoriesWithDuplicateNames = [
      {
        name: "Electronics",
        slug: "electronics",
      },
      {
        name: "Electronics",
        slug: "electronics-2",
      },
    ];

    // Should not throw - validates based on slug, not name
    const results = comparator.compare(categoriesWithDuplicateNames, []);

    // Should create both categories since they have different slugs
    expect(results).toHaveLength(2);
    expect(results[0].operation).toBe("CREATE");
    expect(results[1].operation).toBe("CREATE");
    expect(results[0].entityName).toBe("electronics");
    expect(results[1].entityName).toBe("electronics-2");
  });
});
