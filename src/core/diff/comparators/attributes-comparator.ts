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
    // values for choice-based types
    const isChoice = (t: string) => ["DROPDOWN", "MULTISELECT", "SWATCH"].includes(t);
    if (isChoice(local.inputType) || isChoice(remote.inputType)) {
      const lv = "values" in local && Array.isArray((local as unknown as { values?: { name: string }[] }).values)
        ? ((local as unknown as { values?: { name: string }[] }).values ?? []).map((v) => v.name)
        : [];
      const rv = "values" in remote && Array.isArray((remote as unknown as { values?: { name: string }[] }).values)
        ? ((remote as unknown as { values?: { name: string }[] }).values ?? []).map((v) => v.name)
        : [];
      const toKeyed = (arr: string[]) => [...arr].sort().join(",");
      if (toKeyed(lv) !== toKeyed(rv)) {
        changes.push(this.createFieldChange("values", rv, lv));
      }
    }
    return changes;
  }
}
