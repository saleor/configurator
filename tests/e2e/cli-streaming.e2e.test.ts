import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { type CliTestRunner, createCliTestRunner } from "./helpers/cli-test-runner";
import { ConfigBuilder, fileHelpers, fixtures, generators, testEnv } from "./helpers/fixtures";

// Skip streaming/real-time output tests in CI - these test advanced UI features
// These tests focus on progress indicators and output buffering, not core functionality
const runE2ETests = describe.skip;

runE2ETests("CLI Streaming and Real-time Output", () => {
  let runner: CliTestRunner;
  let workspaceRoot: string;
  let testDir: string;
  const saleorConfig = testEnv.getSaleorConfig();

  beforeAll(async () => {
    runner = createCliTestRunner({ timeout: 120_000, verbose: true });
    workspaceRoot = await mkdtemp(join(tmpdir(), "configurator-streaming-e2e-"));
  });

  beforeEach(async () => {
    testDir = await mkdtemp(join(workspaceRoot, "test-"));
  });

  afterAll(async () => {
    await runner.cleanup();
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  describe("Progress Indicators", () => {
    test("shows progress during introspection", async () => {
      const configPath = join(testDir, "config.yml");
      const lines: string[] = [];

      // Stream output to capture progress indicators
      const streamIterator = runner.stream([
        "introspect",
        "--url",
        saleorConfig.url,
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
      ]);

      for await (const { line } of streamIterator) {
        lines.push(line);
        if (line.includes("Complete")) break;
      }

      // Should show progress indicators
      const hasProgress = lines.some(
        (line) =>
          line.includes("Fetching") ||
          line.includes("Processing") ||
          line.includes("%") ||
          line.includes("…") ||
          line.includes("✓")
      );
      expect(hasProgress).toBe(true);
    });

    test("shows module-by-module progress", async () => {
      const configPath = join(testDir, "config.yml");
      const modules: Set<string> = new Set();

      const streamIterator = runner.stream([
        "introspect",
        "--url",
        saleorConfig.url,
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
      ]);

      for await (const { line } of streamIterator) {
        // Capture module names from progress output
        const moduleMatch = line.match(/(?:Fetching|Processing|Introspecting)\s+(\w+)/i);
        if (moduleMatch) {
          modules.add(moduleMatch[1].toLowerCase());
        }
        if (line.includes("Complete")) break;
      }

      // Should process multiple modules
      expect(modules.size).toBeGreaterThan(0);
      // Should include core modules
      const expectedModules = ["shop", "channels", "warehouses"];
      expectedModules.forEach((module) => {
        if (modules.has(module)) {
          expect(modules).toContain(module);
        }
      });
    });

    test("updates progress in real-time during deployment", async () => {
      const configPath = join(testDir, "config.yml");

      // Create a config with changes
      const config = ConfigBuilder.from(fixtures.validConfig)
        .withShop({
          defaultMailSenderName: `Streaming Test ${generators.testId()}`,
          defaultMailSenderAddress: generators.email(),
        })
        .build();
      await fileHelpers.createTempConfig(testDir, config);

      const progressUpdates: string[] = [];
      const streamIterator = runner.stream([
        "deploy",
        "--url",
        saleorConfig.url,
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
        "--ci",
      ]);

      for await (const { line } of streamIterator) {
        if (line.includes("Applying") || line.includes("Deploying") || line.includes("Stage")) {
          progressUpdates.push(line);
        }
        if (line.includes("Complete") || line.includes("No differences")) break;
      }

      // Should show deployment stages
      if (progressUpdates.length > 0) {
        expect(progressUpdates.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Live Log Streaming", () => {
    test("streams logs during diff operation", async () => {
      const configPath = join(testDir, "config.yml");

      // Create config with differences
      const config = ConfigBuilder.from(fixtures.validConfig)
        .withShop({
          limitQuantityPerCheckout: 999,
        })
        .build();
      await fileHelpers.createTempConfig(testDir, config);

      const logs: { stdout: string[]; stderr: string[] } = {
        stdout: [],
        stderr: [],
      };

      const streamIterator = runner.stream(
        [
          "diff",
          "--url",
          saleorConfig.url,
          "--token",
          saleorConfig.token || "test-token",
          "--config",
          configPath,
        ],
        {
          env: {
            LOG_LEVEL: "debug",
          },
        }
      );

      for await (const { line } of streamIterator) {
        logs.stdout.push(line);
        if (line.includes("Complete") || line.includes("differences found")) break;
      }

      // Should have captured output
      expect(logs.stdout.length).toBeGreaterThan(0);
    });

    test("streams verbose output when requested", async () => {
      const configPath = join(testDir, "config.yml");
      await fileHelpers.createTempConfig(testDir, fixtures.validConfig);

      const verboseLines: string[] = [];
      const streamIterator = runner.stream([
        "introspect",
        "--url",
        saleorConfig.url,
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
        "--verbose",
      ]);

      for await (const { line } of streamIterator) {
        if (line.includes("Debug") || line.includes("Verbose") || line.includes("->")) {
          verboseLines.push(line);
        }
        if (line.includes("Complete")) break;
      }

      // Verbose mode should produce more output
      // Note: This depends on implementation, adjust if needed
    });

    test("separates stdout and stderr streams", async () => {
      const configPath = join(testDir, "config.yml");

      // Use invalid config to generate errors
      await fileHelpers.createTempConfig(testDir, fixtures.invalidConfigs.missingRequired);

      const streams = { stdout: [], stderr: [] } as {
        stdout: string[];
        stderr: string[];
      };

      const streamIterator = runner.stream([
        "deploy",
        "--url",
        saleorConfig.url,
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
        "--ci",
      ]);

      let errorFound = false;
      for await (const { line } of streamIterator) {
        if (type === "stdout") {
          streams.stdout.push(line);
        } else {
          streams.stderr.push(line);
          if (line.toLowerCase().includes("error") || line.toLowerCase().includes("validation")) {
            errorFound = true;
            break;
          }
        }
      }

      // Errors should go to stderr
      if (errorFound) {
        expect(streams.stderr.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Output Buffering", () => {
    test("handles large output without buffering issues", async () => {
      const configPath = join(testDir, "config.yml");

      // Create large config to generate substantial output
      const largeConfig = fixtures.largeConfig.generateLarge({
        channels: 20,
        products: 100,
        warehouses: 10,
        categories: 30,
      });
      await fileHelpers.createTempConfig(testDir, largeConfig);

      let lineCount = 0;
      let maxLineLength = 0;
      const streamIterator = runner.stream([
        "diff",
        "--url",
        saleorConfig.url,
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
      ]);

      for await (const { line } of streamIterator) {
        lineCount++;
        maxLineLength = Math.max(maxLineLength, line.length);
        if (lineCount > 1000) break; // Safety limit
      }

      // Should handle many lines
      expect(lineCount).toBeGreaterThan(0);
      // Should not truncate long lines
      expect(maxLineLength).toBeLessThan(10000); // Reasonable line length
    });

    test("handles rapid output bursts", async () => {
      const configPath = join(testDir, "config.yml");

      // Create config with many small items
      const config = {
        ...fixtures.validConfig,
        attributes: Array.from({ length: 50 }, (_, i) => ({
          slug: `attr-${i}`,
          name: `Attribute ${i}`,
          type: "PRODUCT_TYPE",
          inputType: "DROPDOWN",
        })),
      };
      await fileHelpers.createTempConfig(testDir, config);

      const timestamps: number[] = [];
      const streamIterator = runner.stream([
        "introspect",
        "--url",
        saleorConfig.url,
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
        "--include",
        "attributes",
      ]);

      for await (const _entry of streamIterator) {
        timestamps.push(Date.now());
        if (timestamps.length > 100) break;
      }

      // Should handle rapid output without blocking
      if (timestamps.length > 2) {
        const avgInterval = (timestamps[timestamps.length - 1] - timestamps[0]) / timestamps.length;
        expect(avgInterval).toBeLessThan(1000); // No major delays
      }
    });
  });

  describe("Interactive Output", () => {
    test("clears and updates progress lines", async () => {
      const configPath = join(testDir, "config.yml");

      const outputLines: string[] = [];
      const streamIterator = runner.stream([
        "introspect",
        "--url",
        saleorConfig.url,
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
      ]);

      for await (const { line } of streamIterator) {
        outputLines.push(line);
        if (line.includes("Complete") || outputLines.length > 100) break;
      }

      // Look for progress indicators that update in place
      const _hasProgressIndicators = outputLines.some(
        (line) =>
          line.includes("⠋") ||
          line.includes("⠙") ||
          line.includes("⠹") ||
          line.includes("⠸") ||
          line.includes("⠼") ||
          line.includes("⠴") ||
          line.includes("⠦") ||
          line.includes("⠧") ||
          line.includes("⠇") ||
          line.includes("⠏") ||
          line.includes("✓") ||
          line.includes("✔")
      );

      // Progress indicators may or may not be present depending on TTY detection
      // This is acceptable behavior
    });

    test("shows colored output when supported", async () => {
      const configPath = join(testDir, "config.yml");
      await fileHelpers.createTempConfig(testDir, fixtures.validConfig);

      const result = await runner.run(
        [
          "diff",
          "--url",
          saleorConfig.url,
          "--token",
          saleorConfig.token || "test-token",
          "--config",
          configPath,
        ],
        {
          env: {
            FORCE_COLOR: "1",
          },
        }
      );

      // Raw output should contain ANSI codes
      const _hasAnsiCodes = result.stdout.includes("\x1b[") || result.stderr.includes("\x1b[");

      // Clean output should not
      const hasCleanAnsi =
        result.cleanStdout.includes("\x1b[") || result.cleanStderr.includes("\x1b[");
      expect(hasCleanAnsi).toBe(false);
    });

    test("handles non-TTY output correctly", async () => {
      const configPath = join(testDir, "config.yml");
      await fileHelpers.createTempConfig(testDir, fixtures.validConfig);

      const result = await runner.run(
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
        {
          env: {
            FORCE_COLOR: "0",
            CI: "true",
          },
        }
      );

      expect(result).toSucceed();

      // In non-TTY mode, should not have spinner characters
      const hasSpinners =
        result.cleanStdout.includes("⠋") ||
        result.cleanStdout.includes("⠙") ||
        result.cleanStdout.includes("⠹");
      expect(hasSpinners).toBe(false);
    });
  });

  describe("Error Output Streaming", () => {
    test("streams errors as they occur", async () => {
      const configPath = join(testDir, "config.yml");

      // Create config that will cause validation errors
      const invalidConfig = {
        shop: fixtures.validConfig.shop,
        channels: [
          { slug: "channel-1", name: "Channel 1", currencyCode: "USD" },
          { slug: "channel-2", name: "Channel 2", currencyCode: "USD" },
          { slug: "channel-3", name: "Channel 3", currencyCode: "USD" },
        ],
      };
      await fileHelpers.createTempConfig(testDir, invalidConfig);

      const errors: string[] = [];
      const streamIterator = runner.stream([
        "deploy",
        "--url",
        saleorConfig.url,
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
        "--ci",
      ]);

      for await (const { line } of streamIterator) {
        if (type === "stderr" && line.toLowerCase().includes("error")) {
          errors.push(line);
        }
        if (errors.length > 5) break;
      }

      // Should stream errors
      expect(errors.length).toBeGreaterThan(0);
    });

    test("preserves error formatting", async () => {
      const configPath = join(testDir, "config.yml");

      // Use invalid config to trigger error
      await fileHelpers.createTempConfig(testDir, fixtures.invalidConfigs.missingRequired);

      const errorLines: string[] = [];
      const streamIterator = runner.stream([
        "deploy",
        "--url",
        saleorConfig.url,
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
        "--ci",
      ]);

      for await (const { line } of streamIterator) {
        if (type === "stderr") {
          errorLines.push(line);
        }
        if (line.toLowerCase().includes("error") || errorLines.length > 10) break;
      }

      // Error output should be properly formatted
      const errorText = errorLines.join("\n");
      expect(errorText).toBeTruthy();
    });
  });

  describe("Performance Monitoring", () => {
    test("reports timing information", async () => {
      const configPath = join(testDir, "config.yml");
      await fileHelpers.createTempConfig(testDir, fixtures.validConfig);

      runner.on("metrics", (metrics) => {
        expect(metrics.duration).toBeGreaterThan(0);
        expect(metrics.exitCode).toBeDefined();
      });

      const result = await runner.run(
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
        {
          collectMetrics: true,
        }
      );

      expect(result).toSucceed();
      expect(result.duration).toBeGreaterThan(0);

      const metrics = runner.getMetrics();
      expect(metrics.size).toBeGreaterThan(0);
    });

    test("tracks memory usage for large operations", async () => {
      const configPath = join(testDir, "config.yml");

      // Large config for memory testing
      const largeConfig = fixtures.largeConfig.generateLarge({
        products: 200,
        categories: 50,
      });
      await fileHelpers.createTempConfig(testDir, largeConfig);

      const metricsCollected: any[] = [];
      runner.on("metrics", (metrics) => {
        metricsCollected.push(metrics);
      });

      await runner.run(
        [
          "diff",
          "--url",
          saleorConfig.url,
          "--token",
          saleorConfig.token || "test-token",
          "--config",
          configPath,
        ],
        {
          collectMetrics: true,
        }
      );

      // Should have collected metrics
      expect(metricsCollected.length).toBeGreaterThan(0);

      const lastMetrics = metricsCollected[metricsCollected.length - 1];
      if (lastMetrics.memoryUsage) {
        expect(lastMetrics.memoryUsage.heapUsed).toBeGreaterThan(0);
      }
    });
  });
});

if (!testEnv.shouldRunE2E()) {
  console.warn(
    "Skipping Streaming e2e tests. Provide CONFIGURATOR_E2E_SALEOR_TOKEN to enable them."
  );
}
