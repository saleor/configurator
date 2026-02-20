import { afterEach, describe, expect, it, vi } from "vitest";
import { GraphQLGovernor, type GraphQLGovernorConfig } from "./governor";

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
});
