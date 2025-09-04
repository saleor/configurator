import type { WarehouseInput } from "../../../modules/config/schema/schema";
import type { Warehouse } from "../../../modules/warehouse/repository";
import type { DiffChange, DiffResult, EntityType } from "../types";
import { BaseEntityComparator } from "./base-comparator";

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

export class WarehouseComparator extends BaseEntityComparator<
  readonly WarehouseInput[],
  readonly Warehouse[],
  WarehouseInput | Warehouse
> {
  protected readonly entityType: EntityType = "Warehouses";

  compare(local: readonly WarehouseInput[], remote: readonly Warehouse[]): readonly DiffResult[] {
    // Validate and deduplicate local warehouses
    this.validateUniqueIdentifiers(local);
    const deduplicatedLocal = this.deduplicateEntities(local);

    const results: DiffResult[] = [];
    const localMap = this.createEntityMap(deduplicatedLocal);
    const remoteMap = this.createEntityMap(remote);

    // Check for warehouses to create or update
    for (const localWarehouse of deduplicatedLocal) {
      const remoteWarehouse = remoteMap.get(this.getEntityName(localWarehouse));

      if (!remoteWarehouse) {
        // Warehouse doesn't exist in remote, create it
        results.push(this.createCreateResult(localWarehouse));
      } else {
        // Warehouse exists, check for updates
        const changes = this.compareEntityFields(
          localWarehouse as WarehouseInput,
          remoteWarehouse as Warehouse
        );
        if (changes.length > 0) {
          results.push(this.createUpdateResult(localWarehouse, remoteWarehouse, changes));
        }
      }
    }

    // Check for warehouses to delete (exists in remote but not in local)
    for (const remoteWarehouse of remote) {
      if (!localMap.has(this.getEntityName(remoteWarehouse))) {
        results.push(this.createDeleteResult(remoteWarehouse));
      }
    }

    return results;
  }

  protected getEntityName(entity: WarehouseInput | Warehouse): string {
    if (!entity.slug) {
      throw new Error("Warehouse must have a valid slug");
    }
    return entity.slug;
  }

  private normalizeAddress(
    address: AddressWithVariableCountry | null | undefined
  ): Record<string, string> | null {
    if (!address) return null;

    // Handle country field - can be string or object with code/country properties
    let countryCode = "";
    if (typeof address.country === "string") {
      countryCode = address.country;
    } else if (
      address.country &&
      typeof address.country === "object" &&
      "code" in address.country
    ) {
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

  private compareAddresses(
    local: WarehouseInput["address"],
    remote: Warehouse["address"]
  ): DiffChange[] {
    const changes: DiffChange[] = [];
    const normalizedLocal = this.normalizeAddress(local);
    const normalizedRemote = this.normalizeAddress(remote);

    if (!normalizedLocal || !normalizedRemote) {
      if (normalizedLocal !== normalizedRemote) {
        changes.push(this.createFieldChange("address", normalizedRemote, normalizedLocal));
      }
      return changes;
    }

    const addressFields = [
      "streetAddress1",
      "streetAddress2",
      "city",
      "cityArea",
      "postalCode",
      "country",
      "countryArea",
      "companyName",
      "phone",
    ];

    for (const field of addressFields) {
      const localValue = normalizedLocal[field];
      const remoteValue = normalizedRemote[field];

      // Case-insensitive comparison for city field since Saleor normalizes warehouse addresses to UPPERCASE
      const valuesAreDifferent =
        field === "city"
          ? localValue.toLowerCase() !== remoteValue.toLowerCase()
          : localValue !== remoteValue;

      if (valuesAreDifferent) {
        changes.push(this.createFieldChange(`address.${field}`, remoteValue, localValue));
      }
    }

    return changes;
  }

  private getShippingZoneNames(entity: WarehouseInput | Warehouse): string[] {
    if ("shippingZones" in entity && Array.isArray(entity.shippingZones)) {
      // For local input, it's already an array of zone names
      return entity.shippingZones.sort();
    }

    // For remote warehouse, extract zone names from the edges structure
    const warehouse = entity as Warehouse;
    if (warehouse.shippingZones?.edges) {
      return warehouse.shippingZones.edges
        .map((edge) => edge.node.name)
        .filter(Boolean)
        .sort();
    }

    return [];
  }

  protected compareEntityFields(local: WarehouseInput, remote: Warehouse): DiffChange[] {
    const changes: DiffChange[] = [];

    // Compare basic fields
    if (local.name !== remote.name) {
      changes.push(this.createFieldChange("name", remote.name, local.name));
    }

    // Handle email comparison - treat undefined and empty string as equivalent
    const localEmail = local.email || undefined;
    const remoteEmail = remote.email || undefined;
    if (localEmail !== remoteEmail) {
      changes.push(this.createFieldChange("email", remoteEmail, localEmail));
    }

    const localIsPrivate = local.isPrivate ?? false;
    if (localIsPrivate !== remote.isPrivate) {
      changes.push(this.createFieldChange("isPrivate", remote.isPrivate, localIsPrivate));
    }

    const localClickAndCollect = local.clickAndCollectOption ?? "DISABLED";
    if (localClickAndCollect !== remote.clickAndCollectOption) {
      changes.push(
        this.createFieldChange(
          "clickAndCollectOption",
          remote.clickAndCollectOption,
          localClickAndCollect
        )
      );
    }

    // Compare address
    const addressChanges = this.compareAddresses(local.address, remote.address);
    changes.push(...addressChanges);

    // Compare shipping zones
    const localZones = this.getShippingZoneNames(local);
    const remoteZones = this.getShippingZoneNames(remote);

    if (JSON.stringify(localZones) !== JSON.stringify(remoteZones)) {
      changes.push(
        this.createFieldChange(
          "shippingZones",
          remoteZones,
          localZones,
          `Shipping zones: [${remoteZones.join(", ")}] → [${localZones.join(", ")}]`
        )
      );
    }

    return changes;
  }
}
