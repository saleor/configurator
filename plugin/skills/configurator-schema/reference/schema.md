# Configuration Schema Reference

Complete schema documentation for `config.yml`.

## Top-Level Structure

```yaml
# config.yml schema
shop: ShopSettings           # Optional - store-wide settings
channels: Channel[]          # Required - at least one channel
productTypes: ProductType[]  # Optional - product type definitions
pageTypes: PageType[]        # Optional - page type definitions
attributes: Attribute[]      # Optional - attribute definitions
categories: Category[]       # Optional - category hierarchy
collections: Collection[]    # Optional - product collections
products: Product[]          # Optional - product catalog
taxClasses: TaxClass[]       # Optional - tax classifications
shippingZones: ShippingZone[] # Optional - shipping zones
warehouses: Warehouse[]      # Optional - warehouse locations
menus: Menu[]                # Optional - navigation menus
pages: Page[]                # Optional - content pages
```

---

## Shop Settings

```yaml
shop:
  name: string                    # Store name
  description: string             # Store description
  trackInventoryByDefault: boolean # Default inventory tracking
  fulfillmentAutoApprove: boolean # Auto-approve fulfillment
  fulfillmentAllowUnpaid: boolean # Allow unpaid fulfillment
```

---

## Channel

```yaml
channels:
  - name: string              # Required - display name
    slug: string              # Required - unique identifier
    currencyCode: CurrencyCode # Required - ISO 4217 (USD, EUR, etc.)
    defaultCountry: CountryCode # Required - ISO 3166-1 (US, DE, etc.)
    isActive: boolean         # Optional - channel status (default: true)
    stockSettings:            # Optional - stock configuration
      allocationStrategy: PRIORITIZE_HIGH_STOCK | PRIORITIZE_SORTING_ORDER
    orderSettings:            # Optional - order configuration
      automaticallyConfirmAllNewOrders: boolean
      automaticallyFulfillNonShippableGiftCard: boolean
      expireOrdersAfter: number # minutes
      markAsPaidStrategy: PAYMENT_FLOW | TRANSACTION_FLOW
```

**Example**:
```yaml
channels:
  - name: "United States Store"
    slug: "us-store"
    currencyCode: USD
    defaultCountry: US
    isActive: true
    stockSettings:
      allocationStrategy: PRIORITIZE_HIGH_STOCK
```

---

## Product Type

```yaml
productTypes:
  - name: string              # Required - unique identifier
    slug: string              # Optional - auto-generated from name
    isShippingRequired: boolean # Required - physical product?
    isDigital: boolean        # Optional - digital product
    weight: Weight            # Optional - default weight
    taxClass: string          # Optional - reference to TaxClass.name
    productAttributes:        # Optional - product-level attributes
      - AttributeAssignment
    variantAttributes:        # Optional - variant-level attributes
      - AttributeAssignment
```

**AttributeAssignment**:
```yaml
attributeAssignment:
  name: string                # Reference to Attribute.name
  type: AttributeType         # DROPDOWN, MULTISELECT, etc.
  values:                     # Optional - predefined values
    - AttributeValue
```

**Example**:
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
          - name: "XL"
      - name: "Color"
        type: SWATCH
```

---

## Attribute

```yaml
attributes:
  - name: string              # Required - unique identifier
    slug: string              # Optional - auto-generated
    type: AttributeType       # Required - see Attribute Types
    inputType: AttributeInputType # Required - see Input Types
    valueRequired: boolean    # Optional - require value
    visibleInStorefront: boolean # Optional - show to customers
    filterableInStorefront: boolean # Optional - enable filtering
    filterableInDashboard: boolean # Optional - enable in admin
    availableInGrid: boolean  # Optional - show in product grid
    storefrontSearchPosition: number # Optional - search weight
    values:                   # Optional - predefined values
      - AttributeValue
```

**Attribute Types**:
- `PRODUCT_TYPE` - For product types
- `PAGE_TYPE` - For page types

**Input Types**:
- `DROPDOWN` - Single select dropdown
- `MULTISELECT` - Multi-select checkboxes
- `FILE` - File upload
- `REFERENCE` - Entity reference
- `NUMERIC` - Number input
- `RICH_TEXT` - Rich text editor
- `PLAIN_TEXT` - Plain text input
- `SWATCH` - Color/pattern swatch
- `BOOLEAN` - True/false toggle
- `DATE` - Date picker
- `DATE_TIME` - Date and time picker

**AttributeValue**:
```yaml
values:
  - name: string              # Required - display name
    slug: string              # Optional - auto-generated
    value: string             # Optional - for SWATCH (hex color)
    richText: string          # Optional - for RICH_TEXT
    plainText: string         # Optional - for PLAIN_TEXT
    file: FileInput           # Optional - for FILE
```

**Example**:
```yaml
attributes:
  - name: "Color"
    type: PRODUCT_TYPE
    inputType: SWATCH
    valueRequired: true
    visibleInStorefront: true
    filterableInStorefront: true
    values:
      - name: "Red"
        value: "#FF0000"
      - name: "Blue"
        value: "#0000FF"
      - name: "Green"
        value: "#00FF00"
```

---

## Category

```yaml
categories:
  - name: string              # Required - display name
    slug: string              # Required - unique identifier
    description: string       # Optional - category description
    backgroundImage: ImageInput # Optional - category image
    seo:                      # Optional - SEO metadata
      title: string
      description: string
    children:                 # Optional - nested categories
      - Category              # Recursive structure
