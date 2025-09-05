import { describe, expect, it } from "vitest";
import { StageAggregateError } from "./errors";
import {
  DeploymentResultCollector,
  DeploymentResultFormatter,
  type EntityResult,
  extractEntityResults,
  type StageStatus,
} from "./results";

describe("DeploymentResultCollector", () => {
  describe("createStageResult", () => {
    it("should create stage result with success status", () => {
      const collector = new DeploymentResultCollector();
      const startTime = new Date("2024-01-01T10:00:00Z");
      const endTime = new Date("2024-01-01T10:00:05Z");

      const entities: EntityResult[] = [
        { name: "product1", operation: "create", success: true },
        { name: "product2", operation: "update", success: true },
      ];

      const result = collector.createStageResult(
        "Products",
        "success",
        startTime,
        endTime,
        entities
      );

      expect(result).toEqual({
        name: "Products",
        status: "success",
        startTime,
        endTime,
        duration: 5000,
        entities,
        successCount: 2,
        failureCount: 0,
        totalCount: 2,
      });
    });

    it("should create stage result with partial status", () => {
      const collector = new DeploymentResultCollector();
      const startTime = new Date("2024-01-01T10:00:00Z");
      const endTime = new Date("2024-01-01T10:00:03Z");

      const entities: EntityResult[] = [
        { name: "product1", operation: "create", success: true },
        { name: "product2", operation: "create", success: false, error: "Category not found" },
      ];

      const result = collector.createStageResult(
        "Products",
        "partial",
        startTime,
        endTime,
        entities
      );

      expect(result).toEqual({
        name: "Products",
        status: "partial",
        startTime,
        endTime,
        duration: 3000,
        entities,
        successCount: 1,
        failureCount: 1,
        totalCount: 2,
      });
    });

    it("should handle stage without entities", () => {
      const collector = new DeploymentResultCollector();
      const startTime = new Date("2024-01-01T10:00:00Z");
      const endTime = new Date("2024-01-01T10:00:02Z");

      const result = collector.createStageResult("Shop Settings", "success", startTime, endTime);

      expect(result).toEqual({
        name: "Shop Settings",
        status: "success",
        startTime,
        endTime,
        duration: 2000,
        entities: undefined,
        successCount: 0,
        failureCount: 0,
        totalCount: 0,
      });
    });
  });

  describe("getResult", () => {
    it("should calculate overall success status", () => {
      const collector = new DeploymentResultCollector();

      collector.addStageResult({
        name: "Shop Settings",
        status: "success",
        startTime: new Date(),
        endTime: new Date(),
        duration: 1000,
        successCount: 1,
        failureCount: 0,
        totalCount: 1,
      });

      collector.addStageResult({
        name: "Products",
        status: "success",
        startTime: new Date(),
        endTime: new Date(),
        duration: 2000,
        successCount: 3,
        failureCount: 0,
        totalCount: 3,
      });

      const result = collector.getResult();

      expect(result.overallStatus).toBe("success");
      expect(result.summary).toEqual({
        totalEntities: 4,
        successfulEntities: 4,
        failedEntities: 0,
        skippedStages: 0,
        completedStages: 2,
        failedStages: 0,
      });
    });

    it("should calculate overall partial status", () => {
      const collector = new DeploymentResultCollector();

      collector.addStageResult({
        name: "Shop Settings",
        status: "success",
        startTime: new Date(),
        endTime: new Date(),
        duration: 1000,
        successCount: 1,
        failureCount: 0,
        totalCount: 1,
      });

      collector.addStageResult({
        name: "Products",
        status: "partial",
        startTime: new Date(),
        endTime: new Date(),
        duration: 2000,
        successCount: 2,
        failureCount: 1,
        totalCount: 3,
      });

      const result = collector.getResult();

      expect(result.overallStatus).toBe("partial");
      expect(result.summary).toEqual({
        totalEntities: 4,
        successfulEntities: 3,
        failedEntities: 1,
        skippedStages: 0,
        completedStages: 2,
        failedStages: 0,
      });
    });

    it("should calculate overall failed status when no successes", () => {
      const collector = new DeploymentResultCollector();

      collector.addStageResult({
        name: "Products",
        status: "failed",
        startTime: new Date(),
        endTime: new Date(),
        duration: 1000,
        error: "Connection failed",
        successCount: 0,
        failureCount: 2,
        totalCount: 2,
      });

      const result = collector.getResult();

      expect(result.overallStatus).toBe("failed");
      expect(result.summary).toEqual({
        totalEntities: 2,
        successfulEntities: 0,
        failedEntities: 2,
        skippedStages: 0,
        completedStages: 0,
        failedStages: 1,
      });
    });

    it("should handle skipped stages", () => {
      const collector = new DeploymentResultCollector();

      collector.addStageResult({
        name: "Shop Settings",
        status: "success",
        startTime: new Date(),
        endTime: new Date(),
        duration: 1000,
        successCount: 1,
        failureCount: 0,
        totalCount: 1,
      });

      collector.addStageResult({
        name: "Products",
        status: "skipped",
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        successCount: 0,
        failureCount: 0,
        totalCount: 0,
      });

      const result = collector.getResult();

      expect(result.overallStatus).toBe("success");
      expect(result.summary).toEqual({
        totalEntities: 1,
        successfulEntities: 1,
        failedEntities: 0,
        skippedStages: 1,
        completedStages: 1,
        failedStages: 0,
      });
    });
  });
});

