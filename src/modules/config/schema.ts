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
  entityType: z.enum(["PAGE", "PRODUCT", "PRODUCT_VARIANT"]),
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

// Combined attribute schema using discriminated union based on inputType
const noTypeAttributeSchema = z.discriminatedUnion("inputType", [
  multipleValuesAttributeSchema,
  referenceAttributeSchema,
  simpleAttributeSchema,
]);

// Main attribute schema with type field (for creation operations)
const attributeSchema = noTypeAttributeSchema.and(
  z.object({
    type: attributeTypeSchema,
  })
);

export type AttributeInput = z.infer<typeof attributeSchema>;
export type AttributeInputType = AttributeInput["inputType"];

const pageOrProductTypeSchema = z.object({
  name: z.string(),
  attributes: z.array(noTypeAttributeSchema),
});

export type PageTypeInput = z.infer<typeof pageOrProductTypeSchema>;

// Country codes aligned with GraphQL CountryCode enum (subset of most common ones)
const countryCodeSchema = z.enum([
  "AF", "AX", "AL", "DZ", "AS", "AD", "AO", "AI", "AQ", "AG", "AR", "AM", "AW", 
  "AU", "AT", "AZ", "BS", "BH", "BD", "BB", "BY", "BE", "BZ", "BJ", "BM", "BT", 
  "BO", "BQ", "BA", "BW", "BV", "BR", "IO", "BN", "BG", "BF", "BI", "CV", "KH", 
  "CM", "CA", "KY", "CF", "TD", "CL", "CN", "CX", "CC", "CO", "KM", "CG", "CD", 
  "CK", "CR", "CI", "HR", "CU", "CW", "CY", "CZ", "DK", "DJ", "DM", "DO", "EC", 
  "EG", "SV", "GQ", "ER", "EE", "SZ", "ET", "EU", "FK", "FO", "FJ", "FI", "FR", 
  "GF", "PF", "TF", "GA", "GM", "GE", "DE", "GH", "GI", "GR", "GL", "GD", "GP", 
  "GU", "GT", "GG", "GN", "GW", "GY", "HT", "HM", "VA", "HN", "HK", "HU", "IS", 
  "IN", "ID", "IR", "IQ", "IE", "IM", "IL", "IT", "JM", "JP", "JE", "JO", "KZ", 
  "KE", "KI", "KW", "KG", "LA", "LV", "LB", "LS", "LR", "LY", "LI", "LT", "LU", 
  "MO", "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MQ", "MR", "MU", "YT", "MX", 
  "FM", "MD", "MC", "MN", "ME", "MS", "MA", "MZ", "MM", "NA", "NR", "NP", "NL", 
  "NC", "NZ", "NI", "NE", "NG", "NU", "NF", "KP", "MK", "MP", "NO", "OM", "PK", 
  "PW", "PS", "PA", "PG", "PY", "PE", "PH", "PN", "PL", "PT", "PR", "QA", "RE", 
  "RO", "RU", "RW", "BL", "SH", "KN", "LC", "MF", "PM", "VC", "WS", "SM", "ST", 
  "SA", "SN", "RS", "SC", "SL", "SG", "SX", "SK", "SI", "SB", "SO", "ZA", "GS", 
  "KR", "SS", "ES", "LK", "SD", "SR", "SJ", "SE", "CH", "SY", "TW", "TJ", "TZ", 
  "TH", "TL", "TG", "TK", "TO", "TT", "TN", "TR", "TM", "TC", "TV", "UG", "UA", 
  "AE", "GB", "UM", "US", "UY", "UZ", "VU", "VE", "VN", "VG", "VI", "WF", "EH", 
  "YE", "ZM", "ZW"
]);

export type CountryCode = z.infer<typeof countryCodeSchema>;

// Channel schema aligned with GraphQL ChannelCreateInput
const channelSchema = z.object({
  // Required fields matching GraphQL ChannelCreateInput
  name: z.string(),
  slug: z.string(), 
  currencyCode: z.string(),
  defaultCountry: countryCodeSchema,
  
  // Optional fields matching GraphQL ChannelCreateInput
  isActive: z.boolean().optional(),
  
  // Settings nested object
  stockSettings: z.object({
    allocationStrategy: z
      .enum(["PRIORITIZE_SORTING_ORDER", "PRIORITIZE_HIGH_STOCK"])
      .optional(),
  }).optional(),
  
  orderSettings: z.object({
    automaticallyConfirmAllNewOrders: z.boolean().optional(),
    automaticallyFulfillNonShippableGiftCard: z.boolean().optional(),
    expireOrdersAfter: z.number().optional(),
    deleteExpiredOrdersAfter: z.number().optional(),
    markAsPaidStrategy: z
      .enum(["TRANSACTION_FLOW", "PAYMENT_FLOW"])
      .optional(),
    allowUnpaidOrders: z.boolean().optional(),
    includeDraftOrderInVoucherUsage: z.boolean().optional(),
  }).optional(),
  
  checkoutSettings: z.object({
    useLegacyErrorFlow: z.boolean().optional(),
    automaticallyCompleteFullyPaidCheckouts: z.boolean().optional(),
  }).optional(),
  
  paymentSettings: z.object({
    defaultTransactionFlowStrategy: z
      .enum(["AUTHORIZATION", "CHARGE"])
      .optional(),
  }).optional(),
  
  // Additional fields for warehouse/shipping zone association
  addWarehouses: z.array(z.string()).optional(),
  addShippingZones: z.array(z.string()).optional(),
});

