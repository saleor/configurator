import type { Collection } from "../../../modules/collection/repository";
import type { CollectionInput } from "../../../modules/config/schema/schema";
import { entityComparator } from "./entity-comparator";

type CollectionEntity = CollectionInput | Collection;

function productSlugs(entity: CollectionEntity): string[] {
  if ("products" in entity && Array.isArray(entity.products)) {
    return [...entity.products].sort();
  }
  const collection = entity as Collection;
  if (collection.products?.edges) {
    return collection.products.edges
      .map((edge) => edge.node.slug)
      .filter((slug): slug is string => !!slug)
      .sort();
  }
  return [];
}

function channelListings(entity: CollectionEntity): Array<{
  channelSlug: string;
  isPublished: boolean;
}> {
  if ("channelListings" in entity && Array.isArray(entity.channelListings)) {
    const input = entity as CollectionInput;
    return (input.channelListings ?? [])
      .map((listing) => ({
        channelSlug: listing.channelSlug,
        isPublished: listing.isPublished ?? false,
      }))
      .sort((a, b) => a.channelSlug.localeCompare(b.channelSlug));
  }
  const collection = entity as Collection;
  if (collection.channelListings) {
    return collection.channelListings
      .map((listing) => ({
        channelSlug: listing.channel.slug,
        isPublished: listing.isPublished,
      }))
      .sort((a, b) => a.channelSlug.localeCompare(b.channelSlug));
  }
  return [];
}

/** Compares collections by slug. */
export const collectionComparator = entityComparator<CollectionEntity>({
  entityType: "Collections",

  identify(collection) {
    if (!collection.slug) {
      throw new Error("Collection must have a valid slug");
    }
    return collection.slug;
  },

  compareFields(changes, desired, current) {
    changes.value("name", desired.name, current.name);

    const description = (entity: CollectionEntity) =>
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
