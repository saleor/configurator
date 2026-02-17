import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CategoryInput } from "../config/schema/schema";
import { CategoryService } from "./category-service";
import type { CategoryOperations } from "./repository";

// Mock resilience utilities
vi.mock("../../lib/utils/resilience", () => ({
  rateLimiter: { getAdaptiveDelay: vi.fn().mockReturnValue(0) },
  delay: vi.fn().mockResolvedValue(undefined),
  withConcurrencyLimit: vi.fn().mockImplementation((fn) => fn()),
}));

// Mock category repository
const mockRepository: CategoryOperations = {
  createCategory: vi.fn(),
  getCategoryByName: vi.fn(),
  getCategoryBySlug: vi.fn(),
  getAllCategories: vi.fn(),
};

describe("CategoryService - Nested Categories", () => {
  const categoryService = new CategoryService(mockRepository);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle deeply nested categories", async () => {
    // Mock category creation to return different categories
    const mockCreateCategory = mockRepository.createCategory as ReturnType<typeof vi.fn>;
    const mockGetCategoryBySlug = mockRepository.getCategoryBySlug as ReturnType<typeof vi.fn>;
    const mockGetAllCategories = mockRepository.getAllCategories as ReturnType<typeof vi.fn>;

    // Return empty array/null for lookups (categories don't exist yet)
    mockGetCategoryBySlug.mockResolvedValue(null);
    mockGetAllCategories.mockResolvedValue([]);

    // Mock creation responses
    const rootCategory = { id: "root-id", name: "Electronics", slug: "electronics" };
    const level1Category = { id: "l1-id", name: "Computers", slug: "computers" };
    const level2Category = { id: "l2-id", name: "Laptops", slug: "laptops" };
    const level3Category = { id: "l3-id", name: "Gaming Laptops", slug: "gaming-laptops" };

    mockCreateCategory
      .mockResolvedValueOnce(rootCategory)
      .mockResolvedValueOnce(level1Category)
      .mockResolvedValueOnce(level2Category)
      .mockResolvedValueOnce(level3Category);

    // Define deeply nested category structure
    const categories: CategoryInput[] = [
      {
        name: "Electronics",
        slug: "electronics",
        subcategories: [
          {
            name: "Computers",
            slug: "computers",
            subcategories: [
              {
                name: "Laptops",
                slug: "laptops",
                subcategories: [
                  {
                    name: "Gaming Laptops",
                    slug: "gaming-laptops",
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    // Bootstrap categories
    await categoryService.bootstrapCategories(categories);

    // Verify all categories were created with correct parent relationships
    expect(mockCreateCategory).toHaveBeenCalledTimes(4);

    // Root category (no parent)
    expect(mockCreateCategory).toHaveBeenNthCalledWith(
      1,
      {
        name: "Electronics",
        slug: "electronics",
      },
      undefined
    );

    // Level 1 (parent: root)
    expect(mockCreateCategory).toHaveBeenNthCalledWith(
      2,
      {
        name: "Computers",
        slug: "computers",
      },
      "root-id"
    );

    // Level 2 (parent: level 1)
    expect(mockCreateCategory).toHaveBeenNthCalledWith(
      3,
      {
        name: "Laptops",
        slug: "laptops",
      },
      "l1-id"
    );

    // Level 3 (parent: level 2)
    expect(mockCreateCategory).toHaveBeenNthCalledWith(
      4,
      {
        name: "Gaming Laptops",
        slug: "gaming-laptops",
      },
      "l2-id"
    );
  });

  it("should handle multiple root categories with subcategories", async () => {
    const mockCreateCategory = mockRepository.createCategory as ReturnType<typeof vi.fn>;
    const mockGetCategoryBySlug = mockRepository.getCategoryBySlug as ReturnType<typeof vi.fn>;
    const mockGetAllCategories = mockRepository.getAllCategories as ReturnType<typeof vi.fn>;

    mockGetCategoryBySlug.mockResolvedValue(null);
    mockGetAllCategories.mockResolvedValue([]);

    // Mock creation responses for multiple trees
    mockCreateCategory
      .mockResolvedValueOnce({ id: "electronics-id", name: "Electronics", slug: "electronics" })
      .mockResolvedValueOnce({ id: "phones-id", name: "Phones", slug: "phones" })
      .mockResolvedValueOnce({ id: "clothing-id", name: "Clothing", slug: "clothing" })
      .mockResolvedValueOnce({ id: "shirts-id", name: "Shirts", slug: "shirts" });

    const categories: CategoryInput[] = [
      {
        name: "Electronics",
        slug: "electronics",
        subcategories: [
          {
            name: "Phones",
            slug: "phones",
          },
        ],
      },
      {
        name: "Clothing",
        slug: "clothing",
        subcategories: [
          {
            name: "Shirts",
            slug: "shirts",
          },
        ],
      },
    ];

    await categoryService.bootstrapCategories(categories);

    // Should create 4 categories total
    expect(mockCreateCategory).toHaveBeenCalledTimes(4);

    // Two root categories
    expect(mockCreateCategory).toHaveBeenNthCalledWith(
      1,
      {
        name: "Electronics",
        slug: "electronics",
      },
      undefined
    );

    expect(mockCreateCategory).toHaveBeenNthCalledWith(
      3,
      {
        name: "Clothing",
        slug: "clothing",
      },
      undefined
    );

    // Two subcategories with correct parents
    expect(mockCreateCategory).toHaveBeenNthCalledWith(
      2,
      {
        name: "Phones",
        slug: "phones",
      },
      "electronics-id"
    );

    expect(mockCreateCategory).toHaveBeenNthCalledWith(
      4,
      {
        name: "Shirts",
        slug: "shirts",
      },
      "clothing-id"
    );
  });
});

describe("CategoryService - Optimized Processing", () => {
  const categoryService = new CategoryService(mockRepository);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("flattenByLevel", () => {
    it("should flatten a simple category tree by level", () => {
      const categories: CategoryInput[] = [
        { name: "A", slug: "a" },
        { name: "B", slug: "b" },
      ];

      const levels = categoryService.flattenByLevel(categories);

      expect(levels.size).toBe(1);
      expect(levels.get(0)).toHaveLength(2);
      expect(levels.get(0)?.[0].input.slug).toBe("a");
      expect(levels.get(0)?.[0].parentSlug).toBeUndefined();
      expect(levels.get(0)?.[1].input.slug).toBe("b");
    });

    it("should flatten nested categories by depth level", () => {
      const categories: CategoryInput[] = [
        {
          name: "Electronics",
          slug: "electronics",
          subcategories: [
            {
              name: "Computers",
              slug: "computers",
              subcategories: [{ name: "Laptops", slug: "laptops" }],
            },
            { name: "Phones", slug: "phones" },
          ],
        },
      ];

      const levels = categoryService.flattenByLevel(categories);

      expect(levels.size).toBe(3);

      // Level 0: root categories
      expect(levels.get(0)).toHaveLength(1);
      expect(levels.get(0)?.[0].input.slug).toBe("electronics");
      expect(levels.get(0)?.[0].parentSlug).toBeUndefined();

      // Level 1: first-level children
      expect(levels.get(1)).toHaveLength(2);
      expect(levels.get(1)?.[0].input.slug).toBe("computers");
      expect(levels.get(1)?.[0].parentSlug).toBe("electronics");
      expect(levels.get(1)?.[1].input.slug).toBe("phones");
      expect(levels.get(1)?.[1].parentSlug).toBe("electronics");

      // Level 2: second-level children
      expect(levels.get(2)).toHaveLength(1);
      expect(levels.get(2)?.[0].input.slug).toBe("laptops");
      expect(levels.get(2)?.[0].parentSlug).toBe("computers");
    });

    it("should handle multiple root categories with different depths", () => {
      const categories: CategoryInput[] = [
        {
          name: "A",
          slug: "a",
          subcategories: [{ name: "A1", slug: "a1" }],
        },
        { name: "B", slug: "b" },
        {
          name: "C",
          slug: "c",
          subcategories: [
            {
              name: "C1",
              slug: "c1",
              subcategories: [{ name: "C1a", slug: "c1a" }],
            },
          ],
        },
      ];

      const levels = categoryService.flattenByLevel(categories);

      expect(levels.size).toBe(3);

      // Level 0: 3 root categories
      expect(levels.get(0)).toHaveLength(3);

      // Level 1: 2 first-level children (A1, C1)
      expect(levels.get(1)).toHaveLength(2);
      expect(levels.get(1)?.[0].input.slug).toBe("a1");
      expect(levels.get(1)?.[1].input.slug).toBe("c1");

      // Level 2: 1 second-level child (C1a)
      expect(levels.get(2)).toHaveLength(1);
      expect(levels.get(2)?.[0].input.slug).toBe("c1a");
    });
  });

  describe("bootstrapCategoriesOptimized", () => {
    it("should create categories in level order with correct parent IDs", async () => {
      const mockCreateCategory = mockRepository.createCategory as ReturnType<typeof vi.fn>;
      const mockGetCategoryBySlug = mockRepository.getCategoryBySlug as ReturnType<typeof vi.fn>;
      const mockGetAllCategories = mockRepository.getAllCategories as ReturnType<typeof vi.fn>;

      // Setup mocks
      mockGetCategoryBySlug.mockResolvedValue(null);
      mockGetAllCategories.mockResolvedValue([]);

      // Track creation order
      const creationOrder: string[] = [];
      mockCreateCategory.mockImplementation(async (input) => {
        creationOrder.push(input.slug);
        return {
          id: `${input.slug}-id`,
          name: input.name,
          slug: input.slug,
          level: 0,
          parent: null,
        };
      });

      const categories: CategoryInput[] = [
        {
          name: "Root",
          slug: "root",
          subcategories: [
            { name: "Child1", slug: "child1" },
            { name: "Child2", slug: "child2" },
          ],
        },
      ];

      await categoryService.bootstrapCategoriesOptimized(categories);

      // Root should be created first
      expect(creationOrder[0]).toBe("root");

      // Children should be created after root (order within level may vary)
      expect(creationOrder).toContain("child1");
      expect(creationOrder).toContain("child2");

      // Children should have correct parent ID
      const childCalls = mockCreateCategory.mock.calls.filter(
        (call) => call[0].slug === "child1" || call[0].slug === "child2"
      );
      childCalls.forEach((call) => {
        expect(call[1]).toBe("root-id");
      });
    });

    it("should skip API calls for existing categories", async () => {
      const mockCreateCategory = mockRepository.createCategory as ReturnType<typeof vi.fn>;
      const mockGetCategoryBySlug = mockRepository.getCategoryBySlug as ReturnType<typeof vi.fn>;
      const mockGetAllCategories = mockRepository.getAllCategories as ReturnType<typeof vi.fn>;

      // Category already exists in cache
      const existingCategory = {
        id: "existing-id",
        name: "Existing",
        slug: "existing",
        level: 0,
        parent: null,
      };
      mockGetAllCategories.mockResolvedValue([existingCategory]);
      mockGetCategoryBySlug.mockImplementation(async (slug) => {
        if (slug === "existing") return existingCategory;
        return null;
      });

      const categories: CategoryInput[] = [{ name: "Existing", slug: "existing" }];

      await categoryService.bootstrapCategoriesOptimized(categories);

      // Should not call createCategory for existing category
      expect(mockCreateCategory).not.toHaveBeenCalled();
    });
  });
});
