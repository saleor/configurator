import { logger } from "../../lib/logger";
// Note: Menu-related GraphQL types are handled via gql.tada typed queries
import { ServiceErrorWrapper } from "../../lib/utils/error-wrapper";
import { object } from "../../lib/utils/object";
import type { CategoryService } from "../category/category-service";
import type { CollectionService } from "../collection/collection-service";
import { EntityNotFoundError } from "../config/errors";
import type { ModelService } from "../model/model-service";
import { MenuError, MenuOperationError, MenuValidationError } from "./errors";
import type {
  Menu,
  MenuCreateInput,
  MenuInput,
  MenuItem,
  MenuItemCreateInput,
  MenuOperations,
} from "./repository";

interface MenuItemInputConfig {
  name: string;
  url?: string;
  category?: string; // Category slug
  collection?: string; // Collection slug
  page?: string; // Page slug
  children?: MenuItemInputConfig[];
}

interface MenuInputConfig {
  name: string;
  slug: string;
  items?: MenuItemInputConfig[];
}

const MENU_ITEM_REFERENCE_KINDS = ["category", "collection", "page"] as const;
type MenuItemReferenceKind = (typeof MENU_ITEM_REFERENCE_KINDS)[number];
/** Resolved entity IDs keyed by `<kind>:<slug>`. */
type ResolvedItemReferences = Map<string, string>;
type ReferenceResolver = (slug: string) => Promise<{ id: string } | null | undefined>;
const referenceKey = (kind: MenuItemReferenceKind, slug: string) => `${kind}:${slug}`;

export class MenuService {
  constructor(
    private repository: MenuOperations,
    private categoryService?: CategoryService,
    private collectionService?: CollectionService,
    private modelService?: ModelService
  ) {}

  private async getExistingMenu(slug: string): Promise<Menu | null> {
    return ServiceErrorWrapper.wrapServiceCall(
      "fetch menu",
      "menu",
      slug,
      async () => {
        logger.debug("Looking up existing menu", { slug });
        const menu = await this.repository.getMenuBySlug(slug);

        if (menu) {
          logger.debug("Found existing menu", {
            id: menu.id,
            name: menu.name,
            slug: menu.slug,
          });
        } else {
          logger.debug("Menu not found", { slug });
        }

        return menu;
      },
      MenuError
    );
  }

  private validateMenuInput(input: MenuInputConfig): void {
    if (!input.slug?.trim()) {
      throw new MenuValidationError("Menu slug is required", "slug");
    }
    if (!input.name?.trim()) {
      throw new MenuValidationError("Menu name is required", "name");
    }
  }

  public validateMenuItemInput(item: MenuItemInputConfig, path = "item"): void {
    if (!item.name?.trim()) {
      throw new MenuValidationError(`Menu item name is required at ${path}`, "name");
    }

    // Validate that only one link type is specified
    const linkTypes = [item.url, item.category, item.collection, item.page].filter(Boolean);
    if (linkTypes.length > 1) {
      throw new MenuValidationError(
        `Menu item at ${path} can only have one link type (url, category, collection, or page)`,
        path
      );
    }

    // Validate that menu item has at least one target or children
    if (linkTypes.length === 0 && (!item.children || item.children.length === 0)) {
      throw new MenuValidationError(
        `Menu item at ${path} must have either a target (url, category, collection, or page) or children`,
        path
      );
    }

    // Recursively validate children
    if (item.children) {
      item.children.forEach((child, index) => {
        this.validateMenuItemInput(child, `${path}.children[${index}]`);
      });
    }
  }

  private mapInputToCreateInput(input: MenuInputConfig): MenuCreateInput {
    const result = object.filterUndefinedValues({
      name: input.name,
      slug: input.slug,
      items: [], // Items will be created separately
    });
    // Ensure name is always present
    return { ...result, name: input.name } as MenuCreateInput;
  }

  private mapInputToUpdateInput(input: MenuInputConfig): MenuInput {
    return object.filterUndefinedValues({
      name: input.name,
      slug: input.slug,
    });
  }

  async createMenu(input: MenuInputConfig): Promise<Menu> {
    logger.debug("Creating new menu", { name: input.name, slug: input.slug });

    this.validateMenuInput(input);

    return ServiceErrorWrapper.wrapServiceCall(
      "create menu",
      "menu",
      input.slug,
      async () => {
        const references = await this.resolveItemReferences(input.items ?? []);
        const createInput = this.mapInputToCreateInput(input);
        const menu = await this.repository.createMenu(createInput);

        // Create menu items if provided
        if (input.items && input.items.length > 0) {
          await this.createMenuItems(menu.id, input.items, references);
        }

        logger.debug("Successfully created menu", {
          id: menu.id,
          name: menu.name,
          slug: menu.slug,
        });
        return menu;
      },
      MenuError
    );
  }

  async updateMenu(id: string, input: MenuInputConfig): Promise<Menu> {
    return ServiceErrorWrapper.wrapServiceCall(
      "update menu",
      "menu",
      input.slug,
      async () => {
        logger.debug("Updating menu", { id, name: input.name, slug: input.slug });

        const references = await this.resolveItemReferences(input.items ?? []);
        const updateInput = this.mapInputToUpdateInput(input);
        const menu = await this.repository.updateMenu(id, updateInput);

        // Handle menu item updates if provided
        if (input.items !== undefined) {
          await this.syncMenuItems(menu.id, input.items, menu.items ?? [], references);
        }

        logger.debug("Successfully updated menu", {
          id: menu.id,
          name: menu.name,
          slug: menu.slug,
        });
        return menu;
      },
      MenuError
    );
  }

