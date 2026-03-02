import { afterEach, describe, expect, it } from "vitest";
import { resilienceTracker } from "./resilience-tracker";

describe("ResilienceTracker", () => {
  afterEach(() => {
    resilienceTracker.reset();
  });

  describe("stage context management", () => {
    it("runs a function within a stage context and returns metrics", async () => {
      const { result, metrics } = await resilienceTracker.runInStageContext(
        "test-stage",
        async () => "done"
      );

      expect(result).toBe("done");
      expect(metrics).toEqual({
        rateLimitHits: 0,
        retryAttempts: 0,
        graphqlErrors: 0,
        networkErrors: 0,
      });
    });

    it("provides stage context during callback execution", async () => {
      await resilienceTracker.runInStageContext("test-stage", async () => {
        expect(resilienceTracker.isInStageContext()).toBe(true);
        expect(resilienceTracker.getCurrentStageName()).toBe("test-stage");
      });
    });

    it("stores metrics for retrieval after context ends", async () => {
      await resilienceTracker.runInStageContext("stage-1", async () => {
        resilienceTracker.recordRateLimit();
      });

      const storedMetrics = resilienceTracker.getStageMetrics("stage-1");
      expect(storedMetrics).toEqual({
        rateLimitHits: 1,
        retryAttempts: 0,
        graphqlErrors: 0,
        networkErrors: 0,
      });
    });

    it("propagates errors from the callback", async () => {
      await expect(
        resilienceTracker.runInStageContext("failing-stage", async () => {
          throw new Error("stage failed");
        })
      ).rejects.toThrow("stage failed");
    });
  });

  describe("recording metrics", () => {
    it("records rate limit hits", async () => {
      const { metrics } = await resilienceTracker.runInStageContext("test", async () => {
        resilienceTracker.recordRateLimit();
        resilienceTracker.recordRateLimit();
      });

      expect(metrics.rateLimitHits).toBe(2);
    });

    it("records retry attempts", async () => {
      const { metrics } = await resilienceTracker.runInStageContext("test", async () => {
        resilienceTracker.recordRetry();
        resilienceTracker.recordRetry();
        resilienceTracker.recordRetry();
      });

      expect(metrics.retryAttempts).toBe(3);
    });

    it("records GraphQL errors", async () => {
      const { metrics } = await resilienceTracker.runInStageContext("test", async () => {
        resilienceTracker.recordGraphQLError();
      });

      expect(metrics.graphqlErrors).toBe(1);
    });

    it("records network errors", async () => {
      const { metrics } = await resilienceTracker.runInStageContext("test", async () => {
        resilienceTracker.recordNetworkError();
        resilienceTracker.recordNetworkError();
      });

      expect(metrics.networkErrors).toBe(2);
    });

    it("does not record events when outside a context", () => {
      // These should not throw, just silently ignore
      resilienceTracker.recordRateLimit();
      resilienceTracker.recordRetry();
      resilienceTracker.recordGraphQLError();
      resilienceTracker.recordNetworkError();

      expect(resilienceTracker.getAllStageMetrics().size).toBe(0);
    });

    it("tracks operation-level metrics when operation keys are provided", async () => {
      const { metrics } = await resilienceTracker.runInStageContext("test", async () => {
        resilienceTracker.recordRateLimit("query products");
        resilienceTracker.recordRetry("query products");
        resilienceTracker.recordNetworkError("query channels");
      });

      expect(metrics.operations).toEqual({
        "query channels": {
          rateLimitHits: 0,
          retryAttempts: 0,
          graphqlErrors: 0,
          networkErrors: 1,
        },
        "query products": {
          rateLimitHits: 1,
          retryAttempts: 1,
          graphqlErrors: 0,
          networkErrors: 0,
        },
      });
    });
  });

  describe("multiple stages", () => {
    it("tracks metrics for multiple stages independently", async () => {
      await resilienceTracker.runInStageContext("stage-1", async () => {
        resilienceTracker.recordRateLimit();
        resilienceTracker.recordRateLimit();
      });

      await resilienceTracker.runInStageContext("stage-2", async () => {
        resilienceTracker.recordRetry();
      });

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

    it("getAllStageMetrics returns all tracked stages", async () => {
      await resilienceTracker.runInStageContext("stage-1", async () => {});
      await resilienceTracker.runInStageContext("stage-2", async () => {});

      const allMetrics = resilienceTracker.getAllStageMetrics();
      expect(allMetrics.size).toBe(2);
      expect(allMetrics.has("stage-1")).toBe(true);
      expect(allMetrics.has("stage-2")).toBe(true);
    });
  });

  describe("reset", () => {
    it("clears all stored metrics", async () => {
      await resilienceTracker.runInStageContext("stage-1", async () => {
        resilienceTracker.recordRateLimit();
      });

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

    it("returns true when in a context", async () => {
      await resilienceTracker.runInStageContext("test", async () => {
        expect(resilienceTracker.isInStageContext()).toBe(true);
      });
    });

    it("returns false after context ends", async () => {
      await resilienceTracker.runInStageContext("test", async () => {});
      expect(resilienceTracker.isInStageContext()).toBe(false);
    });
  });

  describe("getCurrentStageName", () => {
    it("returns undefined when not in a context", () => {
      expect(resilienceTracker.getCurrentStageName()).toBeUndefined();
    });

    it("returns the current stage name", async () => {
      await resilienceTracker.runInStageContext("my-stage", async () => {
        expect(resilienceTracker.getCurrentStageName()).toBe("my-stage");
      });
    });
  });
});
