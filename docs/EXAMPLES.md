# Examples

Essential configuration examples for the Saleor Configurator. For detailed syntax, see [COMMANDS.md](COMMANDS.md).

## Basic Store Configuration

```yaml
# config.yml - Minimal working configuration
shop:
  defaultMailSenderName: "My Store"
  defaultMailSenderAddress: "noreply@example.com"
  displayGrossPrices: true

channels:
  - name: "United States"
    slug: "us"
    currencyCode: "USD"
    defaultCountry: "US"
    isActive: true
```

## Multi-Channel E-commerce

```yaml
# config.yml - Multi-region setup
channels:
  - name: "United States"
    slug: "us"
    currencyCode: "USD"
    defaultCountry: "US"
    isActive: true
  
  - name: "European Union"
    slug: "eu"
    currencyCode: "EUR"
    defaultCountry: "DE"
    isActive: true
  
  - name: "United Kingdom"
    slug: "uk"
    currencyCode: "GBP"
    defaultCountry: "GB"
    isActive: true
```

## Product Types with Attributes

```yaml
# Reusable attributes pattern
pageTypes:
  - name: "Blog Post"
    attributes:
      - name: "Published Date"  # Define once
        inputType: "DATE"
  
  - name: "Article"
    attributes:
      - attribute: "Published Date"  # Reuse existing

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
          - name: "Science"
    variantAttributes:
      - name: "Format"
        inputType: "DROPDOWN"
        values:
          - name: "Hardcover"
          - name: "Paperback"
          - name: "E-book"
```

## Category Hierarchy

```yaml
categories:
  - name: "Electronics"
    slug: "electronics"
    subcategories:
      - name: "Computers"
        slug: "computers"
        subcategories:
          - name: "Laptops"
            slug: "laptops"
          - name: "Desktops"
            slug: "desktops"
      - name: "Audio"
        slug: "audio"
```

## Tax Configuration

```yaml
taxClasses:
  - name: "Standard Rate"
    countries:
      - countryCode: "US"
        taxRate: 10
      - countryCode: "GB"
        taxRate: 20
      - countryCode: "DE"
        taxRate: 19
  
  - name: "Reduced Rate"
    countries:
      - countryCode: "US"
        taxRate: 5
      - countryCode: "GB"
        taxRate: 5
      - countryCode: "DE"
        taxRate: 7
```

## Complete Working Example

See [example.yml](../example.yml) in the root directory for a comprehensive configuration example.

## Testing Your Configuration

```bash
# 1. Validate configuration locally
cat config.yml | yaml-lint

# 2. Preview changes
pnpm dlx @saleor/configurator diff \
  --url https://your-store.saleor.cloud/graphql/ \
  --token your-token

# 3. Deploy with confidence
pnpm dlx @saleor/configurator deploy \
  --url https://your-store.saleor.cloud/graphql/ \
  --token your-token

# 4. Verify idempotency (should show no changes)
pnpm dlx @saleor/configurator deploy \
  --url https://your-store.saleor.cloud/graphql/ \
  --token your-token
```

## See Also

- [COMMANDS.md](COMMANDS.md) - Complete CLI reference
- [ENTITY_REFERENCE.md](ENTITY_REFERENCE.md) - Entity identification patterns
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and solutions