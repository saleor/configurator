import { z } from "zod";
import { attributeInputSchema } from "./attribute.schema";

// ProductType Update Schema - full state representation
const productTypeSchema = z.object({
  name: z.string().describe("ProductType.name"),
  isShippingRequired: z
    .boolean()
    .optional()
    .default(false)
    .describe("ProductType.isShippingRequired"),
  productAttributes: z
    .array(attributeInputSchema)
    .describe("ProductType.productAttributes")
    .optional(),
  variantAttributes: z
    .array(attributeInputSchema)
    .describe("ProductType.variantAttributes")
    .optional(),
});

export type ProductTypeInput = z.infer<typeof productTypeSchema>;

// PageType Create Schema - minimal fields for creation
const pageTypeCreateSchema = z.object({
  name: z.string().describe("PageType.name"),
});

// PageType Update Schema - full state representation
const pageTypeUpdateSchema = z.object({
  name: z.string().describe("PageType.name"),
  attributes: z.array(attributeInputSchema).describe("PageType.attributes"),
});

// Union type that accepts either create or update input
// Try update schema first (more specific) then create schema
const pageTypeSchema = pageTypeUpdateSchema.or(pageTypeCreateSchema);

export type PageTypeCreateInput = z.infer<typeof pageTypeCreateSchema>;
export type PageTypeUpdateInput = z.infer<typeof pageTypeUpdateSchema>;
export type PageTypeInput = z.infer<typeof pageTypeSchema>;

const countryCodeSchema = z.enum([
  "US",
  "GB",
  "DE",
  "FR",
  "ES",
  "IT",
  "PL",
  "NL",
  "BE",
  "CZ",
  "PT",
  "SE",
  "AT",
  "CH",
  "DK",
  "FI",
  "NO",
  "IE",
  "AU",
  "JP",
  "BR",
  "RU",
  "CN",
  "IN",
  "CA",
  "AE",
  "MX",
  "KR",
  "SG",
  "HK",
  "MY",
  "TH",
  "ID",
  "PH",
  "VN",
  "EG",
  "SA",
  "IL",
  "TR",
  "ZA",
  "NG",
  "AR",
  "CL",
  "CO",
  "PE",
  "NZ",
]);

export type CountryCode = z.infer<typeof countryCodeSchema>;

// Currency Code Schema - common currency codes
const currencyCodeSchema = z.enum([
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "CNY",
  "SEK",
  "NZD",
  "MXN",
  "SGD",
  "HKD",
  "NOK",
  "KRW",
  "TRY",
  "RUB",
  "INR",
  "BRL",
  "ZAR",
  "PLN",
  "CZK",
  "DKK",
  "HUF",
  "ILS",
  "THB",
  "IDR",
  "MYR",
  "PHP",
  "VND",
  "EGP",
  "SAR",
  "AED",
  "NGN",
  "ARS",
  "CLP",
  "COP",
  "PEN",
]);

export type CurrencyCode = z.infer<typeof currencyCodeSchema>;

// Channel Create Schema - minimal fields for creation
const channelCreateSchema = z.object({
  name: z.string().describe("Channel.name"),
  currencyCode: currencyCodeSchema.describe("Channel.currencyCode"),
  defaultCountry: countryCodeSchema.describe("Channel.defaultCountry.code"),
  slug: z.string().describe("Channel.slug"),
});

