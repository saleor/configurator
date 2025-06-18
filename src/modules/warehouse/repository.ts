import type { Client } from "@urql/core";
import { graphql, type VariablesOf, type ResultOf } from "gql.tada";
import { logger } from "../../lib/logger";

const createWarehouseMutation = graphql(`
  mutation CreateWarehouse($input: WarehouseCreateInput!) {
    warehouseCreate(input: $input) {
      warehouse {
        id
        name
        slug
        email
        address {
          streetAddress1
          streetAddress2
          city
          cityArea
          postalCode
          country {
            code
          }
          countryArea
          phone
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

const updateWarehouseMutation = graphql(`
  mutation UpdateWarehouse($id: ID!, $input: WarehouseUpdateInput!) {
    warehouseUpdate(id: $id, input: $input) {
      warehouse {
        id
        name
        slug
        email
        address {
          streetAddress1
          streetAddress2
          city
          cityArea
          postalCode
          country {
            code
          }
          countryArea
          phone
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

const getWarehouseBySlugQuery = graphql(`
  query GetWarehouseBySlug($slug: String!) {
    warehouses(filter: { slugs: [$slug] }, first: 1) {
      edges {
        node {
          id
          name
          slug
          email
          address {
            streetAddress1
            streetAddress2
            city
            cityArea
            postalCode
            country {
              code
            }
            countryArea
            phone
          }
        }
      }
    }
  }
`);

export type Warehouse = NonNullable<
  NonNullable<
    ResultOf<typeof createWarehouseMutation>["warehouseCreate"]
  >["warehouse"]
>;

export type WarehouseCreateInput = VariablesOf<
  typeof createWarehouseMutation
>["input"];

export type WarehouseUpdateInput = VariablesOf<
  typeof updateWarehouseMutation
>["input"];

export interface WarehouseOperations {
  createWarehouse(input: WarehouseCreateInput): Promise<Warehouse>;
  updateWarehouse(id: string, input: WarehouseUpdateInput): Promise<Warehouse>;
  getWarehouseBySlug(slug: string): Promise<Warehouse | null | undefined>;
}

export class WarehouseRepository implements WarehouseOperations {
  constructor(private client: Client) {}

  async createWarehouse(input: WarehouseCreateInput): Promise<Warehouse> {
    const result = await this.client.mutation(createWarehouseMutation, {
      input,
    });

    if (result.error) {
      throw new Error(
        `Failed to create warehouse: ${result.error.message}`
      );
    }

    if (result.data?.warehouseCreate?.errors?.length) {
      throw new Error(
        `Failed to create warehouse: ${result.data.warehouseCreate.errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }

    const warehouse = result.data?.warehouseCreate?.warehouse;
    if (!warehouse) {
      throw new Error("Failed to create warehouse: no data returned");
    }

    logger.info(`Warehouse created: ${warehouse.name} (${warehouse.slug})`);
    return warehouse;
  }

  async updateWarehouse(
    id: string,
    input: WarehouseUpdateInput
  ): Promise<Warehouse> {
    const result = await this.client.mutation(updateWarehouseMutation, {
      id,
      input,
    });

    if (result.error) {
      throw new Error(
        `Failed to update warehouse: ${result.error.message}`
      );
    }

    if (result.data?.warehouseUpdate?.errors?.length) {
      throw new Error(
        `Failed to update warehouse: ${result.data.warehouseUpdate.errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }

    const warehouse = result.data?.warehouseUpdate?.warehouse;
    if (!warehouse) {
      throw new Error("Failed to update warehouse: no data returned");
    }

    logger.info(`Warehouse updated: ${warehouse.name} (${warehouse.slug})`);
    return warehouse;
  }

  async getWarehouseBySlug(slug: string): Promise<Warehouse | null | undefined> {
    const result = await this.client.query(getWarehouseBySlugQuery, { slug });

    if (result.error) {
      throw new Error(
        `Failed to fetch warehouse by slug: ${result.error.message}`
      );
    }

    return result.data?.warehouses?.edges[0]?.node;
  }
} 