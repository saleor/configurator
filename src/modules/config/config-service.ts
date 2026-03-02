import invariant from "tiny-invariant";
import type { ParsedSelectiveOptions } from "../../core/diff/types";
import { logger } from "../../lib/logger";
import { object } from "../../lib/utils/object";
import { shouldIncludeSection } from "../../lib/utils/selective-options";
import { toSlug } from "../../lib/utils/string";
import { extractSourceUrlFromMetadata } from "../product/media-metadata";
import { UnsupportedInputTypeError } from "./errors";
import type { ConfigurationOperations, RawSaleorConfig } from "./repository";
import type { AttributeInput, FullAttribute } from "./schema/attribute.schema";
import {
  type ContentAttribute,
  contentAttributeSchema,
  type ProductAttribute,
  productAttributeSchema,
} from "./schema/global-attributes.schema";
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
  ProductMediaInput,
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
    const config = await this.buildConfig(selectiveOptions);
    await this.storage.save(config);
    return config;
  }

  async retrieveWithoutSaving(selectiveOptions?: ParsedSelectiveOptions): Promise<SaleorConfig> {
    return this.buildConfig(selectiveOptions);
  }

  private async buildConfig(selectiveOptions?: ParsedSelectiveOptions): Promise<SaleorConfig> {
    const rawConfig = await this.repository.fetchConfig();
    const config = this.mapConfig(rawConfig, selectiveOptions);
    const options = selectiveOptions ?? { includeSections: [], excludeSections: [] };

    const { productAttributes, contentAttributes } = this.mapGlobalAttributeSections(rawConfig);
    if (shouldIncludeSection("productAttributes", options)) {
      config.productAttributes = productAttributes;
    }
    if (shouldIncludeSection("contentAttributes", options)) {
      config.contentAttributes = contentAttributes;
    }
    this.reorderConfigKeys(config as SaleorConfig);

    return config;
  }

  private reorderConfigKeys(config: SaleorConfig): void {
    const ordered: Partial<SaleorConfig> = {};
    const orderedRecord = ordered as Record<string, unknown>;
    const configRecord = config as Record<string, unknown>;

    const push = (k: keyof SaleorConfig) => {
      if (config[k] !== undefined) orderedRecord[k] = config[k];
    };

    push("shop");
    push("channels");
    push("warehouses");
    push("shippingZones");
    push("taxClasses");
    push("productAttributes");
    push("contentAttributes");
    push("productTypes");
    push("pageTypes");
    push("modelTypes");
    push("categories");
    push("collections");
    push("products");
    push("models");
    push("menus");

    for (const key of Object.keys(configRecord)) {
      if (!(key in orderedRecord)) {
        orderedRecord[key] = configRecord[key];
      }
    }

    for (const key of Object.keys(configRecord)) delete configRecord[key];
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
        values: (attribute.choices.edges as Array<{ node: { name: string | null | undefined } }>)
          .filter(
            (edge: {
              node: { name: string | null | undefined };
            }): edge is { node: { name: string } } =>
              edge.node.name !== null && edge.node.name !== undefined
          )
          .map((edge: { node: { name: string } }) => ({
            name: edge.node.name,
          })),
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
      rawAttributes?.map((attribute: RawAttribute) =>
        this.mapAttribute(attribute, attributeType)
      ) ?? []
    );
  }

  private mapProductTypes(rawProductTypes: RawSaleorConfig["productTypes"]): ProductTypeInput[] {
    type ProductTypeEdge = NonNullable<RawSaleorConfig["productTypes"]>["edges"][number];
    return (
      rawProductTypes?.edges?.map((edge: ProductTypeEdge) => ({
        name: edge.node.name,
        isShippingRequired: edge.node.isShippingRequired,
        productAttributes: this.mapAttributes(edge.node.productAttributes ?? [], "PRODUCT_TYPE"),
        variantAttributes: this.mapVariantAttributes(
          edge.node.assignedVariantAttributes ?? [],
          "PRODUCT_TYPE"
        ),
      })) ?? []
    );
  }

  /**
   * Maps variant attributes including variantSelection property.
   * Only includes variantSelection when true (omits when false for cleaner YAML).
   */
  private mapVariantAttributes(
    assignedVariantAttributes: NonNullable<
      NonNullable<
        RawSaleorConfig["productTypes"]
      >["edges"][number]["node"]["assignedVariantAttributes"]
    >,
    attributeType: "PRODUCT_TYPE" | "PAGE_TYPE"
  ): FullAttribute[] {
    type AssignedVariantAttribute = NonNullable<
      RawSaleorConfig["productTypes"]
    >["edges"][number]["node"]["assignedVariantAttributes"][number];

    return assignedVariantAttributes.map((assigned: AssignedVariantAttribute) => {
      const baseAttribute = this.mapAttribute(assigned.attribute, attributeType);
      // Only include variantSelection when true (omit when false for cleaner YAML)
      if (assigned.variantSelection) {
        return { ...baseAttribute, variantSelection: true };
      }
      return baseAttribute;
    });
  }

  private mapGlobalAttributeSections(raw: RawSaleorConfig): {
    productAttributes: ProductAttribute[];
    contentAttributes: ContentAttribute[];
  } {
    type AttributeEdge = NonNullable<RawSaleorConfig["attributes"]>["edges"][number];
    const edges: AttributeEdge[] = raw.attributes?.edges ?? [];

    if (edges.length === 0) {
      return { productAttributes: [], contentAttributes: [] };
    }

    const seenProductNames = new Set<string>();
    const seenContentNames = new Set<string>();
    const productAttributes: ProductAttribute[] = [];
    const contentAttributes: ContentAttribute[] = [];

    for (const edge of edges) {
      const node = edge?.node;
      if (!node?.name || !node?.inputType) continue;

      const rawType: unknown = node.type;
      if (!isSaleorAttributeType(rawType)) {
        logger.warn(
          `Attribute "${node.name}" has unexpected type "${String(rawType)}", defaulting to PRODUCT_TYPE`
        );
      }
      const type: SaleorAttributeType = isSaleorAttributeType(rawType) ? rawType : "PRODUCT_TYPE";

      try {
        const fullAttr = this.mapAttribute(toRawAttribute(node), type);
        const { type: _, ...attrWithoutType } = fullAttr;

        if (type === "PRODUCT_TYPE" && !seenProductNames.has(node.name)) {
          seenProductNames.add(node.name);
          const parsed = productAttributeSchema.safeParse(attrWithoutType);
          if (parsed.success) {
            productAttributes.push(parsed.data);
          } else {
            logger.warn(
              `Skipping malformed product attribute "${node.name}": ${parsed.error.issues.map((i) => i.message).join(", ")}`
            );
          }
        } else if (type === "PRODUCT_TYPE" && seenProductNames.has(node.name)) {
          logger.warn(`Skipping duplicate product attribute "${node.name}" during introspect`);
        } else if (type === "PAGE_TYPE" && !seenContentNames.has(node.name)) {
          seenContentNames.add(node.name);
          const parsed = contentAttributeSchema.safeParse(attrWithoutType);
          if (parsed.success) {
            contentAttributes.push(parsed.data);
          } else {
            logger.warn(
              `Skipping malformed content attribute "${node.name}": ${parsed.error.issues.map((i) => i.message).join(", ")}`
            );
          }
        } else if (type === "PAGE_TYPE" && seenContentNames.has(node.name)) {
          logger.warn(`Skipping duplicate content attribute "${node.name}" during introspect`);
        }
      } catch (error) {
        if (error instanceof UnsupportedInputTypeError) {
          logger.warn(
            `Skipping attribute "${node.name}" with unsupported input type "${node.inputType}": ${error.message}`
          );
          continue;
        }
        throw error;
      }
    }

    logger.debug("Global attributes mapped", {
      productAttributeCount: productAttributes.length,
      contentAttributeCount: contentAttributes.length,
    });

    return { productAttributes, contentAttributes };
  }

  private mapPageTypes(rawPageTypes: RawSaleorConfig["pageTypes"]) {
    type PageTypeEdge = NonNullable<RawSaleorConfig["pageTypes"]>["edges"][number];
    return (
      rawPageTypes?.edges?.map((edge: PageTypeEdge) => ({
        name: edge.node.name,
        slug: toSlug(edge.node.name),
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
          zone.warehouses
            .map((warehouse: { slug: string | null | undefined }) => warehouse.slug)
            .filter(Boolean) || undefined,
        channels:
          zone.channels
            .map((channel: { slug: string | null | undefined }) => channel.slug)
            .filter(Boolean) || undefined,
        shippingMethods:
          zone.shippingMethods && zone.shippingMethods.length > 0
            ? zone.shippingMethods.map(
                (method: {
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
                      ? method.channelListings.map(
                          (listing: {
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
                          })
                        )
                      : undefined,
                })
              )
            : undefined,
      }));
  }

  private normalizeAttributeReferences(config: SaleorConfig): SaleorConfig {
    return {
      ...config,
      productTypes: config.productTypes?.map((productType) => ({
        ...productType,
        isShippingRequired: productType.isShippingRequired ?? false,
        productAttributes: this.convertAllToReferences(productType.productAttributes || []),
        variantAttributes: this.convertAllToReferences(productType.variantAttributes || []),
      })),
      pageTypes: config.pageTypes?.map((pageType) => {
        if (!("attributes" in pageType)) return pageType;
        return {
          ...pageType,
          attributes: this.convertAllToReferences(pageType.attributes),
        };
      }),
    };
  }

  private convertAllToReferences(attributes: AttributeInput[]): AttributeInput[] {
    return attributes.map((attr) => {
      if ("attribute" in attr) {
        return attr;
      }
      const ref: AttributeInput = { attribute: attr.name };
      if (attr.variantSelection === true) {
        return { ...ref, variantSelection: true };
      }
      return ref;
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
        products:
          node.products?.edges
            ?.map((e: { node: { slug: string } }) => e.node.slug)
            .filter(Boolean) || [],
        channelListings:
          node.channelListings?.map(
            (listing: {
              channel: { slug: string };
              isPublished: boolean;
              publishedAt?: string | null;
            }) => ({
              channelSlug: listing.channel.slug,
              isPublished: listing.isPublished,
              publishedAt:
                typeof listing.publishedAt === "string" ? listing.publishedAt : undefined,
            })
          ) || [],
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
      url: typeof item.url === "string" && item.url.trim() ? item.url.trim() : undefined,
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
      url: typeof child.url === "string" && child.url.trim() ? child.url.trim() : undefined,
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
            .map(
              (v: { name?: string | null; slug?: string | null; value?: string | null }) =>
                v.name || v.slug || v.value
            )
            .filter(
              (value: string | null | undefined): value is string =>
                value !== null && value !== undefined
            );
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
      const product: ProductInput = {
        name: node.name,
        slug: node.slug,
        description: node.description || undefined,
        productType: node.productType.name,
        category: node.category?.slug || "",
        taxClass: node.taxClass?.name || undefined,
        attributes: this.mapProductAttributes(node.attributes || []),
        variants:
          node.variants?.map(
            (variant: {
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
              // Preserve empty SKU as empty string (don't default to variant ID)
              sku: variant.sku ?? "",
              weight: variant.weight?.value || undefined,
              attributes: this.mapProductAttributes(variant.attributes || []),
              channelListings:
                variant.channelListings
                  ?.map(
                    (listing: {
                      channel: { slug: string };
                      price?: { amount?: number | null } | null;
                      costPrice?: { amount?: number | null } | null;
                    }) => ({
                      channel: listing.channel.slug,
                      price: listing.price ? Number(listing.price.amount) : undefined,
                      costPrice: listing.costPrice ? Number(listing.costPrice.amount) : undefined,
                    })
                  )
                  // Keep only listings with a defined numeric price to satisfy schema
                  .filter((l: { price?: number }) => typeof l.price === "number") || [],
            })
          ) || [],
        channelListings:
          node.channelListings?.map(
            (listing: {
              channel: { slug: string };
              isPublished: boolean;
              publishedAt?: string | null;
              visibleInListings: boolean;
              isAvailableForPurchase?: boolean;
              availableForPurchaseAt?: string | null;
            }) => ({
              channel: listing.channel.slug,
              isPublished: listing.isPublished,
              publishedAt: listing.publishedAt || undefined,
              visibleInListings: listing.visibleInListings,
              isAvailableForPurchase: listing.isAvailableForPurchase,
              availableForPurchaseAt: listing.availableForPurchaseAt || undefined,
            })
          ) || [],
      };

      const media = this.mapProductMedia(node.media || []);
      if (media.length > 0) {
        product.media = media;
      }

      return product;
    });
  }

  private mapProductMedia(
    media: Array<{
      url?: string | null;
      alt?: string | null;
      metadata?: Array<{ key?: string | null; value?: string | null }> | null;
    }> = []
  ): ProductMediaInput[] {
    return media
      .map((item) => {
        const metadataUrl = extractSourceUrlFromMetadata(item.metadata ?? undefined);
        const resolvedUrl = metadataUrl ?? item.url?.trim();
        if (!resolvedUrl) return null;
        const alt = item.alt?.trim();
        const mediaInput: ProductMediaInput = {
          externalUrl: resolvedUrl,
        };
        if (alt) {
          mediaInput.alt = alt;
        }
        return mediaInput;
      })
      .filter((value): value is ProductMediaInput => value !== null);
  }

  private mapProductAttributes(attributes: readonly unknown[]): Record<string, string | string[]> {
    const result: Record<string, string | string[]> = {};

    for (const attr of attributes) {
      const typedAttr = attr as {
        attribute: { name: string; inputType: string };
        values?: Array<{ name?: string | null; value?: string | null }>;
      };
      const attributeName = typedAttr.attribute.name;

      if (!attributeName) {
        continue;
      }

      const rawValues = (typedAttr.values ?? [])
        .map((value) => {
          const selectedValue = this.isMultipleChoiceAttribute(typedAttr.attribute.inputType)
            ? value.name
            : (value.value ?? value.name);
          return selectedValue?.trim();
        })
        .filter((value): value is string => Boolean(value));

      if (rawValues.length === 1) {
        result[attributeName] = rawValues[0];
      } else if (rawValues.length > 1) {
        result[attributeName] = rawValues;
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

type SaleorAttributeType = "PRODUCT_TYPE" | "PAGE_TYPE";

function isSaleorAttributeType(value: unknown): value is SaleorAttributeType {
  return value === "PRODUCT_TYPE" || value === "PAGE_TYPE";
}

function toRawAttribute(node: {
  name?: string | null;
  slug?: string | null;
  inputType?: string | null;
  entityType?: string | null;
  choices?: { edges: Array<{ node: { name: string | null | undefined } }> } | null;
}): RawAttribute {
  return {
    name: node.name ?? null,
    slug: node.slug ?? null,
    inputType: node.inputType ?? null,
    entityType: (node.entityType as RawAttribute["entityType"]) ?? undefined,
    choices: node.choices ?? null,
  } as RawAttribute;
}
