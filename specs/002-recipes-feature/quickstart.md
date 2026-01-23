# Quickstart: Recipes Feature

**Date**: 2026-01-19
**Feature**: 002-recipes-feature

## What are Recipes?

Recipes are pre-built YAML configuration templates for common Saleor e-commerce patterns. Instead of manually configuring channels, warehouses, shipping zones, and other entities, you can apply a recipe with a single command.

## Prerequisites

- Node.js 20+ installed
- Saleor Configurator CLI installed (`npm install -g @saleor/configurator`)
- Saleor instance URL and API token with appropriate permissions

## Quick Start (5 minutes)

### 1. Discover Available Recipes

```bash
# List all available recipes
configurator recipe list
```

Output:
```
Available Recipes

MULTI-REGION
  multi-region        Configure channels for US, EU, and UK markets

DIGITAL
  digital-products    Configure product types for digital goods

FULFILLMENT
  click-and-collect   Enable store pickup with warehouse configuration

SHIPPING
  custom-shipping     Set up shipping zones with methods and rates

Use 'configurator recipe show <name>' to preview a recipe
```

### 2. Preview a Recipe

```bash
# See what a recipe will configure
configurator recipe show multi-region
```

### 3. Apply a Recipe

```bash
# Apply the recipe to your Saleor instance
configurator recipe apply multi-region \
  --url https://your-store.saleor.cloud/graphql/ \
  --token YOUR_API_TOKEN
```

That's it! Your Saleor instance now has multi-region channels configured.

## Available Recipes

### multi-region

**Use Case**: Set up a global e-commerce presence with separate channels for different regions.

**Creates**:
- 3 channels (US, EU, UK) with appropriate currencies
- 3 warehouses for each region
- 3 shipping zones with regional coverage

```bash
configurator recipe apply multi-region --url <url> --token <token>
```

### digital-products

**Use Case**: Sell digital goods like software, e-books, or courses that don't require shipping.

**Creates**:
- Product types with `isShippingRequired: false`
- Attributes for digital products (download URL, license key, etc.)

```bash
configurator recipe apply digital-products --url <url> --token <token>
```

### click-and-collect

**Use Case**: Enable customers to order online and pick up in your physical stores.

**Creates**:
- Warehouses configured as pickup points
- Shipping zone for local pickup

```bash
configurator recipe apply click-and-collect --url <url> --token <token>
```

### custom-shipping

**Use Case**: Set up shipping zones with methods and rate structures.

**Creates**:
- Shipping zones for common regions
- Shipping methods with example rates

```bash
configurator recipe apply custom-shipping --url <url> --token <token>
```

## Customizing Recipes

Recipes are starting points. To customize:

### Option 1: Export and Modify

```bash
# Export the recipe to a local file
configurator recipe export multi-region

# Edit the file
nano multi-region.yml

# Apply your customized version
configurator recipe apply ./multi-region.yml --url <url> --token <token>
```

### Option 2: Merge with Existing Config

If you already have a `config.yml`:

```bash
# Merge recipe with your existing configuration
configurator recipe apply digital-products --merge --url <url> --token <token>
```

## For Automation (CI/CD)

### JSON Output

```bash
# Get recipes as JSON for scripts
configurator recipe list --json

# Get recipe details as JSON
configurator recipe show multi-region --json
```

### CI Mode

```bash
# Apply without confirmation prompts
configurator recipe apply multi-region \
  --url $SALEOR_URL \
  --token $SALEOR_TOKEN \
  --ci
```

### Plan Mode (Dry Run)

```bash
# See what would change without applying
configurator recipe apply multi-region \
  --url $SALEOR_URL \
  --token $SALEOR_TOKEN \
  --plan
```

## Common Workflows

### Setting Up a New Store

```bash
# 1. Start with multi-region channels
configurator recipe apply multi-region --url <url> --token <token>

# 2. Add digital products support
configurator recipe apply digital-products --merge --url <url> --token <token>

# 3. Configure shipping
configurator recipe apply custom-shipping --merge --url <url> --token <token>
```

### Migrating Configuration Between Environments

```bash
# 1. Export your current config
configurator introspect --url <prod-url> --token <prod-token>

# 2. Modify for staging (or use a recipe as base)
# Edit config.yml or use recipe export

# 3. Apply to staging
configurator deploy --url <staging-url> --token <staging-token>
```

## Troubleshooting

### "Recipe conflicts with existing configuration"

Your Saleor instance already has some entities that the recipe would create.

**Solutions**:
1. Use `--merge` to keep both
2. Remove conflicting entities from Saleor first
3. Export and customize the recipe to exclude conflicts

### "Permission denied"

Your API token doesn't have permission to create the required entities.

**Solution**: Ensure your token has permissions for all entity types in the recipe (channels, warehouses, etc.)

### "Saleor version incompatible"

The recipe requires a newer Saleor version.

**Solution**: Check the recipe's `saleorVersion` requirement with `recipe show <name>` and upgrade your Saleor instance if needed.

## Next Steps

- Browse the [full documentation](https://docs.saleor.io/configurator)
- Check [Saleor documentation](https://docs.saleor.io) for entity configuration details
- Create your own recipes by exporting and modifying built-in ones
