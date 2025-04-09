import type { Client } from "@urql/core";
import { graphql, type VariablesOf, type ResultOf } from "gql.tada";
import logger from "../../lib/logger";

const createCategoryMutation = graphql(`
  mutation CreateCategory($input: CategoryInput!) {
    categoryCreate(input: $input) {
      category {
        id
        name
      }
      errors {
        field
        message
      }
    }
  }
`);

export type Category = NonNullable<
  NonNullable<
    ResultOf<typeof createCategoryMutation>["categoryCreate"]
  >["category"]
>;

export type CategoryInput = VariablesOf<typeof createCategoryMutation>["input"];

const getCategoryByNameQuery = graphql(`
  query GetCategoryByName($name: String!) {
    categories(filter: { search: $name }, first: 1) {
      edges {
        node {
          id
          name
        }
      }
    }
  }
`);

export interface CategoryOperations {
  createCategory(input: CategoryInput, parentId?: string): Promise<Category>;
  getCategoryByName(name: string): Promise<Category | null | undefined>;
}

export class CategoryRepository implements CategoryOperations {
  constructor(private client: Client) {}

  async createCategory(input: CategoryInput): Promise<Category> {
    const result = await this.client.mutation(createCategoryMutation, {
      input: {
        name: input.name,
      },
    });

    if (!result.data?.categoryCreate?.category) {
      logger.error("Failed to create category", {
        errors: result.data?.categoryCreate?.errors,
        error: result.error,
      });
      throw new Error("Failed to create category");
    }

    return result.data.categoryCreate.category;
  }

  async getCategoryByName(name: string) {
    const result = await this.client.query(getCategoryByNameQuery, {
      name,
    });

    return result.data?.categories?.edges?.[0]?.node;
  }
}
