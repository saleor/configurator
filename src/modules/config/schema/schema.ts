import { z } from "zod";
import {
  attributeInputSchema,
  fullAttributeSchema,
  referencedAttributeSchema,
  simpleAttributeSchema,
} from "./attribute.schema";
import { contentAttributeSchema, productAttributeSchema } from "./global-attributes.schema";

// ProductType Update Schema - full state representation
const productTypeSchema = z.object({
  name: z.string().describe("Name of the product type (e.g., 'Book', 'T-Shirt', 'Electronics')"),
  isShippingRequired: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether products of this type require shipping (false for digital products)"),
  taxClass: z
    .string()
    .optional()
    .describe("Reference to a tax class name for default tax calculation on products of this type"),
  productAttributes: z
    .array(attributeInputSchema)
    .describe("Attributes that apply to the entire product (e.g., Brand, Material)")
    .optional(),
  variantAttributes: z
    .array(attributeInputSchema)
    .describe("Attributes that can vary between product variants (e.g., Size, Color)")
    .optional(),
});

export type ProductTypeInput = z.infer<typeof productTypeSchema>;

// PageType Create Schema - minimal fields for creation
const pageTypeCreateSchema = z.object({
  name: z
    .string()
    .describe("Name of the page type (e.g., 'Blog Post', 'Landing Page', 'Help Article')"),
});

// PageType Update Schema - full state representation
const pageTypeUpdateSchema = z.object({
  name: z
    .string()
    .describe("Name of the page type (e.g., 'Blog Post', 'Landing Page', 'Help Article')"),
  attributes: z
    .array(attributeInputSchema)
    .describe("Attributes available for pages of this type (e.g., Author, Published Date, Tags)"),
});

// Union type that accepts either create or update input
// Try update schema first (more specific) then create schema
const pageTypeSchema = pageTypeUpdateSchema.or(pageTypeCreateSchema);

export type PageTypeCreateInput = z.infer<typeof pageTypeCreateSchema>;
export type PageTypeUpdateInput = z.infer<typeof pageTypeUpdateSchema>;
export type PageTypeInput = z.infer<typeof pageTypeSchema>;

