# Configuration Schema Reference

Complete schema documentation for `config.yml`. All field names match the Zod schemas in `src/modules/config/schema/schema.ts`.

## Top-Level Structure

```yaml
# config.yml schema — all sections are optional
shop: ShopSettings              # Store-wide settings (singleton)
channels: Channel[]             # Sales channels
productAttributes: Attribute[]  # Standalone product attributes (PRODUCT_TYPE)
contentAttributes: Attribute[]  # Standalone content attributes (PAGE_TYPE)
productTypes: ProductType[]     # Product type definitions
pageTypes: PageType[]           # Page type definitions (alias: modelTypes)
modelTypes: ModelType[]         # Model type definitions (preferred over pageTypes)
categories: Category[]          # Category hierarchy
collections: Collection[]       # Product collections
products: Product[]             # Product catalog
models: Model[]                 # Content models/pages
taxClasses: TaxClass[]          # Tax classifications
shippingZones: ShippingZone[]   # Shipping zones
warehouses: Warehouse[]         # Warehouse locations
menus: Menu[]                   # Navigation menus
```

---

## Shop Settings

```yaml
shop:
  headerText: string                          # Text displayed in the shop header
  description: string                         # Store description
  trackInventoryByDefault: boolean            # Default inventory tracking
  fulfillmentAutoApprove: boolean             # Auto-approve fulfillments
  fulfillmentAllowUnpaid: boolean             # Allow fulfillment of unpaid orders
  automaticFulfillmentDigitalProducts: boolean # Auto-fulfill digital products
  defaultWeightUnit: KG | LB | OZ | G | TONNE # Default weight unit
  defaultDigitalMaxDownloads: number | null   # Max downloads for digital products
  defaultDigitalUrlValidDays: number | null   # Days download links remain valid
  defaultMailSenderName: string | null        # Default sender name for emails
  defaultMailSenderAddress: string | null     # Default sender email address
  customerSetPasswordUrl: string              # URL for customer password setup
  reserveStockDurationAnonymousUser: number | null    # Minutes to reserve stock (anonymous)
  reserveStockDurationAuthenticatedUser: number | null # Minutes to reserve stock (logged in)
  limitQuantityPerCheckout: number            # Max quantity per checkout
  enableAccountConfirmationByEmail: boolean   # Require email confirmation
  allowLoginWithoutConfirmation: boolean      # Allow login before confirmation
  displayGrossPrices: boolean                 # Show prices including taxes
```

---

## Channel

```yaml
channels:
  - name: string                # Required — display name
    slug: string                # Required — unique identifier
    currencyCode: CurrencyCode  # Required — ISO 4217 (USD, EUR, etc.)
    defaultCountry: CountryCode # Required — ISO 3166-1 (US, DE, etc.)
    isActive: boolean           # Optional — channel status (default: false)
    settings:                   # Optional — advanced configuration
      allocationStrategy: PRIORITIZE_HIGH_STOCK | PRIORITIZE_SORTING_ORDER
      automaticallyConfirmAllNewOrders: boolean
      automaticallyFulfillNonShippableGiftCard: boolean
      expireOrdersAfter: number               # Minutes
      deleteExpiredOrdersAfter: number         # Days
      markAsPaidStrategy: TRANSACTION_FLOW | PAYMENT_FLOW
      allowUnpaidOrders: boolean
      includeDraftOrderInVoucherUsage: boolean
      useLegacyErrorFlow: boolean
      automaticallyCompleteFullyPaidCheckouts: boolean
      defaultTransactionFlowStrategy: AUTHORIZATION | CHARGE
    taxConfiguration:           # Optional — channel tax settings
      taxCalculationStrategy: FLAT_RATES | TAX_APP
      chargeTaxes: boolean
      displayGrossPrices: boolean
      pricesEnteredWithTax: boolean
      taxAppId: string          # Required when using TAX_APP strategy
```

**Example**:
```yaml
channels:
  - name: "United States Store"
    slug: "us-store"
    currencyCode: USD
    defaultCountry: US
    isActive: true
    settings:
      allocationStrategy: PRIORITIZE_HIGH_STOCK
      automaticallyConfirmAllNewOrders: true
      markAsPaidStrategy: TRANSACTION_FLOW
      defaultTransactionFlowStrategy: AUTHORIZATION
    taxConfiguration:
      taxCalculationStrategy: FLAT_RATES
      chargeTaxes: true
      displayGrossPrices: false
      pricesEnteredWithTax: false
```

---

## Product Type

```yaml
productTypes:
  - name: string                # Required — unique identifier
    isShippingRequired: boolean # Optional — physical product? (default: false)
    taxClass: string            # Optional — reference to TaxClass.name
    productAttributes:          # Optional — product-level attributes
      - AttributeInput
    variantAttributes:          # Optional — variant-level attributes
      - AttributeInput
```

