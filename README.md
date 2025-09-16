# Saleor Configurator

> [!WARNING]
> This project is in early development. Please use with caution.

Saleor Configurator is a "commerce as code" tool that helps you automate the creation and management of data models in Saleor. Instead of manually creating product types, attributes, products, and variants, you can define them in a configuration file and let the tool handle the synchronization with your Saleor instance.

## Usage

**Prerequisites:**

- Node.js 20+

**Usage:**

```bash
# Run directly (recommended)
pnpm dlx @saleor/configurator start
npx @saleor/configurator@latest start

# Or install globally
pnpm add -g @saleor/configurator
npm install -g @saleor/configurator
saleor-configurator start
```

**Quickstart:**

1. Create an app token with all permissions in your Saleor dashboard.

> [!TIP]
> Use the `start` command to explore features interactively and see what's possible.

2. Introspect your current configuration from your remote Saleor instance:

```bash
pnpm dlx @saleor/configurator introspect --url https://your-store.saleor.cloud/graphql/ --token your-app-token
```

3. Modify the configuration to define your commerce setup. You can configure:
   - **Store settings** (shop configuration, channels, tax classes)
   - **Product catalog** (product types, categories, collections, products)
   - **Fulfillment** (warehouses, shipping zones and methods)
   - **Content management** (page types, models, menus)

> [!NOTE]
> **Key Resources for Configuration:**
>
> 🔧 **[example.yml](example.yml)** - Comprehensive working example with all entity types
>
> 📖 **[SCHEMA.md](SCHEMA.md)** - Complete field documentation and validation rules
>
> 💡 **Best Practices:**
> - Start with introspection to understand your current setup
> - Make incremental changes and test with `diff` before deploying
> - Configuration is treated as source of truth - undefined entities will be removed
> - Always backup your data before major changes

4. Preview changes before applying:

```bash
pnpm dlx @saleor/configurator diff --url https://your-store.saleor.cloud/graphql/ --token your-app-token
```

5. Deploy your configuration:

```bash
pnpm dlx @saleor/configurator deploy --url https://your-store.saleor.cloud/graphql/ --token your-app-token
```

> [!TIP]
> Use `--help` with any command to see all available options and examples.

## Commands

All commands support the `--help` flag to display detailed usage information with examples.

### `start`

Starts the interactive setup wizard that will guide you through the available operations.

```bash
pnpm dlx @saleor/configurator start
```

### `deploy`

Deploys the local configuration to the remote Saleor instance with mandatory diff preview and safety confirmations.

```bash
# Basic usage with diff preview and confirmation
pnpm dlx @saleor/configurator deploy --url https://your-store.saleor.cloud/graphql/ --token your-app-token

# With custom config file
pnpm dlx @saleor/configurator deploy --url https://your-store.saleor.cloud/graphql/ --token your-app-token --config production.yml

# CI mode (skip all confirmations for automated environments)
pnpm dlx @saleor/configurator deploy --url https://your-store.saleor.cloud/graphql/ --token your-app-token --ci

# Show help
pnpm dlx @saleor/configurator deploy --help
```

**Arguments:**

- `--url` (required): Saleor instance URL
- `--token` (required): Saleor API token
- `--config` (optional): Configuration file path (default: `config.yml`)
- `--ci` (optional): CI mode - skip all confirmations for automated environments
- `--quiet` (optional): Suppress output
- `--help`: Show command help with examples

### `diff`

Shows the differences between the local and remote Saleor instances.

```bash
# Basic usage
pnpm dlx @saleor/configurator diff --url https://your-store.saleor.cloud/graphql/ --token your-app-token

# With custom config file
pnpm dlx @saleor/configurator diff --url https://your-store.saleor.cloud/graphql/ --token your-app-token --config production.yml

# Show help
pnpm dlx @saleor/configurator diff --help
```

**Arguments:**

- `--url` (required): Saleor instance URL
- `--token` (required): Saleor API token
- `--config` (optional): Configuration file path (default: `config.yml`)
- `--quiet` (optional): Suppress output
- `--help`: Show command help with examples

### `introspect`

Shows the current state of the remote Saleor instance and upon confirmation saves it to a configuration file.

```bash
# Basic usage (shows diff and asks for confirmation)
pnpm dlx @saleor/configurator introspect --url https://your-store.saleor.cloud/graphql/ --token your-app-token

# With custom config file
pnpm dlx @saleor/configurator introspect --url https://your-store.saleor.cloud/graphql/ --token your-app-token --config production.yml

# Show help
pnpm dlx @saleor/configurator introspect --help
```

**Arguments:**

- `--url` (required): Saleor instance URL
- `--token` (required): Saleor API token
- `--config` (optional): Configuration file path (default: `config.yml`)
- `--quiet` (optional): Suppress output
- `--help`: Show command help with examples

## Configuration

Define your Saleor configuration in a YAML file (default: `config.yml`). For detailed documentation of all available fields, see [SCHEMA.md](SCHEMA.md).

