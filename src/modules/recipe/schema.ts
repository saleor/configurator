import { z } from "zod";
import { configSchema } from "../config/schema/schema";

/**
 * Recipe category for filtering and organization
 */
export const recipeCategorySchema = z.enum([
  "multi-region",
  "digital",
  "fulfillment",
  "shipping",
  "general",
]);

export type RecipeCategory = z.infer<typeof recipeCategorySchema>;

/**
 * Summary of entities included in a recipe
 */
export const entitySummarySchema = z.object({
  channels: z.number().int().nonnegative().optional(),
  warehouses: z.number().int().nonnegative().optional(),
  shippingZones: z.number().int().nonnegative().optional(),
  taxClasses: z.number().int().nonnegative().optional(),
  attributes: z.number().int().nonnegative().optional(),
  productTypes: z.number().int().nonnegative().optional(),
  pageTypes: z.number().int().nonnegative().optional(),
  categories: z.number().int().nonnegative().optional(),
  collections: z.number().int().nonnegative().optional(),
  menus: z.number().int().nonnegative().optional(),
  products: z.number().int().nonnegative().optional(),
});

export type EntitySummary = z.infer<typeof entitySummarySchema>;

/**
 * Recipe metadata - describes a recipe without loading its full configuration content
 */
export const recipeMetadataSchema = z.object({
  /** Unique identifier for the recipe (slug format) */
  name: z.string().regex(/^[a-z0-9-]+$/, "Recipe name must be lowercase with hyphens only"),
  /** Human-readable description */
  description: z.string().min(10).max(500),
  /** Category for filtering and organization */
  category: recipeCategorySchema,
  /** Recipe version (semver) */
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, "Version must follow semantic versioning (e.g., 1.0.0)"),
  /** Minimum Saleor version required (semver range) */
  saleorVersion: z.string(),
  /** Link to relevant Saleor documentation */
  docsUrl: z.url({ message: "Documentation URL must be a valid URL" }),
  /** Detailed use case explanation */
  useCase: z.string(),
  /** Prerequisites for using this recipe */
  prerequisites: z.array(z.string()),
  /** Hints for customizing the recipe */
  customizationHints: z.array(z.string()),
  /** Summary of entities included */
  entitySummary: entitySummarySchema,
  /** Before/after examples */
  examples: z
    .object({
      before: z.string(),
      after: z.string(),
    })
    .optional(),
});

export type RecipeMetadata = z.infer<typeof recipeMetadataSchema>;

/**
 * Recipe manifest entry - lightweight index entry for recipe discovery
 */
export const recipeManifestEntrySchema = z.object({
  /** Recipe name (matches metadata name) */
  name: z.string().regex(/^[a-z0-9-]+$/, "Recipe name must be lowercase with hyphens only"),
  /** Brief description */
  description: z.string().min(10).max(500),
  /** Category */
  category: recipeCategorySchema,
  /** Filename in recipes directory */
  file: z.string().regex(/^[a-z0-9-]+\.ya?ml$/, "File must be a YAML file with valid name"),
  /** Recipe version (semver) */
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, "Version must follow semantic versioning (e.g., 1.0.0)"),
  /** Saleor version compatibility */
  saleorVersion: z.string(),
  /** Entity counts */
  entitySummary: entitySummarySchema,
});

export type RecipeManifestEntry = z.infer<typeof recipeManifestEntrySchema>;

/**
 * Recipe manifest - index of all available recipes, generated at build time
 */
export const recipeManifestSchema = z.object({
  /** Manifest format version */
  version: z.literal("1.0.0"),
  /** Generation timestamp */
  generatedAt: z.iso.datetime(),
  /** List of available recipes */
  recipes: z.array(recipeManifestEntrySchema),
});

export type RecipeManifest = z.infer<typeof recipeManifestSchema>;

/**
 * Full recipe including metadata and configuration content
 */
export const recipeSchema = z.object({
  /** Recipe metadata */
  metadata: recipeMetadataSchema,
  /** Configuration content (same schema as config.yml) */
  config: configSchema,
});

export type Recipe = z.infer<typeof recipeSchema>;
