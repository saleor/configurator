import type { CollectionInput } from "../../../modules/config/schema/schema";
import { entityComparator } from "./entity-comparator";

function productSlugs(collection: CollectionInput): string[] {
  return [...(collection.products ?? [])].sort();
}

function channelListings(
  collection: CollectionInput
): Array<{ channelSlug: string; isPublished: boolean }> {
  return (collection.channelListings ?? [])
    .map((listing) => ({
      channelSlug: listing.channelSlug,
      isPublished: listing.isPublished ?? false,
    }))
    .sort((a, b) => a.channelSlug.localeCompare(b.channelSlug));
}

/** Compares collections by slug. */
export const collectionComparator = entityComparator<CollectionInput>({
  entityType: "Collections",

  identify(collection) {
    if (!collection.slug) {
      throw new Error("Collection must have a valid slug");
    }
    return collection.slug;
  },

  compareFields(changes, desired, current) {
    changes.value("name", desired.name, current.name);

    const description = (entity: CollectionInput) =>
      typeof entity.description === "string" ? entity.description : undefined;
    changes.value("description", description(desired), description(current));

    // isPublished is handled via channelListings, not as a top-level field.
    changes.set("products", productSlugs(desired), productSlugs(current));
    changes.members(
      "channelListings",
      channelListings(desired),
      channelListings(current),
      (listing) => listing.channelSlug,
      (listingChanges, desiredListing, currentListing) =>
        listingChanges.value("isPublished", desiredListing.isPublished, currentListing.isPublished)
    );
  },
});
