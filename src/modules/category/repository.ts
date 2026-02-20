import type { Client } from "@urql/core";
import { graphql, type ResultOf, type VariablesOf } from "gql.tada";
import { GraphQLError } from "../../lib/errors/graphql";
import { logger } from "../../lib/logger";
import { isRateLimitError } from "../../lib/utils/error-classification";

const createCategoryMutation = graphql(`
  mutation CreateCategory($input: CategoryInput!, $parent: ID) {
    categoryCreate(input: $input, parent: $parent) {
      category {
        id
        name
        slug
        level
        parent {
          id
          slug
        }
      }
      errors {
        field
        message
      }
    }
  }
`);

export type CategoryInput = VariablesOf<typeof createCategoryMutation>["input"];

const getCategoryByNameQuery = graphql(`
  query GetCategoryByName($name: String!) {
    categories(filter: { search: $name }, first: 100) {
      edges {
        node {
          id
          name
          slug
          level
          parent {
            id
            slug
          }
        }
      }
    }
  }
`);

const getCategoryBySlugQuery = graphql(`
  query GetCategoryBySlug($slug: String!) {
    category(slug: $slug) {
      id
      name
      slug
      level
      parent {
        id
        slug
      }
    }
  }
`);

const getAllCategoriesQuery = graphql(`
  query GetAllCategories {
    categories(first: 100) {
      edges {
        node {
          id
          name
          slug
          level
          parent {
            id
            slug
          }
        }
      }
    }
  }
`);

export type Category = NonNullable<
  NonNullable<ResultOf<typeof getCategoryByNameQuery>["categories"]>["edges"]
>[number]["node"];

export interface CategoryOperations {
  createCategory(input: CategoryInput, parentId?: string): Promise<Category>;
  getCategoryByName(name: string): Promise<Category | null | undefined>;
  getCategoryBySlug(slug: string): Promise<Category | null | undefined>;
  getAllCategories(): Promise<Category[]>;
}

export class CategoryRepository implements CategoryOperations {
  private allCategoriesCache: Category[] | null = null;
  private categoryBySlugCache = new Map<string, Category>();

  constructor(private client: Client) {}

  /**
   * Add a newly created category to the cache instead of invalidating.
   * This avoids expensive re-fetches after each create operation.
   */
  private addToCache(category: Category): void {
    this.categoryBySlugCache.set(category.slug, category);
    if (this.allCategoriesCache) {
      this.allCategoriesCache.push(category);
    }
  }

  private populateSlugCache(categories: Category[]): void {
    for (const cat of categories) {
      this.categoryBySlugCache.set(cat.slug, cat);
    }
  }

  private assertCategoryReturned(
    category: Category | null | undefined,
    categoryName: string
  ): asserts category is Category {
    if (!category) {
      throw new GraphQLError(`Failed to create category ${categoryName}: empty response`);
    }
  }

  async createCategory(input: CategoryInput, parentId?: string): Promise<Category> {
    logger.debug("Creating category", {
      name: input.name,
      parentId,
    });

    const result = await this.client.mutation(createCategoryMutation, {
      input,
      parent: parentId,
    });

    if (result.error) {
      if (isRateLimitError(result.error)) {
        throw new Error(
          `Failed to create category ${input.name}: Rate limited by API (Too Many Requests). Please wait before retrying.`
        );
      }

      throw GraphQLError.fromCombinedError(`Failed to create category ${input.name}`, result.error);
    }

    const mutationResult = result.data?.categoryCreate;
    const dataErrors = mutationResult?.errors ?? [];

    if (dataErrors.length > 0) {
      throw GraphQLError.fromDataErrors(`Failed to create category ${input.name}`, dataErrors);
    }

    this.assertCategoryReturned(mutationResult?.category, input.name ?? "unknown");

    const createdCategory = mutationResult.category;

    logger.info("Category created", {
      category: createdCategory,
    });

    // Add to cache incrementally instead of invalidating
    this.addToCache(createdCategory);

    return createdCategory;
  }

  async getCategoryByName(name: string): Promise<Category | null | undefined> {
    const result = await this.client.query(getCategoryByNameQuery, {
      name,
    });

    if (result.error) {
      if (isRateLimitError(result.error)) {
        throw new Error(
          `Failed to get category by name ${name}: Rate limited by API (Too Many Requests). Please wait before retrying.`
        );
      }
      throw GraphQLError.fromCombinedError(`Failed to get category by name ${name}`, result.error);
    }

    const exactMatch = result.data?.categories?.edges?.find((edge) => edge.node?.name === name);

    if (exactMatch?.node) return exactMatch.node;

    try {
      const all = await this.getAllCategories();
      return all.find((c) => c.name === name);
    } catch (error) {
      // Never swallow rate limit errors - they must propagate for resilience
      if (isRateLimitError(error)) {
        throw error;
      }
      logger.warn("Failed to fetch all categories while looking up by name", {
        name,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async getCategoryBySlug(slug: string): Promise<Category | null | undefined> {
    const cached = this.categoryBySlugCache.get(slug);
    if (cached) {
      logger.debug("Category found in cache", { slug });
      return cached;
    }

    // If cache is primed with all categories, the item definitely doesn't exist
    // No need to make an API call - this is the key optimization
    if (this.allCategoriesCache !== null) {
      logger.debug("Category not found in primed cache", { slug });
      return null;
    }

    const result = await this.client.query(getCategoryBySlugQuery, {
      slug,
    });

    if (result.error) {
      if (isRateLimitError(result.error)) {
        throw new Error(
          `Failed to get category by slug ${slug}: Rate limited by API (Too Many Requests). Please wait before retrying.`
        );
      }
      throw GraphQLError.fromCombinedError(`Failed to get category by slug ${slug}`, result.error);
    }

    const direct = result.data?.category ?? null;
    if (direct) {
      this.categoryBySlugCache.set(slug, direct);
      return direct;
    }

    try {
      const all = await this.getAllCategories();
      return all.find((c) => c.slug === slug);
    } catch (error) {
      // Never swallow rate limit errors - they must propagate for resilience
      if (isRateLimitError(error)) {
        throw error;
      }
      logger.warn("Failed to fetch all categories while looking up by slug", {
        slug,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async getAllCategories(): Promise<Category[]> {
    if (this.allCategoriesCache) {
      logger.debug("Returning cached categories", {
        count: this.allCategoriesCache.length,
      });
      return this.allCategoriesCache;
    }

    logger.debug("Fetching all categories from API");

    const result = await this.client.query(getAllCategoriesQuery, {});

    if (result.error) {
      if (isRateLimitError(result.error)) {
        throw new Error(
          "Failed to fetch all categories: Rate limited by API (Too Many Requests). Please wait before retrying."
        );
      }
      throw GraphQLError.fromCombinedError("Failed to fetch all categories", result.error);
    }

    if (!result.data?.categories?.edges) {
      logger.debug("No categories found");
      this.allCategoriesCache = [];
      return [];
    }

    const categories = result.data.categories.edges
      .map((edge) => edge.node)
      .filter((node): node is Category => node !== null);

    this.allCategoriesCache = categories;
    this.populateSlugCache(categories);

    logger.debug("Retrieved and cached categories", {
      count: categories.length,
    });

    return categories;
  }
}
