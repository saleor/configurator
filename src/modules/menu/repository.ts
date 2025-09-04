import { graphql, type VariablesOf, type ResultOf } from "gql.tada";
import { type AnyVariables, type Client } from "@urql/core";
import { logger } from "../../lib/logger";
import { GraphQLError } from "../../lib/errors/graphql";

const GetMenus = graphql(`
  query GetMenus($first: Int!) {
    menus(first: $first) {
      edges {
        node {
          id
          name
          slug
          items {
            id
            name
            menu {
              id
            }
            parent {
              id
              name
            }
            category {
              id
              slug
              name
            }
            collection {
              id
              slug
              name
            }
            page {
              id
              slug
              title
            }
            level
            children {
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
              children {
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
              }
            }
            url
          }
        }
      }
    }
  }
`);

const GetMenuBySlug = graphql(`
  query GetMenuBySlug($slug: String!) {
    menu(slug: $slug) {
      id
      name
      slug
      items {
        id
        name
        menu {
          id
        }
        parent {
          id
          name
        }
        category {
          id
          slug
          name
        }
        collection {
          id
          slug
          name
        }
        page {
          id
          slug
          title
        }
        level
        children {
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
          children {
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
          }
        }
        url
      }
    }
  }
`);

const CreateMenu = graphql(`
  mutation CreateMenu($input: MenuCreateInput!) {
    menuCreate(input: $input) {
      menu {
        id
        name
        slug
        items {
          id
          name
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

const UpdateMenu = graphql(`
  mutation UpdateMenu($id: ID!, $input: MenuInput!) {
    menuUpdate(id: $id, input: $input) {
      menu {
        id
        name
        slug
        items {
          id
          name
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

const CreateMenuItem = graphql(`
  mutation CreateMenuItem($input: MenuItemCreateInput!) {
    menuItemCreate(input: $input) {
      menuItem {
        id
        name
        menu {
          id
        }
        parent {
          id
        }
        url
        category {
          id
        }
        collection {
          id
        }
        page {
          id
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

const UpdateMenuItem = graphql(`
  mutation UpdateMenuItem($id: ID!, $input: MenuItemInput!) {
    menuItemUpdate(id: $id, input: $input) {
      menuItem {
        id
        name
        url
        category {
          id
        }
        collection {
          id
        }
        page {
          id
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

const DeleteMenuItem = graphql(`
  mutation DeleteMenuItem($id: ID!) {
    menuItemDelete(id: $id) {
      menuItem {
        id
        name
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

// Type exports for external use
export type Menu = NonNullable<ResultOf<typeof GetMenuBySlug>["menu"]>;
export type MenuItem = NonNullable<ResultOf<typeof CreateMenuItem>["menuItemCreate"]["menuItem"]>;
export type MenuCreateInput = VariablesOf<typeof CreateMenu>["input"];
export type MenuInput = VariablesOf<typeof UpdateMenu>["input"];
export type MenuItemCreateInput = VariablesOf<typeof CreateMenuItem>["input"];
export type MenuItemInput = VariablesOf<typeof UpdateMenuItem>["input"];

export interface MenuOperations {
  getMenus(): Promise<Menu[]>;
  getMenuBySlug(slug: string): Promise<Menu | null>;
  createMenu(input: MenuCreateInput): Promise<Menu>;
  updateMenu(id: string, input: MenuInput): Promise<Menu>;
  createMenuItem(input: MenuItemCreateInput): Promise<MenuItem>;
  updateMenuItem(id: string, input: MenuItemInput): Promise<MenuItem>;
  deleteMenuItem(id: string): Promise<void>;
}

export class MenuRepository implements MenuOperations {
  constructor(private client: Client) {}

  private async query<TData, TVariables extends AnyVariables>(
    document: TypedDocumentString<TData, TVariables>,
    variables: TVariables
  ): Promise<TData> {
    const result = await this.client.query(document, variables).toPromise();

    if (result.error) {
      throw GraphQLError.fromCombinedError(result.error);
    }

    if (!result.data) {
      throw new GraphQLError("No data returned from query");
    }

    return result.data;
  }

  private async mutation<TData, TVariables extends AnyVariables>(
    document: TypedDocumentString<TData, TVariables>,
    variables: TVariables
  ): Promise<TData> {
    const result = await this.client.mutation(document, variables).toPromise();

    if (result.error) {
      throw GraphQLError.fromCombinedError(result.error);
    }

    if (!result.data) {
      throw new GraphQLError("No data returned from mutation");
    }

    return result.data;
  }

  async getMenus(): Promise<Menu[]> {
    logger.debug("Fetching menus from Saleor");
    const data = await this.query(GetMenus, { first: 100 });
    const menus = data.menus?.edges?.map(edge => edge.node) ?? [];
    logger.debug(`Fetched ${menus.length} menus`);
    return menus as Menu[];
  }

  async getMenuBySlug(slug: string): Promise<Menu | null> {
    logger.debug("Fetching menu by slug", { slug });
    const data = await this.query(GetMenuBySlug, { slug });
    return data.menu as Menu | null;
  }

  async createMenu(input: MenuCreateInput): Promise<Menu> {
    logger.debug("Creating menu", { name: input.name, slug: input.slug });
    const data = await this.mutation(CreateMenu, { input });

    if (data.menuCreate?.errors && data.menuCreate.errors.length > 0) {
      const error = data.menuCreate.errors[0];
      throw new GraphQLError(`Failed to create menu: ${error.message}`, {
        field: error.field ?? undefined,
        code: error.code ?? undefined,
      });
    }

    if (!data.menuCreate?.menu) {
      throw new GraphQLError("Menu creation returned no menu");
    }

    logger.debug("Successfully created menu", {
      id: data.menuCreate.menu.id,
      name: data.menuCreate.menu.name,
    });

    return data.menuCreate.menu as Menu;
  }

  async updateMenu(id: string, input: MenuInput): Promise<Menu> {
    logger.debug("Updating menu", { id, input });
    const data = await this.mutation(UpdateMenu, { id, input });

    if (data.menuUpdate?.errors && data.menuUpdate.errors.length > 0) {
      const error = data.menuUpdate.errors[0];
      throw new GraphQLError(`Failed to update menu: ${error.message}`, {
        field: error.field ?? undefined,
        code: error.code ?? undefined,
      });
    }

    if (!data.menuUpdate?.menu) {
      throw new GraphQLError("Menu update returned no menu");
    }

    logger.debug("Successfully updated menu", {
      id: data.menuUpdate.menu.id,
      name: data.menuUpdate.menu.name,
    });

    return data.menuUpdate.menu as Menu;
  }

  async createMenuItem(input: MenuItemCreateInput): Promise<MenuItem> {
    logger.debug("Creating menu item", { name: input.name, menuId: input.menu });
    const data = await this.mutation(CreateMenuItem, { input });

    if (data.menuItemCreate?.errors && data.menuItemCreate.errors.length > 0) {
      const error = data.menuItemCreate.errors[0];
      throw new GraphQLError(`Failed to create menu item: ${error.message}`, {
        field: error.field ?? undefined,
        code: error.code ?? undefined,
      });
    }

    if (!data.menuItemCreate?.menuItem) {
      throw new GraphQLError("Menu item creation returned no menu item");
    }

    logger.debug("Successfully created menu item", {
      id: data.menuItemCreate.menuItem.id,
      name: data.menuItemCreate.menuItem.name,
    });

    return data.menuItemCreate.menuItem as MenuItem;
  }

  async updateMenuItem(id: string, input: MenuItemInput): Promise<MenuItem> {
    logger.debug("Updating menu item", { id, input });
    const data = await this.mutation(UpdateMenuItem, { id, input });

    if (data.menuItemUpdate?.errors && data.menuItemUpdate.errors.length > 0) {
      const error = data.menuItemUpdate.errors[0];
      throw new GraphQLError(`Failed to update menu item: ${error.message}`, {
        field: error.field ?? undefined,
        code: error.code ?? undefined,
      });
    }

    if (!data.menuItemUpdate?.menuItem) {
      throw new GraphQLError("Menu item update returned no menu item");
    }

    logger.debug("Successfully updated menu item", {
      id: data.menuItemUpdate.menuItem.id,
      name: data.menuItemUpdate.menuItem.name,
    });

    return data.menuItemUpdate.menuItem as MenuItem;
  }

  async deleteMenuItem(id: string): Promise<void> {
    logger.debug("Deleting menu item", { id });
    const data = await this.mutation(DeleteMenuItem, { id });

    if (data.menuItemDelete?.errors && data.menuItemDelete.errors.length > 0) {
      const error = data.menuItemDelete.errors[0];
      throw new GraphQLError(`Failed to delete menu item: ${error.message}`, {
        field: error.field ?? undefined,
        code: error.code ?? undefined,
      });
    }

    logger.debug("Successfully deleted menu item", {
      id,
      name: data.menuItemDelete?.menuItem?.name,
    });
  }
}