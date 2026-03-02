import { describe, expect, it, vi } from "vitest";
import { AttributeCache } from "../../../modules/attribute/attribute-cache";
import type { SaleorConfigurator } from "../../configurator";
import { StageAggregateError } from "../errors";
import {
  attributesStage,
  categoriesStage,
  channelsStage,
  getAllStages,
  productTypesStage,
  shopSettingsStage,
  validationStage,
} from "../stages";
import type { DeploymentContext } from "../types";

describe("Deployment Stages", () => {
  const createMockContext = (overrides?: Partial<DeploymentContext>): DeploymentContext => {
    const mockConfigStorage = {
      load: vi.fn().mockResolvedValue({
        shop: { defaultMailSenderName: "Test" },
        productTypes: [{ name: "Test Type" }],
      }),
    };

    const mockServices = {
      configStorage: mockConfigStorage,
      shop: {
        updateSettings: vi.fn().mockResolvedValue(undefined),
      },
      productType: {
        bootstrapProductType: vi.fn().mockResolvedValue(undefined),
      },
    };

    const mockConfigurator = {
      services: mockServices,
    } as unknown as SaleorConfigurator;

    const base = {
      configurator: mockConfigurator,
      args: {
        url: "test",
        token: "test",
        config: "test.yml",
        quiet: false,
        ci: false,
        verbose: false,
        json: false,
        plan: false,
        failOnDelete: false,
        skipMedia: false,
      },
      summary: {
        totalChanges: 1,
        creates: 1,
        updates: 0,
        deletes: 0,
        results: [{ entityType: "Shop Settings", entityName: "Shop", operation: "UPDATE" }],
      },
      startTime: new Date(),
      attributeCache: new AttributeCache(),
      ...overrides,
    };
    // Ensure attributeCache is always present
    return {
      ...base,
      attributeCache: base.attributeCache ?? new AttributeCache(),
    } as DeploymentContext;
  };

  describe("validationStage", () => {
    it("validates local configuration", async () => {
      const context = createMockContext();

      await validationStage.execute(context);

      expect(context.configurator.services.configStorage.load).toHaveBeenCalled();
    });
  });

  describe("shopSettingsStage", () => {
    it("updates shop settings when config has shop data", async () => {
      const context = createMockContext();

      await shopSettingsStage.execute(context);

      expect(context.configurator.services.shop.updateSettings).toHaveBeenCalledWith({
        defaultMailSenderName: "Test",
      });
    });

    it("skips when no shop changes in summary", () => {
      const context = createMockContext({
        summary: {
          totalChanges: 1,
          creates: 1,
          updates: 0,
          deletes: 0,
          results: [{ entityType: "Product Types", entityName: "Test", operation: "CREATE" }],
        },
      });

      expect(shopSettingsStage.skip?.(context)).toBe(true);
    });

    it("does not skip when shop changes exist", () => {
      const context = createMockContext();

      expect(shopSettingsStage.skip?.(context)).toBe(false);
    });
  });

  describe("productTypesStage", () => {
    it("bootstraps product types in parallel", async () => {
      const context = createMockContext();

      await productTypesStage.execute(context);

      expect(context.configurator.services.productType.bootstrapProductType).toHaveBeenCalledWith(
        { name: "Test Type" },
        { attributeCache: context.attributeCache }
      );
    });

    it("skips when no product type changes and no product changes", () => {
      const context = createMockContext({
        summary: {
          totalChanges: 0,
          creates: 0,
          updates: 0,
          deletes: 0,
          results: [],
        },
      });

      expect(productTypesStage.skip?.(context)).toBe(true);
    });

    it("does not skip when product type changes exist", () => {
      const context = createMockContext({
        summary: {
          totalChanges: 1,
          creates: 1,
          updates: 0,
          deletes: 0,
          results: [
            { entityType: "Product Types", entityName: "Electronics", operation: "CREATE" },
          ],
        },
      });

      expect(productTypesStage.skip?.(context)).toBe(false);
    });

    it("does not skip when product changes exist (dependency-aware)", () => {
      const context = createMockContext({
        summary: {
          totalChanges: 1,
          creates: 1,
          updates: 0,
          deletes: 0,
          results: [{ entityType: "Products", entityName: "smartphone", operation: "CREATE" }],
        },
      });

      expect(productTypesStage.skip?.(context)).toBe(false);
    });
  });

  describe("categoriesStage", () => {
    it("skips when no category changes and no product changes", () => {
      const context = createMockContext({
        summary: {
          totalChanges: 0,
          creates: 0,
          updates: 0,
          deletes: 0,
          results: [],
        },
      });

      expect(categoriesStage.skip?.(context)).toBe(true);
    });

    it("does not skip when category changes exist", () => {
      const context = createMockContext({
        summary: {
          totalChanges: 1,
          creates: 1,
          updates: 0,
          deletes: 0,
          results: [{ entityType: "Categories", entityName: "electronics", operation: "CREATE" }],
        },
      });

      expect(categoriesStage.skip?.(context)).toBe(false);
    });

    it("does not skip when product changes exist (dependency-aware)", () => {
      const context = createMockContext({
        summary: {
          totalChanges: 1,
          creates: 1,
          updates: 0,
          deletes: 0,
          results: [{ entityType: "Products", entityName: "smartphone", operation: "CREATE" }],
        },
      });

      expect(categoriesStage.skip?.(context)).toBe(false);
    });
  });

  describe("channelsStage", () => {
    it("skips when no channel changes and no product changes", () => {
      const context = createMockContext({
        summary: {
          totalChanges: 0,
          creates: 0,
          updates: 0,
          deletes: 0,
          results: [],
        },
      });

      expect(channelsStage.skip?.(context)).toBe(true);
    });

    it("does not skip when channel changes exist", () => {
      const context = createMockContext({
        summary: {
          totalChanges: 1,
          creates: 1,
          updates: 0,
          deletes: 0,
          results: [{ entityType: "Channels", entityName: "default", operation: "CREATE" }],
        },
      });

      expect(channelsStage.skip?.(context)).toBe(false);
    });

    it("does not skip when product changes exist (dependency-aware)", () => {
      const context = createMockContext({
        summary: {
          totalChanges: 1,
          creates: 1,
          updates: 0,
          deletes: 0,
          results: [{ entityType: "Products", entityName: "smartphone", operation: "CREATE" }],
        },
      });

      expect(channelsStage.skip?.(context)).toBe(false);
    });
  });

  describe("getAllStages", () => {
    it("returns all stages in correct order", () => {
      const stages = getAllStages();

      expect(stages).toHaveLength(16);
      expect(stages[0].name).toBe("Validating configuration");
      expect(stages[1].name).toBe("Updating shop settings");
      expect(stages[2].name).toBe("Managing tax classes");
      expect(stages[3].name).toBe("Managing attributes");
      expect(stages[4].name).toBe("Managing product types");
      expect(stages[5].name).toBe("Managing channels");
      expect(stages[6].name).toBe("Managing page types");
      expect(stages[7].name).toBe("Managing model types");
      expect(stages[8].name).toBe("Managing categories");
      expect(stages[9].name).toBe("Managing collections");
      expect(stages[10].name).toBe("Managing menus");
      expect(stages[11].name).toBe("Managing models");
      expect(stages[12].name).toBe("Managing warehouses");
      expect(stages[13].name).toBe("Managing shipping zones");
      expect(stages[14].name).toBe("Preparing attribute choices");
      expect(stages[15].name).toBe("Managing products");
    });
  });

  describe("attributesStage", () => {
    const createAttributeContext = (
      configOverrides: Record<string, unknown> = {},
      summaryOverrides: Partial<DeploymentContext["summary"]> = {}
    ): DeploymentContext => {
      const mockAttributeService = {
        repo: {
          getAttributesByNames: vi.fn().mockResolvedValue([]),
        },
        bootstrapAttributes: vi.fn().mockImplementation(({ attributeInputs }) =>
          attributeInputs.map((a: { name: string }) => ({
            id: `id-${a.name}`,
            name: a.name,
            type: "PRODUCT_TYPE" as const,
            entityType: null,
            inputType: "DROPDOWN" as const,
            choices: null,
          }))
        ),
        updateAttribute: vi.fn().mockResolvedValue(undefined),
        bootstrapAttributesBulk: vi.fn().mockResolvedValue({ successful: [], failed: [] }),
        updateAttributesBulk: vi.fn().mockResolvedValue({ successful: [], failed: [] }),
      };

      const mockConfigStorage = {
        load: vi.fn().mockResolvedValue({
          productAttributes: [],
          contentAttributes: [],
          ...configOverrides,
        }),
      };

      const mockConfigurator = {
        services: {
          configStorage: mockConfigStorage,
          attribute: mockAttributeService,
        },
      } as unknown as SaleorConfigurator;

      return {
        configurator: mockConfigurator,
        args: {
          url: "test",
          token: "test",
          config: "test.yml",
          quiet: false,
          ci: false,
          verbose: false,
          json: false,
          plan: false,
          failOnDelete: false,
          skipMedia: false,
        },
        summary: {
          totalChanges: 1,
          creates: 1,
          updates: 0,
          deletes: 0,
          results: [{ entityType: "Product Attributes", entityName: "Color", operation: "CREATE" }],
          ...summaryOverrides,
        },
        startTime: new Date(),
        attributeCache: new AttributeCache(),
      } as DeploymentContext;
    };

    it("processes productAttributes and contentAttributes, populating cache", async () => {
      const context = createAttributeContext({
        productAttributes: [{ name: "Color", inputType: "DROPDOWN", values: [{ name: "Red" }] }],
        contentAttributes: [{ name: "Author", inputType: "PLAIN_TEXT" }],
      });

      await attributesStage.execute(context);

      const stats = context.attributeCache.getStats();
      expect(stats.productAttributeCount).toBe(1);
      expect(stats.contentAttributeCount).toBe(1);
    });

    it("handles empty config with no errors", async () => {
      const context = createAttributeContext({
        productAttributes: [],
        contentAttributes: [],
      });

      await attributesStage.execute(context);

      const stats = context.attributeCache.getStats();
      expect(stats.totalCount).toBe(0);
    });

    it("populates cache even on partial failures (Task 1.4)", async () => {
      const context = createAttributeContext({
        productAttributes: [
          { name: "Color", inputType: "DROPDOWN", values: [{ name: "Red" }] },
          { name: "Size", inputType: "DROPDOWN", values: [{ name: "S" }] },
        ],
      });

      // Make bootstrapAttributes succeed for first, fail for second
      const attrService = context.configurator.services.attribute;
      let callCount = 0;
      vi.mocked(attrService.bootstrapAttributes).mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error("API error for Size");
        }
        return [
          {
            id: "id-Color",
            name: "Color",
            type: "PRODUCT_TYPE" as const,
            entityType: null,
            inputType: "DROPDOWN" as const,
            choices: null,
          },
        ];
      });

      await expect(attributesStage.execute(context)).rejects.toThrow(StageAggregateError);

      // Cache should still have the successful attribute
      const stats = context.attributeCache.getStats();
      expect(stats.productAttributeCount).toBeGreaterThanOrEqual(1);
    });

    it("throws StageAggregateError when all attributes fail", async () => {
      const context = createAttributeContext({
        productAttributes: [{ name: "Bad", inputType: "DROPDOWN", values: [{ name: "X" }] }],
      });

      vi.mocked(context.configurator.services.attribute.bootstrapAttributes).mockRejectedValue(
        new Error("Total failure")
      );

      await expect(attributesStage.execute(context)).rejects.toThrow(StageAggregateError);
    });

    it("skip returns true when no attribute entity types in summary", () => {
      const context = createAttributeContext(
        {},
        {
          results: [{ entityType: "Products", entityName: "shoe", operation: "CREATE" }],
        }
      );

      expect(attributesStage.skip?.(context)).toBe(true);
    });

    it("skip returns false when attribute entity types in summary", () => {
      const context = createAttributeContext(
        {},
        {
          results: [{ entityType: "Product Attributes", entityName: "Color", operation: "CREATE" }],
        }
      );

      expect(attributesStage.skip?.(context)).toBe(false);
    });
  });
});
