import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ManifestLoadError,
  RecipeLoadError,
  RecipeNotFoundError,
  RecipeValidationError,
} from "./errors";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
}));

import { readFileSync } from "node:fs";
import {
  getRecipesDir,
  loadManifest,
  loadRecipe,
  loadRecipeFromFile,
  parseRecipeYaml,
} from "./recipe-repository";

describe("Recipe Repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getRecipesDir", () => {
    it("should return a valid path", () => {
      const recipesDir = getRecipesDir();
      expect(recipesDir).toBeDefined();
      expect(typeof recipesDir).toBe("string");
      expect(recipesDir).toContain("recipes");
    });
  });

  describe("parseRecipeYaml", () => {
    it("should parse valid multi-document YAML", () => {
      const yaml = `---
name: test-recipe
description: A test recipe
category: general
saleorVersion: ">=3.15"
docsUrl: https://docs.saleor.io
useCase: Testing
prerequisites: []
customizationHints: []
entitySummary:
  channels: 1
---
channels:
  - name: Test Channel
    slug: test-channel
    currencyCode: USD
    defaultCountry: US
`;
      const result = parseRecipeYaml(yaml, "test.yml");
      expect(result.metadata).toBeDefined();
      expect(result.config).toBeDefined();
      expect((result.metadata as { name: string }).name).toBe("test-recipe");
      expect((result.config as { channels: unknown[] }).channels).toHaveLength(1);
    });

    it("should throw error if not exactly 2 documents", () => {
      const yaml = `---
name: test-recipe
`;
      expect(() => parseRecipeYaml(yaml, "test.yml")).toThrow(RecipeLoadError);
      expect(() => parseRecipeYaml(yaml, "test.yml")).toThrow(/Expected 2 YAML documents.*found 1/);
    });

    it("should throw error for 3 documents", () => {
      const yaml = `---
doc1: true
---
doc2: true
---
doc3: true
`;
      expect(() => parseRecipeYaml(yaml, "test.yml")).toThrow(RecipeLoadError);
      expect(() => parseRecipeYaml(yaml, "test.yml")).toThrow(/Expected 2 YAML documents.*found 3/);
    });

    it("should throw error for invalid YAML in metadata", () => {
      const yaml = `---
name: [invalid
---
config: {}
`;
      expect(() => parseRecipeYaml(yaml, "test.yml")).toThrow(RecipeLoadError);
      expect(() => parseRecipeYaml(yaml, "test.yml")).toThrow(/Invalid metadata YAML/);
    });

    it("should throw error for invalid YAML in config", () => {
      const yaml = `---
name: valid
---
config: [invalid
`;
      expect(() => parseRecipeYaml(yaml, "test.yml")).toThrow(RecipeLoadError);
      expect(() => parseRecipeYaml(yaml, "test.yml")).toThrow(/Invalid config YAML/);
    });

    it("should handle empty config document", () => {
      const yaml = `---
name: test
---
`;
      const result = parseRecipeYaml(yaml, "test.yml");
      expect(result.metadata).toEqual({ name: "test" });
      expect(result.config).toBeNull();
    });

    it("should handle complex nested structures", () => {
      const yaml = `---
name: complex-recipe
description: Complex recipe with nested data
category: multi-region
saleorVersion: ">=3.15"
docsUrl: https://docs.saleor.io
useCase: Testing complex structures
prerequisites:
  - Requirement 1
  - Requirement 2
customizationHints:
  - Hint 1
entitySummary:
  channels: 3
  warehouses: 2
examples:
  before: |
    # Before
    channels: []
  after: |
    # After
    channels:
      - slug: us-channel
---
channels:
  - name: United States
    slug: us-channel
    currencyCode: USD
    defaultCountry: US
    settings:
      allocationStrategy: PRIORITIZE_SORTING_ORDER
warehouses:
  - name: US Warehouse
    slug: us-warehouse
    address:
      streetAddress1: 123 Main St
      city: New York
      country: US
`;
      const result = parseRecipeYaml(yaml, "complex.yml");
      expect(result.metadata).toBeDefined();
      const metadata = result.metadata as Record<string, unknown>;
      expect(metadata.name).toBe("complex-recipe");
      expect(metadata.prerequisites).toHaveLength(2);
      expect(metadata.entitySummary).toEqual({ channels: 3, warehouses: 2 });

      expect(result.config).toBeDefined();
      const config = result.config as { channels: unknown[]; warehouses: unknown[] };
      expect(config.channels).toHaveLength(1);
      expect(config.warehouses).toHaveLength(1);
    });
  });

  describe("loadManifest", () => {
    it("should load and parse valid manifest", () => {
      const validManifest = {
        generatedAt: "2026-01-19T10:30:00Z",
        recipes: [
          {
            name: "multi-region",
            description: "Multi-region setup",
            category: "multi-region",
            file: "multi-region.yml",
            saleorVersion: ">=3.15",
            entitySummary: { channels: 3 },
          },
        ],
      };
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validManifest));

      const result = loadManifest();
      expect(result.recipes).toHaveLength(1);
      expect(result.recipes[0].name).toBe("multi-region");
    });

    it("should throw ManifestLoadError for invalid JSON", () => {
      vi.mocked(readFileSync).mockReturnValue("invalid json {");
      expect(() => loadManifest()).toThrow(ManifestLoadError);
    });

    it("should throw ManifestLoadError for missing required fields", () => {
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ recipes: [] }));
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
      generatedAt: "2026-01-19T10:30:00Z",
      recipes: [
        {
          name: "multi-region",
          description: "Multi-region setup",
          category: "multi-region",
          file: "multi-region.yml",
          saleorVersion: ">=3.15",
          entitySummary: { channels: 3 },
        },
      ],
    };

    const validRecipeYaml = `---
name: multi-region
description: Configure channels for US, EU, and UK markets
category: multi-region
saleorVersion: ">=3.15"
docsUrl: https://docs.saleor.io/docs/channels
useCase: Set up a global e-commerce presence
prerequisites:
  - Saleor instance
customizationHints:
  - Modify currencies
entitySummary:
  channels: 3
---
channels:
  - name: Test
    slug: test
    currencyCode: USD
    defaultCountry: US
`;

    it("should load recipe by name", () => {
      vi.mocked(readFileSync)
        .mockReturnValueOnce(JSON.stringify(validManifest))
        .mockReturnValueOnce(validRecipeYaml);

      const result = loadRecipe("multi-region");
      expect(result.metadata.name).toBe("multi-region");
      expect(result.config.channels).toHaveLength(1);
    });

    it("should throw RecipeNotFoundError for unknown recipe", () => {
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validManifest));
      expect(() => loadRecipe("unknown-recipe")).toThrow(RecipeNotFoundError);
      expect(() => loadRecipe("unknown-recipe")).toThrow(/Recipe "unknown-recipe" not found/);
    });

    it("should throw RecipeValidationError for invalid metadata", () => {
      const invalidYaml = `---
name: invalid
---
channels: []
`;
      vi.mocked(readFileSync)
        .mockReturnValueOnce(JSON.stringify(validManifest))
        .mockReturnValueOnce(invalidYaml)
        .mockReturnValueOnce(JSON.stringify(validManifest))
        .mockReturnValueOnce(invalidYaml);

      expect(() => loadRecipe("multi-region")).toThrow(RecipeValidationError);
      expect(() => loadRecipe("multi-region")).toThrow(/Invalid recipe metadata/);
    });

    it("should throw RecipeValidationError when name does not match filename", () => {
      const wrongNameYaml = `---
name: wrong-name
description: Configure channels for US, EU, and UK markets
category: multi-region
saleorVersion: ">=3.15"
docsUrl: https://docs.saleor.io/docs/channels
useCase: Set up a global e-commerce presence
prerequisites: []
customizationHints: []
entitySummary:
  channels: 3
---
channels: []
`;
      vi.mocked(readFileSync)
        .mockReturnValueOnce(JSON.stringify(validManifest))
        .mockReturnValueOnce(wrongNameYaml)
        .mockReturnValueOnce(JSON.stringify(validManifest))
        .mockReturnValueOnce(wrongNameYaml);

      expect(() => loadRecipe("multi-region")).toThrow(RecipeValidationError);
      expect(() => loadRecipe("multi-region")).toThrow(/does not match filename/);
    });
  });

  describe("loadRecipeFromFile", () => {
    const validRecipeYaml = `---
name: custom-recipe
description: A custom recipe for local use
category: general
saleorVersion: ">=3.15"
docsUrl: https://docs.saleor.io
useCase: Custom configuration
prerequisites: []
customizationHints: []
entitySummary: {}
---
channels: []
`;

    it("should load recipe from custom file path", () => {
      vi.mocked(readFileSync).mockReturnValue(validRecipeYaml);

      const result = loadRecipeFromFile("/custom/path/recipe.yml");
      expect(result.metadata.name).toBe("custom-recipe");
    });

    it("should throw RecipeValidationError for invalid metadata", () => {
      vi.mocked(readFileSync).mockReturnValue(`---
invalid: true
---
channels: []
`);
      expect(() => loadRecipeFromFile("/custom/recipe.yml")).toThrow(RecipeValidationError);
    });
  });
});
