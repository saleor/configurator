import type { Client } from "@urql/core";
import { graphql, type VariablesOf, type ResultOf } from "gql.tada";
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
              id
              name
              value
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
              id
              name
              value
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

export type AttributeCreateInput = VariablesOf<
  typeof createAttributeMutation
>["input"];

export type AttributeUpdateInput = VariablesOf<
  typeof updateAttributeMutation
>["input"];

type AttributeFragment = NonNullable<
  NonNullable<
    NonNullable<ResultOf<typeof createAttributeMutation>>["attributeCreate"]
  >["attribute"]
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
                name
              }
            }
          }
        }
      }
    }
  }
`);

export type GetAttributesByNamesInput = VariablesOf<
  typeof getAttributesByNamesQuery
>;

export interface AttributeOperations {
  createAttribute(attributeInput: AttributeCreateInput): Promise<Attribute>;
  updateAttribute(id: string, attributeInput: AttributeUpdateInput): Promise<Attribute>;
  getAttributesByNames(
    input: GetAttributesByNamesInput
  ): Promise<Attribute[] | null | undefined>;
}

export class AttributeRepository implements AttributeOperations {
  constructor(private client: Client) {}

  async createAttribute(
    attributeInput: AttributeCreateInput
  ): Promise<Attribute> {
    logger.debug("Creating attribute", { name: attributeInput.name, input: attributeInput });

    const result = await this.client.mutation(createAttributeMutation, {
      input: attributeInput,
    });

    logger.debug("Attribute creation result", { 
      success: !!result.data?.attributeCreate?.attribute,
      error: result.error?.message,
      errors: result.data?.attributeCreate?.errors 
    });

    if (!result.data?.attributeCreate?.attribute) {
      const errors = result.data?.attributeCreate?.errors
        ?.map((e) => `${e.field}: ${e.message}`)
        .join(", ");
      const graphqlError = result.error?.message;
      throw new Error(`Failed to create attribute: ${errors || graphqlError || "Unknown error"}`);
    }

    const createdAttribute = result.data.attributeCreate.attribute;
    logger.info("Attribute created", {
      name: createdAttribute.name,
      inputType: createdAttribute.inputType,
      choicesCount: createdAttribute.choices?.edges?.length || 0,
      choices: createdAttribute.choices?.edges?.map(e => e.node.name) || []
    });

    return result.data.attributeCreate.attribute as Attribute;
  }

  async updateAttribute(
    id: string,
    attributeInput: AttributeUpdateInput
  ): Promise<Attribute> {
    const result = await this.client.mutation(updateAttributeMutation, {
      id,
      input: attributeInput,
    });

    if (!result.data?.attributeUpdate?.attribute) {
      throw new Error("Failed to update attribute");
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

    return result.data?.attributes?.edges?.map(
      (edge) => edge.node as Attribute
    );
  }
}
