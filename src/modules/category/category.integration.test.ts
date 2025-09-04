import { describe, expect, it, vi } from "vitest";
import { ConfigurationService } from "../config/config-service";
import type { ConfigurationOperations } from "../config/repository";
import type { ConfigurationStorage } from "../config/yaml-manager";
import { CategoryService } from "./category-service";
import type { CategoryOperations } from "./repository";

describe("Category Round-Trip Integrity", () => {
  it("should maintain category hierarchy through deploy and introspect cycle", async () => {
    // Step 1: Start with a nested category configuration
    const initialConfig = {
      categories: [
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
                },
                {
                  name: "Desktops",
                  slug: "desktops",
                },
              ],
            },
            {
              name: "Audio",
              slug: "audio",
            },
          ],
        },
        {
          name: "Clothing",
          slug: "clothing",
          subcategories: [
            {
              name: "Mens",
              slug: "mens",
            },
          ],
        },
      ],
    };

    // Step 2: Deploy categories (simulate)
    interface DeployedCategory {
      id: string;
      name: string;
      slug: string;
      level: number;
      parent: { id: string; slug: string } | null;
    }
    const deployedCategories: DeployedCategory[] = [];
    const mockCategoryRepository: CategoryOperations = {
      createCategory: vi.fn().mockImplementation((input, parentId) => {
        const category: DeployedCategory = {
          id: `cat-${deployedCategories.length + 1}`,
          name: input.name,
          slug: input.slug,
          level: parentId ? (deployedCategories.find((c) => c.id === parentId)?.level ?? 0) + 1 : 0,
          parent: parentId
            ? { id: parentId, slug: deployedCategories.find((c) => c.id === parentId)?.slug ?? "" }
            : null,
        };
        deployedCategories.push(category);
        return Promise.resolve(category);
      }),
      getCategoryByName: vi.fn().mockImplementation((name) => {
        return Promise.resolve(deployedCategories.find((c) => c.name === name));
      }),
      getAllCategories: vi.fn().mockResolvedValue(deployedCategories),
    };

    const categoryService = new CategoryService(mockCategoryRepository);

    // Deploy the categories
    await categoryService.bootstrapCategories(initialConfig.categories);

    // Step 3: Introspect (simulate fetching from Saleor)
    const mockConfigRepository: ConfigurationOperations = {
      fetchConfig: vi.fn().mockResolvedValue({
        shop: null,
        channels: null,
        productTypes: null,
        pageTypes: null,
        categories: {
          edges: deployedCategories.map((cat) => ({
            node: {
              id: cat.id,
              name: cat.name,
              slug: cat.slug,
              level: cat.level,
              parent: cat.parent,
            },
          })),
        },
        shippingZones: null,
        warehouses: null,
      }),
    };

    const mockStorage: ConfigurationStorage = {
      save: vi.fn(),
      load: vi.fn(),
    };

    const configService = new ConfigurationService(mockConfigRepository, mockStorage);

    // Introspect the configuration
    const introspectedConfig = await configService.retrieve();

    // Step 4: Verify the hierarchy is maintained
    expect(introspectedConfig.categories).toHaveLength(2); // Two root categories

    // Check Electronics hierarchy
    const electronics = introspectedConfig.categories?.find((c) => c.slug === "electronics");
    expect(electronics).toBeDefined();
    // @ts-expect-error - subcategories is not in the type but exists in runtime
    expect(electronics?.subcategories).toHaveLength(2);

    // @ts-expect-error - subcategories is not in the type but exists in runtime
    const computers = electronics?.subcategories?.find(
      (c: { slug: string }) => c.slug === "computers"
    );
    expect(computers).toBeDefined();
    const computersWithSubs = computers as { subcategories?: Array<{ slug: string }> } | undefined;
    expect(computersWithSubs?.subcategories).toHaveLength(2);
    expect(computersWithSubs?.subcategories?.map((c) => c.slug)).toContain("laptops");
    expect(computersWithSubs?.subcategories?.map((c) => c.slug)).toContain("desktops");

    // @ts-expect-error - subcategories is not in the type but exists in runtime
    const audio = electronics?.subcategories?.find((c: { slug: string }) => c.slug === "audio");
    expect(audio).toBeDefined();
    const audioWithSubs = audio as { subcategories?: unknown } | undefined;
    expect(audioWithSubs?.subcategories).toBeUndefined();

    // Check Clothing hierarchy
    const clothing = introspectedConfig.categories?.find((c) => c.slug === "clothing");
    expect(clothing).toBeDefined();
    // @ts-expect-error - subcategories is not in the type but exists in runtime
    expect(clothing?.subcategories).toHaveLength(1);
    // @ts-expect-error - subcategories is not in the type but exists in runtime
    expect(clothing?.subcategories?.[0].slug).toBe("mens");

    // Step 5: Verify the structure matches the original
    expect(introspectedConfig.categories).toEqual(initialConfig.categories);
  });

  it("should handle categories deployed in random order", async () => {
    // When categories are created out of order (child before parent)
    // the system should still build the correct hierarchy on introspection

    const mockConfigRepository: ConfigurationOperations = {
      fetchConfig: vi.fn().mockResolvedValue({
        shop: null,
        channels: null,
        productTypes: null,
        pageTypes: null,
        categories: {
          edges: [
            // Child appears before parent in the list
            {
              node: {
                id: "2",
                name: "Laptops",
                slug: "laptops",
                level: 2,
                parent: { id: "1", slug: "computers" },
              },
            },
            {
              node: {
                id: "1",
                name: "Computers",
                slug: "computers",
                level: 1,
                parent: { id: "0", slug: "electronics" },
              },
            },
            {
              node: {
                id: "0",
                name: "Electronics",
                slug: "electronics",
                level: 0,
                parent: null,
              },
            },
          ],
        },
        shippingZones: null,
        warehouses: null,
      }),
    };

    const mockStorage: ConfigurationStorage = {
      save: vi.fn(),
      load: vi.fn(),
    };

    const configService = new ConfigurationService(mockConfigRepository, mockStorage);
    const config = await configService.retrieve();

    // Should still build correct hierarchy despite out-of-order data
    expect(config.categories).toHaveLength(1);
    expect(config.categories?.[0].slug).toBe("electronics");
    // @ts-expect-error - subcategories is not in the type but exists in runtime
    expect(config.categories?.[0].subcategories?.[0].slug).toBe("computers");
    // @ts-expect-error - subcategories is not in the type but exists in runtime
    expect(config.categories?.[0].subcategories?.[0].subcategories?.[0].slug).toBe("laptops");
  });
});
