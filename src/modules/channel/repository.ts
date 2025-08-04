import type { Client } from "@urql/core";
import { graphql, type ResultOf, type VariablesOf } from "gql.tada";
import { GraphQLError } from "../../lib/errors/graphql";
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

export type ChannelCreateInput = VariablesOf<typeof createChannelMutation>["input"];

const getChannelsQuery = graphql(`
  query GetChannels {
    channels {
      id
      name
      slug
    }
  }
`);

export type Channel = NonNullable<ResultOf<typeof getChannelsQuery>["channels"]>[number];

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
  updateChannel(id: string, input: ChannelUpdateInput): Promise<Channel | null | undefined>;
}

export class ChannelRepository implements ChannelOperations {
  constructor(private client: Client) {}

  async createChannel(input: ChannelCreateInput) {
    const result = await this.client.mutation(createChannelMutation, {
      input,
    });

    if (!result.data?.channelCreate?.channel) {
      throw GraphQLError.fromGraphQLErrors(
        result.error?.graphQLErrors ?? [],
        `Failed to create channel ${input.name}`
      );
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
      throw GraphQLError.fromGraphQLErrors(
        result.error?.graphQLErrors ?? [],
        `Failed to update channel ${input.name}`
      );
    }

    if (result.data?.channelUpdate?.errors.length) {
      throw GraphQLError.fromDataErrors(
        `Failed to update channel ${input.name}`,
        result.data.channelUpdate.errors
      );
    }

    return result.data?.channelUpdate?.channel;
  }
}
