import { logger } from "../../lib/logger";
import { ServiceErrorWrapper } from "../../lib/utils/error-wrapper";
import { object } from "../../lib/utils/object";
import type { ChannelCreateInput, ChannelInput, ChannelUpdateInput } from "../config/schema/schema";
import { ChannelCreationError, ChannelError, ChannelUpdateError } from "./errors";
import type { ChannelOperations } from "./repository";

export class ChannelService {
  constructor(private repository: ChannelOperations) {}

  private async getExistingChannel(slug: string) {
    return ServiceErrorWrapper.wrapServiceCall(
      "fetch channel",
      "channel",
      slug,
      async () => {
        logger.debug("Looking up existing channel", { slug });
        const channels = await this.repository.getChannels();
        const existingChannel = channels?.find((channel) => channel.slug === slug);

        if (existingChannel) {
          logger.debug("Found existing channel", {
            id: existingChannel.id,
            name: existingChannel.name,
            slug: existingChannel.slug,
          });
        } else {
          logger.debug("Channel not found", { slug });
        }

        return existingChannel;
      },
      ChannelError
    );
  }

  async createChannel(input: ChannelCreateInput) {
    return ServiceErrorWrapper.wrapServiceCall(
      "create channel",
      "channel",
      input.slug,
      async () => {
        logger.debug("Creating new channel", { name: input.name, slug: input.slug });
        const channel = await this.repository.createChannel({
          name: input.name,
          slug: input.slug,
          currencyCode: input.currencyCode,
          defaultCountry: input.defaultCountry,
          isActive: false,
        });
        logger.debug("Successfully created channel", {
          id: channel.id,
          name: input.name,
          slug: input.slug,
        });
        return channel;
      },
      ChannelCreationError
    );
  }

  private async getOrCreate(input: ChannelInput) {
    logger.debug("Getting or creating channel", { name: input.name, slug: input.slug });
    const existingChannel = await this.getExistingChannel(input.slug);

    if (existingChannel) {
      // Check if this is an update input (has settings)
      if ("settings" in input) {
        logger.debug("Updating existing channel", {
          id: existingChannel.id,
          name: input.name,
        });
        return this.updateChannel(existingChannel.id, input as ChannelUpdateInput);
      } else {
        // It's a create input but channel exists, return existing
        logger.debug("Channel already exists, returning existing", {
          id: existingChannel.id,
          name: input.name,
        });
        return existingChannel;
      }
    }

    // Create new channel with minimal input
    return this.createChannel(input as ChannelCreateInput);
  }

  async updateChannel(id: string, input: ChannelUpdateInput) {
    return ServiceErrorWrapper.wrapServiceCall(
      "update channel",
      "channel",
      input.slug,
      async () => {
        logger.debug("Preparing channel update", { id, name: input.name, slug: input.slug });
        const settings = input.settings ?? {};

        const updateInput = object.filterUndefinedValues({
      name: input.name,
      slug: input.slug,
      defaultCountry: input.defaultCountry,
      orderSettings:
        Object.keys(settings).length > 0
          ? object.filterUndefinedValues({
              automaticallyConfirmAllNewOrders: settings.automaticallyConfirmAllNewOrders,
              automaticallyFulfillNonShippableGiftCard:
                settings.automaticallyFulfillNonShippableGiftCard,
              expireOrdersAfter: settings.expireOrdersAfter?.toString(),
              deleteExpiredOrdersAfter: settings.deleteExpiredOrdersAfter?.toString(),
              markAsPaidStrategy: settings.markAsPaidStrategy,
              allowUnpaidOrders: settings.allowUnpaidOrders,
              includeDraftOrderInVoucherUsage: settings.includeDraftOrderInVoucherUsage,
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
            defaultTransactionFlowStrategy: settings.defaultTransactionFlowStrategy,
          }
        : undefined,
      stockSettings: settings.allocationStrategy
        ? { allocationStrategy: settings.allocationStrategy }
        : undefined,
        });

        logger.debug("Updating channel", {
          id,
          name: input.name,
          slug: input.slug,
          hasOrderSettings: !!updateInput.orderSettings,
          hasCheckoutSettings: !!updateInput.checkoutSettings,
          hasPaymentSettings: !!updateInput.paymentSettings,
          hasStockSettings: !!updateInput.stockSettings,
        });

        const updatedChannel = await this.repository.updateChannel(id, updateInput);
        logger.debug("Successfully updated channel", {
          id,
          name: input.name,
          slug: input.slug,
        });
        return updatedChannel;
      },
      ChannelUpdateError
    );
  }

  async bootstrapChannels(inputs: ChannelInput[]) {
    logger.debug("Bootstrapping channels", { count: inputs.length });
    
    const results = await ServiceErrorWrapper.wrapBatch(
      inputs,
      "Bootstrap channels",
      (channel) => channel.slug,
      (input) => this.getOrCreate(input)
    );

    if (results.failures.length > 0) {
      const errorMessage = `Failed to bootstrap ${results.failures.length} of ${inputs.length} channels`;
      logger.error(errorMessage, {
        failures: results.failures.map((f) => ({
          channel: f.item.slug,
          error: f.error.message,
        })),
      });
      throw new ChannelError(
        errorMessage,
        "CHANNEL_BOOTSTRAP_ERROR",
        results.failures.map((f) => `${f.item.slug}: ${f.error.message}`)
      );
    }

    logger.debug("Successfully bootstrapped all channels", {
      count: results.successes.length,
    });
    return results.successes.map((s) => s.result);
  }
}
