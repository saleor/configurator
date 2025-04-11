import type { SaleorConfig } from "../config/schema";
import { logger } from "../../lib/logger";
import type { CategoryOperations, Category } from "./repository";

type CategoryConfigInput = NonNullable<SaleorConfig["categories"]>[number];

export class CategoryService {
  constructor(private repository: CategoryOperations) {}

  private async getExistingCategory(name: string) {
    return this.repository.getCategoryByName(name);
  }

  private async createCategory(
    input: CategoryConfigInput,
    parentId?: string
  ): Promise<Category> {
    logger.debug("Creating category", {
      name: input.name,
      parentId,
    });

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
  }

  async bootstrapCategories(categories: CategoryConfigInput[]) {
    logger.debug("Bootstrapping categories");

    return Promise.all(
      categories.map((category) => this.bootstrapCategory(category))
    );
  }

  private async getOrCreateCategory(
    categoryInput: CategoryConfigInput
  ): Promise<Category> {
    const existingCategory = await this.getExistingCategory(categoryInput.name);

    if (existingCategory) {
      return existingCategory;
    }

    return this.createCategory(categoryInput);
  }

  private async bootstrapCategory(
    categoryInput: CategoryConfigInput
  ): Promise<Category> {
    logger.debug("Bootstrapping category", { name: categoryInput.name });

    const category = await this.getOrCreateCategory(categoryInput);

    logger.debug("Existing category", {
      category,
    });

    // compare existingCategory subcategories with categoryInput.subcategories
    const subcategoriesToCreate =
      categoryInput.subcategories?.filter(
        (subcategory) =>
          !category?.children?.edges?.some(
            (edge) => edge.node.name === subcategory.name
          )
      ) ?? [];

    logger.debug("Subcategories to create", {
      subcategories: subcategoriesToCreate,
    });

    for (const subcategory of subcategoriesToCreate) {
      await this.createCategory({ name: subcategory.name }, category.id);
    }

    return category;
  }
}
