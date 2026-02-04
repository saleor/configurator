import { logger } from "../../lib/logger";
import {
  BulkOperationMessages,
  BulkOperationThresholds,
  ChunkSizeConfig,
  DelayConfig,
  StageNames,
} from "../../lib/utils/bulk-operation-constants";
import { processInChunks } from "../../lib/utils/chunked-processor";
import type { CachedAttribute } from "../../modules/attribute/attribute-cache";
import type {
  Attribute as AttributeMeta,
  AttributeUpdateInput,
} from "../../modules/attribute/repository";
import type { FullAttribute } from "../../modules/config/schema/attribute.schema";
import type {
  ContentAttribute,
  ProductAttribute,
} from "../../modules/config/schema/global-attributes.schema";
import type {
  ChannelInput,
  ChannelUpdateInput,
  SaleorConfig,
  TaxConfigurationInput,
} from "../../modules/config/schema/schema";
import type { Attribute as ProductAttributeMeta } from "../../modules/product/repository";
import { StageAggregateError } from "./errors";
import type { DeploymentContext, DeploymentStage } from "./types";

export const validationStage: DeploymentStage = {
  name: StageNames.VALIDATION,
  async execute(context) {
    try {
      // Load the configuration to validate it
      await context.configurator.services.configStorage.load();
    } catch (error) {
      throw new Error(
        `Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
};

export const shopSettingsStage: DeploymentStage = {
  name: StageNames.SHOP_SETTINGS,
  async execute(context) {
    try {
      const config = await context.configurator.services.configStorage.load();
      if (!config.shop) {
        logger.debug("No shop settings to update");
        return;
      }

      await context.configurator.services.shop.updateSettings(config.shop);
    } catch (error) {
      throw new Error(
        `Failed to update shop settings: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  skip(context) {
    return context.summary.results.every((r) => r.entityType !== "Shop Settings");
  },
};

export const productTypesStage: DeploymentStage = {
  name: StageNames.PRODUCT_TYPES,
  async execute(context) {
    try {
      const config = await context.configurator.services.configStorage.load();
      if (!config.productTypes?.length) {
        logger.debug("No product types to manage");
        return;
      }

      // Pass attribute cache to ProductTypeService for fast reference resolution
      const bootstrapOptions = { attributeCache: context.attributeCache };

      const { successes: processedSuccesses, failures: processedFailures } = await processInChunks(
        config.productTypes,
        async (chunk) => {
          // Process each product type in the chunk
          return Promise.all(
            chunk.map((productType) =>
              context.configurator.services.productType.bootstrapProductType(
                productType,
                bootstrapOptions
              )
            )
          );
        },
        {
          chunkSize: ChunkSizeConfig.PRODUCT_TYPES_CHUNK_SIZE,
          delayMs: DelayConfig.DEFAULT_CHUNK_DELAY_MS,
          entityType: "product types",
        }
      );

      const successes = processedSuccesses.map((s) => s.item.name);
      const failures = processedFailures.map((f) => ({
        entity: f.item.name,
        error: f.error,
      }));

      if (failures.length > 0) {
        throw new StageAggregateError("Managing product types", failures, successes);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("Failed to manage product type")) {
        throw error;
      }
      throw new Error(
        `Failed to manage product types: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  skip(context) {
    // Product Types stage should run if:
    // 1. Product Types have changes, OR
    // 2. Products have changes (since products depend on product types)
    const hasProductTypeChanges = context.summary.results.some(
      (r) => r.entityType === "Product Types"
    );
    const hasProductChanges = context.summary.results.some((r) => r.entityType === "Products");

    return !hasProductTypeChanges && !hasProductChanges;
  },
};

/**
 * Helper function to convert global attribute (ProductAttribute or ContentAttribute)
 * to FullAttribute format by adding the type field.
 */
function toFullAttribute(
  attr: ProductAttribute | ContentAttribute,
  type: "PRODUCT_TYPE" | "PAGE_TYPE"
): FullAttribute {
  return { ...attr, type } as FullAttribute;
}

/**
 * Process a batch of attributes (create/update) and return CachedAttribute results.
 * Returns the successfully processed attributes for caching.
 */
async function processGlobalAttributes(
  context: DeploymentContext,
  attributes: Array<ProductAttribute | ContentAttribute>,
  type: "PRODUCT_TYPE" | "PAGE_TYPE",
  sectionName: string
): Promise<{ cached: CachedAttribute[]; failures: Array<{ entity: string; error: Error }> }> {
  if (attributes.length === 0) {
    return { cached: [], failures: [] };
  }

  const service = context.configurator.services.attribute;
  const fullAttributes = attributes.map((attr) => toFullAttribute(attr, type));
  const failures: Array<{ entity: string; error: Error }> = [];
  const cached: CachedAttribute[] = [];

  // Fetch existing attributes
  const names = attributes.map((a) => a.name);
  const existing = await service.repo.getAttributesByNames({ names, type });
  const existingMap = new Map(existing?.filter((a) => a.name).map((a) => [a.name, a]) ?? []);

  if (fullAttributes.length <= BulkOperationThresholds.ATTRIBUTES) {
    // Sequential processing for small configs
    logger.debug(BulkOperationMessages.SEQUENTIAL_PROCESSING(fullAttributes.length, sectionName));

    const results = await Promise.allSettled(
      fullAttributes.map(async (attr) => {
        const existingAttr = existingMap.get(attr.name);
        let result: AttributeMeta | undefined;

        if (existingAttr) {
          await service.updateAttribute(attr, existingAttr);
          result = existingAttr;
        } else {
          await service.bootstrapAttributes({ attributeInputs: [attr] });
          // Fetch the created attribute to get its ID
          const fetched = await service.repo.getAttributesByNames({ names: [attr.name], type });
          result = fetched?.[0];
        }

        if (result?.id && result?.name) {
          return {
            id: result.id,
            name: result.name,
            slug: result.name.toLowerCase().replace(/ /g, "-"),
            inputType: result.inputType ?? attr.inputType,
          } as CachedAttribute;
        }
        return null;
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        cached.push(r.value);
      } else if (r.status === "rejected") {
        failures.push({
          entity: "attribute",
          error: r.reason instanceof Error ? r.reason : new Error(String(r.reason)),
        });
      }
    }
  } else {
    // Bulk processing for large configs
    logger.info(BulkOperationMessages.BULK_PROCESSING(fullAttributes.length, sectionName));

    const toCreate = fullAttributes.filter((attr) => !existingMap.has(attr.name));
    const toUpdate = fullAttributes
      .filter((attr) => existingMap.has(attr.name))
      .map((attr) => {
        const existing = existingMap.get(attr.name);
        if (!existing) throw new Error(`Expected attribute ${attr.name} in existing map`);
        return { input: attr, existing };
      });

    if (toCreate.length > 0) {
      logger.info(`Creating ${toCreate.length} new ${sectionName} via bulk mutation`);
      const createResult = await service.bootstrapAttributesBulk(toCreate);
      createResult.failed.forEach(({ input, errors }) => {
        failures.push({ entity: input.name, error: new Error(errors.join(", ")) });
      });
    }

    if (toUpdate.length > 0) {
      logger.info(`Updating ${toUpdate.length} existing ${sectionName} via bulk mutation`);
      const updateResult = await service.updateAttributesBulk(toUpdate);
      updateResult.failed.forEach(({ input, errors }) => {
        failures.push({ entity: input.name, error: new Error(errors.join(", ")) });
      });
    }

    // Fetch all attributes to cache
    const allFetched = await service.repo.getAttributesByNames({ names, type });
    for (const attr of allFetched ?? []) {
      if (attr.id && attr.name && !failures.some((f) => f.entity === attr.name)) {
        cached.push({
          id: attr.id,
          name: attr.name,
          slug: attr.name.toLowerCase().replace(/ /g, "-"),
          inputType: attr.inputType ?? "",
        });
      }
    }
  }

  return { cached, failures };
}

export const attributesStage: DeploymentStage = {
  name: StageNames.ATTRIBUTES,
  async execute(context) {
    const config = (await context.configurator.services.configStorage.load()) as SaleorConfig;
    const productAttributes = config.productAttributes ?? [];
    const contentAttributes = config.contentAttributes ?? [];
    const legacyAttributes = config.attributes ?? [];

    const allFailures: Array<{ entity: string; error: Error }> = [];

    // 1. Process productAttributes section (PRODUCT_TYPE)
    if (productAttributes.length > 0) {
      logger.info(`Processing ${productAttributes.length} product attributes`);
      const { cached, failures } = await processGlobalAttributes(
        context,
        productAttributes,
        "PRODUCT_TYPE",
        "product attributes"
      );
      context.attributeCache.populateProductAttributes(cached);
      allFailures.push(...failures);
      logger.debug(`Cached ${cached.length} product attributes`);
    }

    // 2. Process contentAttributes section (PAGE_TYPE)
    if (contentAttributes.length > 0) {
      logger.info(`Processing ${contentAttributes.length} content attributes`);
      const { cached, failures } = await processGlobalAttributes(
        context,
        contentAttributes,
        "PAGE_TYPE",
        "content attributes"
      );
      context.attributeCache.populateContentAttributes(cached);
      allFailures.push(...failures);
      logger.debug(`Cached ${cached.length} content attributes`);
    }

    // 3. Process legacy attributes section (for backward compatibility)
    if (legacyAttributes.length > 0) {
      logger.warn(
        `DEPRECATED: The 'attributes' section is deprecated. Use 'productAttributes' for PRODUCT_TYPE ` +
          `attributes and 'contentAttributes' for PAGE_TYPE attributes. Run 'saleor-configurator introspect' ` +
          `to generate the new format.`
      );
      logger.info(`Processing ${legacyAttributes.length} legacy unassigned attributes`);

      // Group by type
      const productType = legacyAttributes.filter((a) => a.type === "PRODUCT_TYPE");
      const pageType = legacyAttributes.filter((a) => a.type === "PAGE_TYPE");

      if (productType.length > 0) {
        const { cached, failures } = await processGlobalAttributes(
          context,
          productType,
          "PRODUCT_TYPE",
          "legacy product attributes"
        );
        context.attributeCache.populateProductAttributes(cached);
        allFailures.push(...failures);
      }

      if (pageType.length > 0) {
        const { cached, failures } = await processGlobalAttributes(
          context,
          pageType,
          "PAGE_TYPE",
          "legacy content attributes"
        );
        context.attributeCache.populateContentAttributes(cached);
        allFailures.push(...failures);
      }
    }

    // Report cache stats
    const stats = context.attributeCache.getStats();
    logger.info(
      `Attribute cache populated: ${stats.productAttributeCount} product, ${stats.contentAttributeCount} content`
    );

    // Throw if there were any failures
    if (allFailures.length > 0) {
      throw new StageAggregateError(
        "Managing attributes",
        allFailures,
        [...productAttributes, ...contentAttributes].map((a) => a.name)
      );
    }
  },
  skip(context) {
    // Check for any attribute-related changes across all attribute entity types
    const attributeEntityTypes = ["Attributes", "Product Attributes", "Content Attributes"];
    return context.summary.results.every((r) => !attributeEntityTypes.includes(r.entityType));
  },
};

export const channelsStage: DeploymentStage = {
  name: StageNames.CHANNELS,
  async execute(context) {
    try {
      const config = await context.configurator.services.configStorage.load();
      if (!config.channels?.length) {
        logger.debug("No channels to manage");
        return;
      }

      await context.configurator.services.channel.bootstrapChannels(config.channels);

      // Sync per-channel tax configuration if provided in config
      for (const ch of config.channels) {
        const channel = ch as ChannelInput;
        const taxCfg: TaxConfigurationInput | undefined =
          ("taxConfiguration" in (channel as ChannelUpdateInput) &&
            (channel as ChannelUpdateInput).taxConfiguration) ||
          undefined;
        if (!taxCfg) continue;

        const existing = await context.configurator.services.channel.getChannelBySlug(ch.slug);
        if (!existing?.id) continue;

        await context.configurator.services.tax.updateChannelTaxConfiguration(existing.id, taxCfg);
      }
    } catch (error) {
      throw new Error(
        `Failed to manage channels: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  skip(context) {
    // Channels stage should run if:
    // 1. Channels have changes, OR
    // 2. Products have changes (since products may have channel listings)
    const hasChannelChanges = context.summary.results.some((r) => r.entityType === "Channels");
    const hasProductChanges = context.summary.results.some((r) => r.entityType === "Products");

    return !hasChannelChanges && !hasProductChanges;
  },
};

export const pageTypesStage: DeploymentStage = {
  name: StageNames.PAGE_TYPES,
  async execute(context) {
    try {
      const config = await context.configurator.services.configStorage.load();
      if (!config.pageTypes?.length) {
        logger.debug("No page types to manage");
        return;
      }

      const results = await Promise.allSettled(
        config.pageTypes.map((pageType) =>
          context.configurator.services.pageType
            .bootstrapPageType(pageType)
            .then(() => ({ name: pageType.name, success: true }))
            .catch((error) => ({
              name: pageType.name,
              success: false,
              error: error instanceof Error ? error : new Error(String(error)),
            }))
        )
      );

      const successes = results
        .filter(
          (r): r is PromiseFulfilledResult<{ name: string; success: true }> =>
            r.status === "fulfilled" && r.value.success === true
        )
        .map((r) => r.value.name);

      const failures = results
        .filter(
          (r): r is PromiseFulfilledResult<{ name: string; success: false; error: Error }> =>
            r.status === "fulfilled" && r.value.success === false
        )
        .map((r) => ({ entity: r.value.name, error: r.value.error }));

      if (failures.length > 0) {
        throw new StageAggregateError("Managing page types", failures, successes);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("Failed to manage page type")) {
        throw error;
      }
      throw new Error(
        `Failed to manage page types: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  skip(context) {
    return context.summary.results.every((r) => r.entityType !== "Page Types");
  },
};

export const modelTypesStage: DeploymentStage = {
  name: StageNames.MODEL_TYPES,
  async execute(context) {
    try {
      const config = await context.configurator.services.configStorage.load();
      if (!config.modelTypes?.length) {
        logger.debug("No model types to manage");
        return;
      }

      // Pass attribute cache for fast content attribute resolution
      const bootstrapOptions = { attributeCache: context.attributeCache };

      const results = await Promise.allSettled(
        config.modelTypes.map((modelType) =>
          context.configurator.services.pageType
            .bootstrapPageType(modelType, bootstrapOptions)
            .then(() => ({ name: modelType.name, success: true }))
            .catch((error) => ({
              name: modelType.name,
              success: false,
              error: error instanceof Error ? error : new Error(String(error)),
            }))
        )
      );

      const successes = results
        .filter(
          (r): r is PromiseFulfilledResult<{ name: string; success: true }> =>
            r.status === "fulfilled" && r.value.success === true
        )
        .map((r) => r.value.name);

      const failures = results
        .filter(
          (r): r is PromiseFulfilledResult<{ name: string; success: false; error: Error }> =>
            r.status === "fulfilled" && r.value.success === false
        )
        .map((r) => ({ entity: r.value.name, error: r.value.error }));

      if (failures.length > 0) {
        throw new StageAggregateError("Managing model types", failures, successes);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("Failed to manage model type")) {
        throw error;
      }
      throw new Error(
        `Failed to manage model types: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  skip(context) {
    return context.summary.results.every((r) => r.entityType !== "Models");
  },
};

export const collectionsStage: DeploymentStage = {
  name: StageNames.COLLECTIONS,
  async execute(context) {
    try {
      const config = await context.configurator.services.configStorage.load();
      if (!config.collections?.length) {
        logger.debug("No collections to manage");
        return;
      }

      await context.configurator.services.collection.bootstrapCollections(config.collections);
    } catch (error) {
      throw new Error(
        `Failed to manage collections: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  skip(context) {
    return context.summary.results.every((r) => r.entityType !== "Collections");
  },
};

export const menusStage: DeploymentStage = {
  name: StageNames.MENUS,
  async execute(context) {
    try {
      const config = await context.configurator.services.configStorage.load();
      if (!config.menus?.length) {
        logger.debug("No menus to manage");
        return;
      }

      await context.configurator.services.menu.bootstrapMenus(config.menus);
    } catch (error) {
      throw new Error(
        `Failed to manage menus: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  skip(context) {
    return context.summary.results.every((r) => r.entityType !== "Menus");
  },
};

export const modelsStage: DeploymentStage = {
  name: StageNames.MODELS,
  async execute(context) {
    try {
      const config = await context.configurator.services.configStorage.load();
      if (!config.models?.length) {
        logger.debug("No models to manage");
        return;
      }

      // Size-adaptive strategy to avoid rate limiting
      if (config.models.length <= BulkOperationThresholds.MODELS) {
        // Small config: use parallel processing (existing behavior)
        logger.debug(BulkOperationMessages.SEQUENTIAL_PROCESSING(config.models.length, "models"));
        await context.configurator.services.model.bootstrapModels(config.models);
      } else {
        // Larger config: use sequential processing with delays to avoid rate limiting
        logger.info(
          BulkOperationMessages.SEQUENTIAL_WITH_DELAY(
            config.models.length,
            "models",
            DelayConfig.MODEL_PROCESSING_DELAY_MS
          )
        );
        await context.configurator.services.model.bootstrapModelsSequentially(
          config.models,
          DelayConfig.MODEL_PROCESSING_DELAY_MS
        );
      }
    } catch (error) {
      throw new Error(
        `Failed to manage models: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  skip(context) {
    return context.summary.results.every((r) => r.entityType !== "Models");
  },
};

export const categoriesStage: DeploymentStage = {
  name: StageNames.CATEGORIES,
  async execute(context) {
    try {
      const config = await context.configurator.services.configStorage.load();
      if (!config.categories?.length) {
        logger.debug("No categories to manage");
        return;
      }

      await context.configurator.services.category.bootstrapCategories(config.categories);
    } catch (error) {
      throw new Error(
        `Failed to manage categories: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  skip(context) {
    // Categories stage should run if:
    // 1. Categories have changes, OR
    // 2. Products have changes (since products depend on categories)
    const hasCategoryChanges = context.summary.results.some((r) => r.entityType === "Categories");
    const hasProductChanges = context.summary.results.some((r) => r.entityType === "Products");

    return !hasCategoryChanges && !hasProductChanges;
  },
};

export const warehousesStage: DeploymentStage = {
  name: StageNames.WAREHOUSES,
  async execute(context) {
    try {
      const config = await context.configurator.services.configStorage.load();
      if (!config.warehouses?.length) {
        logger.debug("No warehouses to manage");
        return;
      }

      await context.configurator.services.warehouse.bootstrapWarehouses(config.warehouses);
    } catch (error) {
      throw new Error(
        `Failed to manage warehouses: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  skip(context) {
    return context.summary.results.every((r) => r.entityType !== "Warehouses");
  },
};

export const taxClassesStage: DeploymentStage = {
  name: StageNames.TAX_CLASSES,
  async execute(context) {
    try {
      const config = await context.configurator.services.configStorage.load();
      if (!config.taxClasses?.length) {
        logger.debug("No tax classes to manage");
        return;
      }

      await context.configurator.services.tax.bootstrapTaxClasses(config.taxClasses);
    } catch (error) {
      throw new Error(
        `Failed to manage tax classes: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  skip(context) {
    return context.summary.results.every((r) => r.entityType !== "TaxClasses");
  },
};

export const shippingZonesStage: DeploymentStage = {
  name: StageNames.SHIPPING_ZONES,
  async execute(context) {
    try {
      const config = await context.configurator.services.configStorage.load();
      if (!config.shippingZones?.length) {
        logger.debug("No shipping zones to manage");
        return;
      }

      await context.configurator.services.shippingZone.bootstrapShippingZones(config.shippingZones);
    } catch (error) {
      throw new Error(
        `Failed to manage shipping zones: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  skip(context) {
    return context.summary.results.every((r) => r.entityType !== "Shipping Zones");
  },
};

export const attributeChoicesPreflightStage: DeploymentStage = {
  name: StageNames.ATTRIBUTE_CHOICES_PREFLIGHT,
  async execute(context) {
    try {
      const config = await context.configurator.services.configStorage.load();
      if (!config.products || config.products.length === 0) return;

      const productChanges = context.summary.results.filter((r) => r.entityType === "Products");
      if (productChanges.length === 0) return;

      const changedSlugs = new Set(productChanges.map((r) => r.entityName));
      const productsToProcess = config.products.filter((p) => changedSlugs.has(p.slug));
      if (productsToProcess.length === 0) return;

      // Collect attribute values per attribute name
      const valuesByAttr = new Map<string, Set<string>>();
      for (const p of productsToProcess) {
        const attrs = p.attributes || {};
        for (const [name, raw] of Object.entries(attrs)) {
          const set = valuesByAttr.get(name) || new Set<string>();
          if (Array.isArray(raw)) raw.forEach((v) => set.add(String(v).trim()));
          else if (raw !== undefined && raw !== null) set.add(String(raw).trim());
          valuesByAttr.set(name, set);
        }
      }
      if (valuesByAttr.size === 0) return;

      const names = Array.from(valuesByAttr.keys());
      const existing = await context.configurator.services.attribute.repo.getAttributesByNames({
        names,
        type: "PRODUCT_TYPE",
      });
      if (!existing || existing.length === 0) return;

      // For each attribute, add missing choices if any
      const choiceInputTypes = new Set(["DROPDOWN", "MULTISELECT", "SWATCH"]);
      for (const attr of existing as AttributeMeta[]) {
        // Only process attributes that support predefined choices
        if (!choiceInputTypes.has(String(attr.inputType))) continue;

        const desired = valuesByAttr.get(attr.name || "");
        if (!desired || desired.size === 0) continue;

        const existingChoices = new Set(
          (attr.choices?.edges || []).map((e) => String(e?.node?.name ?? "").toLowerCase())
        );
        const missing = Array.from(desired).filter((v) => !existingChoices.has(v.toLowerCase()));
        if (missing.length > 0) {
          const input: AttributeUpdateInput = {
            name: attr.name,
            addValues: missing.map((m) => ({
              name: m,
              externalReference: `attr:${attr.id}:${m.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            })),
          };
          await context.configurator.services.attribute.repo.updateAttribute(attr.id, input);
        }
      }

      // Re-fetch updated attribute metadata for cache priming
      const refreshed = await context.configurator.services.attribute.repo.getAttributesByNames({
        names,
        type: "PRODUCT_TYPE",
      });
      if (refreshed && refreshed.length > 0) {
        context.configurator.services.product.primeAttributeCache(
          refreshed as unknown as ProductAttributeMeta[]
        );
      }
      logger.debug("Attribute choices preflight completed", {
        attributes: refreshed?.length ?? existing.length,
      });
    } catch (error) {
      throw new Error(
        `Failed to prepare attribute choices: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  skip(context) {
    return context.summary.results.every((r) => r.entityType !== "Products");
  },
};

export const productsStage: DeploymentStage = {
  name: StageNames.PRODUCTS,
  async execute(context) {
    try {
      const config = await context.configurator.services.configStorage.load();
      if (!config.products?.length) {
        logger.debug("No products to manage");
        return;
      }

      // Get only the products that need to be changed based on diff results
      const productChanges = context.summary.results.filter((r) => r.entityType === "Products");

      if (productChanges.length === 0) {
        logger.debug("No product changes detected in diff");
        return;
      }

      // Extract product slugs that need to be processed
      const changedProductSlugs = new Set(productChanges.map((change) => change.entityName));

      // Filter config to only process changed products
      const productsToProcess = config.products.filter((product) =>
        changedProductSlugs.has(product.slug)
      );

      logger.debug("Processing selective product changes", {
        totalProducts: config.products.length,
        changedProducts: productsToProcess.length,
        slugs: Array.from(changedProductSlugs),
      });

      if (productsToProcess.length === 0) {
        logger.debug("No products found matching diff changes");
        return;
      }

      // Size-adaptive strategy: use bulk operations for larger deployments
      const productOptions = context.args.skipMedia ? { skipMedia: true } : undefined;
      if (productsToProcess.length <= BulkOperationThresholds.PRODUCTS) {
        // Small config: use existing sequential approach for better error granularity
        logger.debug(
          BulkOperationMessages.SEQUENTIAL_PROCESSING(productsToProcess.length, "products")
        );
        await context.configurator.services.product.bootstrapProducts(
          productsToProcess,
          productOptions
        );
      } else {
        // Large config: use bulk mutations for efficiency and to avoid rate limiting
        logger.info(BulkOperationMessages.BULK_PROCESSING(productsToProcess.length, "products"));
        await context.configurator.services.product.bootstrapProductsBulk(
          productsToProcess,
          productOptions
        );
      }
    } catch (error) {
      throw new Error(
        `Failed to manage products: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  skip(context) {
    return context.summary.results.every((r) => r.entityType !== "Products");
  },
};

export function getAllStages(): DeploymentStage[] {
  return [
    validationStage,
    shopSettingsStage,
    taxClassesStage, // Deploy tax classes early as they can be referenced by other entities
    attributesStage,
    productTypesStage,
    channelsStage,
    pageTypesStage,
    modelTypesStage, // Deploy model types for models
    categoriesStage,
    collectionsStage, // Deploy collections after categories (they may reference products)
    menusStage, // Deploy menus after categories and collections (they may reference them)
    modelsStage, // Deploy models after model types
    warehousesStage,
    shippingZonesStage,
    attributeChoicesPreflightStage,
    productsStage,
  ];
}
