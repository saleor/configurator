# Data Transformations

## Text

### Slug generation
```bash
echo "Blue Widget (Large)" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9 -]//g' | tr ' ' '-' | sed 's/-\+/-/g'
# → blue-widget-large
```

### Name cleaning
Trim whitespace, collapse multiple spaces, preserve case.

### HTML stripping
Remove tags for plain text, or keep for rich text fields.

## Numbers

### Price formats
| Input | Output |
|-------|--------|
| `29.99` | 29.99 |
| `$29.99` | 29.99 |
| `29,99` | 29.99 |
| `1,299.00` | 1299.00 |
| `€1.299,00` | 1299.00 |

### Quantity
Round decimals, treat negatives as 0, empty = 0.

### Weight
Convert to grams if unit specified (kg×1000, lb×454, oz×28).

## Categories

### Path parsing
```
"Home > Kitchen > Appliances" → nested hierarchy
"Home/Kitchen" → nested hierarchy
"Kitchen" → single level
```

Detect separator: ` > `, `/`, `::`, `|`

## Variant Grouping

When multiple rows share same product identifier:
```
Row 1: product=Shirt, sku=S-S, size=S
Row 2: product=Shirt, sku=S-M, size=M
→ One product, two variants
```

## Output Structure

```yaml
productTypes:
  - name: "[type]"
    isShippingRequired: [bool]
    productAttributes: [unmapped cols as attributes]

categories:
  - name: "[category]"
    slug: "[generated]"

products:
  - name: "[name]"
    slug: "[generated]"
    productType: "[ref]"
    variants:
      - sku: "[sku]"
        attributes: {[key]: [value]}
        channelListings:
          - channel: "[channel]"
            price: [price]
        stocks:
          - warehouse: "[warehouse]"
            quantity: [qty]
```
