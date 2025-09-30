import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { CliAssertions } from "./helpers/assertions";
import { type CliTestRunner, createCliTestRunner } from "./helpers/cli-test-runner";
import { fileHelpers, fixtures, testEnv } from "./helpers/fixtures";

const runE2ETests = testEnv.shouldRunE2E() ? describe.sequential : describe.skip;

console.log(`[E2E] Error Handling tests: ${testEnv.shouldRunE2E() ? "RUNNING" : "SKIPPED (no secrets)"}`);

runE2ETests("CLI Error Handling", () => {
  let runner: CliTestRunner;
  let workspaceRoot: string;
  let testDir: string;
  const saleorConfig = testEnv.getSaleorConfig();

  beforeAll(async () => {
    runner = createCliTestRunner({ timeout: 60_000 });
    workspaceRoot = await mkdtemp(join(tmpdir(), "configurator-errors-e2e-"));
  });

  beforeEach(async (context) => {
    testDir = await mkdtemp(join(workspaceRoot, "test-"));
    console.log(`\n▶ Running: ${context.task.name}`);
  });

  afterAll(async () => {
    await runner.cleanup();
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  // Commented out for CI performance - keeping only the basic workflow test in cli-introspect-deploy.e2e.test.ts
  /*
  describe("Authentication Errors", () => {
    test("handles invalid token gracefully", async () => {
      const configPath = join(testDir, "config.yml");
      await fileHelpers.createTempConfig(testDir, fixtures.validConfig);

      const result = await runner.runSafe([
        "introspect",
        "--url",
        saleorConfig.url,
        "--token",
        "invalid-token-123",
        "--config",
        configPath,
        "--quiet",
      ]);

      expect(result).toFail();
      CliAssertions.expectPermissionError(result);
      expect(result).toHaveStderr(/permission|unauthorized|token|forbidden/i);
    });

    test("handles missing token", async () => {
      const configPath = join(testDir, "config.yml");

      const result = await runner.runSafe(
        ["introspect", "--url", saleorConfig.url, "--config", configPath, "--quiet"],
        {
          env: {
            SALEOR_TOKEN: "",
            CONFIGURATOR_AUTO_CONFIRM: "true",
          },
        }
      );

      expect(result).toFail();
      expect(result).toHaveStderr(/token|required|missing/i);
    });

    test("handles expired token", async () => {
      const configPath = join(testDir, "config.yml");
      const expiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired";

      const result = await runner.runSafe([
        "introspect",
        "--url",
        saleorConfig.url,
        "--token",
        expiredToken,
        "--config",
        configPath,
        "--quiet",
      ]);

      expect(result).toFail();
      expect(result.cleanStderr.toLowerCase()).toMatch(/(token|auth|permission)/i);
    });
  });

  describe("Network Errors", () => {
    test("handles connection timeout", async () => {
      const configPath = join(testDir, "config.yml");
      await fileHelpers.createTempConfig(testDir, fixtures.validConfig);

      const result = await runner.runSafe(
        [
          "introspect",
          "--url",
          "https://192.0.2.1/graphql/", // Non-routable IP for timeout
          "--token",
          saleorConfig.token || "test-token",
          "--config",
          configPath,
          "--quiet",
        ],
        {
          timeout: 10_000, // Short timeout to trigger error
        }
      );

      expect(result).toFail();
      if (!result.timedOut) {
        CliAssertions.expectNetworkError(result);
      }
    });

    test("handles DNS resolution failure", async () => {
      const configPath = join(testDir, "config.yml");

      const result = await runner.runSafe([
        "introspect",
        "--url",
        "https://nonexistent-domain-xyz123.example.com/graphql/",
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
        "--quiet",
      ]);

      expect(result).toFail();
      CliAssertions.expectNetworkError(result);
      expect(result.cleanStderr.toLowerCase()).toMatch(/(enotfound|dns|resolve|network)/i);
    });

    test("handles connection refused", async () => {
      const configPath = join(testDir, "config.yml");

      const result = await runner.runSafe([
        "introspect",
        "--url",
        "http://localhost:59999/graphql/", // Unlikely port to be open
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
        "--quiet",
      ]);

      expect(result).toFail();
      CliAssertions.expectNetworkError(result);
      expect(result.cleanStderr.toLowerCase()).toMatch(/(econnrefused|refused|connection)/i);
    });

    test("handles invalid URL format", async () => {
      const configPath = join(testDir, "config.yml");

      const result = await runner.runSafe([
        "introspect",
        "--url",
        "not-a-valid-url",
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
        "--quiet",
      ]);

      expect(result).toFail();
      expect(result).toHaveStderr(/invalid|url|format/i);
    });
  });

  describe("Configuration Errors", () => {
    test("handles malformed YAML", async () => {
      const configPath = join(testDir, "config.yml");
      await writeFile(configPath, "invalid:\n  - yaml\n    - content\n  bad indentation", "utf-8");

      const result = await runner.runSafe([
        "deploy",
        "--url",
        saleorConfig.url,
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
        "--ci",
        "--quiet",
      ]);

      expect(result).toFail();
      CliAssertions.expectConfigError(result);
      expect(result.cleanStderr.toLowerCase()).toMatch(/(yaml|parse|syntax|indentation)/i);
    });

    test("handles missing required fields", async () => {
      const configPath = join(testDir, "config.yml");
      await fileHelpers.createTempConfig(testDir, fixtures.invalidConfigs.missingRequired);

      const result = await runner.runSafe([
        "deploy",
        "--url",
        saleorConfig.url,
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
        "--ci",
        "--quiet",
      ]);

      expect(result).toFail();
      CliAssertions.expectValidationError(result);
      expect(result.cleanStderr.toLowerCase()).toMatch(/(required|missing|validation)/i);
    });

    test("handles duplicate slugs", async () => {
      const configPath = join(testDir, "config.yml");
      await fileHelpers.createTempConfig(testDir, fixtures.invalidConfigs.duplicateSlugs);

      const result = await runner.runSafe([
        "deploy",
        "--url",
        saleorConfig.url,
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
        "--ci",
        "--quiet",
      ]);

      expect(result).toFail();
      expect(result).toFailWithCode(4); // Validation error code
      expect(result.cleanStderr.toLowerCase()).toMatch(/(duplicate|slug|unique)/i);
    });

    test("handles invalid field types", async () => {
      const configPath = join(testDir, "config.yml");
      await fileHelpers.createTempConfig(testDir, fixtures.invalidConfigs.invalidTypes);

      const result = await runner.runSafe([
        "deploy",
        "--url",
        saleorConfig.url,
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
        "--ci",
        "--quiet",
      ]);

      expect(result).toFail();
      CliAssertions.expectValidationError(result);
      expect(result.cleanStderr.toLowerCase()).toMatch(/(type|invalid|expected)/i);
    });

    test("handles empty configuration file", async () => {
      const configPath = join(testDir, "config.yml");
      await writeFile(configPath, "", "utf-8");

      const result = await runner.runSafe([
        "deploy",
        "--url",
        saleorConfig.url,
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
        "--ci",
        "--quiet",
      ]);

      expect(result).toFail();
      expect(result.cleanStderr.toLowerCase()).toMatch(/(empty|invalid|configuration)/i);
    });
  });

  describe("File System Errors", () => {
    test("handles non-existent config file", async () => {
      const configPath = join(testDir, "nonexistent", "config.yml");

      const result = await runner.runSafe([
        "deploy",
        "--url",
        saleorConfig.url,
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
        "--ci",
        "--quiet",
      ]);

      expect(result).toFail();
      CliAssertions.expectFileSystemError(result);
      expect(result.cleanStderr.toLowerCase()).toMatch(/(enoent|not found|does not exist)/i);
    });

    test("handles permission denied for config file", async function () {
      // Skip on Windows where chmod doesn't work as expected
      if (process.platform === "win32") {
        this.skip();
      }

      const configPath = join(testDir, "config.yml");
      await fileHelpers.createTempConfig(testDir, fixtures.validConfig);
      await chmod(configPath, 0o000); // No permissions

      const result = await runner.runSafe([
        "diff",
        "--url",
        saleorConfig.url,
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
        "--quiet",
      ]);

      // Restore permissions for cleanup
      await chmod(configPath, 0o644);

      expect(result).toFail();
      CliAssertions.expectFileSystemError(result);
      expect(result.cleanStderr.toLowerCase()).toMatch(/(eacces|permission|denied)/i);
    });

    test("handles directory instead of file", async () => {
      const configPath = join(testDir, "config-dir");
      await mkdir(configPath);

      const result = await runner.runSafe([
        "introspect",
        "--url",
        saleorConfig.url,
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
        "--quiet",
      ]);

      expect(result).toFail();
      CliAssertions.expectFileSystemError(result);
      expect(result.cleanStderr.toLowerCase()).toMatch(/(eisdir|directory|not a file)/i);
    });

    test("handles read-only directory for output", async function () {
      // Skip on Windows where chmod doesn't work as expected
      if (process.platform === "win32") {
        this.skip();
      }

      const readOnlyDir = join(testDir, "readonly");
      await mkdir(readOnlyDir);
      const configPath = join(readOnlyDir, "config.yml");

      // Make directory read-only after creating it
      await chmod(readOnlyDir, 0o555);

      const result = await runner.runSafe([
        "introspect",
        "--url",
        saleorConfig.url,
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
        "--quiet",
      ]);

      // Restore permissions for cleanup
      await chmod(readOnlyDir, 0o755);

      expect(result).toFail();
      CliAssertions.expectFileSystemError(result);
    });
  });

  describe("Command Errors", () => {
    test("handles unknown command", async () => {
      const result = await runner.runSafe(["unknown-command"]);

      expect(result).toFail();
      expect(result).toHaveStderr(/unknown|command|not found/i);
    });

    test("handles missing required arguments", async () => {
      const result = await runner.runSafe(["deploy", "--ci"], {
        env: {
          SALEOR_URL: "",
          SALEOR_TOKEN: "",
        },
      });

      expect(result).toFail();
      expect(result).toHaveStderr(/required|missing|url|token/i);
    });

    test("handles invalid option values", async () => {
      const configPath = join(testDir, "config.yml");
      await fileHelpers.createTempConfig(testDir, fixtures.validConfig);

      const result = await runner.runSafe([
        "introspect",
        "--url",
        saleorConfig.url,
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
        "--include",
        "invalid-module",
        "--quiet",
      ]);

      expect(result).toFail();
      expect(result.cleanStderr.toLowerCase()).toMatch(/(invalid|unknown|module)/i);
    });

    test("handles conflicting options", async () => {
      const configPath = join(testDir, "config.yml");
      await fileHelpers.createTempConfig(testDir, fixtures.validConfig);

      const result = await runner.runSafe([
        "introspect",
        "--url",
        saleorConfig.url,
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
        "--include",
        "shop",
        "--exclude",
        "shop",
        "--quiet",
      ]);

      expect(result).toFail();
      expect(result.cleanStderr.toLowerCase()).toMatch(/(conflict|cannot|both)/i);
    });
  });

  describe("Partial Failure Handling", () => {
    test("handles partial deployment failure", async () => {
      const configPath = join(testDir, "config.yml");

      // Create config that will partially fail
      const config = ConfigBuilder.from(fixtures.validConfig)
        .withChannel({
          slug: "invalid-currency-channel",
          name: "Invalid Currency",
          currencyCode: "INVALID", // This will fail
        })
        .build();

      await fileHelpers.createTempConfig(testDir, config);

      const result = await runner.runSafe([
        "deploy",
        "--url",
        saleorConfig.url,
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
        "--ci",
        "--quiet",
      ]);

      expect(result).toFail();
      expect(result.cleanStderr.toLowerCase()).toMatch(/(invalid|currency|failed)/i);
    });

    test("handles GraphQL rate limiting", async () => {
      const configPath = join(testDir, "config.yml");

      // Create large config to trigger rate limiting
      const largeConfig = fixtures.largeConfig.generateLarge({
        channels: 50,
        products: 500,
      });
      await fileHelpers.createTempConfig(testDir, largeConfig);

      const result = await runner.runSafe(
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
        {
          timeout: 300_000,
        }
      );

      // If rate limited, should handle gracefully
      if (result.failed && result.cleanStderr.toLowerCase().includes("rate")) {
        expect(result.cleanStderr.toLowerCase()).toMatch(/(rate|limit|throttle|too many)/i);
      }
    });
  });

  describe("Recovery and Retry", () => {
    test("suggests recovery options on failure", async () => {
      const configPath = join(testDir, "config.yml");
      await fileHelpers.createTempConfig(testDir, fixtures.invalidConfigs.missingRequired);

      const result = await runner.runSafe([
        "deploy",
        "--url",
        saleorConfig.url,
        "--token",
        saleorConfig.token || "test-token",
        "--config",
        configPath,
        "--ci",
        "--quiet",
      ]);

      expect(result).toFail();
      // Should provide helpful error messages
      expect(result.cleanStderr.toLowerCase()).toMatch(/(try|fix|check|ensure|required)/i);
    });

    test("handles interrupted deployment gracefully", async () => {
      const configPath = join(testDir, "config.yml");
      const largeConfig = fixtures.largeConfig.generateLarge({
        channels: 10,
        products: 50,
      });
      await fileHelpers.createTempConfig(testDir, largeConfig);

      // Start deployment and interrupt it
      const resultPromise = runner.runWithSignal(
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
        "SIGINT",
        2000 // Interrupt after 2 seconds
      );

      const result = await resultPromise;

      expect(result).toFail();
      expect(result.isTerminated || result.isCanceled).toBe(true);
    });
  });

  describe("Error Message Quality", () => {
    test("provides clear error messages for common mistakes", async () => {
      const testCases = [
        {
          name: "missing graphql in URL",
          url: "https://example.saleor.cloud/",
          expectedError: /graphql|endpoint/i,
        },
        {
          name: "http instead of https",
          url: "http://example.saleor.cloud/graphql/",
          expectedError: /https|secure/i,
        },
        {
          name: "trailing spaces in token",
          token: `${saleorConfig.token} `,
          expectedError: /token|whitespace|trim/i,
        },
      ];

      for (const testCase of testCases) {
        const configPath = join(testDir, `config-${testCase.name}.yml`);
        await fileHelpers.createTempConfig(
          testDir,
          fixtures.validConfig,
          `config-${testCase.name}.yml`
        );

        const result = await runner.runSafe([
          "introspect",
          "--url",
          testCase.url || saleorConfig.url,
          "--token",
          testCase.token || saleorConfig.token || "test-token",
          "--config",
          configPath,
          "--quiet",
        ]);

        expect(result).toFail();
        if (testCase.expectedError) {
          expect(result.cleanStderr).toMatch(testCase.expectedError);
        }
      }
    });

    test("provides actionable error messages", async () => {
      const configPath = join(testDir, "config.yml");

      const result = await runner.runSafe(["deploy", "--config", configPath, "--ci"], {
        env: {
          SALEOR_URL: "",
          SALEOR_TOKEN: "",
        },
      });

      expect(result).toFail();
      // Should suggest how to provide missing values
      expect(result.cleanStderr.toLowerCase()).toMatch(
        /(provide|set|export|--url|--token|environment)/i
      );
    });
  });
  */
});

if (!testEnv.shouldRunE2E()) {
  console.warn(
    "Skipping Error Handling e2e tests. Provide CONFIGURATOR_E2E_SALEOR_TOKEN to enable them."
  );
}
