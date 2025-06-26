# Configurator

> [!WARNING]
> This project is in early development. Please use with caution.

Configurator is a "commerce as code" tool that helps you automate the creation and management of data models in Saleor. Instead of manually creating product types, attributes, products, and variants, you can define them in a configuration file and let the tool handle the synchronization with your Saleor instance.

## Quickstart

1. Create an app token with all permissions.
2. Introspect your current configuration from Saleor to `config.yml`:

```bash
pnpm introspect --url="https://your-store.saleor.cloud/graphql/" --token="your-app-token""
```

3. Edit the configuration file to your needs. You can find the schema documentation in [SCHEMA.md](SCHEMA.md).
4. Push the changes to Saleor:

```bash
pnpm push --url="https://your-store.saleor.cloud/graphql/" --token="your-app-token"
```

The above will apply the changes to your Saleor instance.

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
    # Product-level attributes (shared across all variants)
    productAttributes:
      - name: Author
        inputType: PLAIN_TEXT
      - name: Genre
        inputType: DROPDOWN
        values:
          - name: Fiction
          - name: Non-Fiction
          - name: Fantasy
          - name: Science Fiction
          - name: Mystery
          - name: Romance
      - name: Publisher
        inputType: PLAIN_TEXT
      - name: Publication Year
        inputType: NUMERIC
    # Variant-level attributes (different for each variant)
    variantAttributes:
      - name: Format
        inputType: DROPDOWN
        values:
          - name: Hardcover
          - name: Paperback
          - name: E-book
          - name: Audiobook
      - name: ISBN
        inputType: PLAIN_TEXT
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
  - name: "The Lord of the Rings: The Fellowship of the Ring"
    productType: "Book"
    category: "Fiction/Fantasy"
    description: "The first volume of J.R.R. Tolkien's epic fantasy trilogy"
    # Product-level attributes (shared across all variants)
    attributes:
      Author: "J.R.R. Tolkien"
      Genre: "Fantasy"
      Publisher: "Houghton Mifflin"
      Publication Year: 1954
    # Configure product-level channel settings
    channelListings:
      - channel: "poland"
        isPublished: true
        visibleInListings: true
        availableForPurchase: "2024-01-01T00:00:00Z"
        publishedAt: "2024-01-01T00:00:00Z"
    variants:
      - name: "Hardcover First Edition"
        sku: "LOTR-FOTR-HC-1ST"
        weight: 1.8
        # Variant-level attributes (specific to this format/edition)
        attributes:
          Format: "Hardcover"
          ISBN: "978-0-395-08254-6"
          Page Count: 479
        channelListings:
          - channel: "poland"
            price: 89.99
            costPrice: 45.00
      - name: "Paperback"
        sku: "LOTR-FOTR-PB"
        weight: 0.6
        attributes:
          Format: "Paperback"
          ISBN: "978-0-547-92822-7"
          Page Count: 479
        channelListings:
          - channel: "poland"
            price: 24.99
            costPrice: 12.50
      - name: "E-book"
        sku: "LOTR-FOTR-EBOOK"
        weight: 0
        digital: true
        attributes:
          Format: "E-book"
          ISBN: "978-0-547-95154-6"
          Page Count: 479
        channelListings:
          - channel: "poland"
            price: 14.99
            costPrice: 7.50
```

> [!TIP]
> See [SCHEMA.md](SCHEMA.md) for schema documentation with all the available properties.

## Development

### Installing dependencies

```bash
pnpm install
```

This will install the dependencies and fetch the Saleor schema needed for [gql.tada](https://gql-tada.0no.co/) to generate the types.

### Schema Documentation

The configuration schema is automatically documented from Zod schemas with GraphQL field mappings. The `SCHEMA.md` file is automatically regenerated by CI when schema files change.

**Manual generation** (if needed):

```bash
pnpm run generate-docs
```

The documentation includes:

- GraphQL field mappings for each configuration option
- Field types and required/optional status
- Enum values and examples
- Proper markdown structure with table of contents

### Versioning

This project uses [Changesets](https://github.com/changesets/changesets) for version management and changelog generation.

Please execute the following command when making changes that should be released:

```bash
# Document your changes
pnpm changeset
```

**Automated workflow:**

1. PRs require changesets (enforced by CI)
2. When PRs with changesets are merged, a Release PR is automatically created
3. Merging the Release PR finalizes the version and creates a GitHub release

**Skip changesets:** Add the `skip-changeset` label to PRs that don't need versioning (docs, tests, internal changes).

## Commands

### `pnpm push`

Reads the configuration file from a given path and creates/updates the data models in Saleor.

#### Options

- `--url` (required): The URL of the Saleor instance
- `--token` (required): App token with necessary permissions
- `--config` (optional): Path to configuration file (defaults to `config.yml`)

#### Usage

```bash
# Basic usage
pnpm push --url="https://your-store.saleor.cloud/graphql/" --token="your-app-token"

# With custom config file
pnpm push --url="https://your-store.saleor.cloud/graphql/" --token="your-app-token" --config="production.yml"
```

Currently, it supports:

- [x] Shop settings configuration
- [x] Channels with settings (payment, stock, order, checkout)
- [x] Attributes and product types
- [x] Page types with attributes
- [x] Categories and subcategories
- [x] Products with variants, SKUs, and attributes
- [x] Product and variant channel listings with pricing
- [ ] Warehouses and shipping zones
- [ ] Collections and discounts

### `pnpm introspect`

Retrieves the configuration from the Saleor instance and saves it to a file under the given path.

#### Options

- `--url` (required): The URL of the Saleor instance
- `--token` (required): App token with necessary permissions
- `--config` (optional): Path to configuration file (defaults to `config.yml`)
- `--force` (optional): Skip confirmation prompts and overwrite files without asking
- `--dry-run` (optional): Preview changes without making any modifications

#### Usage

```bash
# Basic usage (shows diff and asks for confirmation)
pnpm introspect --url="https://your-store.saleor.cloud/graphql/" --token="your-app-token"

```
Currently, it supports:

- [x] Fetching channels
- [x] Saving config to config.yml file
- [x] Fetching product types
- [x] Fetching page types
- [x] Fetching attributes

### Limitations

- Configurator fetches first 100 items from all paginated queries.
