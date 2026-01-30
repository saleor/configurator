import type { Client } from "@urql/core";
import { graphql, type ResultOf, type VariablesOf } from "gql.tada";
import { GraphQLError } from "../../lib/errors/graphql";
import { logger } from "../../lib/logger";

const createProductTypeMutation = graphql(`
  mutation CreateProductType($input: ProductTypeInput!) {
    productTypeCreate(input: $input) {
      productType {
        id
        name
        productAttributes {
          id
          name
        }
        variantAttributes {
          id
          name
        }
      }
    }
  }
`);

export type ProductType = NonNullable<
  NonNullable<ResultOf<typeof createProductTypeMutation>["productTypeCreate"]>["productType"]
>;
export type ProductTypeInput = VariablesOf<typeof createProductTypeMutation>["input"];

const assignAttributesToProductTypeMutation = graphql(`
  mutation AssignAttributesToProductType(
    $productTypeId: ID!
    $operations: [ProductAttributeAssignInput!]!
  ) {
    productAttributeAssign(
      productTypeId: $productTypeId
      operations: $operations
    ) {
      productType {
        id
      }
      errors {
        message
      }
    }
  }
`);

const getProductTypeByNameQuery = graphql(`
  query GetProductTypeByName($name: String!) {
    productTypes(filter: { search: $name }, first: 100) {
      edges {
        node {
          id
          name
          productAttributes {
            id
            name
          }
          variantAttributes {
            id
            name
          }
        }
      }
    }
  }
`);

/**
 * Mutation to update variantSelection on existing attribute assignments
 */
const updateAttributeAssignmentsMutation = graphql(`
  mutation UpdateAttributeAssignments(
    $productTypeId: ID!
    $operations: [ProductAttributeAssignmentUpdateInput!]!
  ) {
    productAttributeAssignmentUpdate(
      productTypeId: $productTypeId
      operations: $operations
    ) {
      productType {
        id
      }
      errors {
        message
      }
    }
  }
`);

/**
 * Input for assigning an attribute to a product type
 */
export interface AttributeAssignmentInput {
  /** The attribute ID */
  id: string;
  /** When true, use this attribute for variant selection in storefronts */
  variantSelection?: boolean;
}

export interface ProductTypeOperations {
  createProductType(input: ProductTypeInput): Promise<ProductType>;
  getProductTypeByName(name: string): Promise<ProductType | null | undefined>;
  assignAttributesToProductType(input: {
    attributes: AttributeAssignmentInput[];
    productTypeId: string;
    type: "PRODUCT" | "VARIANT";
  }): Promise<{ id: string }>;
  updateAttributeAssignments?(input: {
    productTypeId: string;
    operations: Array<{ id: string; variantSelection: boolean }>;
  }): Promise<{ id: string }>;
}

export class ProductTypeRepository implements ProductTypeOperations {
  constructor(private client: Client) {}

  async createProductType(input: ProductTypeInput) {
    const result = await this.client.mutation(createProductTypeMutation, {
      input,
    });

    if (!result.data?.productTypeCreate?.productType) {
      throw GraphQLError.fromGraphQLErrors(
        result.error?.graphQLErrors ?? [],
        `Failed to create product type ${input.name}`
      );
    }

    const productType = result.data.productTypeCreate.productType;

    logger.info("Product type created", {
      name: productType.name,
    });

    return productType;
  }

  async getProductTypeByName(name: string) {
    const result = await this.client.query(getProductTypeByNameQuery, {
      name,
    });

    // Find exact match among search results to prevent duplicate creation
    const exactMatch = result.data?.productTypes?.edges?.find((edge) => edge.node?.name === name);

    return exactMatch?.node;
  }

  async assignAttributesToProductType({
    attributes,
    productTypeId,
    type,
  }: {
    attributes: AttributeAssignmentInput[];
    productTypeId: string;
    type: "PRODUCT" | "VARIANT";
  }) {
    const result = await this.client.mutation(assignAttributesToProductTypeMutation, {
      productTypeId,
      operations: attributes.map((attr) => ({
        id: attr.id,
        type,
        // Only include variantSelection for VARIANT type when explicitly true
        ...(type === "VARIANT" && attr.variantSelection && { variantSelection: true }),
      })),
    });

    if (!result.data?.productAttributeAssign?.productType) {
      throw GraphQLError.fromDataErrors(
        `Failed to assign attributes to product type ${productTypeId}`,
        result.data?.productAttributeAssign?.errors ?? []
      );
    }

    return result.data?.productAttributeAssign?.productType;
  }

  async updateAttributeAssignments({
    productTypeId,
    operations,
  }: {
    productTypeId: string;
    operations: Array<{ id: string; variantSelection: boolean }>;
  }) {
    const result = await this.client.mutation(updateAttributeAssignmentsMutation, {
      productTypeId,
      operations,
    });

    if (!result.data?.productAttributeAssignmentUpdate?.productType) {
      throw GraphQLError.fromDataErrors(
        `Failed to update attribute assignments for product type ${productTypeId}`,
        result.data?.productAttributeAssignmentUpdate?.errors ?? []
      );
    }

    return result.data?.productAttributeAssignmentUpdate?.productType;
  }
}
