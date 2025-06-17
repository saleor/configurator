# Configurator

> [!WARNING]
> This project is in early development. Please use with caution.

Configurator is a tool that helps you automate the creation of data models in Saleor. Instead of, for example, manually creating product types and attributes, you can define them in a configuration file and let the tool do the rest.

## Example

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
    attributes:
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

warehouses:
  - name: Main Warehouse
    slug: main-warehouse
    email: warehouse@example.com
    address:
      streetAddress1: 123 Warehouse Street
      city: Warsaw
      postalCode: 00-001
      country: PL
      phone: "+48123456789"

collections:
  - name: Summer Collection
    slug: summer-collection
    description: Best products for summer season
    isPublished: true
    channelListings:
      - channelSlug: poland
        isPublished: true

products:
  - name: The Great Novel
    slug: the-great-novel
    description: An amazing story that will captivate readers
    productTypeName: Book
    categorySlug: fiction
    collections:
      - summer-collection
    weight: 0.5
    rating: 4.5
    attributes:
      - name: Author
        value: John Doe
      - name: Genre
        value: Fiction
    channelListings:
      - channelSlug: poland
        isPublished: true
        visibleInListings: true
        isAvailableForPurchase: true
    variants:
      - sku: TGN-HARDCOVER
        name: Hardcover Edition
        weight: 0.7
        trackInventory: true
        channelListings:
          - channelSlug: poland
            price: 79.99
            costPrice: 45.00
        stocks:
          - warehouseSlug: main-warehouse
            quantity: 100
      - sku: TGN-PAPERBACK
        name: Paperback Edition
        weight: 0.5
        trackInventory: true
        channelListings:
          - channelSlug: poland
            price: 49.99
            costPrice: 25.00
        stocks:
          - warehouseSlug: main-warehouse
            quantity: 200
```

## Development

### Installing dependencies

```bash
pnpm install
```

This will install the dependencies and fetch the Saleor schema needed for [gql.tada](https://gql-tada.0no.co/) to generate the types.

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

- [x] Shop Settings
  - [x] Update general shop settings (mail, inventory, digital products, etc.)
- [x] Channels
  - [x] Create and update channels with full settings (payment, stock, order, checkout)
- [x] Attributes
  - [x] Create attributes of all types (text, dropdown, multiselect, boolean, numeric, date, reference, etc.)
- [x] Product Types
  - [x] Create product types with assigned attributes
- [x] Page Types
  - [x] Create page types with assigned attributes
- [x] Categories
  - [x] Create categories with nested subcategories hierarchy
- [x] Warehouses
  - [x] Create warehouses with full address details
- [x] Collections
  - [x] Create collections with channel assignments
- [x] Products
  - [x] Create products with attributes and channel listings
  - [x] Create product variants with pricing and inventory
  - [x] Manage stock levels per variant per warehouse
- [x] Reading the configuration from YAML file

Not yet supported:
- [x] Shipping zones and methods
- [x] Tax configuration
- [x] Discounts and vouchers
- [ ] Gift cards
- [ ] Menus and navigation
- [ ] Pages
- [ ] Translations

### `pnpm pull`

Retrieves the configuration from the Saleor instance and saves it to a file under the given path.

#### Options

- `--url` (required): The URL of the Saleor instance
- `--token` (required): App token with necessary permissions  
- `--config` (optional): Path to configuration file (defaults to `config.yml`)

#### Usage

```bash
# Basic usage
pnpm pull --url="https://your-store.saleor.cloud/graphql/" --token="your-app-token"

# With custom config file
pnpm pull --url="https://your-store.saleor.cloud/graphql/" --token="your-app-token" --config="backup.yml"
```

Currently, it supports:

- [x] Fetching channels
- [x] Saving config to config.yml file
- [x] Fetching product types
- [x] Fetching page types
- [x] Fetching attributes

### Limitations

- Configurator fetches first 100 items from all paginated queries.
