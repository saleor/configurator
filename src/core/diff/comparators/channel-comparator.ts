import type { SaleorConfig } from "../../../modules/config/schema/schema";
import { EntityValidationError } from "../errors";
import type { DiffChange } from "../types";
import { BaseEntityComparator } from "./base-comparator";

/**
 * Channel entity type for type safety
 */
type ChannelEntity = NonNullable<SaleorConfig["channels"]>[number];

/**
 * Channel settings that can be compared
 */
interface ChannelSettings {
  readonly allocationStrategy?: string;
  readonly automaticallyConfirmAllNewOrders?: boolean;
  readonly automaticallyFulfillNonShippableGiftCard?: boolean;
  readonly expireOrdersAfter?: number;
  readonly deleteExpiredOrdersAfter?: number;
  readonly markAsPaidStrategy?: string;
  readonly allowUnpaidOrders?: boolean;
  readonly includeDraftOrderInVoucherUsage?: boolean;
  readonly useLegacyErrorFlow?: boolean;
  readonly automaticallyCompleteFullyPaidCheckouts?: boolean;
  readonly defaultTransactionFlowStrategy?: string;
}

/**
 * Channel fields to compare (excluding settings)
 */
const CHANNEL_FIELDS: ReadonlyArray<keyof ChannelEntity> = [
  "currencyCode",
  "defaultCountry",
  "slug",
  "isActive", // ADD MISSING FIELD
] as const;

/**
 * Channel settings fields to compare
 */
const CHANNEL_SETTINGS_FIELDS: ReadonlyArray<keyof ChannelSettings> = [
  "allocationStrategy",
  "automaticallyConfirmAllNewOrders",
  "automaticallyFulfillNonShippableGiftCard",
  "expireOrdersAfter",
  "deleteExpiredOrdersAfter",
  "markAsPaidStrategy",
  "allowUnpaidOrders",
  "includeDraftOrderInVoucherUsage",
  "useLegacyErrorFlow",
  "automaticallyCompleteFullyPaidCheckouts",
  "defaultTransactionFlowStrategy",
] as const;

/**
 * Comparator for channel entities
 */
export class ChannelComparator extends BaseEntityComparator<
  readonly ChannelEntity[],
  readonly ChannelEntity[],
  ChannelEntity
> {
  protected readonly entityType = "Channels";

  /**
   * Compares local and remote channel arrays
   */
  compare(
    local: readonly ChannelEntity[],
    remote: readonly ChannelEntity[]
  ): readonly import("../types").DiffResult[] {
    // Validate unique names
    this.validateUniqueNames(local);
    this.validateUniqueNames(remote);

    const results: import("../types").DiffResult[] = [];
    const remoteByName = this.createEntityMap(remote);
    const localByName = this.createEntityMap(local);

    // Check for creates and updates
    for (const localChannel of local) {
      const remoteChannel = remoteByName.get(this.getEntityName(localChannel));

      if (!remoteChannel) {
        // Channel needs to be created
        results.push(this.createCreateResult(localChannel));
      } else {
        // Check for updates
        const changes = this.compareEntityFields(localChannel, remoteChannel);
        if (changes.length > 0) {
          results.push(this.createUpdateResult(localChannel, remoteChannel, changes));
        }
      }
    }

    // Check for deletes
    for (const remoteChannel of remote) {
      if (!localByName.has(this.getEntityName(remoteChannel))) {
        results.push(this.createDeleteResult(remoteChannel));
      }
    }

    return results;
  }

  /**
   * Gets the unique identifier of a channel entity (using slug)
   * Channels in Saleor are uniquely identified by slug, not name
   */
  protected getEntityName(entity: ChannelEntity): string {
    if (!entity.slug || typeof entity.slug !== "string") {
      throw new EntityValidationError("Channel entity must have a valid slug");
    }
    return entity.slug;
  }

  /**
   * Compares fields between local and remote channel entities
   */
  protected compareEntityFields(local: ChannelEntity, remote: ChannelEntity): DiffChange[] {
    const changes: DiffChange[] = [];

    // Compare basic channel fields
    for (const field of CHANNEL_FIELDS) {
      const localValue = local[field];
      const remoteValue = remote[field];

      if (localValue !== remoteValue) {
        changes.push(this.createFieldChange(field, remoteValue, localValue));
      }
    }

    // Compare channel settings if they exist
    const localSettings = this.getChannelSettings(local);
    const remoteSettings = this.getChannelSettings(remote);

    if (localSettings || remoteSettings) {
      changes.push(...this.compareChannelSettings(localSettings, remoteSettings));
    }

    return changes;
  }

  /**
   * Safely extracts channel settings from a channel entity
   */
  private getChannelSettings(channel: ChannelEntity): ChannelSettings | undefined {
    if (typeof channel === "object" && channel !== null && "settings" in channel) {
      return channel.settings ?? undefined;
    }
    return undefined;
  }

  /**
   * Compares channel settings objects
   */
  private compareChannelSettings(
    local: ChannelSettings | undefined,
    remote: ChannelSettings | undefined
  ): DiffChange[] {
    const changes: DiffChange[] = [];
    const localSettings = local || {};
    const remoteSettings = remote || {};

    for (const field of CHANNEL_SETTINGS_FIELDS) {
      const localValue = localSettings[field];
      const remoteValue = remoteSettings[field];

      if (localValue !== remoteValue) {
        changes.push(this.createFieldChange(`settings.${field}`, remoteValue, localValue));
      }
    }

    return changes;
  }
}
