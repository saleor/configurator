import { describe, it, expect, beforeEach } from "vitest";
import { MetricsCollector } from "../metrics";

describe.skip("MetricsCollector", () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  describe("stage timing", () => {
    it("tracks stage duration", async () => {
      collector.startStage("test-stage");
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 50));
      
      collector.endStage("test-stage");
      const metrics = collector.getMetrics();

      expect(metrics.stageDurations.has("test-stage")).toBe(true);
      const duration = metrics.stageDurations.get("test-stage")!;
      expect(duration).toBeGreaterThanOrEqual(50);
      expect(duration).toBeLessThan(100);
    });

    it("ignores endStage without startStage", () => {
      collector.endStage("unknown-stage");
      const metrics = collector.getMetrics();

      expect(metrics.stageDurations.has("unknown-stage")).toBe(false);
    });

    it("tracks multiple stages", () => {
      collector.startStage("stage-1");
      collector.endStage("stage-1");
      
      collector.startStage("stage-2");
      collector.endStage("stage-2");

      const metrics = collector.getMetrics();
      expect(metrics.stageDurations.size).toBe(2);
      expect(metrics.stageDurations.has("stage-1")).toBe(true);
      expect(metrics.stageDurations.has("stage-2")).toBe(true);
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
      collector.startStage("test");
      
      // Ensure some time passes
      await new Promise(resolve => setTimeout(resolve, 10));
      
      collector.endStage("test");

      const metrics = collector.complete();

      expect(metrics.startTime).toBeInstanceOf(Date);
      expect(metrics.endTime).toBeInstanceOf(Date);
      expect(metrics.endTime.getTime()).toBeGreaterThanOrEqual(startTime.getTime());
      expect(metrics.duration).toBeGreaterThanOrEqual(10);
    });

    it("calculates total duration correctly", async () => {
      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = collector.complete();
      
      expect(metrics.duration).toBeGreaterThanOrEqual(100);
      expect(metrics.duration).toBeLessThan(200);
    });
  });

  describe("getMetrics", () => {
    it("returns current metrics without completing", () => {
      collector.startStage("ongoing");
      collector.recordEntity("Test", "create");

      const metrics = collector.getMetrics();

      expect(metrics.startTime).toBeInstanceOf(Date);
      expect(metrics.endTime).toBeInstanceOf(Date);
      expect(metrics.entityCounts.size).toBe(1);
      expect(metrics.stageDurations.size).toBe(0); // Stage not ended yet
    });

    it("returns immutable copies of maps", () => {
      collector.recordEntity("Test", "create");
      const metrics1 = collector.getMetrics();
      
      // Try to modify the returned map (should not affect internal state)
      (metrics1.entityCounts as Map<string, number>).clear();
      
      const metrics2 = collector.getMetrics();
      expect(metrics2.entityCounts.size).toBe(1);
    });
  });
});