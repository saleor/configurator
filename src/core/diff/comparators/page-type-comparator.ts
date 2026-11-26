import type { ModelTypeInput, PageTypeInput } from "../../../modules/config/schema/schema";
import { compareAssignedAttributes } from "./attribute-references";
import { type EntityComparator, entityComparator } from "./entity-comparator";
import { isUnmanagedField } from "./field-comparison";

type PageTypeEntity = PageTypeInput | ModelTypeInput;

/** Compares page types, or model types (the same Saleor object), by name. */
export function pageTypeComparator(entityType: "Page Types" | "Model Types"): EntityComparator {
  return entityComparator<PageTypeEntity>({
    entityType,

    identify: (pageType) => pageType.name,

    compareFields(changes, desired, current) {
      changes.value("name", desired.name, current.name);

      const desiredAttributes = "attributes" in desired ? desired.attributes : undefined;
      const currentAttributes = "attributes" in current ? current.attributes : undefined;
      // Deploy leaves the attributes of a type that doesn't list any as they are.
      if (isUnmanagedField(desiredAttributes, changes.options)) return;
      compareAssignedAttributes(changes, desiredAttributes ?? [], currentAttributes ?? []);
    },
  });
}
