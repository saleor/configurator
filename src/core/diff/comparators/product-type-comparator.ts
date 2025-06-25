import type { SaleorConfig } from "../../../modules/config/schema";
import type { DiffChange } from "../types";
import { BaseEntityComparator } from "./base-comparator";

/**
 * Product type entity type for type safety
 */
type ProductTypeEntity = NonNullable<SaleorConfig["productTypes"]>[number];

/**
 * Product type attribute structure
 */
interface ProductTypeAttribute {
  readonly name: string;
  readonly inputType?: string;
  readonly values?: readonly { readonly name: string }[];
}

/**
 * Comparator for product type entities
 */
export class ProductTypeComparator extends BaseEntityComparator<
  readonly ProductTypeEntity[],
  readonly ProductTypeEntity[],
  ProductTypeEntity
> {
  protected readonly entityType = "Product Types";

  /**
   * Compares local and remote product type arrays
   */
  compare(
    local: readonly ProductTypeEntity[],
    remote: readonly ProductTypeEntity[]
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
   * Gets the name of a product type entity
   */
  protected getEntityName(entity: ProductTypeEntity): string {
    if (!entity.name || typeof entity.name !== 'string') {
      throw new Error('Product type entity must have a valid name');
    }
    return entity.name;
  }

  /**
   * Compares fields between local and remote product type entities
   */
  protected compareEntityFields(local: ProductTypeEntity, remote: ProductTypeEntity): DiffChange[] {
    const changes: DiffChange[] = [];

    // Compare attributes if they exist
    const localAttributes = this.getAttributes(local);
    const remoteAttributes = this.getAttributes(remote);
    
    if (localAttributes.length > 0 || remoteAttributes.length > 0) {
      changes.push(...this.compareAttributes(localAttributes, remoteAttributes));
    }

    return changes;
  }

  /**
   * Safely extracts attributes from a product type entity
   */
  private getAttributes(entity: ProductTypeEntity): readonly ProductTypeAttribute[] {
    // Type assertion is safe here since we're accessing a known property
    const attributes = (entity as any).attributes;
    return Array.isArray(attributes) ? attributes : [];
  }

  /**
   * Compares product type attributes between local and remote
   */
  private compareAttributes(
    local: readonly ProductTypeAttribute[],
    remote: readonly ProductTypeAttribute[]
  ): DiffChange[] {
    const changes: DiffChange[] = [];
    
    const localAttrMap = new Map(local.map(attr => [attr.name, attr]));
    const remoteAttrMap = new Map(remote.map(attr => [attr.name, attr]));
    
    // Find added attributes
    for (const localAttr of local) {
      if (!remoteAttrMap.has(localAttr.name)) {
        changes.push(this.createFieldChange(
          'attributes',
          null,
          localAttr.name,
          `Attribute "${localAttr.name}" added (in config, not on Saleor)`
        ));
      }
    }
    
    // Find removed attributes
    for (const remoteAttr of remote) {
      if (!localAttrMap.has(remoteAttr.name)) {
        changes.push(this.createFieldChange(
          'attributes',
          remoteAttr.name,
          null,
          `Attribute "${remoteAttr.name}" removed (on Saleor, not in config)`
        ));
      }
    }

    // Find modified attributes (same name but different properties)
    for (const localAttr of local) {
      const remoteAttr = remoteAttrMap.get(localAttr.name);
      if (remoteAttr) {
        changes.push(...this.compareAttributeDetails(localAttr, remoteAttr));
      }
    }

    return changes;
  }

  /**
   * Compares detailed properties of matching attributes
   */
  private compareAttributeDetails(
    local: ProductTypeAttribute,
    remote: ProductTypeAttribute
  ): DiffChange[] {
    const changes: DiffChange[] = [];

    // Compare input type
    if (local.inputType !== remote.inputType) {
      changes.push(this.createFieldChange(
        `attributes.${local.name}.inputType`,
        remote.inputType,
        local.inputType,
        `Attribute "${local.name}" input type changed from "${remote.inputType}" to "${local.inputType}"`
      ));
    }

    // Compare attribute values if they exist
    if (local.values || remote.values) {
      changes.push(...this.compareAttributeValues(local, remote));
    }

    return changes;
  }

  /**
   * Compares attribute values for dropdown/multi-select attributes
   */
  private compareAttributeValues(
    local: ProductTypeAttribute,
    remote: ProductTypeAttribute
  ): DiffChange[] {
    const changes: DiffChange[] = [];
    const localValues = local.values || [];
    const remoteValues = remote.values || [];
    
    const localValueNames = new Set(localValues.map(v => v.name));
    const remoteValueNames = new Set(remoteValues.map(v => v.name));
    
    // Find added values
    for (const localValue of localValues) {
      if (!remoteValueNames.has(localValue.name)) {
        changes.push(this.createFieldChange(
          `attributes.${local.name}.values`,
          null,
          localValue.name,
          `Attribute "${local.name}" value "${localValue.name}" added`
        ));
      }
    }
    
    // Find removed values
    for (const remoteValue of remoteValues) {
      if (!localValueNames.has(remoteValue.name)) {
        changes.push(this.createFieldChange(
          `attributes.${local.name}.values`,
          remoteValue.name,
          null,
          `Attribute "${local.name}" value "${remoteValue.name}" removed`
        ));
      }
    }

    return changes;
  }
} 