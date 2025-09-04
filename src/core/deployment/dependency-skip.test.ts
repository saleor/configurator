import { describe, expect, it } from "vitest";
import { categoriesStage, channelsStage, productTypesStage } from "./stages";
import type { DeploymentContext } from "./types";

describe("Dependency-Aware Stage Skipping", () => {
  const createMockContext = (results: Array<{ entityType: string; entityName: string; action: string }>): DeploymentContext => {
    return {
      summary: {
        totalChanges: results.length,
        creates: results.filter(r => r.action === "create").length,
        updates: results.filter(r => r.action === "update").length,
        deletes: results.filter(r => r.action === "delete").length,
        results,
      },
    } as DeploymentContext;
  };

  describe("Real-world scenarios", () => {
    it("should run categories stage when products reference categories (minimal-config scenario)", () => {
      // This represents the exact scenario from minimal-config.yml:
      // - Products section with 2 products referencing categories
      // - No categories section in config (no category changes)
      const context = createMockContext([
        { entityType: "Products", entityName: "boston-museum-science", action: "create" },
        { entityType: "Products", entityName: "premium-smartphone-x1", action: "create" }
      ]);

      // Categories stage should NOT skip (dependency-aware)
      expect(categoriesStage.skip?.(context)).toBe(false);
      
      // Product Types stage should NOT skip (dependency-aware) 
      expect(productTypesStage.skip?.(context)).toBe(false);
      
      // Channels stage should NOT skip (dependency-aware)
      expect(channelsStage.skip?.(context)).toBe(false);
    });

    it("should skip dependency stages when no products and no dependency changes", () => {
      // This represents a scenario with only shop settings changes
      const context = createMockContext([
        { entityType: "Shop Settings", entityName: "shop", action: "update" }
      ]);

      // All dependency stages should skip (no products)
      expect(categoriesStage.skip?.(context)).toBe(true);
      expect(productTypesStage.skip?.(context)).toBe(true);
      expect(channelsStage.skip?.(context)).toBe(true);
    });

    it("should run only relevant dependency stages", () => {
      // Products + Categories changes, but no Product Types/Channels changes
      const context = createMockContext([
        { entityType: "Products", entityName: "smartphone", action: "create" },
        { entityType: "Categories", entityName: "electronics", action: "create" }
      ]);

      // Categories stage should run (has category changes)
      expect(categoriesStage.skip?.(context)).toBe(false);
      
      // Product Types stage should run (has product changes - dependency)
      expect(productTypesStage.skip?.(context)).toBe(false);
      
      // Channels stage should run (has product changes - dependency)
      expect(channelsStage.skip?.(context)).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty results", () => {
      const context = createMockContext([]);

      expect(categoriesStage.skip?.(context)).toBe(true);
      expect(productTypesStage.skip?.(context)).toBe(true);
      expect(channelsStage.skip?.(context)).toBe(true);
    });

    it("should handle mixed entity types", () => {
      const context = createMockContext([
        { entityType: "Products", entityName: "product1", action: "create" },
        { entityType: "Warehouses", entityName: "warehouse1", action: "update" },
        { entityType: "Shipping Zones", entityName: "zone1", action: "delete" }
      ]);

      // All dependency stages should run because of Products changes
      expect(categoriesStage.skip?.(context)).toBe(false);
      expect(productTypesStage.skip?.(context)).toBe(false);
      expect(channelsStage.skip?.(context)).toBe(false);
    });
  });
});