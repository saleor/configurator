import { object } from "../../lib/utils/object";
import type { SaleorConfig } from "../config/schema";
import type { ChannelOperations } from "./repository";

type ChannelInput = NonNullable<SaleorConfig["channels"]>[number];

export class ChannelService {
  constructor(private repository: ChannelOperations) {}

  private async getExistingChannel(name: string) {
    const channels = await this.repository.getChannels();
    return channels?.find((channel) => channel.name === name);
  }

  async getOrCreate(input: ChannelInput) {
    const existingChannel = await this.getExistingChannel(input.name);
    if (existingChannel) {
      return this.updateChannel(existingChannel.id, input);
    }

    return this.repository.createChannel({
      name: input.name,
      slug: input.slug,
      currencyCode: input.currencyCode,
      defaultCountry: input.defaultCountry,
    });
  }

  private async updateChannel(id: string, input: ChannelInput) {
    const settings = input.settings ?? {};

    const updateInput = object.filterUndefinedValues({
      name: input.name,
      slug: input.slug,
      defaultCountry: input.defaultCountry,
      orderSettings:
        Object.keys(settings).length > 0
          ? object.filterUndefinedValues({
              automaticallyConfirmAllNewOrders:
                settings.automaticallyConfirmAllNewOrders,
              automaticallyFulfillNonShippableGiftCard:
                settings.automaticallyFulfillNonShippableGiftCard,
              expireOrdersAfter: settings.expireOrdersAfter?.toString(),
              deleteExpiredOrdersAfter:
                settings.deleteExpiredOrdersAfter?.toString(),
              markAsPaidStrategy: settings.markAsPaidStrategy,
              allowUnpaidOrders: settings.allowUnpaidOrders,
              includeDraftOrderInVoucherUsage:
                settings.includeDraftOrderInVoucherUsage,
            })
          : undefined,
      checkoutSettings:
        Object.keys(settings).length > 0
          ? object.filterUndefinedValues({
              useLegacyErrorFlow: settings.useLegacyErrorFlow,
              automaticallyCompleteFullyPaidCheckouts:
                settings.automaticallyCompleteFullyPaidCheckouts,
            })
          : undefined,
      paymentSettings: settings.defaultTransactionFlowStrategy
        ? {
            defaultTransactionFlowStrategy:
              settings.defaultTransactionFlowStrategy,
          }
        : undefined,
      stockSettings: settings.allocationStrategy
        ? { allocationStrategy: settings.allocationStrategy }
        : undefined,
    });

    return this.repository.updateChannel(id, updateInput);
  }

  async bootstrapChannels(inputs: ChannelInput[]) {
    return Promise.all(inputs.map((input) => this.getOrCreate(input)));
  }
}
