import { logger } from "../../lib/logger";
import { ServiceErrorWrapper } from "../../lib/utils/error-wrapper";
import type { CategoryInput } from "../config/schema/schema";
import { CategoryCreationError, CategoryError } from "./errors";
import type {
  Category,
  CategoryOperations,
  CategoryInput as RepositoryCategoryInput,
} from "./repository";

export class CategoryService {
  constructor(private repository: CategoryOperations) {}

  async getAllCategories() {
    return ServiceErrorWrapper.wrapServiceCall(
      "fetch all categories",
      "categories",
      undefined,
      () => this.repository.getAllCategories(),
      CategoryError
    );
  }

  private async getExistingCategory(name: string) {
    return ServiceErrorWrapper.wrapServiceCall(
      "fetch category",
      "category",
      name,
      () => this.repository.getCategoryByName(name),
      CategoryError
    );
  }

  private async createCategory(input: CategoryInput, parentId?: string): Promise<Category> {
    return ServiceErrorWrapper.wrapServiceCall(
      "create category",
      "category",
      input.name,
      async () => {
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

        const category = await this.repository.createCategory(categoryInput, parentId);

        logger.debug("Created category", {
          id: category.id,
          name: category.name,
          parentId,
        });

        return category;
      },
      CategoryCreationError
    );
  }

  async bootstrapCategories(categories: CategoryInput[]) {
    logger.debug("Bootstrapping categories", { count: categories.length });

    const results = await ServiceErrorWrapper.wrapBatch(
      categories,
      "Bootstrap categories",
      (cat) => cat.name,
      (category) => this.bootstrapCategory(category)
    );

    if (results.failures.length > 0) {
      const errorMessage = `Failed to bootstrap ${results.failures.length} categories`;
      logger.error(errorMessage, {
        failures: results.failures.map((f) => ({
          category: f.item.name,
          error: f.error.message,
        })),
      });
      throw new CategoryError(
        errorMessage,
        "CATEGORY_BOOTSTRAP_ERROR",
        results.failures.map((f) => `${f.item.name}: ${f.error.message}`)
      );
    }

    return results.successes.map((s) => s.result);
  }

  private async getOrCreateCategory(
    categoryInput: CategoryInput,
    parentId?: string
  ): Promise<Category> {
    try {
      const existingCategory = await this.getExistingCategory(categoryInput.name);

      if (existingCategory) {
        return existingCategory;
      }

      return this.createCategory(categoryInput, parentId);
    } catch (error) {
      logger.error("Failed to get or create category", {
        name: categoryInput.name,
        parentId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async bootstrapCategory(
    categoryInput: CategoryInput,
    parentId?: string
  ): Promise<Category> {
    return ServiceErrorWrapper.wrapServiceCall(
      "bootstrap category",
      "category",
      categoryInput.name,
      async () => {
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
          const subcategoryResults = await ServiceErrorWrapper.wrapBatch(
            categoryInput.subcategories,
            "Bootstrap subcategories",
            (sub) => sub.name,
            (subcategory) => this.bootstrapCategory(subcategory, category.id)
          );

          if (subcategoryResults.failures.length > 0) {
            throw new CategoryError(
              `Failed to create subcategories for '${categoryInput.name}'`,
              "SUBCATEGORY_CREATION_ERROR",
              subcategoryResults.failures.map((f) => `${f.item.name}: ${f.error.message}`)
            );
          }
        }

        return category;
      },
      CategoryError
    );
  }
}
