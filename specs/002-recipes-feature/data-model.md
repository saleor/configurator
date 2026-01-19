# Data Model: Recipes Feature

**Date**: 2026-01-19
**Feature**: 002-recipes-feature

## Entity Definitions

### RecipeMetadata

Describes a recipe without loading its full configuration content.

```typescript
import { z } from 'zod';

export const recipeCategorySchema = z.enum([
  'multi-region',
  'digital',
  'fulfillment',
  'shipping',
  'general',
]);

export type RecipeCategory = z.infer<typeof recipeCategorySchema>;

export const entitySummarySchema = z.object({
  channels: z.number().optional(),
  warehouses: z.number().optional(),
  shippingZones: z.number().optional(),
  taxClasses: z.number().optional(),
  attributes: z.number().optional(),
  productTypes: z.number().optional(),
  pageTypes: z.number().optional(),
  categories: z.number().optional(),
  collections: z.number().optional(),
  menus: z.number().optional(),
  products: z.number().optional(),
});

export type EntitySummary = z.infer<typeof entitySummarySchema>;

export const recipeMetadataSchema = z.object({
  /** Unique identifier for the recipe (slug format) */
  name: z.string().regex(/^[a-z0-9-]+$/),
  /** Human-readable description */
  description: z.string().min(10).max(500),
  /** Category for filtering and organization */
  category: recipeCategorySchema,
  /** Recipe version (semver) */
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  /** Minimum Saleor version required (semver range) */
  saleorVersion: z.string(),
  /** Link to relevant Saleor documentation */
  docsUrl: z.string().url(),
  /** Detailed use case explanation */
  useCase: z.string(),
  /** Prerequisites for using this recipe */
  prerequisites: z.array(z.string()),
  /** Hints for customizing the recipe */
  customizationHints: z.array(z.string()),
  /** Summary of entities included */
  entitySummary: entitySummarySchema,
  /** Before/after examples */
  examples: z.object({
    before: z.string(),
    after: z.string(),
  }).optional(),
});

export type RecipeMetadata = z.infer<typeof recipeMetadataSchema>;
```

### RecipeManifest

Index of all available recipes, generated at build time.

```typescript
export const recipeManifestEntrySchema = z.object({
  /** Recipe name (matches metadata name) */
  name: z.string(),
  /** Brief description */
  description: z.string(),
  /** Category */
  category: recipeCategorySchema,
  /** Filename in recipes directory */
  file: z.string(),
  /** Recipe version */
  version: z.string(),
  /** Saleor version compatibility */
  saleorVersion: z.string(),
  /** Entity counts */
  entitySummary: entitySummarySchema,
});

export type RecipeManifestEntry = z.infer<typeof recipeManifestEntrySchema>;

export const recipeManifestSchema = z.object({
  /** Manifest format version */
  version: z.literal('1.0.0'),
  /** Generation timestamp */
  generatedAt: z.string().datetime(),
  /** List of available recipes */
  recipes: z.array(recipeManifestEntrySchema),
});

export type RecipeManifest = z.infer<typeof recipeManifestSchema>;
```

### Recipe

Full recipe including metadata and configuration content.

```typescript
import { configSchema, type SaleorConfig } from '../config/schema/schema';

export const recipeSchema = z.object({
  /** Recipe metadata */
  metadata: recipeMetadataSchema,
  /** Configuration content (same schema as config.yml) */
  config: configSchema,
});

export type Recipe = z.infer<typeof recipeSchema>;
```

## Entity Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    RecipeManifest                           │
│  (manifest.json - generated at build time)                  │
├─────────────────────────────────────────────────────────────┤
│  version: "1.0.0"                                           │
│  generatedAt: ISO timestamp                                 │
│  recipes: RecipeManifestEntry[]                             │
└───────────────────────────┬─────────────────────────────────┘
                            │ references
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  RecipeManifestEntry                        │
│  (lightweight index entry)                                  │
├─────────────────────────────────────────────────────────────┤
│  name ◀────────────────────────────────────────────────────┐│
│  description                                               ││
│  category: RecipeCategory                                  ││
│  file: "multi-region.yml"                                  ││
│  version                                                   ││
│  saleorVersion                                             ││
│  entitySummary: EntitySummary                              ││
└─────────────────────────────────────────────────────────────┘│
                            │ file reference                   │
                            ▼                                  │