export type ChannelInput = z.infer<typeof channelSchema>;

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

const baseCategorySchema = z.object({
  name: z.string(),
});

type Category = z.infer<typeof baseCategorySchema> & {
  subcategories?: Category[];
};

const categorySchema: z.ZodType<Category> = baseCategorySchema.extend({
  subcategories: z.lazy(() => categorySchema.array()).optional(),
});

const warehouseSchema = z.object({
  name: z.string(),
  slug: z.string(),
  email: z.string().optional(),
  address: z.object({
    streetAddress1: z.string(),
    streetAddress2: z.string().optional(),
    city: z.string(),
    cityArea: z.string().optional(),
    postalCode: z.string(),
    country: countryCodeSchema,
    countryArea: z.string().optional(),
    phone: z.string().optional(),
  }),
});

export type WarehouseInput = z.infer<typeof warehouseSchema>;

const collectionSchema = z.object({
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  isPublished: z.boolean().optional(),
  channelListings: z.array(z.object({
    channelSlug: z.string(),
    isPublished: z.boolean().optional(),
    publishedAt: z.string().optional(),
  })).optional(),
});

export type CollectionInput = z.infer<typeof collectionSchema>;

const productSchema = z.object({
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  productTypeName: z.string(),
  categorySlug: z.string().optional(),
  collections: z.array(z.string()).optional(),
  weight: z.number().optional(),
  rating: z.number().optional(),
  attributes: z.array(z.object({
    name: z.string(),
    value: z.any(),
  })).optional(),
  channelListings: z.array(z.object({
    channelSlug: z.string(),
    isPublished: z.boolean().optional(),
    publishedAt: z.string().optional(),
    visibleInListings: z.boolean().optional(),
    isAvailableForPurchase: z.boolean().optional(),
    availableForPurchaseAt: z.string().optional(),
  })).optional(),
  variants: z.array(z.object({
    sku: z.string(),
    name: z.string().optional(),
    weight: z.number().optional(),
    trackInventory: z.boolean().optional(),
    attributes: z.array(z.object({
      name: z.string(),
      value: z.any(),
    })).optional(),
    channelListings: z.array(z.object({
      channelSlug: z.string(),
      price: z.number(),
      costPrice: z.number().optional(),
    })).optional(),
    stocks: z.array(z.object({
      warehouseSlug: z.string(),
      quantity: z.number(),
    })).optional(),
  })).optional(),
});

export type ProductInput = z.infer<typeof productSchema>;

const shippingMethodSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(["PRICE", "WEIGHT"]).optional(),
  maximumOrderWeight: z.number().optional(),
  minimumOrderWeight: z.number().optional(),
  channelListings: z.array(z.object({
    channelSlug: z.string(),
    price: z.number(),
    minimumOrderPrice: z.number().optional(),
    maximumOrderPrice: z.number().optional(),
  })).optional(),
  postalCodeRules: z.array(z.object({
    start: z.string(),
    end: z.string().optional(),
    inclusionType: z.enum(["INCLUDE", "EXCLUDE"]).optional(),
  })).optional(),
});

const shippingZoneSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  countries: z.array(z.string()),
  channels: z.array(z.string()).optional(),
  shippingMethods: z.array(shippingMethodSchema).optional(),
});

export type ShippingZoneInput = z.infer<typeof shippingZoneSchema>;
export type ShippingMethodInput = z.infer<typeof shippingMethodSchema>;

const taxClassSchema = z.object({
  name: z.string(),
  countryRates: z.array(z.object({
    countryCode: z.string(),
    rate: z.number(),
  })).optional(),
});

const taxConfigurationSchema = z.object({
  channelSlug: z.string(),
  chargeTaxes: z.boolean().optional(),
  displayGrossPrices: z.boolean().optional(),
  pricesEnteredWithTax: z.boolean().optional(),
  countryExceptions: z.array(z.object({
    countryCode: z.string(),
    chargeTaxes: z.boolean().optional(),
    displayGrossPrices: z.boolean().optional(),
  })).optional(),
});

export type TaxClassInput = z.infer<typeof taxClassSchema>;
export type TaxConfigurationInput = z.infer<typeof taxConfigurationSchema>;

