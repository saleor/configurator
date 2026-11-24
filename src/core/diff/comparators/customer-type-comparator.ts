import type { CustomerTypeInput } from "../../../modules/config/schema/schema";
import { compareAssignedAttributes } from "./attribute-references";
import { entityComparator } from "./entity-comparator";

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
    compareAssignedAttributes(changes, desired.attributes ?? [], current.attributes ?? []);
  },
});
