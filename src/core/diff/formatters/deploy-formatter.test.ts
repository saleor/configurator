import { stripVTControlCharacters as stripAnsi } from "node:util";
import { describe, expect, it } from "vitest";
import type { DiffSummary } from "../types";
import { DeployDiffFormatter } from "./deploy-formatter";

describe("DeployDiffFormatter", () => {
  const summary: DiffSummary = {
    totalChanges: 3,
    creates: 0,
    updates: 1,
    deletes: 2,
    results: [
      {
        operation: "UPDATE",
        entityType: "Categories",
        entityName: "shirts",
        changes: [
          {
            field: "name",
            path: ["name"],
            kind: "changed",
            currentValue: "Shirts",
            desiredValue: "Tees",
          },
        ],
      },
      { operation: "DELETE", entityType: "Categories", entityName: "old-a" },
      { operation: "DELETE", entityType: "Categories", entityName: "old-b" },
    ],
  };

  it("labels entities missing from the config as left in Saleor, not deleted", () => {
    const output = stripAnsi(new DeployDiffFormatter().format(summary));

    expect(output).toContain('Only in Saleor: "old-a"');
    expect(output).not.toMatch(/delete/i);
  });

  it("counts only the changes deploy applies", () => {
    const output = stripAnsi(new DeployDiffFormatter().format(summary));

    expect(output).toContain("Total: 1 change (1 to update)");
    expect(output).toContain("2 only in Saleor: deploy leaves them in place");
  });
});
