import { logger } from "../../lib/logger";
import type { CategoryInput } from "../config/schema/schema";
import type { Category, CategoryOperations, CategoryInput as RepositoryCategoryInput } from "./repository";

export class CategoryService {
  constructor(private repository: CategoryOperations) {}

  async getAllCategories() {
    logger.debug("Getting all categories for introspection");
    return this.repository.getAllCategories();
  }

  private async getExistingCategory(name: string) {
    return this.repository.getCategoryByName(name);
  }

  private async createCategory(input: CategoryInput, parentId?: string): Promise<Category> {
    logger.debug("Creating category", {
      name: input.name,
      parentId,
    });

    // Extract only the basic category fields for repository call
    // (subcategories are handled by recursive bootstrapping)
    const categoryInput: RepositoryCategoryInput = {
      name: input.name,
      slug: input.slug,
    };

    const category = await this.repository.createCategory(
      categoryInput,
      parentId
    );

    logger.debug("Created category", {
      id: category.id,
      name: category.name,
      parentId,
    });

    return category;
  }

  async bootstrapCategories(categories: CategoryInput[]) {
    logger.debug("Bootstrapping categories", { count: categories.length });

    // Process root categories (no parentId), recursion will handle subcategories
    return Promise.all(categories.map((category) => this.bootstrapCategory(category)));
  }

  private async getOrCreateCategory(categoryInput: CategoryInput, parentId?: string): Promise<Category> {
    const existingCategory = await this.getExistingCategory(categoryInput.name);

    if (existingCategory) {
      return existingCategory;
    }

    return this.createCategory(categoryInput, parentId);
  }

  private async bootstrapCategory(categoryInput: CategoryInput, parentId?: string): Promise<Category> {
    logger.debug("Bootstrapping category", { name: categoryInput.name, parentId });

    // Create or get the category with parent if specified
    const category = await this.getOrCreateCategory(categoryInput, parentId);

    logger.debug("Category bootstrapped", {
      category,
    });

    // Handle union type - check if this is an update input with subcategories
    if ("subcategories" in categoryInput && categoryInput.subcategories) {
      logger.debug("Processing subcategories", {
        count: categoryInput.subcategories.length,
        parentCategory: categoryInput.name,
      });

      // Recursively bootstrap each subcategory with this category as parent
      for (const subcategory of categoryInput.subcategories) {
        await this.bootstrapCategory(subcategory, category.id);
      }
    }

    return category;
  }
}
