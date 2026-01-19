import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Recipe, RecipeManifestEntry } from "./schema";

// Mock recipe-repository
vi.mock("./recipe-repository", () => ({
  loadManifest: vi.fn(),
  loadRecipe: vi.fn(),
  loadRecipeFromFile: vi.fn(),
}));

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadManifest, loadRecipe, loadRecipeFromFile } from "./recipe-repository";
import {
  determineOutputPath,
  exportRecipe,
  formatConfigPreview,
  formatRecipeDetails,
  formatRecipeDetailsJson,
  formatRecipeList,
  formatRecipeListJson,
  getRecipe,
  listRecipes,
  loadRecipeConfig,
  resolveRecipeSource,
  validateSaleorVersion,
} from "./recipe-service";

// Test fixtures
const createMockManifestEntry = (
  overrides: Partial<RecipeManifestEntry> = {}
): RecipeManifestEntry => ({
  name: "test-recipe",
  description: "A test recipe for testing",
  category: "general",
  file: "test-recipe.yml",
  version: "1.0.0",
  saleorVersion: ">=3.15",
  entitySummary: {
    channels: 1,
    categories: 2,
  },
  ...overrides,
});

const createMockRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  metadata: {
    name: "test-recipe",
    description: "A test recipe for testing",
    category: "general",
    version: "1.0.0",
    saleorVersion: ">=3.15",
    docsUrl: "https://docs.example.com",
    useCase: "Testing the recipe system",
    prerequisites: ["Saleor instance"],
    customizationHints: ["Customize as needed"],
    entitySummary: {
      channels: 1,
      categories: 2,
    },
    examples: {
      before: "# Before\nchannels: []",
      after: "# After\nchannels:\n  - slug: test",
    },
  },
  config: {
    channels: [
      {
        name: "Test Channel",
        slug: "test-channel",
        currencyCode: "USD",
        defaultCountry: "US",
        isActive: true,
      },
    ],
  },
  ...overrides,
});

