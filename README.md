# Configurator

> [!WARNING]
> This project is in early development. Please use with caution.

Configurator is a tool that helps you automate the creation of data models in Saleor. Instead of, for example, manually creating product types and attributes, you can define them in a configuration file and let the tool do the rest.

## Example

```ts
// Example configuration
configurator.bootstrap({
  productTypes: [
    {
      name: "Sweets",
      attributes: [
        {
          name: "Brand",
          inputType: "PLAIN_TEXT",
        },
        {
          name: "Flavor",
          inputType: "MULTISELECT",
          values: [
            { name: "Fiction" },
            { name: "Non-Fiction" },
            { name: "Fantasy" },
          ],
        },
        {
          name: "Sugar Content",
          inputType: "DROPDOWN",
          values: [{ name: "Low" }, { name: "Medium" }, { name: "High" }],
        },
        {
          name: "Is Organic",
          inputType: "BOOLEAN",
        },
      ],
    },
  ],
  channels: [
    {
      name: "Atlantis",
      currencyCode: "USD",
      defaultCountry: "US",
      slug: "atlantis",
    },
  ],
  pageTypes: [
    {
      name: "Blog Post",
      attributes: [
        { name: "Title", inputType: "PLAIN_TEXT" },
        { name: "Description", inputType: "PLAIN_TEXT" },
        { name: "Writer", inputType: "PLAIN_TEXT" },
        {
          name: "Tags",
          inputType: "DROPDOWN",
          values: [
            { name: "Technology" },
            { name: "Science" },
            { name: "Health" },
          ],
        },
        { name: "Published Date", inputType: "DATE" },
      ],
    },
  ],
  attributes: [
    {
      name: "Color",
      inputType: "SWATCH",
      values: [{ name: "Red" }],
      type: "PRODUCT_TYPE",
    },
  ],
});

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
- [ ] Creating channels with warehouses
- [ ] Creating channels with warehouses and shipping zones
- [ ] Creating products
- [ ] Creating products with variants
- [ ] Creating discounts
- [ ] Creating collections
- [ ] Creating collections with products
- [ ] Creating categories
- [ ] Creating categories with products
- [ ] Reading the configuration from a file

#### `bun run fetch`

Fetches the configuration from the Saleor instance and saves it to a file.

Currently, it supports:

- [x] Fetching channels
- [ ] Fetching product types
- [ ] Fetching page types
- [ ] Fetching attributes
- [ ] Saving it to a file
