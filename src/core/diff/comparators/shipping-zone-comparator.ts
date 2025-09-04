import type { ShippingMethodInput, ShippingZoneInput } from "../../../modules/config/schema/schema";
import type { ShippingMethod, ShippingZone } from "../../../modules/shipping-zone/repository";
import type { DiffChange, DiffResult, EntityType } from "../types";
import { BaseEntityComparator } from "./base-comparator";

export class ShippingZoneComparator extends BaseEntityComparator<
  readonly ShippingZoneInput[],
  readonly ShippingZone[],
  ShippingZoneInput | ShippingZone
> {
  protected readonly entityType: EntityType = "Shipping Zones";

  /**
   * Creates a readable summary of shipping methods for display
   */
  private serializeShippingMethods(
    methods: ShippingMethodInput[] | ShippingMethod[] | undefined
  ): string {
    if (!methods || methods.length === 0) {
      return "[]";
    }

    return methods
      .map((method) => {
        const name = method.name || "Unnamed";
        const type = method.type || "Unknown";
        return `${name} (${type})`;
      })
      .join(", ");
  }

  /**
   * Creates a field change specifically for shipping methods with proper serialization
   */
  private createShippingMethodsFieldChange(
    remoteMethods: ShippingMethod[] | undefined,
    localMethods: ShippingMethodInput[] | undefined,
    description: string
  ): DiffChange {
    return {
      field: "shippingMethods",
      currentValue: this.serializeShippingMethods(remoteMethods),
      desiredValue: this.serializeShippingMethods(localMethods),
      description,
    };
  }

  compare(
    local: readonly ShippingZoneInput[],
    remote: readonly ShippingZone[]
  ): readonly DiffResult[] {
    // Validate and deduplicate local shipping zones
    this.validateUniqueIdentifiers(local);
    const deduplicatedLocal = this.deduplicateEntities(local);

    const results: DiffResult[] = [];
    const localMap = this.createEntityMap(deduplicatedLocal);
    const remoteMap = this.createEntityMap(remote);

    // Check for shipping zones to create or update
    for (const localZone of deduplicatedLocal) {
      const remoteZone = remoteMap.get(this.getEntityName(localZone));

      if (!remoteZone) {
        // Shipping zone doesn't exist in remote, create it
        results.push(this.createCreateResult(localZone));
      } else {
        // Shipping zone exists, check for updates
        const changes = this.compareEntityFields(localZone, remoteZone);
        if (changes.length > 0) {
          results.push(this.createUpdateResult(localZone, remoteZone, changes));
        }
      }
    }

    // Check for shipping zones to delete (exists in remote but not in local)
    for (const remoteZone of remote) {
      if (!localMap.has(this.getEntityName(remoteZone))) {
        results.push(this.createDeleteResult(remoteZone));
      }
    }

    return results;
  }

  protected getEntityName(entity: ShippingZoneInput | ShippingZone): string {
    if (!entity.name) {
      throw new Error("Shipping zone must have a valid name");
    }
    return entity.name;
  }

  private normalizeCountries(
    countries: ShippingZoneInput["countries"] | ShippingZone["countries"]
  ): string[] {
    if (!countries) return [];

    if (Array.isArray(countries)) {
      // Check if it's an array of objects with code property (remote)
      if (countries.length > 0 && typeof countries[0] === "object" && "code" in countries[0]) {
        return (countries as Array<{ code: string }>).map(c => c.code).sort();
      }
      // Otherwise it's already an array of country codes (local)
      return (countries as string[]).sort();
    }

    return [];
  }

  private getWarehouseSlugs(entity: ShippingZoneInput | ShippingZone): string[] {
    if (
      "warehouses" in entity &&
      Array.isArray(entity.warehouses) &&
      entity.warehouses.length > 0
    ) {
      // Check if it's an array of objects with slug property (remote)
      if (typeof entity.warehouses[0] === "object" && "slug" in entity.warehouses[0]) {
        return entity.warehouses
          .map((warehouse) => {
            // Type guard for safety
            if (warehouse && typeof warehouse === "object" && "slug" in warehouse) {
              const slugValue = (warehouse as { slug: unknown }).slug;
              return typeof slugValue === "string" ? slugValue : null;
            }
            return null;
          })
          .filter((slug): slug is string => slug !== null)
          .sort();
      }
      // Otherwise it's already an array of warehouse slugs (local)
      return (entity.warehouses as string[]).sort();
    }

    return [];
  }

  private getChannelSlugs(entity: ShippingZoneInput | ShippingZone): string[] {
    if ("channels" in entity && Array.isArray(entity.channels) && entity.channels.length > 0) {
      // Check if it's an array of objects with slug property (remote)
      if (typeof entity.channels[0] === "object" && "slug" in entity.channels[0]) {
        return entity.channels
          .map((channel) => (channel as { slug: string }).slug)
          .filter(Boolean)
          .sort();
      }
      // Otherwise it's already an array of channel slugs (local)
      return (entity.channels as string[]).sort();
    }

    return [];
  }

  private normalizeShippingMethod(
    method: ShippingMethodInput | ShippingMethod
  ): Record<string, unknown> {
    const normalized: Record<string, unknown> = {
      name: method.name,
      description: method.description || "",
      type: method.type,
      minimumDeliveryDays: method.minimumDeliveryDays || null,
      maximumDeliveryDays: method.maximumDeliveryDays || null,
    };

    // Handle weight fields
    if ("minimumOrderWeight" in method && method.minimumOrderWeight) {
      normalized.minimumOrderWeight = {
        unit: method.minimumOrderWeight.unit,
        value: method.minimumOrderWeight.value,
      };
    } else if ("minimumOrderWeight" in method && (method as ShippingMethod).minimumOrderWeight) {
      const weight = (method as ShippingMethod).minimumOrderWeight;
      normalized.minimumOrderWeight = weight
        ? {
            unit: weight.unit,
            value: weight.value,
          }
        : null;
    }

    if ("maximumOrderWeight" in method && method.maximumOrderWeight) {
      normalized.maximumOrderWeight = {
        unit: method.maximumOrderWeight.unit,
        value: method.maximumOrderWeight.value,
      };
    } else if ("maximumOrderWeight" in method && (method as ShippingMethod).maximumOrderWeight) {
      const weight = (method as ShippingMethod).maximumOrderWeight;
      normalized.maximumOrderWeight = weight
        ? {
            unit: weight.unit,
            value: weight.value,
          }
        : null;
    }

    // Handle channel listings
    if ("channelListings" in method && Array.isArray(method.channelListings)) {
      normalized.channelListings = method.channelListings
        .map((listing: any) => ({
          channel: listing.channel,
          price: listing.price,
          currency: listing.currency || "USD",
          minimumOrderPrice: listing.minimumOrderPrice || null,
          maximumOrderPrice: listing.maximumOrderPrice || null,
        }))
        .sort((a: any, b: any) =>
          a.channel.localeCompare(b.channel)
        );
    } else if (
      "channelListings" in method &&
      Array.isArray((method as ShippingMethod).channelListings)
    ) {
      normalized.channelListings = (method as ShippingMethod).channelListings
        .map((listing: any) => ({
          channel: listing.channel?.slug || listing.channel,
          price: listing.price?.amount || listing.price || 0,
          currency: listing.price?.currency || "USD",
          minimumOrderPrice: listing.minimumOrderPrice?.amount || null,
          maximumOrderPrice: listing.maximumOrderPrice?.amount || null,
        }))
        .sort((a: any, b: any) =>
          a.channel.localeCompare(b.channel)
        );
    }

    return normalized;
  }

  private compareShippingMethods(
    localMethods: ShippingMethodInput[] | undefined,
    remoteMethods: ShippingMethod[] | undefined
  ): DiffChange[] {
    const changes: DiffChange[] = [];

    const localNormalized = (localMethods || []).map((m) => this.normalizeShippingMethod(m));
    const remoteNormalized = (remoteMethods || []).map((m) => this.normalizeShippingMethod(m));

    // Create maps by name for comparison
    const localMap = new Map(localNormalized.map((m) => [m.name, m]));
    const remoteMap = new Map(remoteNormalized.map((m) => [m.name, m]));

    // Find methods to add
    const toAdd = localNormalized.filter((m) => !remoteMap.has(m.name));

    // Find methods to remove
    const toRemove = remoteNormalized.filter((m) => !localMap.has(m.name));

    // Find methods to update
    const toUpdate: string[] = [];
    for (const [name, localMethod] of localMap) {
      const remoteMethod = remoteMap.get(name);
      if (remoteMethod && JSON.stringify(localMethod) !== JSON.stringify(remoteMethod)) {
        toUpdate.push(name as string);
      }
    }

    if (toAdd.length > 0 || toRemove.length > 0 || toUpdate.length > 0) {
      const description = [];
      if (toAdd.length > 0) {
        description.push(`Add: ${toAdd.map((m) => m.name).join(", ")}`);
      }
      if (toRemove.length > 0) {
        description.push(`Remove: ${toRemove.map((m) => m.name).join(", ")}`);
      }
      if (toUpdate.length > 0) {
        description.push(`Update: ${toUpdate.join(", ")}`);
      }

      changes.push(
        this.createShippingMethodsFieldChange(remoteMethods, localMethods, description.join("; "))
      );
    }

    return changes;
  }

  protected compareEntityFields(local: ShippingZoneInput, remote: ShippingZone): DiffChange[] {
    const changes: DiffChange[] = [];

    // Compare basic fields
    if (local.description !== remote.description) {
      changes.push(this.createFieldChange("description", remote.description, local.description));
    }

    const localDefault = local.default ?? false;
    if (localDefault !== remote.default) {
      changes.push(this.createFieldChange("default", remote.default, localDefault));
    }

    // Compare countries
    const localCountries = this.normalizeCountries(local.countries);
    const remoteCountries = this.normalizeCountries(remote.countries);

    if (JSON.stringify(localCountries) !== JSON.stringify(remoteCountries)) {
      changes.push(
        this.createFieldChange(
          "countries",
          remoteCountries,
          localCountries,
          `Countries: [${remoteCountries.join(", ")}] → [${localCountries.join(", ")}]`
        )
      );
    }

    // Compare warehouses
    const localWarehouses = this.getWarehouseSlugs(local);
    const remoteWarehouses = this.getWarehouseSlugs(remote);

    if (JSON.stringify(localWarehouses) !== JSON.stringify(remoteWarehouses)) {
      changes.push(
        this.createFieldChange(
          "warehouses",
          remoteWarehouses,
          localWarehouses,
          `Warehouses: [${remoteWarehouses.join(", ")}] → [${localWarehouses.join(", ")}]`
        )
      );
    }

    // Compare channels
    const localChannels = this.getChannelSlugs(local);
    const remoteChannels = this.getChannelSlugs(remote);

    if (JSON.stringify(localChannels) !== JSON.stringify(remoteChannels)) {
      changes.push(
        this.createFieldChange(
          "channels",
          remoteChannels,
          localChannels,
          `Channels: [${remoteChannels.join(", ")}] → [${localChannels.join(", ")}]`
        )
      );
    }

    // Compare shipping methods
    const methodChanges = this.compareShippingMethods(
      local.shippingMethods,
      remote.shippingMethods as any
    );
    changes.push(...methodChanges);

    return changes;
  }
}
