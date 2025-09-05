import { logger } from "../../lib/logger";
// Note: Menu-related GraphQL types are handled via gql.tada typed queries
import { ServiceErrorWrapper } from "../../lib/utils/error-wrapper";
import { object } from "../../lib/utils/object";
import type { CategoryService } from "../category/category-service";
import type { CollectionService } from "../collection/collection-service";
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

export interface MenuItemInputConfig {
  name: string;
  url?: string;
  category?: string; // Category slug
  collection?: string; // Collection slug
  page?: string; // Page slug
  children?: MenuItemInputConfig[];
}

export interface MenuInputConfig {
  name: string;
  slug: string;
  items?: MenuItemInputConfig[];
}

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
        const createInput = this.mapInputToCreateInput(input);
        const menu = await this.repository.createMenu(createInput);

        // Create menu items if provided
        if (input.items && input.items.length > 0) {
          await this.createMenuItems(menu.id, input.items);
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

        const updateInput = this.mapInputToUpdateInput(input);
        const menu = await this.repository.updateMenu(id, updateInput);

        // Handle menu item updates if provided
        if (input.items !== undefined) {
          await this.syncMenuItems(menu.id, input.items, menu.items ?? []);
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
    parentId?: string
  ): Promise<void> {
    for (const item of items) {
      this.validateMenuItemInput(item);

      const createInput = await this.buildMenuItemCreateInput(menuId, item, parentId);
      const createdItem = await this.repository.createMenuItem(createInput);

      // Recursively create children
      if (item.children && item.children.length > 0) {
        await this.createMenuItems(menuId, item.children, createdItem.id);
      }
    }
  }

  private async buildMenuItemCreateInput(
    menuId: string,
    item: MenuItemInputConfig,
    parentId?: string
  ): Promise<MenuItemCreateInput> {
    const input: MenuItemCreateInput = {
      name: item.name,
      menu: menuId,
      parent: parentId,
      url: item.url,
    };

    // Resolve references
    if (item.category && this.categoryService) {
      try {
        const category = await this.categoryService.getCategoryBySlug(item.category);
        if (category) {
          input.category = category.id;
        } else {
          logger.warn(`Category with slug "${item.category}" not found`);
        }
      } catch (error) {
        logger.warn(`Failed to resolve category slug "${item.category}": ${error}`);
      }
    }

    if (item.collection && this.collectionService) {
      try {
        const collection = await this.collectionService.getCollectionBySlug(item.collection);
        if (collection) {
          input.collection = collection.id;
        } else {
          logger.warn(`Collection with slug "${item.collection}" not found`);
        }
      } catch (error) {
        logger.warn(`Failed to resolve collection slug "${item.collection}": ${error}`);
      }
    }

    if (item.page && this.modelService) {
      try {
        const page = await this.modelService.getModelBySlug(item.page);
        if (page) {
          input.page = page.id;
        } else {
          logger.warn(`Page with slug "${item.page}" not found`);
        }
      } catch (error) {
        logger.warn(`Failed to resolve page slug "${item.page}": ${error}`);
      }
    }

    return input;
  }

  private async syncMenuItems(
    menuId: string,
    desiredItems: MenuItemInputConfig[],
    currentItems: MenuItem[]
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
      await this.createMenuItems(menuId, desiredItems);
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
