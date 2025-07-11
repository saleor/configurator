import { describe, it, expect, beforeEach, vi } from "vitest";
import { DeploymentPipeline } from "../pipeline";
import type { DeploymentContext, DeploymentStage } from "../types";
import { SaleorConfigurator } from "../../configurator";

describe("DeploymentPipeline", () => {
  let pipeline: DeploymentPipeline;
  let mockContext: DeploymentContext;

  beforeEach(() => {
    pipeline = new DeploymentPipeline();
    mockContext = {
      configurator: {} as SaleorConfigurator,
      args: { url: "test", token: "test", config: "test.yml", quiet: false, ci: false, force: false, skipDiff: false },
      summary: { totalChanges: 0, creates: 0, updates: 0, deletes: 0, results: [] },
      startTime: new Date(),
    };
  });

  describe("stage execution", () => {
    it("executes stages in order", async () => {
      const executionOrder: string[] = [];
      
      const stage1: DeploymentStage = {
        name: "Stage 1",
        execute: vi.fn().mockImplementation(async () => {
          executionOrder.push("stage1");
        }),
      };

      const stage2: DeploymentStage = {
        name: "Stage 2",
        execute: vi.fn().mockImplementation(async () => {
          executionOrder.push("stage2");
        }),
      };

      pipeline.addStage(stage1).addStage(stage2);
      await pipeline.execute(mockContext);

      expect(executionOrder).toEqual(["stage1", "stage2"]);
      expect(stage1.execute).toHaveBeenCalledWith(mockContext);
      expect(stage2.execute).toHaveBeenCalledWith(mockContext);
    });

    it("skips stages when skip returns true", async () => {
      const skippedStage: DeploymentStage = {
        name: "Skipped Stage",
        execute: vi.fn(),
        skip: () => true,
      };

      const executedStage: DeploymentStage = {
        name: "Executed Stage",
        execute: vi.fn(),
        skip: () => false,
      };

      pipeline.addStage(skippedStage).addStage(executedStage);
      await pipeline.execute(mockContext);

      expect(skippedStage.execute).not.toHaveBeenCalled();
      expect(executedStage.execute).toHaveBeenCalled();
    });

    it("returns metrics after execution", async () => {
      const stage: DeploymentStage = {
        name: "Test Stage",
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        },
      };

      pipeline.addStage(stage);
      const metrics = await pipeline.execute(mockContext);

      expect(metrics.duration).toBeGreaterThan(0);
      expect(metrics.stageDurations.has("Test Stage")).toBe(true);
      expect(metrics.startTime).toBeInstanceOf(Date);
      expect(metrics.endTime).toBeInstanceOf(Date);
    });
  });

  describe("error handling", () => {
    it("throws error with stage name when stage fails", async () => {
      const failingStage: DeploymentStage = {
        name: "Failing Stage",
        execute: async () => {
          throw new Error("Stage error");
        },
      };

      pipeline.addStage(failingStage);

      await expect(pipeline.execute(mockContext)).rejects.toThrow(
        'Deployment failed during "Failing Stage": Stage error'
      );
    });

    it("stops execution on first error", async () => {
      const stage1: DeploymentStage = {
        name: "Stage 1",
        execute: async () => {
          throw new Error("Error");
        },
      };

      const stage2: DeploymentStage = {
        name: "Stage 2",
        execute: vi.fn(),
      };

      pipeline.addStage(stage1).addStage(stage2);

      await expect(pipeline.execute(mockContext)).rejects.toThrow();
      expect(stage2.execute).not.toHaveBeenCalled();
    });

    it("handles non-Error exceptions", async () => {
      const stage: DeploymentStage = {
        name: "Throwing Stage",
        execute: async () => {
          throw "string error";
        },
      };

      pipeline.addStage(stage);

      await expect(pipeline.execute(mockContext)).rejects.toThrow(
        'Deployment failed during "Throwing Stage": Unknown error'
      );
    });
  });

  describe("stage management", () => {
    it("supports method chaining", () => {
      const stage1: DeploymentStage = { name: "Stage 1", execute: async () => {} };
      const stage2: DeploymentStage = { name: "Stage 2", execute: async () => {} };

      const result = pipeline.addStage(stage1).addStage(stage2);
      
      expect(result).toBe(pipeline);
    });

    it("executes with no stages", async () => {
      const metrics = await pipeline.execute(mockContext);
      
      expect(metrics.duration).toBeGreaterThanOrEqual(0);
      expect(metrics.stageDurations.size).toBe(0);
    });
  });
});