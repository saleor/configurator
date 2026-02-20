import { logger } from "../../lib/logger";
import { DelayConfig } from "../../lib/utils/bulk-operation-constants";
import { ServiceErrorWrapper } from "../../lib/utils/error-wrapper";
import { delay, rateLimiter } from "../../lib/utils/resilience";
import type { CategoryInput } from "../config/schema/schema";
import { CategoryCreationError, CategoryError } from "./errors";
import type {
  Category,
  CategoryOperations,
  CategoryInput as RepositoryCategoryInput,
} from "./repository";

type CategoryInputWithSubcategories = CategoryInput & { subcategories: CategoryInput[] };

export class CategoryService {
  constructor(private repository: CategoryOperations) {}

  private hasSubcategories(input: CategoryInput): input is CategoryInputWithSubcategories {
    return (
      "subcategories" in input &&
      Array.isArray(input.subcategories) &&
      input.subcategories.length > 0
    );
  }

  /** Fetches all categories from the Saleor API. */
  async getAllCategories() {
    return ServiceErrorWrapper.wrapServiceCall(
      "fetch all categories",
      "categories",
      undefined,
      () => this.repository.getAllCategories(),
      CategoryError
    );
  }

  /** Fetches a category by its slug, falling back to a full category list scan. */
  async getCategoryBySlug(slug: string) {
    return ServiceErrorWrapper.wrapServiceCall(
      "fetch category by slug",
      "category",
      slug,
      async () => {
        const category = await this.repository.getCategoryBySlug(slug);
        if (category) {
          return category;
        }

        const categories = await this.repository.getAllCategories();
        return categories.find((c) => c.slug === slug) || null;
      },
      CategoryError
    );
  }

  private async getExistingCategory(categoryInput: CategoryInput) {
    return ServiceErrorWrapper.wrapServiceCall(
      "fetch category",
      "category",
      categoryInput.slug,
      async () => {
        const existingBySlug = await this.repository.getCategoryBySlug(categoryInput.slug);
        if (existingBySlug) return existingBySlug;

        // Slug lookup returned null; search by name as fallback
        const all = await this.repository.getAllCategories();
        return all.find((c) => c.name === categoryInput.name) || null;
      },
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

  /** Bootstraps a list of categories, creating any that don't exist yet. */
  async bootstrapCategories(categories: CategoryInput[]) {
    logger.debug("Bootstrapping categories", { count: categories.length });

    await this.repository.getAllCategories();
    logger.debug("Category cache primed");

    const results = await ServiceErrorWrapper.wrapBatch(
      categories,
      "Bootstrap categories",
      (cat) => cat.name,
      (category) => this.bootstrapCategory(category),
      {
        sequential: true,
        delayMs: rateLimiter.getAdaptiveDelay(100),
      }
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
        results.failures.map((f) => `${f.item.name}: ${f.error.message}`)
      );
    }

    return results.successes.map((s) => s.result);
  }

  /**
   * Optimized bootstrap for larger category trees.
   * Groups categories by tree level and processes siblings concurrently.
   * Level-based processing ensures parents exist before children are created.
   */
  async bootstrapCategoriesOptimized(categories: CategoryInput[]): Promise<Category[]> {
    logger.debug("Bootstrapping categories (optimized)", { count: categories.length });

    // Prime cache once at the start
    await this.repository.getAllCategories();
    logger.debug("Category cache primed for optimized processing");

    // Flatten tree into levels for concurrent processing
    const levels = this.flattenByLevel(categories);
    const categoryIdBySlug = new Map<string, string>();
    const allCreated: Category[] = [];

    for (const [level, items] of levels) {
      logger.debug(`Processing category level ${level}`, { count: items.length });

      // Process items sequentially within each level to avoid overwhelming the API
      const results = await ServiceErrorWrapper.wrapBatch(
        items,
        `Bootstrap categories (level ${level})`,
        (item) => item.input.name,
        async (item) => {
          // Look up parent ID from our tracking map
          const parentId = item.parentSlug ? categoryIdBySlug.get(item.parentSlug) : undefined;

          const category = await this.getOrCreateCategory(item.input, parentId);

          // Track for child lookups
          categoryIdBySlug.set(item.input.slug, category.id);
          return category;
        },
        {
          sequential: true, // Sequential within level to avoid rate limits
          delayMs: rateLimiter.getAdaptiveDelay(50), // Small delay between items
        }
      );

      if (results.failures.length > 0) {
        const errorMessage = `Failed to bootstrap ${results.failures.length} categories at level ${level}`;
        logger.error(errorMessage, {
          failures: results.failures.map((f) => ({
            category: f.item.input.name,
            error: f.error.message,
          })),
        });
        throw new CategoryError(
          errorMessage,
          results.failures.map((f) => `${f.item.input.name}: ${f.error.message}`)
        );
      }

      allCreated.push(...results.successes.map((s) => s.result));

      // Delay between levels (not items) to minimize total wait time
      const nextLevel = level + 1;
      if (levels.has(nextLevel)) {
        const adaptiveDelay = rateLimiter.getAdaptiveDelay(DelayConfig.CATEGORY_LEVEL_DELAY_MS);
        logger.debug(`Waiting ${adaptiveDelay}ms before level ${nextLevel}`);
        await delay(adaptiveDelay);
      }
    }

    logger.info("Optimized category bootstrap complete", {
      totalCreated: allCreated.length,
      levels: levels.size,
    });

    return allCreated;
  }

  /**
   * Flatten nested category tree into a map of level -> categories at that level.
   * Each item includes the parent slug for lookup during creation.
   */
  flattenByLevel(
    categories: CategoryInput[]
  ): Map<number, Array<{ input: CategoryInput; parentSlug?: string }>> {
    const levels = new Map<number, Array<{ input: CategoryInput; parentSlug?: string }>>();

    const traverse = (cats: CategoryInput[], level: number, parentSlug?: string): void => {
      if (!levels.has(level)) {
        levels.set(level, []);
      }

      for (const cat of cats) {
        levels.get(level)?.push({ input: cat, parentSlug });

        if (this.hasSubcategories(cat)) {
          traverse(cat.subcategories, level + 1, cat.slug);
        }
      }
    };

    traverse(categories, 0);
    return levels;
  }

  private async getOrCreateCategory(
    categoryInput: CategoryInput,
    parentId?: string
  ): Promise<Category> {
    try {
      const existingCategory = await this.getExistingCategory(categoryInput);

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

        const category = await this.getOrCreateCategory(categoryInput, parentId);

        logger.debug("Category bootstrapped", {
          category,
        });

        if (this.hasSubcategories(categoryInput)) {
          logger.debug("Processing subcategories", {
            count: categoryInput.subcategories.length,
            parentCategory: categoryInput.name,
          });

          const subcategoryResults = await ServiceErrorWrapper.wrapBatch(
            categoryInput.subcategories,
            "Bootstrap subcategories",
            (sub) => sub.name,
            (subcategory) => this.bootstrapCategory(subcategory, category.id),
            {
              sequential: true,
              delayMs: rateLimiter.getAdaptiveDelay(100),
            }
          );

          if (subcategoryResults.failures.length > 0) {
            throw new CategoryError(
              `Failed to create subcategories for '${categoryInput.name}'`,
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
