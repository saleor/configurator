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
  attributes: z
    .array(noTypeAttributeSchema)
    .describe("ProductType.productAttributes / PageType.attributes"),
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

export type ChannelInput = z.infer<typeof channelSchema>;

const weightUnitEnum = z.enum(["KG", "LB", "OZ", "G", "TONNE"]);

export const shopSchema = z.object({
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

const baseCategorySchema = z.object({
  name: z.string().describe("Category.name"),
});

type Category = z.infer<typeof baseCategorySchema> & {
  subcategories?: Category[];
};

const categorySchema: z.ZodType<Category> = baseCategorySchema.extend({
  subcategories: z
    .lazy(() => categorySchema.array())
    .optional()
    .describe("Category.children"),
});

const warehouseSchema = z.object({
  name: z.string().describe("Warehouse.name"),
  slug: z.string().describe("Warehouse.slug"),
  email: z.string().optional().describe("Warehouse.email"),
  address: z.object({
    streetAddress1: z.string().describe("Warehouse.address.streetAddress1"),
    streetAddress2: z.string().optional().describe("Warehouse.address.streetAddress2"),
    city: z.string().describe("Warehouse.address.city"),
    cityArea: z.string().optional().describe("Warehouse.address.cityArea"),
    postalCode: z.string().describe("Warehouse.address.postalCode"),
    country: countryCodeSchema.describe("Warehouse.address.country"),
    countryArea: z.string().optional().describe("Warehouse.address.countryArea"),
    phone: z.string().optional().describe("Warehouse.address.phone"),
  }).describe("Warehouse.address"),
}).describe("Warehouse");

export type WarehouseInput = z.infer<typeof warehouseSchema>;

const collectionSchema = z.object({
  name: z.string().describe("Collection.name"),
  slug: z.string().describe("Collection.slug"),
  description: z.string().optional().describe("Collection.description"),
  isPublished: z.boolean().optional().describe("Collection.isPublished"),
  channelListings: z.array(z.object({
    channelSlug: z.string().describe("Collection.channelListings.channel.slug"),
    isPublished: z.boolean().optional().describe("Collection.channelListings.isPublished"),
    publishedAt: z.string().optional().describe("Collection.channelListings.publishedAt"),
  })).optional().describe("Collection.channelListings"),
}).describe("Collection");

export type CollectionInput = z.infer<typeof collectionSchema>;

const productSchema = z.object({
  name: z.string().describe("Product.name"),
  slug: z.string().describe("Product.slug"),
  description: z.string().optional().describe("Product.description"),
  productTypeName: z.string().describe("Product.productType.name"),
  categorySlug: z.string().optional().describe("Product.category.slug"),
  collections: z.array(z.string()).optional().describe("Product.collections[].slug"),
  weight: z.number().optional().describe("Product.weight"),
  rating: z.number().optional().describe("Product.rating"),
  attributes: z.array(z.object({
    name: z.string().describe("Product.attributes[].attribute.name"),
    value: z.any().describe("Product.attributes[].values"),
  })).optional().describe("Product.attributes"),
  channelListings: z.array(z.object({
    channelSlug: z.string().describe("Product.channelListings[].channel.slug"),
    isPublished: z.boolean().optional().describe("Product.channelListings[].isPublished"),
    publishedAt: z.string().optional().describe("Product.channelListings[].publishedAt"),
    visibleInListings: z.boolean().optional().describe("Product.channelListings[].visibleInListings"),
    isAvailableForPurchase: z.boolean().optional().describe("Product.channelListings[].isAvailableForPurchase"),
    availableForPurchaseAt: z.string().optional().describe("Product.channelListings[].availableForPurchaseAt"),
  })).optional().describe("Product.channelListings"),
  variants: z.array(z.object({
    sku: z.string().describe("ProductVariant.sku"),
    name: z.string().optional().describe("ProductVariant.name"),
    weight: z.number().optional().describe("ProductVariant.weight"),
    trackInventory: z.boolean().optional().describe("ProductVariant.trackInventory"),
    attributes: z.array(z.object({
      name: z.string().describe("ProductVariant.attributes[].attribute.name"),
      value: z.any().describe("ProductVariant.attributes[].values"),
    })).optional().describe("ProductVariant.attributes"),
    channelListings: z.array(z.object({
      channelSlug: z.string().describe("ProductVariant.channelListings[].channel.slug"),
      price: z.number().describe("ProductVariant.channelListings[].price"),
      costPrice: z.number().optional().describe("ProductVariant.channelListings[].costPrice"),
    })).optional().describe("ProductVariant.channelListings"),
    stocks: z.array(z.object({
      warehouseSlug: z.string().describe("Stock.warehouse.slug"),
      quantity: z.number().describe("Stock.quantity"),
    })).optional().describe("ProductVariant.stocks"),
  })).optional().describe("Product.variants"),
}).describe("Product");

export type ProductInput = z.infer<typeof productSchema>;

const shippingMethodSchema = z.object({
  name: z.string().describe("ShippingMethod.name"),
  description: z.string().optional().describe("ShippingMethod.description"),
  type: z.enum(["PRICE", "WEIGHT"]).optional().describe("ShippingMethod.type"),
  maximumOrderWeight: z.number().optional().describe("ShippingMethod.maximumOrderWeight"),
  minimumOrderWeight: z.number().optional().describe("ShippingMethod.minimumOrderWeight"),
  channelListings: z.array(z.object({
    channelSlug: z.string().describe("ShippingMethod.channelListings[].channel.slug"),
    price: z.number().describe("ShippingMethod.channelListings[].price"),
    minimumOrderPrice: z.number().optional().describe("ShippingMethod.channelListings[].minimumOrderPrice"),
    maximumOrderPrice: z.number().optional().describe("ShippingMethod.channelListings[].maximumOrderPrice"),
  })).optional().describe("ShippingMethod.channelListings"),
  postalCodeRules: z.array(z.object({
    start: z.string().describe("ShippingMethod.postalCodeRules[].start"),
    end: z.string().optional().describe("ShippingMethod.postalCodeRules[].end"),
    inclusionType: z.enum(["INCLUDE", "EXCLUDE"]).optional().describe("ShippingMethod.postalCodeRules[].inclusionType"),
  })).optional().describe("ShippingMethod.postalCodeRules"),
}).describe("ShippingMethod");

const shippingZoneSchema = z.object({
  name: z.string().describe("ShippingZone.name"),
  description: z.string().optional().describe("ShippingZone.description"),
  countries: z.array(z.string()).describe("ShippingZone.countries"),
  channels: z.array(z.string()).optional().describe("ShippingZone.channels[].slug"),
  shippingMethods: z.array(shippingMethodSchema).optional().describe("ShippingZone.shippingMethods"),
}).describe("ShippingZone");

export type ShippingZoneInput = z.infer<typeof shippingZoneSchema>;
export type ShippingMethodInput = z.infer<typeof shippingMethodSchema>;

const taxClassSchema = z.object({
  name: z.string().describe("TaxClass.name"),
  countryRates: z.array(z.object({
    countryCode: z.string().describe("TaxClass.countryRates[].country"),
    rate: z.number().describe("TaxClass.countryRates[].rate"),
  })).optional().describe("TaxClass.countryRates"),
}).describe("TaxClass");

const taxConfigurationSchema = z.object({
  channelSlug: z.string().describe("TaxConfiguration.channel.slug"),
  chargeTaxes: z.boolean().optional().describe("TaxConfiguration.chargeTaxes"),
  displayGrossPrices: z.boolean().optional().describe("TaxConfiguration.displayGrossPrices"),
  pricesEnteredWithTax: z.boolean().optional().describe("TaxConfiguration.pricesEnteredWithTax"),
  countryExceptions: z.array(z.object({
    countryCode: z.string().describe("TaxConfiguration.countryExceptions[].country"),
    chargeTaxes: z.boolean().optional().describe("TaxConfiguration.countryExceptions[].chargeTaxes"),
    displayGrossPrices: z.boolean().optional().describe("TaxConfiguration.countryExceptions[].displayGrossPrices"),
  })).optional().describe("TaxConfiguration.countryExceptions"),
}).describe("TaxConfiguration");

export type TaxClassInput = z.infer<typeof taxClassSchema>;
export type TaxConfigurationInput = z.infer<typeof taxConfigurationSchema>;

const voucherSchema = z.object({
  name: z.string().optional().describe("Voucher.name"),
  code: z.string().describe("Voucher.code"),
  type: z.enum(["SHIPPING", "ENTIRE_ORDER", "SPECIFIC_PRODUCT"]).optional().describe("Voucher.type"),
  discountValueType: z.enum(["FIXED", "PERCENTAGE"]).describe("Voucher.discountValueType"),
  usageLimit: z.number().optional().describe("Voucher.usageLimit"),
  startDate: z.string().optional().describe("Voucher.startDate"),
  endDate: z.string().optional().describe("Voucher.endDate"),
  applyOncePerOrder: z.boolean().optional().describe("Voucher.applyOncePerOrder"),
  applyOncePerCustomer: z.boolean().optional().describe("Voucher.applyOncePerCustomer"),
  onlyForStaff: z.boolean().optional().describe("Voucher.onlyForStaff"),
  minCheckoutItemsQuantity: z.number().optional().describe("Voucher.minCheckoutItemsQuantity"),
  categories: z.array(z.string()).optional().describe("Voucher.categories[].slug"),
  collections: z.array(z.string()).optional().describe("Voucher.collections[].slug"),
  products: z.array(z.string()).optional().describe("Voucher.products[].slug"),
  channelListings: z.array(z.object({
    channelSlug: z.string().describe("Voucher.channelListings[].channel.slug"),
    discountValue: z.number().describe("Voucher.channelListings[].discountValue"),
    minSpent: z.number().optional().describe("Voucher.channelListings[].minSpent"),
  })).optional().describe("Voucher.channelListings"),
}).describe("Voucher");

const saleSchema = z.object({
  name: z.string().describe("Sale.name"),
  type: z.enum(["FIXED", "PERCENTAGE"]).optional().describe("Sale.type"),
  startDate: z.string().optional().describe("Sale.startDate"),
  endDate: z.string().optional().describe("Sale.endDate"),
  categories: z.array(z.string()).optional().describe("Sale.categories[].slug"),
  collections: z.array(z.string()).optional().describe("Sale.collections[].slug"),
  products: z.array(z.string()).optional().describe("Sale.products[].slug"),
  channelListings: z.array(z.object({
    channelSlug: z.string().describe("Sale.channelListings[].channel.slug"),
    discountValue: z.number().describe("Sale.channelListings[].discountValue"),
  })).optional().describe("Sale.channelListings"),
}).describe("Sale");

export type VoucherInput = z.infer<typeof voucherSchema>;
export type SaleInput = z.infer<typeof saleSchema>;

const giftCardIndividualSchema = z.object({
  code: z.string().optional().describe("GiftCard.code"),
  initialBalance: z.object({
    amount: z.number().describe("GiftCard.initialBalance.amount"),
    currency: z.string().describe("GiftCard.initialBalance.currency"),
  }).describe("GiftCard.initialBalance"),
  expiryDate: z.string().optional().describe("GiftCard.expiryDate"),
  isActive: z.boolean().optional().describe("GiftCard.isActive"),
  tag: z.string().optional().describe("GiftCard.tag"),
  email: z.string().email().optional().describe("GiftCard.usedByEmail"),
  note: z.string().optional().describe("GiftCard.note"),
}).describe("GiftCard (Individual)");

const giftCardBulkSchema = z.object({
  count: z.number().describe("Bulk GiftCard count"),
  initialBalance: z.object({
    amount: z.number().describe("GiftCard.initialBalance.amount"),
    currency: z.string().describe("GiftCard.initialBalance.currency"),
  }).describe("GiftCard.initialBalance"),
  expiryDate: z.string().optional().describe("GiftCard.expiryDate"),
  isActive: z.boolean().optional().describe("GiftCard.isActive"),
  tag: z.string().describe("GiftCard.tag"),
}).describe("GiftCard (Bulk)");

const giftCardSchema = z.object({
  individual: z.array(giftCardIndividualSchema).optional().describe("Individual gift cards"),
  bulk: z.array(giftCardBulkSchema).optional().describe("Bulk gift cards"),
}).describe("Gift Cards");

export type GiftCardIndividualInput = z.infer<typeof giftCardIndividualSchema>;
export type GiftCardBulkInput = z.infer<typeof giftCardBulkSchema>;
export type GiftCardInput = z.infer<typeof giftCardSchema>;

const menuItemSchema: z.ZodType<any> = z.object({
  name: z.string().describe("MenuItem.name"),
  url: z.string().optional().describe("MenuItem.url"),
  category: z.string().optional().describe("MenuItem.category.slug"),
  collection: z.string().optional().describe("MenuItem.collection.slug"),
  page: z.string().optional().describe("MenuItem.page.slug"),
  children: z.lazy(() => menuItemSchema.array()).optional().describe("MenuItem.children"),
}).describe("MenuItem");

const menuSchema = z.object({
  name: z.string().describe("Menu.name"),
  slug: z.string().describe("Menu.slug"),
  items: z.array(menuItemSchema).optional().describe("Menu.items"),
}).describe("Menu");

export type MenuItemInput = z.infer<typeof menuItemSchema>;
export type MenuInput = z.infer<typeof menuSchema>;

const pageSchema = z.object({
  title: z.string().describe("Page.title"),
  slug: z.string().describe("Page.slug"),
  content: z.string().optional().describe("Page.content"),
  isPublished: z.boolean().optional().describe("Page.isPublished"),
  publishedAt: z.string().optional().describe("Page.publishedAt"),
  pageTypeName: z.string().describe("Page.pageType.name"),
  attributes: z.array(z.object({
    name: z.string().describe("Page.attributes[].attribute.name"),
    value: z.any().describe("Page.attributes[].values"),
  })).optional().describe("Page.attributes"),
  seoTitle: z.string().optional().describe("Page.seoTitle"),
  seoDescription: z.string().optional().describe("Page.seoDescription"),
}).describe("Page");

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
  ]).describe("Entity type to translate"),
  entityIdentifier: z.string().describe("Entity identifier (slug or name)"),
  languageCode: z.string().describe("Language code (e.g. 'en', 'fr', 'es')"),
  translations: z.object({
    name: z.string().optional().describe("Translated name"),
    title: z.string().optional().describe("Translated title"),
    description: z.string().optional().describe("Translated description"),
    content: z.string().optional().describe("Translated content"),
    seoTitle: z.string().optional().describe("Translated SEO title"),
    seoDescription: z.string().optional().describe("Translated SEO description"),
    richText: z.string().optional().describe("Translated rich text"),
    plainText: z.string().optional().describe("Translated plain text"),
  }).describe("Translation fields"),
}).describe("Translation");

