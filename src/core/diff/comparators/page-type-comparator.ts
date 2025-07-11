import type { SaleorConfig } from "../../../modules/config/schema/schema";
import type { DiffChange } from "../types";
import { BaseEntityComparator } from "./base-comparator";

/**
 * Page type entity type for type safety
 */
type PageTypeEntity = NonNullable<SaleorConfig["pageTypes"]>[number];

/**
 * Page type attribute structure
 */
interface PageTypeAttribute {
  readonly name: string;
  readonly inputType?: string;
  readonly values?: readonly { readonly name: string }[];
}

/**
 * Comparator for page type entities
 */
export class PageTypeComparator extends BaseEntityComparator<
  readonly PageTypeEntity[],
  readonly PageTypeEntity[],
  PageTypeEntity
> {
  protected readonly entityType = "Page Types";

  /**
   * Compares local and remote page type arrays
   */
  compare(
    local: readonly PageTypeEntity[],
    remote: readonly PageTypeEntity[]
  ): readonly import("../types").DiffResult[] {
    // Validate unique names
    this.validateUniqueNames(local);
    this.validateUniqueNames(remote);

    const results: import("../types").DiffResult[] = [];
    const remoteByName = this.createEntityMap(remote);
    const localByName = this.createEntityMap(local);

    // Check for creates and updates
    for (const localPT of local) {
      const remotePT = remoteByName.get(this.getEntityName(localPT));

      if (!remotePT) {
        results.push(this.createCreateResult(localPT));
      } else {
        // Check for updates
        const changes = this.compareEntityFields(localPT, remotePT);
        if (changes.length > 0) {
          results.push(this.createUpdateResult(localPT, remotePT, changes));
        }
      }
    }

    // Check for deletes
    for (const remotePT of remote) {
      if (!localByName.has(this.getEntityName(remotePT))) {
        results.push(this.createDeleteResult(remotePT));
      }
    }

    return results;
  }

  /**
   * Gets the name of a page type entity
   */
  protected getEntityName(entity: PageTypeEntity): string {
    return entity.name;
  }

  /**
   * Compares fields between local and remote page type entities
   */
  protected compareEntityFields(
    local: PageTypeEntity,
    remote: PageTypeEntity
  ): DiffChange[] {
    const changes: DiffChange[] = [];

    // Compare slug if it exists
    const localSlug = this.getSlug(local);
    const remoteSlug = this.getSlug(remote);

    if (localSlug !== remoteSlug) {
      changes.push(this.createFieldChange("slug", remoteSlug, localSlug));
    }

    // Compare attributes if they exist
    const localAttributes = this.getAttributes(local);
    const remoteAttributes = this.getAttributes(remote);

    if (localAttributes.length > 0 || remoteAttributes.length > 0) {
      changes.push(
        ...this.compareAttributes(localAttributes, remoteAttributes)
      );
    }

    return changes;
  }

  /**
   * Safely extracts slug from a page type entity
   */
  private getSlug(entity: PageTypeEntity): string | undefined {
    // Type assertion is safe here since we're accessing a known property
    return (entity as any).slug;
  }

  /**
   * Safely extracts attributes from a page type entity
   */
  private getAttributes(entity: PageTypeEntity): readonly PageTypeAttribute[] {
    // Type assertion is safe here since we're accessing a known property
    const attributes = (entity as any).attributes;
    return Array.isArray(attributes) ? attributes : [];
  }

  /**
   * Compares page type attributes between local and remote
   */
  private compareAttributes(
    local: readonly PageTypeAttribute[],
    remote: readonly PageTypeAttribute[]
  ): DiffChange[] {
    const changes: DiffChange[] = [];

    const localAttrMap = new Map(local.map((attr) => [attr.name, attr]));
    const remoteAttrMap = new Map(remote.map((attr) => [attr.name, attr]));

    // Find added attributes
    for (const localAttr of local) {
      if (!remoteAttrMap.has(localAttr.name)) {
        changes.push(
          this.createFieldChange(
            "attributes",
            null,
            localAttr.name,
            `Attribute "${localAttr.name}" added (in config, not on Saleor)`
          )
        );
      }
    }

    // Find removed attributes
    for (const remoteAttr of remote) {
      if (!localAttrMap.has(remoteAttr.name)) {
        changes.push(
          this.createFieldChange(
            "attributes",
            remoteAttr.name,
            null,
            `Attribute "${remoteAttr.name}" removed (on Saleor, not in config)`
          )
        );
      }
    }

    return changes;
  }
}
