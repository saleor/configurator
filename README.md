# Saleor Configurator

> Commerce as Code — Define your Saleor store in YAML, sync with your instance

[![npm version](https://img.shields.io/npm/v/@saleor/configurator.svg)](https://www.npmjs.com/package/@saleor/configurator)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Declarative configuration management for [Saleor](https://saleor.io) e-commerce stores.

## What is Saleor Configurator?

Saleor Configurator brings **infrastructure-as-code** principles to e-commerce. Instead of manually configuring your store through the dashboard, you define everything in version-controlled YAML files and sync them to your Saleor instance.

**Key Benefits:**

- **Version Control** — Track all store changes in Git with full history
- **Reproducibility** — Spin up identical configurations across environments
- **Multi-Environment** — Manage dev, staging, and production from the same codebase
- **Review Process** — Use pull requests to review configuration changes
- **Automation** — Integrate with CI/CD for automated deployments

```
┌─────────────┐     introspect     ┌─────────────┐
│   Saleor    │ ─────────────────► │  config.yml │
│  Instance   │                    │   (local)   │
└─────────────┘                    └─────────────┘
       ▲                                  │
       │                                  │
       │         deploy                   │ modify
       └──────────────────────────────────┘
```

## Quick Start

**Prerequisites:** Node.js 20+

### Installation

```bash
# Run directly (recommended)
npx @saleor/configurator start
pnpm dlx @saleor/configurator start

# Or install globally
npm install -g @saleor/configurator
pnpm add -g @saleor/configurator
```

### First-Time Setup

The easiest way to get started is with the interactive wizard:

```bash
npx @saleor/configurator start
```

### Core Workflow

```bash
# 1. Download your current store configuration
npx @saleor/configurator introspect \
  --url https://your-store.saleor.cloud/graphql/ \
  --token your-app-token

# 2. Modify config.yml to define your desired state

# 3. Preview changes before applying
npx @saleor/configurator diff \
  --url https://your-store.saleor.cloud/graphql/ \
  --token your-app-token

# 4. Deploy your configuration
npx @saleor/configurator deploy \
  --url https://your-store.saleor.cloud/graphql/ \
  --token your-app-token
```

> **Tip:** Create an app token with all permissions in your Saleor dashboard under **Configuration > Apps**.

### Quick Reference

| Task | Command |
|------|---------|
| Download config | `npx @saleor/configurator introspect --url <URL> --token <TOKEN>` |
| Preview changes | `npx @saleor/configurator diff --url <URL> --token <TOKEN>` |
| Deploy changes | `npx @saleor/configurator deploy --url <URL> --token <TOKEN>` |
| Apply recipe | `npx @saleor/configurator recipe apply <name> --url <URL> --token <TOKEN>` |
| CI deployment | `npx @saleor/configurator deploy --url <URL> --token <TOKEN> --ci` |

## Commands

All commands support `--help` for detailed usage information.

### `start` — Interactive Wizard

Guided setup for exploring features and connecting to your Saleor instance.

```bash
npx @saleor/configurator start
```

### `introspect` — Download Remote Config

Fetches the current configuration from your Saleor instance and saves it locally.

```bash
npx @saleor/configurator introspect --url <URL> --token <TOKEN>

# With custom output file
npx @saleor/configurator introspect --url <URL> --token <TOKEN> --config production.yml
```

### `diff` — Preview Changes

Shows what would change if you deployed, without making any modifications.

```bash
npx @saleor/configurator diff --url <URL> --token <TOKEN>
```

### `deploy` — Apply Configuration

Syncs your local configuration to the remote Saleor instance.

```bash
# Interactive mode with confirmation prompts
npx @saleor/configurator deploy --url <URL> --token <TOKEN>

# CI mode - skip confirmations
npx @saleor/configurator deploy --url <URL> --token <TOKEN> --ci

# Custom config file
npx @saleor/configurator deploy --url <URL> --token <TOKEN> --config production.yml
```

### `recipe` — Pre-Built Templates

Apply ready-to-use configuration templates for common e-commerce scenarios.

```bash
# List available recipes
npx @saleor/configurator recipe list

# Preview a recipe's configuration
npx @saleor/configurator recipe show multi-region

# Apply a recipe to your instance
npx @saleor/configurator recipe apply multi-region --url <URL> --token <TOKEN>

# Export for customization
npx @saleor/configurator recipe export multi-region --output my-config.yml
```

## Configuration

Define your store configuration in YAML (default: `config.yml`).

### Structure Overview

```yaml
# Global store settings
shop:
  defaultMailSenderName: "My Store"
  displayGrossPrices: true

# Sales channels (multi-currency, multi-region)
channels:
  - name: "United States"
    slug: us
    currencyCode: USD
    defaultCountry: US

# Product catalog structure
productTypes:
  - name: "Book"
    isShippingRequired: true
    productAttributes:
      - name: "Author"
        inputType: PLAIN_TEXT

categories:
  - name: "Fiction"
    slug: fiction
    subcategories:
      - name: "Fantasy"
        slug: fantasy

products:
  - name: "Sample Book"
    slug: sample-book
    productType: "Book"
    category: fiction
    variants:
      - name: "Hardcover"
        sku: "BOOK-001"

# Fulfillment
warehouses:
  - name: "Main Warehouse"
    slug: main-warehouse
    address:
      streetAddress1: "123 Commerce St"
      city: "New York"
      country: US

shippingZones:
  - name: "US Zone"
    countries: ["US"]
    warehouses: ["main-warehouse"]
```

### Domain Modeling

Saleor's domain model consists of interconnected entity types that you can configure declaratively.

#### Core Entities

| Entity | Purpose | Configured Via |
|--------|---------|----------------|
| **Products** | Sellable items with variants, pricing, stock | `products` |
| **Product Types** | Templates defining product structure and attributes | `productTypes` |
| **Categories** | Hierarchical product taxonomy (one category per product) | `categories` |
| **Collections** | Flexible product groupings for merchandising | `collections` |
| **Models** | Custom entities extending beyond products (e.g., Brands, Ingredients) | `models` |
| **Model Types** | Templates defining model structure | `pageTypes` |
| **Structures** | Hierarchical navigation linking categories, collections, models, URLs | `menus` |

#### Attributes

Attributes are reusable typed fields assigned to products or models:

| Type | Description | Example |
|------|-------------|---------|
| `DROPDOWN` | Single-select from predefined values | Color: Red, Blue, Green |
| `MULTISELECT` | Multi-select from predefined values | Tags: Sale, New, Featured |
| `PLAIN_TEXT` | Unformatted text | Material: "100% Cotton" |
| `RICH_TEXT` | Formatted content blocks | Product description |
| `NUMERIC` | Numbers with optional units | Weight: 500g |
| `BOOLEAN` | Yes/no values | Fair trade certified |
| `DATE` / `DATE_TIME` | Date values | Release date |
| `FILE` | File attachments | Product manual PDF |
| `SWATCH` | Color codes or images | Visual color picker |
| `REFERENCE` | Links to other entities | Related products |

#### Linking Entities with REFERENCE Attributes

Connect products to other products, models, or variants:

```yaml
productTypes:
  - name: "Perfume"
    productAttributes:
      - name: "Scent Profiles"
        inputType: REFERENCE
        entityType: PAGE          # Links to Models
      - name: "Related Products"
        inputType: REFERENCE
        entityType: PRODUCT       # Links to other Products
```

#### Custom Entities with Models

Extend your domain beyond products using Models (internally called Pages):

```yaml
# Define structure with pageTypes
pageTypes:
  - name: "Brand"
    attributes:
      - name: "Country"
        inputType: DROPDOWN
        values: [{ name: "France" }, { name: "Italy" }, { name: "USA" }]
      - name: "Founded"
        inputType: NUMERIC

# Create instances with models
models:
  - title: "Maison Lumière"
    slug: "maison-lumiere"
    modelType: "Brand"
    attributes:
      country: "France"
      founded: 1925
```

#### Structures (Navigation)

Organize entities hierarchically using menus:

```yaml
menus:
  - name: "Main Navigation"
    slug: "main-nav"
    items:
      - name: "Shop"
        category: "all-products"      # Link to Category
      - name: "Collections"
        children:
          - name: "Summer Sale"
            collection: "summer-sale" # Link to Collection
      - name: "Our Brands"
        page: "maison-lumiere"        # Link to Model
      - name: "Help"
        url: "https://help.example.com"  # External URL
```

**Learn more:** [Saleor Modeling](https://docs.saleor.io/developer/modeling) · [Attributes](https://docs.saleor.io/developer/attributes/overview) · [Products](https://docs.saleor.io/developer/products/overview)

### Entity Identification

Entities are identified by either `slug` or `name` depending on their type:

| Identifier | Entity Types |
|------------|--------------|
| **slug** | Channels, Categories, Collections, Menus, Pages, Products, Warehouses |
| **name** | ProductTypes, PageTypes, TaxClasses, ShippingZones, Attributes |

When referencing entities, use the appropriate identifier:

```yaml
products:
  - name: "Sample Book"
    productType: "Book"        # Reference by name (ProductType)
    category: "fiction"        # Reference by slug (Category)
    collections: ["featured"]  # Reference by slug (Collection)
```

### Complete Reference

- **[SCHEMA.md](SCHEMA.md)** — Full field documentation and validation rules
- **[example.yml](example.yml)** — Comprehensive working example

## Recipes

Recipes are pre-built YAML configuration templates for common e-commerce scenarios. They complement the [Saleor Recipes documentation](https://docs.saleor.io/recipes/overview) by providing ready-to-deploy configurations you can apply directly or customize.

### Available Recipes

| Recipe | Description | Entities |
|--------|-------------|----------|
| **multi-region** | US, EU, UK markets with regional warehouses | Channels, Warehouses, ShippingZones |
| **digital-products** | Product types for non-physical goods | ProductTypes |
| **click-and-collect** | Warehouse pickup points with local collection | Warehouses, ShippingZones |
| **custom-shipping** | Complex shipping zones and rate structures | ShippingZones |

### Quick Start with Recipes

```bash
# List all recipes with descriptions
npx @saleor/configurator recipe list

# Preview what a recipe contains
npx @saleor/configurator recipe show multi-region

# Apply directly to your instance
npx @saleor/configurator recipe apply multi-region --url <URL> --token <TOKEN>

# Export and customize before applying
npx @saleor/configurator recipe export multi-region --output my-store.yml
# Edit my-store.yml...
npx @saleor/configurator deploy --url <URL> --token <TOKEN> --config my-store.yml
```

> **Note:** More recipes are planned. Check `recipe list` for the current catalog.

See [recipes/README.md](recipes/README.md) for detailed recipe documentation and customization guides.

## CI/CD Integration

Automate configuration deployments with GitHub Actions or other CI systems.

### GitHub Actions Example

```yaml
name: Deploy Saleor Configuration

on:
  push:
    branches: [main]
    paths: ['config.yml']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Preview changes
        run: |
          npx @saleor/configurator diff \
            --url ${{ secrets.SALEOR_URL }} \
            --token ${{ secrets.SALEOR_TOKEN }}

      - name: Deploy configuration
        run: |
          npx @saleor/configurator deploy \
            --url ${{ secrets.SALEOR_URL }} \
            --token ${{ secrets.SALEOR_TOKEN }} \
            --ci
```

### Key Flags for Automation

| Flag | Description |
|------|-------------|
| `--ci` | Skip all confirmation prompts |
| `--json` | Output machine-readable JSON |
| `--quiet` | Suppress non-essential output |

### Multi-Environment Pattern

```bash
# Production deployment
npx @saleor/configurator deploy \
  --url $PROD_URL --token $PROD_TOKEN \
  --config config.yml --ci

# Staging deployment
npx @saleor/configurator deploy \
  --url $STAGING_URL --token $STAGING_TOKEN \
  --config config.yml --ci
```

See [docs/ci-cd/README.md](docs/ci-cd/README.md) for workflow templates, exit codes, and advanced patterns.

## Troubleshooting

### Common Issues

**Authentication Failed**
- Verify your token in the Saleor dashboard
- Ensure the app has all required permissions
- Check that the URL ends with `/graphql/`

**Entity Reference Errors**
- Verify referenced entities exist (e.g., categories before products)
- Check identifier types: use `slug` for categories, `name` for product types
- Run `diff` to see what's missing

**Validation Errors**
- Check required fields are present
- Validate enum values match the schema
- See [SCHEMA.md](SCHEMA.md) for field requirements

### Diagnostic Commands

```bash
# Test connectivity
npx @saleor/configurator introspect --url <URL> --token <TOKEN> --include shop

# Preview without changes (show plan only)
npx @saleor/configurator deploy --url <URL> --token <TOKEN> --plan

# Debug mode
LOG_LEVEL=debug npx @saleor/configurator diff --url <URL> --token <TOKEN>
```

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for detailed troubleshooting procedures.

## Contributing

### Development Setup

```bash
# Clone and install
git clone https://github.com/saleor/configurator.git
cd configurator
pnpm install

# Run in development mode
pnpm dev start
pnpm dev introspect --url <URL> --token <TOKEN>

# Build and test
pnpm build
pnpm test
```

### Quality Standards

```bash
# Before committing
pnpm check:fix && pnpm build && pnpm test
```

### Versioning

This project uses [Changesets](https://github.com/changesets/changesets) for version management:

```bash
# Document your changes
pnpm changeset
```

See [docs/DEVELOPMENT_WORKFLOWS.md](docs/DEVELOPMENT_WORKFLOWS.md) for detailed contribution guidelines.

## Documentation

| Document | Description |
|----------|-------------|
| [SCHEMA.md](SCHEMA.md) | Complete configuration field reference |
| [example.yml](example.yml) | Working example with all entity types |
| [recipes/README.md](recipes/README.md) | Pre-built recipe templates |
| [docs/COMMANDS.md](docs/COMMANDS.md) | Complete CLI reference |
| [docs/ci-cd/README.md](docs/ci-cd/README.md) | CI/CD integration guide |
| [docs/ENTITY_REFERENCE.md](docs/ENTITY_REFERENCE.md) | Entity types and identification |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Problem diagnosis and fixes |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design and internals |
| [docs/DEVELOPMENT_WORKFLOWS.md](docs/DEVELOPMENT_WORKFLOWS.md) | Contributor guide |
| [docs/CODE_QUALITY.md](docs/CODE_QUALITY.md) | Coding standards |
| [docs/TESTING_PROTOCOLS.md](docs/TESTING_PROTOCOLS.md) | Testing guidelines |

## License

MIT License - see [LICENSE](LICENSE) for details.
