import { beforeEach, describe, expect, it, vi } from "vitest";
import { AttributeCache } from "../../modules/attribute/attribute-cache";
import { EnhancedDeploymentPipeline, executeEnhancedDeployment } from "./enhanced-pipeline";
import { StageAggregateError } from "./errors";
import type { DeploymentContext, DeploymentStage } from "./types";

// Mock the logger
vi.mock("../../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe("EnhancedDeploymentPipeline", () => {
  let pipeline: EnhancedDeploymentPipeline;
  let mockContext: DeploymentContext;

  beforeEach(() => {
    pipeline = new EnhancedDeploymentPipeline();
    mockContext = {
      configurator: {} as any,
      args: {} as any,
      summary: {
        totalChanges: 2,
        creates: 1,
        updates: 1,
        deletes: 0,
        results: [],
      } as any,
      startTime: new Date(),
      attributeCache: new AttributeCache(),
    };
  });

  describe("execute", () => {
    it("should execute all stages successfully", async () => {
      const stage1: DeploymentStage = {
        name: "Stage 1",
        execute: vi.fn().mockResolvedValue(undefined),
      };

      const stage2: DeploymentStage = {
        name: "Stage 2",
        execute: vi.fn().mockResolvedValue(undefined),
      };

      pipeline.addStage(stage1).addStage(stage2);

      const { metrics, result } = await pipeline.execute(mockContext);

      expect(stage1.execute).toHaveBeenCalledWith(mockContext);
      expect(stage2.execute).toHaveBeenCalledWith(mockContext);
      expect(result.overallStatus).toBe("success");
      expect(result.stages).toHaveLength(2);
      expect(result.stages[0].status).toBe("success");
      expect(result.stages[1].status).toBe("success");
      expect(metrics.stageDurations.size).toBe(2);
    });

    it("should skip stages when skip condition is met", async () => {
      const stage1: DeploymentStage = {
        name: "Stage 1",
        execute: vi.fn().mockResolvedValue(undefined),
        skip: vi.fn().mockReturnValue(true),
      };

      const stage2: DeploymentStage = {
        name: "Stage 2",
        execute: vi.fn().mockResolvedValue(undefined),
      };

      pipeline.addStage(stage1).addStage(stage2);

      const { result } = await pipeline.execute(mockContext);

      expect(stage1.execute).not.toHaveBeenCalled();
      expect(stage2.execute).toHaveBeenCalledWith(mockContext);
      expect(result.stages).toHaveLength(2);
      expect(result.stages[0].status).toBe("skipped");
      expect(result.stages[1].status).toBe("success");
      expect(result.overallStatus).toBe("success");
    });

    it("should continue execution when a stage fails", async () => {
      const stage1: DeploymentStage = {
        name: "Stage 1",
        execute: vi.fn().mockRejectedValue(new Error("Stage 1 failed")),
      };

      const stage2: DeploymentStage = {
        name: "Stage 2",
        execute: vi.fn().mockResolvedValue(undefined),
      };

      pipeline.addStage(stage1).addStage(stage2);

      const { result } = await pipeline.execute(mockContext);

      expect(stage1.execute).toHaveBeenCalledWith(mockContext);
      expect(stage2.execute).toHaveBeenCalledWith(mockContext);
      expect(result.stages).toHaveLength(2);
      expect(result.stages[0].status).toBe("failed");
      expect(result.stages[1].status).toBe("success");
      expect(result.overallStatus).toBe("partial");
    });

    it("should handle partial failure with StageAggregateError", async () => {
      const partialError = new StageAggregateError(
        "Some items failed",
        [{ entity: "Product 1", error: new Error("Category not found") }],
        ["Product 2", "Product 3"]
      );

      const stage1: DeploymentStage = {
        name: "Products",
        execute: vi.fn().mockRejectedValue(partialError),
      };

      pipeline.addStage(stage1);

      const { result } = await pipeline.execute(mockContext);

      expect(result.stages).toHaveLength(1);
      expect(result.stages[0].status).toBe("partial");
      expect(result.stages[0].successCount).toBe(2);
      expect(result.stages[0].failureCount).toBe(1);
      expect(result.stages[0].totalCount).toBe(3);
      expect(result.overallStatus).toBe("partial");
    });

    it("should handle complete failure", async () => {
      const stage1: DeploymentStage = {
        name: "Stage 1",
        execute: vi.fn().mockRejectedValue(new Error("Complete failure")),
      };

      const stage2: DeploymentStage = {
        name: "Stage 2",
        execute: vi.fn().mockRejectedValue(new Error("Another failure")),
      };

      pipeline.addStage(stage1).addStage(stage2);

      const { result } = await pipeline.execute(mockContext);

      expect(result.stages).toHaveLength(2);
      expect(result.stages[0].status).toBe("failed");
      expect(result.stages[1].status).toBe("failed");
      expect(result.overallStatus).toBe("failed");
      expect(result.summary.failedStages).toBe(2);
      expect(result.summary.completedStages).toBe(0);
    });

    it("should calculate correct duration for stages", async () => {
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      const stage1: DeploymentStage = {
        name: "Stage 1",
        execute: vi.fn().mockImplementation(() => delay(100)),
      };

      pipeline.addStage(stage1);

      const { result } = await pipeline.execute(mockContext);

      expect(result.stages[0].duration).toBeGreaterThan(50);
      expect(result.stages[0].duration).toBeLessThan(200);
    });

    it("should track metrics correctly", async () => {
      const stage1: DeploymentStage = {
        name: "Stage 1",
        execute: vi.fn().mockResolvedValue(undefined),
      };

      const stage2: DeploymentStage = {
        name: "Stage 2",
        execute: vi.fn().mockRejectedValue(new Error("Failed")),
      };

      pipeline.addStage(stage1).addStage(stage2);

      const { metrics } = await pipeline.execute(mockContext);

      expect(metrics.stageDurations.has("Stage 1")).toBe(true);
      expect(metrics.stageDurations.has("Stage 2")).toBe(true);
      expect(metrics.duration).toBeGreaterThanOrEqual(0);
      expect(metrics.startTime).toBeInstanceOf(Date);
      expect(metrics.endTime).toBeInstanceOf(Date);
    });
  });
});

