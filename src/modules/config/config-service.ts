import invariant from "tiny-invariant";
import type { ParsedSelectiveOptions } from "../../core/diff/types";
import { object } from "../../lib/utils/object";
import { shouldIncludeSection } from "../../lib/utils/selective-options";
import { UnsupportedInputTypeError } from "./errors";
import type { ConfigurationOperations, RawSaleorConfig } from "./repository";
import type { AttributeInput, FullAttribute } from "./schema/attribute.schema";
import type {
  CategoryInput,
  CategoryUpdateInput,
  CountryCode,
  CurrencyCode,
  ProductInput,
  ProductTypeInput,
  ProductVariantInput,
  SaleorConfig,
  ShippingZoneInput,
  TaxClassInput,
  WarehouseInput,
} from "./schema/schema";

interface TaxClassType {
  node: {
    id: string;
    name: string;
    countries: TaxClassCountryRateType[];
  };
}

interface TaxClassCountryRateType {
  country: { code: string };
  rate: number;
  taxClass?: { id: string };
}
import type { ConfigurationStorage } from "./yaml-manager";

export class ConfigurationService {
  constructor(
    private repository: ConfigurationOperations,
    private storage: ConfigurationStorage
  ) {}

  async retrieve(selectiveOptions?: ParsedSelectiveOptions): Promise<SaleorConfig> {
    const rawConfig = await this.repository.fetchConfig();
    const config = this.mapConfig(rawConfig, selectiveOptions);
    await this.storage.save(config);
    return config;
  }

  async retrieveWithoutSaving(selectiveOptions?: ParsedSelectiveOptions): Promise<SaleorConfig> {
    const rawConfig = await this.repository.fetchConfig();
    const config = this.mapConfig(rawConfig, selectiveOptions);
    return config;
  }

  private mapChannels(rawChannels: RawSaleorConfig["channels"]): SaleorConfig["channels"] {
    return (
      rawChannels?.map((channel) => ({
        name: channel.name,
        currencyCode: channel.currencyCode as CurrencyCode,
        defaultCountry: channel.defaultCountry.code as CountryCode,
        slug: channel.slug,
        isActive: false, // Default value for channels
        settings: {
          useLegacyErrorFlow: channel.checkoutSettings.useLegacyErrorFlow,
          automaticallyCompleteFullyPaidCheckouts:
            channel.checkoutSettings.automaticallyCompleteFullyPaidCheckouts,
          defaultTransactionFlowStrategy: channel.paymentSettings.defaultTransactionFlowStrategy,
          allocationStrategy: channel.stockSettings.allocationStrategy,
          automaticallyConfirmAllNewOrders: channel.orderSettings.automaticallyConfirmAllNewOrders,
          automaticallyFulfillNonShippableGiftCard:
            channel.orderSettings.automaticallyFulfillNonShippableGiftCard,
          expireOrdersAfter: Number(channel.orderSettings.expireOrdersAfter),
          deleteExpiredOrdersAfter: Number(channel.orderSettings.deleteExpiredOrdersAfter),
          markAsPaidStrategy: channel.orderSettings.markAsPaidStrategy,
          allowUnpaidOrders: channel.orderSettings.allowUnpaidOrders,
          includeDraftOrderInVoucherUsage: channel.orderSettings.includeDraftOrderInVoucherUsage,
        },
      })) ?? []
    );
  }

  private isMultipleChoiceAttribute(
    inputType: string | null
  ): inputType is "DROPDOWN" | "MULTISELECT" | "SWATCH" {
    return inputType === "DROPDOWN" || inputType === "MULTISELECT" || inputType === "SWATCH";
  }

