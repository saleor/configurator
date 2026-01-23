---
description: Interactive menu for modifying existing Saleor store configurations
allowed-tools: Read, Write, Edit, AskUserQuestion, Grep, Glob
argument-hint: [entity-type]
---

# Configurator Edit

You are helping the user modify their existing Saleor store configuration. This command provides a menu-driven interface for common modifications.

## Prerequisites Check

First, verify config.yml exists:

```bash
test -f config.yml && echo "CONFIG_EXISTS" || echo "NO_CONFIG"
```

If no config exists, suggest running `/configurator-setup` first.

## Main Menu

Present the user with modification options using AskUserQuestion:

**Question**: "What would you like to modify?"
**Options**:
- Add new entity (product type, category, product, etc.)
- Modify existing entity
- Remove entity
- View current configuration summary
- Validate configuration

## Entity Operations

### Add New Entity

**Question**: "What type of entity do you want to add?"
**Options**:
- Channel
- Product Type
- Category
- Collection
- Product
- Attribute
- Shipping Zone
- Warehouse
- Tax Class
- Menu
- Page

Based on selection, guide through required fields:

#### Adding a Channel

Required information:
1. Display name (e.g., "EU Store")
2. Slug (auto-generate from name, allow override)
3. Currency code (USD, EUR, GBP, etc.)
4. Default country (US, DE, GB, etc.)

Generate YAML:
```yaml
channels:
  - name: "[User's name]"
    slug: "[generated-slug]"
    currencyCode: [CURRENCY]
    defaultCountry: [COUNTRY]
    isActive: true
```

#### Adding a Product Type

Required information:
1. Name (unique identifier)
2. Is shipping required? (physical vs digital)
3. Product-level attributes
4. Variant-level attributes

For each attribute:
- Name
- Type (DROPDOWN, SWATCH, PLAIN_TEXT, etc.)
- Values (if applicable)

#### Adding a Category

Required information:
1. Name
2. Slug
3. Parent category (or root)
4. Description (optional)

Show existing category tree for context.

#### Adding a Product

Required information:
1. Name
2. Slug
3. Product Type (select from existing)
4. Category (select from existing)
5. Channel listings (visibility, pricing)
6. At least one variant with SKU

### Modify Existing Entity

1. Ask which entity type to modify
2. List existing entities of that type
3. Let user select which one
4. Show current values
5. Ask what to change
6. Apply modifications

### Remove Entity

1. Ask which entity type to remove
2. List existing entities
3. Confirm removal (warn about dependencies)
4. Remove from config

**Dependency warnings**:
- Removing a ProductType: Products using it will be orphaned
- Removing a Category: Child categories and product assignments affected
- Removing a Channel: All channel listings for that channel removed

## Configuration Summary

Show a summary of current config:

```
Configuration Summary
=====================
Channels: 2 (us-store, eu-store)
Product Types: 3 (T-Shirt, Pants, Accessory)
Categories: 12 (in 3-level hierarchy)
Products: 45
Collections: 5
Warehouses: 2
Shipping Zones: 3
```

## Inline Editing Tips

When modifying, use the Edit tool for surgical changes:

```python
# Example: Change a product's price
old_string: "price: 29.99"
new_string: "price: 34.99"
```

For adding new entities, append to the appropriate section.

## Validation After Changes

After any modification:
1. Validate YAML syntax
2. Check for broken references
3. Suggest running `/configurator-validate` for full validation
4. Offer to show diff with remote

## Common Modification Patterns

### Adding a new variant attribute to a product type

1. Find the product type in config.yml
2. Add to variantAttributes list
3. Update existing products to include the new attribute

### Changing product pricing

1. Find the product and variant
2. Locate channelListings
3. Update price value

### Adding a product to a collection

1. Find or create the collection
2. Add product slug to products list

### Creating a category hierarchy

1. Add parent category first
2. Add children under parent's `children` key

## Error Handling

- If entity doesn't exist, offer to create it
- If reference is invalid, list valid options
- If YAML becomes invalid, show error and rollback suggestion

## Skills to Reference

Use these skills for domain knowledge:
- `configurator-schema` for valid field values
- `saleor-domain` for entity relationships
- `configurator-cli` for deployment commands
