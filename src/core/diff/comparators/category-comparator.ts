import { type FlatCategory, flattenCategories } from "../../../modules/category/category-tree";
import type { CategoryInput } from "../../../modules/config/schema/schema";
import { entityComparator } from "./entity-comparator";

/**
 * Compares categories one by one, the way Saleor stores them and deploy writes them: a
 * subcategory's changes are reported on the subcategory, not on the top-level category above it.
 */
export const categoryComparator = entityComparator<FlatCategory>({
  entityType: "Categories",
  entities: (section) => flattenCategories(section as CategoryInput[]),
  identify: (category) => category.slug,

  compareFields(changes, desired, current) {
    changes.value("name", desired.name, current.name);
    changes.value("parent", desired.parent, current.parent);
    changes.metadata(desired, current);
  },
});
