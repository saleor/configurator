# Research: Recipes Feature

**Date**: 2026-01-19
**Feature**: 002-recipes-feature

## Research Questions

### 1. Package Bundling Strategy

**Question**: How to bundle YAML recipe files in the npm package and resolve them at runtime?

**Findings**:

The current build setup uses `tsup` with the following command:
```bash
tsup src/cli/main.ts --format esm --target node20 --clean --shims
```

The `package.json` `files` field includes:
```json
"files": ["dist", "bin", "README.md", "LICENSE", "schema.json", "SCHEMA.md"]
```

**Decision**: Add `recipes` directory to both `files` array and copy during build

**Rationale**:
1. YAML files are static assets, not TypeScript - they don't need transpilation
2. We can add a `copy-recipes` script that runs before/during build
3. The `files` field will include `recipes` directory for npm publishing

**Implementation**:
```json
// package.json changes
{
  "files": ["dist", "bin", "recipes", "README.md", "LICENSE", "schema.json", "SCHEMA.md"],
  "scripts": {
    "copy-recipes": "cp -r src/recipes dist/recipes",
    "build": "tsup src/cli/main.ts --format esm --target node20 --clean --shims && pnpm copy-recipes"
  }
}
```

**Alternative Considered**: Embedding YAML as TypeScript strings
- Rejected: Harder to maintain, loses YAML syntax highlighting, complicates editing

**Runtime Resolution**:
```typescript
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const getRecipesDir = (): string => {
  // In ESM, import.meta.url gives us the current module's URL
  // We navigate up from dist/modules/recipe/ to dist/recipes/
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const distDir = path.resolve(moduleDir, '..', '..');
  return path.join(distDir, 'recipes');
};
```

---

### 2. Recipe YAML Format

**Question**: What format should recipes use for metadata + configuration content?

**Findings**:

The `yaml` package (v2.8.0) supports multi-document parsing via `parseAllDocuments()`:
```typescript
import { parseAllDocuments } from 'yaml';

const docs = parseAllDocuments(yamlContent);
// docs[0] = metadata document
// docs[1] = configuration document
```

YAML document separators:
- `---` starts a new document
- `...` optionally ends a document

**Decision**: Use YAML multi-document format with metadata in first document

**Rationale**:
1. Native YAML feature - no custom parsing needed
2. Metadata and config are cleanly separated
3. Config section uses exact same schema as `config.yml`
4. Users can copy just the config section to their own files

**Recipe Format**:
```yaml
# First document: metadata
---
name: multi-region
description: Configure channels for US, EU, and UK markets
category: multi-region
version: "1.0.0"
saleorVersion: ">=3.15"
docsUrl: https://docs.saleor.io/docs/channels
useCase: |
  Set up a global e-commerce presence with separate channels
  for different regions, each with appropriate currency and locale.
prerequisites:
  - Saleor instance with multi-channel license
  - Tax configuration for target regions
customizationHints:
  - Modify currency codes for your target markets
  - Adjust country codes as needed
entitySummary:
  channels: 3
  warehouses: 3
  shippingZones: 3
examples:
  before: |
    # Empty config or single channel setup
    channels: []
  after: |
    # Multi-region with 3 channels
    channels:
      - slug: us-channel
        currencyCode: USD
      - slug: eu-channel
        currencyCode: EUR
      - slug: uk-channel
        currencyCode: GBP
---
# Second document: configuration (same schema as config.yml)
channels:
  - name: United States
    slug: us-channel
    currencyCode: USD
    defaultCountry: US
    # ... full channel config
```

**Alternative Considered**: Single document with `_metadata` key
- Rejected: Pollutes the config namespace, requires filtering during validation

---

### 3. Commander.js Subcommand Pattern

**Question**: How to implement `recipe list/show/apply/export` as subcommands?

**Findings**:

Commander.js supports nested commands via `.command()` method. The current codebase uses `CommandConfig` interface with auto-generated options from Zod schemas.

**Decision**: Create a parent `recipe` command with subcommands, each with its own schema

