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

const pageOrProductTypeSchema = z.object({
  name: z.string().describe("ProductType.name / PageType.name"),
  attributes: z.array(noTypeAttributeSchema).describe("ProductType.productAttributes / PageType.attributes"),
});

export type PageTypeInput = z.infer<typeof pageOrProductTypeSchema>;

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
]);

export type CountryCode = z.infer<typeof countryCodeSchema>;

const channelSchema = z.object({
  name: z.string().describe("Channel.name"),
  currencyCode: z.string().describe("Channel.currencyCode"),
  defaultCountry: countryCodeSchema.describe("Channel.defaultCountry.code"),
  slug: z.string().describe("Channel.slug"),
  settings: z
    .object({
      allocationStrategy: z
        .enum(["PRIORITIZE_SORTING_ORDER", "PRIORITIZE_HIGH_STOCK"])
        .optional()
        .describe("Channel.stockSettings.allocationStrategy"),
      automaticallyConfirmAllNewOrders: z.boolean().optional()
        .describe("Channel.orderSettings.automaticallyConfirmAllNewOrders"),
      automaticallyFulfillNonShippableGiftCard: z.boolean().optional()
        .describe("Channel.orderSettings.automaticallyFulfillNonShippableGiftCard"),
      expireOrdersAfter: z.number().optional()
        .describe("Channel.orderSettings.expireOrdersAfter"),
      deleteExpiredOrdersAfter: z.number().optional()
        .describe("Channel.orderSettings.deleteExpiredOrdersAfter"),
      markAsPaidStrategy: z
        .enum(["TRANSACTION_FLOW", "PAYMENT_FLOW"])
        .optional()
        .describe("Channel.orderSettings.markAsPaidStrategy"),
      allowUnpaidOrders: z.boolean().optional()
        .describe("Channel.orderSettings.allowUnpaidOrders"),
      includeDraftOrderInVoucherUsage: z.boolean().optional()
        .describe("Channel.orderSettings.includeDraftOrderInVoucherUsage"),
      useLegacyErrorFlow: z.boolean().optional()
        .describe("Channel.checkoutSettings.useLegacyErrorFlow"),
      automaticallyCompleteFullyPaidCheckouts: z.boolean().optional()
        .describe("Channel.checkoutSettings.automaticallyCompleteFullyPaidCheckouts"),
      defaultTransactionFlowStrategy: z
        .enum(["AUTHORIZATION", "CHARGE"])
        .optional()
        .describe("Channel.paymentSettings.defaultTransactionFlowStrategy"),
    })
    .optional()
    .describe("Channel settings"),
});

export type ChannelInput = z.infer<typeof channelSchema>;

const weightUnitEnum = z.enum(["KG", "LB", "OZ", "G", "TONNE"]);

export const shopSchema = z.object({
  headerText: z.string().optional().describe("Shop.headerText"),
  description: z.string().optional().describe("Shop.description"),
  trackInventoryByDefault: z.boolean().optional().describe("Shop.trackInventoryByDefault"),
  defaultWeightUnit: weightUnitEnum.optional().describe("Shop.defaultWeightUnit"),
  automaticFulfillmentDigitalProducts: z.boolean().optional().describe("Shop.automaticFulfillmentDigitalProducts"),
  fulfillmentAutoApprove: z.boolean().optional().describe("Shop.fulfillmentAutoApprove"),
  fulfillmentAllowUnpaid: z.boolean().optional().describe("Shop.fulfillmentAllowUnpaid"),
  defaultDigitalMaxDownloads: z.number().optional().describe("Shop.defaultDigitalMaxDownloads"),
  defaultDigitalUrlValidDays: z.number().optional().describe("Shop.defaultDigitalUrlValidDays"),
  defaultMailSenderName: z.string().optional().describe("Shop.defaultMailSenderName"),
  defaultMailSenderAddress: z.string().optional().describe("Shop.defaultMailSenderAddress"),
  customerSetPasswordUrl: z.string().optional().describe("Shop.customerSetPasswordUrl"),
  reserveStockDurationAnonymousUser: z.number().optional().describe("Shop.reserveStockDurationAnonymousUser"),
  reserveStockDurationAuthenticatedUser: z.number().optional().describe("Shop.reserveStockDurationAuthenticatedUser"),
  limitQuantityPerCheckout: z.number().optional().describe("Shop.limitQuantityPerCheckout"),
  enableAccountConfirmationByEmail: z.boolean().optional().describe("Shop.enableAccountConfirmationByEmail"),
  allowLoginWithoutConfirmation: z.boolean().optional().describe("Shop.allowLoginWithoutConfirmation"),
  displayGrossPrices: z.boolean().optional().describe("Shop.displayGrossPrices"),
});

const baseCategorySchema = z.object({
  name: z.string().describe("Category.name"),
});

type Category = z.infer<typeof baseCategorySchema> & {
  subcategories?: Category[];
};

const categorySchema: z.ZodType<Category> = baseCategorySchema.extend({
  subcategories: z.lazy(() => categorySchema.array()).optional()
    .describe("Category.children"),
});
  subcategories: z.lazy(() => categorySchema.array()).optional(),
});

export const configSchema = z
  .object({
    shop: shopSchema.optional()
      .describe("Shop"),
    channels: z.array(channelSchema).optional()
      .describe("Channel"),
    productTypes: z.array(pageOrProductTypeSchema).optional()
      .describe("ProductType"),
    pageTypes: z.array(pageOrProductTypeSchema).optional()
      .describe("PageType"),
    categories: z.array(categorySchema).optional()
      .describe("Category"),
    productTypes: z.array(pageOrProductTypeSchema).optional(),
    channels: z.array(channelSchema).optional(),
    pageTypes: z.array(pageOrProductTypeSchema).optional(),
    shop: shopSchema.optional(),
    categories: z.array(categorySchema).optional(),
  })
  .strict()
  .describe("Configuration");

export type SaleorConfig = z.infer<typeof configSchema>;
export type PageTypeAttribute = z.infer<typeof pageOrProductTypeSchema>;
export type PageType = z.infer<typeof pageOrProductTypeSchema>;
export type ProductTypeAttribute = z.infer<typeof pageOrProductTypeSchema>;
export type ProductType = z.infer<typeof pageOrProductTypeSchema>;
