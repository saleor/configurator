import type { ChannelInput } from "../config-schema";
import type {
  Channel,
  BootstrapClient,
  ChannelCreateInput,
} from "./bootstrap-client";

export class ChannelBootstraper {
  private channels: Channel[] | null = null;

  constructor(private client: BootstrapClient) {}

  private toChannelCreateInput(
    settings: ChannelInput["settings"]
  ): Partial<
    Pick<
      ChannelCreateInput,
      "checkoutSettings" | "paymentSettings" | "stockSettings" | "orderSettings"
    >
  > {
    return {
      checkoutSettings: {
        useLegacyErrorFlow: settings?.useLegacyErrorFlow,
        automaticallyCompleteFullyPaidCheckouts:
          settings?.automaticallyCompleteFullyPaidCheckouts,
      },
      paymentSettings: {
        defaultTransactionFlowStrategy:
          settings?.defaultTransactionFlowStrategy,
      },
      ...(settings?.allocationStrategy && {
        stockSettings: {
          allocationStrategy: settings.allocationStrategy,
        },
      }),
      orderSettings: {
        automaticallyConfirmAllNewOrders:
          settings?.automaticallyConfirmAllNewOrders,
        automaticallyFulfillNonShippableGiftCard:
          settings?.automaticallyFulfillNonShippableGiftCard,
        expireOrdersAfter: settings?.expireOrdersAfter,
        deleteExpiredOrdersAfter: settings?.deleteExpiredOrdersAfter,
        markAsPaidStrategy: settings?.markAsPaidStrategy,
        allowUnpaidOrders: settings?.allowUnpaidOrders,
        includeDraftOrderInVoucherUsage:
          settings?.includeDraftOrderInVoucherUsage,
      },
    };
  }

  private async getOrCreateChannel(input: ChannelInput) {
    const channels = this.channels ?? (await this.client.getChannels());

    if (!channels) {
      throw new Error("Failed to get channels");
    }

    const channel = channels.find((channel) => channel.name === input.name);
    const channelInput = {
      name: input.name,
      defaultCountry: input.defaultCountry,
      slug: input.slug,
      ...this.toChannelCreateInput(input.settings),
    };

    if (!channel) {
      console.log("Channel not found, creating...");
      const channelCreateInput = {
        ...channelInput,
        currencyCode: input.currencyCode,
      };
      const createdChannel =
        await this.client.createChannel(channelCreateInput);
      console.log("Channel created");
      return createdChannel;
    }

    console.log("Channel exists (id: ", channel.id, "), updating...");
    const updatedChannel = await this.client.updateChannel(
      channel.id,
      channelInput
    );
    console.log("Channel updated");
    return updatedChannel;
  }

  async bootstrapChannel(input: ChannelInput) {
    const channel = await this.getOrCreateChannel(input);

    return channel;
  }
}
