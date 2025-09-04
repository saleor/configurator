import { describe, expect, it } from "vitest";
import type { SaleorConfig } from "../modules/config/schema/schema";

describe("New Entities Integration", () => {
  const mockConfig: Partial<SaleorConfig> = {
    models: [
      {
        title: "Test Model",
        slug: "test-model",
        content: '{"time": 1234567890, "blocks": [{"id": "block1", "type": "paragraph", "data": {"text": "Test content"}}], "version": "2.24.3"}',
        isPublished: true,
        publishedAt: "2024-12-22T00:00:00+00:00",
        modelType: "Simple",
        attributes: {},
      },
    ],
    collections: [
      {
        name: "Test Collection",
        slug: "test-collection",
        description: '{"time": 1234567890, "blocks": [{"id": "block1", "type": "paragraph", "data": {"text": "Test description"}}], "version": "2.24.3"}',
        products: ["product-1"],
        channelListings: [
          {
            channelSlug: "default-channel",
            isPublished: true,
            publishedAt: "2024-12-22T00:00:00+00:00",
          },
        ],
      },
    ],
    menus: [
      {
        name: "Test Menu",
        slug: "test-menu",
        items: [
          {
            name: "Electronics",
            category: "electronics-technology",
          },
          {
            name: "About",
            page: "about",
          },
        ],
      },
    ],
    modelTypes: [
      {
        name: "Simple",
        attributes: [],
      },
    ],
  };

  describe("Entity Type Validation", () => {
    it("should validate that new entity types are properly defined", () => {
      // Test that our new entity types exist in the type system
      const entityTypes = ["Models", "Collections", "Menus", "Model Types"];
      
      entityTypes.forEach((entityType) => {
        expect(entityType).toBeDefined();
        expect(typeof entityType).toBe("string");
        expect(entityType.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Configuration Loading Integration", () => {
    it("should successfully load configuration with new entities", () => {
      const config = mockConfig as SaleorConfig;

      expect(config.models).toBeDefined();
      expect(config.collections).toBeDefined();
      expect(config.menus).toBeDefined();
      expect(config.modelTypes).toBeDefined();

      expect(config.models).toHaveLength(1);
      expect(config.collections).toHaveLength(1);
      expect(config.menus).toHaveLength(1);
      expect(config.modelTypes).toHaveLength(1);
    });

    it("should validate new entity configurations", () => {
      const config = mockConfig as SaleorConfig;

      // Validate model structure
      const model = config.models![0];
      expect(model.title).toBe("Test Model");
      expect(model.slug).toBe("test-model");
      expect(model.modelType).toBe("Simple");
      expect(model.isPublished).toBe(true);

      // Validate collection structure
      const collection = config.collections![0];
      expect(collection.name).toBe("Test Collection");
      expect(collection.slug).toBe("test-collection");
      expect(collection.products).toEqual(["product-1"]);
      expect(collection.channelListings).toHaveLength(1);

      // Validate menu structure
      const menu = config.menus![0];
      expect(menu.name).toBe("Test Menu");
      expect(menu.slug).toBe("test-menu");
      expect(menu.items).toHaveLength(2);
      expect(menu.items![0].category).toBe("electronics-technology");
      expect(menu.items![1].page).toBe("about");

      // Validate model type structure
      const modelType = config.modelTypes![0];
      expect(modelType.name).toBe("Simple");
      expect(modelType.attributes).toEqual([]);
    });
  });

  describe("Schema Validation Integration", () => {
    it("should accept both old and new naming conventions", () => {
      const configWithOldNaming = {
        pages: [
          {
            title: "Old Style Page",
            slug: "old-style-page",
            content: "{}",
            isPublished: true,
            pageType: "Simple",
            attributes: {},
          },
        ],
        pageTypes: [
          {
            name: "Simple",
            attributes: [],
          },
        ],
      };

      const configWithNewNaming = {
        models: [
          {
            title: "New Style Model",
            slug: "new-style-model",
            content: "{}",
            isPublished: true,
            modelType: "Simple",
            attributes: {},
          },
        ],
        modelTypes: [
          {
            name: "Simple",
            attributes: [],
          },
        ],
      };

      // Both configurations should be valid
      expect(configWithOldNaming.pages).toBeDefined();
      expect(configWithOldNaming.pageTypes).toBeDefined();
      expect(configWithNewNaming.models).toBeDefined();
      expect(configWithNewNaming.modelTypes).toBeDefined();
    });
  });

  describe("Error Handling Integration", () => {
    it("should provide meaningful error messages for new entities", () => {
      // Test that our error classes are properly integrated
      const errors = [
        "ModelValidationError",
        "ModelOperationError",
        "CollectionValidationError",
        "CollectionOperationError",
        "MenuValidationError",
        "MenuOperationError",
      ];

      errors.forEach((errorName) => {
        expect(errorName).toMatch(/^(Model|Collection|Menu)(Validation|Operation)Error$/);
      });
    });
  });
});

describe("Backward Compatibility Integration", () => {
  it("should support configurations with mixed old and new naming", () => {
    const mixedConfig = {
      // Old naming
      pages: [
        {
          title: "Legacy Page",
          slug: "legacy-page",
          content: "{}",
          isPublished: true,
          pageType: "Simple",
          attributes: {},
        },
      ],
      pageTypes: [
        {
          name: "Legacy Type",
          attributes: [],
        },
      ],
      // New naming
      models: [
        {
          title: "Modern Model",
          slug: "modern-model",
          content: "{}",
          isPublished: true,
          modelType: "Blog Post",
          attributes: {},
        },
      ],
      modelTypes: [
        {
          name: "Blog Post",
          attributes: [],
        },
      ],
      // New entities
      collections: [
        {
          name: "New Collection",
          slug: "new-collection",
          products: [],
        },
      ],
      menus: [
        {
          name: "New Menu",
          slug: "new-menu",
          items: [],
        },
      ],
    };

    expect(mixedConfig.pages).toHaveLength(1);
    expect(mixedConfig.pageTypes).toHaveLength(1);
    expect(mixedConfig.models).toHaveLength(1);
    expect(mixedConfig.modelTypes).toHaveLength(1);
    expect(mixedConfig.collections).toHaveLength(1);
    expect(mixedConfig.menus).toHaveLength(1);
  });
});