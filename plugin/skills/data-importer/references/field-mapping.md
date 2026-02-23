# Field Mapping Strategies

## Core Principle

**Don't assume column names exist.** Show user all columns and ask them to map.

## Required Mappings

| Saleor Field | What to Look For |
|--------------|------------------|
| `product.name` | Title, Name, Product Name, Display Name, or any descriptive column |
| `product.slug` | Handle, Slug, or generate from name |
| `variant.sku` | SKU, Code, ID, External ID, or any unique identifier |
| `productType` | Type, Product Type, Category, or ask user |

## Optional Mappings

| Saleor Field | Source Column |
|--------------|---------------|
| `price` | Price, Cost, Amount (if missing → catalog-only import) |
| `quantity` | Qty, Stock, Inventory (if missing → skip stocks) |
| `category` | Category, Department, Country, Region |
| `description` | Description, Body, Details |

## Unmapped Columns → Attributes

Columns that don't map to standard fields become product attributes:
- Vintage → Attribute
- Color → Attribute
- RE100 Possible? → Attribute
- Production Country → Category OR Attribute (ask user)

## Interactive Flow

1. Show all columns with sample values
2. Ask: "Which column is the product name?"
3. Ask: "Which column should be the SKU?"
4. Ask: "Which column determines product type?"
5. Ask: "What should we do with remaining columns?"

## Transformations

### Slug generation
```
"Blue Widget (Large)" → "blue-widget-large"
```

### Price parsing
```
"$29.99" → 29.99
"1,299.00" → 1299.00
"29,99" → 29.99 (European)
```

### Boolean values
```
"Yes", "yes", "TRUE", "1" → true
"No", "no", "FALSE", "0" → false
```

## Conflict Handling

### Duplicate SKUs
- Add suffix: ABC-001-2
- Skip duplicate
- Ask user

### Duplicate slugs
- Generate unique: blue-shirt-2
- Ask user to rename

## Validation

Before output:
- All products have names ✓
- All SKUs unique ✓
- Product type references valid ✓