export type TranslationInput = z.infer<typeof translationSchema>;

export const configSchema = z
  .object({
    shop: shopSchema.optional().describe("Shop"),
    attributes: z.array(attributeSchema).optional().describe("Attribute"),
    channels: z.array(channelSchema).optional().describe("Channel"),
    warehouses: z.array(warehouseSchema).optional().describe("Warehouse"),
    productTypes: z
      .array(pageOrProductTypeSchema)
      .optional()
      .describe("ProductType"),
    pageTypes: z.array(pageOrProductTypeSchema).optional().describe("PageType"),
    categories: z.array(categorySchema).optional().describe("Category"),
    collections: z.array(collectionSchema).optional().describe("Collection"),
    products: z.array(productSchema).optional().describe("Product"),
    shippingZones: z.array(shippingZoneSchema).optional().describe("ShippingZone"),
    taxClasses: z.array(taxClassSchema).optional().describe("TaxClass"),
    taxConfigurations: z.array(taxConfigurationSchema).optional().describe("TaxConfiguration"),
    vouchers: z.array(voucherSchema).optional().describe("Voucher"),
    sales: z.array(saleSchema).optional().describe("Sale"),
    giftCards: giftCardSchema.optional().describe("GiftCards"),
    menus: z.array(menuSchema).optional().describe("Menu"),
    pages: z.array(pageSchema).optional().describe("Page"),
    translations: z.array(translationSchema).optional().describe("Translation"),
  })
  .strict()
  .describe("Configuration");

export type SaleorConfig = z.infer<typeof configSchema>;
export type PageTypeAttribute = z.infer<typeof pageOrProductTypeSchema>;
export type PageType = z.infer<typeof pageOrProductTypeSchema>;
export type ProductTypeAttribute = z.infer<typeof pageOrProductTypeSchema>;
export type ProductType = z.infer<typeof pageOrProductTypeSchema>;
