/**
 * TypeScript interfaces for test configuration objects
 * These replace the 'any' types used throughout the test suite
 */

export interface ShopConfig {
  defaultMailSenderName?: string;
  defaultMailSenderAddress?: string;
  limitQuantityPerCheckout?: number;
  enableAccountConfirmationByEmail?: boolean;
  defaultWeightUnit?: string;
  [key: string]: unknown;
}

export interface ChannelSettings {
  allowUnpaidOrders?: boolean;
  includeDraftOrderInVouchers?: boolean;
  [key: string]: unknown;
}

export interface OrderSettings {
  automaticallyConfirmAllNewOrders?: boolean;
  automaticallyFulfillNonShippableGiftCard?: boolean;
  [key: string]: unknown;
}

export interface StockSettings {
  allocationStrategy?: string;
  [key: string]: unknown;
}

export interface ChannelConfig {
  slug: string;
  name: string;
  currencyCode?: string;
  defaultCountry?: string;
  isActive?: boolean;
  orderSettings?: OrderSettings;
  settings?: ChannelSettings;
  stockSettings?: StockSettings;
  warehouses?: string[];
  [key: string]: unknown;
}

export interface AddressConfig {
  streetAddress1?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  [key: string]: unknown;
}

export interface WarehouseConfig {
  slug: string;
  name: string;
  isPrivate?: boolean;
  clickAndCollectOption?: string;
  address?: AddressConfig;
  channels?: string[];
  [key: string]: unknown;
}

export interface ShippingZoneConfig {
  name: string;
  description?: string;
  countries?: string[];
  channels?: string[];
  [key: string]: unknown;
}

export interface TaxRateConfig {
  name: string;
  rate: number;
  [key: string]: unknown;
}

export interface TaxClassConfig {
  name: string;
  rates: TaxRateConfig[];
  [key: string]: unknown;
}

export interface TaxConfig {
  taxCalculationStrategy?: string;
  chargeTaxesOnShipping?: boolean;
  displayGrossPrices?: boolean;
  pricesEnteredWithTax?: boolean;
  taxClasses?: TaxClassConfig[];
  [key: string]: unknown;
}

export interface ProductConfig {
  slug: string;
  name: string;
  description?: string;
  category?: string;
  isPublished?: boolean;
  [key: string]: unknown;
}

export interface CategoryConfig {
  slug: string;
  name: string;
  description?: string;
  [key: string]: unknown;
}

export interface AttributeConfig {
  slug: string;
  name: string;
  type?: string;
  inputType?: string;
  [key: string]: unknown;
}

export interface ProductTypeConfig {
  slug: string;
  name: string;
  [key: string]: unknown;
}

export interface CollectionConfig {
  slug: string;
  name: string;
  [key: string]: unknown;
}

export interface PageConfig {
  slug: string;
  title: string;
  [key: string]: unknown;
}

export interface PageTypeConfig {
  slug: string;
  name: string;
  [key: string]: unknown;
}

export interface MenuConfig {
  slug: string;
  name: string;
  [key: string]: unknown;
}

/**
 * Main configuration interface that encompasses all possible config sections
 */
export interface TestConfig {
  shop?: ShopConfig;
  channels?: ChannelConfig[];
  warehouses?: WarehouseConfig[];
  shippingZones?: ShippingZoneConfig[];
  taxes?: TaxConfig;
  products?: ProductConfig[];
  productTypes?: ProductTypeConfig[];
  attributes?: AttributeConfig[];
  categories?: CategoryConfig[];
  collections?: CollectionConfig[];
  pages?: PageConfig[];
  pageTypes?: PageTypeConfig[];
  menus?: MenuConfig[];
  [key: string]: unknown;
}

/**
 * Configuration size parameters for generating large test configs
 */
export interface ConfigSizeParams {
  channels?: number;
  products?: number;
  warehouses?: number;
  categories?: number;
  attributes?: number;
  collections?: number;
  productTypes?: number;
  shippingZones?: number;
}

/**
 * Test scenario context for storing intermediate results
 */
export interface TestScenarioContext extends Map<string, unknown> {
  // Extends Map to store any intermediate test results
}

/**
 * Configuration mutator function type
 */
export type ConfigMutator = (config: TestConfig) => TestConfig;

/**
 * Configuration updater function type
 */
export type ConfigUpdater = (config: TestConfig) => TestConfig;