// ISO 3166-1 alpha-2 country codes
const countryCodeSchema = z.enum([
  "AD",
  "AE",
  "AF",
  "AG",
  "AI",
  "AL",
  "AM",
  "AO",
  "AQ",
  "AR",
  "AS",
  "AT",
  "AU",
  "AW",
  "AX",
  "AZ",
  "BA",
  "BB",
  "BD",
  "BE",
  "BF",
  "BG",
  "BH",
  "BI",
  "BJ",
  "BL",
  "BM",
  "BN",
  "BO",
  "BQ",
  "BR",
  "BS",
  "BT",
  "BV",
  "BW",
  "BY",
  "BZ",
  "CA",
  "CC",
  "CD",
  "CF",
  "CG",
  "CH",
  "CI",
  "CK",
  "CL",
  "CM",
  "CN",
  "CO",
  "CR",
  "CU",
  "CV",
  "CW",
  "CX",
  "CY",
  "CZ",
  "DE",
  "DJ",
  "DK",
  "DM",
  "DO",
  "DZ",
  "EC",
  "EE",
  "EG",
  "EH",
  "ER",
  "ES",
  "ET",
  "FI",
  "FJ",
  "FK",
  "FM",
  "FO",
  "FR",
  "GA",
  "GB",
  "GD",
  "GE",
  "GF",
  "GG",
  "GH",
  "GI",
  "GL",
  "GM",
  "GN",
  "GP",
  "GQ",
  "GR",
  "GS",
  "GT",
  "GU",
  "GW",
  "GY",
  "HK",
  "HM",
  "HN",
  "HR",
  "HT",
  "HU",
  "ID",
  "IE",
  "IL",
  "IM",
  "IN",
  "IO",
  "IQ",
  "IR",
  "IS",
  "IT",
  "JE",
  "JM",
  "JO",
  "JP",
  "KE",
  "KG",
  "KH",
  "KI",
  "KM",
  "KN",
  "KP",
  "KR",
  "KW",
  "KY",
  "KZ",
  "LA",
  "LB",
  "LC",
  "LI",
  "LK",
  "LR",
  "LS",
  "LT",
  "LU",
  "LV",
  "LY",
  "MA",
  "MC",
  "MD",
  "ME",
  "MF",
  "MG",
  "MH",
  "MK",
  "ML",
  "MM",
  "MN",
  "MO",
  "MP",
  "MQ",
  "MR",
  "MS",
  "MT",
  "MU",
  "MV",
  "MW",
  "MX",
  "MY",
  "MZ",
  "NA",
  "NC",
  "NE",
  "NF",
  "NG",
  "NI",
  "NL",
  "NO",
  "NP",
  "NR",
  "NU",
  "NZ",
  "OM",
  "PA",
  "PE",
  "PF",
  "PG",
  "PH",
  "PK",
  "PL",
  "PM",
  "PN",
  "PR",
  "PS",
  "PT",
  "PW",
  "PY",
  "QA",
  "RE",
  "RO",
  "RS",
  "RU",
  "RW",
  "SA",
  "SB",
  "SC",
  "SD",
  "SE",
  "SG",
  "SH",
  "SI",
  "SJ",
  "SK",
  "SL",
  "SM",
  "SN",
  "SO",
  "SR",
  "SS",
  "ST",
  "SV",
  "SX",
  "SY",
  "SZ",
  "TC",
  "TD",
  "TF",
  "TG",
  "TH",
  "TJ",
  "TK",
  "TL",
  "TM",
  "TN",
  "TO",
  "TR",
  "TT",
  "TV",
  "TW",
  "TZ",
  "UA",
  "UG",
  "UM",
  "US",
  "UY",
  "UZ",
  "VA",
  "VC",
  "VE",
  "VG",
  "VI",
  "VN",
  "VU",
  "WF",
  "WS",
  "YE",
  "YT",
  "ZA",
  "ZM",
  "ZW",
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
  // Balkan/Eastern European currencies
  "BAM", // Bosnia and Herzegovina Convertible Mark
  "HRK", // Croatian Kuna
  "RSD", // Serbian Dinar
]);

export type CurrencyCode = z.infer<typeof currencyCodeSchema>;

// Tax Configuration Schema - defined early to be used in channel schema
const taxCalculationStrategySchema = z.enum(["FLAT_RATES", "TAX_APP"]);

const taxConfigurationSchema = z
  .object({
    taxCalculationStrategy: taxCalculationStrategySchema
      .optional()
      .describe("Method for calculating taxes - flat rates or external tax app"),
    chargeTaxes: z.boolean().optional().describe("Whether to charge taxes in this channel"),
    displayGrossPrices: z
      .boolean()
      .optional()
      .describe("Whether to display prices including taxes"),
    pricesEnteredWithTax: z
      .boolean()
      .optional()
      .describe("Whether prices are entered including taxes"),
    taxAppId: z
      .string()
      .optional()
      .describe("ID of the external tax application when using TAX_APP strategy"),
  })
  .strict();

export type TaxConfigurationInput = z.infer<typeof taxConfigurationSchema>;

// Channel Create Schema - minimal fields for creation
const channelCreateSchema = z
  .object({
    name: z.string().describe("Display name of the channel"),
    currencyCode: currencyCodeSchema.describe("Currency used for pricing in this channel"),
    defaultCountry: countryCodeSchema.describe("Default country for shipping and tax calculations"),
    slug: z.string().describe("URL-friendly identifier (used in URLs and API calls)"),
    isActive: z
      .boolean()
      .optional()
      .describe("Whether this channel is currently active and accepting orders")
      .default(false),
  })
  .strict();

