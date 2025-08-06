import { z } from "zod";
import { attributeInputSchema } from "./attribute.schema";

// ProductType Update Schema - full state representation
const productTypeSchema = z.object({
  name: z.string().describe("Name of the product type (e.g., 'Book', 'T-Shirt', 'Electronics')"),
  isShippingRequired: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether products of this type require shipping (false for digital products)"),
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
  name: z.string().describe("Display name of the channel"),
  currencyCode: currencyCodeSchema.describe("Currency used for pricing in this channel"),
  defaultCountry: countryCodeSchema.describe("Default country for shipping and tax calculations"),
  slug: z.string().describe("URL-friendly identifier (used in URLs and API calls)"),
  isActive: z
    .boolean()
    .optional()
    .describe("Whether this channel is currently active and accepting orders")
    .default(false),
});

// Channel Update Schema - full state representation
const channelUpdateSchema = z.object({
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
      expireOrdersAfter: z.number().optional().describe("Minutes after which unpaid orders expire"),
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
});

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
  availableForPurchase: z
    .string()
    .optional()
    .describe("ISO date when the product becomes available for purchase"),
  publishedAt: z.string().optional().describe("ISO date when the product was published"),
});

const productVariantChannelListingSchema = z.object({
  channel: z.string().describe("Channel slug reference (e.g., 'default-channel')"),
  price: z.number().describe("Price in the channel's currency"),
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

const productSchema = z.object({
  name: z.string().describe("Product name as displayed to customers"),
  slug: z.string().describe("URL-friendly identifier (used in URLs and API calls)"),
  productType: z.string().describe("Reference to the product type (must match a productType name)"),
  category: z.string().describe("Reference to the product category (must match a category slug)"),
  attributes: z
    .record(z.string(), z.union([z.string(), z.array(z.string())]))
    .optional()
    .describe("Product-specific attribute values"),
  channelListings: z
    .array(productChannelListingSchema)
    .optional()
    .describe("Channel-specific settings like pricing and availability"),
  variants: z
    .array(productVariantSchema)
    .describe("Product variants with different SKUs, attributes, or pricing"),
});

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
    categories: z
      .array(categorySchema)
      .optional()
      .describe(
        "Hierarchical product categorization system. Categories can have subcategories and help organize products for navigation and filtering"
      ),
    products: z
      .array(productSchema)
      .optional()
      .describe(
        "Individual product definitions including variants, attributes, and channel-specific settings like pricing and availability"
      ),
  })
  .describe(
    "Configuration schema for Saleor Configurator YAML files. This defines all available fields, their types, and validation rules for managing Saleor e-commerce store configuration as code"
  );

export type SaleorConfig = z.infer<typeof configSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;
