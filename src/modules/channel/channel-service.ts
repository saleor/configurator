import { object } from "../../lib/utils/object";
import type { SaleorConfig } from "../config/schema";
import type { ChannelOperations } from "./repository";
import { logger } from "../../lib/logger";

type ChannelInput = NonNullable<SaleorConfig["channels"]>[number];

export class ChannelService {
  constructor(private repository: ChannelOperations) {}

  private async getExistingChannel(name: string) {
    logger.debug("Looking up existing channel", { name });
    const channels = await this.repository.getChannels();
    const existingChannel = channels?.find((channel) => channel.name === name);

    if (existingChannel) {
      logger.debug("Found existing channel", {
        id: existingChannel.id,
        name: existingChannel.name,
      });
    } else {
      logger.debug("Channel not found", { name });
    }

    return existingChannel;
  }

  async getOrCreate(input: ChannelInput) {
    logger.debug("Getting or creating channel", { name: input.name });
    const existingChannel = await this.getExistingChannel(input.name);

    if (existingChannel) {
      logger.debug("Updating existing channel", {
        id: existingChannel.id,
        name: input.name,
      });
      return this.updateChannel(existingChannel.id, input);
    }

    logger.debug("Creating new channel", { name: input.name });
    try {
      const channel = await this.repository.createChannel({
        name: input.name,
        slug: input.slug,
        currencyCode: input.currencyCode,
        defaultCountry: input.defaultCountry,
      });
      logger.debug("Successfully created channel", {
        id: channel.id,
        name: input.name,
      });
      return channel;
    } catch (error) {
      logger.error("Failed to create channel", {
        error: error instanceof Error ? error.message : "Unknown error",
        name: input.name,
      });
      throw error;
    }
  }

  private async updateChannel(id: string, input: ChannelInput) {
    logger.debug("Preparing channel update", { id, name: input.name });
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

    logger.debug("Updating channel", {
      id,
      name: input.name,
      hasOrderSettings: !!updateInput.orderSettings,
      hasCheckoutSettings: !!updateInput.checkoutSettings,
      hasPaymentSettings: !!updateInput.paymentSettings,
      hasStockSettings: !!updateInput.stockSettings,
    });

    try {
      const updatedChannel = await this.repository.updateChannel(
        id,
        updateInput
      );
      logger.debug("Successfully updated channel", {
        id,
        name: input.name,
      });
      return updatedChannel;
    } catch (error) {
      logger.error("Failed to update channel", {
        error: error instanceof Error ? error.message : "Unknown error",
        id,
        name: input.name,
      });
      throw error;
    }
  }

  async bootstrapChannels(inputs: ChannelInput[]) {
    logger.debug("Bootstrapping channels", { count: inputs.length });
    try {
      const channels = await Promise.all(
        inputs.map((input) => this.getOrCreate(input))
      );
      logger.debug("Successfully bootstrapped all channels", {
        count: channels.length,
      });
      return channels;
    } catch (error) {
      logger.error("Failed to bootstrap channels", {
        error: error instanceof Error ? error.message : "Unknown error",
        count: inputs.length,
      });
      throw error;
    }
  }
}
