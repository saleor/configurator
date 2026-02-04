import { describe, expect, it } from "vitest";
import { contentAttributeSchema, productAttributeSchema } from "./global-attributes.schema";

describe("global-attributes.schema", () => {
  describe("productAttributeSchema", () => {
    describe("discriminated union by inputType", () => {
      it("should parse PLAIN_TEXT attribute", () => {
        const input = { name: "Publisher", inputType: "PLAIN_TEXT" };

        const result = productAttributeSchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(input);
        }
      });

      it("should parse NUMERIC attribute", () => {
        const input = { name: "Weight", inputType: "NUMERIC" };

        const result = productAttributeSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should parse DATE attribute", () => {
        const input = { name: "Release Date", inputType: "DATE" };

        const result = productAttributeSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should parse BOOLEAN attribute", () => {
        const input = { name: "Is Limited Edition", inputType: "BOOLEAN" };

        const result = productAttributeSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should parse RICH_TEXT attribute", () => {
        const input = { name: "Description", inputType: "RICH_TEXT" };

        const result = productAttributeSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should parse DATE_TIME attribute", () => {
        const input = { name: "Launch Time", inputType: "DATE_TIME" };

        const result = productAttributeSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should parse FILE attribute", () => {
        const input = { name: "Manual PDF", inputType: "FILE" };

        const result = productAttributeSchema.safeParse(input);

        expect(result.success).toBe(true);
      });
    });

    describe("DROPDOWN attributes", () => {
      it("should require values array", () => {
        const input = { name: "Genre", inputType: "DROPDOWN" };

        const result = productAttributeSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          // Zod 4 reports "expected array" for missing required arrays
          expect(result.error.issues[0].message).toMatch(/expected array|Required/i);
        }
      });

      it("should require at least one value", () => {
        const input = { name: "Genre", inputType: "DROPDOWN", values: [] };

        const result = productAttributeSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("at least one value");
        }
      });

      it("should parse valid DROPDOWN attribute", () => {
        const input = {
          name: "Genre",
          inputType: "DROPDOWN",
          values: [{ name: "Fantasy" }, { name: "Science Fiction" }],
        };

        const result = productAttributeSchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success && result.data.inputType === "DROPDOWN") {
          expect(result.data.values).toHaveLength(2);
        }
      });
    });

    describe("MULTISELECT attributes", () => {
      it("should require values array", () => {
        const input = { name: "Tags", inputType: "MULTISELECT" };

        const result = productAttributeSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should require at least one value", () => {
        const input = { name: "Tags", inputType: "MULTISELECT", values: [] };

        const result = productAttributeSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("at least one value");
        }
      });

      it("should parse valid MULTISELECT attribute", () => {
        const input = {
          name: "Tags",
          inputType: "MULTISELECT",
          values: [{ name: "New Arrival" }, { name: "Sale" }],
        };

        const result = productAttributeSchema.safeParse(input);

        expect(result.success).toBe(true);
      });
    });

    describe("SWATCH attributes", () => {
      it("should require values array", () => {
        const input = { name: "Color", inputType: "SWATCH" };

        const result = productAttributeSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should parse valid SWATCH attribute", () => {
        const input = {
          name: "Color",
          inputType: "SWATCH",
          values: [{ name: "Red" }, { name: "Blue" }],
        };

        const result = productAttributeSchema.safeParse(input);

        expect(result.success).toBe(true);
      });
    });

    describe("REFERENCE attributes", () => {
      it("should require entityType", () => {
        const input = { name: "Related Product", inputType: "REFERENCE" };

        const result = productAttributeSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should parse REFERENCE with PAGE entityType", () => {
        const input = { name: "Related Page", inputType: "REFERENCE", entityType: "PAGE" };

        const result = productAttributeSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should parse REFERENCE with PRODUCT entityType", () => {
        const input = { name: "Related Product", inputType: "REFERENCE", entityType: "PRODUCT" };

        const result = productAttributeSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should parse REFERENCE with PRODUCT_VARIANT entityType", () => {
        const input = {
          name: "Related Variant",
          inputType: "REFERENCE",
          entityType: "PRODUCT_VARIANT",
        };

        const result = productAttributeSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should reject invalid entityType", () => {
        const input = { name: "Invalid", inputType: "REFERENCE", entityType: "INVALID" };

        const result = productAttributeSchema.safeParse(input);

        expect(result.success).toBe(false);
      });
    });

    describe("validation", () => {
      it("should require name", () => {
        const input = { inputType: "PLAIN_TEXT" };

        const result = productAttributeSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should require non-empty name", () => {
        const input = { name: "", inputType: "PLAIN_TEXT" };

        const result = productAttributeSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("required");
        }
      });

      it("should reject unknown inputType", () => {
        const input = { name: "Test", inputType: "UNKNOWN" };

        const result = productAttributeSchema.safeParse(input);

        expect(result.success).toBe(false);
      });
    });
  });

  describe("contentAttributeSchema", () => {
    it("should parse PLAIN_TEXT content attribute", () => {
      const input = { name: "Author", inputType: "PLAIN_TEXT" };

      const result = contentAttributeSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should parse DROPDOWN content attribute with values", () => {
      const input = {
        name: "Scent Family",
        inputType: "DROPDOWN",
        values: [{ name: "Citrus" }, { name: "Woody" }],
      };

      const result = contentAttributeSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should require values for DROPDOWN content attribute", () => {
      const input = { name: "Category", inputType: "DROPDOWN" };

      const result = contentAttributeSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should parse REFERENCE content attribute", () => {
      const input = { name: "Featured Product", inputType: "REFERENCE", entityType: "PRODUCT" };

      const result = contentAttributeSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should reject empty name", () => {
      const input = { name: "", inputType: "PLAIN_TEXT" };

      const result = contentAttributeSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe("attribute value schema", () => {
    it("should require name in dropdown values", () => {
      const input = {
        name: "Genre",
        inputType: "DROPDOWN",
        values: [{ name: "" }],
      };

      const result = productAttributeSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should allow valid values", () => {
      const input = {
        name: "Genre",
        inputType: "DROPDOWN",
        values: [{ name: "Fantasy" }, { name: "Science Fiction" }, { name: "Mystery" }],
      };

      const result = productAttributeSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success && result.data.inputType === "DROPDOWN") {
        expect(result.data.values).toHaveLength(3);
      }
    });
  });
});
