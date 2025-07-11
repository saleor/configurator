import type { SaleorConfig } from "../../../modules/config/schema/schema";
import type { DiffChange } from "../types";
import { BaseEntityComparator } from "./base-comparator";

/**
 * Category entity type for type safety
 */
type CategoryEntity = NonNullable<SaleorConfig["categories"]>[number];

/**
 * Subcategory structure
 */
interface Subcategory {
  readonly name: string;
  readonly slug?: string;
}

/**
 * Comparator for category entities
 */
export class CategoryComparator extends BaseEntityComparator<
  readonly CategoryEntity[],
  readonly CategoryEntity[],
  CategoryEntity
> {
  protected readonly entityType = "Categories";

  /**
   * Compares local and remote category arrays
   */
  compare(
    local: readonly CategoryEntity[],
    remote: readonly CategoryEntity[]
  ): readonly import("../types").DiffResult[] {
    // Validate unique names
    this.validateUniqueNames(local);
    this.validateUniqueNames(remote);

    const results: import("../types").DiffResult[] = [];
    const remoteByName = this.createEntityMap(remote);
    const localByName = this.createEntityMap(local);

    // Check for creates and updates
    for (const localCat of local) {
      const remoteCat = remoteByName.get(this.getEntityName(localCat));

      if (!remoteCat) {
        results.push(this.createCreateResult(localCat));
      } else {
        // Check for updates
        const changes = this.compareEntityFields(localCat, remoteCat);
        if (changes.length > 0) {
          results.push(this.createUpdateResult(localCat, remoteCat, changes));
        }
      }
    }

    // Check for deletes
    for (const remoteCat of remote) {
      if (!localByName.has(this.getEntityName(remoteCat))) {
        results.push(this.createDeleteResult(remoteCat));
      }
    }

    return results;
  }

  /**
   * Gets the name of a category entity
   */
  protected getEntityName(entity: CategoryEntity) {
    return entity.name;
  }

  /**
   * Compares fields between local and remote category entities
   */
  protected compareEntityFields(local: CategoryEntity, remote: CategoryEntity): DiffChange[] {
    const changes: DiffChange[] = [];

    // Compare slug if it exists
    const localSlug = this.getSlug(local);
    const remoteSlug = this.getSlug(remote);

    if (localSlug && remoteSlug && localSlug !== remoteSlug) {
      changes.push(this.createFieldChange("slug", remoteSlug, localSlug));
    }

    // Compare subcategories if they exist
    const localSubcats = this.getSubcategories(local);
    const remoteSubcats = this.getSubcategories(remote);

    if (localSubcats.length > 0 || remoteSubcats.length > 0) {
      changes.push(...this.compareSubcategories(localSubcats, remoteSubcats));
    }

    return changes;
  }

  /**
   * Safely extracts slug from a category entity
   */
  private getSlug(entity: CategoryEntity): string | undefined {
    // Type guard for accessing slug property
    return "slug" in entity && typeof entity.slug === "string" ? entity.slug : undefined;
  }

  /**
   * Safely extracts subcategories from a category entity
   */
  private getSubcategories(entity: CategoryEntity): readonly Subcategory[] {
    // Type guard for accessing subcategories property
    const subcategories = "subcategories" in entity ? entity.subcategories : undefined;
    return Array.isArray(subcategories) ? subcategories : [];
  }

  /**
   * Compares subcategories between local and remote categories
   */
  private compareSubcategories(
    local: readonly Subcategory[],
    remote: readonly Subcategory[]
  ): DiffChange[] {
    const changes: DiffChange[] = [];

    const localSubcatMap = new Map(local.map((subcat) => [subcat.name, subcat]));
    const remoteSubcatMap = new Map(remote.map((subcat) => [subcat.name, subcat]));

    // Find added subcategories
    for (const localSubcat of local) {
      if (!remoteSubcatMap.has(localSubcat.name)) {
        changes.push(
          this.createFieldChange(
            "subcategories",
            null,
            localSubcat.name,
            `Subcategory "${localSubcat.name}" added (in config, not on Saleor)`
          )
        );
      }
    }

    // Find removed subcategories
    for (const remoteSubcat of remote) {
      if (!localSubcatMap.has(remoteSubcat.name)) {
        changes.push(
          this.createFieldChange(
            "subcategories",
            remoteSubcat.name,
            null,
            `Subcategory "${remoteSubcat.name}" removed (on Saleor, not in config)`
          )
        );
      }
    }

    return changes;
  }
}
