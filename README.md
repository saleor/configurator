# Saleor Configurator

> [!WARNING]
> This project is in early development. Please use with caution.

Saleor Configurator is a "commerce as code" tool that helps you automate the creation and management of data models in Saleor. Instead of manually creating product types, attributes, products, and variants, you can define them in a configuration file and let the tool handle the synchronization with your Saleor instance.

## Usage

> [!IMPORTANT]
> Configurator is not currently published as an npm package. You need to clone the repository and install dependencies locally.

**Prerequisites:**

- Node.js 20+
- pnpm 9+

**Setup:**

1. Clone the repository:

```bash
git clone git@github.com:saleor/configurator.git
cd saleor-configurator
```

2. Install dependencies:

```bash
pnpm install
```

**Quickstart:**

1. Create an app token with all permissions in your Saleor dashboard.

> [!TIP]
> You can also use the `start` command to explore the features interactively.

2. Introspect your current configuration from your remote Saleor instance to `config.yml`:

```bash
pnpm introspect --url https://your-store.saleor.cloud/graphql/ --token your-app-token
```

3. Modify the pulled configuration according to your needs.

> [!NOTE]
>
> Here are a bunch of tips for working with the configuration file:
>
> 👉🏻 **Schema Documentation**: You can find the schema documentation in [SCHEMA.md](SCHEMA.md) and the example configuration in [example.yml](example.yml).
>
> 👉🏻 **Incremental Changes**: Introduce your changes incrementally. Add a small change, run `pnpm diff` to see what would be applied, and then push it.
>
> 👉🏻 **Backup Your Data**: Before applying changes, make sure to back up your database or snapshot your instance in Saleor Cloud.
>
> 👉🏻 **Configuration as Source of Truth**: Configurator treats your local configuration file as the authoritative source for your Saleor instance. This means any entities (channels, product types, attributes, etc.) that exist in your Saleor instance but are not defined in your configuration will be flagged for removal during the push operation.

4. Review changes with the diff command to see what changes would be applied to your Saleor instance:

```bash
pnpm diff --url https://your-store.saleor.cloud/graphql/ --token your-app-token
```

5. If you're happy with the changes, push them to your Saleor instance:

```bash
pnpm deploy --url https://your-store.saleor.cloud/graphql/ --token your-app-token
```

> [!TIP]
> Use `--help` with any command to see all available options and examples.

## Commands

All commands support the `--help` flag to display detailed usage information with examples.

### `pnpm start`

Starts the interactive setup wizard that will guide you through the available operations.

```bash
pnpm start
```

### `pnpm deploy`

Deploys the local configuration to the remote Saleor instance with mandatory diff preview and safety confirmations.

```bash
# Basic usage with diff preview and confirmation
pnpm deploy --url https://your-store.saleor.cloud/graphql/ --token your-app-token

# With custom config file
pnpm deploy --url https://your-store.saleor.cloud/graphql/ --token your-app-token --config production.yml

# CI mode (skip all confirmations for automated environments)
pnpm deploy --url https://your-store.saleor.cloud/graphql/ --token your-app-token --ci

# Show help
pnpm deploy --help
```

**Arguments:**

- `--url` (required): Saleor instance URL
- `--token` (required): Saleor API token
- `--config` (optional): Configuration file path (default: `config.yml`)
- `--ci` (optional): CI mode - skip all confirmations for automated environments
- `--quiet` (optional): Suppress output
- `--help`: Show command help with examples

### `pnpm diff`

Shows the differences between the local and remote Saleor instances.

```bash
# Basic usage
pnpm diff --url https://your-store.saleor.cloud/graphql/ --token your-app-token

# With custom config file
pnpm diff --url https://your-store.saleor.cloud/graphql/ --token your-app-token --config production.yml

# Show help
pnpm diff --help
```

**Arguments:**

- `--url` (required): Saleor instance URL
- `--token` (required): Saleor API token
- `--config` (optional): Configuration file path (default: `config.yml`)
- `--quiet` (optional): Suppress output
- `--help`: Show command help with examples

### `pnpm introspect`

Shows the current state of the remote Saleor instance and upon confirmation saves it to a configuration file.

```bash
# Basic usage (shows diff and asks for confirmation)
pnpm introspect --url https://your-store.saleor.cloud/graphql/ --token your-app-token

# With custom config file
pnpm introspect --url https://your-store.saleor.cloud/graphql/ --token your-app-token --config production.yml

# Show help
pnpm introspect --help
```

**Arguments:**

- `--url` (required): Saleor instance URL
- `--token` (required): Saleor API token
- `--config` (optional): Configuration file path (default: `config.yml`)
- `--quiet` (optional): Suppress output
- `--help`: Show command help with examples

## Configuration

Define your Saleor configuration in a YAML file (default: `config.yml`):

```yaml
shop:
  customerAllowedToSetExternalReference: false
  defaultMailSenderName: "Saleor Store"
  defaultMailSenderAddress: "store@example.com"
  displayGrossPrices: true

channels:
  - name: Poland
    currencyCode: PLN
    defaultCountry: PL
    slug: poland
    isActive: false

productTypes:
  - name: Book
    isShippingRequired: false
    productAttributes:
      - name: Author
        inputType: PLAIN_TEXT
      - name: Genre
        inputType: DROPDOWN
        values:
          - name: Fiction
          - name: Non-Fiction
    variantAttributes:
      - name: Size
        inputType: DROPDOWN
        values:
          - name: Small
          - name: Medium
          - name: Large

products:
  - name: "Sample Fiction Book"
    productType: "Book"
    category: "Fiction"
    attributes:
      Author: "Jane Doe"
      Genre: "Fiction"
    variants:
      - name: "Hardcover"
        sku: "BOOK-001-HC"
        weight: 1.2
        attributes:
          Size: "Large"
        channelListings: []
```

> [!TIP]
> See [SCHEMA.md](SCHEMA.md) for complete schema documentation with all available properties and [example.yml](example.yml) for an example configuration.

### Limitations

The following features are not yet supported in the current version:

- **Attribute Values**: Cannot add attribute values directly to products or variants
- **Variant Channel Listings**: Cannot add channel listings to individual variants

These limitations will be addressed in future releases.

## Development

For contributors and advanced users who want to modify the tool.

> [!NOTE]
> The `pnpm install` command will install dependencies and fetch the Saleor schema needed for [gql.tada](https://gql-tada.0no.co/) to generate the types.

### Schema Documentation

The configuration schema is automatically documented from Zod schemas with GraphQL field mappings. The [`SCHEMA.md`](SCHEMA.md) file is automatically regenerated by CI when schema files change.

**Manual generation** (if needed):

```bash
pnpm run generate-docs
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run specific test file
pnpm test src/modules/product/product-service.test.ts
```

### Versioning

This project uses [Changesets](https://github.com/changesets/changesets) for version management and changelog generation.

Please execute the following command when making changes that should be released:

```bash
# Document your changes
pnpm changeset
```

**Skip changesets:** Add the `skip-changeset` label to PRs that don't need versioning (docs, tests, internal changes).
