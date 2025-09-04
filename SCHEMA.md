# Saleor Configurator Configuration Schema

Schema for Saleor Configurator YAML configuration files. This defines all available fields, their types, and validation rules for managing Saleor e-commerce store configuration as code.

> [!TIP]
> For a complete configuration example, see [example.yml](example.yml).

## Table of Contents

- [shop](#shop)
- [channels](#channels)
- [taxClasses](#taxclasses)
- [warehouses](#warehouses)
- [shippingZones](#shippingzones)
- [productTypes](#producttypes)
- [pageTypes](#pagetypes)
- [modelTypes](#modeltypes)
- [categories](#categories)
- [collections](#collections)
- [products](#products)
- [models](#models)
- [menus](#menus)

## shop

Global shop configuration settings that apply across all channels and define store-wide behavior

**Type:** `object` *(optional)*

**Properties:**

- **headerText** (`string`): Text displayed in the shop header
- **description** (`string`): General description of the shop
- **trackInventoryByDefault** (`boolean`): Whether new products should track inventory by default
- **defaultWeightUnit** (`string (enum)`): Default unit for product weights
- **automaticFulfillmentDigitalProducts** (`boolean`): Automatically fulfill digital products upon payment
- **fulfillmentAutoApprove** (`boolean`): Automatically approve fulfillments
- **fulfillmentAllowUnpaid** (`boolean`): Allow fulfillment of unpaid orders
- **defaultDigitalMaxDownloads** (`number | null`): Maximum downloads allowed for digital products
- **defaultDigitalUrlValidDays** (`number | null`): Days that download links remain valid
- **defaultMailSenderName** (`string | null`): Default name for outgoing emails
- **defaultMailSenderAddress** (`string | null`): Default email address for outgoing emails
- **customerSetPasswordUrl** (`string`): URL where customers can set their password
- **reserveStockDurationAnonymousUser** (`number | null`): Minutes to reserve stock for anonymous users
- **reserveStockDurationAuthenticatedUser** (`number | null`): Minutes to reserve stock for authenticated users
- **limitQuantityPerCheckout** (`number`): Maximum quantity per checkout
- **enableAccountConfirmationByEmail** (`boolean`): Require email confirmation for new accounts
- **allowLoginWithoutConfirmation** (`boolean`): Allow login before email confirmation
- **displayGrossPrices** (`boolean`): Show prices including taxes

## channels

Sales channels define different storefronts or markets with their own currency, country, and settings. Each channel can have different pricing, availability, and configuration

**Type:** `array<object>` *(optional)*

**Array items:**

Each item is of type: `object`

**Item properties:**

- **name** (`string`) *required*: Display name of the channel
- **currencyCode** (`string (enum)`) *required*: Currency used for pricing in this channel
  - **Allowed values:** 
    `USD`, `EUR`, `GBP`, `JPY`, `AUD`, `CAD`,
    `CHF`, `CNY`, `SEK`, `NZD`, `MXN`, `SGD`,
    `HKD`, `NOK`, `KRW`, `TRY`, `RUB`, `INR`,
    `BRL`, `ZAR`, `PLN`, `CZK`, `DKK`, `HUF`,
    `ILS`, `THB`, `IDR`, `MYR`, `PHP`, `VND`,
    `EGP`, `SAR`, `AED`, `NGN`, `ARS`, `CLP`,
    `COP`, `PEN`
- **defaultCountry** (`string (enum)`) *required*: Default country for shipping and tax calculations
  - **Allowed values:** 
    `AD`, `AE`, `AF`, `AG`, `AI`, `AL`,
    `AM`, `AO`, `AQ`, `AR`, `AS`, `AT`,
    `AU`, `AW`, `AX`, `AZ`, `BA`, `BB`,
    `BD`, `BE`, `BF`, `BG`, `BH`, `BI`,
    `BJ`, `BL`, `BM`, `BN`, `BO`, `BQ`,
    `BR`, `BS`, `BT`, `BV`, `BW`, `BY`,
    `BZ`, `CA`, `CC`, `CD`, `CF`, `CG`,
    `CH`, `CI`, `CK`, `CL`, `CM`, `CN`,
    `CO`, `CR`, `CU`, `CV`, `CW`, `CX`,
    `CY`, `CZ`, `DE`, `DJ`, `DK`, `DM`,
    `DO`, `DZ`, `EC`, `EE`, `EG`, `EH`,
    `ER`, `ES`, `ET`, `FI`, `FJ`, `FK`,
    `FM`, `FO`, `FR`, `GA`, `GB`, `GD`,
    `GE`, `GF`, `GG`, `GH`, `GI`, `GL`,
    `GM`, `GN`, `GP`, `GQ`, `GR`, `GS`,
    `GT`, `GU`, `GW`, `GY`, `HK`, `HM`,
    `HN`, `HR`, `HT`, `HU`, `ID`, `IE`,
    `IL`, `IM`, `IN`, `IO`, `IQ`, `IR`,
    `IS`, `IT`, `JE`, `JM`, `JO`, `JP`,
    `KE`, `KG`, `KH`, `KI`, `KM`, `KN`,
    `KP`, `KR`, `KW`, `KY`, `KZ`, `LA`,
    `LB`, `LC`, `LI`, `LK`, `LR`, `LS`,
    `LT`, `LU`, `LV`, `LY`, `MA`, `MC`,
    `MD`, `ME`, `MF`, `MG`, `MH`, `MK`,
    `ML`, `MM`, `MN`, `MO`, `MP`, `MQ`,
    `MR`, `MS`, `MT`, `MU`, `MV`, `MW`,
    `MX`, `MY`, `MZ`, `NA`, `NC`, `NE`,
    `NF`, `NG`, `NI`, `NL`, `NO`, `NP`,
    `NR`, `NU`, `NZ`, `OM`, `PA`, `PE`,
    `PF`, `PG`, `PH`, `PK`, `PL`, `PM`,
    `PN`, `PR`, `PS`, `PT`, `PW`, `PY`,
    `QA`, `RE`, `RO`, `RS`, `RU`, `RW`,
    `SA`, `SB`, `SC`, `SD`, `SE`, `SG`,
    `SH`, `SI`, `SJ`, `SK`, `SL`, `SM`,
    `SN`, `SO`, `SR`, `SS`, `ST`, `SV`,
    `SX`, `SY`, `SZ`, `TC`, `TD`, `TF`,
    `TG`, `TH`, `TJ`, `TK`, `TL`, `TM`,
    `TN`, `TO`, `TR`, `TT`, `TV`, `TW`,
    `TZ`, `UA`, `UG`, `UM`, `US`, `UY`,
    `UZ`, `VA`, `VC`, `VE`, `VG`, `VI`,
    `VN`, `VU`, `WF`, `WS`, `YE`, `YT`,
    `ZA`, `ZM`, `ZW`
- **slug** (`string`) *required*: URL-friendly identifier (used in URLs and API calls)
- **isActive** (`boolean`) *required*: Whether this channel is currently active and accepting orders
- **settings** (`object`): Advanced channel configuration options

## taxClasses

Tax class definitions that specify tax rates by country. Tax classes can be assigned to products, product types, and shipping methods to control tax calculation

**Type:** `array<object>` *(optional)*

**Array items:**

Each item is of type: `object`

**Item properties:**

- **name** (`string`) *required*: Name of the tax class (e.g., 'Standard Rate', 'Reduced Rate', 'Zero Rate')
- **countries** (`array<object>`) *required*: Tax rates for different countries
  - **countryCode** (`string (enum)`) *required*: ISO country code (e.g., 'US', 'GB', 'DE')
  - **taxRate** (`number`) *required*: Tax rate as a percentage (e.g., 20 for 20% VAT)

**Example:**
```yaml
taxClasses:
  - name: "Standard Rate"
    countries:
      - countryCode: "US"
        taxRate: 8.5
      - countryCode: "GB" 
        taxRate: 20
  - name: "Reduced Rate"
    countries:
      - countryCode: "US"
        taxRate: 5
      - countryCode: "GB"
        taxRate: 5
```

## warehouses

Warehouse definitions with physical locations for storing and fulfilling products. Each warehouse can be assigned to shipping zones and channels for multi-location fulfillment

**Type:** `array<object>` *(optional)*

**Array items:**

Each item is of type: `object`

**Item properties:**

- **name** (`string`) *required*: Warehouse.name
- **slug** (`string`) *required*: Warehouse.slug
- **email** (`string`) *required*: Warehouse.email
- **isPrivate** (`boolean`) *required*: Warehouse.isPrivate
- **address** (`object`) *required*: Warehouse.address
- **clickAndCollectOption** (`string (enum)`) *required*: Warehouse.clickAndCollectOption
  - **Allowed values:** `DISABLED` | `LOCAL` | `ALL`
- **shippingZones** (`array<string>`): Warehouse.shippingZones

## shippingZones

Shipping zone configurations that define geographical regions, associated warehouses, and available shipping methods with pricing rules

**Type:** `array<object>` *(optional)*

**Array items:**

Each item is of type: `object`

**Item properties:**

- **name** (`string`) *required*: ShippingZone.name
- **description** (`string`): ShippingZone.description
- **default** (`boolean`) *required*: ShippingZone.default
- **countries** (`array<string (enum)>`) *required*: ShippingZone.countries
- **warehouses** (`array<string>`): ShippingZone.warehouses
- **channels** (`array<string>`): ShippingZone.channels
- **shippingMethods** (`array<object>`): ShippingZone.shippingMethods

## productTypes

Product type templates that define the structure and attributes for groups of similar products. Each product must be assigned to a product type

**Type:** `array<object>` *(optional)*

**Array items:**

Each item is of type: `object`

**Item properties:**

- **name** (`string`) *required*: Name of the product type (e.g., 'Book', 'T-Shirt', 'Electronics')
- **isShippingRequired** (`boolean`) *required*: Whether products of this type require shipping (false for digital products)
- **productAttributes** (`array<AttributeInput>`): Attributes that apply to the entire product (e.g., Brand, Material)
- **variantAttributes** (`array<AttributeInput>`): Attributes that can vary between product variants (e.g., Size, Color)

## pageTypes

Page type templates that define the structure and attributes for CMS pages. Useful for creating structured content like blog posts, landing pages, etc

**Type:** `array<object>` *(optional)*

**Array items:**

Each item is of type: `object`

**Item properties:**

- **name** (`string`) *required*: Name of the page type (e.g., 'Blog Post', 'Landing Page', 'Help Article')
- **attributes** (`array<AttributeInput>`) *required*: Attributes available for pages of this type (e.g., Author, Published Date, Tags)

## modelTypes

Model type templates that define the structure and attributes for content models. Similar to page types but designed for more flexible content management with custom fields

**Type:** `array<object>` *(optional)*

**Array items:**

Each item is of type: `object`

**Item properties:**

- **name** (`string`) *required*: Name of the model type (e.g., 'Blog Post', 'Product Review', 'FAQ Item')
- **attributes** (`array<AttributeInput>`) *required*: Attributes available for models of this type (e.g., Title, Content, Author, Published Date)

**Example:**
```yaml
modelTypes:
  - name: "Blog Post"
    attributes:
      - name: "Title"
        inputType: "PLAIN_TEXT"
      - name: "Content"  
        inputType: "RICH_TEXT"
      - name: "Published Date"
        inputType: "DATE"
      - name: "Author"
        inputType: "PLAIN_TEXT"
```

## categories

Hierarchical product categorization system. Categories can have subcategories and help organize products for navigation and filtering

**Type:** `array<object>` *(optional)*

**Array items:**

Each item is of type: `object`

**Item properties:**

- **name** (`string`) *required*: Display name of the category
- **slug** (`string`) *required*: URL-friendly identifier (used in URLs and API calls)
- **subcategories** (`array<object>`): Child categories nested under this category

## collections

Product collections for grouping and merchandising products. Collections can be published to specific channels and contain curated product lists for promotional or organizational purposes

**Type:** `array<object>` *(optional)*

**Array items:**

Each item is of type: `object`

**Item properties:**

- **name** (`string`) *required*: Display name of the collection
- **slug** (`string`) *required*: URL-friendly identifier (used in URLs and API calls)
- **description** (`string`): Optional description of the collection
- **channelListings** (`array<object>`): Channel-specific publication settings
  - **channel** (`string`) *required*: Reference to channel slug
  - **isPublished** (`boolean`) *required*: Whether the collection is visible in this channel
  - **publishedAt** (`string`): Publication date (ISO format)

**Example:**
```yaml
collections:
  - name: "Featured Books"
    slug: "featured-books"
    description: "Our most popular and recommended books"
    channelListings:
      - channel: "us"
        isPublished: true
      - channel: "eu"
        isPublished: false
```

## products

Individual product definitions including variants, attributes, and channel-specific settings like pricing and availability

**Type:** `array<object>` *(optional)*

**Array items:**

Each item is of type: `object`

**Item properties:**

- **name** (`string`) *required*: Product name as displayed to customers
- **slug** (`string`) *required*: URL-friendly identifier (used in URLs and API calls)
- **productType** (`string`) *required*: Reference to the product type (must match a productType name)
- **category** (`string`) *required*: Reference to the product category (must match a category slug)
- **attributes** (`object`): Product-specific attribute values
- **channelListings** (`array<object>`): Channel-specific settings like pricing and availability
- **variants** (`array<object>`) *required*: Product variants with different SKUs, attributes, or pricing

## models

Content models/pages with structured data based on model types. Models can have custom attributes and content for flexible CMS functionality like blog posts, landing pages, and other structured content

**Type:** `array<object>` *(optional)*

**Array items:**

Each item is of type: `object`

**Item properties:**

- **name** (`string`) *required*: Display name of the model/page
- **slug** (`string`) *required*: URL-friendly identifier (used in URLs and API calls)
- **modelType** (`string`) *required*: Reference to the model type (must match a modelType name)
- **attributes** (`object`): Model-specific attribute values based on the model type definition

**Example:**
```yaml
models:
  - name: "Welcome to Our Store"
    slug: "welcome-post"
    modelType: "Blog Post"
    attributes:
      Title: "Welcome to Our Store"
      Content: "We're excited to announce the launch of our new online store..."
      Published Date: "2024-01-15"
      Author: "Store Manager"
```

## menus

Navigation menu structures with hierarchical menu items. Menu items can link to categories, collections, pages, or external URLs for flexible site navigation

**Type:** `array<object>` *(optional)*

**Array items:**

Each item is of type: `object`

**Item properties:**

- **name** (`string`) *required*: Display name of the menu
- **slug** (`string`) *required*: URL-friendly identifier (used in URLs and API calls)
- **items** (`array<object>`) *required*: Menu items in hierarchical structure
  - **name** (`string`) *required*: Display text for the menu item
  - **category** (`string`): Reference to category slug (for category links)
  - **collection** (`string`): Reference to collection slug (for collection links)
  - **page** (`string`): Reference to page/model slug (for page links)
  - **url** (`string`): External URL (for external links)
  - **items** (`array<object>`): Child menu items for nested navigation

**Example:**
```yaml
menus:
  - name: "Main Navigation"
    slug: "main"
    items:
      - name: "Shop"
        items:
          - name: "Books"
            category: "books"
          - name: "Featured"
            collection: "featured-books"
      - name: "About"
        page: "about-us"
      - name: "Blog"
        url: "https://blog.example.com"
```

