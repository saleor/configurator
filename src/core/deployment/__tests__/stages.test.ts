import { describe, expect, it, vi } from "vitest";
import type { SaleorConfigurator } from "../../configurator";
import {
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

    return {
      configurator: mockConfigurator,
      args: {
        url: "test",
        token: "test",
        config: "test.yml",
        quiet: false,
        ci: false,
        verbose: false,
      },
      summary: {
        totalChanges: 1,
        creates: 1,
        updates: 0,
        deletes: 0,
        results: [{ entityType: "Shop Settings", entityName: "Shop", operation: "UPDATE" }],
      },
      startTime: new Date(),
      ...overrides,
    };
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

      expect(context.configurator.services.productType.bootstrapProductType).toHaveBeenCalledWith({
        name: "Test Type",
      });
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
});
