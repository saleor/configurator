# CLI Interface Contract: Recipes Feature

**Date**: 2026-01-19
**Feature**: 002-recipes-feature

## Command Overview

```
configurator recipe <subcommand> [options]

Subcommands:
  list     List available recipes
  show     Preview a recipe's configuration
  apply    Apply a recipe to a Saleor instance
  export   Export a recipe to a local file
```

---

## Subcommand: `recipe list`

List all available recipes with optional category filtering.

### Synopsis

```bash
configurator recipe list [--category <category>] [--json]
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--category` | string | - | Filter recipes by category |
| `--json` | boolean | false | Output as JSON for automation |

### Examples

```bash
# List all recipes
configurator recipe list

# List only multi-region recipes
configurator recipe list --category multi-region

# Get JSON output for AI agents
configurator recipe list --json
```

### Output Format (Human)

```
Available Recipes

MULTI-REGION
  multi-region        Configure channels for US, EU, and UK markets
                      Entities: 3 channels, 3 warehouses, 3 shipping zones
                      Saleor: >=3.15

DIGITAL
  digital-products    Configure product types for digital goods
                      Entities: 2 product types, 5 attributes
                      Saleor: >=3.15

FULFILLMENT
  click-and-collect   Enable store pickup with warehouse configuration
                      Entities: 2 warehouses, 1 shipping zone
                      Saleor: >=3.15

SHIPPING
  custom-shipping     Set up shipping zones with methods and rates
                      Entities: 3 shipping zones
                      Saleor: >=3.15

Use 'configurator recipe show <name>' to preview a recipe
```

### Output Format (JSON)

```json
{
  "recipes": [
    {
      "name": "multi-region",
      "description": "Configure channels for US, EU, and UK markets",
      "category": "multi-region",
      "version": "1.0.0",
      "saleorVersion": ">=3.15",
      "entitySummary": {
        "channels": 3,
        "warehouses": 3,
        "shippingZones": 3
      }
    }
  ],
  "total": 4
}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Invalid options |

---

## Subcommand: `recipe show`

Preview a recipe's full configuration and documentation.

### Synopsis

```bash
configurator recipe show <name> [--json]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | Yes | Recipe name (e.g., "multi-region") |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--json` | boolean | false | Output as JSON for automation |

### Examples

```bash
# Preview the multi-region recipe
configurator recipe show multi-region

# Get full JSON for programmatic access
configurator recipe show multi-region --json
```

### Output Format (Human)

```
Recipe: multi-region

Description
  Configure channels for US, EU, and UK markets

Category: multi-region
Version: 1.0.0
Saleor Version: >=3.15
Documentation: https://docs.saleor.io/docs/channels

Use Case
  Set up a global e-commerce presence with separate channels
  for different regions, each with appropriate currency and locale.

Prerequisites
  - Saleor instance with multi-channel license
  - Tax configuration for target regions

Entities Included
  - 3 channels
  - 3 warehouses
  - 3 shipping zones

Customization Hints
  - Modify currency codes for your target markets
  - Adjust country codes as needed

Configuration Preview
─────────────────────────────────────────────────────────────
channels:
  - name: United States
    slug: us-channel
    currencyCode: USD
    defaultCountry: US
    isActive: true

  - name: Europe
    slug: eu-channel
    currencyCode: EUR
    defaultCountry: DE
    isActive: true

  - name: United Kingdom
    slug: uk-channel
    currencyCode: GBP
    defaultCountry: GB
    isActive: true

warehouses:
  # ... (abbreviated)
─────────────────────────────────────────────────────────────

Example: Before
  # Empty config or single channel setup
  channels: []

Example: After
  # Multi-region with 3 channels
  channels:
    - slug: us-channel
      currencyCode: USD
    - slug: eu-channel
      currencyCode: EUR
    - slug: uk-channel
      currencyCode: GBP

Use 'configurator recipe apply multi-region' to deploy this recipe
Use 'configurator recipe export multi-region' to customize locally
```

### Output Format (JSON)

```json
{
  "metadata": {
    "name": "multi-region",
    "description": "Configure channels for US, EU, and UK markets",
    "category": "multi-region",
    "version": "1.0.0",
    "saleorVersion": ">=3.15",
    "docsUrl": "https://docs.saleor.io/docs/channels",
    "useCase": "Set up a global e-commerce presence...",
    "prerequisites": [
      "Saleor instance with multi-channel license",
      "Tax configuration for target regions"
    ],
    "customizationHints": [
      "Modify currency codes for your target markets",
      "Adjust country codes as needed"
    ],
    "entitySummary": {
      "channels": 3,
      "warehouses": 3,
      "shippingZones": 3
    },
    "examples": {
      "before": "# Empty config...",
      "after": "# Multi-region..."
    }
  },
  "config": {
    "channels": [...],
    "warehouses": [...],
    "shippingZones": [...]
  }
}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Recipe not found |

### Error Messages

```
Error: Recipe 'invalid-name' not found

Available recipes:
  - multi-region
  - digital-products
  - click-and-collect
  - custom-shipping

Use 'configurator recipe list' to see all recipes
```

---

## Subcommand: `recipe apply`

Apply a recipe to a Saleor instance using the deployment pipeline.

### Synopsis

