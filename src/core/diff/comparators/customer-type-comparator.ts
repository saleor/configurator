import type { CustomerTypeInput } from "../../../modules/config/schema/schema";
import type { DiffChange, DiffResult, EntityType } from "../types";
import { BaseEntityComparator, type ComparatorOptions } from "./base-comparator";

/** Attributes arrive as `{ attribute: "Name" }` references after introspect normalization. */
type CustomerTypeAttribute = { attribute: string } | { name: string };

/**
 * Comparator for customer types. Identified by slug — unlike page types,
 * Saleor exposes a real unique slug for customer types.
 */
export class CustomerTypeComparator extends BaseEntityComparator<
  readonly CustomerTypeInput[],
  readonly CustomerTypeInput[],
  CustomerTypeInput
> {
  protected readonly entityType: EntityType = "Customer Types";

  compare(
    local: readonly CustomerTypeInput[],
    remote: readonly CustomerTypeInput[]
  ): readonly DiffResult[] {
    this.validateUniqueIdentifiers(local);

    const deduplicatedRemote = this.deduplicateEntities(remote);

    const results: DiffResult[] = [];
    const remoteBySlug = this.createEntityMap(deduplicatedRemote);
    const localBySlug = this.createEntityMap(local);

    for (const localType of local) {
      const remoteType = remoteBySlug.get(this.getEntityName(localType));

      if (!remoteType) {
        results.push(this.createCreateResult(localType));
        continue;
      }

      const changes = this.compareEntityFields(localType, remoteType);
      if (changes.length > 0) {
        results.push(this.createUpdateResult(localType, remoteType, changes));
      }
    }

    for (const remoteType of deduplicatedRemote) {
      if (!localBySlug.has(this.getEntityName(remoteType))) {
        results.push(this.createDeleteResult(remoteType));
      }
    }

    return results;
  }

  protected getEntityName(entity: CustomerTypeInput): string {
    return entity.slug;
  }

  protected compareEntityFields(
    local: CustomerTypeInput,
    remote: CustomerTypeInput,
    _options?: ComparatorOptions
  ): DiffChange[] {
    const changes: DiffChange[] = [];

    if (local.name !== remote.name) {
      changes.push(this.createFieldChange("name", remote.name, local.name));
    }

    // Default to false: the schema defaults it, and Saleor always reports a boolean.
    const localIsDefault = local.isDefault ?? false;
    const remoteIsDefault = remote.isDefault ?? false;
    if (localIsDefault !== remoteIsDefault) {
      changes.push(this.createFieldChange("isDefault", remoteIsDefault, localIsDefault));
    }

    changes.push(...this.compareAttributes(local.attributes ?? [], remote.attributes ?? []));

    return changes;
  }

  private compareAttributes(
    local: readonly CustomerTypeAttribute[],
    remote: readonly CustomerTypeAttribute[]
  ): DiffChange[] {
    const localNames = new Set(local.map(attributeName));
    const remoteNames = new Set(remote.map(attributeName));

    const added = [...localNames]
      .filter((name) => !remoteNames.has(name))
      .map((name) =>
        this.createFieldChange(
          "attributes",
          null,
          name,
          `Attribute "${name}" added (in config, not on Saleor)`
        )
      );

    const removed = [...remoteNames]
      .filter((name) => !localNames.has(name))
      .map((name) =>
        this.createFieldChange(
          "attributes",
          name,
          null,
          `Attribute "${name}" removed (on Saleor, not in config)`
        )
      );

    return [...added, ...removed];
  }
}

function attributeName(attribute: CustomerTypeAttribute): string {
  return "attribute" in attribute ? attribute.attribute : attribute.name;
}