```

**Example**:
```yaml
categories:
  - name: "Clothing"
    slug: "clothing"
    description: "All clothing items"
    children:
      - name: "Men's"
        slug: "mens"
        children:
          - name: "T-Shirts"
            slug: "mens-t-shirts"
          - name: "Pants"
            slug: "mens-pants"
      - name: "Women's"
        slug: "womens"
```

---

## Product

```yaml
products:
  - name: string              # Required - display name
    slug: string              # Required - unique identifier
    productType: string       # Required - reference to ProductType.name
    category: string          # Optional - category slug path
    description: string       # Optional - product description
    seo:                      # Optional - SEO metadata
      title: string
      description: string
    weight: Weight            # Optional - product weight
    media:                    # Optional - product images
      - MediaInput
    channelListings:          # Required - channel availability
      - ProductChannelListing
    variants:                 # Required - at least one variant
      - ProductVariant
```

**ProductChannelListing**:
```yaml
channelListings:
  - channel: string           # Required - channel slug
    isPublished: boolean      # Required - visibility
    publicationDate: string   # Optional - ISO date
    isAvailableForPurchase: boolean # Required
    availableForPurchaseDate: string # Optional - ISO date
    visibleInListings: boolean # Required - show in listings
```

**ProductVariant**:
```yaml
variants:
  - name: string              # Optional - variant name
    sku: string               # Required - unique SKU
    trackInventory: boolean   # Optional - track stock
    weight: Weight            # Optional - variant weight
    attributes:               # Required - variant attribute values
      AttributeName: AttributeValue
    channelListings:          # Required - pricing
      - VariantChannelListing
    stocks:                   # Optional - warehouse stock
      - Stock
```

**VariantChannelListing**:
```yaml
channelListings:
  - channel: string           # Required - channel slug
    price: number             # Required - price amount
    costPrice: number         # Optional - cost price
```

**Stock**:
```yaml
stocks:
  - warehouse: string         # Required - warehouse slug
    quantity: number          # Required - stock quantity
```

**Example**:
```yaml
products:
  - name: "Classic T-Shirt"
    slug: "classic-t-shirt"
    productType: "T-Shirt"
    category: "clothing/mens/t-shirts"
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
        stocks:
          - warehouse: "main"
            quantity: 100
```

---

## Collection

```yaml
collections:
  - name: string              # Required - display name
    slug: string              # Required - unique identifier
    description: string       # Optional - collection description
    backgroundImage: ImageInput # Optional - collection image
    seo:                      # Optional - SEO metadata
      title: string
      description: string
    channelListings:          # Required - visibility
      - CollectionChannelListing
    products:                 # Optional - manual product list
      - string                # Product slugs
```

---

## Warehouse

```yaml
warehouses:
  - name: string              # Required - display name
    slug: string              # Required - unique identifier
    email: string             # Optional - contact email
    isPrivate: boolean        # Optional - private warehouse
    clickAndCollectOption: DISABLED | LOCAL | ALL # Optional
    address:                  # Required - warehouse address
      streetAddress1: string
      streetAddress2: string
      city: string
      postalCode: string
      country: CountryCode
      countryArea: string
    shippingZones:            # Optional - associated zones
      - string                # ShippingZone names
```

---

## Shipping Zone

```yaml
shippingZones:
  - name: string              # Required - unique identifier
    countries:                # Required - covered countries
      - CountryCode
    warehouses:               # Optional - source warehouses
      - string                # Warehouse slugs
    shippingMethods:          # Optional - shipping methods
      - ShippingMethod
```

**ShippingMethod**:
```yaml
shippingMethods:
  - name: string              # Required - method name
    type: PRICE | WEIGHT      # Required - calculation type
    minimumOrderPrice: number # Optional - minimum order
    maximumOrderPrice: number # Optional - maximum order
    minimumOrderWeight: Weight # Optional - minimum weight
    maximumOrderWeight: Weight # Optional - maximum weight
    channelListings:          # Required - pricing
      - channel: string
        price: number
        minimumOrderPrice: number
        maximumOrderPrice: number
```

---

## Tax Class

```yaml
taxClasses:
  - name: string              # Required - unique identifier
    countries:                # Optional - country-specific rates
      - country: CountryCode
        rate: number          # Percentage (e.g., 20 for 20%)
```

---

## Menu

```yaml
menus:
  - name: string              # Required - display name
    slug: string              # Required - unique identifier
    items:                    # Optional - menu items
      - MenuItem
```

**MenuItem**:
```yaml
items:
  - name: string              # Required - item name
    url: string               # Optional - external URL
    category: string          # Optional - category slug
    collection: string        # Optional - collection slug
    page: string              # Optional - page slug
    children:                 # Optional - nested items
      - MenuItem
```

---

## Common Types

**Weight**:
```yaml
weight:
  value: number
  unit: G | KG | LB | OZ
```

**ImageInput**:
```yaml
image:
  url: string                 # External URL
  # OR
  file: string                # Local file path
  alt: string                 # Alt text
```

**CurrencyCode**: ISO 4217 codes (USD, EUR, GBP, JPY, etc.)

**CountryCode**: ISO 3166-1 alpha-2 codes (US, DE, GB, JP, etc.)