┌─────────────────────────────────────────────────────────────┐│
│                        Recipe                               ││
│  (full recipe from YAML file)                               ││
├─────────────────────────────────────────────────────────────┤│
│  metadata: RecipeMetadata ──────────────────────────────────┘│
│  config: SaleorConfig                                        │
└─────────────────────────────────────────────────────────────┘
                            │ uses existing schema
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     SaleorConfig                            │
│  (from modules/config/schema/schema.ts)                     │
├─────────────────────────────────────────────────────────────┤
│  shop?: ShopInput                                           │
│  channels?: ChannelInput[]                                  │
│  categories?: CategoryInput[]                               │
│  products?: ProductInput[]                                  │
│  warehouses?: WarehouseInput[]                              │
│  shippingZones?: ShippingZoneInput[]                        │
│  taxClasses?: TaxClassInput[]                               │
│  attributes?: AttributeInput[]                              │
│  productTypes?: ProductTypeInput[]                          │
│  pageTypes?: PageTypeInput[]                                │
│  collections?: CollectionInput[]                            │
│  menus?: MenuInput[]                                        │
│  models?: ModelInput[]                                      │
│  modelTypes?: ModelTypeInput[]                              │
└─────────────────────────────────────────────────────────────┘
```

## Validation Rules

### RecipeMetadata Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| name | Must be lowercase alphanumeric with hyphens | "Recipe name must be lowercase with hyphens only" |
| description | 10-500 characters | "Description must be between 10 and 500 characters" |
| category | Must be valid category | "Invalid category. Valid: multi-region, digital, fulfillment, shipping, general" |
| version | Semver format | "Version must follow semantic versioning (e.g., 1.0.0)" |
| saleorVersion | Valid semver range | "Saleor version must be a valid semver range" |
| docsUrl | Valid URL | "Documentation URL must be a valid URL" |

### Recipe File Validation

| Rule | Error Message |
|------|---------------|
| Must have exactly 2 YAML documents | "Recipe must have metadata and config documents" |
| First document must match metadata schema | "Invalid recipe metadata: {details}" |
| Second document must match config schema | "Invalid recipe configuration: {details}" |
| Metadata name must match filename | "Metadata name '{name}' does not match filename '{file}'" |

### Manifest Validation

| Rule | Error Message |
|------|---------------|
| All recipe files must exist | "Recipe file not found: {file}" |
| No duplicate recipe names | "Duplicate recipe name: {name}" |
| Version must be current | "Manifest version mismatch" |

## State Transitions

Recipes are read-only templates - no state transitions apply.

However, the **recipe apply** operation follows this state flow:

```
┌──────────────┐
│  Not Applied │
└──────┬───────┘
       │ configurator recipe apply <name>
       ▼
┌──────────────┐
│   Loading    │ Load recipe YAML
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Validating  │ Validate metadata + config
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Diffing     │ Compare with remote state
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  Pending Confirm     │ Show diff, await user confirmation
└──────┬───────────────┘
       │ User confirms (or --ci mode)
       ▼
┌──────────────┐
│  Deploying   │ Execute deployment pipeline
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Applied    │ Recipe configuration is live
└──────────────┘
```

## File Locations

| Entity | Location | Format |
|--------|----------|--------|
| Recipe files | `src/recipes/*.yml` | YAML multi-document |
| Manifest | `src/recipes/manifest.json` | JSON |
| Built recipes | `dist/recipes/*.yml` | YAML |
| Built manifest | `dist/recipes/manifest.json` | JSON |

## Entity Summary Types

| Category | Typical Entities |
|----------|------------------|
| multi-region | channels, warehouses, shippingZones |
| digital | productTypes, attributes |
| fulfillment | warehouses, shippingZones |
| shipping | shippingZones |
| general | Any combination |
