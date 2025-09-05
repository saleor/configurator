import { logger } from "../../lib/logger";
import { StageAggregateError } from "./errors";
import type { DeploymentStage } from "./types";

export const validationStage: DeploymentStage = {
  name: "Validating configuration",
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
  name: "Updating shop settings",
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
  name: "Managing product types",
  async execute(context) {
    try {
      const config = await context.configurator.services.configStorage.load();
      if (!config.productTypes?.length) {
        logger.debug("No product types to manage");
        return;
      }

      const results = await Promise.allSettled(
        config.productTypes.map((productType) =>
          context.configurator.services.productType
            .bootstrapProductType(productType)
            .then(() => ({ name: productType.name, success: true }))
            .catch((error) => ({
              name: productType.name,
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

export const channelsStage: DeploymentStage = {
  name: "Managing channels",
  async execute(context) {
    try {
      const config = await context.configurator.services.configStorage.load();
      if (!config.channels?.length) {
        logger.debug("No channels to manage");
        return;
      }

      await context.configurator.services.channel.bootstrapChannels(config.channels);
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
  name: "Managing page types",
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
  name: "Managing model types",
  async execute(context) {
    try {
      const config = await context.configurator.services.configStorage.load();
      if (!config.modelTypes?.length) {
        logger.debug("No model types to manage");
        return;
      }

      const results = await Promise.allSettled(
        config.modelTypes.map((modelType) =>
          context.configurator.services.pageType
            .bootstrapPageType(modelType)
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
  name: "Managing collections",
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
  name: "Managing menus",
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
  name: "Managing models",
  async execute(context) {
    try {
      const config = await context.configurator.services.configStorage.load();
      if (!config.models?.length) {
        logger.debug("No models to manage");
        return;
      }

      await context.configurator.services.model.bootstrapModels(config.models);
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
  name: "Managing categories",
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
  name: "Managing warehouses",
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
  name: "Managing tax classes",
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
  name: "Managing shipping zones",
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

export const productsStage: DeploymentStage = {
  name: "Managing products",
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

      await context.configurator.services.product.bootstrapProducts(productsToProcess);
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
    productsStage,
  ];
}
