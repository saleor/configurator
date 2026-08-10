import { describe, expect, it } from "vitest";
import type { CustomerTypeInput } from "../../../modules/config/schema/schema";
import { CustomerTypeComparator } from "./customer-type-comparator";

const retail: CustomerTypeInput = {
  name: "Retail",
  slug: "retail",
  isDefault: true,
  attributes: [{ attribute: "Loyalty Tier" }],
};

describe("CustomerTypeComparator", () => {
  const comparator = new CustomerTypeComparator();

  it("reports a create when the customer type is missing remotely", () => {
    const results = comparator.compare([retail], []);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      operation: "CREATE",
      entityType: "Customer Types",
      entityName: "retail",
    });
  });

  it("reports no changes for identical customer types", () => {
    expect(comparator.compare([retail], [retail])).toHaveLength(0);
  });

  it("matches on slug, not name", () => {
    const renamed = { ...retail, name: "Retail customers" };

    const results = comparator.compare([renamed], [retail]);

    expect(results).toHaveLength(1);
    expect(results[0].operation).toBe("UPDATE");
    expect(results[0].changes).toEqual([
      expect.objectContaining({
        field: "name",
        currentValue: "Retail",
        desiredValue: "Retail customers",
      }),
    ]);
  });

  it("detects an isDefault flip", () => {
    const results = comparator.compare([retail], [{ ...retail, isDefault: false }]);

    expect(results[0].changes).toEqual([
      expect.objectContaining({ field: "isDefault", currentValue: false, desiredValue: true }),
    ]);
  });

  it("treats a missing isDefault as false", () => {
    const local: CustomerTypeInput = { name: "Wholesale", slug: "wholesale" } as CustomerTypeInput;
    const remote: CustomerTypeInput = { ...local, isDefault: false };

    expect(comparator.compare([local], [remote])).toHaveLength(0);
  });

  it("detects added and removed attribute references", () => {
    const results = comparator.compare(
      [retail],
      [{ ...retail, attributes: [{ attribute: "Segment" }] }]
    );

    expect(results[0].changes).toEqual([
      expect.objectContaining({ field: "attributes", desiredValue: "Loyalty Tier" }),
      expect.objectContaining({ field: "attributes", currentValue: "Segment" }),
    ]);
  });

  it("reports a delete when the customer type is absent locally", () => {
    const results = comparator.compare([], [retail]);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ operation: "DELETE", entityName: "retail" });
  });
});
