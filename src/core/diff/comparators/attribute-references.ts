import type { AttributeInput } from "../../../modules/config/schema/attribute.schema";
import type { ChangeSet } from "./change-set";

/** The attribute's name, whether it is defined inline (`name`) or referenced (`attribute`). */
function attributeName(attribute: AttributeInput): string {
  return "attribute" in attribute ? attribute.attribute : attribute.name;
}

/**
 * Records attributes assigned on only one side as `attributes.<name>` members. Introspect reads
 * every assigned attribute back as a reference, so inline and referenced attributes match by name.
 */
export function compareAssignedAttributes(
  changes: ChangeSet,
  desired: readonly AttributeInput[],
  current: readonly AttributeInput[]
): void {
  const desiredNames = new Set(desired.map(attributeName));
  const currentNames = new Set(current.map(attributeName));
  for (const name of desiredNames) {
    if (!currentNames.has(name)) {
      changes.record(["attributes", name], { kind: "added", current: null, desired: name });
    }
  }
  for (const name of currentNames) {
    if (!desiredNames.has(name)) {
      changes.record(["attributes", name], { kind: "removed", current: name, desired: null });
    }
  }
}