describe("DeploymentResultFormatter", () => {
  const formatter = new DeploymentResultFormatter();

  describe("format", () => {
    it("should format successful deployment", () => {
      const result = {
        overallStatus: "success" as const,
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T10:00:10Z"),
        totalDuration: 10000,
        stages: [
          {
            name: "Shop Settings",
            status: "success" as StageStatus,
            startTime: new Date("2024-01-01T10:00:00Z"),
            endTime: new Date("2024-01-01T10:00:02Z"),
            duration: 2000,
            entities: [{ name: "Shop Name", operation: "update" as const, success: true }],
            successCount: 1,
            failureCount: 0,
            totalCount: 1,
          },
        ],
        summary: {
          totalEntities: 1,
          successfulEntities: 1,
          failedEntities: 0,
          skippedStages: 0,
          completedStages: 1,
          failedStages: 0,
        },
      };

      const formatted = formatter.format(result);

      expect(formatted).toContain("✅ Deployment Completed Successfully");
      expect(formatted).toContain("📊 Summary:");
      expect(formatted).toContain("✅ 1 entities deployed successfully");
      expect(formatted).toContain("📋 Stage Results:");
      expect(formatted).toContain("✅ Shop Settings (2.0s)");
      expect(formatted).toContain("✅ UPDATE: Shop Name");
      expect(formatted).toContain("🎉 All changes deployed successfully!");
    });

    it("should format partial deployment", () => {
      const result = {
        overallStatus: "partial" as const,
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T10:00:10Z"),
        totalDuration: 10000,
        stages: [
          {
            name: "Products",
            status: "partial" as StageStatus,
            startTime: new Date("2024-01-01T10:00:00Z"),
            endTime: new Date("2024-01-01T10:00:05Z"),
            duration: 5000,
            entities: [
              { name: "Product 1", operation: "create" as const, success: true },
              {
                name: "Product 2",
                operation: "create" as const,
                success: false,
                error: 'Category "electronics" not found',
                suggestions: ["Verify the category exists in your categories configuration"],
              },
            ],
            successCount: 1,
            failureCount: 1,
            totalCount: 2,
          },
        ],
        summary: {
          totalEntities: 2,
          successfulEntities: 1,
          failedEntities: 1,
          skippedStages: 0,
          completedStages: 1,
          failedStages: 0,
        },
      };

      const formatted = formatter.format(result);

      expect(formatted).toContain("⚠️  Deployment Partially Completed");
      expect(formatted).toContain("✅ 1 entities deployed successfully");
      expect(formatted).toContain("❌ 1 entities failed to deploy");
      expect(formatted).toContain("⚠️  Products (5.0s)");
      expect(formatted).toContain("✅ CREATE: Product 1");
      expect(formatted).toContain("❌ CREATE: Product 2");
      expect(formatted).toContain('Error: Category "electronics" not found');
      expect(formatted).toContain("💡 Verify the category exists in your categories configuration");
      expect(formatted).toContain("💡 Next Steps:");
      expect(formatted).toContain("• Review the failed items above");
      expect(formatted).toContain("• Fix the issues and run deploy again");
    });

    it("should format failed deployment", () => {
      const result = {
        overallStatus: "failed" as const,
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T10:00:05Z"),
        totalDuration: 5000,
        stages: [
          {
            name: "Products",
            status: "failed" as StageStatus,
            startTime: new Date("2024-01-01T10:00:00Z"),
            endTime: new Date("2024-01-01T10:00:05Z"),
            duration: 5000,
            error: "GraphQL connection failed",
            successCount: 0,
            failureCount: 0,
            totalCount: 0,
          },
        ],
        summary: {
          totalEntities: 0,
          successfulEntities: 0,
          failedEntities: 0,
          skippedStages: 0,
          completedStages: 0,
          failedStages: 1,
        },
      };

      const formatted = formatter.format(result);

      expect(formatted).toContain("❌ Deployment Failed");
      expect(formatted).toContain("📋 Stage Results:");
      expect(formatted).toContain("❌ Products (5.0s)");
      expect(formatted).toContain("Error: GraphQL connection failed");
    });

    it("should handle skipped stages", () => {
      const result = {
        overallStatus: "success" as const,
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T10:00:05Z"),
        totalDuration: 5000,
        stages: [
          {
            name: "Shop Settings",
            status: "success" as StageStatus,
            startTime: new Date("2024-01-01T10:00:00Z"),
            endTime: new Date("2024-01-01T10:00:02Z"),
            duration: 2000,
            entities: [{ name: "Shop Name", operation: "update" as const, success: true }],
            successCount: 1,
            failureCount: 0,
            totalCount: 1,
          },
          {
            name: "Products",
            status: "skipped" as StageStatus,
            startTime: new Date("2024-01-01T10:00:02Z"),
            endTime: new Date("2024-01-01T10:00:02Z"),
            duration: 0,
            successCount: 0,
            failureCount: 0,
            totalCount: 0,
          },
        ],
        summary: {
          totalEntities: 1,
          successfulEntities: 1,
          failedEntities: 0,
          skippedStages: 1,
          completedStages: 1,
          failedStages: 0,
        },
      };

      const formatted = formatter.format(result);

      expect(formatted).toContain("✅ Deployment Completed Successfully");
      expect(formatted).toContain("⏭️  1 stages skipped (no changes detected)");
      expect(formatted).toContain("⏭️  Skipped Stages (no changes detected):");
      expect(formatted).toContain("• Products");
    });
  });

  describe("getExitCode", () => {
    it("should return correct exit codes", () => {
      expect(formatter.getExitCode("success")).toBe(0);
      expect(formatter.getExitCode("partial")).toBe(5);
      expect(formatter.getExitCode("failed")).toBe(1);
    });
  });
});

