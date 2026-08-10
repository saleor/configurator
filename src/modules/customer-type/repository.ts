import type { Client, CombinedError } from "@urql/core";
import { graphql, type ResultOf, type VariablesOf } from "gql.tada";
import { GraphQLError } from "../../lib/errors/graphql";
import { logger } from "../../lib/logger";

// The selection set is repeated per operation: gql.tada infers types from string
// literals, and this codebase does not use fragment masking anywhere else.
const getCustomerTypesQuery = graphql(`
  query GetCustomerTypes($first: Int!, $after: String) {
    customerTypes(first: $first, after: $after) {
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          id
          name
          slug
          isDefault
          attributes {
            id
            name
          }
        }
      }
    }
  }
`);

const createCustomerTypeMutation = graphql(`
  mutation CreateCustomerType($input: CustomerTypeCreateInput!) {
    customerTypeCreate(input: $input) {
      customerType {
        id
        name
        slug
        isDefault
        attributes {
          id
          name
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

const updateCustomerTypeMutation = graphql(`
  mutation UpdateCustomerType($id: ID!, $input: CustomerTypeUpdateInput!) {
    customerTypeUpdate(id: $id, input: $input) {
      customerType {
        id
        name
        slug
        isDefault
        attributes {
          id
          name
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

const assignCustomerTypeAttributesMutation = graphql(`
  mutation CustomerTypeAssignAttributes($customerTypeId: ID!, $attributeIds: [ID!]!) {
    customerTypeAssignAttributes(customerTypeId: $customerTypeId, attributeIds: $attributeIds) {
      customerType {
        id
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

export type CustomerType = NonNullable<
  NonNullable<ResultOf<typeof getCustomerTypesQuery>["customerTypes"]>["edges"][number]["node"]
>;

export type CustomerTypeCreateInput = VariablesOf<typeof createCustomerTypeMutation>["input"];
export type CustomerTypeUpdateInput = VariablesOf<typeof updateCustomerTypeMutation>["input"];

export interface CustomerTypeOperations {
  getCustomerTypes(): Promise<CustomerType[]>;
  createCustomerType(input: CustomerTypeCreateInput): Promise<CustomerType>;
  updateCustomerType(id: string, input: CustomerTypeUpdateInput): Promise<CustomerType>;
  assignAttributes(customerTypeId: string, attributeIds: string[]): Promise<{ id: string }>;
}

export class CustomerTypeRepository implements CustomerTypeOperations {
  constructor(private client: Client) {}

  async getCustomerTypes(): Promise<CustomerType[]> {
    const customerTypes: CustomerType[] = [];
    let after: string | null = null;

    for (;;) {
      // Explicit annotation: inference would be circular through the `after` cursor.
      const result: {
        error?: CombinedError;
        data?: ResultOf<typeof getCustomerTypesQuery>;
      } = await this.client.query(getCustomerTypesQuery, { first: 100, after });

      if (result.error) {
        throw GraphQLError.fromCombinedError("Failed to fetch customer types", result.error);
      }

      const page = result.data?.customerTypes;
      customerTypes.push(...(page?.edges.map((edge) => edge.node) ?? []));

      if (!page?.pageInfo?.hasNextPage) break;
      after = page.pageInfo.endCursor ?? null;
    }

    return customerTypes;
  }

  async createCustomerType(input: CustomerTypeCreateInput): Promise<CustomerType> {
    const result = await this.client.mutation(createCustomerTypeMutation, { input });

    if (result.error) {
      throw GraphQLError.fromCombinedError(
        `Failed to create customer type ${input.name}`,
        result.error
      );
    }

    if (result.data?.customerTypeCreate?.errors?.length) {
      throw GraphQLError.fromDataErrors(
        `Failed to create customer type ${input.name}`,
        result.data.customerTypeCreate.errors
      );
    }

    if (!result.data?.customerTypeCreate?.customerType) {
      throw new GraphQLError(
        `Failed to create customer type ${input.name}: No customer type returned`
      );
    }

    logger.info("Customer type created", {
      customerType: result.data.customerTypeCreate.customerType,
    });

    return result.data.customerTypeCreate.customerType;
  }

  async updateCustomerType(id: string, input: CustomerTypeUpdateInput): Promise<CustomerType> {
    const result = await this.client.mutation(updateCustomerTypeMutation, { id, input });

    if (result.error) {
      throw GraphQLError.fromCombinedError(
        `Failed to update customer type ${input.name || id}`,
        result.error
      );
    }

    if (result.data?.customerTypeUpdate?.errors?.length) {
      throw GraphQLError.fromDataErrors(
        `Failed to update customer type ${input.name || id}`,
        result.data.customerTypeUpdate.errors
      );
    }

    if (!result.data?.customerTypeUpdate?.customerType) {
      throw new GraphQLError(
        `Failed to update customer type ${input.name || id}: No customer type returned`
      );
    }

    logger.info("Customer type updated", {
      customerType: result.data.customerTypeUpdate.customerType,
    });

    return result.data.customerTypeUpdate.customerType;
  }

  async assignAttributes(customerTypeId: string, attributeIds: string[]): Promise<{ id: string }> {
    const result = await this.client.mutation(assignCustomerTypeAttributesMutation, {
      customerTypeId,
      attributeIds,
    });

    if (result.error) {
      throw GraphQLError.fromCombinedError(
        `Failed to assign attributes to customer type ${customerTypeId}`,
        result.error
      );
    }

    if (result.data?.customerTypeAssignAttributes?.errors?.length) {
      throw GraphQLError.fromDataErrors(
        `Failed to assign attributes to customer type ${customerTypeId}`,
        result.data.customerTypeAssignAttributes.errors
      );
    }

    const customerType = result.data?.customerTypeAssignAttributes?.customerType;
    if (!customerType) {
      throw new GraphQLError(
        `Failed to assign attributes to customer type ${customerTypeId}: No customer type returned`
      );
    }

    logger.debug("Attributes assigned to customer type", { customerTypeId, attributeIds });

    return customerType;
  }
}
