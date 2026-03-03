import { describe, expect, it } from "vitest";
import { AttributeCache } from "../../modules/attribute/attribute-cache";
import type { DiffOperation, DiffResult, EntityType } from "../diff/types";
import { attributesStage, categoriesStage, channelsStage, productTypesStage } from "./stages";
import type { DeploymentContext } from "./types";

describe("Dependency-Aware Stage Skipping", () => {
  const createMockContext = (
    results: Array<{ entityType: EntityType; entityName: string; operation: DiffOperation }>
  ): DeploymentContext => {
    const diffResults: DiffResult[] = results.map((r) => ({
      operation: r.operation,
      entityType: r.entityType,
      entityName: r.entityName,
    }));

    return {
      configurator: {} as DeploymentContext["configurator"],
      args: {} as DeploymentContext["args"],
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
    it("should run categories stage when products reference categories", () => {
      const context = createMockContext([
        { entityType: "Products", entityName: "boston-museum-science", operation: "CREATE" },
        { entityType: "Products", entityName: "premium-smartphone-x1", operation: "CREATE" },
      ]);

      expect(categoriesStage.skip?.(context)).toBe(false);
      expect(productTypesStage.skip?.(context)).toBe(false);
      expect(channelsStage.skip?.(context)).toBe(false);
    });

    it("should skip dependency stages when no products and no dependency changes", () => {
      const context = createMockContext([
        { entityType: "Shop Settings", entityName: "shop", operation: "UPDATE" },
      ]);

      expect(categoriesStage.skip?.(context)).toBe(true);
      expect(productTypesStage.skip?.(context)).toBe(true);
      expect(channelsStage.skip?.(context)).toBe(true);
    });

    it("should run only relevant dependency stages", () => {
      const context = createMockContext([
        { entityType: "Products", entityName: "smartphone", operation: "CREATE" },
        { entityType: "Categories", entityName: "electronics", operation: "CREATE" },
      ]);

      expect(categoriesStage.skip?.(context)).toBe(false);
      expect(productTypesStage.skip?.(context)).toBe(false);
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
        { entityType: "Warehouses", entityName: "warehouse1", operation: "UPDATE" },
        { entityType: "Shipping Zones", entityName: "zone1", operation: "DELETE" },
      ]);

      expect(categoriesStage.skip?.(context)).toBe(false);
      expect(productTypesStage.skip?.(context)).toBe(false);
      expect(channelsStage.skip?.(context)).toBe(false);
    });
  });

  describe("Attributes stage skip behavior", () => {
    it("should NOT skip when diff has attribute changes", () => {
      const context = createMockContext([
        { entityType: "Product Attributes", entityName: "Color", operation: "CREATE" },
      ]);

      expect(attributesStage.skip?.(context)).toBe(false);
    });

    it("should NOT skip when diff has content attribute changes", () => {
      const context = createMockContext([
        { entityType: "Content Attributes", entityName: "Author", operation: "CREATE" },
      ]);

      expect(attributesStage.skip?.(context)).toBe(false);
    });

    it("should NOT skip when product types need the attribute cache", () => {
      const context = createMockContext([
        { entityType: "Product Types", entityName: "Books", operation: "CREATE" },
      ]);

      expect(attributesStage.skip?.(context)).toBe(false);
    });

    it("should NOT skip when page types need the attribute cache", () => {
      const context = createMockContext([
        { entityType: "Page Types", entityName: "BlogPost", operation: "CREATE" },
      ]);

      expect(attributesStage.skip?.(context)).toBe(false);
    });

    it("should NOT skip when model types need the attribute cache", () => {
      const context = createMockContext([
        { entityType: "Model Types" as EntityType, entityName: "Article", operation: "UPDATE" },
      ]);

      expect(attributesStage.skip?.(context)).toBe(false);
    });

    it("should skip when diff has only unrelated changes", () => {
      const context = createMockContext([
        { entityType: "Shop Settings", entityName: "shop", operation: "UPDATE" },
        { entityType: "Channels", entityName: "default-channel", operation: "UPDATE" },
      ]);

      expect(attributesStage.skip?.(context)).toBe(true);
    });

    it("should skip when diff is empty", () => {
      const context = createMockContext([]);
      expect(attributesStage.skip?.(context)).toBe(true);
    });
  });
});
