import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ZodValidationError } from "./zod";

describe("ZodValidationError.fromZodError", () => {
  it("formats a simple missing field error", () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const result = schema.safeParse({ name: "test" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = ZodValidationError.fromZodError(result.error, "Validation failed");
      expect(error.message).toContain("age");
      expect(error.message).toContain("Validation failed");
    }
  });

  it("formats invalid_union error with branch hints", () => {
    const inlineAttr = z.object({ name: z.string(), inputType: z.literal("DROPDOWN") });
    const refAttr = z.object({ attribute: z.string() });
    const schema = z.object({
      attr: z.union([inlineAttr, refAttr]),
    });
    // Missing both `inputType` (for inline) and `attribute` (for ref)
    const result = schema.safeParse({ attr: { name: "Brand" } });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = ZodValidationError.fromZodError(result.error, "Config error");
      expect(error.message).toContain("attr");
      expect(error.message).toMatch(/expected one of|union|option/i);
    }
  });

  it("formats invalid_union with path correctly", () => {
    const schema = z.object({
      items: z.array(z.union([z.string(), z.number()])),
    });
    const result = schema.safeParse({ items: [true] }); // boolean not in union
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = ZodValidationError.fromZodError(result.error);
      expect(error.message).toContain("items");
    }
  });
});
