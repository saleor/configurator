# Saleor Entity Reference

Complete reference for all Saleor e-commerce entities.

## Channel

A sales channel represents a storefront, marketplace, or sales region.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Display name |
| `slug` | string | Unique identifier (URL-safe) |
| `currencyCode` | string | ISO 4217 currency code |
| `defaultCountry` | string | ISO 3166-1 country code |
| `isActive` | boolean | Channel availability |

### Relationships

- **Products**: Channel listings control product visibility and pricing
- **Orders**: Orders belong to a specific channel
- **Checkouts**: Checkouts are created in a channel context
- **Shipping**: Shipping methods have channel-specific pricing

### Use Cases

- **Multi-region**: Separate channels for US, EU, UK with local currencies
- **Multi-brand**: Different storefronts with shared inventory
- **B2B/B2C**: Wholesale vs retail pricing channels
- **Marketplace**: Channels per marketplace (Amazon, eBay)

---

## Product Type

Defines the structure and behavior of a product category.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Unique identifier |
| `isShippingRequired` | boolean | Physical product? |
| `isDigital` | boolean | Digital delivery? |
| `weight` | Weight | Default weight |
| `taxClass` | string | Tax classification |
| `productAttributes` | Attribute[] | Product-level attributes |
| `variantAttributes` | Attribute[] | Variant-level attributes |

### Attribute Assignment

- **Product Attributes**: Same value across all variants (e.g., Brand, Material)
- **Variant Attributes**: Different per variant, create SKU matrix (e.g., Size, Color)

### Examples

| Product Type | Variant Attributes | Product Attributes |
|--------------|-------------------|-------------------|
| T-Shirt | Size, Color | Brand, Material |
| Laptop | RAM, Storage | Brand, Screen Size |
| Book | Format (Hardcover/Paperback) | Author, Publisher |
| Gift Card | Denomination | Design |

---

## Attribute

Describes product characteristics for filtering, display, and variants.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Unique identifier |
| `slug` | string | URL-safe identifier |
| `type` | enum | PRODUCT_TYPE or PAGE_TYPE |
| `inputType` | enum | UI input type |
| `valueRequired` | boolean | Mandatory? |
| `visibleInStorefront` | boolean | Show to customers |
| `filterableInStorefront` | boolean | Enable filtering |
| `filterableInDashboard` | boolean | Admin filtering |

### Input Types

| Type | Description | Example |
|------|-------------|---------|
| `DROPDOWN` | Single select | Size, Brand |
| `MULTISELECT` | Multiple select | Features, Tags |
| `SWATCH` | Color picker | Color |
| `BOOLEAN` | Toggle | Featured, On Sale |
| `NUMERIC` | Number | Weight, Rating |
| `RICH_TEXT` | HTML editor | Description |
| `PLAIN_TEXT` | Text input | SKU Prefix |
| `DATE` | Date picker | Release Date |
| `DATE_TIME` | DateTime picker | Event Time |
| `FILE` | File upload | Manual, Spec Sheet |
| `REFERENCE` | Entity reference | Related Products |

### Best Practices

- Use `DROPDOWN` for predefined options
- Use `SWATCH` for colors with visual representation
- Use `MULTISELECT` for features/tags
- Keep attribute names consistent across product types

---

## Category

Hierarchical product organization for navigation and filtering.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Display name |
| `slug` | string | Unique identifier |
| `description` | string | Category description |
| `backgroundImage` | Image | Category image |
| `seo` | SEO | Meta title/description |
| `children` | Category[] | Nested categories |

### Hierarchy Rules

- Maximum recommended depth: 4 levels
- Products typically assigned to leaf categories
- Parent categories aggregate child products

### Example Structure

```
Electronics (level 1)
├── Computers (level 2)
│   ├── Laptops (level 3)
│   │   ├── Gaming Laptops (level 4)
│   │   └── Business Laptops (level 4)
│   └── Desktops (level 3)
└── Phones (level 2)
    └── Smartphones (level 3)
```

---

## Product

