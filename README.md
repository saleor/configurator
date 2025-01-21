# Configurator

> [!WARNING]
> This project is in early development. Please use with caution.

Configurator is a tool that helps you automate the creation of data models in Saleor. Instead of, for example, manually creating product types and attributes, you can define them in a configuration file and let the tool do the rest.

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

- `APP_TOKEN`: An app token with the necessary permissions to create the data models.
- `SALEOR_API_URL`: The URL of the Saleor instance you want to use.

### Commands

#### `bun run configure`

Reads the configuration file and create the data models in Saleor.

Currently, it supports:

- [x] Creating product types with attributes
- [ ] Creating channels
- [ ] Creating channels with warehouses
- [ ] Creating channels with warehouses and shipping zones
- [ ] Creating products
- [ ] Creating products with variants
- [ ] Creating discounts
