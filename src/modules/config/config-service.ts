import invariant from "tiny-invariant";
import type { ParsedSelectiveOptions } from "../../core/diff/types";
import { object } from "../../lib/utils/object";
import { shouldIncludeSection } from "../../lib/utils/selective-options";
import { UnsupportedInputTypeError } from "./errors";
import type { ConfigurationOperations, RawSaleorConfig } from "./repository";
import type { AttributeInput, FullAttribute } from "./schema/attribute.schema";
import type { CountryCode, CurrencyCode, ProductTypeInput, SaleorConfig } from "./schema/schema";
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
      return {
        name: attribute.name,
        inputType: "REFERENCE" as const,
        entityType: attribute.entityType,
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

    return rawCategories.edges
      .map((edge) => edge.node)
      .filter((node) => node !== null)
      .map((category) => ({
        name: category.name,
        slug: category.slug,
        // TODO: Handle subcategories/children if needed
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
