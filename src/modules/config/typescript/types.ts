/**
 * TypeScript Configuration Types
 *
 * Re-exports the existing Zod-inferred types for use in TypeScript configs
 */

import type { AttributeInput } from "../schema/attribute.schema";
import type {
  CategoryCreateInput,
  CategoryInput,
  CategoryUpdateInput,
  ChannelCreateInput,
  ChannelInput,
  ChannelUpdateInput,
  CountryCode,
  CurrencyCode,
  PageTypeInput,
  ProductInput,
  ProductTypeInput,
  ProductVariantInput,
  SaleorConfig,
  ShopInput,
} from "../schema/schema";

// Re-export all the types for TypeScript config users
export type {
  SaleorConfig,
  ShopInput,
  ChannelInput,
  ChannelCreateInput,
  ChannelUpdateInput,
  ProductTypeInput,
  PageTypeInput,
  CategoryInput,
  CategoryCreateInput,
  CategoryUpdateInput,
  ProductInput,
  ProductVariantInput,
  CountryCode,
  CurrencyCode,
  AttributeInput,
};

// Additional helper types for better DX
export type ConfigInput = SaleorConfig;

// Helper type for partial configurations during development
export type PartialConfig = Partial<SaleorConfig>;
