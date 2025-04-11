import type { Client } from "@urql/core";
import { graphql, type VariablesOf, type ResultOf } from "gql.tada";
import { logger } from "../../lib/logger";

const createCategoryMutation = graphql(`
  mutation CreateCategory($input: CategoryInput!, $parent: ID) {
    categoryCreate(input: $input, parent: $parent) {
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

  async createCategory(
    input: CategoryInput,
    parentId?: string
  ): Promise<Category> {
    try {
      if (!input.name) {
        throw new Error("Category name is required");
      }

      logger.debug("Creating category", {
        name: input.name,
        parentId,
      });

      const variables = {
        input: {
          name: input.name,
        },
        parent: parentId,
      };

      logger.debug("GraphQL mutation", {
        mutation: createCategoryMutation.toString(),
        variables,
      });

      const result = await this.client.mutation(
        createCategoryMutation,
        variables
      );

      logger.debug("GraphQL response", {
        data: result.data,
        error: result.error,
        operation: result.operation,
      });

      if (result.error) {
        logger.error("GraphQL error occurred", {
          error: result.error,
          graphQLErrors: result.error.graphQLErrors,
          networkError: result.error.networkError,
          response: result.error.response,
        });
        throw new Error(`GraphQL error: ${result.error.message}`);
      }

      if (!result.data?.categoryCreate?.category) {
        const errors = result.data?.categoryCreate?.errors;
        logger.error("Failed to create category", {
          errors,
          name: input.name,
          parentId,
          response: result.data,
        });
        throw new Error(
          `Failed to create category: ${
            errors?.map((e) => `${e.field}: ${e.message}`).join(", ") ||
            "Unknown error"
          }`
        );
      }

      const createdCategory = result.data.categoryCreate.category;

      logger.info("Category created", {
        category: createdCategory,
      });

      return createdCategory;
    } catch (error) {
      logger.error("Unexpected error in createCategory", {
        error,
        name: input.name,
        parentId,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async createCategoryWithSubcategories(
    name: string,
    subcategories: string[] = []
  ): Promise<Category> {
    try {
      logger.debug("Creating category with subcategories", {
        name,
        subcategories,
      });

      // First create the parent category
      const parentCategory = await this.createCategory({ name });

      // Then create each subcategory with the parent ID
      for (const subcategoryName of subcategories) {
        await this.createCategory({ name: subcategoryName }, parentCategory.id);
      }

      return parentCategory;
    } catch (error) {
      logger.error("Failed to create category with subcategories", {
        error,
        name,
        subcategories,
      });
      throw error;
    }
  }

  async getCategoryByName(name: string) {
    const result = await this.client.query(getCategoryByNameQuery, {
      name,
    });

    return result.data?.categories?.edges?.[0]?.node;
  }
}
