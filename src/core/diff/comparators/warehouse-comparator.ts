import type { WarehouseInput } from "../../../modules/config/schema/schema";
import type { Warehouse } from "../../../modules/warehouse/repository";
import type { ChangeSet } from "./change-set";
import { entityComparator } from "./entity-comparator";

// Type for country in remote warehouse address
type RemoteCountry = {
  code: string;
  country: string;
};

// Type for address with potential country variations
type AddressWithVariableCountry = {
  streetAddress1?: string | null;
  streetAddress2?: string | null;
  city?: string | null;
  cityArea?: string | null;
  postalCode?: string | null;
  country?: string | RemoteCountry | null;
  countryArea?: string | null;
  companyName?: string | null;
  phone?: string | null;
};

type WarehouseEntity = WarehouseInput | Warehouse;

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
  address: AddressWithVariableCountry | null | undefined
): Record<string, string> | null {
  if (!address) return null;

  // Country is a code in the config and `{ code, country }` in Saleor's shape.
  let countryCode = "";
  if (typeof address.country === "string") {
    countryCode = address.country;
  } else if (address.country && typeof address.country === "object" && "code" in address.country) {
    countryCode = (address.country as RemoteCountry).code;
  }

  return {
    streetAddress1: address.streetAddress1 || "",
    streetAddress2: address.streetAddress2 || "",
    city: address.city || "",
    cityArea: address.cityArea || "",
    postalCode: address.postalCode || "",
    country: countryCode,
    countryArea: address.countryArea || "",
    companyName: address.companyName || "",
    phone: address.phone || "",
  };
}

function compareAddresses(
  changes: ChangeSet,
  desired: WarehouseInput["address"],
  current: Warehouse["address"]
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

function shippingZoneNames(entity: WarehouseEntity): string[] {
  if ("shippingZones" in entity && Array.isArray(entity.shippingZones)) {
    return [...entity.shippingZones].sort();
  }
  const warehouse = entity as Warehouse;
  if (warehouse.shippingZones?.edges) {
    return warehouse.shippingZones.edges
      .map((edge) => edge.node.name)
      .filter(Boolean)
      .sort();
  }
  return [];
}

/** Compares warehouses by slug. */
export const warehouseComparator = entityComparator<WarehouseEntity>({
  entityType: "Warehouses",

  identify(warehouse) {
    if (!warehouse.slug) {
      throw new Error("Warehouse must have a valid slug");
    }
    return warehouse.slug;
  },

  compareFields(changes, desiredEntity, currentEntity) {
    const desired = desiredEntity as WarehouseInput;
    const current = currentEntity as Warehouse;

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
