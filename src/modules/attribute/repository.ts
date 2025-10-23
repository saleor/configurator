import type { Client } from "@urql/core";
import { graphql, type ResultOf, type VariablesOf } from "gql.tada";
import { GraphQLError } from "../../lib/errors/graphql";
import { logger } from "../../lib/logger";

const createAttributeMutation = graphql(`
  mutation CreateAttribute($input: AttributeCreateInput!) {
    attributeCreate(input: $input) {
      attribute {
        id
        name
        type
        inputType
        entityType
        choices(first: 100) {
          edges {
            node {
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

const updateAttributeMutation = graphql(`
  mutation UpdateAttribute($id: ID!, $input: AttributeUpdateInput!) {
    attributeUpdate(id: $id, input: $input) {
      attribute {
        id
        name
        type
        inputType
        entityType
        choices(first: 100) {
          edges {
            node {
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

export type AttributeCreateInput = VariablesOf<typeof createAttributeMutation>["input"];

export type AttributeUpdateInput = VariablesOf<typeof updateAttributeMutation>["input"];

type AttributeFragment = NonNullable<
  NonNullable<NonNullable<ResultOf<typeof createAttributeMutation>>["attributeCreate"]>["attribute"]
>;

export type Attribute = AttributeFragment;

const getAttributesByNamesQuery = graphql(`
  query GetAttributesByNames($names: [String!]!, $type: AttributeTypeEnum) {
    attributes(
      first: 100
      where: { name: { oneOf: $names }, type: { eq: $type } }
    ) {
      edges {
        node {
          id
          name
          type
          inputType
          entityType
          choices(first: 100) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                id
                name
                value
              }
            }
          }
        }
      }
    }
  }
`);

const getAttributeChoicesQuery = graphql(`
  query GetAttributeChoices($id: ID!, $after: String) {
    attribute(id: $id) {
      id
      choices(first: 100, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            name
            value
          }
        }
      }
    }
  }
`);

export type GetAttributesByNamesInput = VariablesOf<typeof getAttributesByNamesQuery>;

export interface AttributeOperations {
  createAttribute(attributeInput: AttributeCreateInput): Promise<Attribute>;
  updateAttribute(id: string, attributeInput: AttributeUpdateInput): Promise<Attribute>;
  getAttributesByNames(input: GetAttributesByNamesInput): Promise<Attribute[] | null | undefined>;
}

export class AttributeRepository implements AttributeOperations {
  constructor(private client: Client) {}

  async createAttribute(attributeInput: AttributeCreateInput): Promise<Attribute> {
    const result = await this.client.mutation(createAttributeMutation, {
      input: attributeInput,
    });

    if (!result.data?.attributeCreate?.attribute) {
      // Handle GraphQL errors with automatic formatting
      if (result.error?.graphQLErrors && result.error.graphQLErrors.length > 0) {
        throw GraphQLError.fromGraphQLErrors(
          result.error.graphQLErrors,
          `Failed to create attribute ${attributeInput.name}`
        );
      }

      // Handle network errors
      if (result.error) {
        throw new GraphQLError(
          `Network error: ${result.error.message} while creating attribute ${attributeInput.name}`
        );
      }

      // Handle business logic errors
      const businessErrors = result.data?.attributeCreate?.errors ?? [];
      throw GraphQLError.fromDataErrors(
        `Failed to create attribute ${attributeInput.name}`,
        businessErrors
      );
    }

    return result.data.attributeCreate.attribute as Attribute;
  }

  async updateAttribute(id: string, attributeInput: AttributeUpdateInput): Promise<Attribute> {
    const result = await this.client.mutation(updateAttributeMutation, {
      id,
      input: attributeInput,
    });

    if (!result.data?.attributeUpdate?.attribute) {
      // Handle GraphQL errors with automatic formatting
      if (result.error?.graphQLErrors && result.error.graphQLErrors.length > 0) {
        throw GraphQLError.fromGraphQLErrors(
          result.error.graphQLErrors,
          `Failed to update attribute ${attributeInput.name}`
        );
      }

      // Handle network errors (only if no graphQL errors)
      if (result.error && !result.error.graphQLErrors) {
        throw new GraphQLError(
          `Network error: ${result.error.message} while updating attribute ${attributeInput.name}`
        );
      }

      // Handle business logic errors
      const businessErrors = result.data?.attributeUpdate?.errors ?? [];
      throw GraphQLError.fromDataErrors(
        `Failed to update attribute ${attributeInput.name}`,
        businessErrors
      );
    }

    logger.info("Attribute updated", {
      name: result.data.attributeUpdate.attribute.name,
      id,
    });

    return result.data.attributeUpdate.attribute as Attribute;
  }

  async getAttributesByNames(input: GetAttributesByNamesInput) {
    const result = await this.client.query(getAttributesByNamesQuery, {
      names: input.names,
      type: input.type,
    });

    const attributes = result.data?.attributes?.edges?.map((edge) => edge.node) ?? [];

    // Fetch remaining choices for attributes that have more than 100 (in parallel)
    const paginationPromises = attributes
      .filter((attr) => attr?.choices?.pageInfo?.hasNextPage && attr.id)
      .map((attr) => this.fetchAllAttributeChoices(attr));

    // Wait for all pagination requests to complete
    await Promise.all(paginationPromises);

    return attributes as Attribute[];
  }

  private async fetchAllAttributeChoices(attr: NonNullable<ResultOf<typeof getAttributesByNamesQuery>["attributes"]>["edges"][number]["node"]): Promise<void> {
    if (!attr?.choices?.pageInfo || !attr.id) return;

    const allChoices = [...(attr.choices.edges ?? [])];
    let cursor = attr.choices.pageInfo.endCursor;

    try {
      while (cursor) {
        const choicesResult = await this.client.query(getAttributeChoicesQuery, {
          id: attr.id,
          after: cursor,
        });

        const moreChoices = choicesResult.data?.attribute?.choices?.edges ?? [];
        allChoices.push(...moreChoices);

        const pageInfo = choicesResult.data?.attribute?.choices?.pageInfo;
        cursor = pageInfo?.hasNextPage ? (pageInfo.endCursor ?? null) : null;
      }

      // Update the attribute's choices with all fetched choices
      if (attr.choices) {
        attr.choices.edges = allChoices;
      }
    } catch (error) {
      logger.warn(`Failed to fetch additional choices for attribute ${attr.name} (${attr.id})`, {
        error: error instanceof Error ? error.message : String(error),
        attributeId: attr.id,
        attributeName: attr.name,
      });
      // Continue with partial data - the attribute still has its first 100 choices
    }
  }
}
