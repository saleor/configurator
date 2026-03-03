import { describe, expect, it } from "vitest";
import type { OperationResilienceMetrics } from "../types";
import { formatDuration, getTopOperationResilienceHotspots } from "../utils";

describe("formatDuration", () => {
  it("formats 0ms", () => {
    expect(formatDuration(0)).toBe("0ms");
  });

  it("formats sub-second as milliseconds", () => {
    expect(formatDuration(500)).toBe("500ms");
  });

  it("formats exactly 1 second", () => {
    expect(formatDuration(1000)).toBe("1.0s");
  });

  it("formats sub-60s with one decimal", () => {
    expect(formatDuration(2500)).toBe("2.5s");
    expect(formatDuration(59999)).toBe("60.0s");
  });

  it("formats exactly 60 seconds as minutes", () => {
    expect(formatDuration(60000)).toBe("1m 0s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(90000)).toBe("1m 30s");
  });

  it("formats large durations", () => {
    expect(formatDuration(125000)).toBe("2m 5s");
  });
});

const makeMetrics = (
  overrides: Partial<OperationResilienceMetrics> = {}
): OperationResilienceMetrics => ({
  rateLimitHits: 0,
  retryAttempts: 0,
  graphqlErrors: 0,
  networkErrors: 0,
  ...overrides,
});

describe("getTopOperationResilienceHotspots", () => {
  it("returns empty array for undefined input", () => {
    expect(getTopOperationResilienceHotspots(undefined)).toEqual([]);
  });

  it("returns empty array for empty map", () => {
    expect(getTopOperationResilienceHotspots(new Map())).toEqual([]);
  });

  it("returns empty array when limit is 0", () => {
    const map = new Map([["op1", makeMetrics({ rateLimitHits: 5 })]]);
    expect(getTopOperationResilienceHotspots(map, 0)).toEqual([]);
  });

  it("filters out operations with zero throttle events", () => {
    const map = new Map([
      ["op1", makeMetrics({ graphqlErrors: 3 })],
      ["op2", makeMetrics({ networkErrors: 2 })],
    ]);
    expect(getTopOperationResilienceHotspots(map)).toEqual([]);
  });

  it("includes operations with throttle events", () => {
    const map = new Map([["op1", makeMetrics({ rateLimitHits: 3, retryAttempts: 2 })]]);

    const result = getTopOperationResilienceHotspots(map);
    expect(result).toHaveLength(1);
    expect(result[0].operation).toBe("op1");
    expect(result[0].throttleEvents).toBe(5);
    expect(result[0].totalEvents).toBe(5);
  });

  it("sorts by throttle events desc, then total events desc, then alphabetically", () => {
    const map = new Map([
      ["beta", makeMetrics({ rateLimitHits: 2, retryAttempts: 1, graphqlErrors: 5 })],
      ["alpha", makeMetrics({ rateLimitHits: 2, retryAttempts: 1, graphqlErrors: 5 })],
      ["gamma", makeMetrics({ rateLimitHits: 5, retryAttempts: 0 })],
    ]);

    const result = getTopOperationResilienceHotspots(map);
    expect(result).toHaveLength(3);
    expect(result[0].operation).toBe("gamma"); // 5 throttle
    expect(result[1].operation).toBe("alpha"); // 3 throttle, 8 total, alpha
    expect(result[2].operation).toBe("beta"); // 3 throttle, 8 total, beta
  });

  it("respects limit parameter", () => {
    const map = new Map([
      ["op1", makeMetrics({ rateLimitHits: 5 })],
      ["op2", makeMetrics({ rateLimitHits: 3 })],
      ["op3", makeMetrics({ rateLimitHits: 1 })],
    ]);

    const result = getTopOperationResilienceHotspots(map, 2);
    expect(result).toHaveLength(2);
    expect(result[0].operation).toBe("op1");
    expect(result[1].operation).toBe("op2");
  });
});
