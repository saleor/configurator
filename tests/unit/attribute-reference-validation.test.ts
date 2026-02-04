import { describe, expect, it } from "vitest";
import {
  AttributeNotFoundError,
  DuplicateAttributeError,
  findSimilarNames,
  levenshteinDistance,
  WrongAttributeTypeError,
} from "../../src/lib/errors/validation-errors";

describe("attribute-reference-validation", () => {
  describe("levenshteinDistance", () => {
    it("returns 0 for identical strings", () => {
      expect(levenshteinDistance("color", "color")).toBe(0);
    });

    it("returns correct distance for one character difference", () => {
      expect(levenshteinDistance("color", "colr")).toBe(1);
      expect(levenshteinDistance("color", "colour")).toBe(1);
    });

    it("returns correct distance for multiple character differences", () => {
      expect(levenshteinDistance("color", "clor")).toBe(1);
      expect(levenshteinDistance("size", "seize")).toBe(1); // insert 'e' after 's'
      expect(levenshteinDistance("kitten", "sitting")).toBe(3); // classic example
    });

    it("returns string length for empty comparison", () => {
      expect(levenshteinDistance("", "color")).toBe(5);
      expect(levenshteinDistance("color", "")).toBe(5);
    });

    it("handles case differences", () => {
      expect(levenshteinDistance("Color", "color")).toBe(1);
    });
  });

  describe("findSimilarNames", () => {
    const candidates = ["Color", "Size", "Material", "Brand", "Weight"];

    it("finds similar names within distance threshold", () => {
      const similar = findSimilarNames("Colr", candidates);
      expect(similar).toContain("Color");
    });

    it("returns empty array when no similar names found", () => {
      const similar = findSimilarNames("xyz123", candidates);
      expect(similar).toEqual([]);
    });

    it("sorts results by distance (closest first)", () => {
      const similar = findSimilarNames("Colr", ["Colour", "Color", "Collar"]);
      expect(similar[0]).toBe("Color"); // Distance 1
    });

    it("is case insensitive for comparison", () => {
      // "COLR" should find "Color" since "colr" vs "color" has distance 1
      const similar = findSimilarNames("COLR", candidates);
      expect(similar).toContain("Color");
    });

    it("excludes case-insensitive exact matches", () => {
      // "COLOR" should NOT find "Color" since they're the same case-insensitively
      const similar = findSimilarNames("COLOR", candidates);
      expect(similar).not.toContain("Color");
    });

    it("does not include exact matches (distance > 0)", () => {
      const similar = findSimilarNames("Color", candidates);
      expect(similar).not.toContain("Color");
    });

    it("respects custom maxDistance", () => {
      const similar = findSimilarNames("xyz", candidates, 1);
      expect(similar).toEqual([]);
    });
  });

  describe("AttributeNotFoundError", () => {
    it("creates error with correct message", () => {
      const error = new AttributeNotFoundError(
        "Colr",
        "productAttributes",
        "productTypes",
        "Apparel"
      );
      expect(error.message).toContain("Colr");
      expect(error.message).toContain("productAttributes");
      expect(error.message).toContain("productTypes");
      expect(error.message).toContain("Apparel");
    });

    it("provides recovery suggestions without similar names", () => {
      const error = new AttributeNotFoundError(
        "InvalidAttr",
        "productAttributes",
        "productTypes",
        "Apparel"
      );
      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toContain('Add "InvalidAttr" to the productAttributes section');
      expect(suggestions).toContain("Check for typos in the attribute name");
    });

    it("provides 'did you mean' suggestion with similar names", () => {
      const error = new AttributeNotFoundError(
        "Colr",
        "productAttributes",
        "productTypes",
        "Apparel",
        ["Color", "Colour"]
      );
      const suggestions = error.getRecoverySuggestions();
      expect(suggestions[0]).toContain("Did you mean");
      expect(suggestions[0]).toContain("Color");
    });

    it("limits similar name suggestions to 3", () => {
      const error = new AttributeNotFoundError(
        "test",
        "productAttributes",
        "productTypes",
        "Test",
        ["test1", "test2", "test3", "test4", "test5"]
      );
      const suggestions = error.getRecoverySuggestions();
      // Should not include all 5 names
      expect(suggestions[0]).not.toContain("test4");
      expect(suggestions[0]).not.toContain("test5");
    });
  });

  describe("WrongAttributeTypeError", () => {
    it("creates error with correct message", () => {
      const error = new WrongAttributeTypeError(
        "Description",
        "contentAttributes",
        "productAttributes",
        "productTypes",
        "Apparel"
      );
      expect(error.message).toContain("Description");
      expect(error.message).toContain("content attribute");
      expect(error.message).toContain("product attribute");
    });

    it("provides recovery suggestions", () => {
      const error = new WrongAttributeTypeError(
        "Description",
        "contentAttributes",
        "productAttributes",
        "productTypes",
        "Apparel"
      );
      const suggestions = error.getRecoverySuggestions();
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.includes("Move"))).toBe(true);
    });
  });

  describe("DuplicateAttributeError", () => {
    it("creates error with correct message", () => {
      const error = new DuplicateAttributeError("Color", "productAttributes", 2);
      expect(error.message).toContain("Color");
      expect(error.message).toContain("2 times");
      expect(error.message).toContain("productAttributes");
    });

    it("provides recovery suggestions", () => {
      const error = new DuplicateAttributeError("Color", "productAttributes", 3);
      const suggestions = error.getRecoverySuggestions();
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.includes("Remove duplicate"))).toBe(true);
    });
  });
});