describe("extractEntityResults", () => {
  it("should extract results from StageAggregateError", () => {
    const stageError = new StageAggregateError(
      "Some products failed",
      [
        { entity: "Product 1", error: new Error("Category not found") },
        { entity: "Product 2", error: new Error("Invalid price") },
      ],
      ["Product 3", "Product 4"]
    );

    const results = extractEntityResults(stageError);

    expect(results).toHaveLength(4);

    // Check successful entities
    const successResults = results.filter((r) => r.success);
    expect(successResults).toHaveLength(2);
    expect(successResults[0]).toEqual({
      name: "Product 3",
      operation: "create",
      success: true,
    });
    expect(successResults[1]).toEqual({
      name: "Product 4",
      operation: "create",
      success: true,
    });

    // Check failed entities
    const failedResults = results.filter((r) => !r.success);
    expect(failedResults).toHaveLength(2);
    expect(failedResults[0]).toEqual({
      name: "Product 1",
      operation: "create",
      success: false,
      error: "Category not found",
      suggestions: [
        "Verify the category exists in your categories configuration",
        "Check category slug spelling and ensure it matches exactly",
        "Run introspect command to see available categories",
      ],
    });
    expect(failedResults[1]).toEqual({
      name: "Product 2",
      operation: "create",
      success: false,
      error: "Invalid price",
      suggestions: [],
    });
  });

  it("should return empty array for non-StageAggregateError", () => {
    const regularError = new Error("Regular error");
    const results = extractEntityResults(regularError);
    expect(results).toEqual([]);
  });

  it("should return empty array for undefined error", () => {
    const results = extractEntityResults(undefined);
    expect(results).toEqual([]);
  });

  it("should extract suggestions for category errors", () => {
    const stageError = new StageAggregateError(
      "Category error",
      [{ entity: "Product 1", error: new Error('Category "electronics" not found') }],
      []
    );

    const results = extractEntityResults(stageError);
    expect(results[0].suggestions).toEqual([
      "Verify the category exists in your categories configuration",
      "Check category slug spelling and ensure it matches exactly",
      "Run introspect command to see available categories",
    ]);
  });

  it("should extract suggestions for product type errors", () => {
    const stageError = new StageAggregateError(
      "ProductType error",
      [{ entity: "Product 1", error: new Error('ProductType "Books" not found') }],
      []
    );

    const results = extractEntityResults(stageError);
    expect(results[0].suggestions).toEqual([
      "Verify the product type exists in your productTypes configuration",
      "Check product type name spelling and ensure it matches exactly",
    ]);
  });

  it("should extract suggestions for channel errors", () => {
    const stageError = new StageAggregateError(
      "Channel error",
      [{ entity: "Product 1", error: new Error('Channel "default-channel" not found') }],
      []
    );

    const results = extractEntityResults(stageError);
    expect(results[0].suggestions).toEqual([
      "Verify the channel exists in your channels configuration",
      "Check channel slug spelling and ensure it matches exactly",
    ]);
  });
});