  private isBasicAttribute(
    inputType: string | null
  ): inputType is
    | "PLAIN_TEXT"
    | "NUMERIC"
    | "DATE"
    | "BOOLEAN"
    | "RICH_TEXT"
    | "DATE_TIME"
    | "FILE" {
    return (
      inputType === "PLAIN_TEXT" ||
      inputType === "NUMERIC" ||
      inputType === "DATE" ||
      inputType === "BOOLEAN" ||
      inputType === "RICH_TEXT" ||
      inputType === "DATE_TIME" ||
      inputType === "FILE"
    );
  }

  private isReferenceAttribute(inputType: string | null): inputType is "REFERENCE" {
    return inputType === "REFERENCE";
  }

  private mapAttribute(
    attribute: RawAttribute,
    attributeType: "PRODUCT_TYPE" | "PAGE_TYPE"
  ): FullAttribute {
    invariant(attribute.name, "Unable to retrieve attribute name");
    invariant(attribute.inputType, "Unable to retrieve attribute input type");

    if (this.isMultipleChoiceAttribute(attribute.inputType)) {
      invariant(attribute.choices?.edges, "Unable to retrieve attribute choices");
      return {
        name: attribute.name,
        inputType: attribute.inputType,
        type: attributeType,
        values: attribute.choices.edges
          .filter(
            (edge): edge is { node: { name: string } } =>
              edge.node.name !== null && edge.node.name !== undefined
          )
          .map((edge) => ({
            name: edge.node.name,
          })),
      };
    }

    if (this.isReferenceAttribute(attribute.inputType)) {
      // Default entityType to PRODUCT if not specified in the raw data
      const entityType = attribute.entityType || "PRODUCT";
      return {
        name: attribute.name,
        inputType: "REFERENCE" as const,
        entityType: entityType as "PAGE" | "PRODUCT" | "PRODUCT_VARIANT",
        type: attributeType,
      };
    }

    if (this.isBasicAttribute(attribute.inputType)) {
      return {
        name: attribute.name,
        inputType: attribute.inputType,
        type: attributeType,
      };
    }

    throw new UnsupportedInputTypeError(`Unsupported input type: ${attribute.inputType}`);
  }

  private mapAttributes(
    rawAttributes: RawAttribute[],
    attributeType: "PRODUCT_TYPE" | "PAGE_TYPE"
  ): FullAttribute[] {
    return rawAttributes?.map((attribute) => this.mapAttribute(attribute, attributeType)) ?? [];
  }

  private mapProductTypes(rawProductTypes: RawSaleorConfig["productTypes"]): ProductTypeInput[] {
    return (
      rawProductTypes?.edges?.map((edge) => ({
        name: edge.node.name,
        isShippingRequired: edge.node.isShippingRequired,
        productAttributes: this.mapAttributes(edge.node.productAttributes ?? [], "PRODUCT_TYPE"),
        variantAttributes: this.mapAttributes(
          edge.node.assignedVariantAttributes?.map((attribute) => attribute.attribute) ?? [],
          "PRODUCT_TYPE"
        ),
      })) ?? []
    );
  }

  private mapPageTypes(rawPageTypes: RawSaleorConfig["pageTypes"]) {
    return (
      rawPageTypes?.edges?.map((edge) => ({
        name: edge.node.name,
        slug: edge.node.name.toLowerCase().replace(/\s+/g, "-"),
        attributes: this.mapAttributes(edge.node.attributes ?? [], "PAGE_TYPE"),
      })) ?? []
    );
  }

  private mapShopSettings(rawConfig: RawSaleorConfig): SaleorConfig["shop"] {
    const settings = rawConfig.shop;
    if (!settings) return undefined;

    return object.filterUndefinedValues({
      defaultMailSenderName: settings.defaultMailSenderName,
      defaultMailSenderAddress: settings.defaultMailSenderAddress,
      displayGrossPrices: settings.displayGrossPrices,
      enableAccountConfirmationByEmail: settings.enableAccountConfirmationByEmail,
      limitQuantityPerCheckout: settings.limitQuantityPerCheckout,
      trackInventoryByDefault: settings.trackInventoryByDefault,
      reserveStockDurationAnonymousUser: settings.reserveStockDurationAnonymousUser,
      reserveStockDurationAuthenticatedUser: settings.reserveStockDurationAuthenticatedUser,
      defaultDigitalMaxDownloads: settings.defaultDigitalMaxDownloads,
      defaultDigitalUrlValidDays: settings.defaultDigitalUrlValidDays,
      defaultWeightUnit: settings.defaultWeightUnit,
      allowLoginWithoutConfirmation: settings.allowLoginWithoutConfirmation,
    });
  }

