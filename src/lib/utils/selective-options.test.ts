import { describe, expect, it } from "vitest";
import {
  AVAILABLE_SECTIONS,
  type ConfigurationSection,
  getSelectiveOptionsSummary,
  parseSelectiveOptions,
  shouldIncludeSection,
} from "./selective-options";

describe("selective-options utility", () => {
  describe("parseSelectiveOptions", () => {
    it("should parse valid only sections", () => {
      // Arrange
      const options = { only: "channels,shop" };

      // Act
      const result = parseSelectiveOptions(options);

      // Assert
      expect(result.includeSections).toEqual(["channels", "shop"]);
      expect(result.excludeSections).toEqual([]);
    });

    it("should parse valid exclude sections", () => {
      // Arrange
      const options = { exclude: "products,categories" };

      // Act
      const result = parseSelectiveOptions(options);

      // Assert
      expect(result.includeSections).toEqual([]);
      expect(result.excludeSections).toEqual(["products", "categories"]);
    });

    it("should handle empty options", () => {
      // Arrange
      const options = {};

      // Act
      const result = parseSelectiveOptions(options);

      // Assert
      expect(result.includeSections).toEqual([]);
      expect(result.excludeSections).toEqual([]);
    });

    it("should throw error for invalid sections mixed with valid ones", () => {
      // Arrange
      const options = { only: "channels,invalid,shop" };

      // Act & Assert
      expect(() => parseSelectiveOptions(options)).toThrow(
        `Invalid sections specified in --only: invalid. Available sections: ${AVAILABLE_SECTIONS.join(", ")}`
      );
    });

    it("should handle whitespace in section names", () => {
      // Arrange
      const options = { only: " channels , shop " };

      // Act
      const result = parseSelectiveOptions(options);

      // Assert
      expect(result.includeSections).toEqual(["channels", "shop"]);
    });

    it("should throw error for invalid only sections", () => {
      // Arrange
      const options = { only: "invalid,unknown" };

      // Act & Assert
      expect(() => parseSelectiveOptions(options)).toThrow(
        `Invalid sections specified in --only: invalid, unknown. Available sections: ${AVAILABLE_SECTIONS.join(", ")}`
      );
    });

    it("should throw error for invalid exclude sections", () => {
      // Arrange
      const options = { exclude: "invalid,unknown" };

      // Act & Assert
      expect(() => parseSelectiveOptions(options)).toThrow(
        `Invalid sections specified in --exclude: invalid, unknown. Available sections: ${AVAILABLE_SECTIONS.join(", ")}`
      );
    });
  });

  describe("shouldIncludeSection", () => {
    it("should include section when only specific sections are included", () => {
      // Arrange
      const options = {
        includeSections: ["channels", "shop"] as ConfigurationSection[],
        excludeSections: [] as ConfigurationSection[],
      };

      // Act & Assert
      expect(shouldIncludeSection("channels", options)).toBe(true);
      expect(shouldIncludeSection("shop", options)).toBe(true);
      expect(shouldIncludeSection("products", options)).toBe(false);
    });

    it("should exclude section when sections are excluded", () => {
      // Arrange
      const options = {
        includeSections: [] as ConfigurationSection[],
        excludeSections: ["products", "categories"] as ConfigurationSection[],
      };

      // Act & Assert
      expect(shouldIncludeSection("channels", options)).toBe(true);
      expect(shouldIncludeSection("shop", options)).toBe(true);
      expect(shouldIncludeSection("products", options)).toBe(false);
      expect(shouldIncludeSection("categories", options)).toBe(false);
    });

    it("should include all sections when no selective options", () => {
      // Arrange
      const options = {
        includeSections: [] as ConfigurationSection[],
        excludeSections: [] as ConfigurationSection[],
      };

      // Act & Assert
      expect(shouldIncludeSection("channels", options)).toBe(true);
      expect(shouldIncludeSection("shop", options)).toBe(true);
      expect(shouldIncludeSection("products", options)).toBe(true);
      expect(shouldIncludeSection("categories", options)).toBe(true);
    });
  });

  describe("getSelectiveOptionsSummary", () => {
    it("should return include message when sections are included", () => {
      // Arrange
      const options = {
        includeSections: ["channels", "shop"] as ConfigurationSection[],
        excludeSections: [] as ConfigurationSection[],
      };

      // Act
      const result = getSelectiveOptionsSummary(options);

      // Assert
      expect(result.includeMessage).toBe("📋 Including only: channels, shop");
      expect(result.excludeMessage).toBeUndefined();
    });

    it("should return exclude message when sections are excluded", () => {
      // Arrange
      const options = {
        includeSections: [] as ConfigurationSection[],
        excludeSections: ["products", "categories"] as ConfigurationSection[],
      };

      // Act
      const result = getSelectiveOptionsSummary(options);

      // Assert
      expect(result.includeMessage).toBeUndefined();
      expect(result.excludeMessage).toBe("📋 Excluding: products, categories");
    });

    it("should return empty messages when no selective options", () => {
      // Arrange
      const options = {
        includeSections: [] as ConfigurationSection[],
        excludeSections: [] as ConfigurationSection[],
      };

      // Act
      const result = getSelectiveOptionsSummary(options);

      // Assert
      expect(result.includeMessage).toBeUndefined();
      expect(result.excludeMessage).toBeUndefined();
    });
  });
});
