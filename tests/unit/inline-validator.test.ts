import { describe, expect, it } from "vitest";
import type { SaleorConfig } from "../../src/modules/config/schema/schema";
import {
  extractInlineAttributeNames,
  hasInlineAttributeDefinitions,
  isAttributeReference,
  isInlineAttributeDefinition,
  validateNoInlineDefinitions,
} from "../../src/modules/config/validation/inline-attribute-validator";

describe("inline-attribute-validator", () => {
  describe("isAttributeReference", () => {
    it("returns true for valid attribute reference", () => {
      expect(isAttributeReference({ attribute: "Color" })).toBe(true);
    });

    it("returns true for attribute reference with variantSelection", () => {
      expect(isAttributeReference({ attribute: "Size", variantSelection: true })).toBe(true);
    });

    it("returns false for inline attribute definition", () => {
      expect(isAttributeReference({ name: "Color", inputType: "DROPDOWN" })).toBe(false);
    });

    it("returns false for null", () => {
      expect(isAttributeReference(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isAttributeReference(undefined)).toBe(false);
    });

    it("returns false for string", () => {
      expect(isAttributeReference("Color")).toBe(false);
    });

    it("returns false for empty object", () => {
      expect(isAttributeReference({})).toBe(false);
    });

    it("returns false when attribute is not a string", () => {
      expect(isAttributeReference({ attribute: 123 })).toBe(false);
    });
  });

  describe("isInlineAttributeDefinition", () => {
    it("returns true for inline attribute with inputType and name", () => {
      expect(isInlineAttributeDefinition({ name: "Color", inputType: "DROPDOWN" })).toBe(true);
    });

    it("returns true for inline attribute with additional properties", () => {
      expect(
        isInlineAttributeDefinition({
          name: "Color",
          inputType: "DROPDOWN",
          values: ["Red", "Blue"],
        })
      ).toBe(true);
    });

    it("returns false for attribute reference", () => {
      expect(isInlineAttributeDefinition({ attribute: "Color" })).toBe(false);
    });

    it("returns false for object with only inputType", () => {
      expect(isInlineAttributeDefinition({ inputType: "DROPDOWN" })).toBe(false);
    });

    it("returns false for object with only name", () => {
      expect(isInlineAttributeDefinition({ name: "Color" })).toBe(false);
    });

    it("returns false for null", () => {
      expect(isInlineAttributeDefinition(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isInlineAttributeDefinition(undefined)).toBe(false);
    });

    it("returns false if both attribute and inputType are present", () => {
      // If 'attribute' key is present, it's a reference, not inline
      expect(
        isInlineAttributeDefinition({ attribute: "Color", inputType: "DROPDOWN", name: "Color" })
      ).toBe(false);
    });
  });

  describe("extractInlineAttributeNames", () => {
    it("extracts names from inline definitions", () => {
      const attrs = [
        { name: "Color", inputType: "DROPDOWN" },
        { attribute: "Size" },
        { name: "Material", inputType: "TEXT" },
      ];
      expect(extractInlineAttributeNames(attrs)).toEqual(["Color", "Material"]);
    });

    it("returns empty array when no inline definitions", () => {
      const attrs = [{ attribute: "Color" }, { attribute: "Size" }];
      expect(extractInlineAttributeNames(attrs)).toEqual([]);
    });

    it("returns empty array for empty input", () => {
      expect(extractInlineAttributeNames([])).toEqual([]);
    });
  });

  describe("validateNoInlineDefinitions", () => {
    it("returns empty array when no inline definitions exist", () => {
      const config: SaleorConfig = {
        productTypes: [
          {
            name: "Apparel",
            isShippingRequired: true,
            productAttributes: [{ attribute: "Color" }],
            variantAttributes: [{ attribute: "Size" }],
          },
        ],
      };
      expect(validateNoInlineDefinitions(config)).toEqual([]);
    });

    it("returns errors for inline definitions in productTypes productAttributes", () => {
      const config: SaleorConfig = {
        productTypes: [
          {
            name: "Apparel",
            isShippingRequired: true,
            productAttributes: [{ name: "Color", inputType: "DROPDOWN" } as any],
          },
        ],
      };
      const errors = validateNoInlineDefinitions(config);
      expect(errors).toHaveLength(1);
      expect(errors[0].entityType).toBe("productTypes");
      expect(errors[0].entityName).toBe("Apparel");
      expect(errors[0].inlineAttributeNames).toContain("Color");
      expect(errors[0].expectedSection).toBe("productAttributes");
    });

    it("returns errors for inline definitions in productTypes variantAttributes", () => {
      const config: SaleorConfig = {
        productTypes: [
          {
            name: "Apparel",
            isShippingRequired: true,
            productAttributes: [{ attribute: "Color" }],
            variantAttributes: [{ name: "Size", inputType: "DROPDOWN" } as any],
          },
        ],
      };
      const errors = validateNoInlineDefinitions(config);
      expect(errors).toHaveLength(1);
      expect(errors[0].inlineAttributeNames).toContain("Size");
    });

    it("returns errors for inline definitions in modelTypes", () => {
      const config: SaleorConfig = {
        modelTypes: [
          {
            name: "Article",
            attributes: [{ name: "Author", inputType: "TEXT" } as any],
          },
        ],
      };
      const errors = validateNoInlineDefinitions(config);
      expect(errors).toHaveLength(1);
      expect(errors[0].entityType).toBe("modelTypes");
      expect(errors[0].entityName).toBe("Article");
      expect(errors[0].inlineAttributeNames).toContain("Author");
      expect(errors[0].expectedSection).toBe("contentAttributes");
    });

    it("returns multiple errors for multiple violations", () => {
      const config: SaleorConfig = {
        productTypes: [
          {
            name: "Apparel",
            isShippingRequired: true,
            productAttributes: [{ name: "Color", inputType: "DROPDOWN" } as any],
          },
          {
            name: "Electronics",
            isShippingRequired: false,
            productAttributes: [{ name: "Brand", inputType: "TEXT" } as any],
          },
        ],
        modelTypes: [
          {
            name: "Article",
            attributes: [{ name: "Author", inputType: "TEXT" } as any],
          },
        ],
      };
      const errors = validateNoInlineDefinitions(config);
      expect(errors).toHaveLength(3);
    });

    it("handles config without productTypes or modelTypes", () => {
      const config: SaleorConfig = {
        channels: [
          {
            slug: "default",
            name: "Default",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
        ],
      };
      expect(validateNoInlineDefinitions(config)).toEqual([]);
    });

    it("handles empty productTypes and modelTypes arrays", () => {
      const config: SaleorConfig = {
        productTypes: [],
        modelTypes: [],
      };
      expect(validateNoInlineDefinitions(config)).toEqual([]);
    });
  });

  describe("hasInlineAttributeDefinitions", () => {
    it("returns true when inline definitions exist", () => {
      const config: SaleorConfig = {
        productTypes: [
          {
            name: "Apparel",
            isShippingRequired: true,
            productAttributes: [{ name: "Color", inputType: "DROPDOWN" } as any],
          },
        ],
      };
      expect(hasInlineAttributeDefinitions(config)).toBe(true);
    });

    it("returns false when no inline definitions exist", () => {
      const config: SaleorConfig = {
        productTypes: [
          {
            name: "Apparel",
            isShippingRequired: true,
            productAttributes: [{ attribute: "Color" }],
          },
        ],
      };
      expect(hasInlineAttributeDefinitions(config)).toBe(false);
    });

    it("returns false for empty config", () => {
      const config: SaleorConfig = {};
      expect(hasInlineAttributeDefinitions(config)).toBe(false);
    });
  });
});