describe("recipe-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listRecipes", () => {
    it("returns all recipes when no category filter", () => {
      const mockEntries: RecipeManifestEntry[] = [
        createMockManifestEntry({ name: "recipe-1", category: "general" }),
        createMockManifestEntry({ name: "recipe-2", category: "multi-region" }),
        createMockManifestEntry({ name: "recipe-3", category: "digital" }),
      ];
      vi.mocked(loadManifest).mockReturnValue({
        version: "1.0.0",
        generatedAt: "2026-01-19T00:00:00Z",
        recipes: mockEntries,
      });

      const result = listRecipes();

      expect(result).toHaveLength(3);
      expect(loadManifest).toHaveBeenCalledOnce();
    });

    it("filters recipes by category", () => {
      const mockEntries: RecipeManifestEntry[] = [
        createMockManifestEntry({ name: "recipe-1", category: "general" }),
        createMockManifestEntry({ name: "recipe-2", category: "multi-region" }),
        createMockManifestEntry({ name: "recipe-3", category: "multi-region" }),
      ];
      vi.mocked(loadManifest).mockReturnValue({
        version: "1.0.0",
        generatedAt: "2026-01-19T00:00:00Z",
        recipes: mockEntries,
      });

      const result = listRecipes({ category: "multi-region" });

      expect(result).toHaveLength(2);
      expect(result.every((r) => r.category === "multi-region")).toBe(true);
    });

    it("returns empty array when no recipes match category", () => {
      const mockEntries: RecipeManifestEntry[] = [
        createMockManifestEntry({ name: "recipe-1", category: "general" }),
      ];
      vi.mocked(loadManifest).mockReturnValue({
        version: "1.0.0",
        generatedAt: "2026-01-19T00:00:00Z",
        recipes: mockEntries,
      });

      const result = listRecipes({ category: "digital" });

      expect(result).toHaveLength(0);
    });
  });

  describe("formatRecipeList", () => {
    it("returns 'No recipes found.' for empty list", () => {
      const result = formatRecipeList([]);
      expect(result).toBe("No recipes found.");
    });

    it("formats recipes grouped by category", () => {
      const recipes: RecipeManifestEntry[] = [
        createMockManifestEntry({ name: "multi-1", category: "multi-region" }),
        createMockManifestEntry({ name: "general-1", category: "general" }),
      ];

      const result = formatRecipeList(recipes);

      expect(result).toContain("Available Recipes");
      expect(result).toContain("MULTI-REGION");
      expect(result).toContain("GENERAL");
      expect(result).toContain("multi-1");
      expect(result).toContain("general-1");
    });

    it("includes entity summary and saleor version", () => {
      const recipes: RecipeManifestEntry[] = [
        createMockManifestEntry({
          name: "test",
          category: "general",
          saleorVersion: ">=3.15",
          entitySummary: { channels: 3, categories: 5 },
        }),
      ];

      const result = formatRecipeList(recipes);

      expect(result).toContain("3 channels");
      expect(result).toContain("5 categories");
      expect(result).toContain(">=3.15");
    });

    it("includes usage hint at the end", () => {
      const recipes: RecipeManifestEntry[] = [
        createMockManifestEntry({ name: "test", category: "general" }),
      ];

      const result = formatRecipeList(recipes);

      expect(result).toContain("configurator recipe show");
    });
  });

  describe("formatRecipeListJson", () => {
    it("returns valid JSON with recipes array and total", () => {
      const recipes: RecipeManifestEntry[] = [
        createMockManifestEntry({ name: "recipe-1" }),
        createMockManifestEntry({ name: "recipe-2" }),
      ];

      const result = formatRecipeListJson(recipes);
      const parsed = JSON.parse(result);

      expect(parsed.recipes).toHaveLength(2);
      expect(parsed.total).toBe(2);
    });

    it("returns empty array for no recipes", () => {
      const result = formatRecipeListJson([]);
      const parsed = JSON.parse(result);

      expect(parsed.recipes).toHaveLength(0);
      expect(parsed.total).toBe(0);
    });
  });

  describe("getRecipe", () => {
    it("delegates to loadRecipe", () => {
      const mockRecipe = createMockRecipe();
      vi.mocked(loadRecipe).mockReturnValue(mockRecipe);

      const result = getRecipe("test-recipe");

      expect(loadRecipe).toHaveBeenCalledWith("test-recipe");
      expect(result).toBe(mockRecipe);
    });
  });

  describe("resolveRecipeSource", () => {
    it("identifies file paths with forward slashes", () => {
      const result = resolveRecipeSource("./recipes/custom.yml");
      expect(result).toEqual({ type: "file", value: "./recipes/custom.yml" });
    });

    it("identifies file paths with backslashes", () => {
      const result = resolveRecipeSource(".\\recipes\\custom.yml");
      expect(result).toEqual({ type: "file", value: ".\\recipes\\custom.yml" });
    });

    it("identifies .yml file extensions", () => {
      const result = resolveRecipeSource("custom.yml");
      expect(result).toEqual({ type: "file", value: "custom.yml" });
    });

    it("identifies .yaml file extensions", () => {
      const result = resolveRecipeSource("custom.yaml");
      expect(result).toEqual({ type: "file", value: "custom.yaml" });
    });

    it("identifies builtin recipe names", () => {
      const result = resolveRecipeSource("multi-region");
      expect(result).toEqual({ type: "builtin", value: "multi-region" });
    });

    it("identifies builtin names without special characters", () => {
      const result = resolveRecipeSource("digital-products");
      expect(result).toEqual({ type: "builtin", value: "digital-products" });
    });
  });

  describe("loadRecipeConfig", () => {
    it("loads builtin recipe by name", () => {
      const mockRecipe = createMockRecipe();
      vi.mocked(loadRecipe).mockReturnValue(mockRecipe);

      const result = loadRecipeConfig("multi-region");

      expect(loadRecipe).toHaveBeenCalledWith("multi-region");
      expect(result).toBe(mockRecipe);
    });

    it("loads recipe from file path", () => {
      const mockRecipe = createMockRecipe();
      vi.mocked(loadRecipeFromFile).mockReturnValue(mockRecipe);

      const result = loadRecipeConfig("./custom/recipe.yml");

      expect(loadRecipeFromFile).toHaveBeenCalledWith("./custom/recipe.yml");
      expect(result).toBe(mockRecipe);
    });
  });

  describe("formatRecipeDetails", () => {
    it("includes recipe name and description", () => {
      const recipe = createMockRecipe({
        metadata: {
          ...createMockRecipe().metadata,
          name: "my-recipe",
          description: "My awesome recipe description",
        },
      });

      const result = formatRecipeDetails(recipe);

      expect(result).toContain("Recipe: my-recipe");
      expect(result).toContain("My awesome recipe description");
    });

    it("includes category, version, and saleor version", () => {
      const recipe = createMockRecipe({
        metadata: {
          ...createMockRecipe().metadata,
          category: "multi-region",
          version: "2.0.0",
          saleorVersion: ">=3.16",
        },
      });

      const result = formatRecipeDetails(recipe);

      expect(result).toContain("multi-region");
      expect(result).toContain("2.0.0");
      expect(result).toContain(">=3.16");
    });

    it("includes documentation URL", () => {
      const recipe = createMockRecipe({
        metadata: {
          ...createMockRecipe().metadata,
          docsUrl: "https://docs.saleor.io/custom",
        },
      });

      const result = formatRecipeDetails(recipe);

      expect(result).toContain("https://docs.saleor.io/custom");
    });

    it("includes use case information", () => {
      const recipe = createMockRecipe({
        metadata: {
          ...createMockRecipe().metadata,
          useCase: "Set up a multi-region store with separate channels",
        },
      });

      const result = formatRecipeDetails(recipe);

      expect(result).toContain("Use Case");
      expect(result).toContain("multi-region store");
    });

    it("includes prerequisites when present", () => {
      const recipe = createMockRecipe({
        metadata: {
          ...createMockRecipe().metadata,
          prerequisites: ["Saleor Cloud account", "API token"],
        },
      });

      const result = formatRecipeDetails(recipe);

      expect(result).toContain("Prerequisites");
      expect(result).toContain("Saleor Cloud account");
      expect(result).toContain("API token");
    });

    it("includes entity summary", () => {
      const recipe = createMockRecipe({
        metadata: {
          ...createMockRecipe().metadata,
          entitySummary: { channels: 3, warehouses: 2, shippingZones: 3 },
        },
      });

      const result = formatRecipeDetails(recipe);

      expect(result).toContain("Entities Included");
      expect(result).toContain("3 channels");
      expect(result).toContain("2 warehouses");
      expect(result).toContain("3 shippingZones");
    });

    it("includes customization hints when present", () => {
      const recipe = createMockRecipe({
        metadata: {
          ...createMockRecipe().metadata,
          customizationHints: ["Modify currency codes", "Adjust shipping rates"],
        },
      });

      const result = formatRecipeDetails(recipe);

      expect(result).toContain("Customization Hints");
      expect(result).toContain("Modify currency codes");
      expect(result).toContain("Adjust shipping rates");
    });

    it("includes configuration preview", () => {
      const recipe = createMockRecipe({
        config: {
          channels: [
            {
              name: "US Store",
              slug: "us-store",
              currencyCode: "USD",
              defaultCountry: "US",
              isActive: true,
            },
          ],
        },
      });

      const result = formatRecipeDetails(recipe);

      expect(result).toContain("Configuration Preview");
      expect(result).toContain("channels");
      expect(result).toContain("US Store");
    });

    it("includes before/after examples when present", () => {
      const recipe = createMockRecipe({
        metadata: {
          ...createMockRecipe().metadata,
          examples: {
            before: "# Empty config\nchannels: []",
            after: "# With channels\nchannels:\n  - slug: us",
          },
        },
      });

      const result = formatRecipeDetails(recipe);

      expect(result).toContain("Example: Before");
      expect(result).toContain("Example: After");
      expect(result).toContain("Empty config");
      expect(result).toContain("With channels");
    });

    it("includes apply and export hints", () => {
      const recipe = createMockRecipe({
        metadata: {
          ...createMockRecipe().metadata,
          name: "test-recipe",
        },
      });

      const result = formatRecipeDetails(recipe);

      expect(result).toContain("configurator recipe apply test-recipe");
      expect(result).toContain("configurator recipe export test-recipe");
    });
  });

  describe("formatConfigPreview", () => {
    it("returns comment for empty config", () => {
      const result = formatConfigPreview({});
      expect(result).toContain("Empty configuration");
    });

    it("formats config as YAML", () => {
      const config = {
        channels: [
          {
            name: "Test",
            slug: "test",
            currencyCode: "USD" as const,
            defaultCountry: "US" as const,
            isActive: true,
          },
        ],
      };

      const result = formatConfigPreview(config);

      expect(result).toContain("channels");
      expect(result).toContain("Test");
      expect(result).toContain("USD");
    });
  });

  describe("formatRecipeDetailsJson", () => {
    it("returns valid JSON string", () => {
      const recipe = createMockRecipe();

      const result = formatRecipeDetailsJson(recipe);
      const parsed = JSON.parse(result);

      expect(parsed.metadata.name).toBe("test-recipe");
      expect(parsed.config.channels).toBeDefined();
    });

    it("preserves all recipe data", () => {
      const recipe = createMockRecipe({
        metadata: {
          ...createMockRecipe().metadata,
          name: "custom-recipe",
          category: "digital",
        },
        config: {
          productTypes: [{ name: "Digital Product", isShippingRequired: false }],
        },
      });

      const result = formatRecipeDetailsJson(recipe);
      const parsed = JSON.parse(result);

      expect(parsed.metadata.name).toBe("custom-recipe");
      expect(parsed.metadata.category).toBe("digital");
      expect(parsed.config.productTypes).toHaveLength(1);
    });
  });

  describe("validateSaleorVersion", () => {
    describe("with >= operator", () => {
      it("returns compatible for matching version", () => {
        const result = validateSaleorVersion(">=3.15", "3.15.0");
        expect(result.compatible).toBe(true);
      });

      it("returns compatible for higher version", () => {
        const result = validateSaleorVersion(">=3.15", "3.16.2");
        expect(result.compatible).toBe(true);
      });

      it("returns incompatible for lower version", () => {
        const result = validateSaleorVersion(">=3.15", "3.14.0");
        expect(result.compatible).toBe(false);
        expect(result.reason).toContain("3.15");
        expect(result.reason).toContain("3.14");
      });
    });

    describe("with > operator", () => {
      it("returns compatible for higher version", () => {
        const result = validateSaleorVersion(">3.15", "3.16.0");
        expect(result.compatible).toBe(true);
      });

      it("returns incompatible for equal version", () => {
        const result = validateSaleorVersion(">3.15", "3.15.0");
        expect(result.compatible).toBe(false);
      });

      it("returns incompatible for lower version", () => {
        const result = validateSaleorVersion(">3.15", "3.14.0");
        expect(result.compatible).toBe(false);
      });
    });

    describe("with <= operator", () => {
      it("returns compatible for matching version", () => {
        const result = validateSaleorVersion("<=3.15", "3.15.0");
        expect(result.compatible).toBe(true);
      });

      it("returns compatible for lower version", () => {
        const result = validateSaleorVersion("<=3.15", "3.14.0");
        expect(result.compatible).toBe(true);
      });

      it("returns incompatible for higher version", () => {
        const result = validateSaleorVersion("<=3.15", "3.16.0");
        expect(result.compatible).toBe(false);
      });
    });

    describe("with < operator", () => {
      it("returns compatible for lower version", () => {
        const result = validateSaleorVersion("<3.15", "3.14.0");
        expect(result.compatible).toBe(true);
      });

      it("returns incompatible for equal version", () => {
        const result = validateSaleorVersion("<3.15", "3.15.0");
        expect(result.compatible).toBe(false);
      });

      it("returns incompatible for higher version", () => {
        const result = validateSaleorVersion("<3.15", "3.16.0");
        expect(result.compatible).toBe(false);
      });
    });

    describe("with = operator", () => {
      it("returns compatible for exact version", () => {
        const result = validateSaleorVersion("=3.15", "3.15.0");
        expect(result.compatible).toBe(true);
      });

      it("returns incompatible for different version", () => {
        const result = validateSaleorVersion("=3.15", "3.16.0");
        expect(result.compatible).toBe(false);
        expect(result.reason).toContain("exactly");
      });
    });

    describe("edge cases", () => {
      it("returns compatible for unparseable recipe version", () => {
        const result = validateSaleorVersion("any", "3.15.0");
        expect(result.compatible).toBe(true);
      });

      it("returns compatible for unparseable instance version", () => {
        const result = validateSaleorVersion(">=3.15", "unknown");
        expect(result.compatible).toBe(true);
      });

      it("handles version without operator (defaults to >=)", () => {
        const result = validateSaleorVersion("3.15", "3.15.0");
        expect(result.compatible).toBe(true);
      });

      it("handles major version comparison", () => {
        const result = validateSaleorVersion(">=4.0", "3.20.0");
        expect(result.compatible).toBe(false);
      });
    });
  });

  describe("determineOutputPath", () => {
    it("returns specified path when provided", () => {
      const result = determineOutputPath("multi-region", "/custom/path/recipe.yml");
      expect(result).toBe("/custom/path/recipe.yml");
    });

    it("returns default filename when no path specified", () => {
      const result = determineOutputPath("multi-region");
      expect(result).toBe("multi-region.yml");
    });

    it("appends filename to directory when directory specified", () => {
      const tempDir = os.tmpdir();
      const result = determineOutputPath("multi-region", tempDir);
      expect(result).toBe(path.join(tempDir, "multi-region.yml"));
    });
  });

  describe("exportRecipe", () => {
    it("exports recipe to specified path", () => {
      const mockRecipe = createMockRecipe();
      vi.mocked(loadRecipe).mockReturnValue(mockRecipe);

      const tempPath = path.join(os.tmpdir(), `test-export-${Date.now()}.yml`);

      try {
        const result = exportRecipe("test-recipe", tempPath);

        expect(result.path).toBe(tempPath);
        expect(result.recipe.metadata.name).toBe("test-recipe");

        // Verify file was created
        expect(fs.existsSync(tempPath)).toBe(true);

        // Verify file content is valid YAML with metadata and config
        const content = fs.readFileSync(tempPath, "utf-8");
        expect(content).toContain("---");
        expect(content).toContain("name: test-recipe");
      } finally {
        // Cleanup
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    });

    it("uses default output path when not specified", () => {
      const mockRecipe = createMockRecipe();
      vi.mocked(loadRecipe).mockReturnValue(mockRecipe);

      // Change to temp directory to avoid creating files in project root
      const originalCwd = process.cwd();
      const tempDir = os.tmpdir();
      process.chdir(tempDir);

      try {
        const result = exportRecipe("test-recipe");

        expect(result.path).toBe("test-recipe.yml");
        expect(result.recipe.metadata.name).toBe("test-recipe");

        // Cleanup
        const expectedPath = path.join(tempDir, "test-recipe.yml");
        if (fs.existsSync(expectedPath)) {
          fs.unlinkSync(expectedPath);
        }
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});
