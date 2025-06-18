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

export type AttributeCreateInput = VariablesOf<
  typeof createAttributeMutation
>["input"];

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

const getAttributeBySlugQuery = graphql(`
  query GetAttributeBySlug($slug: String!, $type: AttributeTypeEnum) {
    attributes(
      first: 1
      where: { slug: { eq: $slug }, type: { eq: $type } }
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

export type GetAttributeBySlugInput = VariablesOf<
  typeof getAttributeBySlugQuery
>;

// Type for Attribute extracted from mutation result (simpler path)
export type Attribute = NonNullable<
  NonNullable<
    ResultOf<typeof createAttributeMutation>["attributeCreate"]
  >["attribute"]
>;

export interface AttributeOperations {
  createAttribute(attributeInput: AttributeCreateInput): Promise<Attribute>;
  getAttributesByNames(
    input: GetAttributesByNamesInput
  ): Promise<Attribute[] | null | undefined>;
  getAttributeByName(name: string): Promise<Attribute | null | undefined>;
  getAttributeBySlug(
    slug: string,
    type: string
  ): Promise<Attribute | null | undefined>;
}

export class AttributeRepository implements AttributeOperations {
  constructor(private client: Client) {}

  async createAttribute(
    attributeInput: AttributeCreateInput
  ): Promise<Attribute> {
    logger.debug("Creating attribute with input", { attributeInput });
    
    const result = await this.client.mutation(createAttributeMutation, {
      input: attributeInput,
    });

    logger.debug("Attribute creation result", { result });

    if (result.error) {
      logger.error("GraphQL error during attribute creation", {
        error: result.error,
        input: attributeInput,
      });
      throw new Error(`GraphQL error: ${result.error.message}`);
    }

    if (result.data?.attributeCreate?.errors?.length) {
      const errors = result.data.attributeCreate.errors;
      logger.error("Attribute creation errors from Saleor API", {
        errors,
        input: attributeInput,
      });
             throw new Error(
         `Attribute creation failed: ${errors
           .map((e: any) => `${e.field}: ${e.message}`)
           .join(", ")}`
       );
    }

    if (!result.data?.attributeCreate?.attribute) {
      logger.error("No attribute returned from creation", {
        result: result.data,
        input: attributeInput,
      });
      throw new Error("Failed to create attribute - no attribute returned");
    }

    logger.info("Attribute created", {
      name: result.data.attributeCreate.attribute.name,
    });

    return result.data.attributeCreate.attribute as Attribute;
  }

  async getAttributesByNames(input: GetAttributesByNamesInput) {
    const result = await this.client.query(getAttributesByNamesQuery, {
      names: (input as any).names,
      type: (input as any).type,
    });

    return result.data?.attributes?.edges?.map(
      (edge: any) => edge.node as Attribute
    );
  }

  async getAttributeByName(name: string): Promise<Attribute | null | undefined> {
    const attributes = await this.getAttributesByNames({ names: [name] } as GetAttributesByNamesInput);
    return attributes?.[0];
  }

  async getAttributeBySlug(
    slug: string,
    type: string
  ): Promise<Attribute | null | undefined> {
    logger.debug("Looking up attribute by slug", { slug, type });
    
    const result = await this.client.query(getAttributeBySlugQuery, {
      slug,
      type: type as any,
    });

    if (result.error) {
      logger.error("GraphQL error during attribute lookup", {
        error: result.error,
        slug,
        type,
      });
      throw new Error(`GraphQL error: ${result.error.message}`);
    }

    const attribute = result.data?.attributes?.edges?.[0]?.node;
    
    if (attribute) {
      logger.debug("Found existing attribute", {
        id: attribute.id,
        name: attribute.name,
        slug,
      });
      return attribute as Attribute;
    }
    
    logger.debug("Attribute not found", { slug, type });
    return null;
  }
}