A sellable item with variants.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Display name |
| `slug` | string | Unique identifier |
| `productType` | string | Product type reference |
| `category` | string | Category path |
| `description` | string | Product description |
| `seo` | SEO | Meta title/description |
| `weight` | Weight | Product weight |
| `media` | Media[] | Images/videos |
| `channelListings` | ChannelListing[] | Channel availability |
| `variants` | Variant[] | Product variants |

### Channel Listing

Controls per-channel visibility and availability:
- `isPublished`: Product visible in storefront
- `visibleInListings`: Appears in category/collection pages
- `isAvailableForPurchase`: Can be added to cart
- `publicationDate`: Scheduled publishing

---

## Product Variant

A purchasable SKU with specific attribute values.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Variant name |
| `sku` | string | Unique stock keeping unit |
| `trackInventory` | boolean | Track stock levels |
| `weight` | Weight | Variant weight |
| `attributes` | Object | Attribute name-value pairs |
| `channelListings` | ChannelListing[] | Pricing per channel |
| `stocks` | Stock[] | Warehouse stock levels |

### SKU Conventions

Good SKU patterns:
- `{PRODUCT}-{SIZE}-{COLOR}`: `TSHIRT-L-BLK`
- `{CATEGORY}-{PRODUCT}-{VARIANT}`: `APP-TS001-LB`
- `{BRAND}-{STYLE}-{SIZE}{COLOR}`: `NIKE-RUN-42BL`

---

## Collection

Curated product groupings independent of categories.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Display name |
| `slug` | string | Unique identifier |
| `description` | string | Collection description |
| `backgroundImage` | Image | Collection image |
| `seo` | SEO | Meta title/description |
| `products` | string[] | Product slugs |
| `channelListings` | ChannelListing[] | Channel visibility |

### Use Cases

- **Promotions**: "Summer Sale", "Black Friday Deals"
- **Curated**: "Staff Picks", "Best Sellers"
- **Seasonal**: "Spring Collection", "Holiday Gifts"
- **Featured**: "New Arrivals", "Featured Products"

---

## Warehouse

Physical or virtual inventory location.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Display name |
| `slug` | string | Unique identifier |
| `email` | string | Contact email |
| `isPrivate` | boolean | Hide from customers |
| `clickAndCollectOption` | enum | Pickup availability |
| `address` | Address | Physical location |
| `shippingZones` | string[] | Associated zones |

### Click & Collect Options

- `DISABLED`: No pickup
- `LOCAL`: Pickup at this warehouse only
- `ALL`: Pickup available for all local orders

---

## Shipping Zone

Geographic region with shipping methods.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Unique identifier |
| `countries` | string[] | Country codes |
| `warehouses` | string[] | Source warehouses |
| `shippingMethods` | Method[] | Available methods |

### Shipping Method Types

- **PRICE**: Rate based on order total
- **WEIGHT**: Rate based on order weight

---

## Tax Class

Tax classification for products.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Unique identifier |
| `countries` | TaxRate[] | Country-specific rates |

### Common Tax Classes

- **Standard Rate**: Default VAT/sales tax
- **Reduced Rate**: Lower rate for essentials
- **Zero Rate**: Tax-exempt items
- **Exempt**: Not subject to tax

---

## Menu

Navigation structure for storefront.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Display name |
| `slug` | string | Unique identifier |
| `items` | MenuItem[] | Navigation items |

### Menu Item Types

- **Category**: Links to category page
- **Collection**: Links to collection page
- **Page**: Links to content page
- **URL**: External link

---

## Page Type

Template for content pages.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Unique identifier |
| `attributes` | Attribute[] | Page attributes |

### Common Page Types

- **Standard Page**: Basic content pages
- **FAQ**: Q&A format
- **Contact**: Contact information
- **Policy**: Legal documents

---

## Page

Content page for static content.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `title` | string | Page title |
| `slug` | string | Unique identifier |
| `pageType` | string | Page type reference |
| `content` | string | Page content (rich text) |
| `seo` | SEO | Meta title/description |
| `isPublished` | boolean | Visibility |
