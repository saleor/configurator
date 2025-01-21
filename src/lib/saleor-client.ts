import type { Client } from "@urql/core";
import { graphql, type VariablesOf } from "gql.tada";

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

const createProductTypeMutation = graphql(`
  mutation CreateProductType($input: ProductTypeInput!) {
    productTypeCreate(input: $input) {
      productType {
        id
        name
      }
    }
  }
`);

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
}