describe("executeEnhancedDeployment", () => {
  let mockContext: DeploymentContext;

  beforeEach(() => {
    mockContext = {
      configurator: {} as any,
      args: {} as any,
      summary: {
        totalChanges: 1,
        creates: 1,
        updates: 0,
        deletes: 0,
        results: [],
      } as any,
      startTime: new Date(),
      attributeCache: new AttributeCache(),
    };
  });

  it("should return success exit code for successful deployment", async () => {
    const stages: DeploymentStage[] = [
      {
        name: "Test Stage",
        execute: vi.fn().mockResolvedValue(undefined),
      },
    ];

    const { exitCode, shouldExit, result } = await executeEnhancedDeployment(stages, mockContext);

    expect(result.overallStatus).toBe("success");
    expect(exitCode).toBe(0);
    expect(shouldExit).toBe(false);
  });

  it("should return partial exit code for partial deployment", async () => {
    const partialError = new StageAggregateError(
      "Partial failure",
      [{ entity: "Item 1", error: new Error("Failed") }],
      ["Item 2"]
    );

    const stages: DeploymentStage[] = [
      {
        name: "Test Stage",
        execute: vi.fn().mockRejectedValue(partialError),
      },
    ];

    const { exitCode, shouldExit, result } = await executeEnhancedDeployment(stages, mockContext);

    expect(result.overallStatus).toBe("partial");
    expect(exitCode).toBe(5);
    expect(shouldExit).toBe(false);
  });

  it("should return failure exit code for failed deployment", async () => {
    const stages: DeploymentStage[] = [
      {
        name: "Test Stage",
        execute: vi.fn().mockRejectedValue(new Error("Complete failure")),
      },
    ];

    const { exitCode, shouldExit, result } = await executeEnhancedDeployment(stages, mockContext);

    expect(result.overallStatus).toBe("failed");
    expect(exitCode).toBe(1);
    expect(shouldExit).toBe(true);
  });

  it("should handle multiple stages with mixed results", async () => {
    const stages: DeploymentStage[] = [
      {
        name: "Success Stage",
        execute: vi.fn().mockResolvedValue(undefined),
      },
      {
        name: "Partial Stage",
        execute: vi
          .fn()
          .mockRejectedValue(
            new StageAggregateError(
              "Partial",
              [{ entity: "Failed Item", error: new Error("Error") }],
              ["Success Item"]
            )
          ),
      },
      {
        name: "Skipped Stage",
        execute: vi.fn().mockResolvedValue(undefined),
        skip: () => true,
      },
    ];

    const { result, exitCode, shouldExit } = await executeEnhancedDeployment(stages, mockContext);

    expect(result.overallStatus).toBe("partial");
    expect(result.stages).toHaveLength(3);
    expect(result.stages[0].status).toBe("success");
    expect(result.stages[1].status).toBe("partial");
    expect(result.stages[2].status).toBe("skipped");
    expect(result.summary.completedStages).toBe(2);
    expect(result.summary.skippedStages).toBe(1);
    expect(exitCode).toBe(5);
    expect(shouldExit).toBe(false);
  });
});