// Channel Update Schema - full state representation
const channelUpdateSchema = z
  .object({
    name: z.string().describe("Display name of the channel"),
    currencyCode: currencyCodeSchema.describe("Currency used for pricing in this channel"),
    defaultCountry: countryCodeSchema.describe("Default country for shipping and tax calculations"),
    slug: z.string().describe("URL-friendly identifier (used in URLs and API calls)"),
    isActive: z
      .boolean()
      .optional()
      .describe("Whether this channel is currently active and accepting orders")
      .default(false),
    settings: z
      .object({
        allocationStrategy: z
          .enum(["PRIORITIZE_SORTING_ORDER", "PRIORITIZE_HIGH_STOCK"])
          .optional()
          .describe("Strategy for allocating stock when multiple locations have inventory"),
        automaticallyConfirmAllNewOrders: z
          .boolean()
          .optional()
          .describe("Automatically confirm all new orders without manual review"),
        automaticallyFulfillNonShippableGiftCard: z
          .boolean()
          .optional()
          .describe("Automatically fulfill gift cards and other non-shippable items"),
        expireOrdersAfter: z
          .number()
          .optional()
          .describe("Minutes after which unpaid orders expire"),
        deleteExpiredOrdersAfter: z
          .number()
          .optional()
          .describe("Days after which expired orders are permanently deleted"),
        markAsPaidStrategy: z
          .enum(["TRANSACTION_FLOW", "PAYMENT_FLOW"])
          .optional()
          .describe(
            "Strategy for marking orders as paid - transaction flow (recommended) or legacy payment flow"
          ),
        allowUnpaidOrders: z
          .boolean()
          .optional()
          .describe("Allow creation of orders without immediate payment"),
        includeDraftOrderInVoucherUsage: z
          .boolean()
          .optional()
          .describe("Include draft orders when calculating voucher usage limits"),
        useLegacyErrorFlow: z
          .boolean()
          .optional()
          .describe("Use legacy error handling for checkout (for backward compatibility)"),
        automaticallyCompleteFullyPaidCheckouts: z
          .boolean()
          .optional()
          .describe("Automatically complete checkouts when payment is fully captured"),
        defaultTransactionFlowStrategy: z
          .enum(["AUTHORIZATION", "CHARGE"])
          .optional()
          .describe("Default payment flow - authorize first then capture, or charge immediately"),
      })
      .optional()
      .describe("Advanced channel configuration options"),
    taxConfiguration: taxConfigurationSchema
      .optional()
      .describe("Tax settings specific to this channel"),
  })
  .strict();

// Union type that accepts either create or update input
// Try update schema first (more specific) then create schema
const channelSchema = channelUpdateSchema.or(channelCreateSchema);

export type ChannelCreateInput = z.infer<typeof channelCreateSchema>;
export type ChannelUpdateInput = z.infer<typeof channelUpdateSchema>;
export type ChannelInput = z.infer<typeof channelSchema>;

const weightUnitEnum = z.enum(["KG", "LB", "OZ", "G", "TONNE"]);

const shopSchema = z.object({
  headerText: z.string().optional().describe("Text displayed in the shop header"),
  description: z.string().optional().describe("General description of the shop"),
  trackInventoryByDefault: z
    .boolean()
    .optional()
    .describe("Whether new products should track inventory by default"),
  defaultWeightUnit: weightUnitEnum.optional().describe("Default unit for product weights"),
  automaticFulfillmentDigitalProducts: z
    .boolean()
    .optional()
    .describe("Automatically fulfill digital products upon payment"),
  fulfillmentAutoApprove: z.boolean().optional().describe("Automatically approve fulfillments"),
  fulfillmentAllowUnpaid: z.boolean().optional().describe("Allow fulfillment of unpaid orders"),
  defaultDigitalMaxDownloads: z
    .number()
    .optional()
    .nullable()
    .describe("Maximum downloads allowed for digital products"),
  defaultDigitalUrlValidDays: z
    .number()
    .optional()
    .nullable()
    .describe("Days that download links remain valid"),
  defaultMailSenderName: z
    .string()
    .optional()
    .nullable()
    .describe("Default name for outgoing emails"),
  defaultMailSenderAddress: z
    .string()
    .optional()
    .nullable()
    .describe("Default email address for outgoing emails"),
  customerSetPasswordUrl: z
    .string()
    .optional()
    .describe("URL where customers can set their password"),
  reserveStockDurationAnonymousUser: z
    .number()
    .optional()
    .nullable()
    .describe("Minutes to reserve stock for anonymous users"),
  reserveStockDurationAuthenticatedUser: z
    .number()
    .optional()
    .nullable()
    .describe("Minutes to reserve stock for authenticated users"),
  limitQuantityPerCheckout: z.number().optional().describe("Maximum quantity per checkout"),
  enableAccountConfirmationByEmail: z
    .boolean()
    .optional()
    .describe("Require email confirmation for new accounts"),
  allowLoginWithoutConfirmation: z
    .boolean()
    .optional()
    .describe("Allow login before email confirmation"),
  displayGrossPrices: z.boolean().optional().describe("Show prices including taxes"),
});

