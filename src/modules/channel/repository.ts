import type { Client } from "@urql/core";
import { graphql, type VariablesOf, type ResultOf } from "gql.tada";
import { logger } from "../../lib/logger";

const createChannelMutation = graphql(`
  mutation CreateChannel($input: ChannelCreateInput!) {
    channelCreate(input: $input) {
      channel {
        id
        name
        slug
        isActive
      }
    }
  }
`);

export type ChannelCreateInput = VariablesOf<
  typeof createChannelMutation
>["input"];

const getChannelsQuery = graphql(`
  query GetChannels {
    channels {
      id
      name
    }
  }
`);

export type Channel = NonNullable<
  ResultOf<typeof getChannelsQuery>["channels"]
>[number];

const updateChannelMutation = graphql(`
  mutation UpdateChannel($id: ID!, $input: ChannelUpdateInput!) {
    channelUpdate(id: $id, input: $input) {
      channel {
        id
        name
        slug
        currencyCode
        defaultCountry {
          code
        }
      }
      errors {
        field
        message
      }
    }
  }
`);

type ChannelUpdateInput = VariablesOf<typeof updateChannelMutation>["input"];

export interface ChannelOperations {
  createChannel(input: ChannelCreateInput): Promise<Channel>;
  getChannels(): Promise<Channel[] | null | undefined>;
  updateChannel(
    id: string,
    input: ChannelUpdateInput
  ): Promise<Channel | null | undefined>;
}

export class ChannelRepository implements ChannelOperations {
  constructor(private client: Client) {}

  async createChannel(input: ChannelCreateInput) {
    const result = await this.client.mutation(createChannelMutation, {
      input,
    });

    if (!result.data?.channelCreate?.channel) {
      throw new Error("Failed to create channel", result.error);
    }

    const channel = result.data.channelCreate.channel;

    logger.info("Channel created", { channel });

    return channel;
  }

  async getChannels() {
    const result = await this.client.query(getChannelsQuery, {});
    return result.data?.channels;
  }

  async updateChannel(id: string, input: ChannelUpdateInput) {
    const result = await this.client.mutation(updateChannelMutation, {
      id,
      input,
    });

    if (result.error) {
      throw new Error(`Failed to update channel: ${result.error.message}`);
    }

    if (result.data?.channelUpdate?.errors.length) {
      throw new Error(
        `Failed to update channel: ${result.data.channelUpdate.errors
          .map((e) => e.message)
          .join(", ")}`
      );
    }

    return result.data?.channelUpdate?.channel;
  }
}
