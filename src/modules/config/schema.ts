import { z } from "zod";

const attributeValueSchema = z.object({
  name: z.string(),
});

const attributeTypeSchema = z.enum(["PRODUCT_TYPE", "PAGE_TYPE"]);

// Base attribute fields that are common to all types
const baseAttributeSchema = z.object({
  name: z.string(),
});

// Schema for attributes with multiple values (dropdown, multiselect, swatch)
const multipleValuesAttributeSchema = baseAttributeSchema.extend({
  inputType: z.enum(["DROPDOWN", "MULTISELECT", "SWATCH"]),
  values: z.array(attributeValueSchema),
});

// Schema for reference type attributes
const referenceAttributeSchema = baseAttributeSchema.extend({
  inputType: z.literal("REFERENCE"),
  entityType: z.enum(["PAGE", "PRODUCT", "PRODUCT_VARIANT"]).optional(),
});

// Schema for simple value attributes
const simpleAttributeSchema = baseAttributeSchema.extend({
  inputType: z.enum([
    "PLAIN_TEXT",
    "NUMERIC",
    "DATE",
    "BOOLEAN",
    "RICH_TEXT",
    "DATE_TIME",
    "FILE",
  ]),
});

// Combined attribute schema using discriminted union based on inputType
const noTypeAttributeSchema = z.discriminatedUnion("inputType", [
  multipleValuesAttributeSchema,
  referenceAttributeSchema,
  simpleAttributeSchema,
]);

const attributeSchema = noTypeAttributeSchema.and(
  z.object({
    type: attributeTypeSchema,
  })
);

export type AttributeInput = z.infer<typeof attributeSchema>;
export type AttributeInputType = AttributeInput["inputType"];

// ProductType Create Schema - minimal fields for creation
const productTypeCreateSchema = z.object({
  name: z.string().describe("ProductType.name"),
});

// ProductType Update Schema - full state representation
const productTypeUpdateSchema = z.object({
  name: z.string().describe("ProductType.name"),
  attributes: z
    .array(noTypeAttributeSchema)
    .describe("ProductType.productAttributes"),
});

// Union type that accepts either create or update input
// Try update schema first (more specific) then create schema
const productTypeSchema = productTypeUpdateSchema.or(productTypeCreateSchema);

export type ProductTypeCreateInput = z.infer<typeof productTypeCreateSchema>;
export type ProductTypeUpdateInput = z.infer<typeof productTypeUpdateSchema>;
export type ProductTypeInput = z.infer<typeof productTypeSchema>;

// PageType Create Schema - minimal fields for creation
const pageTypeCreateSchema = z.object({
  name: z.string().describe("PageType.name"),
});

