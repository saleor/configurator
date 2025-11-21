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
      throw GraphQLError.fromGraphQLErrors(
        result.error?.graphQLErrors ?? [],
        `Failed to update attribute ${attributeInput.name}`
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

    return result.data?.attributes?.edges?.map((edge) => edge.node as Attribute);
  }
}