**AttributeInput** — inline definition or reference:
```yaml
# Option 1: Inline attribute definition
- name: "Brand"
  inputType: DROPDOWN
  values:
    - name: "Nike"
    - name: "Adidas"

# Option 2: Reference to standalone attribute (by slug)
- attribute: "brand"
  variantSelection: true   # Optional — use for variant selection in storefront
```

**Example**:
```yaml
productTypes:
  - name: "T-Shirt"
    isShippingRequired: true
    taxClass: "Standard Rate"
    productAttributes:
      - name: "Brand"
        inputType: DROPDOWN
        values:
          - name: "Nike"
          - name: "Adidas"
    variantAttributes:
      - name: "Size"
        inputType: DROPDOWN
        values:
          - name: "S"
          - name: "M"
          - name: "L"
          - name: "XL"
      - name: "Color"
        inputType: SWATCH
        values:
          - name: "Black"
          - name: "White"
```

---

## Standalone Attributes

Standalone attributes are defined at the top level and can be referenced by product types and model types.

```yaml
productAttributes:              # Creates attributes with type PRODUCT_TYPE
  - name: string                # Required
    inputType: AttributeInputType # Required
    values:                     # Required for DROPDOWN, MULTISELECT, SWATCH
      - name: string

contentAttributes:              # Creates attributes with type PAGE_TYPE
  - name: string
    inputType: AttributeInputType
    values:
      - name: string
```

**Attribute Input Types**:
- `DROPDOWN` — Single select (requires `values`)
- `MULTISELECT` — Multi-select (requires `values`)
- `SWATCH` — Color/pattern swatch (requires `values`)
- `BOOLEAN` — True/false toggle
- `PLAIN_TEXT` — Plain text input
- `RICH_TEXT` — Rich text editor
- `NUMERIC` — Number input
- `DATE` — Date picker
- `DATE_TIME` — Date and time picker
- `FILE` — File upload
- `REFERENCE` — Entity reference (requires `entityType`: PAGE, PRODUCT, or PRODUCT_VARIANT)
- `SINGLE_REFERENCE` — Single entity reference (requires `entityType`)

---

## Category

```yaml
categories:
  - name: string                # Required — display name
    slug: string                # Required — unique identifier
    subcategories:              # Optional — nested categories
      - Category                # Recursive structure
```

**Example**:
```yaml
categories:
  - name: "Clothing"
    slug: "clothing"
    subcategories:
      - name: "Men's"
        slug: "mens"
        subcategories:
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
  - name: string                # Required — display name
    slug: string                # Required — unique identifier
    productType: string         # Required — reference to ProductType.name
    category: string            # Required — category slug
    description: string         # Optional — product description
    taxClass: string            # Optional — overrides product type's tax class
    attributes:                 # Optional — product attribute values
      AttributeName: value      # String or string array
    media:                      # Optional — external media assets
      - ProductMedia
    channelListings:            # Optional — channel availability
      - ProductChannelListing
    variants:                   # Required — at least one variant
      - ProductVariant
```

**ProductChannelListing**:
```yaml
channelListings:
  - channel: string             # Required — channel slug
    isPublished: boolean        # Optional (default: true)
    publishedAt: string         # Optional — ISO date
    isAvailableForPurchase: boolean # Optional
    availableForPurchaseAt: string  # Optional — ISO date
    visibleInListings: boolean  # Optional (default: true)
```

**ProductVariant**:
```yaml
variants:
  - name: string                # Required — variant name
    sku: string                 # Required — unique SKU
    weight: number              # Optional — weight (in shop's default unit)
    digital: boolean            # Optional — digital product flag
    attributes:                 # Optional — variant attribute values
      AttributeName: value      # String or string array
    channelListings:            # Optional — pricing
      - VariantChannelListing
```

**VariantChannelListing**:
```yaml
channelListings:
  - channel: string             # Required — channel slug
    price: number               # Optional — price amount
    costPrice: number           # Optional — cost price
```

**ProductMedia**:
```yaml
media:
  - externalUrl: string         # Required — URL to external image/video (validated)
    alt: string                 # Optional — accessible alt text
```

**Example**:
```yaml
products:
  - name: "Classic T-Shirt"
    slug: "classic-t-shirt"
    productType: "T-Shirt"
    category: "mens-t-shirts"
    taxClass: "Standard Rate"
    attributes:
      Brand: "Nike"
    media:
      - externalUrl: "https://cdn.example.com/tshirt-front.jpg"
        alt: "Classic T-Shirt front view"
    channelListings:
      - channel: "us-store"
        isPublished: true
        isAvailableForPurchase: true
        visibleInListings: true
    variants:
      - name: "Small Red"
        sku: "TSHIRT-S-RED"
        weight: 0.2
        attributes:
          Size: "S"
          Color: "Red"
        channelListings:
          - channel: "us-store"
            price: 29.99
            costPrice: 12.00
```

---

## Collection

