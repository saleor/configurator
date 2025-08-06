# Saleor Configurator Configuration Schema

Schema for Saleor Configurator YAML configuration files. This defines all available fields, their types, and validation rules for managing Saleor e-commerce store configuration as code.

> [!TIP]
> For a complete configuration example, see [example.yml](example.yml).

## Table of Contents

- [shop](#shop)
- [channels](#channels)
- [productTypes](#producttypes)
- [pageTypes](#pagetypes)
- [categories](#categories)
- [products](#products)

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
    `US`, `GB`, `DE`, `FR`, `ES`, `IT`,
    `PL`, `NL`, `BE`, `CZ`, `PT`, `SE`,
    `AT`, `CH`, `DK`, `FI`, `NO`, `IE`,
    `AU`, `JP`, `BR`, `RU`, `CN`, `IN`,
    `CA`, `AE`, `MX`, `KR`, `SG`, `HK`,
    `MY`, `TH`, `ID`, `PH`, `VN`, `EG`,
    `SA`, `IL`, `TR`, `ZA`, `NG`, `AR`,
    `CL`, `CO`, `PE`, `NZ`
- **slug** (`string`) *required*: URL-friendly identifier (used in URLs and API calls)
- **isActive** (`boolean`) *required*: Whether this channel is currently active and accepting orders
- **settings** (`object`): Advanced channel configuration options

## productTypes

Product type templates that define the structure and attributes for groups of similar products. Each product must be assigned to a product type

**Type:** `array<object>` *(optional)*

**Array items:**

Each item is of type: `object`

**Item properties:**

- **name** (`string`) *required*: Name of the product type (e.g., 'Book', 'T-Shirt', 'Electronics')
- **isShippingRequired** (`boolean`) *required*: Whether products of this type require shipping (false for digital products)
- **productAttributes** (`array<AttributeInput>`): Attributes that apply to the entire product (e.g., Brand, Color, Material)
- **variantAttributes** (`array<AttributeInput>`): Attributes that can vary between product variants (e.g., Size, Weight)

## pageTypes

Page type templates that define the structure and attributes for CMS pages. Useful for creating structured content like blog posts, landing pages, etc

**Type:** `array<object>` *(optional)*

**Array items:**

Each item is of type: `object`

**Item properties:**

- **name** (`string`) *required*: Name of the page type (e.g., 'Blog Post', 'Landing Page', 'Help Article')
- **attributes** (`array<AttributeInput>`) *required*: Attributes available for pages of this type (e.g., Author, Published Date, Tags)

## categories

Hierarchical product categorization system. Categories can have subcategories and help organize products for navigation and filtering

**Type:** `array<object>` *(optional)*

**Array items:**

Each item is of type: `object`

**Item properties:**

- **name** (`string`) *required*: Display name of the category
- **slug** (`string`) *required*: URL-friendly identifier (used in URLs and API calls)
- **subcategories** (`array<object>`): Child categories nested under this category

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

