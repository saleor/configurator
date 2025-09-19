import { describe, expect, it } from "vitest";
import type { FullAttribute } from "../../../modules/config/schema/attribute.schema";
import type { DiffResult } from "../types";
import { AttributesComparator } from "./attributes-comparator";

describe("AttributesComparator", () => {
  it("detects create for missing attribute", () => {
    const comp = new AttributesComparator();
    const local: FullAttribute[] = [{ name: "A", inputType: "PLAIN_TEXT", type: "PRODUCT_TYPE" }];
    const remote: FullAttribute[] = [];
    const results = comp.compare(local, remote);
    expect(results.some((r: DiffResult) => r.operation === "CREATE" && r.entityName === "A")).toBe(
      true
    );
  });
});