**Rationale**:
1. Clean separation of concerns - each subcommand has focused responsibility
2. Consistent with CLI UX patterns (`git remote add/remove`)
3. Each subcommand can have different options (list doesn't need --url)

**Implementation Pattern**:
```typescript
// recipe.ts

const recipeListSchema = z.object({
  category: z.string().optional().describe("Filter by category"),
  json: z.boolean().default(false).describe("Output as JSON"),
});

const recipeShowSchema = z.object({
  name: z.string().describe("Recipe name"),
  json: z.boolean().default(false).describe("Output as JSON"),
});

const recipeApplySchema = baseCommandArgsSchema.extend({
  name: z.string().describe("Recipe name"),
  merge: z.boolean().default(false).describe("Merge with existing config"),
});

const recipeExportSchema = z.object({
  name: z.string().describe("Recipe name"),
  output: z.string().optional().describe("Output file path"),
});

// Parent command configuration
export const recipeCommandConfig: CommandConfig<typeof recipeParentSchema> = {
  name: "recipe",
  description: "Manage configuration recipes",
  schema: recipeParentSchema,
  handler: recipeParentHandler,
  subcommands: [
    { name: "list", schema: recipeListSchema, handler: listHandler },
    { name: "show", schema: recipeShowSchema, handler: showHandler },
    { name: "apply", schema: recipeApplySchema, handler: applyHandler },
    { name: "export", schema: recipeExportSchema, handler: exportHandler },
  ],
};
```

**Note**: The current `CommandConfig` interface may need extension to support subcommands. This is a minor enhancement to `src/cli/command.ts`.

---

### 4. Conflict Resolution Strategy

**Question**: How to handle recipe entities that conflict with existing configuration?

**Findings**:

The existing `diff` command already computes changes between local and remote. The `deploy` command shows a preview before applying.

**Decision**: Reuse existing diff infrastructure for conflict detection

**Rationale**:
1. Consistent behavior with deploy command
2. Users already understand the diff output format
3. No new conflict resolution logic needed

**Conflict Handling Flow**:
```
1. Load recipe configuration
2. Load existing config.yml (if exists)
3. Merge recipe into existing config (or use recipe as-is)
4. Show diff between merged config and remote state
5. Prompt for confirmation (unless --ci mode)
6. Apply via existing deploy infrastructure
```

**Merge Strategy**:
- Recipe entities are added to existing config
- If entity with same identifier exists, show warning and let user decide
- `--force` flag can override existing entities

**Alternative Considered**: Deep merge at entity level
- Rejected (for now): Too complex for v1, can add later if needed

---

### 5. Recipe Manifest

**Question**: Should we use a manifest file for recipe discovery?

**Findings**:

Options considered:
1. **Manifest file**: Pre-built JSON with all recipe metadata
2. **Directory scan**: Read all `.yml` files and parse metadata on demand
3. **TypeScript registry**: Export recipe metadata as constants

**Decision**: Use manifest.json generated at build time

**Rationale**:
1. Faster list operation (no YAML parsing needed)
2. Manifest can be validated during build
3. JSON is easy to consume in `--json` output mode
4. Can include computed fields (file size, entity counts)

**Manifest Format**:
```json
{
  "version": "1.0.0",
  "generatedAt": "2026-01-19T10:30:00Z",
  "recipes": [
    {
      "name": "multi-region",
      "description": "Configure channels for US, EU, and UK markets",
      "category": "multi-region",
      "file": "multi-region.yml",
      "version": "1.0.0",
      "saleorVersion": ">=3.15",
      "entitySummary": {
        "channels": 3,
        "warehouses": 3,
        "shippingZones": 3
      }
    }
  ]
}
```

**Build Script**: Add `generate-recipe-manifest` script that:
1. Scans `src/recipes/*.yml`
2. Parses metadata from each
3. Writes `src/recipes/manifest.json`
4. Runs as part of build

---

## Summary of Decisions

| Question | Decision | Key Rationale |
|----------|----------|---------------|
| Package bundling | Copy recipes to dist, add to `files` | Static assets, simple distribution |
| Recipe format | YAML multi-document (metadata + config) | Native YAML, clean separation |
| Subcommand pattern | Nested commands with separate schemas | Focused responsibility per command |
| Conflict resolution | Reuse diff infrastructure | Consistent UX, no new logic |
| Recipe discovery | Build-time manifest.json | Fast listing, easy JSON output |

## Implementation Notes

### Files to Modify

1. `package.json` - Add `recipes` to files, add build scripts
2. `src/cli/command.ts` - Add subcommand support to `CommandConfig`
3. `src/commands/index.ts` - Export recipe command config

### Files to Create

1. `src/commands/recipe.ts` - Recipe command handlers
2. `src/modules/recipe/` - Recipe module (service, repository, schema, errors)
3. `src/recipes/manifest.json` - Recipe manifest
4. `src/recipes/*.yml` - Individual recipe files
5. `scripts/generate-recipe-manifest.ts` - Manifest generation script

### Dependencies

No new dependencies needed - uses existing `yaml`, `zod`, `commander`, `chalk`, `ora`.
