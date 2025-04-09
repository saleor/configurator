import type { SaleorConfig } from "../config/schema";
import { logger } from "../../lib/logger";
import type { CategoryOperations, Category } from "./repository";

type CategoryConfigInput = NonNullable<SaleorConfig["categories"]>[number];

export class CategoryService {
  constructor(private repository: CategoryOperations) {}

  private async getExistingCategory(name: string) {
    logger.debug("Looking up existing category", { name });
    const existingCategory = await this.repository.getCategoryByName(name);

    if (existingCategory) {
      logger.debug("Found existing category", {
        id: existingCategory.id,
        name: existingCategory.name,
      });
    } else {
      logger.debug("Category not found", { name });
    }

    return existingCategory;
  }

  private async createCategory(input: CategoryConfigInput): Promise<Category> {
    logger.debug("Creating new category", { name: input.name });
    try {
      const category = await this.repository.createCategory({
        name: input.name,
      });
      logger.debug("Successfully created category", {
        id: category.id,
        name: input.name,
      });
      return category;
    } catch (error) {
      logger.error("Failed to create category", {
        error: error instanceof Error ? error.message : "Unknown error",
        name: input.name,
      });
      throw error;
    }
  }

  async bootstrapCategories(categories: CategoryConfigInput[]) {
    logger.debug("Bootstrapping categories", { count: categories.length });
    try {
      const results = await Promise.all(
        categories.map((category) => this.bootstrapCategory(category))
      );
      logger.debug("Successfully bootstrapped all categories", {
        count: results.length,
      });
      return results;
    } catch (error) {
      logger.error("Failed to bootstrap categories", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  private async bootstrapCategory(
    category: CategoryConfigInput
  ): Promise<Category> {
    logger.debug("Bootstrapping category", { name: category.name });
    const existingCategory = await this.getExistingCategory(category.name);

    if (existingCategory) {
      return existingCategory;
    }

    const createdCategory = await this.createCategory(category);

    return createdCategory;
  }
}
