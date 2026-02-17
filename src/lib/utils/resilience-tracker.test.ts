import { afterEach, describe, expect, it } from "vitest";
import { resilienceTracker } from "./resilience-tracker";

describe("ResilienceTracker", () => {
  afterEach(() => {
    resilienceTracker.reset();
  });

  describe("stage context management", () => {
    it("starts and ends a stage context", () => {
      resilienceTracker.startStageContext("test-stage");
      expect(resilienceTracker.isInStageContext()).toBe(true);
      expect(resilienceTracker.getCurrentStageName()).toBe("test-stage");

      const metrics = resilienceTracker.endStageContext();
      expect(metrics).toBeDefined();
      expect(metrics).toEqual({
        rateLimitHits: 0,
        retryAttempts: 0,
        graphqlErrors: 0,
        networkErrors: 0,
      });
    });

    it("returns undefined when ending without a context", () => {
      const metrics = resilienceTracker.endStageContext();
      expect(metrics).toBeUndefined();
    });

    it("stores metrics for retrieval after context ends", () => {
      resilienceTracker.startStageContext("stage-1");
      resilienceTracker.recordRateLimit();
      resilienceTracker.endStageContext();

      const storedMetrics = resilienceTracker.getStageMetrics("stage-1");
      expect(storedMetrics).toEqual({
        rateLimitHits: 1,
        retryAttempts: 0,
        graphqlErrors: 0,
        networkErrors: 0,
      });
    });
  });

  describe("recording metrics", () => {
    it("records rate limit hits", () => {
      resilienceTracker.startStageContext("test");
      resilienceTracker.recordRateLimit();
      resilienceTracker.recordRateLimit();
      const metrics = resilienceTracker.endStageContext();

      expect(metrics?.rateLimitHits).toBe(2);
    });

    it("records retry attempts", () => {
      resilienceTracker.startStageContext("test");
      resilienceTracker.recordRetry();
      resilienceTracker.recordRetry();
      resilienceTracker.recordRetry();
      const metrics = resilienceTracker.endStageContext();

      expect(metrics?.retryAttempts).toBe(3);
    });

    it("records GraphQL errors", () => {
      resilienceTracker.startStageContext("test");
      resilienceTracker.recordGraphQLError();
      const metrics = resilienceTracker.endStageContext();

      expect(metrics?.graphqlErrors).toBe(1);
    });

    it("records network errors", () => {
      resilienceTracker.startStageContext("test");
      resilienceTracker.recordNetworkError();
      resilienceTracker.recordNetworkError();
      const metrics = resilienceTracker.endStageContext();

      expect(metrics?.networkErrors).toBe(2);
    });

    it("does not record events when outside a context", () => {
      // These should not throw, just silently ignore
      resilienceTracker.recordRateLimit();
      resilienceTracker.recordRetry();
      resilienceTracker.recordGraphQLError();
      resilienceTracker.recordNetworkError();

      expect(resilienceTracker.getAllStageMetrics().size).toBe(0);
    });
  });

  describe("multiple stages", () => {
    it("tracks metrics for multiple stages independently", () => {
      resilienceTracker.startStageContext("stage-1");
      resilienceTracker.recordRateLimit();
      resilienceTracker.recordRateLimit();
      resilienceTracker.endStageContext();

      resilienceTracker.startStageContext("stage-2");
      resilienceTracker.recordRetry();
      resilienceTracker.endStageContext();

      const stage1Metrics = resilienceTracker.getStageMetrics("stage-1");
      const stage2Metrics = resilienceTracker.getStageMetrics("stage-2");

      expect(stage1Metrics).toEqual({
        rateLimitHits: 2,
        retryAttempts: 0,
        graphqlErrors: 0,
        networkErrors: 0,
      });

      expect(stage2Metrics).toEqual({
        rateLimitHits: 0,
        retryAttempts: 1,
        graphqlErrors: 0,
        networkErrors: 0,
      });
    });

    it("getAllStageMetrics returns all tracked stages", () => {
      resilienceTracker.startStageContext("stage-1");
      resilienceTracker.endStageContext();

      resilienceTracker.startStageContext("stage-2");
      resilienceTracker.endStageContext();

      const allMetrics = resilienceTracker.getAllStageMetrics();
      expect(allMetrics.size).toBe(2);
      expect(allMetrics.has("stage-1")).toBe(true);
      expect(allMetrics.has("stage-2")).toBe(true);
    });
  });

  describe("reset", () => {
    it("clears all stored metrics", () => {
      resilienceTracker.startStageContext("stage-1");
      resilienceTracker.recordRateLimit();
      resilienceTracker.endStageContext();

      expect(resilienceTracker.getAllStageMetrics().size).toBe(1);

      resilienceTracker.reset();

      expect(resilienceTracker.getAllStageMetrics().size).toBe(0);
      expect(resilienceTracker.getStageMetrics("stage-1")).toBeUndefined();
    });
  });

  describe("isInStageContext", () => {
    it("returns false when not in a context", () => {
      expect(resilienceTracker.isInStageContext()).toBe(false);
    });

    it("returns true when in a context", () => {
      resilienceTracker.startStageContext("test");
      expect(resilienceTracker.isInStageContext()).toBe(true);
      resilienceTracker.endStageContext();
    });
  });

  describe("getCurrentStageName", () => {
    it("returns undefined when not in a context", () => {
      expect(resilienceTracker.getCurrentStageName()).toBeUndefined();
    });

    it("returns the current stage name", () => {
      resilienceTracker.startStageContext("my-stage");
      expect(resilienceTracker.getCurrentStageName()).toBe("my-stage");
      resilienceTracker.endStageContext();
    });
  });
});
