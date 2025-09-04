import { describe, expect, it, vi } from "vitest";
import type { MenuInput } from "../config/schema/schema";
import { MenuValidationError } from "./errors";
import type { Menu, MenuOperations } from "./repository";
import { MenuService } from "./menu-service";

// Mock service interfaces for testing
interface MockCategoryService {
  getCategoryBySlug: (slug: string) => Promise<{ id: string; slug: string } | null | undefined>;
}

interface MockCollectionService {
  getCollectionBySlug: (slug: string) => Promise<{ id: string; slug: string } | null | undefined>;
}

interface MockModelService {
  getModelBySlug: (slug: string) => Promise<{ id: string; slug: string } | null | undefined>;
}

describe("MenuService", () => {
  const mockMenuInput: MenuInput = {
    name: "Test Menu",
    slug: "test-menu",
    items: [
      {
        name: "Electronics",
        category: "electronics-technology",
        children: [
          {
            name: "Audio",
            category: "audio-headphones",
          },
        ],
      },
      {
        name: "About",
        page: "about",
      },
      {
        name: "Featured",
        collection: "featured-products",
      },
      {
        name: "External",
        url: "https://example.com",
      },
    ],
  };

  const mockMenu: Menu = {
    id: "1",
    name: "Test Menu",
    slug: "test-menu",
    items: {
      edges: [
        {
          node: {
            id: "item1",
            name: "Electronics",
            category: { slug: "electronics-technology" },
            page: null,
            collection: null,
            url: null,
            children: {
              edges: [
                {
                  node: {
                    id: "item2",
                    name: "Audio",
                    category: { slug: "audio-headphones" },
                    page: null,
                    collection: null,
                    url: null,
                    children: { edges: [] },
                  },
                },
              ],
            },
          },
        },
      ],
    },
  };

  describe("validateMenuInput", () => {
    it("should throw error when menu name is missing", async () => {
      const invalidInput = { ...mockMenuInput, name: "" };
      const mockOperations = createMockOperations();
      const mockCategoryService: MockCategoryService = {
        getCategoryBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "electronics-technology" }),
      };
      const mockCollectionService: MockCollectionService = {
        getCollectionBySlug: vi.fn().mockResolvedValue({ id: "col1", slug: "featured-products" }),
      };
      const mockModelService: MockModelService = {
        getModelBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "about" }),
      };
      const service = new MenuService(mockOperations, mockCategoryService, mockCollectionService, mockModelService);

      await expect(service.createMenu(invalidInput)).rejects.toThrow(MenuValidationError);
    });

    it("should throw error when menu slug is missing", async () => {
      const invalidInput = { ...mockMenuInput, slug: "" };
      const mockOperations = createMockOperations();
      const mockCategoryService: MockCategoryService = {
        getCategoryBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "electronics-technology" }),
      };
      const mockCollectionService: MockCollectionService = {
        getCollectionBySlug: vi.fn().mockResolvedValue({ id: "col1", slug: "featured-products" }),
      };
      const mockModelService: MockModelService = {
        getModelBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "about" }),
      };
      const service = new MenuService(mockOperations, mockCategoryService, mockCollectionService, mockModelService);

      await expect(service.createMenu(invalidInput)).rejects.toThrow(MenuValidationError);
    });

    it("should accept valid menu input", async () => {
      const mockOperations = createMockOperations();
      mockOperations.createMenu.mockResolvedValue(mockMenu);
      mockOperations.createMenuItem.mockResolvedValue({ id: "item-1", name: "Test Item" });
      mockOperations.createMenuItem.mockResolvedValue({ id: "item-1", name: "Test Item" });
      const mockCategoryService: MockCategoryService = {
        getCategoryBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "electronics-technology" }),
      };
      const mockCollectionService: MockCollectionService = {
        getCollectionBySlug: vi.fn().mockResolvedValue({ id: "col1", slug: "featured-products" }),
      };
      const mockModelService: MockModelService = {
        getModelBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "about" }),
      };
      const service = new MenuService(mockOperations, mockCategoryService, mockCollectionService, mockModelService);

      const result = await service.createMenu(mockMenuInput);
      expect(result).toBeDefined();
      expect(mockOperations.createMenu).toHaveBeenCalled();
    });
  });

  describe("validateMenuItemInput", () => {
    it("should accept menu item with category reference", () => {
      const mockOperations = createMockOperations();
      const mockCategoryService: MockCategoryService = {
        getCategoryBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "electronics-technology" }),
      };
      const mockCollectionService: MockCollectionService = {
        getCollectionBySlug: vi.fn().mockResolvedValue({ id: "col1", slug: "featured-products" }),
      };
      const mockModelService: MockModelService = {
        getModelBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "about" }),
      };
      const service = new MenuService(mockOperations, mockCategoryService, mockCollectionService, mockModelService);

      const itemWithCategory = { name: "Electronics", category: "electronics-technology" };
      expect(() => service["validateMenuItemInput"](itemWithCategory)).not.toThrow();
    });

    it("should accept menu item with page reference", () => {
      const mockOperations = createMockOperations();
      const mockCategoryService: MockCategoryService = {
        getCategoryBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "electronics-technology" }),
      };
      const mockCollectionService: MockCollectionService = {
        getCollectionBySlug: vi.fn().mockResolvedValue({ id: "col1", slug: "featured-products" }),
      };
      const mockModelService: MockModelService = {
        getModelBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "about" }),
      };
      const service = new MenuService(mockOperations, mockCategoryService, mockCollectionService, mockModelService);

      const itemWithPage = { name: "About", page: "about" };
      expect(() => service["validateMenuItemInput"](itemWithPage)).not.toThrow();
    });

    it("should accept menu item with collection reference", () => {
      const mockOperations = createMockOperations();
      const mockCategoryService: MockCategoryService = {
        getCategoryBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "electronics-technology" }),
      };
      const mockCollectionService: MockCollectionService = {
        getCollectionBySlug: vi.fn().mockResolvedValue({ id: "col1", slug: "featured-products" }),
      };
      const mockModelService: MockModelService = {
        getModelBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "about" }),
      };
      const service = new MenuService(mockOperations, mockCategoryService, mockCollectionService, mockModelService);

      const itemWithCollection = { name: "Featured", collection: "featured-products" };
      expect(() => service["validateMenuItemInput"](itemWithCollection)).not.toThrow();
    });

    it("should accept menu item with URL", () => {
      const mockOperations = createMockOperations();
      const mockCategoryService: MockCategoryService = {
        getCategoryBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "electronics-technology" }),
      };
      const mockCollectionService: MockCollectionService = {
        getCollectionBySlug: vi.fn().mockResolvedValue({ id: "col1", slug: "featured-products" }),
      };
      const mockModelService: MockModelService = {
        getModelBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "about" }),
      };
      const service = new MenuService(mockOperations, mockCategoryService, mockCollectionService, mockModelService);

      const itemWithUrl = { name: "External", url: "https://example.com" };
      expect(() => service["validateMenuItemInput"](itemWithUrl)).not.toThrow();
    });

    it("should throw error when menu item has no target", () => {
      const mockOperations = createMockOperations();
      const mockCategoryService: MockCategoryService = {
        getCategoryBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "electronics-technology" }),
      };
      const mockCollectionService: MockCollectionService = {
        getCollectionBySlug: vi.fn().mockResolvedValue({ id: "col1", slug: "featured-products" }),
      };
      const mockModelService: MockModelService = {
        getModelBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "about" }),
      };
      const service = new MenuService(mockOperations, mockCategoryService, mockCollectionService, mockModelService);

      const itemWithoutTarget = { name: "Invalid Item" };
      expect(() => service["validateMenuItemInput"](itemWithoutTarget)).toThrow(MenuValidationError);
    });

    it("should throw error when menu item has multiple targets", () => {
      const mockOperations = createMockOperations();
      const mockCategoryService: MockCategoryService = {
        getCategoryBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "electronics-technology" }),
      };
      const mockCollectionService: MockCollectionService = {
        getCollectionBySlug: vi.fn().mockResolvedValue({ id: "col1", slug: "featured-products" }),
      };
      const mockModelService: MockModelService = {
        getModelBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "about" }),
      };
      const service = new MenuService(mockOperations, mockCategoryService, mockCollectionService, mockModelService);

      const itemWithMultipleTargets = { name: "Invalid", category: "cat", page: "page" };
      expect(() => service["validateMenuItemInput"](itemWithMultipleTargets)).toThrow(MenuValidationError);
    });
  });

  describe("getOrCreateMenu", () => {
    it("should not create a menu that already exists", async () => {
      const mockOperations = createMockOperations();
      mockOperations.getMenuBySlug.mockResolvedValue(mockMenu); // Mock the direct lookup
      const mockUpdatedMenu = { ...mockMenu, items: [] }; // Convert to array for syncMenuItems
      mockOperations.updateMenu.mockResolvedValue(mockUpdatedMenu);
      mockOperations.createMenuItem.mockResolvedValue({ id: "item-1", name: "Test Item" });
      const mockCategoryService: MockCategoryService = {
        getCategoryBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "electronics-technology" }),
      };
      const mockCollectionService: MockCollectionService = {
        getCollectionBySlug: vi.fn().mockResolvedValue({ id: "col1", slug: "featured-products" }),
      };
      const mockModelService: MockModelService = {
        getModelBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "about" }),
      };
      const service = new MenuService(mockOperations, mockCategoryService, mockCollectionService, mockModelService);

      const result = await service.getOrCreateMenu(mockMenuInput);

      expect(mockOperations.createMenu).not.toHaveBeenCalled();
      expect(mockOperations.updateMenu).toHaveBeenCalled();
      expect(result).toEqual(mockUpdatedMenu);
    });

    it("should create a new menu when it doesn't exist", async () => {
      const mockOperations = createMockOperations();
      mockOperations.getMenuBySlug.mockResolvedValue(null); // Menu doesn't exist
      mockOperations.createMenu.mockResolvedValue(mockMenu);
      mockOperations.createMenuItem.mockResolvedValue({ id: "item-1", name: "Test Item" });
      const mockCategoryService: MockCategoryService = {
        getCategoryBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "electronics-technology" }),
      };
      const mockCollectionService: MockCollectionService = {
        getCollectionBySlug: vi.fn().mockResolvedValue({ id: "col1", slug: "featured-products" }),
      };
      const mockModelService: MockModelService = {
        getModelBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "about" }),
      };
      const service = new MenuService(mockOperations, mockCategoryService, mockCollectionService, mockModelService);

      const result = await service.getOrCreateMenu(mockMenuInput);

      expect(mockOperations.createMenu).toHaveBeenCalled();
      expect(result).toEqual(mockMenu);
    });
  });

  describe("bootstrapMenus", () => {
    it("should validate unique slugs", async () => {
      const duplicateMenus = [
        mockMenuInput,
        { ...mockMenuInput, name: "Another Menu" },
      ];

      const mockOperations = createMockOperations();
      const mockCategoryService: MockCategoryService = {
        getCategoryBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "electronics-technology" }),
      };
      const mockCollectionService: MockCollectionService = {
        getCollectionBySlug: vi.fn().mockResolvedValue({ id: "col1", slug: "featured-products" }),
      };
      const mockModelService: MockModelService = {
        getModelBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "about" }),
      };
      const service = new MenuService(mockOperations, mockCategoryService, mockCollectionService, mockModelService);

      await expect(service.bootstrapMenus(duplicateMenus)).rejects.toThrow(
        MenuValidationError
      );
    });

    it("should process multiple menus successfully", async () => {
      const menus = [
        mockMenuInput,
        { ...mockMenuInput, slug: "second-menu", name: "Second Menu" },
      ];

      const mockOperations = createMockOperations();
      mockOperations.getMenus.mockResolvedValue([]);
      mockOperations.createMenu.mockResolvedValue(mockMenu);
      mockOperations.createMenuItem.mockResolvedValue({ id: "item-1", name: "Test Item" });
      const mockCategoryService: MockCategoryService = {
        getCategoryBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "electronics-technology" }),
      };
      const mockCollectionService: MockCollectionService = {
        getCollectionBySlug: vi.fn().mockResolvedValue({ id: "col1", slug: "featured-products" }),
      };
      const mockModelService: MockModelService = {
        getModelBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "about" }),
      };
      const service = new MenuService(mockOperations, mockCategoryService, mockCollectionService, mockModelService);

      const results = await service.bootstrapMenus(menus);

      expect(mockOperations.createMenu).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
    });
  });

  describe("menu items structure", () => {
    it("should handle menus without items", async () => {
      const menuWithoutItems = { ...mockMenuInput, items: [] };
      const mockOperations = createMockOperations();
      mockOperations.createMenu.mockResolvedValue(mockMenu);
      mockOperations.createMenuItem.mockResolvedValue({ id: "item-1", name: "Test Item" });
      mockOperations.createMenuItem.mockResolvedValue({ id: "item-1", name: "Test Item" });
      const mockCategoryService: MockCategoryService = {
        getCategoryBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "electronics-technology" }),
      };
      const mockCollectionService: MockCollectionService = {
        getCollectionBySlug: vi.fn().mockResolvedValue({ id: "col1", slug: "featured-products" }),
      };
      const mockModelService: MockModelService = {
        getModelBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "about" }),
      };
      const service = new MenuService(mockOperations, mockCategoryService, mockCollectionService, mockModelService);

      const result = await service.createMenu(menuWithoutItems);
      expect(result).toBeDefined();
      expect(mockOperations.createMenu).toHaveBeenCalled();
    });

    it("should handle hierarchical menu structure", async () => {
      const hierarchicalMenu = {
        name: "Complex Menu",
        slug: "complex-menu",
        items: [
          {
            name: "Parent",
            category: "parent-category",
            children: [
              {
                name: "Child 1",
                page: "child-page-1",
              },
              {
                name: "Child 2",
                collection: "child-collection",
                children: [
                  {
                    name: "Grandchild",
                    url: "https://example.com/grandchild",
                  },
                ],
              },
            ],
          },
        ],
      };

      const mockOperations = createMockOperations();
      mockOperations.createMenu.mockResolvedValue(mockMenu);
      mockOperations.createMenuItem.mockResolvedValue({ id: "item-1", name: "Test Item" });
      mockOperations.createMenuItem.mockResolvedValue({ id: "item-1", name: "Test Item" });
      const mockCategoryService: MockCategoryService = {
        getCategoryBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "electronics-technology" }),
      };
      const mockCollectionService: MockCollectionService = {
        getCollectionBySlug: vi.fn().mockResolvedValue({ id: "col1", slug: "featured-products" }),
      };
      const mockModelService: MockModelService = {
        getModelBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "about" }),
      };
      const service = new MenuService(mockOperations, mockCategoryService, mockCollectionService, mockModelService);

      const result = await service.createMenu(hierarchicalMenu);
      expect(result).toBeDefined();
      expect(mockOperations.createMenu).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should throw MenuOperationError on create failure", async () => {
      const mockOperations = createMockOperations();
      mockOperations.getMenus.mockResolvedValue([]);
      mockOperations.createMenu.mockRejectedValue(new Error("API Error"));
      const mockCategoryService: MockCategoryService = {
        getCategoryBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "electronics-technology" }),
      };
      const mockCollectionService: MockCollectionService = {
        getCollectionBySlug: vi.fn().mockResolvedValue({ id: "col1", slug: "featured-products" }),
      };
      const mockModelService: MockModelService = {
        getModelBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "about" }),
      };
      const service = new MenuService(mockOperations, mockCategoryService, mockCollectionService, mockModelService);

      await expect(service.createMenu(mockMenuInput)).rejects.toThrow(
        /Failed to create menu.*API Error/
      );
    });

    it("should throw MenuOperationError on update failure", async () => {
      const mockOperations = createMockOperations();
      mockOperations.getMenus.mockResolvedValue([]);
      mockOperations.updateMenu.mockRejectedValue(new Error("API Error"));
      const mockCategoryService: MockCategoryService = {
        getCategoryBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "electronics-technology" }),
      };
      const mockCollectionService: MockCollectionService = {
        getCollectionBySlug: vi.fn().mockResolvedValue({ id: "col1", slug: "featured-products" }),
      };
      const mockModelService: MockModelService = {
        getModelBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "about" }),
      };
      const service = new MenuService(mockOperations, mockCategoryService, mockCollectionService, mockModelService);

      await expect(service.updateMenu("1", mockMenuInput)).rejects.toThrow(
        /Failed to update menu.*API Error/
      );
    });
  });
});

function createMockOperations(): MenuOperations & { [K in keyof MenuOperations]: ReturnType<typeof vi.fn> } {
  return {
    getMenus: vi.fn(),
    getMenuBySlug: vi.fn(),
    createMenu: vi.fn(),
    updateMenu: vi.fn(),
    createMenuItem: vi.fn(),
    updateMenuItem: vi.fn(),
    deleteMenuItem: vi.fn(),
  };
}