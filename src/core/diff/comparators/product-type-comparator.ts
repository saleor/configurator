import type { AttributeInput } from "../../../modules/config/schema/attribute.schema";
import type { SaleorConfig } from "../../../modules/config/schema/schema";
import type { ChangeSet } from "./change-set";
import { entityComparator } from "./entity-comparator";

type ProductTypeEntity = NonNullable<SaleorConfig["productTypes"]>[number];

type AttributeList = "productAttributes" | "variantAttributes";

/** Get the name of an attribute (handles both inline and referenced formats) */
function getAttributeName(attr: AttributeInput): string {
  return "attribute" in attr ? attr.attribute : attr.name;
}

/** Get variantSelection value, treating undefined as false */
function getVariantSelection(attr: AttributeInput): boolean {
  return "variantSelection" in attr ? Boolean(attr.variantSelection) : false;
}

function attributesOf(productType: ProductTypeEntity, list: AttributeList) {
  return (productType[list] ?? []) as readonly AttributeInput[];
}

const ATTRIBUTE_LISTS: readonly AttributeList[] = ["productAttributes", "variantAttributes"];

/** Compares product types by name, including which attributes they assign. */
export const productTypeComparator = entityComparator<ProductTypeEntity>({
  entityType: "Product Types",

  identify: (productType) => productType.name,

  describeCreate(changes, desired) {
    for (const list of ATTRIBUTE_LISTS) {
      for (const name of new Set(attributesOf(desired, list).map(getAttributeName))) {
        changes.record([list, name], {
          kind: "added",
          current: null,
          desired: name,
        });
      }
    }
  },

  compareFields(changes, desired, current) {
    for (const list of ATTRIBUTE_LISTS) {
      compareAttributes(changes.at(list), attributesOf(desired, list), attributesOf(current, list));
    }
  },
});

function compareAttributes(
  changes: ChangeSet,
  desired: readonly AttributeInput[],
  current: readonly AttributeInput[]
): void {
  const desiredByName = new Map(desired.map((a) => [getAttributeName(a), a]));
  const currentByName = new Map(current.map((a) => [getAttributeName(a), a]));

  for (const [name, desiredAttribute] of desiredByName) {
    const currentAttribute = currentByName.get(name);
    if (!currentAttribute) {
      changes.record([name], {
        kind: "added",
        current: null,
        desired: name,
      });
      continue;
    }

    const desiredSelection = getVariantSelection(desiredAttribute);
    const currentSelection = getVariantSelection(currentAttribute);
    if (desiredSelection !== currentSelection) {
      changes.record([name, "variantSelection"], {
        current: currentSelection,
        desired: desiredSelection,
      });
    }
  }

  for (const name of currentByName.keys()) {
    if (!desiredByName.has(name)) {
      changes.record([name], {
        kind: "removed",
        current: name,
        desired: null,
      });
    }
  }
}
