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

    // Compare product type
    if (local.productType !== remote.productType) {
      changes.push(this.createFieldChange("productType", remote.productType, local.productType));
    }

    // Compare category
    if (local.category !== remote.category) {
      changes.push(this.createFieldChange("category", remote.category, local.category));
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

    // Compare variants count (simplified - we're not doing deep variant comparison yet)
    const localVariantCount = local.variants?.length || 0;
    const remoteVariantCount = remote.variants?.length || 0;

    if (localVariantCount !== remoteVariantCount) {
      changes.push(
        this.createFieldChange(
          "variants.length",
          remoteVariantCount,
          localVariantCount,
          `Variant count changed: ${remoteVariantCount} → ${localVariantCount}`
        )
      );
    }

    return changes;
  }
}
