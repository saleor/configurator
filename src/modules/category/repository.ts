import type { Client } from "@urql/core";
import { graphql, type ResultOf, type VariablesOf } from "gql.tada";
import { GraphQLError } from "../../lib/errors/graphql";
import { logger } from "../../lib/logger";

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
  constructor(private client: Client) {}

  async createCategory(input: CategoryInput, parentId?: string): Promise<Category> {
    logger.debug("Creating category", {
      name: input.name,
      parentId,
    });

    const result = await this.client.mutation(createCategoryMutation, {
      input,
      parent: parentId,
    });

    // Handle transport/GraphQL layer errors first (permission, auth, bad query)
    if (result.error) {
      // Check for rate limiting specifically
      if (result.error.networkError && "status" in result.error.networkError) {
        const status = (result.error.networkError as { status: number }).status;
        if (status === 429) {
          throw new Error(
            `Failed to create category ${input.name}: Rate limited by API (Too Many Requests). Please wait before retrying.`
          );
        }
      }

      throw GraphQLError.fromCombinedError(`Failed to create category ${input.name}`, result.error);
    }

    const mutationResult = result.data?.categoryCreate;
    const dataErrors = mutationResult?.errors ?? [];

    if (dataErrors.length > 0) {
      throw GraphQLError.fromDataErrors(`Failed to create category ${input.name}`, dataErrors);
    }

    if (!mutationResult?.category) {
      // No transport error and no data errors, yet no category returned
      // Provide a clearer fallback message
      throw new GraphQLError(`Failed to create category ${input.name}: empty response`);
    }

    const createdCategory = mutationResult.category;

    logger.info("Category created", {
      category: createdCategory,
    });

    return createdCategory;
  }

  async getCategoryByName(name: string): Promise<Category | null | undefined> {
    const result = await this.client.query(getCategoryByNameQuery, {
      name,
    });

    // Find exact match among search results to prevent duplicate creation
    const exactMatch = result.data?.categories?.edges?.find((edge) => edge.node?.name === name);

    if (exactMatch?.node) return exactMatch.node;

    // Fallback: scan all categories if search fails (schema/version differences)
    try {
      const all = await this.getAllCategories();
      return all.find((c) => c.name === name);
    } catch {
      return null;
    }
  }

  async getCategoryBySlug(slug: string): Promise<Category | null | undefined> {
    const result = await this.client.query(getCategoryBySlugQuery, {
      slug,
    });

    const direct = result.data?.category ?? null;
    if (direct) return direct;

    // Fallback: scan all categories if direct lookup not supported on API
    try {
      const all = await this.getAllCategories();
      return all.find((c) => c.slug === slug);
    } catch {
      return null;
    }
  }

  async getAllCategories(): Promise<Category[]> {
    logger.debug("Fetching all categories");

    const result = await this.client.query(getAllCategoriesQuery, {});

    if (!result.data?.categories?.edges) {
      logger.debug("No categories found");
      return [];
    }

    const categories = result.data.categories.edges
      .map((edge) => edge.node)
      .filter((node): node is Category => node !== null);

    logger.debug("Retrieved categories", {
      count: categories.length,
    });

    return categories;
  }
}