// Channel Update Schema - full state representation
const channelUpdateSchema = z.object({
  name: z.string().describe("Channel.name"),
  currencyCode: currencyCodeSchema.describe("Channel.currencyCode"),
  defaultCountry: countryCodeSchema.describe("Channel.defaultCountry.code"),
  slug: z.string().describe("Channel.slug"),
  isActive: z.boolean().optional().describe("Channel.isActive").default(false), // Channels inactive by default
  settings: z
    .object({
      allocationStrategy: z
        .enum(["PRIORITIZE_SORTING_ORDER", "PRIORITIZE_HIGH_STOCK"])
        .optional()
        .describe("Channel.stockSettings.allocationStrategy"),
      automaticallyConfirmAllNewOrders: z
        .boolean()
        .optional()
        .describe("Channel.orderSettings.automaticallyConfirmAllNewOrders"),
      automaticallyFulfillNonShippableGiftCard: z
        .boolean()
        .optional()
        .describe("Channel.orderSettings.automaticallyFulfillNonShippableGiftCard"),
      expireOrdersAfter: z.number().optional().describe("Channel.orderSettings.expireOrdersAfter"),
      deleteExpiredOrdersAfter: z
        .number()
        .optional()
        .describe("Channel.orderSettings.deleteExpiredOrdersAfter"),
      markAsPaidStrategy: z
        .enum(["TRANSACTION_FLOW", "PAYMENT_FLOW"])
        .optional()
        .describe("Channel.orderSettings.markAsPaidStrategy"),
      allowUnpaidOrders: z.boolean().optional().describe("Channel.orderSettings.allowUnpaidOrders"),
      includeDraftOrderInVoucherUsage: z
        .boolean()
        .optional()
        .describe("Channel.orderSettings.includeDraftOrderInVoucherUsage"),
      useLegacyErrorFlow: z
        .boolean()
        .optional()
        .describe("Channel.checkoutSettings.useLegacyErrorFlow"),
      automaticallyCompleteFullyPaidCheckouts: z
        .boolean()
        .optional()
        .describe("Channel.checkoutSettings.automaticallyCompleteFullyPaidCheckouts"),
      defaultTransactionFlowStrategy: z
        .enum(["AUTHORIZATION", "CHARGE"])
        .optional()
        .describe("Channel.paymentSettings.defaultTransactionFlowStrategy"),
    })
    .optional()
    .describe("Channel settings"),
});

// Union type that accepts either create or update input
// Try update schema first (more specific) then create schema
const channelSchema = channelUpdateSchema.or(channelCreateSchema);

export type ChannelCreateInput = z.infer<typeof channelCreateSchema>;
export type ChannelUpdateInput = z.infer<typeof channelUpdateSchema>;
export type ChannelInput = z.infer<typeof channelSchema>;

const weightUnitEnum = z.enum(["KG", "LB", "OZ", "G", "TONNE"]);

const shopSchema = z.object({
  headerText: z.string().optional().describe("Shop.headerText"),
  description: z.string().optional().describe("Shop.description"),
  trackInventoryByDefault: z.boolean().optional().describe("Shop.trackInventoryByDefault"),
  defaultWeightUnit: weightUnitEnum.optional().describe("Shop.defaultWeightUnit"),
  automaticFulfillmentDigitalProducts: z
    .boolean()
    .optional()
    .describe("Shop.automaticFulfillmentDigitalProducts"),
  fulfillmentAutoApprove: z.boolean().optional().describe("Shop.fulfillmentAutoApprove"),
  fulfillmentAllowUnpaid: z.boolean().optional().describe("Shop.fulfillmentAllowUnpaid"),
  defaultDigitalMaxDownloads: z
    .number()
    .optional()
    .nullable()
    .describe("Shop.defaultDigitalMaxDownloads"),
  defaultDigitalUrlValidDays: z
    .number()
    .optional()
    .nullable()
    .describe("Shop.defaultDigitalUrlValidDays"),
  defaultMailSenderName: z.string().optional().nullable().describe("Shop.defaultMailSenderName"),
  defaultMailSenderAddress: z
    .string()
    .optional()
    .nullable()
    .describe("Shop.defaultMailSenderAddress"),
  customerSetPasswordUrl: z.string().optional().describe("Shop.customerSetPasswordUrl"),
  reserveStockDurationAnonymousUser: z
    .number()
    .optional()
    .nullable()
    .describe("Shop.reserveStockDurationAnonymousUser"),
  reserveStockDurationAuthenticatedUser: z
    .number()
    .optional()
    .nullable()
    .describe("Shop.reserveStockDurationAuthenticatedUser"),
  limitQuantityPerCheckout: z.number().optional().describe("Shop.limitQuantityPerCheckout"),
  enableAccountConfirmationByEmail: z
    .boolean()
    .optional()
    .describe("Shop.enableAccountConfirmationByEmail"),
  allowLoginWithoutConfirmation: z
    .boolean()
    .optional()
    .describe("Shop.allowLoginWithoutConfirmation"),
  displayGrossPrices: z.boolean().optional().describe("Shop.displayGrossPrices"),
});

