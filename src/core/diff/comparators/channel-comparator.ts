import type { SaleorConfig } from "../../../modules/config/schema/schema";
import { EntityValidationError } from "../errors";
import { entityComparator } from "./entity-comparator";

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
 * Tax configuration that can be compared
 */
interface TaxConfiguration {
  readonly taxCalculationStrategy?: "FLAT_RATES" | "TAX_APP";
  readonly chargeTaxes?: boolean;
  readonly displayGrossPrices?: boolean;
  readonly pricesEnteredWithTax?: boolean;
  readonly taxAppId?: string;
}

/**
 * Channel fields to compare (excluding settings)
 */
const CHANNEL_FIELDS: ReadonlyArray<keyof ChannelEntity> = [
  "name",
  "currencyCode",
  "defaultCountry",
  "slug",
  "isActive",
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
 * Tax configuration fields to compare
 */
const TAX_CONFIGURATION_FIELDS: ReadonlyArray<keyof TaxConfiguration> = [
  "taxCalculationStrategy",
  "chargeTaxes",
  "displayGrossPrices",
  "pricesEnteredWithTax",
  "taxAppId",
] as const;

/**
 * Compares channels by slug: top-level fields, settings and tax configuration. Fields the
 * config leaves out are unmanaged in the deploy direction.
 */
export const channelComparator = entityComparator<ChannelEntity>({
  entityType: "Channels",

  identify(channel) {
    if (!channel.slug || typeof channel.slug !== "string") {
      throw new EntityValidationError("Channel entity must have a valid slug");
    }
    return channel.slug;
  },

  compareFields(changes, desired, current) {
    for (const field of CHANNEL_FIELDS) {
      changes.managedValue(field, desired[field], current[field]);
    }

    const desiredSettings = settingsOf(desired);
    const currentSettings = settingsOf(current);
    for (const field of CHANNEL_SETTINGS_FIELDS) {
      changes.at("settings").managedValue(field, desiredSettings[field], currentSettings[field]);
    }

    const desiredTax = taxConfigurationOf(desired);
    const currentTax = taxConfigurationOf(current);
    for (const field of TAX_CONFIGURATION_FIELDS) {
      changes.at("taxConfiguration").managedValue(field, desiredTax[field], currentTax[field]);
    }
  },
});

function settingsOf(channel: ChannelEntity): ChannelSettings {
  return ("settings" in channel ? channel.settings : undefined) ?? {};
}

function taxConfigurationOf(channel: ChannelEntity): TaxConfiguration {
  return ("taxConfiguration" in channel ? channel.taxConfiguration : undefined) ?? {};
}