export type ShopInput = z.infer<typeof shopSchema>;

// Category Create Schema - minimal fields for creation
const categoryCreateSchema = z.object({
  name: z.string().describe("Display name of the category"),
  slug: z.string().describe("URL-friendly identifier (used in URLs and API calls)"),
});

// Category Update Schema - full state representation with subcategories
const baseCategoryUpdateSchema = z.object({
  name: z.string().describe("Display name of the category"),
  slug: z.string().describe("URL-friendly identifier (used in URLs and API calls)"),
});

type CategoryUpdate = z.infer<typeof baseCategoryUpdateSchema> & {
  subcategories?: CategoryUpdate[];
};

const categoryUpdateSchema: z.ZodType<CategoryUpdate> = baseCategoryUpdateSchema.extend({
  subcategories: z
    .lazy(() => categoryUpdateSchema.array())
    .optional()
    .describe("Child categories nested under this category"),
});

// Union type that accepts either create or update input
type CategoryCreate = z.infer<typeof categoryCreateSchema>;
type Category = CategoryCreate | CategoryUpdate;

const categorySchema: z.ZodType<Category> = categoryUpdateSchema.or(categoryCreateSchema);

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = CategoryUpdate;
export type CategoryInput = Category;

const productChannelListingSchema = z.object({
  channel: z.string().describe("Channel slug reference (e.g., 'default-channel')"),
  isPublished: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether the product is published and visible in this channel"),
  visibleInListings: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether the product appears in category listings"),
  isAvailableForPurchase: z
    .boolean()
    .optional()
    .describe("Whether the product is available for purchase in this channel"),
  availableForPurchaseAt: z
    .string()
    .optional()
    .describe("ISO date when the product becomes available for purchase"),
  publishedAt: z.string().optional().describe("ISO date when the product was published"),
});

const productVariantChannelListingSchema = z.object({
  channel: z.string().describe("Channel slug reference (e.g., 'default-channel')"),
  price: z.number().optional().describe("Price in the channel's currency"),
  costPrice: z
    .number()
    .optional()
    .describe("Cost price for internal tracking and profit calculations"),
});

const productVariantSchema = z.object({
  name: z.string().describe("Variant name (e.g., 'Size M', 'Red Color')"),
  sku: z.string().describe("Stock keeping unit - unique identifier for this variant"),
  weight: z.number().optional().describe("Product weight (in the shop's default unit)"),
  digital: z
    .boolean()
    .optional()
    .describe("Whether this is a digital product (no shipping required)"),
  attributes: z
    .record(z.string(), z.union([z.string(), z.array(z.string())]))
    .optional()
    .describe("Variant-specific attribute values"),
  channelListings: z
    .array(productVariantChannelListingSchema)
    .optional()
    .describe("Channel-specific pricing for this variant"),
});

const productMediaSchema = z.object({
  externalUrl: z
    .string()
    .url()
    .describe("Public URL to an externally hosted product media asset (image or video)"),
  alt: z.string().optional().describe("Accessible alternative text for the media"),
});

