# Saleor Storefront v26 Integration Guide

How to integrate your Saleor Configurator-managed store with Saleor Storefront v26.

## Overview

Saleor Storefront v26 is a modern, Next.js-based storefront that connects to your Saleor backend via GraphQL. When you configure your store with Configurator, the Storefront automatically reflects those changes.

## Configuration Connection Points

### Channels

The storefront uses channels for:
- Currency display
- Product visibility
- Pricing
- Checkout flow

**Storefront configuration** (`.env.local`):
```bash
# The channel slug from your config.yml
NEXT_PUBLIC_SALEOR_CHANNEL_SLUG=us-store
```

**In config.yml**:
```yaml
channels:
  - name: "US Store"
    slug: "us-store"  # This matches NEXT_PUBLIC_SALEOR_CHANNEL_SLUG
    currencyCode: USD
    defaultCountry: US
    isActive: true
```

### Product Types and Attributes

Product types define what attributes appear on product pages:

| Config Entity | Storefront Display |
|--------------|-------------------|
| Product attributes | Product detail page info |
| Variant attributes | Variant selectors (dropdowns, swatches) |
| Rich text attributes | Formatted content sections |

**Example**: A T-Shirt with Size and Color variant attributes will show:
- Size dropdown selector
- Color swatch selector
- Add to cart for selected variant

### Categories

Categories map to navigation and filtering:

| Config Entity | Storefront Feature |
|--------------|-------------------|
| Category hierarchy | Navigation menu |
| Category slugs | URL paths (`/category/[slug]`) |
| Category descriptions | Category page content |

**URL mapping**:
```
config.yml: categories/clothing/mens/t-shirts
Storefront: /category/clothing/mens/t-shirts
```

### Collections

Collections appear as curated product lists:

| Config Entity | Storefront Feature |
|--------------|-------------------|
| Collection slug | URL path (`/collection/[slug]`) |
| Collection products | Products displayed in collection |
| Channel listings | Visibility per channel |

### Products

Products display based on configuration:

| Config Entity | Storefront Feature |
|--------------|-------------------|
| Product slug | URL path (`/product/[slug]`) |
| Product description | Product page content |
| Channel listings | Visibility, availability |
| Variants | Purchasable options |
| Variant prices | Displayed prices |

## Storefront Environment Setup

### Required Environment Variables

```bash
# Saleor API endpoint (same as SALEOR_API_URL)
NEXT_PUBLIC_SALEOR_API_URL=https://your-store.saleor.cloud/graphql/

# Channel to use (matches config.yml channel slug)
NEXT_PUBLIC_SALEOR_CHANNEL_SLUG=us-store
```

### Optional Configuration

```bash
# Enable checkout
NEXT_PUBLIC_CHECKOUT_URL=https://your-store.saleor.cloud/checkout/

# Enable search
NEXT_PUBLIC_ALGOLIA_APP_ID=your-algolia-id
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=your-search-key
```

## Common Integration Scenarios

### Multi-Channel Setup

If you have multiple channels (e.g., US and EU stores):

**config.yml**:
```yaml
channels:
  - name: "US Store"
    slug: "us-store"
    currencyCode: USD

  - name: "EU Store"
    slug: "eu-store"
    currencyCode: EUR
```

**Storefront options**:
1. **Single deployment**: Use channel selector/switcher
2. **Multiple deployments**: Deploy separate instances with different `NEXT_PUBLIC_SALEOR_CHANNEL_SLUG`

### Category Navigation

Categories in config.yml automatically populate navigation:

**config.yml**:
```yaml
categories:
  - name: "Clothing"
    slug: "clothing"
    children:
      - name: "T-Shirts"
        slug: "t-shirts"
```

**Storefront navigation**:
```
Clothing > T-Shirts
```

The Storefront queries categories via GraphQL and builds navigation dynamically.

### Product Attributes Display

**config.yml**:
```yaml
productTypes:
  - name: "T-Shirt"
    productAttributes:
      - name: "Brand"
        type: DROPDOWN
      - name: "Material"
        type: PLAIN_TEXT
    variantAttributes:
      - name: "Size"
        type: DROPDOWN
      - name: "Color"
        type: SWATCH
```

**Storefront display**:
- Brand: Displayed in product details
- Material: Displayed in product details
- Size: Dropdown selector
- Color: Visual swatch selector

### Menus

Menus in config.yml map to storefront navigation:

**config.yml**:
```yaml
menus:
  - name: "Main Navigation"
    slug: "main-nav"
    items:
      - name: "Shop"
        category: "clothing"
      - name: "Sale"
        collection: "sale"
      - name: "About"
        page: "about-us"
```

**Storefront**:
```
[Shop] -> /category/clothing
[Sale] -> /collection/sale
[About] -> /page/about-us
```

## Troubleshooting

### Products Not Appearing

1. **Check channel listings**: Product must have `isPublished: true` for the channel
2. **Check channel activity**: Channel must be `isActive: true`
3. **Check visibility**: `visibleInListings: true` for category pages

**Debug in config.yml**:
```yaml
products:
  - name: "My Product"
    channelListings:
      - channel: "us-store"        # Must match storefront channel
        isPublished: true          # Must be true
        isAvailableForPurchase: true
        visibleInListings: true    # For category/collection pages
```

### Categories Empty

1. Verify products are assigned to category
2. Check category path is correct
3. Verify products have channel listings

### Prices Not Showing

1. Check variant channel listings have prices
2. Verify currency matches channel

**Debug**:
```yaml
variants:
  - sku: "TEST-001"
    channelListings:
      - channel: "us-store"    # Must match
        price: 29.99           # Must be set
```

### Attributes Not Displaying

1. Verify attribute is assigned to product type
2. Check attribute visibility settings
3. Verify product has attribute values set

## Best Practices

### Consistent Slugs

Use consistent slug patterns between config.yml and storefront:

```yaml
# Good - matches URL expectations
slug: "mens-t-shirts"

# Avoid - creates confusing URLs
slug: "cat_123"
```

### SEO Optimization

Configure SEO in config.yml for storefront metadata:

```yaml
products:
  - name: "Classic T-Shirt"
    seo:
      title: "Classic Cotton T-Shirt | Your Store"
      description: "Premium quality cotton t-shirt..."
```

### Image Handling

Product media in config.yml displays in storefront:

```yaml
products:
  - name: "Product"
    media:
      - url: "https://cdn.example.com/image.jpg"
        alt: "Product front view"
```

## Testing Integration

After deploying configuration:

1. **Check homepage**: Verify featured collections/products appear
2. **Check navigation**: Verify categories and menus work
3. **Check product pages**: Verify all attributes display
4. **Check checkout**: Verify pricing and availability
5. **Check multi-channel**: If applicable, verify channel switching

## Resources

- [Saleor Storefront Documentation](https://docs.saleor.io/storefront)
- [Storefront GitHub Repository](https://github.com/saleor/storefront)
- [Saleor GraphQL Playground](https://docs.saleor.io/graphql-playground)
