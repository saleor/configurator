# Shopify Export Format

## Structure

Shopify uses **row-per-variant** format where products with variants span multiple rows.

### Key Columns

| Column | Purpose |
|--------|---------|
| Handle | Product identifier (groups variants) |
| Title | Product name (first row only) |
| Body (HTML) | Description |
| Type | Product type |
| Vendor | Brand/manufacturer |
| Tags | Comma-separated tags |
| Option1 Name/Value | First variant attribute |
| Option2 Name/Value | Second variant attribute |
| Option3 Name/Value | Third variant attribute |
| Variant SKU | SKU |
| Variant Price | Price |
| Variant Inventory Qty | Stock |
| Image Src | Product image URL |

## Variant Grouping

```csv
Handle,Title,Option1 Name,Option1 Value,Variant SKU,Variant Price
blue-shirt,Blue Shirt,Size,S,BS-S,29.99
blue-shirt,,Size,M,BS-M,29.99
blue-shirt,,Size,L,BS-L,29.99
```

- Same Handle = same product
- First row has Title, Description
- Each row = one variant

## Mapping to Saleor

| Shopify | Saleor |
|---------|--------|
| Handle | product.slug |
| Title | product.name |
| Body (HTML) | product.description |
| Type | productType.name |
| Variant SKU | variant.sku |
| Variant Price | variant.channelListings[].price |
| Variant Inventory Qty | variant.stocks[].quantity |
| Option[N] Value | variant.attributes |
| Tags | collections (optional) |

## Special Cases

### Default Title
Single-variant products have `Option1 Value = "Default Title"`. Skip variant attributes for these.

### Empty Fields
Only first row per Handle has product-level fields. Subsequent rows only have variant data.

### Image Handling
`Image Src` contains URLs. Store as `product.media[].url`.
