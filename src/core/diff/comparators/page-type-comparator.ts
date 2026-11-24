import type { SaleorConfig } from "../../../modules/config/schema/schema";
import { entityComparator } from "./entity-comparator";

type PageTypeEntity = NonNullable<SaleorConfig["pageTypes"]>[number];

/** The attributes compared on a page type: only those with a `name`. */
function attributeNames(pageType: PageTypeEntity): string[] {
  if (!("attributes" in pageType) || !pageType.attributes) return [];
  return pageType.attributes.flatMap((attribute) =>
    "name" in attribute && attribute.name ? [attribute.name] : []
  );
}

/** Compares page types (and model types) by name. */
export const pageTypeComparator = entityComparator<PageTypeEntity>({
  entityType: "Page Types",

  identify: (pageType) => pageType.name,

  compareFields(changes, desired, current) {
    changes.value("name", desired.name, current.name);

    const desiredNames = attributeNames(desired);
    const currentNames = attributeNames(current);
    const desiredSet = new Set(desiredNames);
    const currentSet = new Set(currentNames);

    for (const name of desiredNames) {
      if (!currentSet.has(name)) {
        changes.record(["attributes", name], {
          kind: "added",
          current: null,
          desired: name,
        });
      }
    }
    for (const name of currentNames) {
      if (!desiredSet.has(name)) {
        changes.record(["attributes", name], {
          kind: "removed",
          current: name,
          desired: null,
        });
      }
    }
  },
});
