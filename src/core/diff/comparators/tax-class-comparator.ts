import { BaseEntityComparator } from "./base-comparator";
import type { DiffChange } from "../types";
import type {
  TaxClassInput,
  TaxClassCountryRateInput,
} from "../../../modules/config/schema/schema";

interface TaxClassEntity extends TaxClassInput {
  id?: string;
}

export class TaxClassComparator extends BaseEntityComparator<
  readonly TaxClassEntity[],
  readonly TaxClassEntity[],
  TaxClassEntity
> {
  protected readonly entityType = "TaxClasses";

  /**
   * Compares local and remote tax class arrays
   */
  compare(
    local: readonly TaxClassEntity[],
    remote: readonly TaxClassEntity[]
  ): readonly import("../types").DiffResult[] {
    // Validate unique identifiers (names for tax classes)
    this.validateUniqueIdentifiers(local);
    this.validateUniqueIdentifiers(remote);

    const results: import("../types").DiffResult[] = [];
    const remoteByName = this.createEntityMap(remote);
    const localByName = this.createEntityMap(local);

    // Check for creates and updates
    for (const localTaxClass of local) {
      const remoteTaxClass = remoteByName.get(this.getEntityName(localTaxClass));

      if (!remoteTaxClass) {
        results.push(this.createCreateResult(localTaxClass));
      } else {
        // Check for updates
        const changes = this.compareEntityFields(localTaxClass, remoteTaxClass);
        if (changes.length > 0) {
          results.push(this.createUpdateResult(localTaxClass, remoteTaxClass, changes));
        }
      }
    }

    // Check for deletes
    for (const remoteTaxClass of remote) {
      if (!localByName.has(this.getEntityName(remoteTaxClass))) {
        results.push(this.createDeleteResult(remoteTaxClass));
      }
    }

    return results;
  }

  /**
   * Gets the unique identifier of a tax class entity (using name)
   * Tax classes in Saleor are uniquely identified by name, not slug
   */
  protected getEntityName(entity: TaxClassEntity): string {
    if (!entity.name) {
      throw new Error("Tax class must have a valid name");
    }
    return entity.name;
  }

  /**
   * Compares fields between local and remote tax class entities
   */
  protected compareEntityFields(local: TaxClassEntity, remote: TaxClassEntity): DiffChange[] {
    const changes: DiffChange[] = [];

    // Compare name (though it shouldn't change as it's the identifier)
    if (local.name !== remote.name) {
      changes.push(this.createFieldChange("name", remote.name, local.name));
    }

    // Compare country rates
    const localCountryRates = local.countryRates ?? [];
    const remoteCountryRates = remote.countryRates ?? [];

    if (localCountryRates.length > 0 || remoteCountryRates.length > 0) {
      changes.push(...this.compareCountryRates(localCountryRates, remoteCountryRates));
    }

    return changes;
  }

  /**
   * Compares country rates between local and remote tax classes
   */
  private compareCountryRates(
    local: readonly TaxClassCountryRateInput[],
    remote: readonly TaxClassCountryRateInput[]
  ): DiffChange[] {
    const changes: DiffChange[] = [];

    const localRatesMap = new Map(local.map((rate) => [rate.countryCode, rate.rate]));
    const remoteRatesMap = new Map(remote.map((rate) => [rate.countryCode, rate.rate]));

    // Find added or updated rates
    for (const localRate of local) {
      const remoteRate = remoteRatesMap.get(localRate.countryCode);

      if (remoteRate === undefined) {
        // New country rate
        changes.push(
          this.createFieldChange(
            "countryRates",
            null,
            `${localRate.countryCode}: ${localRate.rate}%`,
            `Tax rate for ${localRate.countryCode} added: ${localRate.rate}%`
          )
        );
      } else if (remoteRate !== localRate.rate) {
        // Updated rate
        changes.push(
          this.createFieldChange(
            "countryRates",
            `${localRate.countryCode}: ${remoteRate}%`,
            `${localRate.countryCode}: ${localRate.rate}%`,
            `Tax rate for ${localRate.countryCode}: ${remoteRate}% → ${localRate.rate}%`
          )
        );
      }
    }

    // Find removed rates
    for (const remoteRate of remote) {
      if (!localRatesMap.has(remoteRate.countryCode)) {
        changes.push(
          this.createFieldChange(
            "countryRates",
            `${remoteRate.countryCode}: ${remoteRate.rate}%`,
            null,
            `Tax rate for ${remoteRate.countryCode} removed (was ${remoteRate.rate}%)`
          )
        );
      }
    }

    return changes;
  }
}
