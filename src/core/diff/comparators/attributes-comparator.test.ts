import { describe, expect, it } from "vitest";
import { AttributesComparator } from "./attributes-comparator";

describe("AttributesComparator", () => {
  it("detects create for missing attribute", () => {
    const comp = new AttributesComparator();
    const local = [ { name: "A", inputType: "PLAIN_TEXT", type: "PRODUCT_TYPE" } as any ];
    const remote: any[] = [];
    const results = comp.compare(local, remote);
    expect(results.some((r: any) => r.operation === "CREATE" && r.entityName === "A")).toBe(true);
  });
});
