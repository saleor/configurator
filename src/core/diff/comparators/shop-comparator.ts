import type { SaleorConfig } from "../../../modules/config/schema";
import type { DiffResult, DiffChange } from "../types";
import type { EntityComparator } from "./base-comparator";

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
  readonly reserveStockDurationAnonymousUser?: number;
  readonly reserveStockDurationAuthenticatedUser?: number;
  readonly defaultDigitalMaxDownloads?: number;
  readonly defaultDigitalUrlValidDays?: number;
  readonly defaultWeightUnit?: string;
  readonly allowLoginWithoutConfirmation?: boolean;
}

/**
 * List of shop settings fields to compare
 */
const SHOP_SETTINGS_FIELDS: ReadonlyArray<keyof ShopSettings> = [
  'defaultMailSenderName',
  'defaultMailSenderAddress',
  'displayGrossPrices',
  'enableAccountConfirmationByEmail',
  'limitQuantityPerCheckout',
  'trackInventoryByDefault',
  'reserveStockDurationAnonymousUser',
  'reserveStockDurationAuthenticatedUser',
  'defaultDigitalMaxDownloads',
  'defaultDigitalUrlValidDays',
  'defaultWeightUnit',
  'allowLoginWithoutConfirmation',
] as const;

/**
 * Comparator for shop settings
 */
export class ShopComparator implements EntityComparator<
  SaleorConfig["shop"] | undefined,
  SaleorConfig["shop"] | undefined
> {
  
  /**
   * Compares local and remote shop settings
   */
  compare(
    local: SaleorConfig["shop"] | undefined,
    remote: SaleorConfig["shop"] | undefined
  ): readonly DiffResult[] {
    // Both undefined - no changes
    if (!local && !remote) {
      return [];
    }

    // Only remote exists - mark for deletion
    if (!local && remote) {
      return [{
        operation: "DELETE",
        entityType: "Shop Settings",
        entityName: "Shop Settings",
        current: remote,
      }];
    }

    // Only local exists - mark for creation
    if (local && !remote) {
      return [{
        operation: "CREATE",
        entityType: "Shop Settings", 
        entityName: "Shop Settings",
        desired: local,
      }];
    }

    // Both exist - compare fields
    if (!local || !remote) {
      return [];
    }

    const changes = this.compareShopFields(local, remote);
    
    if (changes.length === 0) {
      return [];
    }

    return [{
      operation: "UPDATE",
      entityType: "Shop Settings",
      entityName: "Shop Settings",
      current: remote,
      desired: local,
      changes,
    }];
  }

  /**
   * Compares individual shop settings fields
   * @param local Local shop settings
   * @param remote Remote shop settings
   * @returns Array of field changes
   */
  private compareShopFields(
    local: NonNullable<SaleorConfig["shop"]>,
    remote: NonNullable<SaleorConfig["shop"]>
  ): DiffChange[] {
    const changes: DiffChange[] = [];

         for (const field of SHOP_SETTINGS_FIELDS) {
       const localValue = (local as any)[field];
       const remoteValue = (remote as any)[field];
      
      if (localValue !== remoteValue) {
        changes.push({
          field,
          currentValue: remoteValue,
          desiredValue: localValue,
          description: `${field} changed from "${remoteValue}" to "${localValue}"`,
        });
      }
    }

    return changes;
  }
} 