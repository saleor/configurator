import type { SaleorConfig } from "../../../modules/config/schema/schema";
import type { DiffChange } from "../types";
import { BaseEntityComparator, type ComparatorOptions } from "./base-comparator";

/**
 * Category entity type for type safety
 */
type CategoryEntity = NonNullable<SaleorConfig["categories"]>[number];

/**
 * Subcategory structure with recursive nesting
 */
interface Subcategory {
  readonly name: string;
  readonly slug: string;
  readonly subcategories?: readonly Subcategory[];
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
    // Validate unique identifiers (slugs for categories)
    this.validateUniqueIdentifiers(local);
    this.validateUniqueIdentifiers(remote);

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
   * Gets the unique identifier of a category entity (using slug)
   * Categories in Saleor are uniquely identified by slug, not name
   */
  protected getEntityName(entity: CategoryEntity) {
    return entity.slug || entity.name; // Fallback to name if slug is not available
  }

  /**
   * Compares fields between local and remote category entities
   */
  protected compareEntityFields(
    local: CategoryEntity,
    remote: CategoryEntity,
    _options?: ComparatorOptions
  ): DiffChange[] {
    const changes: DiffChange[] = [];

    // Compare slug if it exists
    const localName = this.getName(local);
    const remoteName = this.getName(remote);

    if (localName && remoteName && localName !== remoteName) {
      changes.push(this.createFieldChange("name", remoteName, localName));
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
  private getName(entity: CategoryEntity): string | undefined {
    return entity.name;
  }

  /**
   * Safely extracts subcategories from a category entity
   */
  private getSubcategories(entity: CategoryEntity): readonly Subcategory[] {
    if (typeof entity === "object" && entity !== null && "subcategories" in entity) {
      return entity.subcategories ?? [];
    }
    return [];
  }

  /**
   * Compares subcategories between local and remote categories recursively
   */
  private compareSubcategories(
    local: readonly Subcategory[],
    remote: readonly Subcategory[]
  ): DiffChange[] {
    const changes: DiffChange[] = [];

    const localSubcatMap = new Map(local.map((subcat) => [subcat.slug, subcat]));
    const remoteSubcatMap = new Map(remote.map((subcat) => [subcat.slug, subcat]));

    // Find added subcategories
    for (const localSubcat of local) {
      if (!remoteSubcatMap.has(localSubcat.slug)) {
        changes.push(
          this.createFieldChange(
            "subcategories",
            null,
            localSubcat.name,
            `Subcategory "${localSubcat.name}" added (in config, not on Saleor)`
          )
        );
      } else {
        // Compare existing subcategories recursively
        const remoteSubcat = remoteSubcatMap.get(localSubcat.slug);
        if (remoteSubcat) {
          const nestedChanges = this.compareSubcategoryStructure(localSubcat, remoteSubcat);
          changes.push(...nestedChanges);
        }
      }
    }

    // Find removed subcategories
    for (const remoteSubcat of remote) {
      if (!localSubcatMap.has(remoteSubcat.slug)) {
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

  /**
   * Compares the structure of individual subcategories recursively
   */
  private compareSubcategoryStructure(local: Subcategory, remote: Subcategory): DiffChange[] {
    const changes: DiffChange[] = [];

    // Get nested subcategories
    const localNested = local.subcategories ?? [];
    const remoteNested = remote.subcategories ?? [];

    // If there are nested subcategories, compare them recursively
    if (localNested.length > 0 || remoteNested.length > 0) {
      const nestedChanges = this.compareSubcategories(localNested, remoteNested);

      // Prefix the nested changes with the parent subcategory name for clarity
      for (const change of nestedChanges) {
        changes.push(
          this.createFieldChange(
            change.field,
            change.currentValue,
            change.desiredValue,
            `In "${local.name}": ${change.description || `${change.field} changed`}`
          )
        );
      }
    }

    return changes;
  }
}
