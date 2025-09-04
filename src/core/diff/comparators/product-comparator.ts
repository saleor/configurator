import type { SaleorConfig } from "../../../modules/config/schema/schema";
import type { DiffChange } from "../types";
import { BaseEntityComparator } from "./base-comparator";

/**
 * Product entity type for type safety
 */
type ProductEntity = NonNullable<SaleorConfig["products"]>[number];

/**
 * Comparator for product entities
 */
export class ProductComparator extends BaseEntityComparator<
  readonly ProductEntity[],
  readonly ProductEntity[],
  ProductEntity
> {
  protected readonly entityType = "Products";

  /**
   * Compares local and remote product arrays
   */
  compare(
    local: readonly ProductEntity[],
    remote: readonly ProductEntity[]
  ): readonly import("../types").DiffResult[] {
    // Validate unique identifiers
    this.validateUniqueIdentifiers(local);
    this.validateUniqueIdentifiers(remote);

    const results: import("../types").DiffResult[] = [];
    const remoteByName = this.createEntityMap(remote);
    const localByName = this.createEntityMap(local);

    // Check for creates and updates
    for (const localProduct of local) {
      const remoteProduct = remoteByName.get(this.getEntityName(localProduct));

      if (!remoteProduct) {
        results.push(this.createCreateResult(localProduct));
      } else {
        // Check for updates
        const changes = this.compareEntityFields(localProduct, remoteProduct);
        if (changes.length > 0) {
          results.push(this.createUpdateResult(localProduct, remoteProduct, changes));
        }
      }
    }

    // Check for deletes
    for (const remoteProduct of remote) {
      if (!localByName.has(this.getEntityName(remoteProduct))) {
        results.push(this.createDeleteResult(remoteProduct));
      }
    }

    return results;
  }

  /**
   * Gets the identifier of a product entity (uses slug for identification)
   */
  protected getEntityName(entity: ProductEntity): string {
    if (!entity.slug) {
      throw new Error("Product must have a valid slug");
    }
    return entity.slug;
  }

  /**
   * Compares fields between local and remote product entities
   */
  protected compareEntityFields(local: ProductEntity, remote: ProductEntity): DiffChange[] {
    const changes: DiffChange[] = [];

    // Compare basic fields
    if (local.name !== remote.name) {
      changes.push(this.createFieldChange("name", remote.name, local.name));
    }

    if (local.description !== remote.description) {
      changes.push(this.createFieldChange("description", remote.description, local.description));
    }

    // Compare product type
    if (local.productType !== remote.productType) {
      changes.push(this.createFieldChange("productType", remote.productType, local.productType));
    }

    // Compare category
    if (local.category !== remote.category) {
      changes.push(this.createFieldChange("category", remote.category, local.category));
    }

    // Compare tax class
    if (local.taxClass !== remote.taxClass) {
      changes.push(this.createFieldChange("taxClass", remote.taxClass, local.taxClass));
    }

    // Compare attributes
    const localAttributes = local.attributes || {};
    const remoteAttributes = remote.attributes || {};

    // Check for attribute changes
    const allAttributeKeys = new Set([
      ...Object.keys(localAttributes),
      ...Object.keys(remoteAttributes),
    ]);

    for (const key of allAttributeKeys) {
      const localValue = localAttributes[key];
      const remoteValue = remoteAttributes[key];

      if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
        changes.push(
          this.createFieldChange(
            `attributes.${key}`,
            remoteValue,
            localValue,
            `Attribute "${key}": ${JSON.stringify(remoteValue)} → ${JSON.stringify(localValue)}`
          )
        );
      }
    }

    // Compare channel listings
    const localChannels = local.channels || [];
    const remoteChannels = remote.channels || [];

    const localChannelMap = new Map(localChannels.map((c) => [c.slug, c]));
    const remoteChannelMap = new Map(remoteChannels.map((c) => [c.slug, c]));

    // Check for channel changes
    const allChannelSlugs = new Set([...localChannelMap.keys(), ...remoteChannelMap.keys()]);

    for (const slug of allChannelSlugs) {
      const localChannel = localChannelMap.get(slug);
      const remoteChannel = remoteChannelMap.get(slug);

      if (!localChannel && remoteChannel) {
        changes.push(
          this.createFieldChange(
            `channels.${slug}`,
            undefined,
            remoteChannel,
            `Channel "${slug}" will be added`
          )
        );
      } else if (localChannel && !remoteChannel) {
        changes.push(
          this.createFieldChange(
            `channels.${slug}`,
            localChannel,
            undefined,
            `Channel "${slug}" will be removed`
          )
        );
      } else if (localChannel && remoteChannel) {
        // Compare channel properties
        if (JSON.stringify(localChannel) !== JSON.stringify(remoteChannel)) {
          changes.push(
            this.createFieldChange(
              `channels.${slug}`,
              remoteChannel,
              localChannel,
              `Channel "${slug}" settings changed`
            )
          );
        }
      }
    }

    // Deep variant comparison
    const localVariants = local.variants || [];
    const remoteVariants = remote.variants || [];

    // Map variants by SKU for comparison
    const localVariantMap = new Map(localVariants.map((v) => [v.sku, v]));
    const remoteVariantMap = new Map(remoteVariants.map((v) => [v.sku, v]));

    // Check for variant changes
    const allVariantSkus = new Set([...localVariantMap.keys(), ...remoteVariantMap.keys()]);

    for (const sku of allVariantSkus) {
      const localVariant = localVariantMap.get(sku);
      const remoteVariant = remoteVariantMap.get(sku);

      if (!localVariant && remoteVariant) {
        changes.push(
          this.createFieldChange(
            `variants.${sku}`,
            undefined,
            remoteVariant,
            `Variant "${sku}" will be added`
          )
        );
      } else if (localVariant && !remoteVariant) {
        changes.push(
          this.createFieldChange(
            `variants.${sku}`,
            localVariant,
            undefined,
            `Variant "${sku}" will be removed`
          )
        );
      } else if (localVariant && remoteVariant) {
        // Compare variant properties
        const variantChanges = this.compareVariants(localVariant, remoteVariant, sku);
        changes.push(...variantChanges);
      }
    }

    return changes;
  }

  /**
   * Compares variant fields in detail
   */
  private compareVariants(local: any, remote: any, sku: string): DiffChange[] {
    const changes: DiffChange[] = [];

    // Compare variant name
    if (local.name !== remote.name) {
      changes.push(
        this.createFieldChange(
          `variants.${sku}.name`,
          remote.name,
          local.name,
          `Variant "${sku}" name changed`
        )
      );
    }

    // Compare weight
    if (local.weight !== remote.weight) {
      changes.push(
        this.createFieldChange(
          `variants.${sku}.weight`,
          remote.weight,
          local.weight,
          `Variant "${sku}" weight changed`
        )
      );
    }

    // Compare variant attributes
    if (JSON.stringify(local.attributes) !== JSON.stringify(remote.attributes)) {
      changes.push(
        this.createFieldChange(
          `variants.${sku}.attributes`,
          remote.attributes,
          local.attributes,
          `Variant "${sku}" attributes changed`
        )
      );
    }

    // Compare channel listings
    if (JSON.stringify(local.channelListings) !== JSON.stringify(remote.channelListings)) {
      changes.push(
        this.createFieldChange(
          `variants.${sku}.channelListings`,
          remote.channelListings,
          local.channelListings,
          `Variant "${sku}" pricing/stock changed`
        )
      );
    }

    return changes;
  }
}
