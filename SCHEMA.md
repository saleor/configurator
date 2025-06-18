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



## shop

**Type**: `object` (optional)

Global shop settings that apply to the entire Saleor instance

### headerText

**GraphQL Field**: `Shop.headerText`

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | No |

### description

**GraphQL Field**: `Shop.description`

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | No |

### trackInventoryByDefault

**GraphQL Field**: `Shop.trackInventoryByDefault`

| Property | Value |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

### defaultWeightUnit

**GraphQL Field**: `Shop.defaultWeightUnit`

| Property | Value |
|---|---|
| **Type** | `enum` |
| **Required** | No |
| **Values** | `KG`, `LB`, `OZ`, `G`, `TONNE` |

### automaticFulfillmentDigitalProducts

**GraphQL Field**: `Shop.automaticFulfillmentDigitalProducts`

| Property | Value |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

### fulfillmentAutoApprove

**GraphQL Field**: `Shop.fulfillmentAutoApprove`

| Property | Value |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

### fulfillmentAllowUnpaid

**GraphQL Field**: `Shop.fulfillmentAllowUnpaid`

| Property | Value |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

### defaultDigitalMaxDownloads

**GraphQL Field**: `Shop.defaultDigitalMaxDownloads`

| Property | Value |
|---|---|
| **Type** | `number` |
| **Required** | No |

### defaultDigitalUrlValidDays

**GraphQL Field**: `Shop.defaultDigitalUrlValidDays`

| Property | Value |
|---|---|
| **Type** | `number` |
| **Required** | No |

### defaultMailSenderName

**GraphQL Field**: `Shop.defaultMailSenderName`

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | No |

### defaultMailSenderAddress

**GraphQL Field**: `Shop.defaultMailSenderAddress`

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | No |

### customerSetPasswordUrl

**GraphQL Field**: `Shop.customerSetPasswordUrl`

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | No |

### reserveStockDurationAnonymousUser

**GraphQL Field**: `Shop.reserveStockDurationAnonymousUser`

| Property | Value |
|---|---|
| **Type** | `number` |
| **Required** | No |

### reserveStockDurationAuthenticatedUser

**GraphQL Field**: `Shop.reserveStockDurationAuthenticatedUser`

| Property | Value |
|---|---|
| **Type** | `number` |
| **Required** | No |

### limitQuantityPerCheckout

**GraphQL Field**: `Shop.limitQuantityPerCheckout`

| Property | Value |
|---|---|
| **Type** | `number` |
| **Required** | No |

### enableAccountConfirmationByEmail

**GraphQL Field**: `Shop.enableAccountConfirmationByEmail`

| Property | Value |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

### allowLoginWithoutConfirmation

**GraphQL Field**: `Shop.allowLoginWithoutConfirmation`

| Property | Value |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

### displayGrossPrices

**GraphQL Field**: `Shop.displayGrossPrices`

| Property | Value |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

## channels

**Type**: `object[]` (optional)

Sales channels for different markets, regions, or customer segments

### name

**GraphQL Field**: `Channel.name`

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

### currencyCode

**GraphQL Field**: `Channel.currencyCode`

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

### defaultCountry

**GraphQL Field**: `Channel.defaultCountry.code`

| Property | Value |
|---|---|
| **Type** | `enum` |
| **Required** | Yes |
| **Values** | `US`, `GB`, `DE`, `FR`, `ES`, `IT`, `PL`, `NL`, `BE`, `CZ`, `PT`, `SE`, `AT`, `CH`, `DK`, `FI`, `NO`, `IE`, `AU`, `JP`, `BR`, `RU`, `CN`, `IN`, `CA` |

### slug

**GraphQL Field**: `Channel.slug`

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

### settings

**GraphQL Field**: `Channel settings`

**Type**: `object` (optional)

#### allocationStrategy

**GraphQL Field**: `Channel.stockSettings.allocationStrategy`

| Property | Value |
|---|---|
| **Type** | `enum` |
| **Required** | No |
| **Values** | `PRIORITIZE_SORTING_ORDER`, `PRIORITIZE_HIGH_STOCK` |

#### automaticallyConfirmAllNewOrders

**GraphQL Field**: `Channel.orderSettings.automaticallyConfirmAllNewOrders`

| Property | Value |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

#### automaticallyFulfillNonShippableGiftCard

**GraphQL Field**: `Channel.orderSettings.automaticallyFulfillNonShippableGiftCard`

| Property | Value |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

#### expireOrdersAfter

**GraphQL Field**: `Channel.orderSettings.expireOrdersAfter`

| Property | Value |
|---|---|
| **Type** | `number` |
| **Required** | No |

#### deleteExpiredOrdersAfter

**GraphQL Field**: `Channel.orderSettings.deleteExpiredOrdersAfter`

| Property | Value |
|---|---|
| **Type** | `number` |
| **Required** | No |

#### markAsPaidStrategy

**GraphQL Field**: `Channel.orderSettings.markAsPaidStrategy`

| Property | Value |
|---|---|
| **Type** | `enum` |
| **Required** | No |
| **Values** | `TRANSACTION_FLOW`, `PAYMENT_FLOW` |

#### allowUnpaidOrders

**GraphQL Field**: `Channel.orderSettings.allowUnpaidOrders`

| Property | Value |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

#### includeDraftOrderInVoucherUsage

**GraphQL Field**: `Channel.orderSettings.includeDraftOrderInVoucherUsage`

| Property | Value |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

#### useLegacyErrorFlow

**GraphQL Field**: `Channel.checkoutSettings.useLegacyErrorFlow`

| Property | Value |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

#### automaticallyCompleteFullyPaidCheckouts

**GraphQL Field**: `Channel.checkoutSettings.automaticallyCompleteFullyPaidCheckouts`

| Property | Value |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

#### defaultTransactionFlowStrategy

**GraphQL Field**: `Channel.paymentSettings.defaultTransactionFlowStrategy`

| Property | Value |
|---|---|
| **Type** | `enum` |
| **Required** | No |
| **Values** | `AUTHORIZATION`, `CHARGE` |

## productTypes

**Type**: `object[]` (optional)

Product type definitions with their associated attributes

### name

**GraphQL Field**: `ProductType.name / PageType.name`

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

### attributes

**GraphQL Field**: `ProductType.productAttributes / PageType.attributes`

| Property | Value |
|---|---|
| **Type** | `object[]` |
| **Required** | Yes |
| **Example** | `{"Color":"Red","Size":["S","M","L"]}` |

## pageTypes

**Type**: `object[]` (optional)

Page type definitions for CMS content

### name

**GraphQL Field**: `ProductType.name / PageType.name`

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

### attributes

**GraphQL Field**: `ProductType.productAttributes / PageType.attributes`

| Property | Value |
|---|---|
| **Type** | `object[]` |
| **Required** | Yes |
| **Example** | `{"Color":"Red","Size":["S","M","L"]}` |

## categories

**Type**: `object[]` (optional)

Product category hierarchy

### name

**GraphQL Field**: `Category.name`

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

### subcategories

**GraphQL Field**: `Category.children`

| Property | Value |
|---|---|
| **Type** | `recursive` |
| **Required** | No |


