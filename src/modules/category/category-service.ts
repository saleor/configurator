import type { SaleorConfig } from "../config/schema";
import { logger } from "../../lib/logger";
import type { CategoryOperations, Category } from "./repository";

type CategoryConfigInput = NonNullable<SaleorConfig["categories"]>[number];

export class CategoryService {
  constructor(private repository: CategoryOperations) {}

  private async getExistingCategory(name: string) {
    logger.debug("Looking up category", { name });
    const existingCategory = await this.repository.getCategoryByName(name);

    if (existingCategory) {
      logger.debug("Found category", {
        id: existingCategory.id,
        name: existingCategory.name,
      });
    }

    return existingCategory;
  }

  private async createCategory(
    input: CategoryConfigInput,
    parentId?: string
  ): Promise<Category> {
    logger.debug("Creating category", {
      name: input.name,
      parentId,
    });

    try {
      const category = await this.repository.createCategory(
        {
          name: input.name,
        },
        parentId
      );

      logger.debug("Created category", {
        id: category.id,
        name: category.name,
        parentId,
      });

      return category;
    } catch (error) {
      logger.error("Failed to create category", {
        error: error instanceof Error ? error.message : "Unknown error",
        name: input.name,
        parentId,
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

      logger.debug("Bootstrapped categories", {
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
      logger.debug("Found existing category", {
        id: existingCategory.id,
        name: existingCategory.name,
      });

      if (category.subcategories?.length) {
        logger.debug("Creating subcategories", {
          parent: category.name,
          count: category.subcategories.length,
        });

        for (const subcategory of category.subcategories) {
          const existingSubcategory = await this.getExistingCategory(
            subcategory.name
          );
          if (!existingSubcategory) {
            await this.createCategory(
              { name: subcategory.name },
              existingCategory.id
            );
          }
        }
      }

      return existingCategory;
    }

    const createdCategory = await this.createCategory(category);

    if (category.subcategories?.length) {
      logger.debug("Creating subcategories", {
        parent: category.name,
        count: category.subcategories.length,
      });

      for (const subcategory of category.subcategories) {
        await this.createCategory(
          { name: subcategory.name },
          createdCategory.id
        );
      }
    }

    return createdCategory;
  }
}
