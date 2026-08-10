import { describe, expect, it } from "vitest";
import { configSchema } from "./schema";

const parse = (customerTypes: unknown) => configSchema.safeParse({ customerTypes });

describe("customerType schema", () => {
  it("accepts a minimal customer type and defaults isDefault to false", () => {
    const result = parse([{ name: "Retail", slug: "retail" }]);

    expect(result.success).toBe(true);
    expect(result.data?.customerTypes?.[0]).toEqual({
      name: "Retail",
      slug: "retail",
      isDefault: false,
    });
  });

  it("accepts attribute references", () => {
    const result = parse([
      { name: "Retail", slug: "retail", attributes: [{ attribute: "Loyalty Tier" }] },
    ]);

    expect(result.success).toBe(true);
    expect(result.data?.customerTypes?.[0].attributes).toEqual([{ attribute: "Loyalty Tier" }]);
  });

  it("requires a slug", () => {
    expect(parse([{ name: "Retail" }]).success).toBe(false);
  });

  it("requires a name", () => {
    expect(parse([{ slug: "retail" }]).success).toBe(false);
  });

  it("accepts customerAttributes alongside customer types", () => {
    const result = configSchema.safeParse({
      customerAttributes: [{ name: "Loyalty Tier", inputType: "PLAIN_TEXT" }],
      customerTypes: [{ name: "Retail", slug: "retail" }],
    });

    expect(result.success).toBe(true);
  });
});
