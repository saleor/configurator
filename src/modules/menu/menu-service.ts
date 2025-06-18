import { logger } from "../../lib/logger";
import type { MenuRepository } from "./repository";
import type { CategoryService } from "../category/category-service";
import type { CollectionService } from "../collection/collection-service";
import type { PageService } from "../page/page-service";

export interface MenuItemInput {
  name: string;
  url?: string;
  categorySlug?: string;
  collectionSlug?: string;
  pageSlug?: string;
  parent?: string;
  children?: MenuItemInput[];
}

export interface MenuInput {
  name: string;
  slug?: string;
  items?: MenuItemInput[];
}

export class MenuService {
  constructor(
    private readonly repository: MenuRepository,
    private readonly categoryService: CategoryService,
    private readonly collectionService: CollectionService,
    private readonly pageService?: PageService
  ) {}

  async upsertMenus(menus: MenuInput[]) {
    logger.info(`Upserting ${menus.length} menus`);
    
    const existingMenus = await this.repository.getMenus();
    const existingMenuMap = new Map(
      existingMenus.map((menu) => [menu.name, menu])
    );
    
    const results = [];
    
    for (const menuInput of menus) {
      try {
        const existingMenu = existingMenuMap.get(menuInput.name);
        let menu;
        
        if (existingMenu) {
          logger.debug(`Updating existing menu: ${menuInput.name}`);
          menu = await this.updateMenu(existingMenu.id, menuInput);
        } else {
          logger.debug(`Creating new menu: ${menuInput.name}`);
          menu = await this.createMenu(menuInput);
        }
        
        results.push(menu);
      } catch (error) {
        logger.error(`Failed to upsert menu ${menuInput.name}`, { error });
        throw error;
      }
    }
    
    return results;
  }

  private async createMenu(input: MenuInput) {
    const createInput = {
      name: input.name,
      slug: input.slug,
    };
    
    const menu = await this.repository.createMenu(createInput);
    
    if (input.items?.length) {
      await this.createMenuItems(menu.id, input.items);
    }
    
    return menu;
  }

  private async updateMenu(id: string, input: MenuInput) {
    const updateInput = {
      name: input.name,
      slug: input.slug,
    };
    
    const menu = await this.repository.updateMenu(id, updateInput);
    
    if (input.items) {
      // For simplicity, we'll recreate all menu items
      // In a production system, you'd want to diff and update intelligently
      const existingItems = await this.repository.getMenuItems(id);
      
      // Delete existing items
      for (const item of existingItems) {
        await this.repository.deleteMenuItem(item.id);
      }
      
      // Create new items
      await this.createMenuItems(id, input.items);
    }
    
    return menu;
  }

  private async createMenuItems(
    menuId: string,
    items: MenuItemInput[],
    parentId?: string
  ) {
    const itemsWithIds: Array<{ input: MenuItemInput; id?: string }> = [];
    
    for (const item of items) {
      const createInput = await this.prepareMenuItemInput(item, menuId, parentId);
      const menuItem = await this.repository.createMenuItem(createInput);
      
      itemsWithIds.push({ input: item, id: menuItem.id });
    }
    
    // Create children after all items at this level are created
    for (const { input, id } of itemsWithIds) {
      if (input.children?.length && id) {
        await this.createMenuItems(menuId, input.children, id);
      }
    }
  }

  private async prepareMenuItemInput(
    item: MenuItemInput,
    menuId: string,
    parentId?: string
  ) {
    const input: any = {
      menu: menuId,
      name: item.name,
      url: item.url,
      parent: parentId,
    };
    
    // Handle category reference
    if (item.categorySlug) {
      const category = await this.categoryService.getCategoryBySlug(item.categorySlug);
      if (!category) {
        throw new Error(`Category not found: ${item.categorySlug}`);
      }
      input.category = category.id;
    }
    
    // Handle collection reference
    if (item.collectionSlug) {
      const collections = await this.collectionService.getCollectionsBySlugs([item.collectionSlug]);
      if (collections.length === 0) {
        throw new Error(`Collection not found: ${item.collectionSlug}`);
      }
      input.collection = collections[0].id;
    }
    
    // Handle page reference
    if (item.pageSlug && this.pageService) {
      const page = await this.pageService.getPageBySlug(item.pageSlug);
      if (!page) {
        throw new Error(`Page not found: ${item.pageSlug}`);
      }
      input.page = page.id;
    }
    
    return input;
  }

  async getMenus() {
    logger.debug("Fetching all menus");
    return this.repository.getMenus();
  }

  async getMenuBySlug(slug: string) {
    const menus = await this.getMenus();
    return menus.find(menu => menu.slug === slug);
  }
} 