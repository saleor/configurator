import { describe, expect, it, vi } from "vitest";
import { ConfigurationService } from "./config-service";
import type { ConfigurationOperations, RawSaleorConfig } from "./repository";
import type { ConfigurationStorage } from "./yaml-manager";

describe("ConfigurationService - Category Mapping", () => {
  const mockRepository: ConfigurationOperations = {
    fetchConfig: vi.fn(),
  };

  const mockYamlManager: ConfigurationStorage = {
    save: vi.fn(),
    read: vi.fn(),
  };

  const service = new ConfigurationService(mockRepository, mockYamlManager);

  describe("mapCategories", () => {
    it("should map flat categories correctly", async () => {
      const rawConfig: RawSaleorConfig = {
        shop: null,
        channels: null,
        productTypes: null,
        pageTypes: null,
        categories: {
          edges: [
            {
              node: {
                id: "1",
                name: "Electronics",
                slug: "electronics",
                level: 0,
                parent: null,
              },
            },
            {
              node: {
                id: "2",
                name: "Clothing",
                slug: "clothing",
                level: 0,
                parent: null,
              },
            },
          ],
        },
        shippingZones: null,
        warehouses: null,
      };

      vi.mocked(mockRepository.fetchConfig).mockResolvedValue(rawConfig);

      const result = service.mapConfig(rawConfig);

      expect(result.categories).toEqual([
        {
          name: "Electronics",
          slug: "electronics",
        },
        {
          name: "Clothing",
          slug: "clothing",
        },
      ]);
    });

    it("should map nested categories with parent-child relationships", async () => {
      const rawConfig: RawSaleorConfig = {
        shop: null,
        channels: null,
        productTypes: null,
        pageTypes: null,
        categories: {
          edges: [
            {
              node: {
                id: "1",
                name: "Electronics",
                slug: "electronics",
                level: 0,
                parent: null,
              },
            },
            {
              node: {
                id: "2",
                name: "Laptops",
                slug: "laptops",
                level: 1,
                parent: {
                  id: "1",
                  slug: "electronics",
                },
              },
            },
            {
              node: {
                id: "3",
                name: "Gaming Laptops",
                slug: "gaming-laptops",
                level: 2,
                parent: {
                  id: "2",
                  slug: "laptops",
                },
              },
            },
          ],
        },
        shippingZones: null,
        warehouses: null,
      };

      vi.mocked(mockRepository.fetchConfig).mockResolvedValue(rawConfig);

      const result = service.mapConfig(rawConfig);

      expect(result.categories).toEqual([
        {
          name: "Electronics",
          slug: "electronics",
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
      ]);
    });

    it("should handle multiple root categories with subcategories", async () => {
      const rawConfig: RawSaleorConfig = {
        shop: null,
        channels: null,
        productTypes: null,
        pageTypes: null,
        categories: {
          edges: [
            {
              node: {
                id: "1",
                name: "Electronics",
                slug: "electronics",
                level: 0,
                parent: null,
              },
            },
            {
              node: {
                id: "2",
                name: "Laptops",
                slug: "laptops",
                level: 1,
                parent: {
                  id: "1",
                  slug: "electronics",
                },
              },
            },
            {
              node: {
                id: "3",
                name: "Phones",
                slug: "phones",
                level: 1,
                parent: {
                  id: "1",
                  slug: "electronics",
                },
              },
            },
            {
              node: {
                id: "4",
                name: "Clothing",
                slug: "clothing",
                level: 0,
                parent: null,
              },
            },
            {
              node: {
                id: "5",
                name: "Men's Clothing",
                slug: "mens-clothing",
                level: 1,
                parent: {
                  id: "4",
                  slug: "clothing",
                },
              },
            },
          ],
        },
        shippingZones: null,
        warehouses: null,
      };

      vi.mocked(mockRepository.fetchConfig).mockResolvedValue(rawConfig);

      const result = service.mapConfig(rawConfig);

      expect(result.categories).toEqual([
        {
          name: "Electronics",
          slug: "electronics",
          subcategories: [
            {
              name: "Laptops",
              slug: "laptops",
            },
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
              name: "Men's Clothing",
              slug: "mens-clothing",
            },
          ],
        },
      ]);
    });

    it("should handle categories with deep nesting (3+ levels)", async () => {
      const rawConfig: RawSaleorConfig = {
        shop: null,
        channels: null,
        productTypes: null,
        pageTypes: null,
        categories: {
          edges: [
            {
              node: {
                id: "1",
                name: "Root",
                slug: "root",
                level: 0,
                parent: null,
              },
            },
            {
              node: {
                id: "2",
                name: "Level 1",
                slug: "level-1",
                level: 1,
                parent: {
                  id: "1",
                  slug: "root",
                },
              },
            },
            {
              node: {
                id: "3",
                name: "Level 2",
                slug: "level-2",
                level: 2,
                parent: {
                  id: "2",
                  slug: "level-1",
                },
              },
            },
            {
              node: {
                id: "4",
                name: "Level 3",
                slug: "level-3",
                level: 3,
                parent: {
                  id: "3",
                  slug: "level-2",
                },
              },
            },
            {
              node: {
                id: "5",
                name: "Level 4",
                slug: "level-4",
                level: 4,
                parent: {
                  id: "4",
                  slug: "level-3",
                },
              },
            },
          ],
        },
        shippingZones: null,
        warehouses: null,
      };

      vi.mocked(mockRepository.fetchConfig).mockResolvedValue(rawConfig);

      const result = service.mapConfig(rawConfig);

      expect(result.categories).toEqual([
        {
          name: "Root",
          slug: "root",
          subcategories: [
            {
              name: "Level 1",
              slug: "level-1",
              subcategories: [
                {
                  name: "Level 2",
                  slug: "level-2",
                  subcategories: [
                    {
                      name: "Level 3",
                      slug: "level-3",
                      subcategories: [
                        {
                          name: "Level 4",
                          slug: "level-4",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);
    });

    it("should handle empty categories", async () => {
      const rawConfig: RawSaleorConfig = {
        shop: null,
        channels: null,
        productTypes: null,
        pageTypes: null,
        categories: {
          edges: [],
        },
        shippingZones: null,
        warehouses: null,
      };

      vi.mocked(mockRepository.fetchConfig).mockResolvedValue(rawConfig);

      const result = service.mapConfig(rawConfig);

      expect(result.categories).toEqual([]);
    });

    it("should handle null categories", async () => {
      const rawConfig: RawSaleorConfig = {
        shop: null,
        channels: null,
        productTypes: null,
        pageTypes: null,
        categories: null,
        shippingZones: null,
        warehouses: null,
      };

      vi.mocked(mockRepository.fetchConfig).mockResolvedValue(rawConfig);

      const result = service.mapConfig(rawConfig);

      expect(result.categories).toEqual([]);
    });
  });
});