import type { SaleorConfig } from "../../../modules/config/schema/schema";
import type { DiffChange } from "../types";
import { BaseEntityComparator, type ComparatorOptions } from "./base-comparator";

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
    // Validate unique identifiers in local (names for page types - no slugs in API)
    this.validateUniqueIdentifiers(local);

    // For remote, deduplicate corrupted entities but allow processing to continue
    const deduplicatedRemote = this.deduplicateEntities(remote);

    const results: import("../types").DiffResult[] = [];
    const remoteByName = this.createEntityMap(deduplicatedRemote);
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

    // Check for deletes (use deduplicated remote)
    for (const remotePT of deduplicatedRemote) {
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
    remote: PageTypeEntity,
    _options?: ComparatorOptions
  ): DiffChange[] {
    const changes: DiffChange[] = [];

    // Compare slug if it exists
    const localName = this.getName(local);
    const remoteName = this.getName(remote);

    if (localName !== remoteName) {
      changes.push(this.createFieldChange("name", remoteName, localName));
    }

    // Compare attributes if they exist
    const localAttributes = this.getAttributes(local);
    const remoteAttributes = this.getAttributes(remote);

    if (localAttributes.length > 0 || remoteAttributes.length > 0) {
      changes.push(...this.compareAttributes(localAttributes, remoteAttributes));
    }

    return changes;
  }

  /**
   * Safely extracts slug from a page type entity
   */
  private getName(entity: PageTypeEntity): string | undefined {
    return entity.name;
  }

  /**
   * Safely extracts attributes from a page type entity
   */
  private getAttributes(entity: PageTypeEntity): readonly PageTypeAttribute[] {
    if (!("attributes" in entity) || !entity.attributes) {
      return [];
    }

    // Keep attributes that have a name property (fix: was filtering them out incorrectly)
    const filteredAttributes = entity.attributes.filter(
      (attribute) => "name" in attribute && attribute.name
    );

    return filteredAttributes as readonly PageTypeAttribute[];
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
