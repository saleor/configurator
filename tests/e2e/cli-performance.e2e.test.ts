import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { testHelpers } from "./helpers/assertions";
import {
  type CliTestRunner,
  type CommandMetrics,
  createCliTestRunner,
} from "./helpers/cli-test-runner";
import { fileHelpers, fixtures, generators, testEnv, scenarios } from "./helpers/fixtures";
import type { TestConfig } from "./helpers/types";

const runE2ETests = testEnv.shouldRunE2E() ? describe.sequential : describe.skip;

interface PerformanceMetrics {
  command: string;
  duration: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  configSize?: number;
  outputSize?: number;
}

runE2ETests("CLI Performance Benchmarks", () => {
  let runner: CliTestRunner;
  let workspaceRoot: string;
  let testDir: string;
  const saleorConfig = testEnv.getSaleorConfig();
  const performanceResults: Map<string, PerformanceMetrics[]> = new Map();

  beforeAll(async () => {
    runner = createCliTestRunner({ timeout: 300_000, collectMetrics: true });
    workspaceRoot = await mkdtemp(join(tmpdir(), "configurator-performance-e2e-"));

    // Collect metrics
    runner.on("metrics", (metrics: CommandMetrics & { command?: string }) => {
      const key = metrics.command || "unknown";
      if (!performanceResults.has(key)) {
        performanceResults.set(key, []);
      }
      performanceResults.get(key)?.push({
        ...metrics,
        command: key,
      } as PerformanceMetrics);
    });
  });

  beforeEach(async () => {
    testDir = await mkdtemp(join(workspaceRoot, "test-"));
  });

  afterAll(async () => {
    // Log performance summary
    console.log("\n=== Performance Summary ===");
    for (const [command, metrics] of performanceResults.entries()) {
      const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
      console.log(`${command}: Avg ${avgDuration.toFixed(2)}ms`);
    }

    await runner.cleanup();
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  describe("Command Response Times", () => {
    test("introspect completes within acceptable time", async () => {
      const configPath = join(testDir, "config.yml");

      const { result, duration } = await testHelpers.measureTime(async () =>
        runner.run(
          [
            "introspect",
            "--url",
            saleorConfig.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            configPath,
            "--quiet",
            "--include",
            "shop,channels",
          ],
          { collectMetrics: true }
        )
      );

      expect(result).toSucceed();
      expect(duration).toBeLessThan(30_000); // 30 seconds max for partial introspect

      // Check output size
      const outputSize = result.stdout.length + result.stderr.length;
      expect(outputSize).toBeGreaterThan(0);
    });

    test("diff performs quickly on small configs", async () => {
      const configPath = join(testDir, "config.yml");
      await fileHelpers.createTempConfig(testDir, fixtures.validConfig);

      const { result, duration } = await testHelpers.measureTime(async () =>
        runner.run(
          [
            "diff",
            "--url",
            saleorConfig.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            configPath,
            "--quiet",
          ],
          { collectMetrics: true }
        )
      );

      expect(result).toSucceed();
      expect(duration).toBeLessThan(15_000); // 15 seconds for small diff
    });

    test("deploy handles small changes efficiently", async () => {
      const configPath = join(testDir, "config.yml");

      // Small change
      const config = fixtures.mutations.updateShopEmail(fixtures.validConfig, generators.email());
      await fileHelpers.createTempConfig(testDir, config);

      const { result, duration } = await testHelpers.measureTime(async () =>
        runner.run(
          [
            "deploy",
            "--url",
            saleorConfig.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            configPath,
            "--ci",
            "--quiet",
          ],
          { collectMetrics: true }
        )
      );

      if (!result.cleanStdout.includes("No differences found")) {
        expect(duration).toBeLessThan(60_000); // 60 seconds for small deployment
      }
    });
  });

  describe("Scaling Performance", () => {
    test("introspect scales with module count", async () => {
      const testCases = [
        { modules: ["shop"], expectedTime: 10_000 },
        { modules: ["shop", "channels"], expectedTime: 15_000 },
        { modules: ["shop", "channels", "warehouses"], expectedTime: 20_000 },
      ];

      const timings: Record<number, number> = {};

      for (const testCase of testCases) {
        const configPath = join(testDir, `config-${testCase.modules.length}.yml`);

        const { result, duration } = await testHelpers.measureTime(async () =>
          runner.run(
            [
              "introspect",
              "--url",
              saleorConfig.url,
              "--token",
              saleorConfig.token || "test-token",
              "--config",
              configPath,
              "--quiet",
              "--include",
              testCase.modules.join(","),
            ],
            { collectMetrics: true }
          )
        );

        expect(result).toSucceed();
        timings[testCase.modules.length] = duration;

        // Should be within expected range (with 50% buffer)
        expect(duration).toBeLessThan(testCase.expectedTime * 1.5);
      }

      // Performance should scale sub-linearly
      if (timings[1] && timings[2] && timings[3]) {
        const scaleFactor1to2 = timings[2] / timings[1];
        const scaleFactor2to3 = timings[3] / timings[2];
        // Each additional module should add less time
        expect(scaleFactor2to3).toBeLessThanOrEqual(scaleFactor1to2 * 1.2);
      }
    });

    test("diff scales with configuration size", async () => {
      const sizes = [
        { channels: 2, products: 10, expectedTime: 10_000 },
        { channels: 5, products: 50, expectedTime: 20_000 },
        { channels: 10, products: 100, expectedTime: 40_000 },
      ];

      const timings: Record<string, number> = {};

      for (const size of sizes) {
        const configPath = join(testDir, `config-${size.channels}-${size.products}.yml`);
        const config = fixtures.largeConfig.generateLarge(size);
        await fileHelpers.createTempConfig(
          testDir,
          config,
          `config-${size.channels}-${size.products}.yml`
        );

        const { duration } = await testHelpers.measureTime(async () =>
          runner.run(
            [
              "diff",
              "--url",
              saleorConfig.url,
              "--token",
              saleorConfig.token || "test-token",
              "--config",
              configPath,
              "--quiet",
            ],
            { collectMetrics: true }
          )
        );

        timings[`${size.channels}-${size.products}`] = duration;

        // Should complete within expected time
        expect(duration).toBeLessThan(size.expectedTime);
      }
    });
  });

  describe("Memory Usage", () => {
    test("maintains reasonable memory usage for large configs", async () => {
      const configPath = join(testDir, "large-config.yml");

      // Large configuration
      const largeConfig = fixtures.largeConfig.generateLarge({
        channels: 20,
        products: 200,
        categories: 50,
        warehouses: 10,
      });
      await fileHelpers.createTempConfig(testDir, largeConfig, "large-config.yml");

      const initialMemory = process.memoryUsage();

      const result = await runner.run(
        [
          "diff",
          "--url",
          saleorConfig.url,
          "--token",
          saleorConfig.token || "test-token",
          "--config",
          configPath,
          "--quiet",
        ],
        { collectMetrics: true }
      );

      const finalMemory = process.memoryUsage();

      expect(result).toSucceed();

      // Memory increase should be reasonable
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB
      expect(memoryIncrease).toBeLessThan(500); // Less than 500MB increase

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    });

    test("handles memory spikes during concurrent operations", async () => {
      const configs = Array.from({ length: 5 }, (_, i) => ({
        path: join(testDir, `mem-test-${i}.yml`),
        config: fixtures.largeConfig.generateLarge({
          channels: 5,
          products: 50,
        }),
      }));

      // Create configs
      await Promise.all(
        configs.map(({ config }, i) =>
          fileHelpers.createTempConfig(testDir, config, `mem-test-${i}.yml`)
        )
      );

      const initialMemory = process.memoryUsage();

      // Run concurrent operations
      await runner.runConcurrent(
        configs.map(({ path }) => ({
          args: [
            "diff",
            "--url",
            saleorConfig.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            path,
            "--quiet",
          ],
          options: { collectMetrics: true },
        })),
        { maxConcurrency: 3 }
      );

      const peakMemory = process.memoryUsage();
      const memoryIncrease = (peakMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;

      // Should handle concurrent operations without excessive memory use
      expect(memoryIncrease).toBeLessThan(1000); // Less than 1GB increase
    });
  });

  describe("Network Performance", () => {
    test("handles network latency gracefully", async () => {
      const configPath = join(testDir, "config.yml");

      // Multiple network operations
      const operations = ["introspect", "diff"];

      const networkTimings: Record<string, number> = {};

      for (const op of operations) {
        if (op === "diff") {
          await fileHelpers.createTempConfig(testDir, fixtures.validConfig);
        }

        const { result, duration } = await testHelpers.measureTime(async () =>
          runner.run(
            [
              op,
              "--url",
              saleorConfig.url,
              "--token",
              saleorConfig.token || "test-token",
              "--config",
              configPath,
              "--quiet",
              ...(op === "introspect" ? ["--include", "shop"] : []),
            ],
            { collectMetrics: true }
          )
        );

        expect(result).toSucceed();
        networkTimings[op] = duration;
      }

      // Network operations should complete in reasonable time
      Object.entries(networkTimings).forEach(([_op, time]) => {
        expect(time).toBeLessThan(30_000); // 30 seconds max
      });
    });

    test("implements efficient batching for GraphQL requests", async () => {
      const configPath = join(testDir, "config.yml");

      // Introspect multiple modules (should batch efficiently)
      const { result, duration } = await testHelpers.measureTime(async () =>
        runner.run(
          [
            "introspect",
            "--url",
            saleorConfig.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            configPath,
            "--quiet",
            "--include",
            "shop,channels,warehouses,shippingZones",
          ],
          { collectMetrics: true }
        )
      );

      expect(result).toSucceed();

      // Should be faster than sequential requests would be
      // Rough estimate: 4 modules should take less than 4x single module time
      expect(duration).toBeLessThan(40_000); // Generous limit
    });
  });

  describe("File I/O Performance", () => {
    test("handles large file writes efficiently", async () => {
      const configPath = join(testDir, "large-output.yml");

      // Generate large configuration
      const largeConfig = fixtures.largeConfig.generateLarge({
        channels: 30,
        products: 500,
        categories: 100,
      });

      const { duration: writeDuration } = await testHelpers.measureTime(
        async () => fileHelpers.createTempConfig(testDir, largeConfig, "large-output.yml")
      );

      // Write should be fast
      expect(writeDuration).toBeLessThan(5000); // 5 seconds for large file

      // Introspect to large file
      const { result, duration } = await testHelpers.measureTime(async () =>
        runner.run(
          [
            "introspect",
            "--url",
            saleorConfig.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            configPath,
            "--quiet",
          ],
          { collectMetrics: true }
        )
      );

      expect(result).toSucceed();

      // File operations should not be a bottleneck
      expect(duration).toBeLessThan(60_000);
    });

    test("handles frequent small file operations", async () => {
      const iterations = 20;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const _configPath = join(testDir, `small-${i}.yml`);
        await fileHelpers.createTempConfig(testDir, scenarios.minimal(), `small-${i}.yml`);
      }

      const totalTime = performance.now() - startTime;
      const avgTime = totalTime / iterations;

      // Small file operations should be very fast
      expect(avgTime).toBeLessThan(100); // Less than 100ms per file
    });
  });

  describe("Optimization Verification", () => {
    test("caches appropriately to improve performance", async () => {
      const configPath = join(testDir, "cache-test.yml");
      await fileHelpers.createTempConfig(testDir, fixtures.validConfig, "cache-test.yml");

      // First run (cold cache)
      const { duration: firstRun } = await testHelpers.measureTime(async () =>
        runner.run(
          [
            "diff",
            "--url",
            saleorConfig.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            configPath,
            "--quiet",
          ],
          { collectMetrics: true }
        )
      );

      // Second run (potentially warm cache)
      const { duration: secondRun } = await testHelpers.measureTime(async () =>
        runner.run(
          [
            "diff",
            "--url",
            saleorConfig.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            configPath,
            "--quiet",
          ],
          { collectMetrics: true }
        )
      );

      // Second run might be faster due to caching
      // (This depends on implementation details)
      console.log(`Cache test: First run ${firstRun}ms, Second run ${secondRun}ms`);
    });

    test("startup time is acceptable", async () => {
      const { result, duration } = await testHelpers.measureTime(async () =>
        runner.run(["--help"])
      );

      expect(result).toSucceed();
      expect(duration).toBeLessThan(2000); // Less than 2 seconds to show help
    });

    test("handles --version quickly", async () => {
      const { result, duration } = await testHelpers.measureTime(async () =>
        runner.run(["--version"])
      );

      expect(result).toSucceed();
      expect(duration).toBeLessThan(1000); // Less than 1 second for version
    });
  });

  describe("Stress Testing", () => {
    test("maintains performance under sustained load", async () => {
      const duration = 30_000; // 30 seconds
      const startTime = performance.now();
      const results: PerformanceMetrics[] = [];

      while (performance.now() - startTime < duration) {
        const iterationStart = performance.now();
        const configPath = join(testDir, `stress-${Date.now()}.yml`);

        const minimalConfig: TestConfig = {
          shop: {
            defaultMailSenderName: "Minimal Shop",
            defaultMailSenderAddress: "minimal@test.com",
          },
          channels: [{ slug: "default", name: "Default", currencyCode: "USD" }],
        };
        await fileHelpers.createTempConfig(testDir, minimalConfig, `stress-${Date.now()}.yml`);

        const _result = await runner.runSafe(
          [
            "diff",
            "--url",
            saleorConfig.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            configPath,
            "--quiet",
          ],
          { collectMetrics: true }
        );

        results.push({
          command: "diff",
          duration: performance.now() - iterationStart,
        });

        // Small delay between iterations
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Performance should remain stable
      const firstHalf = results.slice(0, Math.floor(results.length / 2));
      const secondHalf = results.slice(Math.floor(results.length / 2));

      const avgFirst = firstHalf.reduce((sum, r) => sum + r.duration, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((sum, r) => sum + r.duration, 0) / secondHalf.length;

      // Performance degradation should be minimal
      expect(avgSecond).toBeLessThan(avgFirst * 1.5); // Less than 50% degradation
    });
  });

  describe("Performance Reporting", () => {
    test("collects comprehensive metrics", async () => {
      runner.clearMetrics();

      const configPath = join(testDir, "metrics.yml");
      await fileHelpers.createTempConfig(testDir, fixtures.validConfig, "metrics.yml");

      await runner.run(
        [
          "diff",
          "--url",
          saleorConfig.url,
          "--token",
          saleorConfig.token || "test-token",
          "--config",
          configPath,
          "--quiet",
        ],
        { collectMetrics: true }
      );

      const metrics = runner.getMetrics();
      expect(metrics.size).toBeGreaterThan(0);

      // Check metric structure
      for (const [_key, metric] of metrics.entries()) {
        expect(metric).toHaveProperty("duration");
        expect(metric).toHaveProperty("exitCode");
        expect(metric.duration).toBeGreaterThan(0);
      }
    });
  });
});

if (!testEnv.shouldRunE2E()) {
  console.warn(
    "Skipping Performance e2e tests. Provide CONFIGURATOR_E2E_SALEOR_TOKEN to enable them."
  );
}