  private mapCategories(rawCategories: RawSaleorConfig["categories"]): SaleorConfig["categories"] {
    if (!rawCategories?.edges) {
      return [];
    }

    const categoryMap: Record<string, CategoryInput> = {};
    const categories = rawCategories.edges.map((edge) => edge.node).filter(Boolean);

    // Sort categories by level to ensure parents are processed before children
    categories.sort((a, b) => a.level - b.level);

    // Initialize all categories in the map
    categories.forEach((category) => {
      categoryMap[category.slug] = {
        name: category.name,
        slug: category.slug,
      };
    });

    // Build the tree structure
    const tree: SaleorConfig["categories"] = [];
    categories.forEach((category) => {
      if (!category.parent) {
        // Top-level category
        tree.push(categoryMap[category.slug]);
      } else {
        // Subcategory
        const parentSlug = category.parent.slug;
        if (parentSlug && categoryMap[parentSlug]) {
          if (
            "subcategories" in categoryMap[parentSlug] &&
            Array.isArray(categoryMap[parentSlug].subcategories)
          ) {
            categoryMap[parentSlug].subcategories.push(categoryMap[category.slug]);
          } else {
            (categoryMap[parentSlug] as CategoryUpdateInput).subcategories = [
              categoryMap[category.slug],
            ];
          }
        }
      }
    });

    return tree;
  }

