import { describe, expect, it } from "vitest";
import {
  entitySummarySchema,
  recipeCategorySchema,
  recipeManifestEntrySchema,
  recipeManifestSchema,
  recipeMetadataSchema,
  recipeSchema,
} from "./schema";

describe("Recipe Schemas", () => {
  describe("recipeCategorySchema", () => {
    it("should accept valid categories", () => {
      expect(recipeCategorySchema.parse("multi-region")).toBe("multi-region");
      expect(recipeCategorySchema.parse("digital")).toBe("digital");
      expect(recipeCategorySchema.parse("fulfillment")).toBe("fulfillment");
      expect(recipeCategorySchema.parse("shipping")).toBe("shipping");
      expect(recipeCategorySchema.parse("general")).toBe("general");
    });

    it("should reject invalid categories", () => {
      expect(() => recipeCategorySchema.parse("invalid")).toThrow();
      expect(() => recipeCategorySchema.parse("")).toThrow();
    });
  });

  describe("entitySummarySchema", () => {
    it("should parse valid entity summary", () => {
      const input = {
        channels: 3,
        warehouses: 2,
        shippingZones: 4,
      };

      const result = entitySummarySchema.parse(input);

      expect(result.channels).toBe(3);
      expect(result.warehouses).toBe(2);
      expect(result.shippingZones).toBe(4);
    });

    it("should accept empty object (all optional)", () => {
      const result = entitySummarySchema.parse({});
      expect(result).toEqual({});
    });

    it("should accept all entity types", () => {
      const input = {
        channels: 1,
        warehouses: 2,
        shippingZones: 3,
        taxClasses: 4,
        attributes: 5,
        productTypes: 6,
        pageTypes: 7,
        categories: 8,
        collections: 9,
        menus: 10,
        products: 11,
      };

      const result = entitySummarySchema.parse(input);
      expect(result).toEqual(input);
    });
  });

  describe("recipeMetadataSchema", () => {
    const validMetadata = {
      name: "multi-region",
      description: "Configure channels for US, EU, and UK markets",
      category: "multi-region",
      saleorVersion: ">=3.15",
      docsUrl: "https://docs.saleor.io/docs/channels",
      useCase: "Set up a global e-commerce presence",
      prerequisites: ["Saleor instance"],
      customizationHints: ["Modify currency codes"],
      entitySummary: { channels: 3 },
    };

    it("should parse valid metadata", () => {
      const result = recipeMetadataSchema.parse(validMetadata);

      expect(result.name).toBe("multi-region");
      expect(result.description).toBe("Configure channels for US, EU, and UK markets");
      expect(result.category).toBe("multi-region");
    });

    it("should accept metadata with examples", () => {
      const input = {
        ...validMetadata,
        examples: {
          before: "# Empty config",
          after: "# With channels",
        },
      };

      const result = recipeMetadataSchema.parse(input);
      expect(result.examples?.before).toBe("# Empty config");
      expect(result.examples?.after).toBe("# With channels");
    });

    it("should reject invalid name format", () => {
      const input = { ...validMetadata, name: "Invalid Name" };
      expect(() => recipeMetadataSchema.parse(input)).toThrow(
        /Recipe name must be lowercase with hyphens only/
      );
    });

    it("should reject description too short", () => {
      const input = { ...validMetadata, description: "Too short" };
      expect(() => recipeMetadataSchema.parse(input)).toThrow();
    });

    it("should reject invalid URL", () => {
      const input = { ...validMetadata, docsUrl: "not-a-url" };
      expect(() => recipeMetadataSchema.parse(input)).toThrow(
        /Documentation URL must be a valid URL/
      );
    });
  });

  describe("recipeManifestEntrySchema", () => {
    it("should parse valid manifest entry", () => {
      const input = {
        name: "multi-region",
        description: "Configure multi-region setup",
        category: "multi-region",
        file: "multi-region.yml",
        saleorVersion: ">=3.15",
        entitySummary: { channels: 3 },
      };

      const result = recipeManifestEntrySchema.parse(input);

      expect(result.name).toBe("multi-region");
      expect(result.file).toBe("multi-region.yml");
    });
  });

  describe("recipeManifestSchema", () => {
    it("should parse valid manifest", () => {
      const input = {
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

      const result = recipeManifestSchema.parse(input);

      expect(result.recipes).toHaveLength(1);
      expect(result.recipes[0].name).toBe("multi-region");
    });
  });

  describe("recipeSchema", () => {
    it("should parse valid recipe with minimal config", () => {
      const input = {
        metadata: {
          name: "test-recipe",
          description: "A test recipe for validation",
          category: "general",
          saleorVersion: ">=3.15",
          docsUrl: "https://docs.saleor.io",
          useCase: "Testing purposes",
          prerequisites: [],
          customizationHints: [],
          entitySummary: {},
        },
        config: {},
      };

      const result = recipeSchema.parse(input);

      expect(result.metadata.name).toBe("test-recipe");
      expect(result.config).toEqual({});
    });

    it("should parse recipe with config containing entities", () => {
      const input = {
        metadata: {
          name: "channel-recipe",
          description: "Creates channels for testing",
          category: "multi-region",
          saleorVersion: ">=3.15",
          docsUrl: "https://docs.saleor.io",
          useCase: "Test channels",
          prerequisites: [],
          customizationHints: [],
          entitySummary: { channels: 1 },
        },
        config: {
          channels: [
            {
              name: "Test Channel",
              slug: "test-channel",
              currencyCode: "USD",
              defaultCountry: "US",
            },
          ],
        },
      };

      const result = recipeSchema.parse(input);

      expect(result.config.channels).toHaveLength(1);
      expect(result.config.channels?.[0].slug).toBe("test-channel");
    });
  });
});
