# Saleor Configurator Configuration Schema

Schema for Saleor Configurator YAML configuration files. This defines all available fields, their types, and validation rules for managing Saleor e-commerce store configuration as code.

> [!TIP]
> For a complete configuration example, see [example.yml](example.yml).

## Table of Contents

- [shop](#shop)
- [channels](#channels)
- [warehouses](#warehouses)
- [shippingZones](#shippingzones)
- [taxClasses](#taxclasses)
- [productTypes](#producttypes)
- [pageTypes](#pagetypes)
- [modelTypes](#modeltypes)
- [categories](#categories)
- [collections](#collections)
- [products](#products)
- [models](#models)
- [menus](#menus)
- [attributes](#attributes)

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
    `COP`, `PEN`, `BAM`, `HRK`, `RSD`
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
- **taxConfiguration** (`object`): Tax settings specific to this channel

## warehouses

Warehouse definitions with physical locations for storing and fulfilling products. Each warehouse can be assigned to shipping zones and channels for multi-location fulfillment

**Type:** `array<object>` *(optional)*

**Array items:**

Each item is of type: `object`

**Item properties:**

- **name** (`string`) *required*: Warehouse.name
- **slug** (`string`) *required*: Warehouse.slug
- **email** (`string`): Warehouse.email
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

## taxClasses

Tax class definitions that specify tax rates per country. Tax classes can be assigned to products, product types, and shipping methods to control tax calculation

**Type:** `array<object>` *(optional)*

**Array items:**

Each item is of type: `object`

**Item properties:**

- **name** (`string`) *required*: TaxClass.name - Unique identifier for the tax class
- **countryRates** (`array<object>`): TaxClass.countries - Tax rates per country for this tax class

## productTypes

Product type templates that define the structure and attributes for groups of similar products. Each product must be assigned to a product type

**Type:** `array<object>` *(optional)*

**Array items:**

Each item is of type: `object`

**Item properties:**

- **name** (`string`) *required*: Name of the product type (e.g., 'Book', 'T-Shirt', 'Electronics')
- **isShippingRequired** (`boolean`) *required*: Whether products of this type require shipping (false for digital products)
- **taxClass** (`string`): Reference to a tax class name for default tax calculation on products of this type
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

Model type templates that define the structure and attributes for content models (renamed from page types). Useful for creating structured content with custom fields

**Type:** `array<object>` *(optional)*

**Array items:**

Each item is of type: `object`

**Item properties:**

- **name** (`string`) *required*: ModelType.name
- **slug** (`string`): ModelType.slug
- **attributes** (`array<AttributeInput>`): ModelType.attributes

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

Product collections for grouping and merchandising products. Collections can be published to specific channels and contain curated product lists

**Type:** `array<object>` *(optional)*

**Array items:**

Each item is of type: `object`

**Item properties:**

- **name** (`string`) *required*: Collection.name
- **slug** (`string`) *required*: Collection.slug
- **description** (`string`): Collection.description
- **isPublished** (`boolean`): Collection.isPublished
- **products** (`array<string>`): Collection.products - References to product slugs
- **channelListings** (`array<object>`): Collection.channelListings - Channel-specific visibility settings

## products

Individual product definitions including variants, attributes, and channel-specific settings like pricing and availability

**Type:** `array<object>` *(optional)*

**Array items:**

Each item is of type: `object`

**Item properties:**

- **name** (`string`) *required*: Product name as displayed to customers
- **slug** (`string`) *required*: URL-friendly identifier (used in URLs and API calls)
- **description** (`string`): Product description
- **productType** (`string`) *required*: Reference to the product type (must match a productType name)
- **category** (`string`) *required*: Reference to the product category (must match a category slug)
- **taxClass** (`string`): Reference to a tax class name - overrides the product type's default tax class
- **attributes** (`object`): Product-specific attribute values
- **channelListings** (`array<object>`): Channel-specific settings like pricing and availability
- **media** (`array<object>`): External media assets associated with the product. Provide an externalUrl for images or videos hosted outside of Saleor
- **variants** (`array<object>`) *required*: Product variants with different SKUs, attributes, or pricing

## models

Content models/pages with structured data based on model types. Models can have custom attributes and content for flexible CMS functionality

**Type:** `array<object>` *(optional)*

**Array items:**

Each item is of type: `object`

**Item properties:**

- **title** (`string`) *required*: Model.title
- **slug** (`string`) *required*: Model.slug
- **modelType** (`string`) *required*: Model.modelType - Reference to model type name
- **content** (`string`): Model.content - Page content
- **isPublished** (`boolean`): Model.isPublished
- **publishedAt** (`string`): Model.publishedAt
- **attributes** (`object`): Model.attributes - Attribute values keyed by attribute slug

## menus

Navigation menu structures with hierarchical menu items. Menu items can link to categories, collections, pages, or external URLs

**Type:** `array<object>` *(optional)*

**Array items:**

Each item is of type: `object`

**Item properties:**

- **name** (`string`) *required*: Menu.name
- **slug** (`string`) *required*: Menu.slug
- **items** (`array<object>`): Menu.items - Top-level menu items

## attributes

Unassigned attributes (typically PRODUCT_TYPE) that exist globally but are not assigned to any product type. These will be created/updated without assignment

**Type:** `array<unknown>` *(optional)*

**Array items:**

Each item is of type: `unknown`

