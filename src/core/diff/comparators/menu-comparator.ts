import { BaseEntityComparator } from "./base-comparator";
import type { DiffResult, DiffChange, EntityType } from "../types";
import type { MenuInput } from "../../../modules/config/schema/schema";
import type { Menu, MenuItem } from "../../../modules/menu/repository";

interface MenuItemInput {
  name: string;
  url?: string;
  category?: string;
  collection?: string;
  page?: string;
  children?: MenuItemInput[];
}

export class MenuComparator extends BaseEntityComparator<
  readonly MenuInput[],
  readonly Menu[],
  MenuInput | Menu
> {
  protected readonly entityType: EntityType = "Menus";

  compare(local: readonly MenuInput[], remote: readonly Menu[]): readonly DiffResult[] {
    // Validate and deduplicate local menus
    this.validateUniqueIdentifiers(local);
    const deduplicatedLocal = this.deduplicateEntities(local);

    const results: DiffResult[] = [];
    const localMap = this.createEntityMap(deduplicatedLocal);
    const remoteMap = this.createEntityMap(remote);

    // Check for menus to create or update
    for (const localMenu of deduplicatedLocal) {
      const remoteMenu = remoteMap.get(this.getEntityName(localMenu));

      if (!remoteMenu) {
        // Menu doesn't exist in remote, create it
        results.push(this.createCreateResult(localMenu));
      } else {
        // Menu exists, check for updates
        const changes = this.compareEntityFields(localMenu, remoteMenu);
        if (changes.length > 0) {
          results.push(this.createUpdateResult(localMenu, remoteMenu, changes));
        }
      }
    }

    // Check for menus to delete (exists in remote but not in local)
    for (const remoteMenu of remote) {
      if (!localMap.has(this.getEntityName(remoteMenu))) {
        results.push(this.createDeleteResult(remoteMenu));
      }
    }

    return results;
  }

  protected getEntityName(entity: MenuInput | Menu): string {
    if (!entity.slug) {
      throw new Error("Menu must have a valid slug");
    }
    return entity.slug;
  }

  protected compareEntityFields(local: MenuInput, remote: Menu): DiffChange[] {
    const changes: DiffChange[] = [];

    // Compare basic fields
    if (local.name !== remote.name) {
      changes.push(this.createFieldChange("name", remote.name, local.name));
    }

    // Compare menu items
    const localItems = this.normalizeMenuItems(local.items ?? []);
    const remoteItems = this.normalizeMenuItems(remote.items ?? []);

    const itemChanges = this.compareMenuItems(localItems, remoteItems, "items");
    changes.push(...itemChanges);

    return changes;
  }

  private normalizeMenuItems(items: MenuItemInput[] | MenuItem[]): MenuItemInput[] {
    return items.map((item: any) => ({
      name: item.name,
      url: item.url || undefined,
      category: item.category?.slug || item.category || undefined,
      collection: item.collection?.slug || item.collection || undefined,
      page: item.page?.slug || item.page || undefined,
      children: item.children ? this.normalizeMenuItems(item.children) : undefined,
    }));
  }

  private compareMenuItems(
    local: MenuItemInput[],
    remote: MenuItemInput[],
    path: string
  ): DiffChange[] {
    const changes: DiffChange[] = [];

    // Create maps for comparison based on item names
    const localMap = new Map(local.map((item) => [item.name, item]));
    const remoteMap = new Map(remote.map((item) => [item.name, item]));

    // Find added items
    for (const localItem of local) {
      const remoteItem = remoteMap.get(localItem.name);
      
      if (!remoteItem) {
        changes.push(
          this.createFieldChange(
            path,
            null,
            localItem.name,
            `Menu item "${localItem.name}" added`
          )
        );
      } else {
        // Compare existing items
        const itemChanges = this.compareMenuItem(localItem, remoteItem, `${path}/${localItem.name}`);
        changes.push(...itemChanges);
      }
    }

    // Find removed items
    for (const remoteItem of remote) {
      if (!localMap.has(remoteItem.name)) {
        changes.push(
          this.createFieldChange(
            path,
            remoteItem.name,
            null,
            `Menu item "${remoteItem.name}" removed`
          )
        );
      }
    }

    // Check if order has changed
    const localNames = local.map(item => item.name);
    const remoteNames = remote.map(item => item.name);
    
    if (JSON.stringify(localNames) !== JSON.stringify(remoteNames) && 
        localNames.length === remoteNames.length &&
        localNames.every(name => remoteNames.includes(name))) {
      changes.push(
        this.createFieldChange(
          `${path}.order`,
          remoteNames,
          localNames,
          `Menu items reordered: [${remoteNames.join(", ")}] → [${localNames.join(", ")}]`
        )
      );
    }

    return changes;
  }

  private compareMenuItem(
    local: MenuItemInput,
    remote: MenuItemInput,
    path: string
  ): DiffChange[] {
    const changes: DiffChange[] = [];

    // Compare URL
    if (local.url !== remote.url) {
      changes.push(
        this.createFieldChange(
          `${path}.url`,
          remote.url || null,
          local.url || null
        )
      );
    }

    // Compare category reference
    if (local.category !== remote.category) {
      changes.push(
        this.createFieldChange(
          `${path}.category`,
          remote.category || null,
          local.category || null
        )
      );
    }

    // Compare collection reference
    if (local.collection !== remote.collection) {
      changes.push(
        this.createFieldChange(
          `${path}.collection`,
          remote.collection || null,
          local.collection || null
        )
      );
    }

    // Compare page reference
    if (local.page !== remote.page) {
      changes.push(
        this.createFieldChange(
          `${path}.page`,
          remote.page || null,
          local.page || null
        )
      );
    }

    // Recursively compare children
    if (local.children || remote.children) {
      const childChanges = this.compareMenuItems(
        local.children ?? [],
        remote.children ?? [],
        `${path}/children`
      );
      changes.push(...childChanges);
    }

    return changes;
  }
}