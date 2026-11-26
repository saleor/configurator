import type { WarehouseInput } from "../../../modules/config/schema/schema";
import type { ChangeSet } from "./change-set";
import { entityComparator } from "./entity-comparator";

const ADDRESS_FIELDS = [
  "streetAddress1",
  "streetAddress2",
  "city",
  "cityArea",
  "postalCode",
  "country",
  "countryArea",
  "companyName",
  "phone",
] as const;

function normalizeAddress(
  address: WarehouseInput["address"] | null | undefined
): Record<string, string> | null {
  if (!address) return null;

  return {
    streetAddress1: address.streetAddress1 || "",
    streetAddress2: address.streetAddress2 || "",
    city: address.city || "",
    cityArea: address.cityArea || "",
    postalCode: address.postalCode || "",
    country: address.country || "",
    countryArea: address.countryArea || "",
    companyName: address.companyName || "",
    phone: address.phone || "",
  };
}

function compareAddresses(
  changes: ChangeSet,
  desired: WarehouseInput["address"],
  current: WarehouseInput["address"]
): void {
  const desiredAddress = normalizeAddress(desired);
  const currentAddress = normalizeAddress(current);

  if (!desiredAddress || !currentAddress) {
    changes.value("address", desiredAddress, currentAddress);
    return;
  }

  for (const field of ADDRESS_FIELDS) {
    // Saleor stores warehouse cities in upper case, so the city compares case-insensitively.
    changes.at("address").value(field, desiredAddress[field], currentAddress[field], {
      equals:
        field === "city"
          ? (a, b) => String(a).toLowerCase() === String(b).toLowerCase()
          : undefined,
    });
  }
}

function shippingZoneNames(warehouse: WarehouseInput): string[] {
  return [...(warehouse.shippingZones ?? [])].sort();
}

/** Compares warehouses by slug. */
export const warehouseComparator = entityComparator<WarehouseInput>({
  entityType: "Warehouses",

  identify(warehouse) {
    if (!warehouse.slug) {
      throw new Error("Warehouse must have a valid slug");
    }
    return warehouse.slug;
  },

  compareFields(changes, desired, current) {
    changes.value("name", desired.name, current.name);
    // An empty email and no email are the same.
    changes.value("email", desired.email || undefined, current.email || undefined);
    changes.value("isPrivate", desired.isPrivate ?? false, current.isPrivate);
    changes.value(
      "clickAndCollectOption",
      desired.clickAndCollectOption ?? "DISABLED",
      current.clickAndCollectOption
    );

    compareAddresses(changes, desired.address, current.address);

    changes.set("shippingZones", shippingZoneNames(desired), shippingZoneNames(current));

    changes.metadata(desired, current);
  },
});
