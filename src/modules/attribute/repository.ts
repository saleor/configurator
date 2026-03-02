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
        choices(first: 250) {
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
        choices(first: 250) {
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
          choices(first: 250) {
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
          choices(first: 250) {
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
  query GetAttributesByNames($names: [String!]!, $type: AttributeTypeEnum, $after: String) {
    attributes(
      first: 100
      after: $after
      where: { name: { oneOf: $names }, type: { eq: $type } }
    ) {
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          id
          name
          type
          inputType
          entityType
          choices(first: 250) {
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
  getAttributesByNames(input: GetAttributesByNamesInput): Promise<Attribute[]>;
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
      if (result.error?.graphQLErrors && result.error.graphQLErrors.length > 0) {
        throw GraphQLError.fromGraphQLErrors(
          result.error.graphQLErrors,
          `Failed to create attribute ${attributeInput.name}`
        );
      }

      if (result.error) {
        throw new GraphQLError(
          `Network error: ${result.error.message} while creating attribute ${attributeInput.name}`
        );
      }

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

    logger.debug("Attribute updated", {
      name: result.data.attributeUpdate.attribute.name,
      id,
    });

    return result.data.attributeUpdate.attribute as Attribute;
  }

  private async fetchAttributesByNamesPage(
    names: GetAttributesByNamesInput["names"],
    type: GetAttributesByNamesInput["type"],
    after: string | null
  ) {
    const result = await this.client.query(getAttributesByNamesQuery, { names, type, after });

    if (result.error) {
      if (result.error.graphQLErrors && result.error.graphQLErrors.length > 0) {
        throw GraphQLError.fromGraphQLErrors(
          result.error.graphQLErrors,
          `Failed to fetch attributes by names: ${names.join(", ")}`
        );
      }

      throw new GraphQLError(
        `Network error while fetching attributes by names: ${result.error.message}`
      );
    }

    return result.data?.attributes;
  }

  async getAttributesByNames(input: GetAttributesByNamesInput): Promise<Attribute[]> {
    const allAttributes: Attribute[] = [];
    let cursor: string | null = null;

    do {
      const page = await this.fetchAttributesByNamesPage(input.names, input.type, cursor);
      const edges = page?.edges ?? [];
      for (const edge of edges) {
        allAttributes.push(edge.node as Attribute);
      }

      cursor = page?.pageInfo?.hasNextPage ? (page.pageInfo.endCursor ?? null) : null;
    } while (cursor);

    return allAttributes;
  }

  async bulkCreateAttributes(input: AttributeBulkCreateInput): Promise<AttributeBulkCreateResult> {
    const result = await this.client.mutation(attributeBulkCreateMutation, input);

    if (!result.data?.attributeBulkCreate) {
      if (result.error?.graphQLErrors && result.error.graphQLErrors.length > 0) {
        throw GraphQLError.fromGraphQLErrors(
          result.error.graphQLErrors,
          "Failed to bulk create attributes"
        );
      }

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
      if (result.error?.graphQLErrors && result.error.graphQLErrors.length > 0) {
        throw GraphQLError.fromGraphQLErrors(
          result.error.graphQLErrors,
          "Failed to bulk update attributes"
        );
      }

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
