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


