import type { ChannelInput } from "../configurator";
import type { Channel, SaleorClient } from "../saleor-client";

export class ChannelBootstraper {
  private channels: Channel[] | null = null;

  constructor(private client: SaleorClient) {}

  private async getOrCreateChannel(input: ChannelInput) {
    const channels = this.channels ?? (await this.client.getChannels());

    if (!channels) {
      throw new Error("Failed to get channels");
    }

    const channel = channels.find((channel) => channel.name === input.name);

    if (!channel) {
      console.log("Channel not found, creating...");
      const createdChannel = await this.client.createChannel({
        name: input.name,
        currencyCode: input.currencyCode,
        defaultCountry: input.defaultCountry,
        slug: input.slug,
      });

      console.log("Channel created");

      return createdChannel;
    }

    console.log("Channel already exists", channel);

    return channel;
  }

  async bootstrapChannel(input: ChannelInput) {
    const channel = await this.getOrCreateChannel(input);

    return channel;
  }
}
