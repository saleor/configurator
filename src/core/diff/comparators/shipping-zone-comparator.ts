import type { ShippingMethodInput, ShippingZoneInput } from "../../../modules/config/schema/schema";
import type { ChangeSet } from "./change-set";
import { entityComparator } from "./entity-comparator";

interface NormalizedChannelListing {
  channel: string;
  price: number;
  currency: string;
  minimumOrderPrice: number | null;
  maximumOrderPrice: number | null;
}

function sorted(list: readonly string[] | undefined): string[] {
  return [...(list ?? [])].sort();
}

function normalizeShippingMethod(method: ShippingMethodInput): Record<string, unknown> {
  const normalized: Record<string, unknown> = {
    name: method.name,
    type: method.type,
    minimumDeliveryDays: method.minimumDeliveryDays || null,
    maximumDeliveryDays: method.maximumDeliveryDays || null,
  };

  if (method.minimumOrderWeight) {
    normalized.minimumOrderWeight = {
      unit: method.minimumOrderWeight.unit,
      value: method.minimumOrderWeight.value,
    };
  }
  if (method.maximumOrderWeight) {
    normalized.maximumOrderWeight = {
      unit: method.maximumOrderWeight.unit,
      value: method.maximumOrderWeight.value,
    };
  }

  if (method.channelListings) {
    normalized.channelListings = method.channelListings
      .map(
        (listing): NormalizedChannelListing => ({
          channel: listing.channel || "",
          price: listing.price || 0,
          currency: listing.currency || "USD",
          minimumOrderPrice: listing.minimumOrderPrice || null,
          maximumOrderPrice: listing.maximumOrderPrice || null,
        })
      )
      .sort((a, b) => a.channel.localeCompare(b.channel));
  }

  return normalized;
}

function compareShippingMethods(
  changes: ChangeSet,
  desiredMethods: readonly ShippingMethodInput[] | undefined,
  currentMethods: readonly ShippingMethodInput[] | undefined
): void {
  changes.members(
    "shippingMethods",
    (desiredMethods ?? []).map(normalizeShippingMethod),
    (currentMethods ?? []).map(normalizeShippingMethod),
    (method) => method.name as string,
    (methodChanges, desired, current) => {
      const { channelListings: desiredListings, ...desiredFields } = desired;
      const { channelListings: currentListings, ...currentFields } = current;
      methodChanges.fields(desiredFields, currentFields);
      methodChanges.members(
        "channelListings",
        (desiredListings as NormalizedChannelListing[] | undefined) ?? [],
        (currentListings as NormalizedChannelListing[] | undefined) ?? [],
        (listing) => listing.channel,
        (listingChanges, desiredListing, currentListing) =>
          listingChanges.fields({ ...desiredListing }, { ...currentListing })
      );
    }
  );
}

/** Compares shipping zones by name, including their shipping methods. */
export const shippingZoneComparator = entityComparator<ShippingZoneInput>({
  entityType: "Shipping Zones",

  identify(zone) {
    if (!zone.name) {
      throw new Error("Shipping zone must have a valid name");
    }
    return zone.name;
  },

  compareFields(changes, desired, current) {
    changes.value("description", desired.description, current.description);
    changes.value("default", desired.default ?? false, current.default);

    changes.set("countries", sorted(desired.countries), sorted(current.countries));
    changes.set("warehouses", sorted(desired.warehouses), sorted(current.warehouses));
    changes.set("channels", sorted(desired.channels), sorted(current.channels));

    compareShippingMethods(changes, desired.shippingMethods, current.shippingMethods);
    changes.metadata(desired, current);

    const currentMethods = new Map((current.shippingMethods ?? []).map((m) => [m.name, m]));
    for (const method of desired.shippingMethods ?? []) {
      const currentMethod = currentMethods.get(method.name);
      if (currentMethod) {
        changes.at("shippingMethods", method.name).metadata(method, currentMethod);
      }
    }
  },
});
