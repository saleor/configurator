import { describe, expect, it } from "vitest";
import { AttributeCache } from "../../modules/attribute/attribute-cache";
import type { DiffResult } from "../diff/types";
import { categoriesStage, channelsStage, productTypesStage } from "./stages";
import type { DeploymentContext } from "./types";

describe("Dependency-Aware Stage Skipping", () => {
  const createMockContext = (
    results: Array<{ entityType: string; entityName: string; operation: string }>
  ): DeploymentContext => {
    const diffResults: DiffResult[] = results.map((r) => ({
      operation: r.operation as any,
      entityType: r.entityType as any,
      entityName: r.entityName,
    }));

    return {
      configurator: {} as any,
      args: {} as any,
      startTime: new Date(),
      summary: {
        totalChanges: results.length,
        creates: results.filter((r) => r.operation === "CREATE").length,
        updates: results.filter((r) => r.operation === "UPDATE").length,
        deletes: results.filter((r) => r.operation === "DELETE").length,
        results: diffResults,
      },
      attributeCache: new AttributeCache(),
    } as DeploymentContext;
  };

  describe("Real-world scenarios", () => {
    it("should run categories stage when products reference categories (minimal-config scenario)", () => {
      // This represents the exact scenario from minimal-config.yml:
      // - Products section with 2 products referencing categories
      // - No categories section in config (no category changes)
      const context = createMockContext([
        { entityType: "Products", entityName: "boston-museum-science", operation: "CREATE" },
        { entityType: "Products", entityName: "premium-smartphone-x1", operation: "CREATE" },
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
        { entityType: "Shop Settings", entityName: "shop", operation: "update" },
      ]);

      // All dependency stages should skip (no products)
      expect(categoriesStage.skip?.(context)).toBe(true);
      expect(productTypesStage.skip?.(context)).toBe(true);
      expect(channelsStage.skip?.(context)).toBe(true);
    });

    it("should run only relevant dependency stages", () => {
      // Products + Categories changes, but no Product Types/Channels changes
      const context = createMockContext([
        { entityType: "Products", entityName: "smartphone", operation: "CREATE" },
        { entityType: "Categories", entityName: "electronics", operation: "CREATE" },
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
        { entityType: "Products", entityName: "product1", operation: "CREATE" },
        { entityType: "Warehouses", entityName: "warehouse1", operation: "update" },
        { entityType: "Shipping Zones", entityName: "zone1", operation: "delete" },
      ]);

      // All dependency stages should run because of Products changes
      expect(categoriesStage.skip?.(context)).toBe(false);
      expect(productTypesStage.skip?.(context)).toBe(false);
      expect(channelsStage.skip?.(context)).toBe(false);
    });
  });
});