  private mapProducts(rawProducts: RawSaleorConfig["products"]): SaleorConfig["products"] {
    if (!rawProducts?.edges) {
      return [];
    }

    return rawProducts.edges
      .map((edge) => edge.node)
      .filter(Boolean)
      .map((product) => {
        // Map basic product information
        const mappedProduct: ProductInput = {
          name: product.name,
          slug: product.slug,
          productType: product.productType.name,
          category: product.category?.slug || "",
        };

        // Add description if present
        if (product.description) {
          mappedProduct.description = product.description;
        }

        // Map product attributes
        if (product.attributes && product.attributes.length > 0) {
          const attributes: Record<string, string | string[]> = {};

          for (const attr of product.attributes) {
            const attributeName = attr.attribute.name;
            const values = attr.values || [];

            if (values.length === 0) continue;

            // Handle different attribute types
            if (attr.attribute.inputType === "MULTISELECT" && values.length > 1) {
              // Multi-value attribute
              attributes[attributeName] = values
                .map((v) => v.name || v.slug || v.value || "")
                .filter(Boolean);
            } else if (values.length === 1) {
              // Single value attribute
              const value = values[0];
              attributes[attributeName] =
                value.name ||
                value.slug ||
                value.plainText ||
                value.richText ||
                (value.boolean !== null ? String(value.boolean) : "") ||
                value.date ||
                value.dateTime ||
                value.reference ||
                value.value ||
                "";
            }
          }

          if (Object.keys(attributes).length > 0) {
            mappedProduct.attributes = attributes;
          }
        }

        // Map channel listings
        if (product.channelListings && product.channelListings.length > 0) {
          mappedProduct.channelListings = product.channelListings
            .map((listing) => {
              const channelListing: Record<string, unknown> = {
                channel: listing.channel.slug,
                isPublished: listing.isPublished,
                visibleInListings: listing.visibleInListings,
              };

              // Only add non-null optional fields
              if (listing.availableForPurchaseAt) {
                channelListing.availableForPurchase = listing.availableForPurchaseAt;
              }
              if (listing.publicationDate) {
                channelListing.publishedAt = listing.publicationDate;
              }

              return channelListing;
            });
        }

        // Map variants
        if (product.variants && product.variants.length > 0) {
          mappedProduct.variants = product.variants.map((variant) => {
            const mappedVariant: ProductVariantInput = {
              sku: variant.sku || "",
            };

            // Add variant name if different from product name
            if (variant.name && variant.name !== product.name) {
              mappedVariant.name = variant.name;
            }

            // Add weight if present
            if (variant.weight?.value) {
              mappedVariant.weight = variant.weight.value;
            }

            // Map variant attributes
            if (variant.attributes && variant.attributes.length > 0) {
              const variantAttributes: Record<string, string | string[]> = {};

              for (const attr of variant.attributes) {
                const attributeName = attr.attribute.name;
                const values = attr.values || [];

                if (values.length === 0) continue;

                if (attr.attribute.inputType === "MULTISELECT" && values.length > 1) {
                  variantAttributes[attributeName] = values
                    .map((v) => v.name || v.slug || v.value || "")
                    .filter(Boolean);
                } else if (values.length === 1) {
                  const value = values[0];
                  variantAttributes[attributeName] =
                    value.name ||
                    value.slug ||
                    value.plainText ||
                    (value.boolean !== null ? String(value.boolean) : "") ||
                    value.value ||
                    "";
                }
              }

              if (Object.keys(variantAttributes).length > 0) {
                mappedVariant.attributes = variantAttributes;
              }
            }

            // Map variant channel listings
            if (variant.channelListings && variant.channelListings.length > 0) {
              mappedVariant.channelListings = variant.channelListings.map((listing) => {
                const channelData: Record<string, unknown> = {
                  channel: listing.channel.slug,
                };

                if (listing.price?.amount) {
                  channelData.price = listing.price.amount;
                }
                if (listing.costPrice?.amount) {
                  channelData.costPrice = listing.costPrice.amount;
                }
                if (listing.preorderThreshold?.quantity) {
                  channelData.preorderThreshold = listing.preorderThreshold.quantity;
                }

                return channelData;
              });
            }

            return mappedVariant;
          });
        }

        return mappedProduct;
      });
  }

  private mapWarehouses(rawWarehouses: RawSaleorConfig["warehouses"]): WarehouseInput[] {
    if (!rawWarehouses?.edges) {
      return [];
    }

    return rawWarehouses.edges
      .map((edge) => edge.node)
      .filter((node) => node !== null)
      .map((warehouse) => ({
        name: warehouse.name,
        slug: warehouse.slug,
        email: warehouse.email || undefined,
        isPrivate: warehouse.isPrivate,
        clickAndCollectOption: warehouse.clickAndCollectOption || "DISABLED",
        address: {
          streetAddress1: warehouse.address.streetAddress1,
          streetAddress2: warehouse.address.streetAddress2 || undefined,
          city: warehouse.address.city,
          cityArea: warehouse.address.cityArea || undefined,
          postalCode: warehouse.address.postalCode || undefined,
          country: warehouse.address.country.code as CountryCode,
          countryArea: warehouse.address.countryArea || undefined,
          companyName: warehouse.address.companyName || undefined,
          phone: warehouse.address.phone || undefined,
        },
        shippingZones:
          warehouse.shippingZones?.edges.map((edge) => edge.node.name).filter(Boolean) || undefined,
      }));
  }

  private mapTaxClasses(taxClasses: readonly TaxClassType[]): readonly TaxClassInput[] {
    return taxClasses.map((edge) => {
      const taxClass = edge.node;

      // Filter country rates to only include rates that belong to this tax class
      const countryRates = taxClass.countries
        .filter((country: TaxClassCountryRateType) => country.taxClass?.id === taxClass.id)
        .map((country: TaxClassCountryRateType) => ({
          countryCode: country.country.code as CountryCode,
          rate: country.rate,
        }));

      return {
        name: taxClass.name,
        countryRates: countryRates.length > 0 ? countryRates : undefined,
      };
    });
  }

