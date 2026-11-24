import type { CustomerTypeInput } from "../../../modules/config/schema/schema";
import { entityComparator } from "./entity-comparator";

/** Attributes arrive as `{ attribute: "Name" }` references after introspect normalization. */
type CustomerTypeAttribute = { attribute: string } | { name: string };

/**
 * Compares customer types by slug — unlike page types, Saleor exposes a real unique slug for
 * customer types.
 */
export const customerTypeComparator = entityComparator<CustomerTypeInput>({
  entityType: "Customer Types",

  identify: (customerType) => customerType.slug,

  compareFields(changes, desired, current) {
    changes.value("name", desired.name, current.name);
    // Default to false: the schema defaults it, and Saleor always reports a boolean.
    changes.value("isDefault", desired.isDefault ?? false, current.isDefault ?? false);

    const desiredNames = new Set((desired.attributes ?? []).map(attributeName));
    const currentNames = new Set((current.attributes ?? []).map(attributeName));
    for (const name of desiredNames) {
      if (!currentNames.has(name)) {
        changes.record(["attributes", name], {
          kind: "added",
          current: null,
          desired: name,
        });
      }
    }
    for (const name of currentNames) {
      if (!desiredNames.has(name)) {
        changes.record(["attributes", name], {
          kind: "removed",
          current: name,
          desired: null,
        });
      }
    }
  },
});

function attributeName(attribute: CustomerTypeAttribute): string {
  return "attribute" in attribute ? attribute.attribute : attribute.name;
}
