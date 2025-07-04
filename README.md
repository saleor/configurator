# Saleor Configurator

> [!WARNING]
> This project is in early development. Please use with caution.

Saleor Configurator is a "commerce as code" tool that helps you automate the creation and management of data models in Saleor. Instead of manually creating product types, attributes, products, and variants, you can define them in a configuration file and let the tool handle the synchronization with your Saleor instance.

> [!TIP]
> The best place to start is with the interactive setup wizard.

```bash
pnpm start
```

## Quickstart

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

## Configuration

```yaml
// Example config.yml
shop:
  customerAllowedToSetExternalReference: false
  defaultMailSenderName: "Saleor Store"
  defaultMailSenderAddress: "store@example.com"
  displayGrossPrices: true
  enableAccountConfirmationByEmail: true
  limitQuantityPerCheckout: 50
  trackInventoryByDefault: true
  reserveStockDurationAnonymousUser: 60
  reserveStockDurationAuthenticatedUser: 120
  defaultDigitalMaxDownloads: 5
  defaultDigitalUrlValidDays: 30
  defaultWeightUnit: KG
  allowLoginWithoutConfirmation: false

channels:
  - name: Poland
    currencyCode: PLN
    defaultCountry: PL
    slug: poland
    isActive: false  # Channels are inactive by default
    settings:
      allocationStrategy: PRIORITIZE_SORTING_ORDER
      automaticallyConfirmAllNewOrders: true
      automaticallyFulfillNonShippableGiftCard: true
      expireOrdersAfter: 30
      deleteExpiredOrdersAfter: 60
      markAsPaidStrategy: TRANSACTION_FLOW
      allowUnpaidOrders: false
      includeDraftOrderInVoucherUsage: true
      useLegacyErrorFlow: false
      automaticallyCompleteFullyPaidCheckouts: true
      defaultTransactionFlowStrategy: AUTHORIZATION

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
          - name: Fantasy
      - name: Related Books
        inputType: REFERENCE
        entityType: PRODUCT
    variantAttributes:
      - name: Size
        inputType: DROPDOWN
        values:
          - name: Small
          - name: Medium
          - name: Large
  - name: E-Book
    productAttributes:
      - attribute: author # Reference an existing attribute by slug
      - attribute: genre # Reference an existing attribute by slug
      - name: File Format # New attribute
        inputType: DROPDOWN
        values:
          - name: PDF
          - name: EPUB
          - name: MOBI
      - name: DRM Protected
        inputType: BOOLEAN
      - name: Page Count
        inputType: NUMERIC


pageTypes:
  - name: Blog Post
    attributes:
      - name: Title
        inputType: PLAIN_TEXT
      - name: Description
        inputType: PLAIN_TEXT
      - name: Published Date
        inputType: DATE
      - name: Related Posts
        inputType: REFERENCE
        entityType: PAGE

categories:
  - name: "Fiction"
    subcategories:
      - name: "Fantasy"
  - name: "Non-Fiction"
    subcategories:
      - name: "Science"
      - name: "History"

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
          Cover: "Hardcover"
        channelListings: []
      - name: "Paperback"
        sku: "BOOK-001-PB"
        weight: 0.8
        attributes:
          Size: "Standard"
          Cover: "Paperback"
        channelListings: []
```

> [!TIP]
> See [SCHEMA.md](SCHEMA.md) for schema documentation with all the available properties.

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

## Development

### Prerequisites

- Node.js 20+
- pnpm 9+

### Installing dependencies

```bash
pnpm install
```

This will install the dependencies and fetch the Saleor schema needed for [gql.tada](https://gql-tada.0no.co/) to generate the types.

### Architecture

The project follows clean architecture principles with clear separation of concerns:

- **Domain-specific repositories**: Each entity type (products, channels, categories, etc.) has its own repository
- **Service layer**: Business logic is encapsulated in service classes, CLI logic is encapsulated in command handlers

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
