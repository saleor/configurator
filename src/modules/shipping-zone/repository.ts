import type { Client } from "@urql/core";
import { graphql, type ResultOf, type VariablesOf } from "gql.tada";
import { GraphQLError } from "../../lib/errors/graphql";
import { logger } from "../../lib/logger";

const getShippingZonesQuery = graphql(`
  query GetShippingZones($channel: String) {
    shippingZones(first: 100, channel: $channel) {
      edges {
        node {
          id
          name
          default
          description
          countries {
            code
            country
          }
          channels {
            id
            slug
            name
          }
          warehouses {
            id
            name
            slug
          }
          shippingMethods {
            id
            name
            description
            type
            maximumDeliveryDays
            minimumDeliveryDays
            maximumOrderWeight {
              unit
              value
            }
            minimumOrderWeight {
              unit
              value
            }
            channelListings {
              channel {
                slug
              }
              price {
                amount
                currency
              }
              maximumOrderPrice {
                amount
                currency
              }
              minimumOrderPrice {
                amount
                currency
              }
            }
            postalCodeRules {
              id
              start
              end
              inclusionType
            }
            excludedProducts(first: 100) {
              edges {
                node {
                  id
                  slug
                }
              }
            }
          }
        }
      }
    }
  }
`);

const getShippingZoneQuery = graphql(`
  query GetShippingZone($id: ID!, $channel: String) {
    shippingZone(id: $id, channel: $channel) {
      id
      name
      default
      description
      countries {
        code
        country
      }
      channels {
        id
        slug
        name
      }
      warehouses {
        id
        name
        slug
      }
      shippingMethods {
        id
        name
        description
        type
        maximumDeliveryDays
        minimumDeliveryDays
        maximumOrderWeight {
          unit
          value
        }
        minimumOrderWeight {
          unit
          value
        }
        channelListings {
          channel {
            slug
          }
          price {
            amount
            currency
          }
          maximumOrderPrice {
            amount
            currency
          }
          minimumOrderPrice {
            amount
            currency
          }
        }
        postalCodeRules {
          id
          start
          end
          inclusionType
        }
        excludedProducts(first: 100) {
          edges {
            node {
              id
              slug
            }
          }
        }
      }
    }
  }
`);

