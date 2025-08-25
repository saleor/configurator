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
              error: error instanceof Error ? error : new Error(String(error))
            }))
        )
      );

      const successes = results
        .filter((r): r is PromiseFulfilledResult<{ name: string; success: true }> => 
          r.status === "fulfilled" && r.value.success === true
        )
        .map((r) => r.value.name);
      
      const failures = results
        .filter((r): r is PromiseFulfilledResult<{ name: string; success: false; error: Error }> => 
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
    return context.summary.results.every((r) => r.entityType !== "Product Types");
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
    return context.summary.results.every((r) => r.entityType !== "Channels");
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
              error: error instanceof Error ? error : new Error(String(error))
            }))
        )
      );

      const successes = results
        .filter((r): r is PromiseFulfilledResult<{ name: string; success: true }> => 
          r.status === "fulfilled" && r.value.success === true
        )
        .map((r) => r.value.name);
      
      const failures = results
        .filter((r): r is PromiseFulfilledResult<{ name: string; success: false; error: Error }> => 
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
    return context.summary.results.every((r) => r.entityType !== "Categories");
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

      await context.configurator.services.product.bootstrapProducts(config.products);
    } catch (error) {
      throw new Error(
        `Failed to manage products: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  // Products are not yet included in the diff system, so always run this stage
  skip() {
    return false;
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
    categoriesStage,
    warehousesStage,
    shippingZonesStage,
    productsStage,
  ];
}