export type ShopInput = z.infer<typeof shopSchema>;

// Category Create Schema - minimal fields for creation
const categoryCreateSchema = z.object({
  name: z.string().describe("Category.name"),
  slug: z.string().describe("Category.slug"),
});

// Category Update Schema - full state representation with subcategories
const baseCategoryUpdateSchema = z.object({
  name: z.string().describe("Category.name"),
  slug: z.string().describe("Category.slug"),
});

type CategoryUpdate = z.infer<typeof baseCategoryUpdateSchema> & {
  subcategories?: CategoryUpdate[];
};

const categoryUpdateSchema: z.ZodType<CategoryUpdate> = baseCategoryUpdateSchema.extend({
  subcategories: z
    .lazy(() => categoryUpdateSchema.array())
    .optional()
    .describe("Category.children"),
});

// Union type that accepts either create or update input
type CategoryCreate = z.infer<typeof categoryCreateSchema>;
type Category = CategoryCreate | CategoryUpdate;

const categorySchema: z.ZodType<Category> = categoryUpdateSchema.or(categoryCreateSchema);

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = CategoryUpdate;
export type CategoryInput = Category;

const productChannelListingSchema = z.object({
  channel: z.string(), // Channel slug reference (e.g., "poland")
  isPublished: z.boolean().optional().default(true),
  visibleInListings: z.boolean().optional().default(true),
  availableForPurchase: z.string().optional(), // ISO date string
  publishedAt: z.string().optional(), // ISO date string
});

const productVariantChannelListingSchema = z.object({
  channel: z.string(), // Channel slug reference (e.g., "poland")
  price: z.number(),
  costPrice: z.number().optional(),
});

const productVariantSchema = z.object({
  name: z.string(),
  sku: z.string(),
  weight: z.number().optional(),
  digital: z.boolean().optional(),
  attributes: z.record(z.union([z.string(), z.array(z.string())])).optional(),
  channelListings: z.array(productVariantChannelListingSchema).optional(),
});

const productSchema = z.object({
  name: z.string(),
  slug: z.string(),
  productType: z.string(),
  category: z.string(),
  attributes: z.record(z.union([z.string(), z.array(z.string())])).optional(),
  channelListings: z.array(productChannelListingSchema).optional(),
  variants: z.array(productVariantSchema),
});

// Warehouse Schema
const warehouseClickAndCollectOptionSchema = z.enum(["DISABLED", "LOCAL", "ALL"]);

const warehouseAddressSchema = z.object({
  streetAddress1: z.string().describe("Address.streetAddress1"),
  streetAddress2: z.string().optional().describe("Address.streetAddress2"),
  city: z.string().describe("Address.city"),
  cityArea: z.string().optional().describe("Address.cityArea"),
  postalCode: z.string().optional().describe("Address.postalCode"),
  country: countryCodeSchema.describe("Address.country"),
  countryArea: z.string().optional().describe("Address.countryArea"),
  companyName: z.string().optional().describe("Address.companyName"),
  phone: z.string().optional().describe("Address.phone"),
});