```yaml
# Complete store configuration example
shop:
  defaultMailSenderName: "My Store"
  defaultMailSenderAddress: "store@example.com"
  displayGrossPrices: true
  trackInventoryByDefault: true

channels:
  - name: "United States"
    slug: "us"
    currencyCode: "USD"
    defaultCountry: "US"
    isActive: true

# Tax management
taxClasses:
  - name: "Standard Rate"
    countries:
      - countryCode: "US"
        taxRate: 8.5

# Warehouse and shipping
warehouses:
  - name: "Main Warehouse"
    slug: "main-warehouse"
    email: "warehouse@example.com"
    isPrivate: false
    clickAndCollectOption: "LOCAL"
    address:
      streetAddress1: "123 Commerce Street"
      city: "New York"
      postalCode: "10001"
      country: "US"

shippingZones:
  - name: "US Zone"
    slug: "us-zone"
    countries: ["US"]
    warehouses: ["main-warehouse"]
    channels: ["us"]
    shippingMethods:
      - name: "Standard Shipping"
        type: "PRICE"
        channelListings:
          - channel: "us"
            price: 9.99

# Product catalog structure  
productTypes:
  - name: "Book"
    isShippingRequired: true
    productAttributes:
      - name: "Author"
        inputType: "PLAIN_TEXT"
      - name: "Genre"
        inputType: "DROPDOWN"
        values:
          - name: "Fiction"
          - name: "Non-Fiction"

categories:
  - name: "Books"
    slug: "books"

collections:
  - name: "Featured Books"
    slug: "featured-books"
    channelListings:
      - channel: "us"
        isPublished: true

# Content management
pageTypes:
  - name: "Blog Post"
    attributes:
      - name: "Published Date"
        inputType: "DATE"

models:
  - name: "Welcome Post"
    slug: "welcome"
    modelType: "Blog Post"
    attributes:
      Published Date: "2024-01-01"

menus:
  - name: "Main Menu"
    slug: "main"
    items:
      - name: "Books"
        category: "books"

# Products
products:
  - name: "Sample Book"
    slug: "sample-book"
    productType: "Book"
    category: "books"
    attributes:
      Author: "Jane Doe"
      Genre: "Fiction"
    variants:
      - name: "Hardcover"
        sku: "BOOK-001"
        weight: 1.2
```

## Configuration Entities

The configurator supports comprehensive store management through these entity types:

### Core Store Configuration
- **shop** - Global store settings (email, pricing, inventory defaults)
- **channels** - Sales channels with currency, country, and channel-specific settings
- **taxClasses** - Tax rate definitions by country for products and shipping

### Logistics & Fulfillment  
- **warehouses** - Physical storage locations with addresses and settings
- **shippingZones** - Geographical regions with associated warehouses and shipping methods

### Product Catalog
- **productTypes** - Templates defining product structure and attributes
- **categories** - Hierarchical product organization with subcategories
- **collections** - Curated product groupings for merchandising
- **products** - Individual products with variants, pricing, and attributes

### Content Management
- **pageTypes** - Templates for structured content pages
- **models** - Content instances based on page types (like blog posts, landing pages)
- **menus** - Navigation structures linking to categories, collections, or external URLs

### Advanced Patterns

**Attribute Reuse** - Define attributes once, reference across entity types:

```yaml
pageTypes:
  - name: "Blog Post"
    attributes:
      - name: "Published Date"  # Define once
        inputType: "DATE"
  - name: "Article" 
    attributes:
      - attribute: "Published Date"  # Reuse existing
```

**Entity References** - Link entities using their identifiers (slugs for most, names for types):
```yaml
products:
  - name: "Sample Book"
    productType: "Book"        # Reference by name
    category: "fiction"        # Reference by slug
    collections: ["featured"]  # Reference by slug
```

**Resources:**
- **[example.yml](example.yml)** - Complete working configuration
- **[SCHEMA.md](SCHEMA.md)** - Detailed field documentation


## Development

For contributors and advanced users who want to modify the tool.

### Schema Documentation

The configuration schema is automatically documented from Zod schemas with GraphQL field mappings. The [`SCHEMA.md`](SCHEMA.md) file is automatically regenerated on push.

**Manual generation** (if needed):

```bash
pnpm run generate-schema-docs
```

### Local Development

```bash
# Install dependencies
pnpm install

# Run CLI in development mode with TypeScript
pnpm dev start

# Build the bundled CLI
pnpm build

# Test the bundled CLI locally
node dist/main.js --help
node dist/main.js start

# Run specific commands in development
pnpm dev introspect --url https://your-store.saleor.cloud/graphql/ --token your-token
pnpm dev deploy --url https://your-store.saleor.cloud/graphql/ --token your-token
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run specific test file
pnpm test src/modules/product/product-service.test.ts

# Run the sandbox end-to-end regression suite (requires Saleor sandbox token)
# The script also honours SALEOR_E2E_TOKEN / SALEOR_TOKEN and SALEOR_E2E_URL / SALEOR_URL
# Set CONFIGURATOR_AUTO_CONFIRM=true if you want to auto-accept interactive confirmations
CONFIGURATOR_E2E_SALEOR_TOKEN=your-token pnpm test:e2e
```

### Versioning

This project uses [Changesets](https://github.com/changesets/changesets) for version management and changelog generation.

Please execute the following command when making changes that should be released:

```bash
# Document your changes
pnpm changeset
```

**Skip changesets:** Add the `skip-changeset` label to PRs that don't need versioning (docs, tests, internal changes).
