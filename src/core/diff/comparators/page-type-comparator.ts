import type { SaleorConfig } from "../../../modules/config/schema/schema";
import type { DiffChange } from "../types";
import { BaseEntityComparator } from "./base-comparator";

/**
 * Page type entity type for type safety
 */
type PageTypeEntity = NonNullable<SaleorConfig["pageTypes"]>[number];

/**
 * Page type attribute structure - matches AttributeInput from schema
 */
type PageTypeAttribute = import("../../../modules/config/schema/attribute.schema").AttributeInput;

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
  protected compareEntityFields(local: PageTypeEntity, remote: PageTypeEntity): DiffChange[] {
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
      changes.push(...this.compareAttributes(localAttributes, remoteAttributes));
    }

    return changes;
  }

  /**
   * Safely extracts slug from a page type entity
   */
  private getSlug(entity: PageTypeEntity): string | undefined {
    // Type guard for accessing slug property
    return "slug" in entity && typeof entity.slug === "string" ? entity.slug : undefined;
  }

  /**
   * Safely extracts attributes from a page type entity
   */
  private getAttributes(entity: PageTypeEntity): readonly PageTypeAttribute[] {
    // Type guard for accessing attributes property
    const attributes = "attributes" in entity ? entity.attributes : undefined;
    return Array.isArray(attributes) ? attributes : [];
  }

  /**
   * Gets the identifier for an attribute (either 'name' or 'attribute' property)
   */
  private getAttributeIdentifier(attr: PageTypeAttribute): string {
    // Check if it's a referenced attribute (has 'attribute' property)
    if ("attribute" in attr) {
      return attr.attribute;
    }
    // Otherwise it's a simple attribute (has 'name' property)
    if ("name" in attr) {
      return attr.name;
    }
    // Fallback - should not happen with proper types
    return "unknown";
  }

  /**
   * Compares page type attributes between local and remote
   */
  private compareAttributes(
    local: readonly PageTypeAttribute[],
    remote: readonly PageTypeAttribute[]
  ): DiffChange[] {
    const changes: DiffChange[] = [];

    const localAttrMap = new Map(local.map((attr) => [this.getAttributeIdentifier(attr), attr]));
    const remoteAttrMap = new Map(remote.map((attr) => [this.getAttributeIdentifier(attr), attr]));

    // Find added attributes
    for (const localAttr of local) {
      const identifier = this.getAttributeIdentifier(localAttr);
      if (!remoteAttrMap.has(identifier)) {
        changes.push(
          this.createFieldChange(
            "attributes",
            null,
            identifier,
            `Attribute "${identifier}" added (in config, not on Saleor)`
          )
        );
      }
    }

    // Find removed attributes
    for (const remoteAttr of remote) {
      const identifier = this.getAttributeIdentifier(remoteAttr);
      if (!localAttrMap.has(identifier)) {
        changes.push(
          this.createFieldChange(
            "attributes",
            identifier,
            null,
            `Attribute "${identifier}" removed (on Saleor, not in config)`
          )
        );
      }
    }

    return changes;
  }
}
