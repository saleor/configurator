import type { SimpleAttribute } from "../../../modules/config/schema/attribute.schema";
import { schemaHelpers } from "../../../modules/config/schema/helpers.schema";
import type { SaleorConfig } from "../../../modules/config/schema/schema";
import type { DiffChange } from "../types";
import { BaseEntityComparator } from "./base-comparator";

/**
 * Product type entity type for type safety
 */
type ProductTypeEntity = NonNullable<SaleorConfig["productTypes"]>[number];

/**
 * Product type attribute structure
 */
type ProductTypeAttribute = SimpleAttribute;

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
    productAttributes: readonly ProductTypeAttribute[];
    variantAttributes: readonly ProductTypeAttribute[];
  } {
    // Type assertion is safe here since we're accessing a known property
    const productAttributes = (productType.productAttributes ?? []).filter(
      (attr) => !("attribute" in attr)
    ) as SimpleAttribute[];
    const variantAttributes = (productType.variantAttributes ?? []).filter(
      (attr) => !("attribute" in attr)
    ) as SimpleAttribute[];

    return { productAttributes, variantAttributes };
  }

  /**
   * Compares product type attributes between local and remote
   */
  private compareAttributes(
    local: readonly ProductTypeAttribute[],
    remote: readonly ProductTypeAttribute[],
    isCreating: boolean = false
  ): DiffChange[] {
    const changes: DiffChange[] = [];

    const localAttrMap = new Map(local.map((attr) => [attr.name, attr]));
    const remoteAttrMap = new Map(remote.map((attr) => [attr.name, attr]));

    // Find added attributes
    for (const localAttr of local) {
      if (!remoteAttrMap.has(localAttr.name)) {
        // Use different description based on whether we're creating or updating
        const description = isCreating
          ? `Attribute "${localAttr.name}" will be created`
          : `Attribute "${localAttr.name}" added`;

        changes.push(this.createFieldChange("attributes", null, localAttr.name, description));
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
            `Attribute "${remoteAttr.name}" removed`
          )
        );
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
      changes.push(
        this.createFieldChange(
          `attributes.${local.name}.inputType`,
          remote.inputType,
          local.inputType,
          `Attribute "${local.name}" input type changed from "${remote.inputType}" to "${local.inputType}"`
        )
      );
    }

    // Compare attribute values if they exist
    if (
      schemaHelpers.isMultipleValuesAttribute(local) &&
      schemaHelpers.isMultipleValuesAttribute(remote)
    ) {
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
    const localValues = schemaHelpers.isMultipleValuesAttribute(local) ? local.values : [];
    const remoteValues = schemaHelpers.isMultipleValuesAttribute(remote) ? remote.values : [];

    const localValueNames = new Set(localValues.map((v) => v.name));
    const remoteValueNames = new Set(remoteValues.map((v) => v.name));

    // Find added values
    for (const localValue of localValues) {
      if (!remoteValueNames.has(localValue.name)) {
        changes.push(
          this.createFieldChange(
            `attributes.${local.name}.values`,
            null,
            localValue.name,
            `Attribute "${local.name}" value "${localValue.name}" added`
          )
        );
      }
    }

    // Find removed values
    for (const remoteValue of remoteValues) {
      if (!localValueNames.has(remoteValue.name)) {
        changes.push(
          this.createFieldChange(
            `attributes.${local.name}.values`,
            remoteValue.name,
            null,
            `Attribute "${local.name}" value "${remoteValue.name}" removed`
          )
        );
      }
    }

    return changes;
  }
}