```yaml
collections:
  - name: string                # Required — display name
    slug: string                # Required — unique identifier
    description: string         # Optional — collection description
    isPublished: boolean        # Optional — top-level publish shorthand
    products:                   # Optional — product slugs
      - string
    channelListings:            # Optional — channel visibility
      - CollectionChannelListing
```

**CollectionChannelListing**:
```yaml
channelListings:
  - channelSlug: string         # Required — channel slug
    isPublished: boolean        # Optional
    publishedAt: string         # Optional — ISO date
```

---

## Warehouse

```yaml
warehouses:
  - name: string                # Required — display name
    slug: string                # Required — unique identifier
    email: string               # Optional — contact email
    isPrivate: boolean          # Optional (default: false)
    clickAndCollectOption: DISABLED | LOCAL | ALL  # Optional (default: DISABLED)
    address:                    # Required — warehouse address
      streetAddress1: string    # Required
      streetAddress2: string    # Optional
      city: string              # Required
      cityArea: string          # Optional
      postalCode: string        # Optional
      country: CountryCode      # Required
      countryArea: string       # Optional
      companyName: string       # Optional
      phone: string             # Optional
    shippingZones:              # Optional — associated zone names
      - string
```

---

## Shipping Zone

```yaml
shippingZones:
  - name: string                # Required — unique identifier
    description: string         # Optional
    default: boolean            # Optional (default: false)
    countries:                  # Required — covered countries
      - CountryCode
    warehouses:                 # Optional — source warehouse slugs
      - string
    channels:                   # Optional — channel slugs
      - string
    shippingMethods:            # Optional — shipping methods
      - ShippingMethod
```

**ShippingMethod**:
```yaml
shippingMethods:
  - name: string                # Required — method name
    description: string         # Optional
    type: PRICE | WEIGHT        # Required — calculation type
    minimumDeliveryDays: number # Optional — min delivery days
    maximumDeliveryDays: number # Optional — max delivery days
    taxClass: string            # Optional — reference to TaxClass.name
    minimumOrderWeight: Weight  # Optional (for WEIGHT type)
    maximumOrderWeight: Weight  # Optional (for WEIGHT type)
    channelListings:            # Optional — pricing per channel
      - channel: string         # Required — channel slug
        price: number           # Required — shipping price
        currency: CurrencyCode  # Optional
        minimumOrderPrice: number # Optional
        maximumOrderPrice: number # Optional
```

---

## Tax Class

```yaml
taxClasses:
  - name: string                # Required — unique identifier
    countryRates:               # Optional — per-country tax rates
      - countryCode: CountryCode  # Required — ISO 3166-1 alpha-2
        rate: number              # Required — percentage (0-100)
```

**Example**:
```yaml
taxClasses:
  - name: "Standard Rate"
    countryRates:
      - countryCode: US
        rate: 0
      - countryCode: GB
        rate: 20
      - countryCode: DE
        rate: 19
```

---

## Menu

```yaml
menus:
  - name: string                # Required — display name
    slug: string                # Required — unique identifier
    items:                      # Optional — menu items
      - MenuItem
```

**MenuItem**:
```yaml
items:
  - name: string                # Required — item name
    url: string                 # Optional — external URL
    category: string            # Optional — category slug
    collection: string          # Optional — collection slug
    page: string                # Optional — page/model slug
    children:                   # Optional — nested items
      - MenuItem
```

---

## Model Type (alias: Page Type)

`modelTypes` is the preferred key. `pageTypes` is supported as an alias.

**modelTypes** (full features):
```yaml
modelTypes:
  - name: string                # Required — unique identifier
    slug: string                # Optional
    attributes:                 # Optional — attribute definitions
      - AttributeInput          # Inline or reference
```

**pageTypes** (basic):
```yaml
pageTypes:
  - name: string                # Required — unique identifier
    attributes:                 # Optional — attribute definitions
      - AttributeInput
```

---

## Model (alias: Page)

Content models/pages with structured data based on model types.

```yaml
models:
  - title: string               # Required — model title (NOT name)
    slug: string                # Required — unique identifier
    modelType: string           # Required — reference to ModelType.name
    content: string             # Optional — page content
    isPublished: boolean        # Optional
    publishedAt: string         # Optional — ISO date
    attributes:                 # Optional — attribute values
      attributeSlug: value      # String, number, boolean, or string array
```

**Example**:
```yaml
models:
  - title: "About Us"
    slug: "about-us"
    modelType: "Landing Page"
    content: "Welcome to our store..."
    isPublished: true
    attributes:
      author: "John Doe"
      tags: ["company", "about"]
```

---

## Common Types

**Weight**:
```yaml
weight:
  value: number
  unit: G | KG | LB | OZ | TONNE
```

**CurrencyCode**: ISO 4217 codes (USD, EUR, GBP, JPY, PLN, CZK, BRL, etc.)

**CountryCode**: ISO 3166-1 alpha-2 codes (US, DE, GB, JP, PL, BR, etc.)
