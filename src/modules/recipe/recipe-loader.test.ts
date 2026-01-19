import { describe, expect, it } from "vitest";
import { RecipeLoadError } from "./errors";
import { getRecipesDir, parseRecipeYaml } from "./recipe-loader";

describe("Recipe Loader", () => {
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
version: "1.0.0"
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
version: "1.0.0"
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
});
