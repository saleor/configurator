import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GraphQLGovernor,
  type GraphQLGovernorConfig,
  getGraphQLGovernorConfigFromEnv,
} from "./governor";

function createConfig(overrides: Partial<GraphQLGovernorConfig> = {}): GraphQLGovernorConfig {
  return {
    enabled: true,
    maxConcurrent: 4,
    intervalCap: 20,
    intervalMs: 1000,
    fallbackCooldownMs: 3000,
    ...overrides,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("GraphQLGovernor", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules through Bottleneck and enforces max concurrency", async () => {
    const governor = new GraphQLGovernor(
      createConfig({ maxConcurrent: 2, intervalCap: 100, intervalMs: 1000 })
    );

    try {
      let running = 0;
      let maxRunning = 0;

      const tasks = Array.from({ length: 8 }, (_, index) =>
        governor.schedule(async () => {
          running += 1;
          maxRunning = Math.max(maxRunning, running);
          await sleep(25);
          running -= 1;
          return index;
        })
      );

      const results = await Promise.all(tasks);
      expect(results).toHaveLength(8);
      expect(maxRunning).toBeLessThanOrEqual(2);
    } finally {
      await governor.stop();
    }
  });

  it("enforces interval cap per window", async () => {
    const governor = new GraphQLGovernor(
      createConfig({ maxConcurrent: 10, intervalCap: 2, intervalMs: 250 })
    );

    try {
      const startTimes: number[] = [];
      const start = Date.now();

      const tasks = Array.from({ length: 5 }, () =>
        governor.schedule(async () => {
          startTimes.push(Date.now() - start);
          return true;
        })
      );

      await Promise.all(tasks);

      expect(startTimes).toHaveLength(5);
      expect(startTimes[2]).toBeGreaterThanOrEqual(180);
      expect(startTimes[4]).toBeGreaterThanOrEqual(360);
    } finally {
      await governor.stop();
    }
  });

  it("applies cooldown gate before executing queued requests", async () => {
    const governor = new GraphQLGovernor(createConfig({ intervalCap: 100, intervalMs: 1000 }));

    try {
      governor.registerRateLimit(120);
      const start = Date.now();

      await governor.schedule(async () => true);

      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(100);
    } finally {
      await governor.stop();
    }
  });

  it("keeps the larger cooldown when multiple rate limits are registered", async () => {
    const governor = new GraphQLGovernor(createConfig());

    try {
      governor.registerRateLimit(200);
      await sleep(20);
      governor.registerRateLimit(50);

      const remaining = governor.getCooldownRemainingMs();
      expect(remaining).toBeGreaterThan(100);
    } finally {
      await governor.stop();
    }
  });

  it("tracks queued and running stats", async () => {
    const governor = new GraphQLGovernor(
      createConfig({ maxConcurrent: 1, intervalCap: 100, intervalMs: 1000 })
    );

    try {
      let release: (() => void) | undefined;
      const blocker = new Promise<void>((resolve) => {
        release = resolve;
      });

      const first = governor.schedule(async () => {
        await blocker;
        return "first";
      });
      const second = governor.schedule(async () => "second");

      await sleep(20);
      const statsWhileBlocked = governor.getStats();
      expect(statsWhileBlocked.running).toBe(1);
      expect(statsWhileBlocked.queued).toBeGreaterThanOrEqual(1);

      release?.();
      await Promise.all([first, second]);

      const finalStats = governor.getStats();
      expect(finalStats.running).toBe(0);
      expect(finalStats.queued).toBe(0);
    } finally {
      await governor.stop();
    }
  });

  it("passes through when disabled", async () => {
    const governor = new GraphQLGovernor(createConfig({ enabled: false }));

    const result = await governor.schedule(async () => "pass-through");
    expect(result).toBe("pass-through");

    // Cooldown should be a no-op when disabled
    governor.registerRateLimit(5000);
    expect(governor.getCooldownRemainingMs()).toBe(0);

    const fastResult = await governor.schedule(async () => "still-fast");
    expect(fastResult).toBe("still-fast");

    await governor.stop();
  });
});

describe("getGraphQLGovernorConfigFromEnv", () => {
  it("returns default config when no env vars are set", () => {
    const config = getGraphQLGovernorConfigFromEnv({});

    expect(config.enabled).toBe(true);
    expect(config.maxConcurrent).toBe(4);
    expect(config.intervalCap).toBe(20);
    expect(config.intervalMs).toBe(1000);
    expect(config.fallbackCooldownMs).toBe(3000);
  });

  it("parses boolean env vars correctly", () => {
    expect(getGraphQLGovernorConfigFromEnv({ GRAPHQL_GOVERNOR_ENABLED: "false" }).enabled).toBe(
      false
    );
    expect(getGraphQLGovernorConfigFromEnv({ GRAPHQL_GOVERNOR_ENABLED: "0" }).enabled).toBe(false);
    expect(getGraphQLGovernorConfigFromEnv({ GRAPHQL_GOVERNOR_ENABLED: "no" }).enabled).toBe(false);
    expect(getGraphQLGovernorConfigFromEnv({ GRAPHQL_GOVERNOR_ENABLED: "true" }).enabled).toBe(
      true
    );
    expect(getGraphQLGovernorConfigFromEnv({ GRAPHQL_GOVERNOR_ENABLED: "1" }).enabled).toBe(true);
    expect(getGraphQLGovernorConfigFromEnv({ GRAPHQL_GOVERNOR_ENABLED: "yes" }).enabled).toBe(true);
  });

  it("falls back to default for invalid boolean values", () => {
    const config = getGraphQLGovernorConfigFromEnv({
      GRAPHQL_GOVERNOR_ENABLED: "maybe",
    });
    expect(config.enabled).toBe(true); // default
  });

  it("parses positive integer env vars correctly", () => {
    const config = getGraphQLGovernorConfigFromEnv({
      GRAPHQL_MAX_CONCURRENCY: "8",
      GRAPHQL_INTERVAL_CAP: "50",
      GRAPHQL_INTERVAL_MS: "2000",
    });

    expect(config.maxConcurrent).toBe(8);
    expect(config.intervalCap).toBe(50);
    expect(config.intervalMs).toBe(2000);
  });

  it("rejects zero and negative for positive integer params", () => {
    expect(getGraphQLGovernorConfigFromEnv({ GRAPHQL_MAX_CONCURRENCY: "0" }).maxConcurrent).toBe(4); // fallback to default
    expect(getGraphQLGovernorConfigFromEnv({ GRAPHQL_MAX_CONCURRENCY: "-1" }).maxConcurrent).toBe(
      4
    ); // fallback to default
  });

  it("accepts zero for non-negative integer params", () => {
    expect(
      getGraphQLGovernorConfigFromEnv({ GRAPHQL_FALLBACK_COOLDOWN_MS: "0" }).fallbackCooldownMs
    ).toBe(0);
  });

  it("falls back to default for non-numeric values", () => {
    const config = getGraphQLGovernorConfigFromEnv({
      GRAPHQL_MAX_CONCURRENCY: "abc",
      GRAPHQL_INTERVAL_CAP: "",
      GRAPHQL_INTERVAL_MS: "3.5",
    });

    expect(config.maxConcurrent).toBe(4); // default
    expect(config.intervalCap).toBe(20); // default
    // parseInt("3.5") = 3, which is > 0, so it's accepted
    expect(config.intervalMs).toBe(3);
  });
});
