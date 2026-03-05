import { describe, expect, it } from "vitest";
import { filterDiffResults } from "./entity-filter";
import type { DiffSummary } from "./types";

const mockSummary: DiffSummary = {
  totalChanges: 3,
  creates: 1,
  updates: 1,
  deletes: 1,
  results: [
    {
      operation: "CREATE",
      entityType: "Categories",
      entityName: "electronics",
      changes: [],
    },
    {
      operation: "UPDATE",
      entityType: "Product Types",
      entityName: "T-Shirt",
      changes: [{ field: "name", currentValue: "Old", desiredValue: "New" }],
    },
    {
      operation: "DELETE",
      entityType: "Categories",
      entityName: "old-stuff",
      changes: [],
    },
  ],
};

describe("filterDiffResults", () => {
  it("filters by entity type", () => {
    const filtered = filterDiffResults(mockSummary, { entityType: "Categories" });
    expect(filtered.results).toHaveLength(2);
    expect(filtered.totalChanges).toBe(2);
    expect(filtered.creates).toBe(1);
    expect(filtered.deletes).toBe(1);
    expect(filtered.updates).toBe(0);
  });

  it("filters by specific entity (Type/name)", () => {
    const filtered = filterDiffResults(mockSummary, { entity: "Categories/electronics" });
    expect(filtered.results).toHaveLength(1);
    expect(filtered.results[0].entityName).toBe("electronics");
  });

  it("returns full summary when no filter", () => {
    const filtered = filterDiffResults(mockSummary, {});
    expect(filtered.totalChanges).toBe(3);
  });

  it("returns empty summary for non-matching filter", () => {
    const filtered = filterDiffResults(mockSummary, { entityType: "Warehouses" });
    expect(filtered.totalChanges).toBe(0);
    expect(filtered.results).toHaveLength(0);
  });
});
