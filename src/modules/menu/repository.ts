import type { Client } from "@urql/core";
import { gql } from "@urql/core";

const GET_MENUS = gql`
  query GetMenus($first: Int!, $channel: String) {
    menus(first: $first, channel: $channel) {
      edges {
        node {
          id
          name
          slug
          items {
            id
            name
            url
            category {
              id
              slug
            }
            collection {
              id
              slug
            }
            page {
              id
              slug
            }
            parent {
              id
              name
            }
            children {
              id
              name
              url
            }
            level
            moveUrl
          }
        }
      }
    }
  }
`;

const GET_MENU_ITEMS = gql`
  query GetMenuItems($first: Int!, $menu: ID) {
    menuItems(first: $first, filter: { menu: $menu }) {
      edges {
        node {
          id
          name
          url
          category {
            id
            slug
          }
          collection {
            id
            slug
          }
          page {
            id
            slug
          }
          parent {
            id
            name
          }
          children {
            id
            name
            url
          }
          level
        }
      }
    }
  }
`;

const CREATE_MENU = gql`
  mutation CreateMenu($input: MenuCreateInput!) {
    menuCreate(input: $input) {
      menu {
        id
        name
        slug
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

const UPDATE_MENU = gql`
  mutation UpdateMenu($id: ID!, $input: MenuInput!) {
    menuUpdate(id: $id, input: $input) {
      menu {
        id
        name
        slug
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

const CREATE_MENU_ITEM = gql`
  mutation CreateMenuItem($input: MenuItemCreateInput!) {
    menuItemCreate(input: $input) {
      menuItem {
        id
        name
        url
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

const UPDATE_MENU_ITEM = gql`
  mutation UpdateMenuItem($id: ID!, $input: MenuItemInput!) {
    menuItemUpdate(id: $id, input: $input) {
      menuItem {
        id
        name
        url
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

const MENU_ITEM_MOVE = gql`
  mutation MenuItemMove($menu: ID!, $moves: [MenuItemMoveInput!]!) {
    menuItemMove(menu: $menu, moves: $moves) {
      menu {
        id
        items {
          id
          name
          level
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

const DELETE_MENU_ITEM = gql`
  mutation DeleteMenuItem($id: ID!) {
    menuItemDelete(id: $id) {
      menuItem {
        id
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

interface MenuItem {
  id: string;
  name: string;
  url?: string;
  category?: { id: string; slug: string };
  collection?: { id: string; slug: string };
  page?: { id: string; slug: string };
  parent?: { id: string; name: string };
  children?: MenuItem[];
  level: number;
}

export interface Menu {
  id: string;
  name: string;
  slug?: string;
  items?: MenuItem[];
}

export class MenuRepository {
  constructor(private readonly client: Client) {}

  async getMenus(channel?: string): Promise<Menu[]> {
    const result = await this.client
      .query(GET_MENUS, { first: 100, channel })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to fetch menus: ${result.error.message}`);
    }
    
    return result.data?.menus.edges.map((edge: any) => edge.node) || [];
  }

  async getMenuItems(menuId: string): Promise<MenuItem[]> {
    const result = await this.client
      .query(GET_MENU_ITEMS, { first: 100, menu: menuId })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to fetch menu items: ${result.error.message}`);
    }
    
    return result.data?.menuItems.edges.map((edge: any) => edge.node) || [];
  }

  async createMenu(input: any): Promise<Menu> {
    const result = await this.client
      .mutation(CREATE_MENU, { input })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to create menu: ${result.error.message}`);
    }
    
    const { menu, errors } = result.data?.menuCreate || {};
    if (errors?.length) {
      throw new Error(
        `Menu creation failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return menu;
  }

  async updateMenu(id: string, input: any): Promise<Menu> {
    const result = await this.client
      .mutation(UPDATE_MENU, { id, input })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to update menu: ${result.error.message}`);
    }
    
    const { menu, errors } = result.data?.menuUpdate || {};
    if (errors?.length) {
      throw new Error(
        `Menu update failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return menu;
  }

  async createMenuItem(input: any): Promise<MenuItem> {
    const result = await this.client
      .mutation(CREATE_MENU_ITEM, { input })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to create menu item: ${result.error.message}`);
    }
    
    const { menuItem, errors } = result.data?.menuItemCreate || {};
    if (errors?.length) {
      throw new Error(
        `Menu item creation failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return menuItem;
  }

  async updateMenuItem(id: string, input: any): Promise<MenuItem> {
    const result = await this.client
      .mutation(UPDATE_MENU_ITEM, { id, input })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to update menu item: ${result.error.message}`);
    }
    
    const { menuItem, errors } = result.data?.menuItemUpdate || {};
    if (errors?.length) {
      throw new Error(
        `Menu item update failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return menuItem;
  }

  async moveMenuItems(menuId: string, moves: any[]): Promise<Menu> {
    const result = await this.client
      .mutation(MENU_ITEM_MOVE, { menu: menuId, moves })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to move menu items: ${result.error.message}`);
    }
    
    const { menu, errors } = result.data?.menuItemMove || {};
    if (errors?.length) {
      throw new Error(
        `Menu item move failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return menu;
  }

  async deleteMenuItem(id: string): Promise<void> {
    const result = await this.client
      .mutation(DELETE_MENU_ITEM, { id })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to delete menu item: ${result.error.message}`);
    }
    
    const { errors } = result.data?.menuItemDelete || {};
    if (errors?.length) {
      throw new Error(
        `Menu item deletion failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
  }
} 