const createShippingZoneMutation = graphql(`
  mutation CreateShippingZone($input: ShippingZoneCreateInput!) {
    shippingZoneCreate(input: $input) {
      shippingZone {
        id
        name
        default
        description
        countries {
          code
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

const updateShippingZoneMutation = graphql(`
  mutation UpdateShippingZone($id: ID!, $input: ShippingZoneUpdateInput!) {
    shippingZoneUpdate(id: $id, input: $input) {
      shippingZone {
        id
        name
        default
        description
        countries {
          code
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

const createShippingPriceMutation = graphql(`
  mutation CreateShippingPrice($input: ShippingPriceInput!) {
    shippingPriceCreate(input: $input) {
      shippingMethod {
        id
        name
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

const updateShippingPriceMutation = graphql(`
  mutation UpdateShippingPrice($id: ID!, $input: ShippingPriceInput!) {
    shippingPriceUpdate(id: $id, input: $input) {
      shippingMethod {
        id
        name
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

const deleteShippingPriceMutation = graphql(`
  mutation DeleteShippingPrice($id: ID!) {
    shippingPriceDelete(id: $id) {
      shippingMethod {
        id
        name
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

const shippingMethodChannelListingUpdateMutation = graphql(`
  mutation ShippingMethodChannelListingUpdate($id: ID!, $input: ShippingMethodChannelListingInput!) {
    shippingMethodChannelListingUpdate(id: $id, input: $input) {
      shippingMethod {
        id
        name
        channelListings {
          channel {
            slug
          }
          price {
            amount
            currency
          }
          maximumOrderPrice {
            amount
            currency
          }
          minimumOrderPrice {
            amount
            currency
          }
        }
      }
      errors {
        field
        message
        code
        channels
      }
    }
  }
`);

export type ShippingZone = NonNullable<
  NonNullable<ResultOf<typeof getShippingZonesQuery>["shippingZones"]>["edges"][number]["node"]
>;

export type ShippingMethod = ShippingZone["shippingMethods"][number];

export type ShippingZoneCreateInput = VariablesOf<typeof createShippingZoneMutation>["input"];
export type ShippingZoneUpdateInput = VariablesOf<typeof updateShippingZoneMutation>["input"];
export type ShippingPriceInput = VariablesOf<typeof createShippingPriceMutation>["input"];
export type ShippingMethodChannelListingInput = VariablesOf<
  typeof shippingMethodChannelListingUpdateMutation
>["input"];

export interface ShippingZoneOperations {
  getShippingZones(channel?: string): Promise<ShippingZone[]>;
  getShippingZone(id: string, channel?: string): Promise<ShippingZone | null>;
  createShippingZone(input: ShippingZoneCreateInput): Promise<ShippingZone>;
  updateShippingZone(id: string, input: ShippingZoneUpdateInput): Promise<ShippingZone>;
  createShippingMethod(input: ShippingPriceInput): Promise<ShippingMethod>;
  updateShippingMethod(id: string, input: ShippingPriceInput): Promise<ShippingMethod>;
  deleteShippingMethod(id: string): Promise<void>;
  updateShippingMethodChannelListing(
    id: string,
    input: ShippingMethodChannelListingInput
  ): Promise<ShippingMethod>;
}

export class ShippingZoneRepository implements ShippingZoneOperations {
  constructor(private client: Client) {}

  async getShippingZones(channel?: string): Promise<ShippingZone[]> {
    const result = await this.client.query(getShippingZonesQuery, { channel });

    if (result.error) {
      throw GraphQLError.fromCombinedError(result.error, "Failed to fetch shipping zones");
    }

    return result.data?.shippingZones?.edges.map((edge) => edge.node) ?? [];
  }

  async getShippingZone(id: string, channel?: string): Promise<ShippingZone | null> {
    const result = await this.client.query(getShippingZoneQuery, { id, channel });

    if (result.error) {
      throw GraphQLError.fromCombinedError(result.error, `Failed to fetch shipping zone ${id}`);
    }

    return result.data?.shippingZone ?? null;
  }

  async createShippingZone(input: ShippingZoneCreateInput): Promise<ShippingZone> {
    const result = await this.client.mutation(createShippingZoneMutation, { input });

    if (result.error) {
      throw GraphQLError.fromCombinedError(
        result.error,
        `Failed to create shipping zone ${input.name}`
      );
    }

    if (result.data?.shippingZoneCreate?.errors?.length) {
      throw GraphQLError.fromDataErrors(
        `Failed to create shipping zone ${input.name}`,
        result.data.shippingZoneCreate.errors
      );
    }

    if (!result.data?.shippingZoneCreate?.shippingZone) {
      throw new GraphQLError(
        `Failed to create shipping zone ${input.name}: No shipping zone returned`
      );
    }

    logger.info("Shipping zone created", {
      shippingZone: result.data.shippingZoneCreate.shippingZone,
    });

    return result.data.shippingZoneCreate.shippingZone;
  }

  async updateShippingZone(id: string, input: ShippingZoneUpdateInput): Promise<ShippingZone> {
    const result = await this.client.mutation(updateShippingZoneMutation, { id, input });

    if (result.error) {
      throw GraphQLError.fromCombinedError(
        result.error,
        `Failed to update shipping zone ${input.name || id}`
      );
    }

    if (result.data?.shippingZoneUpdate?.errors?.length) {
      throw GraphQLError.fromDataErrors(
        `Failed to update shipping zone ${input.name || id}`,
        result.data.shippingZoneUpdate.errors
      );
    }

    if (!result.data?.shippingZoneUpdate?.shippingZone) {
      throw new GraphQLError(
        `Failed to update shipping zone ${input.name || id}: No shipping zone returned`
      );
    }

    logger.info("Shipping zone updated", {
      shippingZone: result.data.shippingZoneUpdate.shippingZone,
    });

    return result.data.shippingZoneUpdate.shippingZone;
  }

  async createShippingMethod(input: ShippingPriceInput): Promise<ShippingMethod> {
    logger.debug("Creating shipping method with input", {
      name: input.name,
      type: input.type,
      shippingZone: input.shippingZone,
      input: JSON.stringify(input, null, 2),
    });

    const result = await this.client.mutation(createShippingPriceMutation, { input });

    if (result.error) {
      logger.error("GraphQL mutation error for shipping method creation", {
        name: input.name,
        error: result.error,
        errorMessage: result.error.message,
        graphQLErrors: result.error.graphQLErrors,
        networkError: result.error.networkError,
      });

      throw GraphQLError.fromCombinedError(
        result.error,
        `Failed to create shipping method ${input.name}`
      );
    }

    if (result.data?.shippingPriceCreate?.errors?.length) {
      logger.error("GraphQL data errors for shipping method creation", {
        name: input.name,
        errors: result.data.shippingPriceCreate.errors,
        fullResult: JSON.stringify(result.data, null, 2),
      });

      throw GraphQLError.fromDataErrors(
        `Failed to create shipping method ${input.name}`,
        result.data.shippingPriceCreate.errors
      );
    }

    if (!result.data?.shippingPriceCreate?.shippingMethod) {
      throw new GraphQLError(
        `Failed to create shipping method ${input.name}: No shipping method returned`
      );
    }

    logger.info("Shipping method created", {
      shippingMethod: result.data.shippingPriceCreate.shippingMethod,
    });

    return result.data.shippingPriceCreate.shippingMethod;
  }

  async updateShippingMethod(id: string, input: ShippingPriceInput): Promise<ShippingMethod> {
    const result = await this.client.mutation(updateShippingPriceMutation, { id, input });

    if (result.error) {
      throw GraphQLError.fromCombinedError(
        result.error,
        `Failed to update shipping method ${input.name || id}`
      );
    }

    if (result.data?.shippingPriceUpdate?.errors?.length) {
      throw GraphQLError.fromDataErrors(
        `Failed to update shipping method ${input.name || id}`,
        result.data.shippingPriceUpdate.errors
      );
    }

    if (!result.data?.shippingPriceUpdate?.shippingMethod) {
      throw new GraphQLError(
        `Failed to update shipping method ${input.name || id}: No shipping method returned`
      );
    }

    logger.info("Shipping method updated", {
      shippingMethod: result.data.shippingPriceUpdate.shippingMethod,
    });

    return result.data.shippingPriceUpdate.shippingMethod;
  }

  async deleteShippingMethod(id: string): Promise<void> {
    const result = await this.client.mutation(deleteShippingPriceMutation, { id });

    if (result.error) {
      throw GraphQLError.fromCombinedError(result.error, `Failed to delete shipping method ${id}`);
    }

    if (result.data?.shippingPriceDelete?.errors?.length) {
      throw GraphQLError.fromDataErrors(
        `Failed to delete shipping method ${id}`,
        result.data.shippingPriceDelete.errors
      );
    }

    logger.info("Shipping method deleted", { id });
  }

  async updateShippingMethodChannelListing(
    id: string,
    input: ShippingMethodChannelListingInput
  ): Promise<ShippingMethod> {
    const result = await this.client.mutation(shippingMethodChannelListingUpdateMutation, {
      id,
      input,
    });

    if (result.error) {
      throw GraphQLError.fromCombinedError(
        result.error,
        `Failed to update shipping method channel listing ${id}`
      );
    }

    if (result.data?.shippingMethodChannelListingUpdate?.errors?.length) {
      throw GraphQLError.fromDataErrors(
        `Failed to update shipping method channel listing ${id}`,
        result.data.shippingMethodChannelListingUpdate.errors
      );
    }

    if (!result.data?.shippingMethodChannelListingUpdate?.shippingMethod) {
      throw new GraphQLError(
        `Failed to update shipping method channel listing ${id}: No shipping method returned`
      );
    }

    logger.info("Shipping method channel listing updated", {
      shippingMethod: result.data.shippingMethodChannelListingUpdate.shippingMethod,
    });

    return result.data.shippingMethodChannelListingUpdate.shippingMethod;
  }
}