  async getOrCreateMenu(input: MenuInputConfig): Promise<Menu> {
    logger.debug("Getting or creating menu", { name: input.name, slug: input.slug });
    this.validateMenuInput(input);

    const existingMenu = await this.getExistingMenu(input.slug);

    if (existingMenu) {
      logger.debug("Updating existing menu", {
        id: existingMenu.id,
        name: input.name,
        slug: input.slug,
      });
      return this.updateMenu(existingMenu.id, input);
    }

    return this.createMenu(input);
  }

  async bootstrapMenus(inputs: MenuInputConfig[]): Promise<Menu[]> {
    logger.debug("Bootstrapping menus", { count: inputs.length });

    // Validate unique slugs
    const slugs = new Set<string>();
    const duplicateSlugs = new Set<string>();

    for (const input of inputs) {
      if (slugs.has(input.slug)) {
        duplicateSlugs.add(input.slug);
      }
      slugs.add(input.slug);
    }

    if (duplicateSlugs.size > 0) {
      throw new MenuValidationError(
        `Duplicate menu slugs found: ${Array.from(duplicateSlugs).join(", ")}`
      );
    }

    const results = await ServiceErrorWrapper.wrapBatch(
      inputs,
      "Bootstrap menus",
      (menu) => menu.slug,
      (input) => this.getOrCreateMenu(input)
    );

    if (results.failures.length > 0) {
      const errorMessage = `Failed to bootstrap ${results.failures.length} of ${inputs.length} menus`;
      logger.error(errorMessage, {
        failures: results.failures.map((f) => ({
          menu: f.item.slug,
          error: f.error.message,
        })),
      });
      throw new MenuOperationError(
        "bootstrap",
        "menus",
        results.failures.map((f) => `${f.item.slug}: ${f.error.message}`).join("; ")
      );
    }

    logger.debug("Successfully bootstrapped all menus", {
      count: results.successes.length,
    });
    return results.successes.map((s) => s.result);
  }

  private async createMenuItems(
    menuId: string,
    items: MenuItemInputConfig[],
    references: ResolvedItemReferences,
    parentId?: string
  ): Promise<void> {
    for (const item of items) {
      this.validateMenuItemInput(item);

      const createInput = this.buildMenuItemCreateInput(menuId, item, references, parentId);
      const createdItem = await this.repository.createMenuItem(createInput);

      // Recursively create children
      if (item.children && item.children.length > 0) {
        await this.createMenuItems(menuId, item.children, references, createdItem.id);
      }
    }
  }

  /**
   * Resolves every category, collection and page the items link to before the menu is touched,
   * so a reference that doesn't exist fails the menu without leaving it half rebuilt.
   */
  private async resolveItemReferences(
    items: readonly MenuItemInputConfig[]
  ): Promise<ResolvedItemReferences> {
    const { categoryService, collectionService, modelService } = this;
    const resolvers: Record<MenuItemReferenceKind, ReferenceResolver | undefined> = {
      category: categoryService && ((slug) => categoryService.getCategoryBySlug(slug)),
      collection: collectionService && ((slug) => collectionService.getCollectionBySlug(slug)),
      page: modelService && ((slug) => modelService.getModelBySlug(slug)),
    };

    const references: ResolvedItemReferences = new Map();
    const missing: string[] = [];

    const visit = async (item: MenuItemInputConfig): Promise<void> => {
      for (const kind of MENU_ITEM_REFERENCE_KINDS) {
        const slug = item[kind];
        const resolve = resolvers[kind];
        const key = referenceKey(kind, slug ?? "");
        if (!slug || !resolve || references.has(key)) continue;

        const entity = await resolve(slug);
        if (entity) {
          references.set(key, entity.id);
        } else {
          missing.push(`${kind} "${slug}" (item "${item.name}")`);
        }
      }
      for (const child of item.children ?? []) {
        await visit(child);
      }
    };

    for (const item of items) {
      await visit(item);
    }

    if (missing.length > 0) {
      throw new EntityNotFoundError(
        `Menu items link to entities that don't exist: ${missing.join(", ")}`
      );
    }
    return references;
  }

  private buildMenuItemCreateInput(
    menuId: string,
    item: MenuItemInputConfig,
    references: ResolvedItemReferences,
    parentId?: string
  ): MenuItemCreateInput {
    const category = item.category && references.get(referenceKey("category", item.category));
    const collection =
      item.collection && references.get(referenceKey("collection", item.collection));
    const page = item.page && references.get(referenceKey("page", item.page));
    return {
      name: item.name,
      menu: menuId,
      parent: parentId,
      url: item.url,
      ...(category && { category }),
      ...(collection && { collection }),
      ...(page && { page }),
    };
  }

  private async syncMenuItems(
    menuId: string,
    desiredItems: MenuItemInputConfig[],
    currentItems: MenuItem[],
    references: ResolvedItemReferences
  ): Promise<void> {
    // For simplicity, we'll delete all existing items and recreate them
    // This ensures the hierarchy is correct
    logger.debug("Syncing menu items", {
      menuId,
      desiredCount: desiredItems.length,
      currentCount: currentItems.length,
    });

    // Delete all existing menu items
    for (const item of currentItems) {
      if (item.id) {
        await this.repository.deleteMenuItem(item.id);
      }
    }

    // Create new menu items
    if (desiredItems.length > 0) {
      await this.createMenuItems(menuId, desiredItems, references);
    }
  }

  async getAllMenus(): Promise<Menu[]> {
    return ServiceErrorWrapper.wrapServiceCall(
      "fetch all menus",
      "menus",
      "all",
      async () => {
        logger.debug("Fetching all menus");
        const menus = await this.repository.getMenus();
        logger.debug(`Fetched ${menus.length} menus`);
        return menus;
      },
      MenuError
    );
  }
}
