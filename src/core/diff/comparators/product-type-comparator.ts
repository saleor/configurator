import type { AttributeInput } from "../../../modules/config/schema/attribute.schema";
import type { SaleorConfig } from "../../../modules/config/schema/schema";
import type { DiffChange } from "../types";
import { BaseEntityComparator } from "./base-comparator";

/**
 * Product type entity type for type safety
 */
type ProductTypeEntity = NonNullable<SaleorConfig["productTypes"]>[number];

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
    // Validate unique identifiers in local (names for product types - no slugs in API)
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
        // For new product types, analyze attributes that will be created
        const { productAttributes, variantAttributes } = this.getAttributes(localPT);
        const changes: DiffChange[] = [];

        // Compare against empty attributes array to show what will be created
        if (productAttributes.length > 0) {
          changes.push(...this.compareAttributes(productAttributes, [], true));
        }

        if (variantAttributes.length > 0) {
          changes.push(...this.compareAttributes(variantAttributes, [], true));
        }

        // Create result with changes if attributes exist, otherwise basic create
        if (changes.length > 0) {
          results.push({
            operation: "CREATE",
            entityType: this.entityType,
            entityName: this.getEntityName(localPT),
            desired: localPT,
            changes,
          });
        } else {
          results.push(this.createCreateResult(localPT));
        }
      } else {
        // Check for updates
        const changes = this.compareEntityFields(localPT, remotePT);
        if (changes.length > 0) {
          results.push(this.createUpdateResult(localPT, remotePT, changes));
        }
      }
    }

    // Check for deletes
    for (const remotePT of deduplicatedRemote) {
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
    return entity.name;
  }

  /**
   * Compares fields between local and remote product type entities
   */
  protected compareEntityFields(local: ProductTypeEntity, remote: ProductTypeEntity): DiffChange[] {
    const changes: DiffChange[] = [];

    // Compare attributes if they exist
    const { productAttributes: localProductAttributes, variantAttributes: localVariantAttributes } =
      this.getAttributes(local);
    const {
      productAttributes: remoteProductAttributes,
      variantAttributes: remoteVariantAttributes,
    } = this.getAttributes(remote);

    if (localProductAttributes.length > 0 || remoteProductAttributes.length > 0) {
      changes.push(
        ...this.compareAttributes(localProductAttributes, remoteProductAttributes, false)
      );
    }

    if (localVariantAttributes.length > 0 || remoteVariantAttributes.length > 0) {
      changes.push(
        ...this.compareAttributes(localVariantAttributes, remoteVariantAttributes, false)
      );
    }

    return changes;
  }

  /**
   * Safely extracts attributes from a product type entity
   */
  private getAttributes(productType: ProductTypeEntity): {
    productAttributes: readonly AttributeInput[];
    variantAttributes: readonly AttributeInput[];
  } {
    const productAttributes = (productType.productAttributes ?? []) as readonly AttributeInput[];
    const variantAttributes = (productType.variantAttributes ?? []) as readonly AttributeInput[];
    return { productAttributes, variantAttributes };
  }

  /**
   * Compares product type attributes between local and remote
   */
  private compareAttributes(
    local: readonly AttributeInput[],
    remote: readonly AttributeInput[],
    isCreating: boolean = false
  ): DiffChange[] {
    const changes: DiffChange[] = [];

    const getName = (a: AttributeInput): string => ("attribute" in a ? a.attribute : a.name);
    const lNames = new Set(local.map(getName));
    const rNames = new Set(remote.map(getName));

    for (const name of lNames) {
      if (!rNames.has(name)) {
        const description = isCreating
          ? `Attribute "${name}" will be created`
          : `Attribute "${name}" added`;
        changes.push(this.createFieldChange("attributes", null, name, description));
      }
    }

    for (const name of rNames) {
      if (!lNames.has(name)) {
        changes.push(
          this.createFieldChange("attributes", name, null, `Attribute "${name}" removed`)
        );
      }
    }

    // No detailed comparison of inputType/values at assignment level
    return changes;
  }

  /**
   * Compares detailed properties of matching attributes
   */
  // Remove detailed attribute comparison at product type level
}
