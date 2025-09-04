import type { Collection } from "../../../modules/collection/repository";
import type { CollectionInput } from "../../../modules/config/schema/schema";
import type { DiffChange, DiffResult, EntityType } from "../types";
import { BaseEntityComparator } from "./base-comparator";

export class CollectionComparator extends BaseEntityComparator<
  readonly CollectionInput[],
  readonly Collection[],
  CollectionInput | Collection
> {
  protected readonly entityType: EntityType = "Collections";

  compare(local: readonly CollectionInput[], remote: readonly Collection[]): readonly DiffResult[] {
    // Validate and deduplicate local collections
    this.validateUniqueIdentifiers(local);
    const deduplicatedLocal = this.deduplicateEntities(local);

    const results: DiffResult[] = [];
    const localMap = this.createEntityMap(deduplicatedLocal);
    const remoteMap = this.createEntityMap(remote);

    // Check for collections to create or update
    for (const localCollection of deduplicatedLocal) {
      const remoteCollection = remoteMap.get(this.getEntityName(localCollection));

      if (!remoteCollection) {
        // Collection doesn't exist in remote, create it
        results.push(this.createCreateResult(localCollection));
      } else {
        // Collection exists, check for updates
        const changes = this.compareEntityFields(localCollection, remoteCollection);
        if (changes.length > 0) {
          results.push(this.createUpdateResult(localCollection, remoteCollection, changes));
        }
      }
    }

    // Check for collections to delete (exists in remote but not in local)
    for (const remoteCollection of remote) {
      if (!localMap.has(this.getEntityName(remoteCollection))) {
        results.push(this.createDeleteResult(remoteCollection));
      }
    }

    return results;
  }

  protected getEntityName(entity: CollectionInput | Collection): string {
    if (!entity.slug) {
      throw new Error("Collection must have a valid slug");
    }
    return entity.slug;
  }

  private getProductSlugs(entity: CollectionInput | Collection): string[] {
    if ("products" in entity && Array.isArray(entity.products)) {
      // For local input, it's already an array of product slugs
      return entity.products.sort();
    }

    // For remote collection, extract product slugs from the edges structure
    const collection = entity as Collection;
    if (collection.products?.edges) {
      return collection.products.edges
        .map((edge) => edge.node.slug)
        .filter((slug): slug is string => !!slug)
        .sort();
    }

    return [];
  }

  private getChannelListings(entity: CollectionInput | Collection): Array<{
    channelSlug: string;
    isPublished: boolean;
  }> {
    if ("channelListings" in entity && Array.isArray(entity.channelListings)) {
      // For local input
      const input = entity as CollectionInput;
      return (input.channelListings ?? [])
        .map((listing) => ({
          channelSlug: listing.channelSlug,
          isPublished: listing.isPublished ?? false,
        }))
        .sort((a, b) => a.channelSlug.localeCompare(b.channelSlug));
    }

    // For remote collection
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

  protected compareEntityFields(
    local: CollectionInput | Collection,
    remote: CollectionInput | Collection
  ): DiffChange[] {
    const changes: DiffChange[] = [];

    // Compare basic fields
    if (local.name !== remote.name) {
      changes.push(this.createFieldChange("name", remote.name, local.name));
    }

    // Compare description
    const localDescription = typeof local.description === "string" ? local.description : undefined;
    const remoteDescription =
      typeof remote.description === "string" ? remote.description : undefined;
    if (localDescription !== remoteDescription) {
      changes.push(this.createFieldChange("description", remoteDescription, localDescription));
    }

    // Note: isPublished is handled via channelListings, not as a top-level field

    // Compare products
    const localProducts = this.getProductSlugs(local);
    const remoteProducts = this.getProductSlugs(remote);

    if (JSON.stringify(localProducts) !== JSON.stringify(remoteProducts)) {
      changes.push(
        this.createFieldChange(
          "products",
          remoteProducts,
          localProducts,
          `Products: [${remoteProducts.join(", ")}] → [${localProducts.join(", ")}]`
        )
      );
    }

    // Compare channel listings
    const localChannels = this.getChannelListings(local);
    const remoteChannels = this.getChannelListings(remote);

    // Create a comparison key for channel listings
    const channelKey = (channels: typeof localChannels) =>
      channels.map((ch) => `${ch.channelSlug}:${ch.isPublished}`).join(",");

    if (channelKey(localChannels) !== channelKey(remoteChannels)) {
      const formatChannels = (channels: typeof localChannels) =>
        channels
          .map((ch) => `${ch.channelSlug}(${ch.isPublished ? "published" : "unpublished"})`)
          .join(", ");

      changes.push(
        this.createFieldChange(
          "channelListings",
          remoteChannels,
          localChannels,
          `Channel listings: [${formatChannels(remoteChannels)}] → [${formatChannels(localChannels)}]`
        )
      );
    }

    return changes;
  }
}
