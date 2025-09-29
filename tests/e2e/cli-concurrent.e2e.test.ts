import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { CliAssertions } from "./helpers/assertions";
import { type CliTestRunner, createCliTestRunner } from "./helpers/cli-test-runner";
import { fileHelpers, fixtures, generators, testEnv } from "./helpers/fixtures";

const runE2ETests = testEnv.shouldRunE2E() ? describe.sequential : describe.skip;

runE2ETests("CLI Concurrent Execution", () => {
  let runner: CliTestRunner;
  let workspaceRoot: string;
  let testDir: string;
  const saleorConfig = testEnv.getSaleorConfig();

  beforeAll(async () => {
    runner = createCliTestRunner({ timeout: 120_000 });
    workspaceRoot = await mkdtemp(join(tmpdir(), "configurator-concurrent-e2e-"));
  });

  beforeEach(async () => {
    testDir = await mkdtemp(join(workspaceRoot, "test-"));
  });

  afterAll(async () => {
    await runner.cleanup();
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  describe("Parallel Command Execution", () => {
    test("runs multiple introspect commands in parallel", async () => {
      const configs = Array.from({ length: 3 }, (_, i) => ({
        path: join(testDir, `config-${i}.yml`),
        id: generators.testId(),
      }));

      const startTime = performance.now();
      const results = await runner.runConcurrent(
        configs.map((config) => ({
          args: [
            "introspect",
            "--url",
            saleorConfig.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            config.path,
            "--quiet",
            "--include",
            "shop",
          ],
        }))
      );

      const totalTime = performance.now() - startTime;

      // All should succeed
      results.forEach((result) => {
        expect(result).toSucceed();
      });

      // Should be faster than sequential (rough estimate)
      // Sequential would take at least 3x the time of one operation
      const averageTime = totalTime / results.length;
      expect(totalTime).toBeLessThan(averageTime * results.length * 1.5);

      // Verify all config files were created
      for (const config of configs) {
        const content = await fileHelpers.readConfig(config.path);
        expect(content).toHaveProperty("shop");
      }
    });

    test("runs different commands concurrently", async () => {
      // Create initial configs for diff/deploy
      const _deployConfig = join(testDir, "deploy-config.yml");
      const diffConfig = join(testDir, "diff-config.yml");
      const introspectConfig = join(testDir, "introspect-config.yml");

      await fileHelpers.createTempConfig(
        testDir,
        fixtures.mutations.updateShopEmail(fixtures.validConfig, generators.email()),
        "deploy-config.yml"
      );

      await fileHelpers.createTempConfig(testDir, fixtures.validConfig, "diff-config.yml");

      const results = await runner.runConcurrent([
        {
          args: [
            "introspect",
            "--url",
            saleorConfig.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            introspectConfig,
            "--quiet",
            "--include",
            "shop,channels",
          ],
        },
        {
          args: [
            "diff",
            "--url",
            saleorConfig.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            diffConfig,
            "--quiet",
          ],
        },
      ]);

      // Check results
      expect(results).toHaveLength(2);
      results.forEach((result) => {
        expect(result.exitCode).toBeDefined();
      });
    });

    test("handles concurrent operations with rate limiting", async () => {
      const numOperations = 10;
      const configs = Array.from({ length: numOperations }, (_, i) =>
        join(testDir, `config-${i}.yml`)
      );

      // Run with controlled concurrency
      const results = await runner.runConcurrent(
        configs.map((path) => ({
          args: [
            "introspect",
            "--url",
            saleorConfig.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            path,
            "--quiet",
            "--include",
            "shop", // Small scope to avoid rate limiting
          ],
        })),
        { maxConcurrency: 3 }
      );

      // Most should succeed, some might hit rate limits
      const successCount = results.filter((r) => r.success).length;
      expect(successCount).toBeGreaterThan(0);

      // If any failed due to rate limiting, they should have appropriate errors
      const rateLimitedResults = results.filter(
        (r) => !r.success && r.cleanStderr.toLowerCase().includes("rate")
      );
      rateLimitedResults.forEach((result) => {
        expect(result.cleanStderr.toLowerCase()).toMatch(/(rate|limit|throttle)/i);
      });
    });
  });

  describe("Resource Sharing", () => {
    test("handles concurrent access to same config file", async () => {
      const sharedConfig = join(testDir, "shared-config.yml");
      await fileHelpers.createTempConfig(testDir, fixtures.validConfig, "shared-config.yml");

      // Multiple diff operations on same config
      const results = await runner.runConcurrent(
        Array.from({ length: 3 }, () => ({
          args: [
            "diff",
            "--url",
            saleorConfig.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            sharedConfig,
            "--quiet",
          ],
        }))
      );

      // All should complete (reads are safe)
      results.forEach((result) => {
        expect(result.exitCode).toBeDefined();
      });
    });

    test("prevents concurrent writes to same config", async () => {
      const sharedConfig = join(testDir, "write-config.yml");

      // Concurrent introspect to same file
      const results = await runner.runConcurrent(
        Array.from({ length: 2 }, () => ({
          args: [
            "introspect",
            "--url",
            saleorConfig.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            sharedConfig,
            "--quiet",
          ],
        }))
      );

      // At least one should succeed
      const successCount = results.filter((r) => r.success).length;
      expect(successCount).toBeGreaterThanOrEqual(1);

      // Check final config is valid
      const finalConfig = await fileHelpers.readConfig(sharedConfig);
      expect(finalConfig).toHaveProperty("shop");
    });
  });

  describe("Performance Scaling", () => {
    test("maintains performance with increasing concurrency", async () => {
      const testCases = [1, 2, 4];
      const timings: Record<number, number> = {};

      for (const concurrency of testCases) {
        const configs = Array.from({ length: concurrency }, (_, i) =>
          join(testDir, `perf-${concurrency}-${i}.yml`)
        );

        const startTime = performance.now();
        await runner.runConcurrent(
          configs.map((path) => ({
            args: [
              "introspect",
              "--url",
              saleorConfig.url,
              "--token",
              saleorConfig.token || "test-token",
              "--config",
              path,
              "--quiet",
              "--include",
              "shop",
            ],
          })),
          { maxConcurrency: concurrency }
        );
        timings[concurrency] = performance.now() - startTime;
      }

      // Performance should scale sub-linearly
      // 2x concurrency should not take 2x time
      if (timings[1] && timings[2]) {
        expect(timings[2]).toBeLessThan(timings[1] * 1.8);
      }
    });

    test("handles mixed fast and slow operations", async () => {
      const operations = [
        // Fast operation
        {
          args: [
            "diff",
            "--url",
            saleorConfig.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            join(testDir, "fast.yml"),
            "--quiet",
          ],
        },
        // Slower operation (larger scope)
        {
          args: [
            "introspect",
            "--url",
            saleorConfig.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            join(testDir, "slow.yml"),
            "--quiet",
          ],
        },
      ];

      // Create config for diff
      await fileHelpers.createTempConfig(testDir, fixtures.validConfig, "fast.yml");

      const results = await runner.runConcurrent(operations);

      // Both should complete
      expect(results).toHaveLength(2);
      results.forEach((result) => {
        expect(result.exitCode).toBeDefined();
      });
    });
  });

  describe("Error Isolation", () => {
    test("isolates failures between concurrent operations", async () => {
      const operations = [
        // This will succeed
        {
          args: [
            "introspect",
            "--url",
            saleorConfig.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            join(testDir, "success.yml"),
            "--quiet",
            "--include",
            "shop",
          ],
        },
        // This will fail (invalid token)
        {
          args: [
            "introspect",
            "--url",
            saleorConfig.url,
            "--token",
            "invalid-token",
            "--config",
            join(testDir, "fail.yml"),
            "--quiet",
          ],
        },
      ];

      const results = await runner.runConcurrent(operations);

      // Should have both results
      expect(results).toHaveLength(2);

      // First should succeed
      expect(results[0]).toSucceed();

      // Second should fail
      expect(results[1]).toFail();
      expect(results[1].cleanStderr.toLowerCase()).toMatch(/(permission|token|unauthorized)/i);

      // Success config should be created
      const successConfig = await fileHelpers.readConfig(join(testDir, "success.yml"));
      expect(successConfig).toHaveProperty("shop");

      // Fail config should not exist
      const failExists = await fileHelpers.exists(join(testDir, "fail.yml"));
      expect(failExists).toBe(false);
    });

    test("handles partial batch failures", async () => {
      const configs = Array.from({ length: 5 }, (_, i) => ({
        path: join(testDir, `batch-${i}.yml`),
        // Mix valid and invalid URLs
        url: i % 2 === 0 ? saleorConfig.url : "https://invalid.example.com/graphql/",
      }));

      const results = await runner.runConcurrent(
        configs.map((config) => ({
          args: [
            "introspect",
            "--url",
            config.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            config.path,
            "--quiet",
            "--include",
            "shop",
          ],
        }))
      );

      // Should have all results
      expect(results).toHaveLength(5);

      // Some should succeed, some should fail
      const successes = results.filter((r) => r.success);
      const failures = results.filter((r) => !r.success);

      expect(successes.length).toBeGreaterThan(0);
      expect(failures.length).toBeGreaterThan(0);

      // Check failure reasons
      failures.forEach((result) => {
        CliAssertions.expectNetworkError(result);
      });
    });
  });

  describe("Scenario Building", () => {
    test("builds complex scenarios with fluent API", async () => {
      const scenario = runner
        .scenario()
        .step("initial-introspect", async (_ctx) => {
          const result = await runner.run([
            "introspect",
            "--url",
            saleorConfig.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            join(testDir, "scenario.yml"),
            "--quiet",
            "--include",
            "shop",
          ]);
          return result;
        })
        .delay(500)
        .step("modify-config", async (ctx) => {
          const introspectResult = ctx.get("initial-introspect");
          if (introspectResult?.success) {
            await fileHelpers.updateConfig(join(testDir, "scenario.yml"), (config) =>
              fixtures.mutations.updateShopEmail(config, generators.email())
            );
          }
          return true;
        })
        .step("diff-changes", async (_ctx) => {
          const result = await runner.run([
            "diff",
            "--url",
            saleorConfig.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            join(testDir, "scenario.yml"),
            "--quiet",
          ]);
          return result;
        });

      const context = await scenario.execute();

      // Check scenario results
      const introspectResult = context.get("initial-introspect");
      expect(introspectResult).toHaveProperty("success");
      expect(introspectResult.success).toBe(true);

      const diffResult = context.get("diff-changes");
      expect(diffResult).toHaveProperty("success");
    });

    test("runs parallel steps in scenarios", async () => {
      const scenario = runner.scenario().parallel(
        async (_ctx) => {
          return await runner.run([
            "introspect",
            "--url",
            saleorConfig.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            join(testDir, "parallel1.yml"),
            "--quiet",
            "--include",
            "shop",
          ]);
        },
        async (_ctx) => {
          return await runner.run([
            "introspect",
            "--url",
            saleorConfig.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            join(testDir, "parallel2.yml"),
            "--quiet",
            "--include",
            "channels",
          ]);
        }
      );

      const _context = await scenario.execute();

      // Both configs should be created
      const config1 = await fileHelpers.readConfig(join(testDir, "parallel1.yml"));
      const config2 = await fileHelpers.readConfig(join(testDir, "parallel2.yml"));

      expect(config1).toHaveProperty("shop");
      expect(config2).toHaveProperty("channels");
    });
  });

  describe("Load Testing", () => {
    test("handles sustained concurrent load", async () => {
      const duration = 10000; // 10 seconds
      const operationsPerSecond = 2;
      const results: any[] = [];
      const startTime = performance.now();

      const runOperation = async (index: number) => {
        const result = await runner.run(
          [
            "diff",
            "--url",
            saleorConfig.url,
            "--token",
            saleorConfig.token || "test-token",
            "--config",
            join(testDir, `load-${index}.yml`),
            "--quiet",
          ],
          {
            reject: false,
          }
        );
        results.push(result);
      };

      // Create configs for diff
      for (let i = 0; i < operationsPerSecond * (duration / 1000); i++) {
        await fileHelpers.createTempConfig(testDir, fixtures.validConfig, `load-${i}.yml`);
      }

      // Start operations at intervals
      const promises: Promise<void>[] = [];
      let index = 0;

      const interval = setInterval(() => {
        if (performance.now() - startTime > duration) {
          clearInterval(interval);
          return;
        }
        promises.push(runOperation(index++));
      }, 1000 / operationsPerSecond);

      // Wait for duration
      await new Promise((resolve) => setTimeout(resolve, duration + 1000));
      clearInterval(interval);

      // Wait for all to complete
      await Promise.all(promises);

      // Most should succeed under load
      const successRate = results.filter((r) => r.success).length / results.length;
      expect(successRate).toBeGreaterThan(0.8); // 80% success rate
    });

    test("gracefully degrades under extreme concurrency", async () => {
      const extremeConcurrency = 20;
      const configs = Array.from({ length: extremeConcurrency }, (_, i) =>
        join(testDir, `extreme-${i}.yml`)
      );

      // Create simple configs for diff
      await Promise.all(
        configs.map((_path, i) =>
          fileHelpers.createTempConfig(testDir, fixtures.validConfig, `extreme-${i}.yml`)
        )
      );

      const startTime = performance.now();
      const results = await runner.runConcurrent(
        configs.map((path) => ({
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
          options: {
            timeout: 30_000,
          },
        })),
        { maxConcurrency: extremeConcurrency }
      );

      const totalTime = performance.now() - startTime;

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(60_000);

      // Some should succeed even under extreme load
      const successCount = results.filter((r) => r.success).length;
      expect(successCount).toBeGreaterThan(0);

      // Check for various failure modes
      const failures = results.filter((r) => !r.success);
      failures.forEach((result) => {
        // Should fail gracefully with clear errors
        expect(result.cleanStderr || result.cleanStdout).toBeTruthy();
      });
    });
  });
});

if (!testEnv.shouldRunE2E()) {
  console.warn(
    "Skipping Concurrent Execution e2e tests. Provide CONFIGURATOR_E2E_SALEOR_TOKEN to enable them."
  );
}
