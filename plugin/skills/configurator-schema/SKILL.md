---
name: configurator-schema
version: 1.0.0
description: Provides detailed documentation of the Saleor Configurator config.yml schema and structure. This skill should be invoked when the user needs help with YAML configuration structure, entity schemas, validation rules, field requirements, or understanding the difference between slug-based and name-based entity identification. Covers all entity types including channels, products, categories, and attributes.
allowed-tools: Read, Grep, Glob
---

# Configurator Schema

The `config.yml` file defines your Saleor store configuration in a declarative YAML format.

## File Structure

```yaml
# config.yml - Top-level structure
shop:
  # Store-wide settings (singleton)

channels:
  # Sales channels (slug-based)

productTypes:
  # Product type definitions (name-based)

attributes:
  # Attribute definitions (name-based)

categories:
  # Category hierarchy (slug-based)

collections:
  # Product collections (slug-based)

products:
  # Product definitions (slug-based)

taxClasses:
  # Tax classifications (name-based)

shippingZones:
  # Shipping zone definitions (name-based)

warehouses:
  # Warehouse definitions (slug-based)

menus:
  # Navigation menus (slug-based)

pageTypes:
  # Page type definitions (name-based)

pages:
  # Content pages (slug-based)
```

## Entity Identification

Entities are identified by either `slug` or `name`:

| Identifier | Entity Types |
|------------|-------------|
| **slug** | channels, categories, collections, products, warehouses, menus, pages |
| **name** | productTypes, pageTypes, attributes, taxClasses, shippingZones |

**Important**: The identifier field is how Configurator matches local config to remote entities. Changing a slug/name creates a new entity.

## Common Entity Patterns

### Channel (slug-based)

```yaml
channels:
  - name: "US Store"
    slug: "us-store"
    currencyCode: USD
    defaultCountry: US
    isActive: true
```

### Product Type (name-based)

```yaml
productTypes:
  - name: "T-Shirt"
    isShippingRequired: true
    productAttributes:
      - name: "Brand"
        type: DROPDOWN
        values:
          - name: "Nike"
          - name: "Adidas"
    variantAttributes:
      - name: "Size"
        type: DROPDOWN
        values:
          - name: "S"
          - name: "M"
          - name: "L"
      - name: "Color"
        type: SWATCH
```

### Category (slug-based, hierarchical)

```yaml
categories:
  - name: "Electronics"
    slug: "electronics"
    children:
      - name: "Phones"
        slug: "phones"
      - name: "Laptops"
        slug: "laptops"
```

### Attribute (name-based)

```yaml
attributes:
  - name: "Color"
    type: SWATCH
    inputType: DROPDOWN
    valueRequired: true
    values:
      - name: "Red"
        value: "#FF0000"
      - name: "Blue"
        value: "#0000FF"
```

### Product (slug-based)

```yaml
products:
  - name: "Classic T-Shirt"
    slug: "classic-t-shirt"
    productType: "T-Shirt"
    category: "clothing/t-shirts"
    description: "A comfortable cotton t-shirt"
    channelListings:
      - channel: "us-store"
        isPublished: true
        isAvailableForPurchase: true
        visibleInListings: true
    variants:
      - sku: "TSHIRT-S-RED"
        attributes:
          Size: "S"
          Color: "Red"
        channelListings:
          - channel: "us-store"
            price: 29.99
```

## Attribute Types

| Type | Description | Example Use |
|------|-------------|-------------|
| DROPDOWN | Single-select from predefined values | Size, Brand |
| MULTISELECT | Multi-select from predefined values | Features, Tags |
| RICH_TEXT | Formatted text content | Description |
| PLAIN_TEXT | Simple text input | SKU prefix |
| NUMERIC | Number values | Weight, Rating |
| BOOLEAN | True/false toggle | Is Featured |
| DATE | Date picker | Release Date |
| DATE_TIME | Date and time picker | Event Time |
| SWATCH | Color/pattern swatch | Color |
| FILE | File upload | Manual PDF |
| REFERENCE | Reference to another entity | Related Products |

## Validation Rules

1. **Required fields**: Each entity type has required fields (e.g., channels need `name`, `slug`, `currencyCode`)

2. **Unique identifiers**: Slugs/names must be unique within their entity type

3. **Valid references**: References to other entities must exist (e.g., product's `productType` must match a defined product type name)

4. **Currency codes**: Must be valid ISO 4217 codes (USD, EUR, GBP, etc.)

5. **Country codes**: Must be valid ISO 3166-1 alpha-2 codes (US, DE, GB, etc.)

## Entity Dependencies

Entities must be defined in dependency order:

```
Level 0 (Independent):
  shop, channels, productTypes, pageTypes, taxClasses, shippingZones

Level 1 (Depends on Level 0):
  categories, warehouses, attributes

Level 2 (Depends on Level 1):
  collections, pages

Level 3 (Depends on Level 2):
  products, menus
```

**Deploy order**: Configurator automatically handles deployment order, but understanding dependencies helps when troubleshooting validation errors.

## Best Practices

1. **Use meaningful slugs**: `womens-summer-dresses` not `cat-123`
2. **Consistent naming**: Match display names to slugs when possible
3. **Comment complex sections**: Use YAML comments for documentation
4. **Version control**: Track config.yml in git
5. **Environment-specific configs**: Use separate files for staging/production

## See Also

- For complete schema documentation, see [reference/schema.md](reference/schema.md)
- For example configurations, see [reference/examples.md](reference/examples.md)

### Related Skills

- **`saleor-domain`** - Entity relationships and identifier rules
- **`configurator-cli`** - CLI commands for deploying configurations
- **`product-modeling`** - Product type design and attribute selection
