import type { Client } from "@urql/core";
import { graphql, type VariablesOf, type ResultOf } from "gql.tada";

const createAttributeMutation = graphql(`
  mutation CreateAttribute($input: AttributeCreateInput!) {
    attributeCreate(input: $input) {
      attribute {
        id
        name
      }
    }
  }
`);

type AttributeCreateInput = VariablesOf<
  typeof createAttributeMutation
>["input"];

const getAttributesByNamesQuery = graphql(`
  query GetAttributesByNames($names: [String!]!) {
    attributes(first: 100, where: { name: { oneOf: $names } }) {
      edges {
        node {
          id
          name
        }
      }
    }
  }
`);

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
      }
    }
  }
`);

export type ProductType = NonNullable<
  NonNullable<
    ResultOf<typeof createProductTypeMutation>["productTypeCreate"]
  >["productType"]
>;

type ProductTypeInput = VariablesOf<typeof createProductTypeMutation>["input"];

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
    }
  }
`);

const getProductTypeByNameQuery = graphql(`
  query GetProductTypeByName($name: String!) {
    productTypes(filter: { search: $name }, first: 1) {
      edges {
        node {
          id
          name
          productAttributes {
            id
            name
          }
        }
      }
    }
  }
`);

/**
 * @description Interacting with the Saleor API.
 */
export class SaleorClient {
  constructor(private client: Client) {}

  async createAttribute(attributeInput: AttributeCreateInput) {
    const result = await this.client.mutation(createAttributeMutation, {
      input: attributeInput,
    });

    if (!result.data?.attributeCreate?.attribute) {
      throw new Error("Failed to create attribute", result.error);
    }

    return result.data?.attributeCreate?.attribute;
  }

  async getAttributesByNames(names: string[]) {
    const result = await this.client.query(getAttributesByNamesQuery, {
      names,
    });

    return result.data?.attributes?.edges?.map((edge) => edge.node);
  }

  async assignAttributesToProductType({
    attributeIds,
    productTypeId,
  }: {
    attributeIds: string[];
    productTypeId: string;
  }) {
    const result = await this.client.mutation(
      assignAttributesToProductTypeMutation,
      {
        productTypeId,
        operations: attributeIds.map((id) => ({
          id,
          type: "PRODUCT" as const,
          variantSelection: false,
        })),
      }
    );

    if (!result.data?.productAttributeAssign?.productType) {
      throw new Error(
        "Failed to assign attributes to product type",
        result.error
      );
    }

    return result.data?.productAttributeAssign?.productType;
  }

  async createProductType(productTypeInput: ProductTypeInput) {
    const result = await this.client.mutation(createProductTypeMutation, {
      input: productTypeInput,
    });

    if (!result.data?.productTypeCreate?.productType) {
      throw new Error("Failed to create product type", result.error);
    }

    return result.data?.productTypeCreate?.productType;
  }

  async getProductTypeByName(name: string) {
    const result = await this.client.query(getProductTypeByNameQuery, {
      name,
    });

    const productType = result.data?.productTypes?.edges?.[0]?.node;

    return productType;
  }
}
