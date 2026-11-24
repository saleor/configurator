import { describe, expect, it } from "vitest";
import { entityComparator } from "./entity-comparator";

type Thing = { slug: string; name: string; parts?: { id: string; size: number }[] };

const comparator = entityComparator<Thing>({
  entityType: "Warehouses",
  identify: (thing) => thing.slug,
  compareFields(changes, desired, current) {
    changes.value("name", desired.name, current.name);
    const currentParts = new Map((current.parts ?? []).map((part) => [part.id, part]));
    for (const part of desired.parts ?? []) {
      changes.at("parts", part.id).value("size", part.size, currentParts.get(part.id)?.size);
    }
  },
});

describe("entityComparator", () => {
  it("creates config-only entities, updates changed ones and reports Saleor-only ones", () => {
    const results = comparator.compare(
      [
        { slug: "a", name: "A2" },
        { slug: "b", name: "B" },
        { slug: "new", name: "New" },
      ],
      [
        { slug: "old", name: "Old" },
        { slug: "a", name: "A" },
        { slug: "b", name: "B" },
      ]
    );

    expect(results.map((r) => [r.operation, r.entityName])).toEqual([
      ["UPDATE", "a"],
      ["CREATE", "new"],
      ["DELETE", "old"],
    ]);
  });

  it("records nested changes with the path to the nested object", () => {
    const [result] = comparator.compare(
      [{ slug: "a", name: "A", parts: [{ id: "x.1", size: 2 }] }],
      [{ slug: "a", name: "A", parts: [{ id: "x.1", size: 1 }] }]
    );

    expect(result.changes).toEqual([
      expect.objectContaining({ path: ["parts", "x.1", "size"], currentValue: 1, desiredValue: 2 }),
    ]);
  });

  it("rejects duplicate identifiers in the config", () => {
    expect(() =>
      comparator.compare(
        [
          { slug: "a", name: "A" },
          { slug: "a", name: "A again" },
        ],
        []
      )
    ).toThrow(/Duplicate entity identifiers found in Warehouses: a/);
  });

  it("uses the first of duplicate entities in Saleor", () => {
    const results = comparator.compare(
      [{ slug: "a", name: "A" }],
      [
        { slug: "a", name: "A" },
        { slug: "a", name: "Other" },
      ]
    );

    expect(results).toEqual([]);
  });
});
