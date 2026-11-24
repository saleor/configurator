import type { FullAttribute } from "../../../modules/config/schema/attribute.schema";
import type { EntityType } from "../types";
import { type EntityComparator, entityComparator } from "./entity-comparator";

const isReferenceType = (inputType: string) =>
  inputType === "REFERENCE" || inputType === "SINGLE_REFERENCE";

const isChoiceType = (inputType: string) =>
  ["DROPDOWN", "MULTISELECT", "SWATCH"].includes(inputType);

function valueNames(attribute: FullAttribute): string[] {
  if ("values" in attribute && Array.isArray(attribute.values)) {
    return attribute.values.map((value) => value.name);
  }
  return [];
}

/** Compares attributes of one kind (product, content or customer) by name. */
export function attributesComparator(
  entityType: EntityType = "Product Attributes"
): EntityComparator {
  return entityComparator<FullAttribute>({
    entityType,

    identify: (attribute) => attribute.name,

    compareFields(changes, desired, current) {
      changes.value("inputType", desired.inputType, current.inputType);

      if (isReferenceType(desired.inputType) || isReferenceType(current.inputType)) {
        const desiredTarget =
          isReferenceType(desired.inputType) && "entityType" in desired
            ? desired.entityType
            : undefined;
        const currentTarget =
          isReferenceType(current.inputType) && "entityType" in current
            ? current.entityType
            : undefined;
        changes.value("entityType", desiredTarget, currentTarget);
      }

      // Choice values are listed one by one; the deploy preview groups them by field.
      if (isChoiceType(desired.inputType) || isChoiceType(current.inputType)) {
        const desiredValues = new Set(valueNames(desired));
        const currentValues = new Set(valueNames(current));
        const field = `attributes.${desired.name}.values`;
        for (const name of desiredValues) {
          if (!currentValues.has(name)) {
            changes.record(["values", name], {
              field,
              kind: "added",
              current: null,
              desired: name,
              description: `Attribute "${desired.name}" value "${name}" added`,
            });
          }
        }
        for (const name of currentValues) {
          if (!desiredValues.has(name)) {
            changes.record(["values", name], {
              field,
              kind: "removed",
              current: name,
              desired: null,
              description: `Attribute "${desired.name}" value "${name}" removed`,
            });
          }
        }
      }
    },
  });
}
