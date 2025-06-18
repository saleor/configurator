# 📋 Configuration Schema Reference

> **Automated documentation for Saleor Configurator**
> 
> This document describes all available configuration options with their GraphQL field mappings.

## Table of Contents

- [shop](#shop)
- [channels](#channels)
- [productTypes](#producttypes)
- [pageTypes](#pagetypes)
- [categories](#categories)
- [products](#products)



## shop

**Type**: `object` (optional)

Global shop settings that apply to the entire Saleor instance

### headerText

> **GraphQL**: `Shop.headerText`

| | |
|---|---|
| **Type** | `string` |
| **Required** | No |

### description

> **GraphQL**: `Shop.description`

| | |
|---|---|
| **Type** | `string` |
| **Required** | No |

### trackInventoryByDefault

> **GraphQL**: `Shop.trackInventoryByDefault`

| | |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

### defaultWeightUnit

> **GraphQL**: `Shop.defaultWeightUnit`

| | |
|---|---|
| **Type** | `enum` |
| **Required** | No |
| **Values** | `KG`, `LB`, `OZ`, `G`, `TONNE` |

### automaticFulfillmentDigitalProducts

> **GraphQL**: `Shop.automaticFulfillmentDigitalProducts`

| | |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

### fulfillmentAutoApprove

> **GraphQL**: `Shop.fulfillmentAutoApprove`

| | |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

### fulfillmentAllowUnpaid

> **GraphQL**: `Shop.fulfillmentAllowUnpaid`

| | |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

### defaultDigitalMaxDownloads

> **GraphQL**: `Shop.defaultDigitalMaxDownloads`

| | |
|---|---|
| **Type** | `number` |
| **Required** | No |

### defaultDigitalUrlValidDays

> **GraphQL**: `Shop.defaultDigitalUrlValidDays`

| | |
|---|---|
| **Type** | `number` |
| **Required** | No |

### defaultMailSenderName

> **GraphQL**: `Shop.defaultMailSenderName`

| | |
|---|---|
| **Type** | `string` |
| **Required** | No |

### defaultMailSenderAddress

> **GraphQL**: `Shop.defaultMailSenderAddress`

| | |
|---|---|
| **Type** | `string` |
| **Required** | No |

### customerSetPasswordUrl

> **GraphQL**: `Shop.customerSetPasswordUrl`

| | |
|---|---|
| **Type** | `string` |
| **Required** | No |

### reserveStockDurationAnonymousUser

> **GraphQL**: `Shop.reserveStockDurationAnonymousUser`

| | |
|---|---|
| **Type** | `number` |
| **Required** | No |

### reserveStockDurationAuthenticatedUser

> **GraphQL**: `Shop.reserveStockDurationAuthenticatedUser`

| | |
|---|---|
| **Type** | `number` |
| **Required** | No |

### limitQuantityPerCheckout

> **GraphQL**: `Shop.limitQuantityPerCheckout`

| | |
|---|---|
| **Type** | `number` |
| **Required** | No |

### enableAccountConfirmationByEmail

> **GraphQL**: `Shop.enableAccountConfirmationByEmail`

| | |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

### allowLoginWithoutConfirmation

> **GraphQL**: `Shop.allowLoginWithoutConfirmation`

| | |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

### displayGrossPrices

> **GraphQL**: `Shop.displayGrossPrices`

| | |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

## channels

**Type**: `object[]` (optional)

Sales channels for different markets, regions, or customer segments

### name

> **GraphQL**: `Channel.name`

| | |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

### currencyCode

> **GraphQL**: `Channel.currencyCode`

| | |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

### defaultCountry

> **GraphQL**: `Channel.defaultCountry.code`

| | |
|---|---|
| **Type** | `enum` |
| **Required** | Yes |
| **Values** | `US`, `GB`, `DE`, `FR`, `ES`, `IT`, `PL`, `NL`, `BE`, `CZ`, `PT`, `SE`, `AT`, `CH`, `DK`, `FI`, `NO`, `IE`, `AU`, `JP`, `BR`, `RU`, `CN`, `IN`, `CA` |

### slug

> **GraphQL**: `Channel.slug`

| | |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

### settings

> **GraphQL**: `Channel settings`

**Type**: `object` (optional)

#### allocationStrategy

> **GraphQL**: `Channel.stockSettings.allocationStrategy`

| | |
|---|---|
| **Type** | `enum` |
| **Required** | No |
| **Values** | `PRIORITIZE_SORTING_ORDER`, `PRIORITIZE_HIGH_STOCK` |

#### automaticallyConfirmAllNewOrders

> **GraphQL**: `Channel.orderSettings.automaticallyConfirmAllNewOrders`

| | |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

#### automaticallyFulfillNonShippableGiftCard

> **GraphQL**: `Channel.orderSettings.automaticallyFulfillNonShippableGiftCard`

| | |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

#### expireOrdersAfter

> **GraphQL**: `Channel.orderSettings.expireOrdersAfter`

| | |
|---|---|
| **Type** | `number` |
| **Required** | No |

#### deleteExpiredOrdersAfter

> **GraphQL**: `Channel.orderSettings.deleteExpiredOrdersAfter`

| | |
|---|---|
| **Type** | `number` |
| **Required** | No |

#### markAsPaidStrategy

> **GraphQL**: `Channel.orderSettings.markAsPaidStrategy`

| | |
|---|---|
| **Type** | `enum` |
| **Required** | No |
| **Values** | `TRANSACTION_FLOW`, `PAYMENT_FLOW` |

#### allowUnpaidOrders

> **GraphQL**: `Channel.orderSettings.allowUnpaidOrders`

| | |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

#### includeDraftOrderInVoucherUsage

> **GraphQL**: `Channel.orderSettings.includeDraftOrderInVoucherUsage`

| | |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

#### useLegacyErrorFlow

> **GraphQL**: `Channel.checkoutSettings.useLegacyErrorFlow`

| | |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

#### automaticallyCompleteFullyPaidCheckouts

> **GraphQL**: `Channel.checkoutSettings.automaticallyCompleteFullyPaidCheckouts`

| | |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

#### defaultTransactionFlowStrategy

> **GraphQL**: `Channel.paymentSettings.defaultTransactionFlowStrategy`

| | |
|---|---|
| **Type** | `enum` |
| **Required** | No |
| **Values** | `AUTHORIZATION`, `CHARGE` |

## productTypes

**Type**: `object[]` (optional)

Product type definitions with their associated attributes

### name

> **GraphQL**: `ProductType.name / PageType.name`

| | |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

### attributes

> **GraphQL**: `ProductType.productAttributes / PageType.attributes`

| | |
|---|---|
| **Type** | `unknown[]` |
| **Required** | Yes |
| **Example** | `{"Color":"Red","Size":["S","M","L"]}` |

## pageTypes

**Type**: `object[]` (optional)

Page type definitions for CMS content

### name

> **GraphQL**: `ProductType.name / PageType.name`

| | |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

### attributes

> **GraphQL**: `ProductType.productAttributes / PageType.attributes`

| | |
|---|---|
| **Type** | `unknown[]` |
| **Required** | Yes |
| **Example** | `{"Color":"Red","Size":["S","M","L"]}` |

## categories

**Type**: `object[]` (optional)

Product category hierarchy

### name

> **GraphQL**: `Category.name`

| | |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

### subcategories

> **GraphQL**: `Category.children`

| | |
|---|---|
| **Type** | `recursive` |
| **Required** | No |

## products

**Type**: `object[]` (optional)

Product catalog with variants and attributes

### name

> **GraphQL**: `Product.name`

| | |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

### productType

> **GraphQL**: `Product.productType.name`

| | |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

### category

> **GraphQL**: `Product.category.name`

| | |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

### description

> **GraphQL**: `Product.description`

| | |
|---|---|
| **Type** | `string` |
| **Required** | No |

### attributes

> **GraphQL**: `Product.attributes`

| | |
|---|---|
| **Type** | `Record<string, string | string[]>` |
| **Required** | No |
| **Example** | `{"Color":"Red","Size":["S","M","L"]}` |

### channelListings

> **GraphQL**: `Product.channelListings`

**Type**: `object[]` (optional)

#### channel

> **GraphQL**: `ProductChannelListing.channel.slug`

| | |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

#### isPublished

> **GraphQL**: `ProductChannelListing.isPublished`

| | |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

#### visibleInListings

> **GraphQL**: `ProductChannelListing.visibleInListings`

| | |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

#### availableForPurchase

> **GraphQL**: `ProductChannelListing.availableForPurchaseAt`

| | |
|---|---|
| **Type** | `string` |
| **Required** | No |

### variants

> **GraphQL**: `Product.variants`

**Type**: `object[]` (required)

#### name

> **GraphQL**: `ProductVariant.name`

| | |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

#### sku

> **GraphQL**: `ProductVariant.sku`

| | |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

#### weight

> **GraphQL**: `ProductVariant.weight.value`

| | |
|---|---|
| **Type** | `number` |
| **Required** | No |

#### digital

> **GraphQL**: `ProductVariant.product.productType.isDigital`

| | |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

#### attributes

> **GraphQL**: `ProductVariant.attributes`

| | |
|---|---|
| **Type** | `Record<string, string | string[]>` |
| **Required** | No |
| **Example** | `{"Color":"Red","Size":["S","M","L"]}` |

#### channelListings

> **GraphQL**: `ProductVariant.channelListings`

**Type**: `object[]` (required)

##### channel

> **GraphQL**: `ProductVariantChannelListing.channel.slug`

| | |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

##### price

> **GraphQL**: `ProductVariantChannelListing.price.amount`

| | |
|---|---|
| **Type** | `number` |
| **Required** | Yes |

##### costPrice

> **GraphQL**: `ProductVariantChannelListing.costPrice.amount`

| | |
|---|---|
| **Type** | `number` |
| **Required** | No |


