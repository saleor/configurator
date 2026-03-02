import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resilienceTracker } from "../../../lib/utils/resilience-tracker";
import { MetricsCollector } from "../metrics";

describe("MetricsCollector", () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  describe("stage timing", () => {
    it("tracks stage duration", async () => {
      await collector.runStage("test-stage", async () => {
        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const metrics = collector.getMetrics();

      expect(metrics.stageDurations.has("test-stage")).toBe(true);
      const duration = metrics.stageDurations.get("test-stage");
      expect(duration).toBeDefined();
      expect(duration).toBeGreaterThanOrEqual(50);
      expect(duration).toBeLessThan(200);
    });

    it("tracks multiple stages", async () => {
      await collector.runStage("stage-1", async () => {});
      await collector.runStage("stage-2", async () => {});

      const metrics = collector.getMetrics();
      expect(metrics.stageDurations.size).toBe(2);
      expect(metrics.stageDurations.has("stage-1")).toBe(true);
      expect(metrics.stageDurations.has("stage-2")).toBe(true);
    });

    it("returns the stage callback result", async () => {
      const result = await collector.runStage("test-stage", async () => "hello");
      expect(result).toBe("hello");
    });

    it("records duration even when stage throws", async () => {
      await expect(
        collector.runStage("failing-stage", async () => {
          throw new Error("boom");
        })
      ).rejects.toThrow("boom");

      const metrics = collector.getMetrics();
      expect(metrics.stageDurations.has("failing-stage")).toBe(true);
    });
  });

  describe("entity counting", () => {
    it("counts entity operations", () => {
      collector.recordEntity("Product", "create");
      collector.recordEntity("Product", "create");
      collector.recordEntity("Product", "update");
      collector.recordEntity("Category", "delete");

      const metrics = collector.getMetrics();

      const productCounts = metrics.entityCounts.get("Product");
      expect(productCounts).toEqual({
        created: 2,
        updated: 1,
        deleted: 0,
      });

      const categoryCounts = metrics.entityCounts.get("Category");
      expect(categoryCounts).toEqual({
        created: 0,
        updated: 0,
        deleted: 1,
      });
    });

    it("initializes counts for new entity types", () => {
      collector.recordEntity("NewType", "update");

      const metrics = collector.getMetrics();
      const counts = metrics.entityCounts.get("NewType");

      expect(counts).toEqual({
        created: 0,
        updated: 1,
        deleted: 0,
      });
    });
  });

  describe("completion", () => {
    it("sets end time when completed", async () => {
      const startTime = new Date();
      await collector.runStage("test", async () => {
        // Ensure some time passes
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const metrics = collector.complete();

      expect(metrics.startTime).toBeInstanceOf(Date);
      expect(metrics.endTime).toBeInstanceOf(Date);
      expect(metrics.endTime.getTime()).toBeGreaterThanOrEqual(startTime.getTime());
      expect(metrics.duration).toBeGreaterThanOrEqual(10);
    });

    it("calculates total duration correctly", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const metrics = collector.complete();

      expect(metrics.duration).toBeGreaterThanOrEqual(100);
      expect(metrics.duration).toBeLessThan(200);
    });
  });

  describe("getMetrics", () => {
    it("returns current metrics without completing", () => {
      collector.recordEntity("Test", "create");

      const metrics = collector.getMetrics();

      expect(metrics.startTime).toBeInstanceOf(Date);
      expect(metrics.endTime).toBeInstanceOf(Date);
      expect(metrics.entityCounts.size).toBe(1);
    });

    it("returns immutable copies of maps", () => {
      collector.recordEntity("Test", "create");
      const metrics1 = collector.getMetrics();

      // Try to modify the returned map (should not affect internal state)
      const mutableMap = new Map(metrics1.entityCounts);
      mutableMap.clear();

      const metrics2 = collector.getMetrics();
      expect(metrics2.entityCounts.size).toBe(1);
    });
  });
});

describe("MetricsCollector - Resilience Integration", () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
    resilienceTracker.reset();
  });

  afterEach(() => {
    resilienceTracker.reset();
  });

  describe("resilience metrics integration", () => {
    it("initializes with zero resilience totals", () => {
      const metrics = collector.getMetrics();

      expect(metrics.totalRateLimitHits).toBe(0);
      expect(metrics.totalRetries).toBe(0);
      expect(metrics.totalGraphQLErrors).toBe(0);
      expect(metrics.totalNetworkErrors).toBe(0);
      expect(metrics.stageResilience.size).toBe(0);
      expect(metrics.operationResilience.size).toBe(0);
    });

    it("captures resilience metrics when stage completes", async () => {
      await collector.runStage("test-stage", async () => {
        // Simulate resilience events within the stage context
        resilienceTracker.recordRateLimit("query products");
        resilienceTracker.recordRetry("query products");
        resilienceTracker.recordRetry("query products");
      });

      const metrics = collector.getMetrics();

      const stageResilience = metrics.stageResilience.get("test-stage");
      expect(stageResilience).toBeDefined();
      expect(stageResilience?.rateLimitHits).toBe(1);
      expect(stageResilience?.retryAttempts).toBe(2);
      expect(stageResilience?.operations?.["query products"]).toEqual({
        rateLimitHits: 1,
        retryAttempts: 2,
        graphqlErrors: 0,
        networkErrors: 0,
      });
    });

    it("aggregates resilience totals across multiple stages", async () => {
      await collector.runStage("stage-1", async () => {
        resilienceTracker.recordRateLimit();
        resilienceTracker.recordRateLimit();
      });

      await collector.runStage("stage-2", async () => {
        resilienceTracker.recordRateLimit();
        resilienceTracker.recordRetry();
        resilienceTracker.recordGraphQLError();
      });

      const metrics = collector.complete();

      expect(metrics.totalRateLimitHits).toBe(3);
      expect(metrics.totalRetries).toBe(1);
      expect(metrics.totalGraphQLErrors).toBe(1);
      expect(metrics.totalNetworkErrors).toBe(0);
    });

    it("returns stageResilience map with all stages", async () => {
      await collector.runStage("stage-1", async () => {
        resilienceTracker.recordNetworkError();
      });

      await collector.runStage("stage-2", async () => {});

      const metrics = collector.getMetrics();

      expect(metrics.stageResilience.size).toBe(2);
      expect(metrics.stageResilience.has("stage-1")).toBe(true);
      expect(metrics.stageResilience.has("stage-2")).toBe(true);

      expect(metrics.stageResilience.get("stage-1")?.networkErrors).toBe(1);
      expect(metrics.stageResilience.get("stage-2")?.networkErrors).toBe(0);
    });

    it("aggregates operation-level resilience across stages", async () => {
      await collector.runStage("stage-1", async () => {
        resilienceTracker.recordRateLimit("query products");
        resilienceTracker.recordRetry("query products");
      });

      await collector.runStage("stage-2", async () => {
        resilienceTracker.recordRetry("query products");
        resilienceTracker.recordRateLimit("query channels");
      });

      const metrics = collector.complete();
      expect(metrics.operationResilience.get("query products")).toEqual({
        rateLimitHits: 1,
        retryAttempts: 2,
        graphqlErrors: 0,
        networkErrors: 0,
      });
      expect(metrics.operationResilience.get("query channels")).toEqual({
        rateLimitHits: 1,
        retryAttempts: 0,
        graphqlErrors: 0,
        networkErrors: 0,
      });
    });
  });
});