const voucherSchema = z.object({
  name: z.string().optional(),
  code: z.string(),
  type: z.enum(["SHIPPING", "ENTIRE_ORDER", "SPECIFIC_PRODUCT"]).optional(),
  discountValueType: z.enum(["FIXED", "PERCENTAGE"]),
  usageLimit: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  applyOncePerOrder: z.boolean().optional(),
  applyOncePerCustomer: z.boolean().optional(),
  onlyForStaff: z.boolean().optional(),
  minCheckoutItemsQuantity: z.number().optional(),
  categories: z.array(z.string()).optional(),
  collections: z.array(z.string()).optional(),
  products: z.array(z.string()).optional(),
  channelListings: z.array(z.object({
    channelSlug: z.string(),
    discountValue: z.number(),
    minSpent: z.number().optional(),
  })).optional(),
});

const saleSchema = z.object({
  name: z.string(),
  type: z.enum(["FIXED", "PERCENTAGE"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  categories: z.array(z.string()).optional(),
  collections: z.array(z.string()).optional(),
  products: z.array(z.string()).optional(),
  channelListings: z.array(z.object({
    channelSlug: z.string(),
    discountValue: z.number(),
  })).optional(),
});

export type VoucherInput = z.infer<typeof voucherSchema>;
export type SaleInput = z.infer<typeof saleSchema>;

const giftCardIndividualSchema = z.object({
  code: z.string().optional(),
  initialBalance: z.object({
    amount: z.number(),
    currency: z.string(),
  }),
  expiryDate: z.string().optional(),
  isActive: z.boolean().optional(),
  tag: z.string().optional(),
  email: z.string().email().optional(),
  note: z.string().optional(),
});

const giftCardBulkSchema = z.object({
  count: z.number(),
  initialBalance: z.object({
    amount: z.number(),
    currency: z.string(),
  }),
  expiryDate: z.string().optional(),
  isActive: z.boolean().optional(),
  tag: z.string(),
});

const giftCardSchema = z.object({
  individual: z.array(giftCardIndividualSchema).optional(),
  bulk: z.array(giftCardBulkSchema).optional(),
});

export type GiftCardIndividualInput = z.infer<typeof giftCardIndividualSchema>;
export type GiftCardBulkInput = z.infer<typeof giftCardBulkSchema>;
export type GiftCardInput = z.infer<typeof giftCardSchema>;

const menuItemSchema: z.ZodType<any> = z.object({
  name: z.string(),
  url: z.string().optional(),
  category: z.string().optional(),
  collection: z.string().optional(),
  page: z.string().optional(),
  children: z.lazy(() => menuItemSchema.array()).optional(),
});

const menuSchema = z.object({
  name: z.string(),
  slug: z.string(),
  items: z.array(menuItemSchema).optional(),
});

export type MenuItemInput = z.infer<typeof menuItemSchema>;
export type MenuInput = z.infer<typeof menuSchema>;

const pageSchema = z.object({
  title: z.string(),
  slug: z.string(),
  content: z.string().optional(),
  isPublished: z.boolean().optional(),
  publishedAt: z.string().optional(),
  pageTypeName: z.string(),
  attributes: z.array(z.object({
    name: z.string(),
    value: z.any(),
  })).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

export type PageInput = z.infer<typeof pageSchema>;

const translationSchema = z.object({
  entityType: z.enum([
    "product",
    "collection",
    "category",
    "variant",
    "page",
    "shipping",
    "menuItem",
    "attribute",
    "attributeValue"
  ]),
  entityIdentifier: z.string(),
  languageCode: z.string(),
  translations: z.object({
    name: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    content: z.string().optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    richText: z.string().optional(),
    plainText: z.string().optional(),
  }),
});

export type TranslationInput = z.infer<typeof translationSchema>;

export const configSchema = z
  .object({
    attributes: z.array(attributeSchema).optional(),
    productTypes: z.array(pageOrProductTypeSchema).optional(),
    channels: z.array(channelSchema).optional(),
    pageTypes: z.array(pageOrProductTypeSchema).optional(),
    shop: shopSchema.optional(),
    categories: z.array(categorySchema).optional(),
    warehouses: z.array(warehouseSchema).optional(),
    collections: z.array(collectionSchema).optional(),
    products: z.array(productSchema).optional(),
    shippingZones: z.array(shippingZoneSchema).optional(),
    taxClasses: z.array(taxClassSchema).optional(),
    taxConfigurations: z.array(taxConfigurationSchema).optional(),
    vouchers: z.array(voucherSchema).optional(),
    sales: z.array(saleSchema).optional(),
    giftCards: giftCardSchema.optional(),
    menus: z.array(menuSchema).optional(),
    pages: z.array(pageSchema).optional(),
    translations: z.array(translationSchema).optional(),
  })
  .strict();

export type SaleorConfig = z.infer<typeof configSchema>;
export type PageTypeAttribute = z.infer<typeof pageOrProductTypeSchema>;
export type PageType = z.infer<typeof pageOrProductTypeSchema>;
export type ProductTypeAttribute = z.infer<typeof pageOrProductTypeSchema>;
export type ProductType = z.infer<typeof pageOrProductTypeSchema>;