  private mapShippingZones(
    rawShippingZones: RawSaleorConfig["shippingZones"]
  ): ShippingZoneInput[] {
    if (!rawShippingZones?.edges) {
      return [];
    }

    return rawShippingZones.edges
      .map((edge) => edge.node)
      .filter((node) => node !== null)
      .map((zone) => ({
        name: zone.name,
        description: zone.description || undefined,
        default: zone.default,
        countries: zone.countries.map((country) => country.code as CountryCode),
        warehouses: zone.warehouses.map((warehouse) => warehouse.slug).filter(Boolean) || undefined,
        channels: zone.channels.map((channel) => channel.slug).filter(Boolean) || undefined,
        shippingMethods:
          zone.shippingMethods && zone.shippingMethods.length > 0
            ? zone.shippingMethods.map((method) => ({
                name: method.name,
                description:
                  typeof method.description === "string"
                    ? method.description || undefined
                    : undefined,
                type: method.type as "PRICE" | "WEIGHT",
                minimumDeliveryDays: method.minimumDeliveryDays || undefined,
                maximumDeliveryDays: method.maximumDeliveryDays || undefined,
                minimumOrderWeight: method.minimumOrderWeight
                  ? {
                      unit: method.minimumOrderWeight.unit,
                      value: method.minimumOrderWeight.value,
                    }
                  : undefined,
                maximumOrderWeight: method.maximumOrderWeight
                  ? {
                      unit: method.maximumOrderWeight.unit,
                      value: method.maximumOrderWeight.value,
                    }
                  : undefined,
                channelListings:
                  method.channelListings && method.channelListings.length > 0
                    ? method.channelListings.map((listing) => ({
                        channel: listing.channel.slug,
                        price: listing.price?.amount || 0,
                        currency: (listing.price?.currency || "USD") as CurrencyCode,
                        minimumOrderPrice: listing.minimumOrderPrice?.amount || undefined,
                        maximumOrderPrice: listing.maximumOrderPrice?.amount || undefined,
                      }))
                    : undefined,
              }))
            : undefined,
      }));
  }

  /**
   * Normalizes attribute references by converting shared attributes to reference syntax
   * This prevents duplicate attribute definition errors during deployment
   */
  private normalizeAttributeReferences(config: SaleorConfig): SaleorConfig {
    // Since we just created the config from raw data, all attributes are FullAttributes at this point
    // We need to cast them properly to work with them
    const productTypesWithFullAttrs = config.productTypes as Array<{
      name: string;
      isShippingRequired?: boolean;
      productAttributes?: FullAttribute[];
      variantAttributes?: FullAttribute[];
    }>;

    const pageTypesWithFullAttrs = config.pageTypes as Array<{
      name: string;
      attributes?: FullAttribute[];
    }>;

    // Collect all attributes across product types and page types
    const attributeUsage = new Map<string, { attribute: FullAttribute; locations: string[] }>();

    // Track attributes from product types
    productTypesWithFullAttrs?.forEach((productType) => {
      [...(productType.productAttributes || []), ...(productType.variantAttributes || [])].forEach(
        (attr) => {
          const location = `productType:${productType.name}`;
          if (!attributeUsage.has(attr.name)) {
            attributeUsage.set(attr.name, { attribute: attr, locations: [] });
          }
          const usage = attributeUsage.get(attr.name);
          if (usage) {
            usage.locations.push(location);
          }
        }
      );
    });

    // Track attributes from page types
    pageTypesWithFullAttrs?.forEach((pageType) => {
      (pageType.attributes || []).forEach((attr) => {
        const location = `pageType:${pageType.name}`;
        if (!attributeUsage.has(attr.name)) {
          attributeUsage.set(attr.name, { attribute: attr, locations: [] });
        }
        const usage = attributeUsage.get(attr.name);
        if (usage) {
          usage.locations.push(location);
        }
      });
    });

    // Identify shared attributes (used in multiple locations)
    const sharedAttributes = new Set<string>();
    for (const [attrName, usage] of attributeUsage) {
      if (usage.locations.length > 1) {
        sharedAttributes.add(attrName);
      }
    }

    // Convert shared attributes to references, keep unique attributes as full definitions
    return {
      ...config,
      productTypes: productTypesWithFullAttrs?.map((productType) => ({
        ...productType,
        isShippingRequired: productType.isShippingRequired ?? false,
        productAttributes: this.convertToReferences(
          productType.productAttributes || [],
          sharedAttributes
        ),
        variantAttributes: this.convertToReferences(
          productType.variantAttributes || [],
          sharedAttributes
        ),
      })),
      pageTypes: pageTypesWithFullAttrs?.map((pageType) => ({
        ...pageType,
        attributes: this.convertToReferences(pageType.attributes || [], sharedAttributes),
      })),
    };
  }

