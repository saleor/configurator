---
name: configurator-schema
version: 2.0.0
description: "Config.yml schema, entity structure, and validation rules. Use whenever writing, reading, or validating any part of config.yml, or when asking about YAML format, required fields, entity identification, or config validation errors. Do NOT use for general YAML questions unrelated to Saleor Configurator."
allowed-tools: Read, Grep, Glob
license: MIT
compatibility: "Claude Code or Claude.ai. Requires @saleor/configurator CLI installed."
---

# Configurator Schema

## Overview

Your store configuration lives in a single `config.yml` file. Each section defines a type of entity (channels, products, categories, etc.) using a declarative YAML format that Configurator syncs with your Saleor instance.

## When to Use

- "What does config.yml look like?"
- "What fields are required for a product/channel/category?"
- "Why is my config failing validation?"
- "What's the difference between slug-based and name-based entities?"
- "How do I reference one entity from another?"
- When NOT designing product types or choosing attributes -- use `product-modeling` instead

## Schema Concepts

Treat `config.yml` as four conceptual groups instead of memorizing a long top-level key list:

1. **Store foundations**: `shop`, `channels`
2. **Catalog model**: `productAttributes`, `contentAttributes`, `productTypes`, `modelTypes`/`pageTypes`
3. **Catalog data**: categories/collections/products/models
4. **Operations**: warehouses/shipping/tax/menus

The exact allowed fields evolve over time. For authoritative validation, always run:

```bash
npx configurator validate --config config.yml --json
```

## Entity Identification

Configurator matches your local config to remote entities using an identifier field. This is either `slug` or `name` depending on entity type:

| Identifier | Entity Types |
|------------|-------------|
| **slug** | channels, categories, collections, products, warehouses, menus, models |
| **name** | productTypes, modelTypes/pageTypes, taxClasses, shippingZones |

**Important**: Changing a slug or name creates a NEW entity instead of updating the existing one.

## Minimal Pattern

```yaml
channels:
  - name: "Main Store"
    slug: "main"
    currencyCode: USD
    defaultCountry: US

productAttributes:
  - name: "Brand"
    inputType: PLAIN_TEXT

productTypes:
  - name: "T-Shirt"
    productAttributes:
      - attribute: "Brand"

products:
  - name: "Classic Tee"
    slug: "classic-tee"
    productType: "T-Shirt"
    variants:
      - sku: "TEE-001"
        channelListings:
          - channel: "main"
            price: 29.99
```

## Attribute Types

Saleor supports these attribute input types: DROPDOWN, MULTISELECT, SWATCH, BOOLEAN, PLAIN_TEXT, RICH_TEXT, NUMERIC, DATE, DATE_TIME, FILE, REFERENCE.

For detailed guidance on choosing the right type, see the `product-modeling` skill.

## Validation Rules

1. **Required fields** -- each entity type has required fields (e.g., channels need `name`, `slug`, `currencyCode`)
2. **Unique identifiers** -- slugs/names must be unique within their entity type
3. **Valid references** -- cross-entity references must match (e.g., a product's `productType` must match a defined product type name)
4. **Currency codes** -- valid ISO 4217 (USD, EUR, GBP, etc.)
5. **Country codes** -- valid ISO 3166-1 alpha-2 (US, DE, GB, etc.)

## Dependency Concepts

You usually model in this order:

1. Foundations (`shop`, `channels`)
2. Reusable types and attributes (`productAttributes`, `contentAttributes`, `productTypes`, `modelTypes`)
3. Concrete catalog entities (`categories`, `collections`, `products`, `models`)
4. Operational entities (`warehouses`, `shippingZones`, `taxClasses`, `menus`)

Configurator handles execution order, but this mental model helps diagnose missing-reference errors.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Changing a slug or name to "rename" an entity | This creates a new entity. To rename, delete the old one and create new. |
| Duplicate slugs within an entity type | Each slug must be unique. Check for copy-paste errors. |
| Product references a nonexistent productType | The `productType` field must exactly match a `name` in your `productTypes` section. |
| Missing required fields | Check the error message -- it tells you which field is missing. |
| Products defined before their productType | Not a YAML order issue (Configurator handles order), but the referenced type must exist in the file. |

## Best Practices

1. **Use meaningful slugs** -- `womens-summer-dresses` not `cat-123`
2. **Consistent naming** -- match display names to slugs when possible
3. **Comment complex sections** -- use YAML comments for documentation
4. **Version control** -- track config.yml in git

## See Also

- For worked examples, see [references/examples.md](references/examples.md)
- For migration from legacy syntax, run `npx configurator introspect`

### Related Skills

- **`saleor-domain`** - Entity relationships and identifier rules
- **`configurator-cli`** - CLI commands for deploying configurations
- **`product-modeling`** - Product type design and attribute selection
