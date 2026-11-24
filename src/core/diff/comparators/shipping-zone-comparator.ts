import type { ShippingMethodInput, ShippingZoneInput } from "../../../modules/config/schema/schema";
import type { ShippingMethod, ShippingZone } from "../../../modules/shipping-zone/repository";
import type { ChangeSet } from "./change-set";
import { entityComparator } from "./entity-comparator";

// Type definitions for channel listings
interface NormalizedChannelListing {
  channel: string;
  price: number;
  currency: string;
  minimumOrderPrice: number | null;
  maximumOrderPrice: number | null;
}

// Input format (from config schema)
type InputChannelListing = {
  channel: string;
  price: number;
  currency?: string;
  minimumOrderPrice?: number;
  maximumOrderPrice?: number;
};

// Remote format (from GraphQL API)
type RemoteChannelListing = {
  channel: { slug: string };
  price: { amount: number; currency: string } | null;
  minimumOrderPrice: { amount: number; currency: string } | null;
  maximumOrderPrice: { amount: number; currency: string } | null;
};

type ChannelListing = InputChannelListing | RemoteChannelListing;

type ShippingZoneEntity = ShippingZoneInput | ShippingZone;

function normalizeCountries(countries: ShippingZoneEntity["countries"]): string[] {
  if (!countries || !Array.isArray(countries)) return [];
  // Saleor's shape lists `{ code }` objects; the config lists codes.
  if (countries.length > 0 && typeof countries[0] === "object" && "code" in countries[0]) {
    return (countries as { code: string }[]).map((c) => c.code).sort();
  }
  return [...(countries as string[])].sort();
}

/** Slugs from a list that is slugs in the config and `{ slug }` objects in Saleor's shape. */
function slugList(list: unknown): string[] {
  if (!Array.isArray(list) || list.length === 0) return [];
  if (typeof list[0] === "object" && list[0] !== null && "slug" in list[0]) {
    return list
      .map((item) => {
        if (item && typeof item === "object" && "slug" in item) {
          const slug = (item as { slug: unknown }).slug;
          return typeof slug === "string" ? slug : null;
        }
        return null;
      })
      .filter((slug): slug is string => Boolean(slug))
      .sort();
  }
  return [...(list as string[])].sort();
}

function normalizeShippingMethod(
  method: ShippingMethodInput | ShippingMethod
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {
    name: method.name,
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
    // Handle both input and remote channel listings by checking the structure
    normalized.channelListings = method.channelListings
      .map((listing: ChannelListing): NormalizedChannelListing => {
        // Type guard to check if this is a remote listing
        const isRemoteListing = (l: ChannelListing): l is RemoteChannelListing => {
          return typeof l.channel === "object" && l.channel !== null && "slug" in l.channel;
        };

        if (isRemoteListing(listing)) {
          // Handle remote listing structure
          return {
            channel: listing.channel.slug || "",
            price: listing.price?.amount || 0,
            currency: listing.price?.currency || "USD",
            minimumOrderPrice: listing.minimumOrderPrice?.amount || null,
            maximumOrderPrice: listing.maximumOrderPrice?.amount || null,
          };
        } else {
          // Handle input listing structure (already typed correctly)
          const inputListing = listing as InputChannelListing;
          return {
            channel: inputListing.channel || "",
            price: inputListing.price || 0,
            currency: inputListing.currency || "USD",
            minimumOrderPrice: inputListing.minimumOrderPrice || null,
            maximumOrderPrice: inputListing.maximumOrderPrice || null,
          };
        }
      })
      .sort((a: NormalizedChannelListing, b: NormalizedChannelListing) =>
        a.channel.localeCompare(b.channel)
      );
  }

  return normalized;
}

function compareShippingMethods(
  changes: ChangeSet,
  desiredMethods: readonly ShippingMethodInput[] | undefined,
  currentMethods: readonly ShippingMethod[] | null | undefined
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
export const shippingZoneComparator = entityComparator<ShippingZoneEntity>({
  entityType: "Shipping Zones",

  identify(zone) {
    if (!zone.name) {
      throw new Error("Shipping zone must have a valid name");
    }
    return zone.name;
  },

  compareFields(changes, desiredEntity, currentEntity) {
    const desired = desiredEntity as ShippingZoneInput;
    const current = currentEntity as ShippingZone;

    changes.value("description", desired.description, current.description);
    changes.value("default", desired.default ?? false, current.default);

    changes.set(
      "countries",
      normalizeCountries(desired.countries),
      normalizeCountries(current.countries)
    );
    changes.set("warehouses", slugList(desired.warehouses), slugList(current.warehouses));
    changes.set("channels", slugList(desired.channels), slugList(current.channels));

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
