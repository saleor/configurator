# Configurator

> [!WARNING]
> This project is in early development. Please use with caution.

Configurator is a tool that helps you automate the creation of data models in Saleor. Instead of, for example, manually creating product types and attributes, you can define them in a configuration file and let the tool do the rest.

## Example

```yaml
// Example config.yml
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
pageTypes:
  - name: Blog Post
    attributes:
      - name: Title
        inputType: PLAIN_TEXT
      - name: Description
        inputType: PLAIN_TEXT
      - name: Published Date
        inputType: DATE
```

## Development

### Installing dependencies

```bash
bun install
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

#### `bun run bootstrap`

Reads the configuration file and create the data models in Saleor.

Currently, it supports:

- [x] Creating attributes
- [x] Creating product types with attributes
- [x] Creating page types with attributes
- [x] Creating channels
- [x] Reading the configuration from config.yml file
- [ ] Creating channels with warehouses
- [ ] Creating channels with warehouses and shipping zones
- [ ] Creating products
- [ ] Creating products with variants
- [ ] Creating discounts
- [ ] Creating collections
- [ ] Creating collections with products
- [ ] Creating categories
- [ ] Creating categories with products

#### `bun run retrieve`

Retrieves the configuration from the Saleor instance and saves it to a file.

Currently, it supports:

- [x] Fetching channels
- [x] Saving config to config.yml file
- [x] Fetching product types
- [x] Fetching page types
- [x] Fetching attributes

### Limitations

- Configurator fetches first 100 items from all paginated queries.
