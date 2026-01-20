---
name: data-importer
description: Transform external product data into Saleor config.yml. Handles CSV, Excel, Shopify, and unknown formats through interactive mapping. Use when user mentions "import", "migrate", "convert", "upload products", or has external product data.
allowed-tools: Bash, Read, Write, Edit, AskUserQuestion, Glob
---

# Data Importer

Transform product data from any source into Saleor's config.yml format.

## Core Workflow

1. **Detect format** - CSV, Excel, JSON, or unknown
2. **Extract columns** - Read headers and sample data
3. **Map interactively** - User confirms field mappings
4. **Transform** - Convert to Saleor schema
5. **Validate** - Check for issues before output

## File Handling

### Excel (.xlsx)
Excel files need conversion. Ask user to export as CSV from Excel/Sheets, or attempt:
```bash
python3 -c "import pandas as pd; pd.read_excel('$FILE').to_csv('${FILE%.xlsx}.csv', index=False)"
```

### CSV
Read directly:
```bash
head -1 "$FILE"  # Headers
head -5 "$FILE"  # Sample rows
```

## Field Mapping Strategy

**Don't assume column names.** Instead:
1. Show user all columns with sample values
2. Ask which column maps to each Saleor field
3. Mark unmapped columns as potential attributes

### Required Saleor Fields

| Field | Source Options |
|-------|----------------|
| `product.name` | Any "name", "title", or descriptive column |
| `product.slug` | Generate from name, or use ID/handle column |
| `variant.sku` | Any unique ID column (SKU, External ID, Code) |
| `productType` | From "type" column or user-specified |

### Optional Fields

| Field | Notes |
|-------|-------|
| `price` | If missing, import as catalog-only |
| `quantity` | If missing, skip stocks |
| `category` | From category/country/region column |
| `description` | If present |
| Attributes | Any unmapped columns become product attributes |

## Output Structure

```yaml
productTypes:
  - name: "[from type column or user input]"
    isShippingRequired: [ask user]
    productAttributes: [unmapped columns]

categories:
  - name: "[from category column]"
    slug: "[generated]"

products:
  - name: "[from name column]"
    slug: "[generated or from ID]"
    productType: "[reference]"
    variants:
      - sku: "[from SKU column]"
        attributes: {[mapped attributes]}
        channelListings: [if price exists]
        stocks: [if quantity exists]
```

## Handling Special Cases

### No Price Column
Import as catalog-only. User can add pricing later.

### No SKU Column
Generate from name or use any unique ID column (External ID, Product Code, etc.).

### Unknown Columns
Present to user as potential attributes. Let them decide what each represents.

### Variant Grouping
If multiple rows share same product identifier, group as variants of one product.

## Reference Files

- **`reference/csv-patterns.md`** - CSV/Excel parsing techniques
- **`reference/field-mapping.md`** - Mapping strategies for various data shapes
- **`reference/shopify-format.md`** - Shopify-specific handling
- **`reference/transformations.md`** - Data transformation rules

## Validation Checklist

Before generating output:
- [ ] All products have names
- [ ] All variants have unique SKUs
- [ ] Product type references are valid
- [ ] No duplicate slugs