const warehouseSchema = z.object({
  name: z.string().describe("Warehouse.name"),
  slug: z.string().describe("Warehouse.slug"),
  email: z.string().email().describe("Warehouse.email"),
  isPrivate: z.boolean().optional().default(false).describe("Warehouse.isPrivate"),
  address: warehouseAddressSchema.describe("Warehouse.address"),
  clickAndCollectOption: warehouseClickAndCollectOptionSchema
    .optional()
    .default("DISABLED")
    .describe("Warehouse.clickAndCollectOption"),
  shippingZones: z.array(z.string()).optional().describe("Warehouse.shippingZones"), // References to shipping zone names
});

export type WarehouseInput = z.infer<typeof warehouseSchema>;

// Shipping Zone Schema
const shippingMethodTypeSchema = z.enum(["PRICE", "WEIGHT"]);

const weightUnitSchema = z.enum(["KG", "LB", "OZ", "G", "TONNE"]);

const weightSchema = z.object({
  unit: weightUnitSchema,
  value: z.number().positive(),
});

const shippingMethodChannelListingSchema = z.object({
  channel: z.string().describe("ShippingMethodChannelListing.channel"), // Channel slug reference
  price: z.number().nonnegative().describe("ShippingMethodChannelListing.price"),
  currency: currencyCodeSchema.optional().describe("ShippingMethodChannelListing.currency"),
  minimumOrderPrice: z
    .number()
    .nonnegative()
    .optional()
    .describe("ShippingMethodChannelListing.minimumOrderPrice"),
  maximumOrderPrice: z
    .number()
    .nonnegative()
    .optional()
    .describe("ShippingMethodChannelListing.maximumOrderPrice"),
});

const shippingMethodSchema = z.object({
  name: z.string().describe("ShippingMethod.name"),
  description: z.string().optional().describe("ShippingMethod.description"),
  type: shippingMethodTypeSchema.describe("ShippingMethod.type"),
  active: z.boolean().optional().default(true).describe("ShippingMethod.active"),
  minimumDeliveryDays: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("ShippingMethod.minimumDeliveryDays"),
  maximumDeliveryDays: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("ShippingMethod.maximumDeliveryDays"),
  minimumOrderWeight: weightSchema.optional().describe("ShippingMethod.minimumOrderWeight"),
  maximumOrderWeight: weightSchema.optional().describe("ShippingMethod.maximumOrderWeight"),
  taxClass: z.string().optional().describe("ShippingMethod.taxClass"), // Tax class name reference
  channelListings: z
    .array(shippingMethodChannelListingSchema)
    .optional()
    .describe("ShippingMethod.channelListings"),
});

const shippingZoneSchema = z.object({
  name: z.string().describe("ShippingZone.name"),
  description: z.string().optional().describe("ShippingZone.description"),
  default: z.boolean().optional().default(false).describe("ShippingZone.default"),
  countries: z.array(countryCodeSchema).describe("ShippingZone.countries"),
  warehouses: z.array(z.string()).optional().describe("ShippingZone.warehouses"), // References to warehouse slugs
  channels: z.array(z.string()).optional().describe("ShippingZone.channels"), // References to channel slugs
  shippingMethods: z
    .array(shippingMethodSchema)
    .optional()
    .describe("ShippingZone.shippingMethods"),
});

export type ShippingZoneInput = z.infer<typeof shippingZoneSchema>;
export type ShippingMethodInput = z.infer<typeof shippingMethodSchema>;

// TODO: config schema should only use the full state representation of the entities, not the create/update schemas
export const configSchema = z
  .object({
    shop: shopSchema.optional().describe("Shop"),
    channels: z.array(channelSchema).optional().describe("Channel"),
    warehouses: z.array(warehouseSchema).optional().describe("Warehouse"),
    shippingZones: z.array(shippingZoneSchema).optional().describe("ShippingZone"),
    productTypes: z.array(productTypeSchema).optional().describe("ProductType"),
    pageTypes: z.array(pageTypeSchema).optional().describe("PageType"),
    categories: z.array(categorySchema).optional().describe("Category"),
    products: z.array(productSchema).optional().describe("Product"),
  })
  .strict()
  .describe("Configuration");

export type SaleorConfig = z.infer<typeof configSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;