  /**
   * Converts shared attributes to reference syntax while keeping unique attributes as full definitions
   */
  private convertToReferences(
    attributes: FullAttribute[],
    sharedAttributes: Set<string>
  ): AttributeInput[] {
    return attributes.map((attr) => {
      if (sharedAttributes.has(attr.name)) {
        // Convert to reference syntax
        return { attribute: attr.name };
      }
      // Keep as full definition for unique attributes, but remove the 'type' field
      // since AttributeInput expects SimpleAttribute not FullAttribute
      // biome-ignore lint/correctness/noUnusedVariables: We're intentionally extracting 'type' to exclude it from the result
      const { type, ...simpleAttribute } = attr;
      return simpleAttribute;
    });
  }

  mapConfig(rawConfig: RawSaleorConfig, selectiveOptions?: ParsedSelectiveOptions): SaleorConfig {
    // Default to include all sections if no selective options provided
    const options = selectiveOptions ?? { includeSections: [], excludeSections: [] };

    const config: Partial<SaleorConfig> = {};

    if (shouldIncludeSection("shop", options)) {
      config.shop = this.mapShopSettings(rawConfig);
    }

    if (shouldIncludeSection("channels", options)) {
      config.channels = this.mapChannels(rawConfig.channels);
    }

    if (shouldIncludeSection("productTypes", options)) {
      config.productTypes = this.mapProductTypes(rawConfig.productTypes);
    }

    if (shouldIncludeSection("pageTypes", options)) {
      config.pageTypes = this.mapPageTypes(rawConfig.pageTypes);
    }

    if (shouldIncludeSection("categories", options)) {
      config.categories = this.mapCategories(rawConfig.categories);
    }

    if (shouldIncludeSection("products", options)) {
      config.products = this.mapProducts(rawConfig.products);
    }

    if (shouldIncludeSection("warehouses", options)) {
      config.warehouses = this.mapWarehouses(rawConfig.warehouses);
    }

    if (shouldIncludeSection("shippingZones", options)) {
      config.shippingZones = this.mapShippingZones(rawConfig.shippingZones);
    }

    if (shouldIncludeSection("taxClasses", options)) {
      config.taxClasses = this.mapTaxClasses(rawConfig.taxClasses?.edges || []);
    }

    const fullConfig = config as SaleorConfig;

    // Normalize attribute references to prevent duplication errors during deployment
    return this.normalizeAttributeReferences(fullConfig);
  }
}

type RawAttribute = NonNullable<
  NonNullable<RawSaleorConfig["productTypes"]>["edges"][number]["node"]["productAttributes"]
>[number] & {
  entityType?: "PAGE" | "PRODUCT" | "PRODUCT_VARIANT";
};
