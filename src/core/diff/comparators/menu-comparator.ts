import type { MenuInput } from "../../../modules/config/schema/schema";
import type { ChangeSet } from "./change-set";
import { entityComparator } from "./entity-comparator";

type MenuItemInput = NonNullable<MenuInput["items"]>[number];

/** Compares a list of menu items matched by name; `changes` is scoped to the list. */
function compareMenuItems(
  changes: ChangeSet,
  desired: MenuItemInput[],
  current: MenuItemInput[]
): void {
  const desiredByName = new Map(desired.map((item) => [item.name, item]));
  const currentByName = new Map(current.map((item) => [item.name, item]));

  for (const item of desired) {
    const currentItem = currentByName.get(item.name);
    if (!currentItem) {
      changes.record([item.name], {
        kind: "added",
        current: null,
        desired: item.name,
      });
    } else {
      compareMenuItem(changes.at(item.name), item, currentItem);
    }
  }

  for (const item of current) {
    if (!desiredByName.has(item.name)) {
      changes.record([item.name], {
        kind: "removed",
        current: item.name,
        desired: null,
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
      current: currentNames,
      desired: desiredNames,
    });
  }
}

function compareMenuItem(changes: ChangeSet, desired: MenuItemInput, current: MenuItemInput): void {
  for (const key of ["url", "category", "collection", "page"] as const) {
    if (desired[key] !== current[key]) {
      changes.record([key], {
        current: current[key] || null,
        desired: desired[key] || null,
      });
    }
  }

  if (desired.children || current.children) {
    compareMenuItems(changes.at("children"), desired.children ?? [], current.children ?? []);
  }
}

/** Compares menus by slug, including their item trees. */
export const menuComparator = entityComparator<MenuInput>({
  entityType: "Menus",

  identify(menu) {
    if (!menu.slug) {
      throw new Error("Menu must have a valid slug");
    }
    return menu.slug;
  },

  compareFields(changes, desired, current) {
    changes.value("name", desired.name, current.name);
    compareMenuItems(changes.at("items"), desired.items ?? [], current.items ?? []);
  },
});
