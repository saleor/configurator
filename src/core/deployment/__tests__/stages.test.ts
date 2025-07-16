import { describe, it, expect, vi } from "vitest";
import { 
  validationStage, 
  shopSettingsStage, 
  productTypesStage,
  getAllStages 
} from "../stages";
import type { DeploymentContext } from "../types";
import { SaleorConfigurator } from "../../configurator";

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
      
      expect(context.configurator.services.productType.bootstrapProductType)
        .toHaveBeenCalledWith({ name: "Test Type" });
    });

    it("skips when no product type changes", () => {
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
  });

  describe("getAllStages", () => {
    it("returns all stages in correct order", () => {
      const stages = getAllStages();
      
      expect(stages).toHaveLength(7);
      expect(stages[0].name).toBe("Validating configuration");
      expect(stages[1].name).toBe("Updating shop settings");
      expect(stages[2].name).toBe("Managing product types");
      expect(stages[3].name).toBe("Managing channels");
      expect(stages[4].name).toBe("Managing page types");
      expect(stages[5].name).toBe("Managing categories");
      expect(stages[6].name).toBe("Managing products");
    });
  });
});