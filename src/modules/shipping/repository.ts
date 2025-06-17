import type { Client } from "@urql/core";
import { gql } from "@urql/core";

const GET_SHIPPING_ZONES = gql`
  query GetShippingZones {
    shippingZones(first: 100) {
      edges {
        node {
          id
          name
          description
          countries {
            code
            country
          }
          channels {
            id
            slug
          }
          shippingMethods {
            id
            name
            description
            type
            channelListings {
              channel {
                slug
              }
              minimumOrderPrice {
                amount
              }
              maximumOrderPrice {
                amount
              }
              price {
                amount
              }
            }
            maximumOrderWeight {
              value
              unit
            }
            minimumOrderWeight {
              value
              unit
            }
            postalCodeRules {
              id
              start
              end
              inclusionType
            }
          }
        }
      }
    }
  }
`;

const CREATE_SHIPPING_ZONE = gql`
  mutation CreateShippingZone($input: ShippingZoneCreateInput!) {
    shippingZoneCreate(input: $input) {
      shippingZone {
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
`;

const UPDATE_SHIPPING_ZONE = gql`
  mutation UpdateShippingZone($id: ID!, $input: ShippingZoneUpdateInput!) {
    shippingZoneUpdate(id: $id, input: $input) {
      shippingZone {
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
`;

const CREATE_SHIPPING_PRICE = gql`
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
`;

const UPDATE_SHIPPING_PRICE = gql`
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
`;

const CHANNEL_CREATE_SHIPPING_ZONE = gql`
  mutation ChannelCreateShippingZone($id: ID!, $input: ShippingZoneUpdateChannelsInput!) {
    shippingZoneChannelAssign(id: $id, input: $input) {
      shippingZone {
        id
        channels {
          slug
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

const POSTAL_CODE_RULE_CREATE = gql`
  mutation PostalCodeRuleCreate($shippingMethodId: ID!, $input: ShippingPostalCodeRulesCreateInputRange!) {
    shippingPriceExcludeProducts(id: $shippingMethodId, input: $input) {
      shippingMethod {
        id
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

interface ShippingZone {
  id: string;
  name: string;
  description?: string;
  countries: Array<{ code: string; country: string }>;
  channels: Array<{ id: string; slug: string }>;
  shippingMethods: ShippingMethod[];
}

interface ShippingMethod {
  id: string;
  name: string;
  description?: string;
  type: string;
  channelListings: any[];
  maximumOrderWeight?: { value: number; unit: string };
  minimumOrderWeight?: { value: number; unit: string };
  postalCodeRules?: any[];
}

export class ShippingRepository {
  constructor(private readonly client: Client) {}

  async getShippingZones(): Promise<ShippingZone[]> {
    const result = await this.client.query(GET_SHIPPING_ZONES, {}).toPromise();
    if (result.error) {
      throw new Error(`Failed to fetch shipping zones: ${result.error.message}`);
    }
    return result.data?.shippingZones.edges.map((edge: any) => edge.node) || [];
  }

  async createShippingZone(input: any): Promise<ShippingZone> {
    const result = await this.client
      .mutation(CREATE_SHIPPING_ZONE, { input })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to create shipping zone: ${result.error.message}`);
    }
    
    const { shippingZone, errors } = result.data?.shippingZoneCreate || {};
    if (errors?.length) {
      throw new Error(
        `Shipping zone creation failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return shippingZone;
  }

  async updateShippingZone(id: string, input: any): Promise<ShippingZone> {
    const result = await this.client
      .mutation(UPDATE_SHIPPING_ZONE, { id, input })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to update shipping zone: ${result.error.message}`);
    }
    
    const { shippingZone, errors } = result.data?.shippingZoneUpdate || {};
    if (errors?.length) {
      throw new Error(
        `Shipping zone update failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return shippingZone;
  }

  async createShippingMethod(input: any) {
    const result = await this.client
      .mutation(CREATE_SHIPPING_PRICE, { input })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to create shipping method: ${result.error.message}`);
    }
    
    const { shippingMethod, errors } = result.data?.shippingPriceCreate || {};
    if (errors?.length) {
      throw new Error(
        `Shipping method creation failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return shippingMethod;
  }

  async updateShippingMethod(id: string, input: any) {
    const result = await this.client
      .mutation(UPDATE_SHIPPING_PRICE, { id, input })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to update shipping method: ${result.error.message}`);
    }
    
    const { shippingMethod, errors } = result.data?.shippingPriceUpdate || {};
    if (errors?.length) {
      throw new Error(
        `Shipping method update failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return shippingMethod;
  }

  async assignChannelsToShippingZone(id: string, channelIds: string[]) {
    const result = await this.client
      .mutation(CHANNEL_CREATE_SHIPPING_ZONE, { 
        id, 
        input: { addChannels: channelIds } 
      })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to assign channels: ${result.error.message}`);
    }
    
    const { shippingZone, errors } = result.data?.shippingZoneChannelAssign || {};
    if (errors?.length) {
      throw new Error(
        `Channel assignment failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return shippingZone;
  }

  async createPostalCodeRule(shippingMethodId: string, rule: any) {
    const result = await this.client
      .mutation(POSTAL_CODE_RULE_CREATE, { shippingMethodId, input: rule })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to create postal code rule: ${result.error.message}`);
    }
    
    return result.data?.shippingPriceExcludeProducts?.shippingMethod;
  }
} 