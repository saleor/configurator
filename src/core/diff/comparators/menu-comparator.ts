import type { MenuInput } from "../../../modules/config/schema/schema";
import type { Menu, MenuItem } from "../../../modules/menu/repository";
import type { ChangeSet } from "./change-set";
import { entityComparator } from "./entity-comparator";

interface MenuItemInput {
  name: string;
  url?: string;
  category?: string;
  collection?: string;
  page?: string;
  children?: MenuItemInput[];
}

type MenuEntity = MenuInput | Menu;

/** Reads a reference that is a slug in the config and `{ slug }` in Saleor's shape. */
function referenceSlug(item: MenuItemInput | MenuItem, key: "category" | "collection" | "page") {
  const value = (item as Record<string, unknown>)[key];
  if (value && typeof value === "object" && "slug" in value) {
    return (value as { slug: string }).slug;
  }
  return typeof value === "string" ? value : undefined;
}

function normalizeMenuItems(items: MenuItemInput[] | MenuItem[]): MenuItemInput[] {
  return items.map((item: MenuItemInput | MenuItem) => ({
    name: item.name,
    url: item.url ?? undefined,
    category: referenceSlug(item, "category"),
    collection: referenceSlug(item, "collection"),
    page: referenceSlug(item, "page"),
    children:
      "children" in item && item.children
        ? normalizeMenuItems(item.children as MenuItemInput[])
        : undefined,
  }));
}

/**
 * Compares a list of menu items matched by name. `field` is the legacy slash-separated
 * location of the list (e.g. `items/Shop/children`); `changes` is scoped to the same list.
 */
function compareMenuItems(
  changes: ChangeSet,
  desired: MenuItemInput[],
  current: MenuItemInput[],
  field: string
): void {
  const desiredByName = new Map(desired.map((item) => [item.name, item]));
  const currentByName = new Map(current.map((item) => [item.name, item]));

  for (const item of desired) {
    const currentItem = currentByName.get(item.name);
    if (!currentItem) {
      changes.record([item.name], {
        field,
        kind: "added",
        current: null,
        desired: item.name,
        description: `Menu item "${item.name}" added`,
      });
    } else {
      compareMenuItem(changes.at(item.name), item, currentItem, `${field}/${item.name}`);
    }
  }

  for (const item of current) {
    if (!desiredByName.has(item.name)) {
      changes.record([item.name], {
        field,
        kind: "removed",
        current: item.name,
        desired: null,
        description: `Menu item "${item.name}" removed`,
      });
    }
  }

  const desiredNames = desired.map((item) => item.name);
  const currentNames = current.map((item) => item.name);
  if (
    JSON.stringify(desiredNames) !== JSON.stringify(currentNames) &&
    desiredNames.length === currentNames.length &&
    desiredNames.every((name) => currentNames.includes(name))
  ) {
    changes.record(["order"], {
      field: `${field}.order`,
      current: currentNames,
      desired: desiredNames,
      description: `Menu items reordered: [${currentNames.join(", ")}] → [${desiredNames.join(", ")}]`,
    });
  }
}

function compareMenuItem(
  changes: ChangeSet,
  desired: MenuItemInput,
  current: MenuItemInput,
  field: string
): void {
  for (const key of ["url", "category", "collection", "page"] as const) {
    if (desired[key] !== current[key]) {
      changes.record([key], {
        field: `${field}.${key}`,
        current: current[key] || null,
        desired: desired[key] || null,
      });
    }
  }

  if (desired.children || current.children) {
    compareMenuItems(
      changes.at("children"),
      desired.children ?? [],
      current.children ?? [],
      `${field}/children`
    );
  }
}

/** Compares menus by slug, including their item trees. */
export const menuComparator = entityComparator<MenuEntity>({
  entityType: "Menus",

  identify(menu) {
    if (!menu.slug) {
      throw new Error("Menu must have a valid slug");
    }
    return menu.slug;
  },

  compareFields(changes, desired, current) {
    changes.value("name", desired.name, current.name);
    compareMenuItems(
      changes.at("items"),
      normalizeMenuItems(desired.items ?? []),
      normalizeMenuItems(current.items ? current.items : []),
      "items"
    );
  },
});
