import { describe, expect, it } from "vitest";
import type { SaleorConfig } from "../schema/schema";
import {
  extractInlineAttributeNames,
  isAttributeReference,
  isInlineAttributeDefinition,
  validateNoInlineDefinitions,
} from "./inline-attribute-validator";

describe("isAttributeReference", () => {
  it("returns true for { attribute: 'Color' }", () => {
    expect(isAttributeReference({ attribute: "Color" })).toBe(true);
  });

  it("returns true for reference with extra fields like variantSelection", () => {
    expect(isAttributeReference({ attribute: "Color", variantSelection: true })).toBe(true);
  });

  it("returns false for inline definition", () => {
    expect(isAttributeReference({ name: "Color", inputType: "DROPDOWN" })).toBe(false);
  });

  it("returns false for null", () => {
    expect(isAttributeReference(null)).toBe(false);
  });

  it("returns false for non-object", () => {
    expect(isAttributeReference("Color")).toBe(false);
  });
});

describe("isInlineAttributeDefinition", () => {
  it("returns true for object with name and inputType", () => {
    expect(isInlineAttributeDefinition({ name: "Color", inputType: "DROPDOWN" })).toBe(true);
  });

  it("returns false for reference", () => {
    expect(isInlineAttributeDefinition({ attribute: "Color" })).toBe(false);
  });

  it("returns false when attribute key is also present", () => {
    // Object with both attribute and inputType is treated as reference (not inline)
    expect(
      isInlineAttributeDefinition({ attribute: "Color", name: "Color", inputType: "DROPDOWN" })
    ).toBe(false);
  });

  it("returns false for null", () => {
    expect(isInlineAttributeDefinition(null)).toBe(false);
  });
});

describe("extractInlineAttributeNames", () => {
  it("extracts names from inline definitions only", () => {
    const attrs = [
      { attribute: "Color" },
      { name: "Size", inputType: "DROPDOWN" },
      { name: "Weight", inputType: "NUMERIC" },
    ];
    expect(extractInlineAttributeNames(attrs)).toEqual(["Size", "Weight"]);
  });

  it("returns empty array when all are references", () => {
    const attrs = [{ attribute: "Color" }, { attribute: "Size" }];
    expect(extractInlineAttributeNames(attrs)).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    expect(extractInlineAttributeNames([])).toEqual([]);
  });
});

describe("validateNoInlineDefinitions", () => {
  it("returns empty array when config has only references", () => {
    const config = {
      productTypes: [
        {
          name: "Apparel",
          productAttributes: [{ attribute: "Color" }],
          variantAttributes: [{ attribute: "Size" }],
        },
      ],
    } as unknown as SaleorConfig;

    expect(validateNoInlineDefinitions(config)).toEqual([]);
  });

  it("returns error when productTypes have inline definitions", () => {
    const config = {
      productTypes: [
        {
          name: "Apparel",
          productAttributes: [{ name: "Color", inputType: "DROPDOWN" }],
          variantAttributes: [],
        },
      ],
    } as unknown as SaleorConfig;

    const errors = validateNoInlineDefinitions(config);
    expect(errors).toHaveLength(1);
    expect(errors[0].entityType).toBe("productTypes");
    expect(errors[0].entityName).toBe("Apparel");
    expect(errors[0].inlineAttributeNames).toContain("Color");
  });

  it("returns error when pageTypes have inline definitions", () => {
    const config = {
      pageTypes: [
        {
          name: "BlogPost",
          attributes: [{ name: "Author", inputType: "PLAIN_TEXT" }],
        },
      ],
    } as unknown as SaleorConfig;

    const errors = validateNoInlineDefinitions(config);
    expect(errors).toHaveLength(1);
    expect(errors[0].entityType).toBe("pageTypes");
  });

  it("returns error when modelTypes have inline definitions", () => {
    const config = {
      modelTypes: [
        {
          name: "FAQ",
          attributes: [{ name: "Question", inputType: "PLAIN_TEXT" }],
        },
      ],
    } as unknown as SaleorConfig;

    const errors = validateNoInlineDefinitions(config);
    expect(errors).toHaveLength(1);
    expect(errors[0].entityType).toBe("modelTypes");
  });

  it("returns empty array for empty config", () => {
    expect(validateNoInlineDefinitions({} as SaleorConfig)).toEqual([]);
  });
});
