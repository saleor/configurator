import invariant from "tiny-invariant";
import type { ParsedSelectiveOptions } from "../../core/diff/types";
import { object } from "../../lib/utils/object";
import { logger } from "../../lib/logger";
import { shouldIncludeSection } from "../../lib/utils/selective-options";
import { UnsupportedInputTypeError } from "./errors";
import type { ConfigurationOperations, RawSaleorConfig } from "./repository";
import type { AttributeInput, FullAttribute } from "./schema/attribute.schema";
import type {
  CategoryInput,
  CategoryUpdateInput,
  CollectionInput,
  CountryCode,
  CurrencyCode,
  MenuInput,
  ModelInput,
  ModelTypeInput,
  ProductInput,
  ProductTypeInput,
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
  taxClass: { id: string; name: string } | null;
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
    // Warn about attributes that exist but aren't assigned to any product type
    try {
      if (config.productTypes) this.warnAboutUnassignedAttributes(rawConfig, config.productTypes);
      // Include unassigned attributes in config
      if (config.productTypes) {
        const unassigned = this.mapUnassignedAttributes(rawConfig, config.productTypes);
        if (unassigned.length > 0) {
          config.attributes = unassigned;
        }
      }
      // Ensure attributes appear first in YAML ordering
      this.reorderConfigKeys(config as SaleorConfig);
    } catch {
      // best-effort advisory
    }
    await this.storage.save(config);
    return config;
  }

  async retrieveWithoutSaving(selectiveOptions?: ParsedSelectiveOptions): Promise<SaleorConfig> {
    const rawConfig = await this.repository.fetchConfig();
    const config = this.mapConfig(rawConfig, selectiveOptions);
    if (config.productTypes) {
      const unassigned = this.mapUnassignedAttributes(rawConfig, config.productTypes);
      if (unassigned.length > 0) {
        config.attributes = unassigned;
      }
    }
    this.reorderConfigKeys(config as SaleorConfig);
    return config;
  }

  /**
   * Mutates config to order keys: attributes first, then core sections.
   */
  private reorderConfigKeys(config: SaleorConfig): void {
    const ordered: Partial<SaleorConfig> = {};
    const push = (k: keyof SaleorConfig) => {
      if (config[k] !== undefined) (ordered as Record<string, unknown>)[k] = config[k];
    };
    // Desired order (attributes at the top)
    push("attributes");
    push("shop");
    push("channels");
    push("warehouses");
    push("shippingZones");
    push("taxClasses");
    push("productTypes");
    push("pageTypes");
    push("modelTypes");
    push("categories");
    push("collections");
    push("products");
    push("models");
    push("menus");

    // Clear and assign back in order
    for (const key of Object.keys(config)) delete (config as Record<string, unknown>)[key];
    Object.assign(config, ordered);
  }

  private mapChannels(rawChannels: RawSaleorConfig["channels"]): SaleorConfig["channels"] {
    type ChannelNode = NonNullable<RawSaleorConfig["channels"]>[number];
    return (
      rawChannels?.map((channel: ChannelNode) => ({
        name: channel.name,
        currencyCode: channel.currencyCode as CurrencyCode,
        defaultCountry: channel.defaultCountry.code as CountryCode,
        slug: channel.slug,
        isActive: Boolean(channel.isActive ?? false),
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
        values: ((attribute.choices.edges as Array<{ node: { name: string | null | undefined } }>)
          .filter((edge: { node: { name: string | null | undefined } }): edge is { node: { name: string } } =>
            edge.node.name !== null && edge.node.name !== undefined
          )
          .map((edge: { node: { name: string } }) => ({
            name: edge.node.name,
          }))),
      };
    }

    if (this.isReferenceAttribute(attribute.inputType)) {
      return {
        name: attribute.name,
        inputType: "REFERENCE" as const,
        entityType: attribute.entityType || "PRODUCT",
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
    return (
      rawAttributes?.map((attribute: RawAttribute) => this.mapAttribute(attribute, attributeType)) ?? []
    );
  }

  private mapProductTypes(rawProductTypes: RawSaleorConfig["productTypes"]): ProductTypeInput[] {
    type ProductTypeEdge = NonNullable<RawSaleorConfig["productTypes"]>["edges"][number];
    return (
      rawProductTypes?.edges?.map((edge: ProductTypeEdge) => ({
        name: edge.node.name,
        isShippingRequired: edge.node.isShippingRequired,
        productAttributes: this.mapAttributes(edge.node.productAttributes ?? [], "PRODUCT_TYPE"),
        variantAttributes: this.mapAttributes(
          edge.node.assignedVariantAttributes?.map((attribute: NonNullable<ProductTypeEdge>["node"]["assignedVariantAttributes"][number]) => attribute.attribute) ?? [],
          "PRODUCT_TYPE"
        ),
      })) ?? []
    );
  }

  private warnAboutUnassignedAttributes(
    raw: RawSaleorConfig,
    mappedProductTypes: ProductTypeInput[]
  ): void {
    type AttributeEdge = NonNullable<RawSaleorConfig["attributes"]>["edges"][number];
    const rawEdges: AttributeEdge[] = (raw.attributes?.edges as AttributeEdge[]) || [];
    if (!rawEdges || rawEdges.length === 0) return;
    const productAttrNames = new Set<string>();
    for (const edge of rawEdges) {
      if (edge?.node?.type === "PRODUCT_TYPE" && edge.node.name) {
        productAttrNames.add(edge.node.name);
      }
    }
    if (productAttrNames.size === 0) return;
    const mappedNames = new Set<string>();
    const getAttrName = (a: AttributeInput): string | undefined =>
      "name" in a ? a.name : "attribute" in a ? a.attribute : undefined;
    const addNameFromAttributeInput = (a: AttributeInput) => {
      const n = getAttrName(a);
      if (n) mappedNames.add(n);
    };
    for (const pt of mappedProductTypes) {
      for (const a of pt.productAttributes ?? []) addNameFromAttributeInput(a);
      for (const a of pt.variantAttributes ?? []) addNameFromAttributeInput(a);
    }
    const missing = Array.from(productAttrNames).filter((n) => !mappedNames.has(n));
    if (missing.length > 0) {
      logger.warn(
        `Found ${missing.length} product attributes not assigned to any product type. They will be included under top-level 'attributes' (not assigned): ${missing.join(", ")}`
      );
    }
  }

  private mapUnassignedAttributes(raw: RawSaleorConfig, mappedProductTypes: ProductTypeInput[]) {
    type AttributeEdge = NonNullable<RawSaleorConfig["attributes"]>["edges"][number];
    const edges: AttributeEdge[] = (raw.attributes?.edges as AttributeEdge[]) || [];
    if (edges.length === 0) return [] as FullAttribute[];

    // Build set of names already mapped via productTypes
    const mapped = new Set<string>();
    const getAttrName = (a: AttributeInput): string | undefined =>
      "name" in a ? a.name : "attribute" in a ? a.attribute : undefined;
    const addNameFromAttributeInput = (a: AttributeInput) => {
      const n = getAttrName(a);
      if (n) mapped.add(n);
    };
    for (const pt of mappedProductTypes) {
      for (const a of pt.productAttributes ?? []) addNameFromAttributeInput(a);
      for (const a of pt.variantAttributes ?? []) addNameFromAttributeInput(a);
    }

    const unassigned = edges
      .filter((e) => e?.node?.type === "PRODUCT_TYPE" && e.node?.name && !mapped.has(e.node.name))
      .map((e) => e!.node!);

    const toFullAttribute = (node: {
      name: string;
      inputType: string;
      entityType?: string | null;
      choices?: { edges?: Array<{ node: { name?: string | null } | null } | null> } | null;
    }): FullAttribute => {
      const inputType = node.inputType as FullAttribute["inputType"];
      if (inputType === "DROPDOWN" || inputType === "MULTISELECT" || inputType === "SWATCH") {
        const values = (node.choices?.edges || [])
          .map((edge) => edge?.node?.name)
          .filter((n): n is string => !!n)
          .map((name) => ({ name }));
        return { name: node.name, inputType, type: "PRODUCT_TYPE", values } as FullAttribute;
      }
      if (inputType === "REFERENCE") {
        return {
          name: node.name,
          inputType: "REFERENCE",
          type: "PRODUCT_TYPE",
          entityType: (node.entityType as "PAGE" | "PRODUCT" | "PRODUCT_VARIANT" | null) ?? "PRODUCT",
        } as FullAttribute;
      }
      return { name: node.name, inputType, type: "PRODUCT_TYPE" } as FullAttribute;
    };

    return unassigned.map(toFullAttribute);
  }

  private mapPageTypes(rawPageTypes: RawSaleorConfig["pageTypes"]) {
    type PageTypeEdge = NonNullable<RawSaleorConfig["pageTypes"]>["edges"][number];
    return (
      rawPageTypes?.edges?.map((edge: PageTypeEdge) => ({
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

    type CategoryEdge = NonNullable<RawSaleorConfig["categories"]>["edges"][number];
    const categoryMap: Record<string, CategoryInput> = {};
    const categories = rawCategories.edges
      .map((edge: CategoryEdge) => edge.node)
      .filter(
        (node: CategoryEdge["node"]): node is NonNullable<CategoryEdge["node"]> =>
          node !== null && node !== undefined
      );

    // Sort categories by level to ensure parents are processed before children
    categories.sort(
      (a: NonNullable<CategoryEdge["node"]>, b: NonNullable<CategoryEdge["node"]>) =>
        (a.level ?? 0) - (b.level ?? 0)
    );

    // Initialize all categories in the map
    categories.forEach((category: NonNullable<CategoryEdge["node"]>) => {
      categoryMap[category.slug] = {
        name: category.name,
        slug: category.slug,
      };
    });

    // Build the tree structure
    const tree: SaleorConfig["categories"] = [];
    categories.forEach((category: NonNullable<CategoryEdge["node"]>) => {
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

  private mapWarehouses(rawWarehouses: RawSaleorConfig["warehouses"]): WarehouseInput[] {
    if (!rawWarehouses?.edges) {
      return [];
    }

    type WarehouseEdge = NonNullable<RawSaleorConfig["warehouses"]>["edges"][number];
    return rawWarehouses.edges
      .map((edge: WarehouseEdge) => edge.node)
      .filter(
        (node: WarehouseEdge["node"]): node is NonNullable<WarehouseEdge["node"]> => node !== null
      )
      .map((warehouse: NonNullable<WarehouseEdge["node"]>) => ({
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
          warehouse.shippingZones?.edges
            .map((edge: { node: { name: string | null | undefined } }) => edge.node.name)
            .filter(Boolean) || undefined,
      }));
  }

  private mapTaxClasses(taxClasses: readonly TaxClassType[]): TaxClassInput[] {
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

    type ShippingZoneEdge = NonNullable<RawSaleorConfig["shippingZones"]>["edges"][number];
    return rawShippingZones.edges
      .map((edge: ShippingZoneEdge) => edge.node)
      .filter(
        (node: ShippingZoneEdge["node"]): node is NonNullable<ShippingZoneEdge["node"]> =>
          node !== null
      )
      .map((zone: NonNullable<ShippingZoneEdge["node"]>) => ({
        name: zone.name,
        description: zone.description || undefined,
        default: zone.default,
        countries: zone.countries.map((country: { code: string }) => country.code as CountryCode),
        warehouses:
          zone.warehouses.map((warehouse: { slug: string | null | undefined }) => warehouse.slug).filter(Boolean) ||
          undefined,
        channels:
          zone.channels.map((channel: { slug: string | null | undefined }) => channel.slug).filter(Boolean) ||
          undefined,
        shippingMethods:
          zone.shippingMethods && zone.shippingMethods.length > 0
            ? zone.shippingMethods.map((method: {
                name: string;
                description?: string | null;
                type: string;
                minimumDeliveryDays?: number | null;
                maximumDeliveryDays?: number | null;
                minimumOrderWeight?: { unit: string; value: number } | null;
                maximumOrderWeight?: { unit: string; value: number } | null;
                channelListings?: Array<{
                  channel: { slug: string };
                  price?: { amount: number; currency: string } | null;
                  minimumOrderPrice?: { amount: number } | null;
                  maximumOrderPrice?: { amount: number } | null;
                }>;
              }) => ({
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
                    ? method.channelListings.map((listing: {
                        channel: { slug: string };
                        price?: { amount: number; currency: string } | null;
                        minimumOrderPrice?: { amount: number } | null;
                        maximumOrderPrice?: { amount: number } | null;
                      }) => ({
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

    if (shouldIncludeSection("warehouses", options)) {
      config.warehouses = this.mapWarehouses(rawConfig.warehouses);
    }

    if (shouldIncludeSection("shippingZones", options)) {
      config.shippingZones = this.mapShippingZones(rawConfig.shippingZones);
    }

    if (shouldIncludeSection("taxClasses", options)) {
      config.taxClasses = this.mapTaxClasses(rawConfig.taxClasses?.edges || []);
    }

    if (shouldIncludeSection("collections", options)) {
      config.collections = this.mapCollections(rawConfig.collections?.edges || []);
    }

    if (shouldIncludeSection("menus", options)) {
      config.menus = this.mapMenus(rawConfig.menus?.edges || []);
    }

    if (shouldIncludeSection("models", options)) {
      config.models = this.mapModels(rawConfig.pages?.edges || []);
    }

    if (shouldIncludeSection("modelTypes", options)) {
      config.modelTypes = this.mapModelTypes(rawConfig.pageTypes?.edges || []);
    }

    if (shouldIncludeSection("products", options)) {
      config.products = this.mapProducts(rawConfig.products?.edges || []);
    }

    const fullConfig = config as SaleorConfig;

    // Normalize attribute references to prevent duplication errors during deployment
    return this.normalizeAttributeReferences(fullConfig);
  }

  private mapCollections(
    edges: NonNullable<RawSaleorConfig["collections"]>["edges"]
  ): CollectionInput[] {
    type CollectionEdge = NonNullable<RawSaleorConfig["collections"]>["edges"][number];
    return edges.map((edge: CollectionEdge) => {
      const node = edge.node;
      return {
        name: node.name,
        slug: node.slug,
        description: typeof node.description === "string" ? node.description : undefined,
        products: node.products?.edges?.map((e: { node: { slug: string } }) => e.node.slug).filter(Boolean) || [],
        channelListings:
          node.channelListings?.map((listing: {
            channel: { slug: string };
            isPublished: boolean;
            publishedAt?: string | null;
          }) => ({
            channelSlug: listing.channel.slug,
            isPublished: listing.isPublished,
            publishedAt: typeof listing.publishedAt === "string" ? listing.publishedAt : undefined,
          })) || [],
      };
    });
  }

  private mapMenus(edges: NonNullable<RawSaleorConfig["menus"]>["edges"]): MenuInput[] {
    type MenuEdge = NonNullable<RawSaleorConfig["menus"]>["edges"][number];
    return edges.map((edge: MenuEdge) => ({
      name: edge.node.name,
      slug: edge.node.slug,
      items: this.mapMenuItems(edge.node.items || []),
    }));
  }

  private mapMenuItems(
    items: NonNullable<RawSaleorConfig["menus"]>["edges"][0]["node"]["items"]
  ): NonNullable<MenuInput["items"]> {
    if (!items) return [];

    type MenuItemNode = NonNullable<
      NonNullable<RawSaleorConfig["menus"]>["edges"][0]["node"]["items"]
    >[number];

    return items.map((item: MenuItemNode) => ({
      name: item.name,
      url: item.url ?? undefined,
      category: item.category?.slug ?? undefined,
      collection: item.collection?.slug ?? undefined,
      page: item.page?.slug ?? undefined,
      children: item.children ? this.mapMenuChildren(item.children) : undefined,
    }));
  }

  private mapMenuChildren(
    children: NonNullable<
      NonNullable<RawSaleorConfig["menus"]>["edges"][0]["node"]["items"]
    >[0]["children"]
  ): NonNullable<MenuInput["items"]> {
    if (!children) return [];

    type MenuItemNode = NonNullable<
      NonNullable<RawSaleorConfig["menus"]>["edges"][0]["node"]["items"]
    >[number];

    return children.map((child: MenuItemNode) => ({
      name: child.name,
      url: child.url ?? undefined,
      category: child.category?.slug ?? undefined,
      collection: child.collection?.slug ?? undefined,
      page: child.page?.slug ?? undefined,
    }));
  }

  private mapModels(edges: NonNullable<RawSaleorConfig["pages"]>["edges"]): ModelInput[] {
    type PageEdge = NonNullable<RawSaleorConfig["pages"]>["edges"][number];
    return edges.map((edge: PageEdge) => {
      const node = edge.node;
      return {
        title: node.title,
        slug: node.slug,
        content: typeof node.content === "string" ? node.content : undefined,
        isPublished: node.isPublished,
        publishedAt: typeof node.publishedAt === "string" ? node.publishedAt : undefined,
        modelType: node.pageType?.name || "",
        attributes: this.mapModelAttributes(node.attributes || []),
      };
    });
  }

  private mapModelAttributes(
    attributes: NonNullable<RawSaleorConfig["pages"]>["edges"][0]["node"]["attributes"]
  ): Record<string, string | number | boolean | string[]> {
    const result: Record<string, string | number | boolean | string[]> = {};

    if (!attributes) return result;

    for (const attr of attributes) {
      const slug = attr.attribute?.slug;
      if (slug) {
        if (attr.values && attr.values.length > 0) {
          // Multi-value attribute
          result[slug] = attr.values
            .map((v: { name?: string | null; slug?: string | null; value?: string | null }) =>
              v.name || v.slug || v.value
            )
            .filter((value: string | null | undefined): value is string => value !== null && value !== undefined);
        }
      }
    }

    return result;
  }

  private mapModelTypes(
    edges: NonNullable<RawSaleorConfig["pageTypes"]>["edges"]
  ): ModelTypeInput[] {
    type PageTypeEdge = NonNullable<RawSaleorConfig["pageTypes"]>["edges"][number];
    return edges.map((edge: PageTypeEdge) => ({
      name: edge.node.name,
      attributes:
        edge.node.attributes?.map((attr: { name?: string | null }) => ({
          attribute: attr.name || "", // Reference existing attribute by name
        })) || [],
    }));
  }

  private mapProducts(edges: NonNullable<RawSaleorConfig["products"]>["edges"]): ProductInput[] {
    type ProductEdge = NonNullable<RawSaleorConfig["products"]>["edges"][number];
    return edges.map((edge: ProductEdge) => {
      const node = edge.node;
      return ({
      name: node.name,
      slug: node.slug,
      description: node.description || undefined,
      productType: node.productType.name,
      category: node.category?.slug || "",
      taxClass: node.taxClass?.name || undefined,
      attributes: this.mapProductAttributes(node.attributes || []),
      variants: node.variants?.map((variant: {
        name?: string | null;
        sku?: string | null;
        id?: string | null;
        weight?: { value?: number | null } | null;
        attributes?: readonly unknown[];
        channelListings?: Array<{
          channel: { slug: string };
          price?: { amount?: number | null } | null;
          costPrice?: { amount?: number | null } | null;
        }> | null;
      }) => ({
        name: variant.name || node.name,
        // Ensure SKU is always a string for schema validity during round-trips
        // Prefer the actual SKU; if missing/null, fall back to the variant ID; finally use empty string
        sku: (variant.sku ?? variant.id ?? ""),
        weight: variant.weight?.value || undefined,
        attributes: this.mapProductAttributes(variant.attributes || []),
        channelListings:
          variant.channelListings
            ?.map((listing: {
              channel: { slug: string };
              price?: { amount?: number | null } | null;
              costPrice?: { amount?: number | null } | null;
            }) => ({
              channel: listing.channel.slug,
              price: listing.price ? Number(listing.price.amount) : undefined,
              costPrice: listing.costPrice ? Number(listing.costPrice.amount) : undefined,
            }))
            // Keep only listings with a defined numeric price to satisfy schema
            .filter((l: { price?: number }) => typeof l.price === "number") || [],
      })) || [],
      channelListings: node.channelListings?.map((listing: {
        channel: { slug: string };
        isPublished: boolean;
        publishedAt?: string | null;
        visibleInListings: boolean;
      }) => ({
        channel: listing.channel.slug,
        isPublished: listing.isPublished,
        publishedAt: listing.publishedAt || undefined,
        visibleInListings: listing.visibleInListings,
      })) || [],
    });
    });
  }

  private mapProductAttributes(attributes: readonly unknown[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    for (const attr of attributes) {
      const typedAttr = attr as {
        attribute: { name: string; inputType: string };
        values?: Array<{ name?: string; value?: string }>;
      };
      const attributeName = typedAttr.attribute.name;
      
      // Handle different attribute input types
      if (typedAttr.attribute.inputType === "DROPDOWN" || 
          typedAttr.attribute.inputType === "MULTISELECT" || 
          typedAttr.attribute.inputType === "SWATCH") {
        // For choice-based attributes, use the choice names
        const values = typedAttr.values?.map((v) => v.name).filter(Boolean) || [];
        if (values.length === 1) {
          result[attributeName] = values[0];
        } else if (values.length > 1) {
          result[attributeName] = values;
        }
      } else {
        // For plain text and other basic attributes, use the raw value
        const values = typedAttr.values?.map((v) => v.value || v.name).filter(Boolean) || [];
        if (values.length === 1) {
          result[attributeName] = values[0];
        } else if (values.length > 1) {
          result[attributeName] = values;
        }
      }
    }
    
    return result;
  }
}

type RawAttribute = NonNullable<
  NonNullable<RawSaleorConfig["productTypes"]>["edges"][number]["node"]["productAttributes"]
>[number] & {
  entityType?: "PAGE" | "PRODUCT" | "PRODUCT_VARIANT";
};
