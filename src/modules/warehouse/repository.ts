import type { Client } from "@urql/core";
import { graphql, type ResultOf, type VariablesOf } from "gql.tada";
import { GraphQLError } from "../../lib/errors/graphql";
import { logger } from "../../lib/logger";

const getWarehousesQuery = graphql(`
  query GetWarehouses {
    warehouses(first: 100) {
      edges {
        node {
          id
          name
          slug
          email
          isPrivate
          address {
            streetAddress1
            streetAddress2
            city
            cityArea
            postalCode
            country {
              code
              country
            }
            countryArea
            companyName
            phone
          }
          companyName
          clickAndCollectOption
          shippingZones(first: 100) {
            edges {
              node {
                id
                name
              }
            }
          }
        }
      }
    }
  }
`);

const getWarehouseQuery = graphql(`
  query GetWarehouse($id: ID!) {
    warehouse(id: $id) {
      id
      name
      slug
      email
      isPrivate
      address {
        streetAddress1
        streetAddress2
        city
        cityArea
        postalCode
        country {
          code
          country
        }
        countryArea
        companyName
        phone
      }
      companyName
      clickAndCollectOption
      shippingZones(first: 100) {
        edges {
          node {
            id
            name
          }
        }
      }
    }
  }
`);

const createWarehouseMutation = graphql(`
  mutation CreateWarehouse($input: WarehouseCreateInput!) {
    createWarehouse(input: $input) {
      warehouse {
        id
        name
        slug
        email
        isPrivate
        address {
          streetAddress1
          streetAddress2
          city
          cityArea
          postalCode
          country {
            code
            country
          }
          countryArea
          companyName
          phone
        }
        companyName
        clickAndCollectOption
        shippingZones(first: 100) {
          edges {
            node {
              id
              name
            }
          }
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
    updateWarehouse(id: $id, input: $input) {
      warehouse {
        id
        name
        slug
        email
        isPrivate
        address {
          streetAddress1
          streetAddress2
          city
          cityArea
          postalCode
          country {
            code
            country
          }
          countryArea
          companyName
          phone
        }
        companyName
        clickAndCollectOption
        shippingZones(first: 100) {
          edges {
            node {
              id
              name
            }
          }
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

const warehouseShippingZoneAssignMutation = graphql(`
  mutation WarehouseShippingZoneAssign($id: ID!, $shippingZoneIds: [ID!]!) {
    assignWarehouseShippingZone(id: $id, shippingZoneIds: $shippingZoneIds) {
      warehouse {
        id
        name
        slug
        email
        isPrivate
        address {
          streetAddress1
          streetAddress2
          city
          cityArea
          postalCode
          country {
            code
            country
          }
          countryArea
          companyName
          phone
        }
        companyName
        clickAndCollectOption
        shippingZones(first: 100) {
          edges {
            node {
              id
              name
            }
          }
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

const warehouseShippingZoneUnassignMutation = graphql(`
  mutation WarehouseShippingZoneUnassign($id: ID!, $shippingZoneIds: [ID!]!) {
    unassignWarehouseShippingZone(id: $id, shippingZoneIds: $shippingZoneIds) {
      warehouse {
        id
        name
        slug
        email
        isPrivate
        address {
          streetAddress1
          streetAddress2
          city
          cityArea
          postalCode
          country {
            code
            country
          }
          countryArea
          companyName
          phone
        }
        companyName
        clickAndCollectOption
        shippingZones(first: 100) {
          edges {
            node {
              id
              name
            }
          }
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

export type Warehouse = NonNullable<
  NonNullable<ResultOf<typeof getWarehousesQuery>["warehouses"]>["edges"][number]["node"]
>;

export type WarehouseCreateInput = VariablesOf<typeof createWarehouseMutation>["input"];
export type WarehouseUpdateInput = VariablesOf<typeof updateWarehouseMutation>["input"];

export interface WarehouseOperations {
  getWarehouses(): Promise<Warehouse[]>;
  getWarehouse(id: string): Promise<Warehouse | null>;
  createWarehouse(input: WarehouseCreateInput): Promise<Warehouse>;
  updateWarehouse(id: string, input: WarehouseUpdateInput): Promise<Warehouse>;
  assignShippingZones(warehouseId: string, shippingZoneIds: string[]): Promise<Warehouse>;
  unassignShippingZones(warehouseId: string, shippingZoneIds: string[]): Promise<Warehouse>;
}

export class WarehouseRepository implements WarehouseOperations {
  constructor(private client: Client) {}

  async getWarehouses(): Promise<Warehouse[]> {
    const result = await this.client.query(getWarehousesQuery, {});

    if (result.error) {
      throw GraphQLError.fromCombinedError("Failed to fetch warehouses", result.error);
    }

    return result.data?.warehouses?.edges.map((edge) => edge.node) ?? [];
  }

  async getWarehouse(id: string): Promise<Warehouse | null> {
    const result = await this.client.query(getWarehouseQuery, { id });

    if (result.error) {
      throw GraphQLError.fromCombinedError(`Failed to fetch warehouse ${id}`, result.error);
    }

    return result.data?.warehouse ?? null;
  }

  async createWarehouse(input: WarehouseCreateInput): Promise<Warehouse> {
    const result = await this.client.mutation(createWarehouseMutation, { input });

    if (result.error) {
      throw GraphQLError.fromCombinedError(
        `Failed to create warehouse ${input.name}`,
        result.error
      );
    }

    if (result.data?.createWarehouse?.errors?.length) {
      throw GraphQLError.fromDataErrors(
        `Failed to create warehouse ${input.name}`,
        result.data.createWarehouse.errors
      );
    }

    if (!result.data?.createWarehouse?.warehouse) {
      throw new GraphQLError(`Failed to create warehouse ${input.name}: No warehouse returned`);
    }

    logger.info("Warehouse created", { warehouse: result.data.createWarehouse.warehouse });

    return result.data.createWarehouse.warehouse;
  }

  async updateWarehouse(id: string, input: WarehouseUpdateInput): Promise<Warehouse> {
    logger.debug("Executing warehouse update mutation", {
      id,
      input: JSON.stringify(input, null, 2),
    });

    const result = await this.client.mutation(updateWarehouseMutation, { id, input });

    if (result.error) {
      logger.error("GraphQL error in warehouse update", {
        id,
        error: result.error,
        input: JSON.stringify(input, null, 2),
      });
      throw GraphQLError.fromCombinedError(
        `Failed to update warehouse ${input.name || id}`,
        result.error
      );
    }

    if (result.data?.updateWarehouse?.errors?.length) {
      throw GraphQLError.fromDataErrors(
        `Failed to update warehouse ${input.name || id}`,
        result.data.updateWarehouse.errors
      );
    }

    if (!result.data?.updateWarehouse?.warehouse) {
      throw new GraphQLError(
        `Failed to update warehouse ${input.name || id}: No warehouse returned`
      );
    }

    logger.info("Warehouse updated", { warehouse: result.data.updateWarehouse.warehouse });

    return result.data.updateWarehouse.warehouse;
  }

  async assignShippingZones(warehouseId: string, shippingZoneIds: string[]): Promise<Warehouse> {
    const result = await this.client.mutation(warehouseShippingZoneAssignMutation, {
      id: warehouseId,
      shippingZoneIds,
    });

    if (result.error) {
      throw GraphQLError.fromCombinedError(
        `Failed to assign shipping zones to warehouse ${warehouseId}`,
        result.error
      );
    }

    if (result.data?.assignWarehouseShippingZone?.errors?.length) {
      throw GraphQLError.fromDataErrors(
        `Failed to assign shipping zones to warehouse ${warehouseId}`,
        result.data.assignWarehouseShippingZone.errors
      );
    }

    if (!result.data?.assignWarehouseShippingZone?.warehouse) {
      throw new GraphQLError(
        `Failed to assign shipping zones to warehouse ${warehouseId}: No warehouse returned`
      );
    }

    logger.info("Shipping zones assigned to warehouse", {
      warehouseId,
      shippingZoneIds,
    });

    return result.data.assignWarehouseShippingZone.warehouse as Warehouse;
  }

  async unassignShippingZones(warehouseId: string, shippingZoneIds: string[]): Promise<Warehouse> {
    const result = await this.client.mutation(warehouseShippingZoneUnassignMutation, {
      id: warehouseId,
      shippingZoneIds,
    });

    if (result.error) {
      throw GraphQLError.fromCombinedError(
        `Failed to unassign shipping zones from warehouse ${warehouseId}`,
        result.error
      );
    }

    if (result.data?.unassignWarehouseShippingZone?.errors?.length) {
      throw GraphQLError.fromDataErrors(
        `Failed to unassign shipping zones from warehouse ${warehouseId}`,
        result.data.unassignWarehouseShippingZone.errors
      );
    }

    if (!result.data?.unassignWarehouseShippingZone?.warehouse) {
      throw new GraphQLError(
        `Failed to unassign shipping zones from warehouse ${warehouseId}: No warehouse returned`
      );
    }

    logger.info("Shipping zones unassigned from warehouse", {
      warehouseId,
      shippingZoneIds,
    });

    return result.data.unassignWarehouseShippingZone.warehouse as Warehouse;
  }
}
