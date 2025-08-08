import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryService } from "./category-service";
import type { CategoryOperations } from "./repository";
import type { CategoryInput } from "../config/schema/schema";

// Mock category repository
const mockRepository: CategoryOperations = {
  createCategory: vi.fn(),
  getCategoryByName: vi.fn(),
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
    const mockGetCategoryByName = mockRepository.getCategoryByName as ReturnType<typeof vi.fn>;

    // Return null for all getCategoryByName calls (categories don't exist)
    mockGetCategoryByName.mockResolvedValue(null);

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
    expect(mockCreateCategory).toHaveBeenNthCalledWith(1, {
      name: "Electronics",
      slug: "electronics",
    }, undefined);

    // Level 1 (parent: root)
    expect(mockCreateCategory).toHaveBeenNthCalledWith(2, {
      name: "Computers",
      slug: "computers",
    }, "root-id");

    // Level 2 (parent: level 1)
    expect(mockCreateCategory).toHaveBeenNthCalledWith(3, {
      name: "Laptops",
      slug: "laptops",
    }, "l1-id");

    // Level 3 (parent: level 2)
    expect(mockCreateCategory).toHaveBeenNthCalledWith(4, {
      name: "Gaming Laptops",
      slug: "gaming-laptops",
    }, "l2-id");
  });

  it("should handle multiple root categories with subcategories", async () => {
    const mockCreateCategory = mockRepository.createCategory as ReturnType<typeof vi.fn>;
    const mockGetCategoryByName = mockRepository.getCategoryByName as ReturnType<typeof vi.fn>;

    mockGetCategoryByName.mockResolvedValue(null);

    // Mock creation responses for multiple trees
    mockCreateCategory
      .mockResolvedValueOnce({ id: "electronics-id", name: "Electronics", slug: "electronics" })
      .mockResolvedValueOnce({ id: "clothing-id", name: "Clothing", slug: "clothing" })
      .mockResolvedValueOnce({ id: "phones-id", name: "Phones", slug: "phones" })
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
    expect(mockCreateCategory).toHaveBeenCalledWith({
      name: "Electronics",
      slug: "electronics",
    }, undefined);
    
    expect(mockCreateCategory).toHaveBeenCalledWith({
      name: "Clothing", 
      slug: "clothing",
    }, undefined);

    // Two subcategories with correct parents
    expect(mockCreateCategory).toHaveBeenCalledWith({
      name: "Phones",
      slug: "phones",
    }, "electronics-id");

    expect(mockCreateCategory).toHaveBeenCalledWith({
      name: "Shirts",
      slug: "shirts",
    }, "clothing-id");
  });
});