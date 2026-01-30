# Saleor Configurator Recipes

Pre-built YAML configuration templates for common e-commerce scenarios. Each recipe provides a tested, production-ready configuration that you can deploy immediately or customize to your needs.

These recipes complement the [Saleor Recipes documentation](https://docs.saleor.io/recipes/overview), which provides conceptual guides and implementation details. Use the docs to understand the concepts, then use these templates to quickly deploy the configuration.

## Quick Start

```bash
# List available recipes
npx @saleor/configurator recipe list

# Preview a recipe's configuration
npx @saleor/configurator recipe show multi-region

# Apply a recipe to your Saleor instance
npx @saleor/configurator recipe apply multi-region --url <URL> --token <TOKEN>

# Export a recipe for customization
npx @saleor/configurator recipe export multi-region --output my-config.yml
```

## Available Recipes

### Multi-Region (`multi-region`)

Configure channels for US, EU, and UK markets with regional warehouses and shipping zones.

**Use cases:**
- International stores
- Multi-country operations
- Regional pricing strategies

**Entities created:**
- 3 Channels (US, EU, UK)
- 3 Warehouses (regional fulfillment centers)
- 3 Shipping Zones (per region)

```bash
npx @saleor/configurator recipe apply multi-region --url <URL> --token <TOKEN>
```

### Digital Products (`digital-products`)

Configure product types for selling non-physical goods without shipping requirements.

**Use cases:**
- Software licenses
- Digital downloads
- Online courses
- Subscription services

**Entities created:**
- 3 Product Types (configured for digital delivery)

```bash
npx @saleor/configurator recipe apply digital-products --url <URL> --token <TOKEN>
```

### Click & Collect (`click-and-collect`)

Configure warehouses as pickup points with local collection shipping options.

**Use cases:**
- Retail chains with BOPIS (Buy Online, Pick Up In Store)
- Grocery stores
- Quick service restaurants
- Hybrid retail models

**Entities created:**
- 2 Warehouses (configured as pickup locations)
- 1 Shipping Zone (local pickup)

```bash
npx @saleor/configurator recipe apply click-and-collect --url <URL> --token <TOKEN>
```

### Custom Shipping (`custom-shipping`)

Configure shipping zones with methods and rate structures for common regions.

**Use cases:**
- Complex logistics requirements
- Multi-carrier strategies
- Zone-based pricing
- Special delivery services

**Entities created:**
- 3 Shipping Zones (with methods and rates)

```bash
npx @saleor/configurator recipe apply custom-shipping --url <URL> --token <TOKEN>
```

## Choosing the Right Recipe

| Recipe | Best For | Key Benefit |
|--------|----------|-------------|
| **multi-region** | Global operations | Multi-currency, regional fulfillment |
| **digital-products** | Software & media | No shipping complexity |
| **click-and-collect** | Omnichannel retail | Store pickup integration |
| **custom-shipping** | Complex logistics | Flexible rate structures |

## Customization Workflow

Recipes are starting points. Here's how to customize:

### 1. Export the Recipe

```bash
npx @saleor/configurator recipe export multi-region --output my-store.yml
```

### 2. Customize the Configuration

Edit `my-store.yml` to:
- Adjust channel settings (currencies, countries)
- Modify warehouse addresses
- Configure shipping rates
- Add product types and categories

### 3. Preview Changes

```bash
npx @saleor/configurator diff --url <URL> --token <TOKEN> --config my-store.yml
```

### 4. Deploy

```bash
npx @saleor/configurator deploy --url <URL> --token <TOKEN> --config my-store.yml
```

## Recipe Command Reference

| Command | Description |
|---------|-------------|
| `recipe list` | List all available recipes with descriptions |
| `recipe list --category <cat>` | Filter recipes by category |
| `recipe list --json` | Output in JSON format |
| `recipe show <name>` | Display a recipe's full configuration |
| `recipe show <name> --json` | Output configuration as JSON |
| `recipe apply <name>` | Deploy a recipe to your Saleor instance |
| `recipe apply <name> --plan` | Preview without applying |
| `recipe apply <name> --ci` | Skip confirmation prompts |
| `recipe export <name>` | Save a recipe to a local file |
| `recipe export <name> --output <path>` | Specify output file path |

## Combining Recipes

You can combine multiple recipes by exporting and merging:

```bash
# Export recipes
npx @saleor/configurator recipe export multi-region --output base.yml
npx @saleor/configurator recipe export digital-products --output digital.yml

# Manually merge the YAML files, then deploy
npx @saleor/configurator deploy --url <URL> --token <TOKEN> --config merged.yml
```

## Contributing Recipes

We welcome community contributions. To add a new recipe:

1. Create a YAML file in `src/recipes/` following existing patterns
2. Update `src/recipes/manifest.json` with recipe metadata
3. Test the recipe against a Saleor instance
4. Submit a pull request

### Recipe Guidelines

- **Production-ready**: Recipes should be deployable without modification
- **Well-documented**: Include clear descriptions in the manifest
- **Tested**: Verify with the latest supported Saleor version (3.15+)
- **Focused**: Each recipe should solve a specific use case

## Related Resources

- [Saleor Recipes](https://docs.saleor.io/recipes/overview) — Conceptual guides for e-commerce patterns
- [Saleor Documentation](https://docs.saleor.io) — Official Saleor documentation
- [Configuration Schema](../SCHEMA.md) — Full field documentation
- [CLI Reference](../docs/COMMANDS.md) — Complete command reference
- [Examples](../docs/EXAMPLES.md) — Additional configuration examples
