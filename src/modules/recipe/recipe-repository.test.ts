import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManifestLoadError, RecipeNotFoundError, RecipeValidationError } from "./errors";

// Mock the fs module
vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
}));

// Mock recipe-loader
vi.mock("./recipe-loader", () => ({
  getRecipesDir: vi.fn(() => "/mock/recipes"),
  loadRecipeFile: vi.fn(),
}));

import { readFileSync } from "node:fs";
import { loadRecipeFile } from "./recipe-loader";
import { loadManifest, loadRecipe, loadRecipeFromFile } from "./recipe-repository";

describe("Recipe Repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadManifest", () => {
    it("should load and parse valid manifest", () => {
      const validManifest = {
        version: "1.0.0",
        generatedAt: "2026-01-19T10:30:00Z",
        recipes: [
          {
            name: "multi-region",
            description: "Multi-region setup",
            category: "multi-region",
            file: "multi-region.yml",
            version: "1.0.0",
            saleorVersion: ">=3.15",
            entitySummary: { channels: 3 },
          },
        ],
      };

      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validManifest));

      const result = loadManifest();

      expect(result.version).toBe("1.0.0");
      expect(result.recipes).toHaveLength(1);
      expect(result.recipes[0].name).toBe("multi-region");
      expect(readFileSync).toHaveBeenCalledWith("/mock/recipes/manifest.json", "utf-8");
    });

    it("should throw ManifestLoadError for invalid JSON", () => {
      vi.mocked(readFileSync).mockReturnValue("invalid json {");

      expect(() => loadManifest()).toThrow(ManifestLoadError);
    });

    it("should throw ManifestLoadError for invalid manifest schema", () => {
      const invalidManifest = {
        version: "2.0.0", // Invalid version
        generatedAt: "2026-01-19T10:30:00Z",
        recipes: [],
      };

      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(invalidManifest));

      expect(() => loadManifest()).toThrow(ManifestLoadError);
    });

    it("should throw ManifestLoadError when file not found", () => {
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error("ENOENT: no such file or directory");
      });

      expect(() => loadManifest()).toThrow(ManifestLoadError);
      expect(() => loadManifest()).toThrow(/ENOENT/);
    });
  });

  describe("loadRecipe", () => {
    const validManifest = {
      version: "1.0.0",
      generatedAt: "2026-01-19T10:30:00Z",
      recipes: [
        {
          name: "multi-region",
          description: "Multi-region setup",
          category: "multi-region",
          file: "multi-region.yml",
          version: "1.0.0",
          saleorVersion: ">=3.15",
          entitySummary: { channels: 3 },
        },
      ],
    };

    const validMetadata = {
      name: "multi-region",
      description: "Configure channels for US, EU, and UK markets",
      category: "multi-region",
      version: "1.0.0",
      saleorVersion: ">=3.15",
      docsUrl: "https://docs.saleor.io/docs/channels",
      useCase: "Set up a global e-commerce presence",
      prerequisites: ["Saleor instance"],
      customizationHints: ["Modify currencies"],
      entitySummary: { channels: 3 },
    };

    const validConfig = {
      channels: [
        {
          name: "Test",
          slug: "test",
          currencyCode: "USD",
          defaultCountry: "US",
        },
      ],
    };

    it("should load recipe by name", () => {
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validManifest));
      vi.mocked(loadRecipeFile).mockReturnValue({
        metadata: validMetadata,
        config: validConfig,
      });

      const result = loadRecipe("multi-region");

      expect(result.metadata.name).toBe("multi-region");
      expect(result.config.channels).toHaveLength(1);
      expect(loadRecipeFile).toHaveBeenCalledWith("/mock/recipes/multi-region.yml");
    });

    it("should throw RecipeNotFoundError for unknown recipe", () => {
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validManifest));

      expect(() => loadRecipe("unknown-recipe")).toThrow(RecipeNotFoundError);
      expect(() => loadRecipe("unknown-recipe")).toThrow(/Recipe "unknown-recipe" not found/);
    });

    it("should throw RecipeValidationError for invalid metadata", () => {
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validManifest));
      vi.mocked(loadRecipeFile).mockReturnValue({
        metadata: { name: "invalid" }, // Missing required fields
        config: {},
      });

      expect(() => loadRecipe("multi-region")).toThrow(RecipeValidationError);
      expect(() => loadRecipe("multi-region")).toThrow(/Invalid recipe metadata/);
    });

    it("should throw RecipeValidationError for invalid config", () => {
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validManifest));
      vi.mocked(loadRecipeFile).mockReturnValue({
        metadata: validMetadata,
        config: {
          channels: [{ invalid: true }], // Invalid channel config
        },
      });

      expect(() => loadRecipe("multi-region")).toThrow(RecipeValidationError);
      expect(() => loadRecipe("multi-region")).toThrow(/Invalid recipe configuration/);
    });

    it("should throw RecipeValidationError when name does not match filename", () => {
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validManifest));
      vi.mocked(loadRecipeFile).mockReturnValue({
        metadata: { ...validMetadata, name: "wrong-name" },
        config: validConfig,
      });

      expect(() => loadRecipe("multi-region")).toThrow(RecipeValidationError);
      expect(() => loadRecipe("multi-region")).toThrow(
        /Metadata name "wrong-name" does not match filename/
      );
    });
  });

  describe("loadRecipeFromFile", () => {
    const validMetadata = {
      name: "custom-recipe",
      description: "A custom recipe for local use",
      category: "general",
      version: "1.0.0",
      saleorVersion: ">=3.15",
      docsUrl: "https://docs.saleor.io",
      useCase: "Custom configuration",
      prerequisites: [],
      customizationHints: [],
      entitySummary: {},
    };

    it("should load recipe from custom file path", () => {
      vi.mocked(loadRecipeFile).mockReturnValue({
        metadata: validMetadata,
        config: {},
      });

      const result = loadRecipeFromFile("/custom/path/recipe.yml");

      expect(result.metadata.name).toBe("custom-recipe");
      expect(loadRecipeFile).toHaveBeenCalledWith("/custom/path/recipe.yml");
    });

    it("should throw RecipeValidationError for invalid metadata", () => {
      vi.mocked(loadRecipeFile).mockReturnValue({
        metadata: { invalid: true },
        config: {},
      });

      expect(() => loadRecipeFromFile("/custom/recipe.yml")).toThrow(RecipeValidationError);
    });

    it("should throw RecipeValidationError for invalid config", () => {
      vi.mocked(loadRecipeFile).mockReturnValue({
        metadata: validMetadata,
        config: {
          productTypes: [{ invalid: true }],
        },
      });

      expect(() => loadRecipeFromFile("/custom/recipe.yml")).toThrow(RecipeValidationError);
    });
  });
});
