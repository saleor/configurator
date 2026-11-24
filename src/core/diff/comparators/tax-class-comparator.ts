import type { TaxClassInput } from "../../../modules/config/schema/schema";
import { entityComparator } from "./entity-comparator";

export const taxClassComparator = entityComparator<TaxClassInput>({
  entityType: "TaxClasses",

  identify(taxClass) {
    if (!taxClass.name) {
      throw new Error("Tax class must have a valid name");
    }
    return taxClass.name;
  },

  compareFields(changes, desired, current) {
    changes.value("name", desired.name, current.name);

    const desiredRates = desired.countryRates ?? [];
    const currentRates = current.countryRates ?? [];
    const currentByCountry = new Map(currentRates.map((rate) => [rate.countryCode, rate.rate]));
    const desiredCountries = new Set(desiredRates.map((rate) => rate.countryCode));

    for (const { countryCode, rate } of desiredRates) {
      const currentRate = currentByCountry.get(countryCode);
      if (currentRate === undefined) {
        changes.record(["countryRates", countryCode], {
          field: "countryRates",
          kind: "added",
          current: null,
          desired: `${countryCode}: ${rate}%`,
          description: `Tax rate for ${countryCode} added: ${rate}%`,
        });
      } else if (currentRate !== rate) {
        changes.record(["countryRates", countryCode], {
          field: "countryRates",
          current: `${countryCode}: ${currentRate}%`,
          desired: `${countryCode}: ${rate}%`,
          description: `Tax rate for ${countryCode}: ${currentRate}% → ${rate}%`,
        });
      }
    }

    for (const { countryCode, rate } of currentRates) {
      if (!desiredCountries.has(countryCode)) {
        changes.record(["countryRates", countryCode], {
          field: "countryRates",
          kind: "removed",
          current: `${countryCode}: ${rate}%`,
          desired: null,
          description: `Tax rate for ${countryCode} removed (was ${rate}%)`,
        });
      }
    }
  },
});