const productSchema = z.object({
  name: z.string().describe("Product name as displayed to customers"),
  slug: z.string().describe("URL-friendly identifier (used in URLs and API calls)"),
  description: z.string().optional().describe("Product description"),
  productType: z.string().describe("Reference to the product type (must match a productType name)"),
  category: z.string().describe("Reference to the product category (must match a category slug)"),
  taxClass: z
    .string()
    .optional()
    .describe("Reference to a tax class name - overrides the product type's default tax class"),
  attributes: z
    .record(z.string(), z.union([z.string(), z.array(z.string())]))
    .optional()
    .describe("Product-specific attribute values"),
  channelListings: z
    .array(productChannelListingSchema)
    .optional()
    .describe("Channel-specific settings like pricing and availability"),
  media: z
    .array(productMediaSchema)
    .optional()
    .describe(
      "External media assets associated with the product. Provide an externalUrl for images or videos hosted outside of Saleor"
    ),
  variants: z
    .array(productVariantSchema)
    .describe("Product variants with different SKUs, attributes, or pricing"),
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
  email: z
    .union([z.string().email(), z.literal("")])
    .optional()
    .describe("Warehouse.email"),
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
  value: z.number().nonnegative(),
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

// Tax Class Schema
const taxClassCountryRateSchema = z.object({
  countryCode: countryCodeSchema.describe("ISO 3166-1 alpha-2 country code"),
  rate: z.number().min(0).max(100).describe("Tax rate as a percentage (0-100)"),
});

const taxClassSchema = z.object({
  name: z.string().min(1).describe("TaxClass.name - Unique identifier for the tax class"),
  countryRates: z
    .array(taxClassCountryRateSchema)
    .optional()
    .describe("TaxClass.countries - Tax rates per country for this tax class"),
});

export type TaxClassCountryRateInput = z.infer<typeof taxClassCountryRateSchema>;
export type TaxClassInput = z.infer<typeof taxClassSchema>;

// Collection Schema
const collectionChannelListingSchema = z.object({
  channelSlug: z.string().describe("CollectionChannelListing.channelSlug"),
  isPublished: z.boolean().optional().describe("CollectionChannelListing.isPublished"),
  publishedAt: z.string().optional().describe("CollectionChannelListing.publishedAt"),
});

const collectionSchema = z.object({
  name: z.string().describe("Collection.name"),
  slug: z.string().describe("Collection.slug"),
  description: z.string().optional().describe("Collection.description"),
  isPublished: z.boolean().optional().describe("Collection.isPublished"),
  products: z
    .array(z.string())
    .optional()
    .describe("Collection.products - References to product slugs"),
  channelListings: z
    .array(collectionChannelListingSchema)
    .optional()
    .describe("Collection.channelListings - Channel-specific visibility settings"),
});

export type CollectionInput = z.infer<typeof collectionSchema>;

// Menu Schema
interface MenuItemInputSchema {
  name: string;
  url?: string;
  category?: string;
  collection?: string;
  page?: string;
  children?: MenuItemInputSchema[];
}

const menuItemSchema: z.ZodType<MenuItemInputSchema> = z.lazy(() =>
  z.object({
    name: z.string().describe("MenuItem.name"),
    url: z.string().optional().describe("MenuItem.url - External URL"),
    category: z.string().optional().describe("MenuItem.category - Reference to category slug"),
    collection: z
      .string()
      .optional()
      .describe("MenuItem.collection - Reference to collection slug"),
    page: z.string().optional().describe("MenuItem.page - Reference to page/model slug"),
    children: z.array(menuItemSchema).optional().describe("MenuItem.children - Nested menu items"),
  })
);

const menuSchema = z.object({
  name: z.string().describe("Menu.name"),
  slug: z.string().describe("Menu.slug"),
  items: z.array(menuItemSchema).optional().describe("Menu.items - Top-level menu items"),
});

export type MenuInput = z.infer<typeof menuSchema>;

// Model Schema (renamed from Page)
const modelSchema = z.object({
  title: z.string().describe("Model.title"),
  slug: z.string().describe("Model.slug"),
  modelType: z.string().describe("Model.modelType - Reference to model type name"),
  content: z.string().optional().describe("Model.content - Page content"),
  isPublished: z.boolean().optional().describe("Model.isPublished"),
  publishedAt: z.string().optional().describe("Model.publishedAt"),
  attributes: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
    .optional()
    .describe("Model.attributes - Attribute values keyed by attribute slug"),
});

export type ModelInput = z.infer<typeof modelSchema>;

// Model Type Schema (renamed from PageType)
const modelTypeSchema = z.object({
  name: z.string().describe("ModelType.name"),
  slug: z.string().optional().describe("ModelType.slug"),
  attributes: z
    .array(z.union([simpleAttributeSchema, referencedAttributeSchema]))
    .optional()
    .describe("ModelType.attributes"),
});

export type ModelTypeInput = z.infer<typeof modelTypeSchema>;

// TODO: config schema should only use the full state representation of the entities, not the create/update schemas
export const configSchema = z
  .object({
    shop: shopSchema
      .optional()
      .describe(
        "Global shop configuration settings that apply across all channels and define store-wide behavior"
      ),
    channels: z
      .array(channelSchema)
      .optional()
      .describe(
        "Sales channels define different storefronts or markets with their own currency, country, and settings. Each channel can have different pricing, availability, and configuration"
      ),
    warehouses: z
      .array(warehouseSchema)
      .optional()
      .describe(
        "Warehouse definitions with physical locations for storing and fulfilling products. Each warehouse can be assigned to shipping zones and channels for multi-location fulfillment"
      ),
    shippingZones: z
      .array(shippingZoneSchema)
      .optional()
      .describe(
        "Shipping zone configurations that define geographical regions, associated warehouses, and available shipping methods with pricing rules"
      ),
    taxClasses: z
      .array(taxClassSchema)
      .optional()
      .describe(
        "Tax class definitions that specify tax rates per country. Tax classes can be assigned to products, product types, and shipping methods to control tax calculation"
      ),
    productAttributes: z
      .array(productAttributeSchema)
      .optional()
      .describe(
        "Product attributes (PRODUCT_TYPE in Saleor API) that can be referenced by productTypes. These are created before productTypes are processed."
      ),
    contentAttributes: z
      .array(contentAttributeSchema)
      .optional()
      .describe(
        "Content attributes (PAGE_TYPE in Saleor API) that can be referenced by modelTypes. These are created before modelTypes are processed."
      ),
    productTypes: z
      .array(productTypeSchema)
      .optional()
      .describe(
        "Product type templates that define the structure and attributes for groups of similar products. Each product must be assigned to a product type"
      ),
    pageTypes: z
      .array(pageTypeSchema)
      .optional()
      .describe(
        "Page type templates that define the structure and attributes for CMS pages. Useful for creating structured content like blog posts, landing pages, etc"
      ),
    modelTypes: z
      .array(modelTypeSchema)
      .optional()
      .describe(
        "Model type templates that define the structure and attributes for content models (renamed from page types). Useful for creating structured content with custom fields"
      ),
    categories: z
      .array(categorySchema)
      .optional()
      .describe(
        "Hierarchical product categorization system. Categories can have subcategories and help organize products for navigation and filtering"
      ),
    collections: z
      .array(collectionSchema)
      .optional()
      .describe(
        "Product collections for grouping and merchandising products. Collections can be published to specific channels and contain curated product lists"
      ),
    products: z
      .array(productSchema)
      .optional()
      .describe(
        "Individual product definitions including variants, attributes, and channel-specific settings like pricing and availability"
      ),
    models: z
      .array(modelSchema)
      .optional()
      .describe(
        "Content models/pages with structured data based on model types. Models can have custom attributes and content for flexible CMS functionality"
      ),
    menus: z
      .array(menuSchema)
      .optional()
      .describe(
        "Navigation menu structures with hierarchical menu items. Menu items can link to categories, collections, pages, or external URLs"
      ),
    attributes: z
      .array(fullAttributeSchema)
      .optional()
      .describe(
        "Unassigned attributes (typically PRODUCT_TYPE) that exist globally but are not assigned to any product type. These will be created/updated without assignment"
      ),
  })
  .describe(
    "Configuration schema for Saleor Configurator YAML files. This defines all available fields, their types, and validation rules for managing Saleor e-commerce store configuration as code"
  );

export type SaleorConfig = z.infer<typeof configSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;
export type ProductMediaInput = z.infer<typeof productMediaSchema>;