```bash
configurator recipe apply <name> --url <url> --token <token> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | Yes | Recipe name OR path to local YAML file |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--url` | string | Required | Saleor instance URL |
| `--token` | string | Required | Saleor API token |
| `--config` | string | "config.yml" | Config file path (for merge) |
| `--ci` | boolean | false | CI mode - skip confirmations |
| `--json` | boolean | false | Output results as JSON |
| `--plan` | boolean | false | Show plan without applying |
| `--merge` | boolean | false | Merge with existing config |

### Examples

```bash
# Apply a built-in recipe
configurator recipe apply multi-region \
  --url https://store.saleor.cloud/graphql/ \
  --token $SALEOR_TOKEN

# Apply with plan preview only
configurator recipe apply multi-region \
  --url https://store.saleor.cloud/graphql/ \
  --token $SALEOR_TOKEN \
  --plan

# Apply a custom local recipe
configurator recipe apply ./my-custom-recipe.yml \
  --url https://store.saleor.cloud/graphql/ \
  --token $SALEOR_TOKEN

# Apply in CI mode (no prompts)
configurator recipe apply multi-region \
  --url https://store.saleor.cloud/graphql/ \
  --token $SALEOR_TOKEN \
  --ci

# Merge recipe with existing configuration
configurator recipe apply digital-products \
  --url https://store.saleor.cloud/graphql/ \
  --token $SALEOR_TOKEN \
  --merge
```

### Output Format (Human - Plan Mode)

```
Recipe: multi-region

Deployment Plan
───────────────────────────────────────────────────────────

Changes to be applied:

Channels
  + United States (us-channel)
  + Europe (eu-channel)
  + United Kingdom (uk-channel)

Warehouses
  + US Warehouse (us-warehouse)
  + EU Warehouse (eu-warehouse)
  + UK Warehouse (uk-warehouse)

Shipping Zones
  + US Domestic
  + EU Zone
  + UK Zone

Summary: 3 creates, 0 updates, 0 deletes

───────────────────────────────────────────────────────────

Run without --plan to apply these changes
```

### Output Format (Human - Apply Mode)

```
Recipe: multi-region

Applying recipe to https://store.saleor.cloud/graphql/

Changes to be applied:
  + 3 channels
  + 3 warehouses
  + 3 shipping zones

? Proceed with deployment? (y/N) y

Deploying...
  ✓ Channels (3/3)
  ✓ Warehouses (3/3)
  ✓ Shipping Zones (3/3)

Deployment complete!
  Created: 9 entities
  Updated: 0 entities
  Errors: 0

Recipe 'multi-region' applied successfully!
```

### Output Format (JSON)

```json
{
  "recipe": "multi-region",
  "status": "success",
  "url": "https://store.saleor.cloud/graphql/",
  "changes": {
    "channels": { "created": 3, "updated": 0, "deleted": 0 },
    "warehouses": { "created": 3, "updated": 0, "deleted": 0 },
    "shippingZones": { "created": 3, "updated": 0, "deleted": 0 }
  },
  "summary": {
    "created": 9,
    "updated": 0,
    "deleted": 0,
    "errors": 0
  }
}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Recipe not found |
| 2 | Authentication failed |
| 3 | Network error |
| 4 | Validation error |
| 5 | Deployment error |

### Error Messages

```
Error: Recipe 'multi-region' conflicts with existing configuration

Conflicts detected:
  - Channel 'us-channel' already exists

Options:
  1. Use --merge to merge configurations
  2. Use 'configurator recipe export' to customize locally
  3. Remove conflicting entities from Saleor first
```

---

## Subcommand: `recipe export`

Export a built-in recipe to a local file for customization.

### Synopsis

```bash
configurator recipe export <name> [--output <path>]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | Yes | Recipe name to export |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--output` | string | "./{name}.yml" | Output file path |

### Examples

```bash
# Export to default location (./multi-region.yml)
configurator recipe export multi-region

# Export to custom location
configurator recipe export multi-region --output ./recipes/my-multi-region.yml
```

### Output Format

```
Exporting recipe: multi-region

Recipe exported to: ./multi-region.yml

Next steps:
  1. Edit the file to customize for your needs
  2. Apply with: configurator recipe apply ./multi-region.yml --url <url> --token <token>
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Recipe not found |
| 2 | Output path not writable |

---

## Zod Schemas for CLI Arguments

```typescript
import { z } from 'zod';
import { baseCommandArgsSchema } from '../cli/command';

// recipe list
export const recipeListArgsSchema = z.object({
  category: z.string().optional(),
  json: z.boolean().default(false),
});

// recipe show
export const recipeShowArgsSchema = z.object({
  name: z.string(),
  json: z.boolean().default(false),
});

// recipe apply
export const recipeApplyArgsSchema = baseCommandArgsSchema.extend({
  name: z.string(),
  ci: z.boolean().default(false),
  json: z.boolean().default(false),
  plan: z.boolean().default(false),
  merge: z.boolean().default(false),
});

// recipe export
export const recipeExportArgsSchema = z.object({
  name: z.string(),
  output: z.string().optional(),
});
```

---

## Interactive Behavior

### Missing Credentials (recipe apply)

When `--url` or `--token` are missing and not in CI mode:

```
? Enter your Saleor instance URL: https://store.saleor.cloud/graphql/
? Enter your Saleor API token: **********************

Applying recipe: multi-region
...
```

### Confirmation Prompts

**Before deployment (non-CI mode):**
```
? Proceed with deployment? This will create 9 entities. (y/N)
```

**When conflicts detected:**
```
? Conflicts detected. How would you like to proceed?
  > Skip conflicting entities
    Overwrite existing entities
    Cancel deployment
```
