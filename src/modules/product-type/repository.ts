import type { Client } from "@urql/core";
import { graphql, type VariablesOf, type ResultOf } from "gql.tada";
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
      }
    }
  }
`);

export type ProductType = NonNullable<
  NonNullable<
    ResultOf<typeof createProductTypeMutation>["productTypeCreate"]
  >["productType"]
>;
export type ProductTypeInput = VariablesOf<
  typeof createProductTypeMutation
>["input"];

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

export interface ProductTypeOperations {
  createProductType(input: ProductTypeInput): Promise<ProductType>;
  getProductTypeByName(name: string): Promise<ProductType | null | undefined>;
  assignAttributesToProductType(input: {
    attributeIds: string[];
    productTypeId: string;
  }): Promise<{ id: string }>;
}

export class ProductTypeRepository implements ProductTypeOperations {
  constructor(private client: Client) {}

  async createProductType(input: ProductTypeInput) {
    const result = await this.client.mutation(createProductTypeMutation, {
      input,
    });

    if (!result.data?.productTypeCreate?.productType) {
      throw new Error("Failed to create product type", result.error);
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

    return result.data?.productTypes?.edges?.[0]?.node;
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
        })),
      }
    );

    if (!result.data?.productAttributeAssign?.productType) {
      console.log(result.data?.productAttributeAssign?.errors);
      throw new Error(
        "Failed to assign attributes to product type",
        result.error
      );
    }

    return result.data?.productAttributeAssign?.productType;
  }
}
