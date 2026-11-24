import type { CategoryInput } from "../config/schema/schema";

/**
 * One category as Saleor stores it. The config nests subcategories; Saleor keeps each category
 * as its own object with a parent, and deploy creates and updates them one by one.
 */
export interface FlatCategory {
  readonly name: string;
  readonly slug: string;
  /** Slug of the parent category; absent for top-level categories. */
  readonly parent?: string;
  readonly metadata?: CategoryInput["metadata"];
}

/** Lists every category in a tree, each parent before its subcategories. */
export function flattenCategories(
  categories: readonly CategoryInput[],
  parent?: string
): FlatCategory[] {
  return categories.flatMap((category) => {
    const { subcategories, ...fields } = category as CategoryInput & {
      subcategories?: readonly CategoryInput[];
    };
    const flat: FlatCategory = { ...fields, ...(parent === undefined ? {} : { parent }) };
    return [flat, ...flattenCategories(subcategories ?? [], category.slug)];
  });
}
