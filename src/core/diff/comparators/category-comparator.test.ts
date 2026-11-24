import { describe, expect, it } from "vitest";
import { categoryComparator } from "./category-comparator";

const tree = [
  {
    name: "Tyres",
    slug: "tyres",
    subcategories: [
      {
        name: "Summer",
        slug: "summer",
        subcategories: [{ name: "Car", slug: "summer-car" }],
      },
    ],
  },
  { name: "Rims", slug: "rims" },
];

const summarize = (desired: unknown, current: unknown) =>
  categoryComparator.compare(desired, current).map((result) => ({
    operation: result.operation,
    entityName: result.entityName,
    changes: result.changes?.map(({ path, currentValue, desiredValue }) => ({
      path,
      currentValue,
      desiredValue,
    })),
  }));

describe("categoryComparator", () => {
  it("reports nothing for an unchanged tree", () => {
    expect(summarize(tree, tree)).toEqual([]);
  });

  it("reports each subcategory's changes on that subcategory", () => {
    const desired = [
      {
        ...tree[0],
        subcategories: [
          {
            name: "Summer",
            slug: "summer",
            subcategories: [
              { name: "Passenger car", slug: "summer-car", metadata: { erpid: "411" } },
            ],
          },
        ],
      },
      tree[1],
    ];

    expect(summarize(desired, tree)).toEqual([
      {
        operation: "UPDATE",
        entityName: "summer-car",
        changes: [
          { path: ["name"], currentValue: "Car", desiredValue: "Passenger car" },
          { path: ["metadata", "erpid"], currentValue: undefined, desiredValue: "411" },
        ],
      },
    ]);
  });

  it("reports a move to another parent on the moved category", () => {
    const desired = [
      { name: "Tyres", slug: "tyres", subcategories: [] },
      { name: "Rims", slug: "rims", subcategories: tree[0].subcategories },
    ];

    expect(summarize(desired, tree)).toEqual([
      {
        operation: "UPDATE",
        entityName: "summer",
        changes: [{ path: ["parent"], currentValue: "tyres", desiredValue: "rims" }],
      },
    ]);
  });

  it("creates a new subcategory under its parent and lists subcategories only in Saleor", () => {
    const desired = [
      {
        name: "Tyres",
        slug: "tyres",
        subcategories: [{ name: "Winter", slug: "winter" }],
      },
      { name: "Rims", slug: "rims" },
    ];

    const results = categoryComparator.compare(desired, tree);

    expect(results.map((r) => [r.operation, r.entityName])).toEqual([
      ["CREATE", "winter"],
      ["DELETE", "summer"],
      ["DELETE", "summer-car"],
    ]);
    expect(results[0].desired).toEqual({ name: "Winter", slug: "winter", parent: "tyres" });
  });

  it("treats categories with the same name but different slugs as different categories", () => {
    const desired = [
      { name: "Accessories", slug: "car-accessories" },
      { name: "Accessories", slug: "bike-accessories" },
    ];

    expect(summarize(desired, [{ name: "Accessories", slug: "car-accessories" }])).toEqual([
      { operation: "CREATE", entityName: "bike-accessories", changes: undefined },
    ]);
  });

  it("rejects a slug used twice anywhere in the tree", () => {
    const desired = [
      { name: "Tyres", slug: "tyres", subcategories: [{ name: "Rims", slug: "rims" }] },
      { name: "Rims", slug: "rims" },
    ];

    expect(() => categoryComparator.compare(desired, [])).toThrow(
      /Duplicate entity identifiers found in Categories: rims/
    );
  });

  it("compares only the metadata keys the config lists, unless asked for every key", () => {
    const store = [{ name: "Tyres", slug: "tyres", metadata: { erpid: "1", legacy: "x" } }];
    const config = [{ name: "Tyres", slug: "tyres", metadata: { erpid: "2" } }];

    expect(summarize(config, store)[0].changes).toEqual([
      { path: ["metadata", "erpid"], currentValue: "1", desiredValue: "2" },
    ]);
    expect(
      categoryComparator
        .compare(config, store, { compareAllMetadataKeys: true })[0]
        .changes?.map((change) => change.path)
    ).toEqual([
      ["metadata", "erpid"],
      ["metadata", "legacy"],
    ]);
  });
});
