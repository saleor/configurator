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

const attributeBulkCreateMutation = graphql(`
  mutation AttributeBulkCreate(
    $attributes: [AttributeCreateInput!]!
    $errorPolicy: ErrorPolicyEnum
  ) {
    attributeBulkCreate(
      attributes: $attributes
      errorPolicy: $errorPolicy
    ) {
      count
      results {
        attribute {
          id
          name
          slug
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
        errors {
          path
          message
          code
        }
      }
      errors {
        path
        message
        code
      }
    }
  }
`);

const attributeBulkUpdateMutation = graphql(`
  mutation AttributeBulkUpdate(
    $attributes: [AttributeBulkUpdateInput!]!
    $errorPolicy: ErrorPolicyEnum
  ) {
    attributeBulkUpdate(
      attributes: $attributes
      errorPolicy: $errorPolicy
    ) {
      count
      results {
        attribute {
          id
          name
          slug
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
        errors {
          path
          message
          code
        }
      }
      errors {
        path
        message
        code
      }
    }
  }
`);

export type AttributeCreateInput = VariablesOf<typeof createAttributeMutation>["input"];

export type AttributeUpdateInput = VariablesOf<typeof updateAttributeMutation>["input"];

export type AttributeBulkCreateInput = VariablesOf<typeof attributeBulkCreateMutation>;
export type AttributeBulkUpdateInput = VariablesOf<typeof attributeBulkUpdateMutation>;

type AttributeFragment = NonNullable<
  NonNullable<NonNullable<ResultOf<typeof createAttributeMutation>>["attributeCreate"]>["attribute"]
>;

export type Attribute = AttributeFragment;

export type AttributeBulkCreateResult = NonNullable<
  NonNullable<ResultOf<typeof attributeBulkCreateMutation>>["attributeBulkCreate"]
>;

export type AttributeBulkUpdateResult = NonNullable<
  NonNullable<ResultOf<typeof attributeBulkUpdateMutation>>["attributeBulkUpdate"]
>;

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
  bulkCreateAttributes(input: AttributeBulkCreateInput): Promise<AttributeBulkCreateResult>;
  bulkUpdateAttributes(input: AttributeBulkUpdateInput): Promise<AttributeBulkUpdateResult>;
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

  async bulkCreateAttributes(input: AttributeBulkCreateInput): Promise<AttributeBulkCreateResult> {
    const result = await this.client.mutation(attributeBulkCreateMutation, input);

    if (!result.data?.attributeBulkCreate) {
      // Handle GraphQL errors
      if (result.error?.graphQLErrors && result.error.graphQLErrors.length > 0) {
        throw GraphQLError.fromGraphQLErrors(
          result.error.graphQLErrors,
          "Failed to bulk create attributes"
        );
      }

      // Handle network errors
      if (result.error) {
        throw new GraphQLError(
          `Network error: ${result.error.message} while bulk creating attributes`
        );
      }

      throw new GraphQLError("Failed to bulk create attributes");
    }

    logger.info(`Bulk created ${result.data.attributeBulkCreate.count} attributes`);

    return result.data.attributeBulkCreate as AttributeBulkCreateResult;
  }

  async bulkUpdateAttributes(input: AttributeBulkUpdateInput): Promise<AttributeBulkUpdateResult> {
    const result = await this.client.mutation(attributeBulkUpdateMutation, input);

    if (!result.data?.attributeBulkUpdate) {
      // Handle GraphQL errors
      if (result.error?.graphQLErrors && result.error.graphQLErrors.length > 0) {
        throw GraphQLError.fromGraphQLErrors(
          result.error.graphQLErrors,
          "Failed to bulk update attributes"
        );
      }

      // Handle network errors
      if (result.error) {
        throw new GraphQLError(
          `Network error: ${result.error.message} while bulk updating attributes`
        );
      }

      throw new GraphQLError("Failed to bulk update attributes");
    }

    logger.info(`Bulk updated ${result.data.attributeBulkUpdate.count} attributes`);

    return result.data.attributeBulkUpdate as AttributeBulkUpdateResult;
  }
}
