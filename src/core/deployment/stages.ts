import { logger } from "../../lib/logger";
import {
  BulkOperationMessages,
  BulkOperationThresholds,
  ChunkSizeConfig,
  DelayConfig,
  StageNames,
} from "../../lib/utils/bulk-operation-constants";
import { processInChunks } from "../../lib/utils/chunked-processor";
import { isTransientError } from "../../lib/utils/error-classification";
import { toSlug } from "../../lib/utils/string";
import {
  ATTRIBUTE_INPUT_TYPES,
  type AttributeInputType,
  type CachedAttribute,
} from "../../modules/attribute/attribute-cache";
import type {
  Attribute as AttributeMeta,
  AttributeUpdateInput,
} from "../../modules/attribute/repository";
import {
  type FullAttribute,
  fullAttributeSchema,
} from "../../modules/config/schema/attribute.schema";
import type {
  ContentAttribute,
  ProductAttribute,
} from "../../modules/config/schema/global-attributes.schema";
import type {
  ChannelInput,
  ChannelUpdateInput,
  TaxConfigurationInput,
} from "../../modules/config/schema/schema";
import { StageAggregateError } from "./errors";

import type { DeploymentContext, DeploymentStage } from "./types";

export const validationStage: DeploymentStage = {
  name: StageNames.VALIDATION,
  async execute(context) {
    try {
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
      if (isTransientError(error)) {
        throw error;
      }
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

      const bootstrapOptions = { attributeCache: context.attributeCache };

      const { successes: processedSuccesses, failures: processedFailures } = await processInChunks(
        config.productTypes,
        async (chunk) => {
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
      if (error instanceof StageAggregateError) {
        throw error;
      }
      if (isTransientError(error)) {
        throw error;
      }
      throw new Error(
        `Failed to manage product types: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  skip(context) {
    const hasProductTypeChanges = context.summary.results.some(
      (r) => r.entityType === "Product Types"
    );
    const hasProductChanges = context.summary.results.some((r) => r.entityType === "Products");

    return !hasProductTypeChanges && !hasProductChanges;
  },
};

const VALID_INPUT_TYPES: ReadonlySet<string> = new Set(ATTRIBUTE_INPUT_TYPES);

function isAttributeInputType(value: string): value is AttributeInputType {
  return VALID_INPUT_TYPES.has(value);
}

function toAttributeInputType(value: string | null | undefined): AttributeInputType | undefined {
  if (value && isAttributeInputType(value)) {
    return value;
  }
  return undefined;
}

type AttributeFailure = { entity: string; error: Error };

function validateAttributeInputs(
  attributes: Array<ProductAttribute | ContentAttribute>,
  type: "PRODUCT_TYPE" | "PAGE_TYPE"
): { fullAttributes: FullAttribute[]; failures: AttributeFailure[] } {
  const fullAttributes: FullAttribute[] = [];
  const failures: AttributeFailure[] = [];

  for (const attr of attributes) {
    const result = fullAttributeSchema.safeParse({ ...attr, type });
    if (!result.success) {
      failures.push({
        entity: attr.name,
        error: new Error(
          `Invalid attribute "${attr.name}": ${result.error.issues.map((i) => i.message).join(", ")}`
        ),
      });
    } else {
      fullAttributes.push(result.data);
    }
  }

  return { fullAttributes, failures };
}

async function processAttributesSequentially(
  context: DeploymentContext,
  fullAttributes: FullAttribute[],
  existingMap: Map<string, AttributeMeta>,
  sectionName: string
): Promise<{ cached: CachedAttribute[]; failures: AttributeFailure[] }> {
  const service = context.configurator.services.attribute;
  const cached: CachedAttribute[] = [];
  const failures: AttributeFailure[] = [];

  logger.debug(BulkOperationMessages.SEQUENTIAL_PROCESSING(fullAttributes.length, sectionName));

  const results = await Promise.allSettled(
    fullAttributes.map(async (attr) => {
      const existingAttr = existingMap.get(attr.name);
      let result: AttributeMeta | undefined;

      if (existingAttr) {
        await service.updateAttribute(attr, existingAttr);
        result = existingAttr;
      } else {
        const created = await service.bootstrapAttributes({ attributeInputs: [attr] });
        result = created[0];
      }

      if (result?.id && result?.name) {
        const resolvedInputType =
          toAttributeInputType(result.inputType) ?? toAttributeInputType(attr.inputType);
        return {
          id: result.id,
          name: result.name,
          slug: toSlug(result.name),
          inputType: resolvedInputType ?? attr.inputType,
          entityType: result.entityType ?? null,
          choices: (result.choices?.edges ?? [])
            .filter((e): e is typeof e & { node: { id: string; name: string } } =>
              Boolean(e?.node?.id && e?.node?.name)
            )
            .map((e) => ({ id: e.node.id, name: e.node.name, value: e.node.value ?? "" })),
        } satisfies CachedAttribute;
      }
      return null;
    })
  );

  for (let i = 0; i < results.length; i++) {
    const attr = fullAttributes[i];
    const r = results[i];
    if (r.status === "fulfilled" && r.value) {
      cached.push(r.value);
    } else if (r.status === "fulfilled" && r.value === null) {
      failures.push({
        entity: attr.name,
        error: new Error(
          `Attribute "${attr.name}" was processed but could not be verified (no ID returned from API)`
        ),
      });
    } else if (r.status === "rejected") {
      failures.push({
        entity: attr.name,
        error: r.reason instanceof Error ? r.reason : new Error(String(r.reason)),
      });
    }
  }

  return { cached, failures };
}

async function processAttributesBulk(
  context: DeploymentContext,
  fullAttributes: FullAttribute[],
  existingMap: Map<string, AttributeMeta>,
  sectionName: string,
  names: string[],
  type: "PRODUCT_TYPE" | "PAGE_TYPE"
): Promise<{ cached: CachedAttribute[]; failures: AttributeFailure[] }> {
  const service = context.configurator.services.attribute;
  const cached: CachedAttribute[] = [];
  const failures: AttributeFailure[] = [];

  logger.info(BulkOperationMessages.BULK_PROCESSING(fullAttributes.length, sectionName));

  const toCreate = fullAttributes.filter((attr) => !existingMap.has(attr.name));
  const toUpdate = fullAttributes
    .filter((attr) => existingMap.has(attr.name))
    .map((attr) => {
      const existing = existingMap.get(attr.name);
      if (!existing) throw new Error(`Expected attribute ${attr.name} in existing map`);
      return { input: attr, existing };
    });

  const successfulAttrs: Array<{
    id: string;
    name: string;
    inputType: string;
    entityType: string | null;
    choices: Array<{ id: string; name: string; value: string }>;
  }> = [];

  if (toCreate.length > 0) {
    logger.info(`Creating ${toCreate.length} new ${sectionName} via bulk mutation`);
    try {
      const createResult = await service.bootstrapAttributesBulk(toCreate);
      createResult.failed.forEach(({ input, errors }) => {
        failures.push({ entity: input.name, error: new Error(errors.join(", ")) });
      });
      for (const attr of createResult.successful) {
        if (attr.id && attr.name && attr.inputType) {
          successfulAttrs.push({
            id: attr.id,
            name: attr.name,
            inputType: attr.inputType,
            entityType: attr.entityType ?? null,
            choices: (attr.choices?.edges ?? [])
              .filter((e): e is typeof e & { node: { id: string; name: string } } =>
                Boolean(e?.node?.id && e?.node?.name)
              )
              .map((e) => ({ id: e.node.id, name: e.node.name, value: e.node.value ?? "" })),
          });
        }
      }
    } catch (error) {
      const bulkError = error instanceof Error ? error : new Error(String(error));
      for (const attr of toCreate) {
        failures.push({ entity: attr.name, error: bulkError });
      }
    }
  }

  if (toUpdate.length > 0) {
    logger.info(`Updating ${toUpdate.length} existing ${sectionName} via bulk mutation`);
    try {
      const updateResult = await service.updateAttributesBulk(toUpdate);
      updateResult.failed.forEach(({ input, errors }) => {
        failures.push({ entity: input.name, error: new Error(errors.join(", ")) });
      });
      for (const attr of updateResult.successful) {
        if (attr.id && attr.name && attr.inputType) {
          successfulAttrs.push({
            id: attr.id,
            name: attr.name,
            inputType: attr.inputType,
            entityType: attr.entityType ?? null,
            choices: (attr.choices?.edges ?? [])
              .filter((e): e is typeof e & { node: { id: string; name: string } } =>
                Boolean(e?.node?.id && e?.node?.name)
              )
              .map((e) => ({ id: e.node.id, name: e.node.name, value: e.node.value ?? "" })),
          });
        }
      }
    } catch (error) {
      const bulkError = error instanceof Error ? error : new Error(String(error));
      for (const { input } of toUpdate) {
        failures.push({ entity: input.name, error: bulkError });
      }
    }
  }

  const cachedNames = new Set(successfulAttrs.map((a) => a.name));
  for (const attr of successfulAttrs) {
    const parsedInputType = toAttributeInputType(attr.inputType);
    if (parsedInputType) {
      cached.push({
        id: attr.id,
        name: attr.name,
        slug: toSlug(attr.name),
        inputType: parsedInputType,
        entityType: attr.entityType,
        choices: attr.choices,
      });
    }
  }

  const failedNames = new Set(failures.map((f) => f.entity));
  const missingNames = names.filter((n) => !cachedNames.has(n) && !failedNames.has(n));
  if (missingNames.length > 0) {
    logger.debug(`Fetching ${missingNames.length} attributes not returned by mutations`);
    const fetched = await service.repo.getAttributesByNames({ names: missingNames, type });
    for (const attr of fetched) {
      const parsedInputType = toAttributeInputType(attr.inputType);
      if (attr.id && attr.name && parsedInputType) {
        cached.push({
          id: attr.id,
          name: attr.name,
          slug: toSlug(attr.name),
          inputType: parsedInputType,
          entityType: attr.entityType ?? null,
          choices: (attr.choices?.edges ?? [])
            .filter((e): e is typeof e & { node: { id: string; name: string } } =>
              Boolean(e?.node?.id && e?.node?.name)
            )
            .map((e) => ({ id: e.node.id, name: e.node.name, value: e.node.value ?? "" })),
        });
      }
    }
  }

  return { cached, failures };
}

async function processGlobalAttributes(
  context: DeploymentContext,
  attributes: Array<ProductAttribute | ContentAttribute>,
  type: "PRODUCT_TYPE" | "PAGE_TYPE",
  sectionName: string
): Promise<{ cached: CachedAttribute[]; failures: AttributeFailure[] }> {
  if (attributes.length === 0) {
    return { cached: [], failures: [] };
  }

  const service = context.configurator.services.attribute;
  const { fullAttributes, failures: validationFailures } = validateAttributeInputs(
    attributes,
    type
  );

  const names = attributes.map((a) => a.name);
  const existing = await service.repo.getAttributesByNames({ names, type });
  const existingMap = new Map(
    existing
      .filter((a): a is typeof a & { name: string } => typeof a.name === "string")
      .map((a) => [a.name, a])
  );

  const { cached, failures: processingFailures } =
    fullAttributes.length <= BulkOperationThresholds.ATTRIBUTES
      ? await processAttributesSequentially(context, fullAttributes, existingMap, sectionName)
      : await processAttributesBulk(context, fullAttributes, existingMap, sectionName, names, type);

  return { cached, failures: [...validationFailures, ...processingFailures] };
}

export const attributesStage: DeploymentStage = {
  name: StageNames.ATTRIBUTES,
  async execute(context) {
    try {
      const config = await context.configurator.services.configStorage.load();
      const productAttributes = config.productAttributes ?? [];
      const contentAttributes = config.contentAttributes ?? [];

      const allFailures: Array<{ entity: string; error: Error }> = [];
      const productCached: CachedAttribute[] = [];
      const contentCached: CachedAttribute[] = [];

      if (productAttributes.length > 0) {
        logger.info(`Processing ${productAttributes.length} product attributes`);
        const { cached, failures } = await processGlobalAttributes(
          context,
          productAttributes,
          "PRODUCT_TYPE",
          "product attributes"
        );
        productCached.push(...cached);
        allFailures.push(...failures);
        logger.debug(`Processed ${cached.length} product attributes`);
      }

      if (contentAttributes.length > 0) {
        logger.info(`Processing ${contentAttributes.length} content attributes`);
        const { cached, failures } = await processGlobalAttributes(
          context,
          contentAttributes,
          "PAGE_TYPE",
          "content attributes"
        );
        contentCached.push(...cached);
        allFailures.push(...failures);
        logger.debug(`Processed ${cached.length} content attributes`);
      }

      context.attributeCache.populateProductAttributes(productCached);
      context.attributeCache.populateContentAttributes(contentCached);

      const stats = context.attributeCache.getStats();
      logger.info(
        `Attribute cache populated: ${stats.productAttributeCount} product, ${stats.contentAttributeCount} content`
      );

      if (allFailures.length > 0) {
        logger.warn(
          `${allFailures.length} attribute(s) failed but ${productCached.length + contentCached.length} cached successfully`
        );
        throw new StageAggregateError(
          "Managing attributes",
          allFailures,
          [...productAttributes, ...contentAttributes].map((a) => a.name)
        );
      }
    } catch (error) {
      if (error instanceof StageAggregateError) {
        throw error;
      }
      throw new Error(
        `Failed to manage attributes: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  skip(context) {
    const attributeEntityTypes = ["Product Attributes", "Content Attributes"];
    const hasAttributeChanges = context.summary.results.some((r) =>
      attributeEntityTypes.includes(r.entityType)
    );

    if (hasAttributeChanges) {
      return false;
    }

    const downstreamEntityTypes = [
      "Product Types",
      "Page Types",
      "Model Types",
      "Products",
      "Models",
    ];
    const hasDownstreamChanges = context.summary.results.some((r) =>
      downstreamEntityTypes.includes(r.entityType)
    );

    if (hasDownstreamChanges) {
      logger.debug(
        "Attributes stage: no attribute diff changes, but running anyway to populate cache for downstream stages"
      );
      return false;
    }

    return true;
  },
};

function isChannelUpdate(channel: ChannelInput): channel is ChannelUpdateInput {
  return "taxConfiguration" in channel;
}

function getChannelTaxConfig(channel: ChannelInput): TaxConfigurationInput | undefined {
  if (isChannelUpdate(channel)) {
    return channel.taxConfiguration;
  }
  return undefined;
}

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

      for (const channel of config.channels) {
        const taxCfg = getChannelTaxConfig(channel);
        if (!taxCfg) continue;

        const existing = await context.configurator.services.channel.getChannelBySlug(channel.slug);
        if (!existing?.id) continue;

        await context.configurator.services.tax.updateChannelTaxConfiguration(existing.id, taxCfg);
      }
    } catch (error) {
      if (isTransientError(error)) {
        throw error;
      }
      throw new Error(
        `Failed to manage channels: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  skip(context) {
    const hasChannelChanges = context.summary.results.some((r) => r.entityType === "Channels");
    const hasProductChanges = context.summary.results.some((r) => r.entityType === "Products");

    return !hasChannelChanges && !hasProductChanges;
  },
};

async function bootstrapEntityTypeStage(
  context: DeploymentContext,
  items: Array<{ name: string }>,
  bootstrapOptions: {
    attributeCache: typeof context.attributeCache;
    referencingEntityType?: "pageTypes" | "modelTypes";
  },
  stageLabel: string
): Promise<void> {
  const results = await Promise.allSettled(
    items.map((item) =>
      context.configurator.services.pageType
        .bootstrapPageType(item, bootstrapOptions)
        .then(() => ({ name: item.name, success: true as const }))
        .catch((error) => {
          if (isTransientError(error)) {
            throw error;
          }
          return {
            name: item.name,
            success: false as const,
            error: error instanceof Error ? error : new Error(String(error)),
          };
        })
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
    throw new StageAggregateError(stageLabel, failures, successes);
  }
}

export const pageTypesStage: DeploymentStage = {
  name: StageNames.PAGE_TYPES,
  async execute(context) {
    try {
      const config = await context.configurator.services.configStorage.load();
      if (!config.pageTypes?.length) {
        logger.debug("No page types to manage");
        return;
      }

      await bootstrapEntityTypeStage(
        context,
        config.pageTypes,
        { attributeCache: context.attributeCache },
        "Managing page types"
      );
    } catch (error) {
      if (error instanceof StageAggregateError) {
        throw error;
      }
      if (isTransientError(error)) {
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

      await bootstrapEntityTypeStage(
        context,
        config.modelTypes,
        { attributeCache: context.attributeCache, referencingEntityType: "modelTypes" },
        "Managing model types"
      );
    } catch (error) {
      if (error instanceof StageAggregateError) {
        throw error;
      }
      if (isTransientError(error)) {
        throw error;
      }
      throw new Error(
        `Failed to manage model types: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  skip(context) {
    return context.summary.results.every(
      (r) => r.entityType !== "Models" && r.entityType !== "Page Types"
    );
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
      if (isTransientError(error)) {
        throw error;
      }
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
      if (isTransientError(error)) {
        throw error;
      }
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
      context.configurator.services.model.setAttributeCache(context.attributeCache);

      const config = await context.configurator.services.configStorage.load();
      if (!config.models?.length) {
        logger.debug("No models to manage");
        return;
      }

      if (config.models.length <= BulkOperationThresholds.MODELS) {
        logger.debug(BulkOperationMessages.SEQUENTIAL_PROCESSING(config.models.length, "models"));
        await context.configurator.services.model.bootstrapModels(config.models);
      } else {
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
      if (isTransientError(error)) {
        throw error;
      }
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

      const countCategories = (cats: typeof config.categories): number =>
        cats.reduce((sum, cat) => {
          const subcats =
            "subcategories" in cat && Array.isArray(cat.subcategories)
              ? countCategories(cat.subcategories)
              : 0;
          return sum + 1 + subcats;
        }, 0);

      const totalCategories = countCategories(config.categories);

      if (totalCategories <= BulkOperationThresholds.CATEGORIES) {
        logger.debug(BulkOperationMessages.SEQUENTIAL_PROCESSING(totalCategories, "categories"));
        await context.configurator.services.category.bootstrapCategories(config.categories);
      } else {
        logger.info(
          `Processing ${totalCategories} categories via optimized level-based processing`
        );
        await context.configurator.services.category.bootstrapCategoriesOptimized(
          config.categories
        );
      }
    } catch (error) {
      if (isTransientError(error)) {
        throw error;
      }
      throw new Error(
        `Failed to manage categories: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  skip(context) {
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
      if (isTransientError(error)) {
        throw error;
      }
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
      if (isTransientError(error)) {
        throw error;
      }
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
      if (isTransientError(error)) {
        throw error;
      }
      throw new Error(
        `Failed to manage shipping zones: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  skip(context) {
    return context.summary.results.every((r) => r.entityType !== "Shipping Zones");
  },
};

async function primeCategoryCacheForProductProcessing(context: DeploymentContext): Promise<void> {
  const allCategories = await context.configurator.services.category.getAllCategories();
  if (allCategories && allCategories.length > 0) {
    context.configurator.services.product.primeCategoryCache(allCategories);
    logger.debug("Category cache primed", { count: allCategories.length });
  }
}

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

      await primeCategoryCacheForProductProcessing(context);

      const valuesByAttr = new Map<string, Set<string>>();
      for (const p of productsToProcess) {
        if (!p.attributes) continue;
        for (const [name, raw] of Object.entries(p.attributes)) {
          let set = valuesByAttr.get(name);
          if (!set) {
            set = new Set<string>();
            valuesByAttr.set(name, set);
          }
          if (Array.isArray(raw)) raw.forEach((v) => set.add(String(v).trim()));
          else if (raw !== undefined && raw !== null) set.add(String(raw).trim());
        }
      }
      if (valuesByAttr.size === 0) return;

      const names = Array.from(valuesByAttr.keys());
      const existing = await context.configurator.services.attribute.repo.getAttributesByNames({
        names,
        type: "PRODUCT_TYPE",
      });
      if (existing.length === 0) return;

      const choiceInputTypes = new Set(["DROPDOWN", "MULTISELECT", "SWATCH"]);
      for (const attr of existing) {
        if (!attr.name || !choiceInputTypes.has(String(attr.inputType))) continue;

        const desired = valuesByAttr.get(attr.name);
        if (!desired || desired.size === 0) continue;

        const existingChoices = new Set(
          (attr.choices?.edges ?? [])
            .filter((e): e is typeof e & { node: { name: string } } => Boolean(e?.node?.name))
            .map((e) => e.node.name.toLowerCase())
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

      const refreshed = await context.configurator.services.attribute.repo.getAttributesByNames({
        names,
        type: "PRODUCT_TYPE",
      });
      if (refreshed.length > 0) {
        const refreshedCached: CachedAttribute[] = [];
        for (const attr of refreshed) {
          if (!attr.id || !attr.name || !attr.inputType) continue;
          const parsedInputType = toAttributeInputType(attr.inputType);
          if (!parsedInputType) continue;
          refreshedCached.push({
            id: attr.id,
            name: attr.name,
            slug: toSlug(attr.name),
            inputType: parsedInputType,
            entityType: (attr.entityType as string | null) ?? null,
            choices: (attr.choices?.edges ?? [])
              .filter((e): e is typeof e & { node: { id: string; name: string } } =>
                Boolean(e?.node?.id && e?.node?.name)
              )
              .map((e) => ({ id: e.node.id, name: e.node.name, value: e.node.value ?? "" })),
          });
        }
        if (refreshedCached.length > 0) {
          context.attributeCache.populateProductAttributes(refreshedCached);
          context.configurator.services.product.setAttributeCache(context.attributeCache);
        }
      }

      logger.debug("Attribute choices preflight completed", {
        attributes: refreshed.length,
      });
    } catch (error) {
      if (isTransientError(error)) {
        throw error;
      }
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
      context.configurator.services.product.setAttributeCache(context.attributeCache);

      const config = await context.configurator.services.configStorage.load();
      if (!config.products?.length) {
        logger.debug("No products to manage");
        return;
      }

      const productChanges = context.summary.results.filter((r) => r.entityType === "Products");

      if (productChanges.length === 0) {
        logger.debug("No product changes detected in diff");
        return;
      }

      const changedProductSlugs = new Set(productChanges.map((change) => change.entityName));
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

      const productOptions = context.args.skipMedia ? { skipMedia: true } : undefined;
      logger.info(BulkOperationMessages.BULK_PROCESSING(productsToProcess.length, "products"));
      await context.configurator.services.product.bootstrapProductsBulk(
        productsToProcess,
        productOptions
      );
    } catch (error) {
      if (isTransientError(error)) {
        throw error;
      }
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
    taxClassesStage,
    attributesStage,
    productTypesStage,
    channelsStage,
    pageTypesStage,
    modelTypesStage,
    categoriesStage,
    collectionsStage,
    menusStage,
    modelsStage,
    warehousesStage,
    shippingZonesStage,
    attributeChoicesPreflightStage,
    productsStage,
  ];
}
