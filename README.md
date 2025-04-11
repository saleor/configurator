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

## Development

### Installing dependencies

```bash
pnpm install
```

This will install the dependencies and fetch the Saleor schema needed for [gql.tada](https://gql-tada.0no.co/) to generate the types.

### Environment variables

```bash
cp .env.example .env
```

This will create a `.env` file. Here are the variables you need to set:

- `APP_TOKEN`: An app token with the necessary permissions to create the data models. You can create one by going to _Configuration_ → _Webhooks & Events_ in the Saleor dashboard.
- `SALEOR_API_URL`: The URL of the Saleor instance you want to use.

### Commands

#### `pnpm bootstrap`

Reads the configuration file and create the data models in Saleor.

Currently, it supports:

- [x] Creating attributes
- [x] Creating product types with attributes
- [x] Creating page types with attributes
- [x] Creating channels
- [x] Reading the configuration from config.yml file
- [x] Creating and updating channels with settings (payment, stock, order, checkout)
- [x] Updating shop settings
- [ ] Creating channels with warehouses
- [ ] Creating channels with warehouses and shipping zones
- [ ] Creating products
- [ ] Creating products with variants
- [ ] Creating discounts
- [ ] Categories
  - [x] Creating categories
  - [x] Creating categories with subcategories
  - [ ] Creating categories with products
- [ ] Collections
  - [ ] Creating collections
  - [ ] Creating collections with products

#### `pnpm retrieve`

Retrieves the configuration from the Saleor instance and saves it to a file.

Currently, it supports:

- [x] Fetching channels
- [x] Saving config to config.yml file
- [x] Fetching product types
- [x] Fetching page types
- [x] Fetching attributes

### Limitations

- Configurator fetches first 100 items from all paginated queries.
