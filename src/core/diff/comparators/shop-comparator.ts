import type { SaleorConfig } from "../../../modules/config/schema/schema";
import type { DiffResult } from "../types";
import { ChangeSet } from "./change-set";
import type { EntityComparator } from "./entity-comparator";

/**
 * Shop settings that can be compared
 */
interface ShopSettings {
  readonly defaultMailSenderName?: string;
  readonly defaultMailSenderAddress?: string;
  readonly displayGrossPrices?: boolean;
  readonly enableAccountConfirmationByEmail?: boolean;
  readonly limitQuantityPerCheckout?: number;
  readonly trackInventoryByDefault?: boolean;
  readonly useLegacyShippingZoneStockAvailability?: boolean;
  readonly reserveStockDurationAnonymousUser?: number;
  readonly reserveStockDurationAuthenticatedUser?: number;
  readonly defaultWeightUnit?: string;
  readonly allowLoginWithoutConfirmation?: boolean;
}

/**
 * List of shop settings fields to compare
 */
const SHOP_SETTINGS_FIELDS: ReadonlyArray<keyof ShopSettings> = [
  "defaultMailSenderName",
  "defaultMailSenderAddress",
  "displayGrossPrices",
  "enableAccountConfirmationByEmail",
  "limitQuantityPerCheckout",
  "trackInventoryByDefault",
  "useLegacyShippingZoneStockAvailability",
  "reserveStockDurationAnonymousUser",
  "reserveStockDurationAuthenticatedUser",
  "defaultWeightUnit",
  "allowLoginWithoutConfirmation",
] as const;

type ShopEntity = NonNullable<SaleorConfig["shop"]>;

const ENTITY = { entityType: "Shop Settings", entityName: "Shop Settings" } as const;

/** Compares the store's single shop settings object. */
export const shopComparator: EntityComparator = {
  compare(desiredSection, currentSection, options = {}): readonly DiffResult[] {
    const desired = (desiredSection ?? undefined) as ShopEntity | undefined;
    const current = (currentSection ?? undefined) as ShopEntity | undefined;

    if (!desired && !current) return [];
    if (!desired) return [{ operation: "DELETE", ...ENTITY, current }];
    if (!current) return [{ operation: "CREATE", ...ENTITY, desired }];

    const changes = ChangeSet.create(options);
    for (const field of SHOP_SETTINGS_FIELDS) {
      changes.managedValue(field, desired[field], current[field], {});
    }

    if (changes.changes().length === 0) return [];
    return [{ operation: "UPDATE", ...ENTITY, current, desired, changes: changes.changes() }];
  },
};
