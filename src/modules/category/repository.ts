import type { Client } from "@urql/core";
import { graphql, type VariablesOf, type ResultOf } from "gql.tada";
import { logger } from "../../lib/logger";

const createCategoryMutation = graphql(`
  mutation CreateCategory($input: CategoryInput!, $parent: ID) {
    categoryCreate(input: $input, parent: $parent) {
      category {
        id
        name
        children(first: 100) {
          edges {
            node {
              id
              name
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
    categories(filter: { search: $name }, first: 1) {
      edges {
        node {
          id
          name
          children(first: 100) {
            edges {
              node {
                id
                name
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
}

export class CategoryRepository implements CategoryOperations {
  constructor(private client: Client) {}

  async createCategory(
    input: CategoryInput,
    parentId?: string
  ): Promise<Category> {
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
      throw new Error(
        `Failed to create category: ${
          result.data?.categoryCreate?.errors
            ?.map((e) => `${e.field}: ${e.message}`)
            .join(", ") || "Unknown error"
        }`
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

    return result.data?.categories?.edges?.[0]?.node;
  }
}
