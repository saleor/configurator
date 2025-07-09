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
git clone https://github.com/saleor/saleor-configurator.git
cd saleor-configurator
```

2. Install dependencies:

```bash
pnpm install
```

3. Start the interactive setup wizard:

```bash
pnpm start
```

**Quickstart:**

1. Create an app token with all permissions in your Saleor dashboard.

2. Introspect your current configuration from your remote Saleor instance to `config.yml`:

```bash
pnpm introspect --url="https://your-store.saleor.cloud/graphql/" --token="your-app-token"
```

3. Edit the configuration file to your needs. You can find the schema documentation in [SCHEMA.md](SCHEMA.md).

4. Review changes with the diff command to see what will be updated:

```bash
pnpm diff --url="https://your-store.saleor.cloud/graphql/" --token="your-app-token"
```

5. Push the changes to Saleor:

```bash
pnpm push --url="https://your-store.saleor.cloud/graphql/" --token="your-app-token"
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

### `pnpm push`

Updates the remote Saleor instance according to the local configuration.

```bash
# Basic usage
pnpm push --url="https://your-store.saleor.cloud/graphql/" --token="your-app-token"

# With custom config file
pnpm push --url="https://your-store.saleor.cloud/graphql/" --token="your-app-token" --config="production.yml"

# Quiet mode (suppress output)
pnpm push --url="https://your-store.saleor.cloud/graphql/" --token="your-app-token" --quiet

# Show help
pnpm push --help
```

**Arguments:**

- `--url` (required): Saleor instance URL
- `--token` (required): Saleor API token
- `--config` (optional): Configuration file path (default: `config.yml`)
- `--quiet` (optional): Suppress output
- `--help`: Show command help with examples

### `pnpm diff`

Shows the differences between the local and remote Saleor instances.

```bash
# Basic usage
pnpm diff --url="https://your-store.saleor.cloud/graphql/" --token="your-app-token"

# With custom config file
pnpm diff --url="https://your-store.saleor.cloud/graphql/" --token="your-app-token" --config="production.yml"

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
pnpm introspect --url="https://your-store.saleor.cloud/graphql/" --token="your-app-token"

# With custom config file
pnpm introspect --url="https://your-store.saleor.cloud/graphql/" --token="your-app-token" --config="production.yml"

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
    description: "A reference book product for testing the Book product type"
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
> See [SCHEMA.md](SCHEMA.md) for complete schema documentation with all available properties.

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
