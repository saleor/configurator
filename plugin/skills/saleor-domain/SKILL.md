---
name: saleor-domain
version: 1.0.0
description: Provides comprehensive Saleor e-commerce domain knowledge including entity types, relationships, identifier rules, and GraphQL patterns. This skill should be invoked when the user needs to understand Saleor concepts, entity relationships, the difference between product-level and variant-level attributes, or how channels, warehouses, and shipping zones interact. Essential for understanding how Configurator maps to Saleor's data model.
allowed-tools: Read, WebFetch
---

# Saleor Domain Knowledge

Saleor is a headless e-commerce platform built with Python/Django and GraphQL. This skill provides essential domain knowledge for configuring Saleor stores.

## Core Entities

### Channel

Channels represent sales channels (storefronts, marketplaces, regions). Each channel has its own:
- Currency
- Default country
- Product visibility and pricing
- Checkout and order settings

```yaml
channels:
  - name: "US Store"
    slug: "us-store"
    currencyCode: USD
    defaultCountry: US
```

### Product Type

Defines the structure of a product category with:
- Product-level attributes (shared across variants)
- Variant-level attributes (differ per variant)
- Shipping requirements
- Tax class

```yaml
productTypes:
  - name: "T-Shirt"
    isShippingRequired: true
    productAttributes:
      - name: "Brand"
    variantAttributes:
      - name: "Size"
      - name: "Color"
```

### Product & Variant

Products are the items you sell. Each product:
- Belongs to one product type
- Can be in multiple categories
- Has one or more variants (SKUs)

Variants represent purchasable items with:
- Unique SKU
- Specific attribute values
- Channel-specific pricing
- Inventory tracking

### Attribute

Attributes define product/variant characteristics:

| Attribute Level | Description | Example |
|----------------|-------------|---------|
| **Product** | Same for all variants | Brand, Material |
| **Variant** | Differs per variant | Size, Color |

### Category

Hierarchical product organization:
- Tree structure with parent/child relationships
- Products belong to leaf categories
- Used for navigation and filtering

### Collection

Curated product groupings:
- Can span multiple categories
- Manual or rule-based membership
- Used for promotions, featured sections

### Warehouse

Physical or virtual inventory locations:
- Stock tracking per warehouse
- Shipping zone associations
- Click & collect support

### Shipping Zone

Geographic shipping regions:
- Country-based targeting
- Multiple shipping methods per zone
- Rate calculation rules

## Entity Relationships

```
Channel ─────────────────────────────────────────────┐
    │                                                │
    ├── Product Listings (visibility, pricing)       │
    ├── Variant Listings (price, availability)       │
    └── Checkout/Order settings                      │
                                                     │
ProductType ─────────────────────────────────────────┤
    │                                                │
    ├── productAttributes ──► Attribute              │
    ├── variantAttributes ──► Attribute              │
    └── taxClass ──► TaxClass                        │
                                                     │
Product ─────────────────────────────────────────────┤
    │                                                │
    ├── productType ──► ProductType                  │
    ├── category ──► Category                        │
    ├── collections ──► Collection[]                 │
    └── variants ──► ProductVariant[]                │
                     │                               │
                     ├── warehouse ──► Warehouse     │
                     └── channelListings ────────────┘

Category (tree structure)
    └── children ──► Category[]

ShippingZone
    └── warehouses ──► Warehouse[]
```

## Identifier Rules

Understanding which field identifies each entity:

| Entity | Identifier | Mutable? |
|--------|------------|----------|
| Channel | `slug` | No - creates new |
| Category | `slug` | No - creates new |
| Collection | `slug` | No - creates new |
| Product | `slug` | No - creates new |
| Warehouse | `slug` | No - creates new |
| Menu | `slug` | No - creates new |
| Page | `slug` | No - creates new |
| ProductType | `name` | No - creates new |
| PageType | `name` | No - creates new |
| Attribute | `name` | No - creates new |
| TaxClass | `name` | No - creates new |
| ShippingZone | `name` | No - creates new |

**Important**: Changing an identifier creates a new entity and may orphan the old one.

## GraphQL API

Saleor uses GraphQL for all operations:

### Common Query Patterns

```graphql
# Fetch products with variants
query {
  products(first: 10, channel: "us-store") {
    edges {
      node {
        name
        slug
        variants {
          sku
          pricing {
            price { gross { amount } }
          }
        }
      }
    }
  }
}
```

### Mutation Patterns

```graphql
# Create a product
mutation {
  productCreate(input: {
    name: "New Product"
    slug: "new-product"
    productType: "product-type-id"
  }) {
    product { id }
    errors { field message }
  }
}
```

## Configuration vs Runtime

| Aspect | Configurator Handles | Runtime Only |
|--------|---------------------|--------------|
| Product structure | ✓ | |
| Product pricing | ✓ | |
| Categories | ✓ | |
| Attributes | ✓ | |
| Channels | ✓ | |
| Warehouses | ✓ | |
| Orders | | ✓ |
| Customers | | ✓ |
| Checkouts | | ✓ |
| Payments | | ✓ |

## Saleor MCP Integration

When Saleor MCP is available, you can query live store data:

```bash
# Check if Saleor MCP is configured
# Look for SALEOR_API_URL and SALEOR_TOKEN environment variables
```

Use Saleor MCP for:
- Validating configuration against live data
- Discovering existing entity IDs
- Checking deployment results

## Context7 for Documentation

For up-to-date Saleor documentation, use Context7 MCP:

```bash
# Fetch latest Saleor docs
# Context7 sources: docs.saleor.io, saleor/saleor repo
```

## See Also

- For entity reference, see [reference/entities.md](reference/entities.md)
- For relationship diagrams, see [reference/relationships.md](reference/relationships.md)
- For Storefront v26 integration, see [reference/storefront-v26.md](reference/storefront-v26.md)

### Related Skills

- **`configurator-schema`** - Config.yml structure and validation rules
- **`product-modeling`** - Product type design and attribute selection
- **`configurator-cli`** - CLI commands for deploying configurations
