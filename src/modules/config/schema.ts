import { z } from "zod";

const baseAttributeSchema = z.object({
  name: z.string(),
  type: z.enum(["PRODUCT_TYPE", "PAGE_TYPE"]).optional(),
});

const multipleValuesAttributeSchema = baseAttributeSchema.extend({
  inputType: z.enum(["DROPDOWN", "MULTISELECT", "SWATCH"]),
  values: z.array(z.object({ name: z.string() })),
});

const singleValueAttributeSchema = baseAttributeSchema.extend({
  inputType: z.enum([
    "PLAIN_TEXT",
    "NUMERIC",
    "DATE",
    "BOOLEAN",
    "RICH_TEXT",
    "DATE_TIME",
    "FILE",
    "REFERENCE",
  ]),
});

const attributeSchema = z.discriminatedUnion("inputType", [
  multipleValuesAttributeSchema,
  singleValueAttributeSchema,
]);

export type AttributeInput = z.infer<typeof attributeSchema>;

export type AttributeInputType = AttributeInput["inputType"];

const productTypeSchema = z.object({
  name: z.string(),
  attributes: z.array(attributeSchema),
});

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
  name: z.string(),
  currencyCode: z.string(),
  defaultCountry: countryCodeSchema,
  slug: z.string(),
  settings: z
    .object({
      allocationStrategy: z
        .enum(["PRIORITIZE_SORTING_ORDER", "PRIORITIZE_HIGH_STOCK"])
        .optional(),
      automaticallyConfirmAllNewOrders: z.boolean().optional(),
      automaticallyFulfillNonShippableGiftCard: z.boolean().optional(),
      expireOrdersAfter: z.number().optional(),
      deleteExpiredOrdersAfter: z.number().optional(),
      markAsPaidStrategy: z
        .enum(["TRANSACTION_FLOW", "PAYMENT_FLOW"])
        .optional(),
      allowUnpaidOrders: z.boolean().optional(),
      includeDraftOrderInVoucherUsage: z.boolean().optional(),
      useLegacyErrorFlow: z.boolean().optional(),
      automaticallyCompleteFullyPaidCheckouts: z.boolean().optional(),
      defaultTransactionFlowStrategy: z
        .enum(["AUTHORIZATION", "CHARGE"])
        .optional(),
    })
    .optional(),
});

export type ChannelInput = z.infer<typeof channelSchema>;

const pageTypeSchema = z.object({
  name: z.string(),
  attributes: z.array(attributeSchema),
});

export type PageTypeInput = z.infer<typeof pageTypeSchema>;

const weightUnitEnum = z.enum(["KG", "LB", "OZ", "G", "TONNE"]);

export const shopSchema = z.object({
  headerText: z.string().optional(),
  description: z.string().optional(),
  trackInventoryByDefault: z.boolean().optional(),
  defaultWeightUnit: weightUnitEnum.optional(),
  automaticFulfillmentDigitalProducts: z.boolean().optional(),
  fulfillmentAutoApprove: z.boolean().optional(),
  fulfillmentAllowUnpaid: z.boolean().optional(),
  defaultDigitalMaxDownloads: z.number().optional(),
  defaultDigitalUrlValidDays: z.number().optional(),
  defaultMailSenderName: z.string().optional(),
  defaultMailSenderAddress: z.string().optional(),
  customerSetPasswordUrl: z.string().optional(),
  reserveStockDurationAnonymousUser: z.number().optional(),
  reserveStockDurationAuthenticatedUser: z.number().optional(),
  limitQuantityPerCheckout: z.number().optional(),
  enableAccountConfirmationByEmail: z.boolean().optional(),
  allowLoginWithoutConfirmation: z.boolean().optional(),
  displayGrossPrices: z.boolean().optional(),
});

export const configSchema = z
  .object({
    productTypes: z.array(productTypeSchema).optional(),
    channels: z.array(channelSchema).optional(),
    pageTypes: z.array(pageTypeSchema).optional(),
    attributes: z.array(attributeSchema).optional(),
    shop: shopSchema.optional(),
  })
  .strict();

export type SaleorConfig = z.infer<typeof configSchema>;
