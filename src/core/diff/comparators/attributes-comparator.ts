import type { FullAttribute } from "../../../modules/config/schema/attribute.schema";
import type { DiffChange, DiffResult } from "../types";
import { BaseEntityComparator } from "./base-comparator";

type AttributeEntity = FullAttribute;

export class AttributesComparator extends BaseEntityComparator<
  readonly AttributeEntity[],
  readonly AttributeEntity[],
  AttributeEntity
> {
  protected readonly entityType = "Attributes" as const;

  compare(local: readonly AttributeEntity[], remote: readonly AttributeEntity[]) {
    const results: DiffResult[] = [];
    const l = this.deduplicateEntities(local);
    const r = this.deduplicateEntities(remote);
    this.validateUniqueIdentifiers(l);
    this.validateUniqueIdentifiers(r);

    const rMap = this.createEntityMap(r);
    const lMap = this.createEntityMap(l);

    for (const a of l) {
      const existing = rMap.get(this.getEntityName(a));
      if (!existing) {
        results.push(this.createCreateResult(a));
      } else {
        const changes = this.compareEntityFields(a, existing);
        if (changes.length > 0) results.push(this.createUpdateResult(a, existing, changes));
      }
    }
    for (const a of r) {
      if (!lMap.has(this.getEntityName(a))) results.push(this.createDeleteResult(a));
    }
    return results;
  }

  protected getEntityName(entity: AttributeEntity): string {
    return entity.name;
  }

  protected compareEntityFields(local: AttributeEntity, remote: AttributeEntity): DiffChange[] {
    const changes: DiffChange[] = [];
    if (local.inputType !== remote.inputType) {
      changes.push(this.createFieldChange("inputType", remote.inputType, local.inputType));
    }
    // reference entityType
    if (local.inputType === "REFERENCE" || remote.inputType === "REFERENCE") {
      const l = local.inputType === "REFERENCE" ? local.entityType : undefined;
      const r = remote.inputType === "REFERENCE" ? remote.entityType : undefined;
      if (l !== r) {
        changes.push(this.createFieldChange("entityType", r, l));
      }
    }
    // values for choice-based types (granular add/remove, grouped by formatter)
    const isChoice = (t: string) => ["DROPDOWN", "MULTISELECT", "SWATCH"].includes(t);
    const extractValues = (attribute: AttributeEntity): string[] => {
      if ("values" in attribute && Array.isArray(attribute.values)) {
        return attribute.values.map((value) => value.name);
      }
      return [];
    };
    if (isChoice(local.inputType) || isChoice(remote.inputType)) {
      const lvs = extractValues(local);
      const rvs = extractValues(remote);
      const lSet = new Set(lvs);
      const rSet = new Set(rvs);
      // additions
      for (const name of lSet) {
        if (!rSet.has(name)) {
          changes.push(
            this.createFieldChange(
              `attributes.${local.name}.values`,
              null,
              name,
              `Attribute "${local.name}" value "${name}" added`
            )
          );
        }
      }
      // removals
      for (const name of rSet) {
        if (!lSet.has(name)) {
          changes.push(
            this.createFieldChange(
              `attributes.${local.name}.values`,
              name,
              null,
              `Attribute "${local.name}" value "${name}" removed`
            )
          );
        }
      }
    }
    return changes;
  }
}
