import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCliTestRunner, type CliTestRunner } from "./helpers/cli-test-runner";
import { fixtures, testEnv, generators, fileHelpers } from "./helpers/fixtures";
import { CliAssertions } from "./helpers/assertions";

const runE2ETests = testEnv.shouldRunE2E() ? describe.sequential : describe.skip;

runE2ETests("CLI Start Command (Interactive Mode)", () => {
  let runner: CliTestRunner;
  let workspaceRoot: string;
  const saleorConfig = testEnv.getSaleorConfig();

  beforeAll(async () => {
    runner = createCliTestRunner({ timeout: 120_000 });
    workspaceRoot = await mkdtemp(join(tmpdir(), "configurator-start-e2e-"));
  });

  afterAll(async () => {
    await runner.cleanup();
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  test("start command shows welcome message for first-time users", async () => {
    const configPath = join(workspaceRoot, "first-time", "config.yml");

    const result = await runner.runInteractive(
      ["start", "--config", configPath],
      [
        { waitFor: "Welcome to Saleor Configurator", respond: "\x1B[B" }, // Arrow down
        { waitFor: "What would you like to do?", respond: "\x1B[B\r" }, // Select "Exit"
      ],
      {
        env: {
          CONFIGURATOR_AUTO_CONFIRM: "false",
        },
      }
    );

    expect(result).toSucceed();
    expect(result).toHaveStdout("Welcome to Saleor Configurator");
    expect(result).toHaveStdout("streamline your Saleor instance management");
  });

  test("start command guides through initial setup", async () => {
    const configPath = join(workspaceRoot, "initial-setup", "config.yml");
    const testId = generators.testId();

    const result = await runner.runInteractive(
      ["start", "--config", configPath],
      [
        { waitFor: "Welcome", respond: "\r" }, // Continue
        { waitFor: "What would you like to do?", respond: "\r" }, // Select first option (Introspect)
        { waitFor: "Enter your Saleor GraphQL URL", respond: saleorConfig.url + "\r" },
        { waitFor: "Enter your Saleor API token", respond: saleorConfig.token + "\r" },
        { waitFor: /confirm|continue/i, respond: "y\r" },
      ],
      {
        timeout: 180_000,
        env: {
          CONFIGURATOR_AUTO_CONFIRM: "false",
        },
      }
    );

    expect(result.exitCode).toBe(0);
    expect(result).toHaveStdout("successfully");

    // Verify config file was created
    const configExists = await fileHelpers.exists(configPath);
    expect(configExists).toBe(true);
  });

  test("start command for returning users shows different options", async () => {
    // First create a config file
    const configPath = join(workspaceRoot, "returning-user", "config.yml");
    await fileHelpers.createTempConfig(
      join(workspaceRoot, "returning-user"),
      fixtures.validConfig
    );

    const result = await runner.runInteractive(
      ["start", "--config", configPath],
      [
        { waitFor: "Welcome back", respond: "\r" }, // Continue
        { waitFor: "What would you like to do?", respond: "\x1B[B\x1B[B\r" }, // Select "Exit"
      ],
      {
        env: {
          CONFIGURATOR_AUTO_CONFIRM: "false",
        },
      }
    );

    expect(result).toSucceed();
    expect(result).toHaveStdout("Welcome back");
    expect(result).toHaveStdout("Introspect");
    expect(result).toHaveStdout("Deploy");
    expect(result).toHaveStdout("Diff");
  });

  test("start command handles introspect flow", async () => {
    const configPath = join(workspaceRoot, "start-introspect", "config.yml");

    const result = await runner.runInteractive(
      ["start", "--config", configPath],
      [
        { waitFor: "Welcome", respond: "\r" },
        { waitFor: "What would you like to do?", respond: "\r" }, // Select "Introspect"
        { waitFor: "Saleor GraphQL URL", respond: saleorConfig.url + "\r" },
        { waitFor: "API token", respond: saleorConfig.token + "\r" },
        { waitFor: /confirm|continue/i, respond: "y\r" },
      ],
      {
        timeout: 180_000,
      }
    );

    expect(result.exitCode).toBe(0);
    expect(result.cleanStdout).toMatch(/introspect|fetching|success/i);

    // Verify configuration was created
    const config = await fileHelpers.readConfig(configPath);
    expect(config).toHaveProperty("shop");
    expect(config).toHaveProperty("channels");
  });

  test("start command handles deploy flow", async () => {
    // Create initial config
    const configPath = join(workspaceRoot, "start-deploy", "config.yml");
    const testId = generators.testId();
    const modifiedConfig = fixtures.mutations.updateShopEmail(
      fixtures.validConfig,
      generators.email()
    );
    await fileHelpers.createTempConfig(
      join(workspaceRoot, "start-deploy"),
      modifiedConfig
    );

    const result = await runner.runInteractive(
      ["start", "--config", configPath],
      [
        { waitFor: "Welcome back", respond: "\r" },
        { waitFor: "What would you like to do?", respond: "\x1B[B\r" }, // Select "Deploy"
        { waitFor: "Saleor GraphQL URL", respond: saleorConfig.url + "\r" },
        { waitFor: "API token", respond: saleorConfig.token + "\r" },
        { waitFor: /confirm|continue|proceed/i, respond: "y\r" },
      ],
      {
        timeout: 240_000,
      }
    );

    if (!result.cleanStdout.includes("No differences found")) {
      expect(result.exitCode).toBe(0);
      expect(result.cleanStdout).toMatch(/deploy|applying|success/i);
    }
  });

  test("start command handles diff flow", async () => {
    // Create config with changes
    const configPath = join(workspaceRoot, "start-diff", "config.yml");
    const modifiedConfig = fixtures.mutations.updateShopEmail(
      fixtures.validConfig,
      generators.email()
    );
    await fileHelpers.createTempConfig(
      join(workspaceRoot, "start-diff"),
      modifiedConfig
    );

    const result = await runner.runInteractive(
      ["start", "--config", configPath],
      [
        { waitFor: "Welcome back", respond: "\r" },
        { waitFor: "What would you like to do?", respond: "\x1B[B\x1B[B\r" }, // Select "Diff"
        { waitFor: "Saleor GraphQL URL", respond: saleorConfig.url + "\r" },
        { waitFor: "API token", respond: saleorConfig.token + "\r" },
      ],
      {
        timeout: 120_000,
      }
    );

    expect(result.exitCode).toBe(0);
    expect(result.cleanStdout).toMatch(/diff|comparing|difference/i);
  });

  test("start command handles invalid URL input", async () => {
    const configPath = join(workspaceRoot, "invalid-url", "config.yml");

    const result = await runner.runInteractive(
      ["start", "--config", configPath],
      [
        { waitFor: "Welcome", respond: "\r" },
        { waitFor: "What would you like to do?", respond: "\r" },
        { waitFor: "Saleor GraphQL URL", respond: "not-a-url\r" },
        { waitFor: "valid URL", respond: "https://invalid.example.com/graphql/\r" },
        { waitFor: "API token", respond: "invalid-token\r" },
      ],
      {
        timeout: 60_000,
      }
    );

    // Should handle invalid URL gracefully
    expect(result.cleanStderr.toLowerCase()).toMatch(/invalid|url|format/i);
  });

  test("start command handles cancellation gracefully", async () => {
    const configPath = join(workspaceRoot, "cancel-flow", "config.yml");

    const result = await runner.runInteractive(
      ["start", "--config", configPath],
      [
        { waitFor: "Welcome", respond: "\r" },
        { waitFor: "What would you like to do?", respond: "\x03" }, // Ctrl+C
      ],
      {
        timeout: 30_000,
      }
    );

    // Should exit cleanly on cancellation
    expect(result.exitCode).not.toBe(0);
  });

  test("start command with --help shows usage information", async () => {
    const result = await runner.run(["start", "--help"]);

    expect(result).toSucceed();
    expect(result).toHaveStdout("Interactive setup wizard");
    expect(result).toHaveStdout("Usage:");
    expect(result).toHaveStdout("Options:");
  });

  test("start command respects environment variables", async () => {
    const configPath = join(workspaceRoot, "env-vars", "config.yml");

    const result = await runner.runInteractive(
      ["start", "--config", configPath],
      [
        { waitFor: "Welcome", respond: "\r" },
        { waitFor: "What would you like to do?", respond: "\x1B[B\x1B[B\r" }, // Exit
      ],
      {
        env: {
          SALEOR_URL: saleorConfig.url,
          SALEOR_TOKEN: saleorConfig.token,
          CONFIGURATOR_AUTO_CONFIRM: "false",
        },
      }
    );

    expect(result).toSucceed();
  });

  test("start command handles existing backup files", async () => {
    const baseDir = join(workspaceRoot, "with-backups");
    const configPath = join(baseDir, "config.yml");

    // Create initial config
    await fileHelpers.createTempConfig(baseDir, fixtures.validConfig);

    // Create backup file
    await fileHelpers.createTempConfig(
      baseDir,
      fixtures.validConfig,
      "config.backup.001.yml"
    );

    const result = await runner.runInteractive(
      ["start", "--config", configPath],
      [
        { waitFor: "Welcome back", respond: "\r" },
        { waitFor: "What would you like to do?", respond: "\x1B[B\x1B[B\r" }, // Exit
      ]
    );

    expect(result).toSucceed();
    expect(result).toHaveStdout("Welcome back");
  });

  test("start command validates configuration before operations", async () => {
    const configPath = join(workspaceRoot, "invalid-config", "config.yml");

    // Create invalid config
    await fileHelpers.createTempConfig(
      join(workspaceRoot, "invalid-config"),
      fixtures.invalidConfigs.missingRequired
    );

    const result = await runner.runInteractive(
      ["start", "--config", configPath],
      [
        { waitFor: "Welcome back", respond: "\r" },
        { waitFor: "What would you like to do?", respond: "\x1B[B\r" }, // Try deploy
        { waitFor: "Saleor GraphQL URL", respond: saleorConfig.url + "\r" },
        { waitFor: "API token", respond: saleorConfig.token + "\r" },
      ],
      {
        timeout: 60_000,
      }
    );

    // Should detect invalid configuration
    expect(result.exitCode).not.toBe(0);
    expect(result.cleanStderr.toLowerCase()).toMatch(/validation|invalid|required/i);
  });

  test("start command handles network errors gracefully", async () => {
    const configPath = join(workspaceRoot, "network-error", "config.yml");

    const result = await runner.runInteractive(
      ["start", "--config", configPath],
      [
        { waitFor: "Welcome", respond: "\r" },
        { waitFor: "What would you like to do?", respond: "\r" },
        { waitFor: "Saleor GraphQL URL", respond: "https://nonexistent.example.com/graphql/\r" },
        { waitFor: "API token", respond: "test-token\r" },
      ],
      {
        timeout: 60_000,
      }
    );

    // Should handle network errors gracefully
    expect(result.exitCode).not.toBe(0);
    expect(result.cleanStderr.toLowerCase()).toMatch(/network|connection|failed|error/i);
  });
});

if (!testEnv.shouldRunE2E()) {
  console.warn(
    "Skipping Start Command e2e tests. Provide CONFIGURATOR_E2E_SALEOR_TOKEN to enable them."
  );
}