import { describe, expect, it } from "vitest";
import { CategoryComparator } from "./category-comparator";

describe("CategoryComparator", () => {
  const comparator = new CategoryComparator();

  it("should detect parent-child relationship changes", () => {
    const local = [
      {
        name: "Electronics",
        subcategories: [{ name: "Phones" }, { name: "Laptops" }],
      },
    ];

    const remote = [
      {
        name: "Electronics",
        subcategories: [
          { name: "Phones" },
          // Laptops removed
        ],
      },
    ];

    const results = comparator.compare(local, remote);

    expect(results).toHaveLength(1);
    expect(results[0].operation).toBe("UPDATE");
    expect(results[0].entityName).toBe("Electronics");

    // Should detect the subcategory difference
    const changes = results[0].changes;
    expect(changes).toHaveLength(1);
    expect(changes[0].field).toBe("subcategories");
    expect(changes[0].description).toContain("Laptops");
  });

  it("should detect nested parent-child relationships", () => {
    const local = [
      {
        name: "Electronics",
        subcategories: [
          {
            name: "Laptops",
            subcategories: [{ name: "Gaming Laptops" }, { name: "Business Laptops" }],
          },
        ],
      },
    ];

    const remote = [
      {
        name: "Electronics",
        subcategories: [
          {
            name: "Laptops",
            subcategories: [
              { name: "Gaming Laptops" },
              // Business Laptops removed
            ],
          },
        ],
      },
    ];

    const results = comparator.compare(local, remote);

    expect(results).toHaveLength(1);
    expect(results[0].operation).toBe("UPDATE");
    expect(results[0].entityName).toBe("Electronics");

    // Should detect nested subcategory differences
    const changes = results[0].changes;
    expect(changes.length).toBeGreaterThan(0);
    expect(
      changes.some(
        (change) =>
          change.field === "subcategories" && change.description?.includes("Business Laptops")
      )
    ).toBe(true);
  });

  it("should properly show parent context in nested changes", () => {
    const local = [
      {
        name: "Electronics",
        subcategories: [
          {
            name: "Laptops",
            subcategories: [{ name: "Gaming Laptops" }, { name: "Business Laptops" }],
          },
        ],
      },
    ];

    const remote = [
      {
        name: "Electronics",
        subcategories: [
          {
            name: "Laptops",
            subcategories: [{ name: "Gaming Laptops" }],
          },
        ],
      },
    ];

    const results = comparator.compare(local, remote);
    const changes = results[0].changes;

    // Should show parent context in the description
    const changeWithContext = changes.find(
      (change) =>
        change.description?.includes('In "Laptops"') &&
        change.description?.includes("Business Laptops")
    );

    expect(changeWithContext).toBeDefined();
    expect(changeWithContext?.description).toContain(
      'In "Laptops": Subcategory "Business Laptops" added'
    );
  });
});