// PageType Update Schema - full state representation
const pageTypeUpdateSchema = z.object({
  name: z.string().describe("PageType.name"),
  attributes: z.array(noTypeAttributeSchema).describe("PageType.attributes"),
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
  "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "SEK", "NZD",
  "MXN", "SGD", "HKD", "NOK", "KRW", "TRY", "RUB", "INR", "BRL", "ZAR",
  "PLN", "CZK", "DKK", "HUF", "ILS", "THB", "IDR", "MYR", "PHP", "VND",
  "EGP", "SAR", "AED", "NGN", "ARS", "CLP", "COP", "PEN"
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
        .describe(
          "Channel.orderSettings.automaticallyFulfillNonShippableGiftCard"
        ),
      expireOrdersAfter: z
        .number()
        .optional()
        .describe("Channel.orderSettings.expireOrdersAfter"),
      deleteExpiredOrdersAfter: z
        .number()
        .optional()
        .describe("Channel.orderSettings.deleteExpiredOrdersAfter"),
      markAsPaidStrategy: z
        .enum(["TRANSACTION_FLOW", "PAYMENT_FLOW"])
        .optional()
        .describe("Channel.orderSettings.markAsPaidStrategy"),
      allowUnpaidOrders: z
        .boolean()
        .optional()
        .describe("Channel.orderSettings.allowUnpaidOrders"),
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
        .describe(
          "Channel.checkoutSettings.automaticallyCompleteFullyPaidCheckouts"
        ),
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

// Shop Create Schema - minimal fields for shop creation (can be empty)
const shopCreateSchema = z.object({}).describe("Shop create input");

// Shop Update Schema - full state representation
const shopUpdateSchema = z.object({
  headerText: z.string().optional().describe("Shop.headerText"),
  description: z.string().optional().describe("Shop.description"),
  trackInventoryByDefault: z
    .boolean()
    .optional()
    .describe("Shop.trackInventoryByDefault"),
  defaultWeightUnit: weightUnitEnum
    .optional()
    .describe("Shop.defaultWeightUnit"),
  automaticFulfillmentDigitalProducts: z
    .boolean()
    .optional()
    .describe("Shop.automaticFulfillmentDigitalProducts"),
  fulfillmentAutoApprove: z
    .boolean()
    .optional()
    .describe("Shop.fulfillmentAutoApprove"),
  fulfillmentAllowUnpaid: z
    .boolean()
    .optional()
    .describe("Shop.fulfillmentAllowUnpaid"),
  defaultDigitalMaxDownloads: z
    .number()
    .optional()
    .describe("Shop.defaultDigitalMaxDownloads"),
  defaultDigitalUrlValidDays: z
    .number()
    .optional()
    .describe("Shop.defaultDigitalUrlValidDays"),
  defaultMailSenderName: z
    .string()
    .optional()
    .describe("Shop.defaultMailSenderName"),
  defaultMailSenderAddress: z
    .string()
    .optional()
    .describe("Shop.defaultMailSenderAddress"),
  customerSetPasswordUrl: z
    .string()
    .optional()
    .describe("Shop.customerSetPasswordUrl"),
  reserveStockDurationAnonymousUser: z
    .number()
    .optional()
    .describe("Shop.reserveStockDurationAnonymousUser"),
  reserveStockDurationAuthenticatedUser: z
    .number()
    .optional()
    .describe("Shop.reserveStockDurationAuthenticatedUser"),
  limitQuantityPerCheckout: z
    .number()
    .optional()
    .describe("Shop.limitQuantityPerCheckout"),
  enableAccountConfirmationByEmail: z
    .boolean()
    .optional()
    .describe("Shop.enableAccountConfirmationByEmail"),
  allowLoginWithoutConfirmation: z
    .boolean()
    .optional()
    .describe("Shop.allowLoginWithoutConfirmation"),
  displayGrossPrices: z
    .boolean()
    .optional()
    .describe("Shop.displayGrossPrices"),
});

// Union type that accepts either create or update input
// Try update schema first (more specific) then create schema
export const shopSchema = shopUpdateSchema.or(shopCreateSchema);

export type ShopCreateInput = z.infer<typeof shopCreateSchema>;
export type ShopUpdateInput = z.infer<typeof shopUpdateSchema>;
export type ShopInput = z.infer<typeof shopSchema>;

// Category Create Schema - minimal fields for creation
const categoryCreateSchema = z.object({
  name: z.string().describe("Category.name"),
});

// Category Update Schema - full state representation with subcategories
const baseCategoryUpdateSchema = z.object({
  name: z.string().describe("Category.name"),
});

type CategoryUpdate = z.infer<typeof baseCategoryUpdateSchema> & {
  subcategories?: CategoryUpdate[];
};

const categoryUpdateSchema: z.ZodType<CategoryUpdate> =
  baseCategoryUpdateSchema.extend({
    subcategories: z
      .lazy(() => categoryUpdateSchema.array())
      .optional()
      .describe("Category.children"),
  });

// Union type that accepts either create or update input
type CategoryCreate = z.infer<typeof categoryCreateSchema>;
type Category = CategoryCreate | CategoryUpdate;

const categorySchema: z.ZodType<Category> =
  categoryUpdateSchema.or(categoryCreateSchema);

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
  channelListings: z.array(productVariantChannelListingSchema),
});

const productSchema = z.object({
  name: z.string(),
  productType: z.string(),
  category: z.string(),
  description: z.string().optional(),
  attributes: z.record(z.union([z.string(), z.array(z.string())])).optional(),
  channelListings: z.array(productChannelListingSchema).optional(),
  variants: z.array(productVariantSchema),
});

export const configSchema = z
  .object({
    shop: shopSchema.optional().describe("Shop"),
    channels: z.array(channelSchema).optional().describe("Channel"),
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
