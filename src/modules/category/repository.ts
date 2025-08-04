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
        children(first: 100) {
          edges {
            node {
              id
              name
              slug
            }
          }
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
          children(first: 100) {
            edges {
              node {
                id
                name
                slug
              }
            }
          }
        }
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
          children(first: 100) {
            edges {
              node {
                id
                name
                slug
              }
            }
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
      input: {
        name: input.name,
      },
      parent: parentId,
    });

    if (!result.data?.categoryCreate?.category) {
      throw GraphQLError.fromGraphQLErrors(
        result.error?.graphQLErrors ?? [],
        `Failed to create category ${input.name}`
      );
    }

    const createdCategory = result.data.categoryCreate.category;

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

    return exactMatch?.node;
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
