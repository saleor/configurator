import { describe, expect, it } from "vitest";
import { BaseError } from "../../lib/errors/shared";
import {
  ManifestLoadError,
  RecipeLoadError,
  RecipeNotFoundError,
  RecipeValidationError,
} from "./errors";

describe("Recipe Errors", () => {
  describe("RecipeNotFoundError", () => {
    it("should create error with recipe name", () => {
      const error = new RecipeNotFoundError("test-recipe");

      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(RecipeNotFoundError);
      expect(error.code).toBe("RECIPE_NOT_FOUND_ERROR");
      expect(error.message).toBe('Recipe "test-recipe" not found');
    });

    it("should include available recipes in suggestions", () => {
      const availableRecipes = ["multi-region", "digital-products", "click-and-collect"];
      const error = new RecipeNotFoundError("invalid", availableRecipes);

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toContain(
        "Available recipes: multi-region, digital-products, click-and-collect"
      );
    });

    it("should provide default suggestion when no recipes available", () => {
      const error = new RecipeNotFoundError("test");

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toContain("Use 'configurator recipe list' to see all recipes");
    });
  });

  describe("RecipeValidationError", () => {
    it("should create error with message", () => {
      const error = new RecipeValidationError("Invalid metadata format");

      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(RecipeValidationError);
      expect(error.code).toBe("RECIPE_VALIDATION_ERROR");
      expect(error.message).toBe("Invalid metadata format");
    });

    it("should include validation details in suggestions", () => {
      const details = ["name: Required", "category: Invalid format"];
      const error = new RecipeValidationError("Invalid recipe", details);

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toContain("name: Required");
      expect(suggestions).toContain("category: Invalid format");
    });

    it("should provide default suggestion when no details provided", () => {
      const error = new RecipeValidationError("Invalid recipe");

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toContain("Check the recipe YAML format matches the expected schema");
    });
  });

  describe("RecipeLoadError", () => {
    it("should create error with file path", () => {
      const error = new RecipeLoadError("recipes/test.yml");

      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(RecipeLoadError);
      expect(error.code).toBe("RECIPE_LOAD_ERROR");
      expect(error.message).toBe('Failed to load recipe from "recipes/test.yml"');
    });

    it("should include cause in message", () => {
      const error = new RecipeLoadError("recipes/test.yml", "File not found");

      expect(error.message).toBe('Failed to load recipe from "recipes/test.yml": File not found');
    });

    it("should provide helpful suggestions", () => {
      const error = new RecipeLoadError("recipes/test.yml");

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toContain("Ensure the file exists and is readable");
      expect(suggestions).toContain("Check the YAML syntax is valid");
    });
  });

  describe("ManifestLoadError", () => {
    it("should create error without cause", () => {
      const error = new ManifestLoadError();

      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(ManifestLoadError);
      expect(error.code).toBe("MANIFEST_LOAD_ERROR");
      expect(error.message).toBe("Failed to load recipe manifest");
    });

    it("should include cause in message", () => {
      const error = new ManifestLoadError("Invalid JSON");

      expect(error.message).toBe("Failed to load recipe manifest: Invalid JSON");
    });

    it("should provide helpful suggestions", () => {
      const error = new ManifestLoadError();

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toContain("Ensure the package is installed correctly");
      expect(suggestions).toContain("Try reinstalling @saleor/configurator");
    });
  });
});
