import type { DeploymentContext, DeploymentStage } from "./types";
import { logger } from "../../lib/logger";

export const validationStage: DeploymentStage = {
  name: "Validating configuration",
  async execute(context) {
    await context.configurator.validateLocalConfiguration();
  },
};

export const shopSettingsStage: DeploymentStage = {
  name: "Updating shop settings",
  async execute(context) {
    const config = await context.configurator.services.configStorage.load();
    if (!config.shop) {
      logger.debug("No shop settings to update");
      return;
    }

    await context.configurator.services.shop.updateSettings(config.shop);
  },
  skip(context) {
    return context.summary.results.every(r => r.entityType !== "Shop Settings");
  },
};

export const productTypesStage: DeploymentStage = {
  name: "Managing product types",
  async execute(context) {
    const config = await context.configurator.services.configStorage.load();
    if (!config.productTypes?.length) {
      logger.debug("No product types to manage");
      return;
    }

    await Promise.all(
      config.productTypes.map(productType =>
        context.configurator.services.productType.bootstrapProductType(productType)
      )
    );
  },
  skip(context) {
    return context.summary.results.every(r => r.entityType !== "Product Types");
  },
};

export const channelsStage: DeploymentStage = {
  name: "Managing channels",
  async execute(context) {
    const config = await context.configurator.services.configStorage.load();
    if (!config.channels?.length) {
      logger.debug("No channels to manage");
      return;
    }

    await context.configurator.services.channel.bootstrapChannels(config.channels);
  },
  skip(context) {
    return context.summary.results.every(r => r.entityType !== "Channels");
  },
};

export const pageTypesStage: DeploymentStage = {
  name: "Managing page types",
  async execute(context) {
    const config = await context.configurator.services.configStorage.load();
    if (!config.pageTypes?.length) {
      logger.debug("No page types to manage");
      return;
    }

    await Promise.all(
      config.pageTypes.map(pageType =>
        context.configurator.services.pageType.bootstrapPageType(pageType)
      )
    );
  },
  skip(context) {
    return context.summary.results.every(r => r.entityType !== "Page Types");
  },
};

export const categoriesStage: DeploymentStage = {
  name: "Managing categories",
  async execute(context) {
    const config = await context.configurator.services.configStorage.load();
    if (!config.categories?.length) {
      logger.debug("No categories to manage");
      return;
    }

    await context.configurator.services.category.bootstrapCategories(config.categories);
  },
  skip(context) {
    return context.summary.results.every(r => r.entityType !== "Categories");
  },
};

export const productsStage: DeploymentStage = {
  name: "Managing products",
  async execute(context) {
    const config = await context.configurator.services.configStorage.load();
    if (!config.products?.length) {
      logger.debug("No products to manage");
      return;
    }

    await context.configurator.services.product.bootstrapProducts(config.products);
  },
  skip(context) {
    return context.summary.results.every(r => r.entityType !== "Product Types");
  },
};

export function getAllStages(): DeploymentStage[] {
  return [
    validationStage,
    shopSettingsStage,
    productTypesStage,
    channelsStage,
    pageTypesStage,
    categoriesStage,
    productsStage,
  ];
}