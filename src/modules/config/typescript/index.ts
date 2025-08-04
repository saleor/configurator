/**
 * TypeScript Configuration API for Saleor Configurator
 *
 * This module provides a TypeScript-first API for creating Saleor configurations
 * with full type safety, autocompletion, and developer experience improvements.
 *
 * Example usage:
 * ```typescript
 * import { createSaleorConfig, attribute } from '@saleor/configurator'
 *
 * export default createSaleorConfig({
 *   shop: {
 *     defaultMailSenderName: "My Store",
 *     displayGrossPrices: true,
 *   },
 *   channels: [
 *     {
 *       name: "US Store",
 *       slug: "us",
 *       currencyCode: "USD",
 *       defaultCountry: "US",
 *       isActive: true,
 *     }
 *   ],
 *   productTypes: [
 *     {
 *       name: "Electronics",
 *       isShippingRequired: true,
 *       productAttributes: [
 *         attribute.plainText("Brand"),
 *         attribute.dropdown("Color", ["Red", "Blue", "Green"]),
 *         attribute.reference("Category", "CATEGORY"),
 *       ]
 *     }
 *   ]
 * })
 * ```
 */

// Main configuration builder
export { createSaleorConfig } from "./config-builder";

// Attribute helpers (most commonly needed)
export { attribute } from "./helpers";

// Types for advanced usage
export type {
  CategoryInput,
  ChannelInput,
  ConfigInput,
  CountryCode,
  CurrencyCode,
  PageTypeInput,
  ProductInput,
  ProductTypeInput,
  SaleorConfig,
  ShopInput,
} from "./types";
