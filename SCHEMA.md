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
- [warehouses](#warehouses)
- [shippingZones](#shippingzones)



## shop

| Property | Value |
|---|---|
| **Type** | `object | object` |
| **Required** | No |

## channels

| Property | Value |
|---|---|
| **Type** | `object | object[]` |
| **Required** | No |

## productTypes

**Type**: `object[]` (optional)

Product type definitions with their associated attributes

### name

**GraphQL Field**: `ProductType.name`

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

### productAttributes

**GraphQL Field**: `ProductType.productAttributes`

| Property | Value |
|---|---|
| **Type** | `object | object[]` |
| **Required** | No |

### variantAttributes

**GraphQL Field**: `ProductType.variantAttributes`

| Property | Value |
|---|---|
| **Type** | `object | object[]` |
| **Required** | No |

## pageTypes

| Property | Value |
|---|---|
| **Type** | `object | object[]` |
| **Required** | No |

## categories

| Property | Value |
|---|---|
| **Type** | `object | object[]` |
| **Required** | No |

## products

**Type**: `object[]` (optional)

Product catalog with variants and attributes

### name

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

### productType

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

### category

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

### description

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | No |

### attributes

| Property | Value |
|---|---|
| **Type** | `Record<string, string | string[]>` |
| **Required** | No |
| **Example** | `{"Color":"Red","Size":["S","M","L"]}` |

### channelListings

**Type**: `object[]` (optional)

#### channel

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

#### isPublished

| Property | Value |
|---|---|
| **Type** | `unknown` |
| **Required** | Yes |

#### visibleInListings

| Property | Value |
|---|---|
| **Type** | `unknown` |
| **Required** | Yes |

#### availableForPurchase

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | No |

#### publishedAt

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | No |

### variants

**Type**: `object[]` (required)

#### name

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

#### sku

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

#### weight

| Property | Value |
|---|---|
| **Type** | `number` |
| **Required** | No |

#### digital

| Property | Value |
|---|---|
| **Type** | `boolean` |
| **Required** | No |

#### attributes

| Property | Value |
|---|---|
| **Type** | `Record<string, string | string[]>` |
| **Required** | No |
| **Example** | `{"Color":"Red","Size":["S","M","L"]}` |

#### channelListings

**Type**: `object[]` (required)

##### channel

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

##### price

| Property | Value |
|---|---|
| **Type** | `number` |
| **Required** | Yes |

##### costPrice

| Property | Value |
|---|---|
| **Type** | `number` |
| **Required** | No |

## warehouses

**Type**: `object[]` (optional)

Warehouse definitions with address and shipping zone assignments

### name

**GraphQL Field**: `Warehouse.name`

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

### slug

**GraphQL Field**: `Warehouse.slug`

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

### email

**GraphQL Field**: `Warehouse.email`

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | No |
| **Format** | Email |

### isPrivate

**GraphQL Field**: `Warehouse.isPrivate`

| Property | Value |
|---|---|
| **Type** | `boolean` |
| **Required** | No |
| **Default** | `false` |

### clickAndCollectOption

**GraphQL Field**: `Warehouse.clickAndCollectOption`

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | No |
| **Enum** | `DISABLED`, `LOCAL`, `ALL` |
| **Default** | `DISABLED` |

### address

**GraphQL Field**: `Warehouse.address`

**Type**: `object` (required)

#### streetAddress1

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

#### streetAddress2

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | No |

#### city

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |
| **Note** | Case-insensitive comparison (API normalizes to uppercase) |

#### cityArea

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | No |

#### postalCode

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

#### country

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |
| **Format** | ISO 3166-1 alpha-2 country code |

#### countryArea

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | No |

#### companyName

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | No |

#### phone

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | No |

### shippingZones

**GraphQL Field**: `Warehouse.shippingZones`

| Property | Value |
|---|---|
| **Type** | `string[]` |
| **Required** | No |
| **Description** | Array of shipping zone slugs |

## shippingZones

**Type**: `object[]` (optional)

Shipping zone definitions with warehouse assignments and shipping methods

### name

**GraphQL Field**: `ShippingZone.name`

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

### slug

**GraphQL Field**: `ShippingZone.slug`

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

### description

**GraphQL Field**: `ShippingZone.description`

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | No |

### countries

**GraphQL Field**: `ShippingZone.countries`

| Property | Value |
|---|---|
| **Type** | `string[]` |
| **Required** | No |
| **Format** | ISO 3166-1 alpha-2 country codes |

### warehouses

**GraphQL Field**: `ShippingZone.warehouses`

| Property | Value |
|---|---|
| **Type** | `string[]` |
| **Required** | No |
| **Description** | Array of warehouse slugs |

### channels

**GraphQL Field**: `ShippingZone.channels`

| Property | Value |
|---|---|
| **Type** | `string[]` |
| **Required** | No |
| **Description** | Array of channel slugs |

### shippingMethods

**Type**: `object[]` (optional)

#### name

**GraphQL Field**: `ShippingMethod.name`

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

#### type

**GraphQL Field**: `ShippingMethod.type`

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | No |
| **Enum** | `PRICE`, `WEIGHT` |
| **Default** | `PRICE` |

#### maximumDeliveryDays

**GraphQL Field**: `ShippingMethod.maximumDeliveryDays`

| Property | Value |
|---|---|
| **Type** | `integer` |
| **Required** | No |

#### minimumDeliveryDays

**GraphQL Field**: `ShippingMethod.minimumDeliveryDays`

| Property | Value |
|---|---|
| **Type** | `integer` |
| **Required** | No |

#### channelListings

**Type**: `object[]` (optional)

##### channel

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |

##### price

| Property | Value |
|---|---|
| **Type** | `number` |
| **Required** | Yes |

##### maximumOrderPrice

| Property | Value |
|---|---|
| **Type** | `number` |
| **Required** | No |
| **Description** | Only for PRICE type methods |

##### minimumOrderPrice

| Property | Value |
|---|---|
| **Type** | `number` |
| **Required** | No |
| **Description** | Only for PRICE type methods |

##### maximumOrderWeight

**Type**: `object` (optional)

**Description**: Only for WEIGHT type methods

###### unit

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |
| **Enum** | `G`, `LB`, `OZ`, `KG`, `TONNE` |

###### value

| Property | Value |
|---|---|
| **Type** | `number` |
| **Required** | Yes |
| **Min** | `0` |

##### minimumOrderWeight

**Type**: `object` (optional)

**Description**: Only for WEIGHT type methods

###### unit

| Property | Value |
|---|---|
| **Type** | `string` |
| **Required** | Yes |
| **Enum** | `G`, `LB`, `OZ`, `KG`, `TONNE` |

###### value

| Property | Value |
|---|---|
| **Type** | `number` |
| **Required** | Yes |
| **Min** | `0` |


