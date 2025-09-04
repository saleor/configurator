import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertDeploymentSuccess } from "../../utils/assertions.js";
import { CliRunner } from "../../utils/cli-runner.js";
import { getAdminToken, getTestConfig, waitForApi } from "../../utils/test-env.js";
import { cleanupTempDir, createTempDir, readYaml, writeYaml } from "../../utils/test-helpers.js";

// Type definitions for E2E test data structures
interface TestChannel {
  name: string;
  slug: string;
  currencyCode: string;
  defaultCountry: string;
  isActive?: boolean;
}

interface TestCategory {
  name: string;
  slug: string;
  description?: string;
  parent?: string;
}

interface TestIntrospectedData {
  shop: {
    defaultMailSenderName: string;
    defaultMailSenderAddress: string;
    description?: string;
  };
  channels: TestChannel[];
  categories?: TestCategory[];
}

describe("E2E CLI Arguments and Environment Variables Tests", () => {
  let cli: CliRunner;
  let apiUrl: string;
  let token: string;
  let testDir: string;

  beforeAll(async () => {
    console.log("🚀 Starting CLI arguments and environment test setup...");

    testDir = await createTempDir("cli-args-env-test-");

    const config = getTestConfig();
    apiUrl = config.apiUrl;
    await waitForApi(apiUrl);
    token = await getAdminToken(apiUrl, config.adminEmail, config.adminPassword);
    cli = new CliRunner({ verbose: process.env.VERBOSE === "true" });

    console.log("✅ CLI arguments and environment test setup complete");
  }, 60000);

  afterAll(async () => {
    await cleanupTempDir(testDir);
  });

  describe("CLI Argument Handling", () => {
    it("should handle --url and --token arguments correctly", async () => {
      const configPath = path.join(testDir, "args-test-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "CLI Args Store",
          defaultMailSenderAddress: "args@test.com",
          description: "Testing CLI arguments",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      console.log("🔧 Testing explicit --url and --token arguments...");
      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(result);
      expect(result).toContainInOutput("CLI Args Store");

      // Verify with introspect using same arguments
      const introspectResult = await cli.introspect(apiUrl, token, {
        config: path.join(testDir, "args-introspected.yml"),
      });

      expect(introspectResult).toHaveSucceeded();
    }, 120000);

    it("should handle --config argument for custom config file path", async () => {
      const customConfigPath = path.join(testDir, "custom", "my-config.yml");
      const customDir = path.dirname(customConfigPath);

      // Create custom directory
      await cli.bash(`mkdir -p "${customDir}"`);

      const config = {
        shop: {
          defaultMailSenderName: "Custom Config Store",
          defaultMailSenderAddress: "custom@test.com",
        },
        channels: [],
      };

      await writeYaml(customConfigPath, config);

      console.log("📁 Testing custom --config file path...");
      const result = await cli.deploy(apiUrl, token, {
        config: customConfigPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(result);
      expect(result).toContainInOutput("Custom Config Store");
    }, 120000);

    it("should handle --quiet flag to suppress output", async () => {
      const configPath = path.join(testDir, "quiet-test-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Quiet Test Store",
          defaultMailSenderAddress: "quiet@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      console.log("🤫 Testing --quiet flag...");
      const quietResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        quiet: true,
        skipDiff: true,
      });

      assertDeploymentSuccess(quietResult);

      // Compare with verbose output
      const verboseResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(verboseResult);

      // Quiet mode should produce less output
      expect(quietResult.cleanStdout.length).toBeLessThan(verboseResult.cleanStdout.length);
    }, 120000);

    it("should handle --dry-run flag without making changes", async () => {
      const configPath = path.join(testDir, "dry-run-config.yml");

      // Deploy initial state
      const initialConfig = {
        shop: {
          defaultMailSenderName: "Dry Run Initial",
          defaultMailSenderAddress: "dryrun@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, initialConfig);

      const initialDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(initialDeploy);

      // Modify config for dry-run test
      const modifiedConfig = {
        shop: {
          defaultMailSenderName: "Dry Run MODIFIED - Should Not Apply",
          defaultMailSenderAddress: "dryrun@test.com",
        },
        channels: [
          {
            name: "Should Not Be Created",
            slug: "should-not-be-created",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
        ],
      };

      await writeYaml(configPath, modifiedConfig);

      console.log("🏃 Testing --dry-run flag...");
      const dryRunResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        dryRun: true,
      });

      expect(dryRunResult).toHaveSucceeded();
      expect(dryRunResult).toMatchPattern(/dry.*run|preview|would.*be/i);

      // Verify no actual changes were made
      const introspectAfterDryRun = await cli.introspect(apiUrl, token, {
        config: path.join(testDir, "after-dry-run.yml"),
      });

      expect(introspectAfterDryRun).toHaveSucceeded();
      const afterDryRunData = await readYaml(path.join(testDir, "after-dry-run.yml"));

      // Should still have original data, not modified data
      expect(afterDryRunData.shop.defaultMailSenderName).toBe("Dry Run Initial");
      expect(afterDryRunData.channels).toEqual([]); // Should still be empty
    }, 150000);

    it("should handle --skip-diff flag to bypass diff preview", async () => {
      const configPath = path.join(testDir, "skip-diff-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Skip Diff Store",
          defaultMailSenderAddress: "skipdiff@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      console.log("⏭️ Testing --skip-diff flag...");
      const skipDiffResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(skipDiffResult);

      // Should not contain diff-related output
      expect(skipDiffResult.cleanStdout).not.toMatch(/diff|comparison|changes detected/i);
      expect(skipDiffResult.cleanStdout).not.toMatch(/would be applied/i);
    }, 120000);

    it("should handle --include flag for selective operations", async () => {
      const configPath = path.join(testDir, "include-flag-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Include Flag Store",
          defaultMailSenderAddress: "include@test.com",
          description: "Should be included",
        },
        channels: [
          {
            name: "Should Not Be Included",
            slug: "should-not-be-included",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
        ],
      };

      await writeYaml(configPath, config);

      console.log("🎯 Testing --include flag...");
      const includeResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        include: ["shop"],
        skipDiff: true,
      });

      assertDeploymentSuccess(includeResult);
      expect(includeResult).toContainInOutput("Include Flag Store");

      // Verify only shop was modified
      const introspectResult = await cli.introspect(apiUrl, token, {
        config: path.join(testDir, "include-result.yml"),
      });

      expect(introspectResult).toHaveSucceeded();
      const resultData = await readYaml(path.join(testDir, "include-result.yml"));

      expect(resultData.shop.defaultMailSenderName).toBe("Include Flag Store");

      // Channel should not have been created (not included)
      const shouldNotExistChannel = resultData.channels?.find(
        (c: TestChannel) => c.slug === "should-not-be-included"
      );
      expect(shouldNotExistChannel).toBeUndefined();
    }, 120000);

    it("should handle --exclude flag for selective operations", async () => {
      const configPath = path.join(testDir, "exclude-flag-config.yml");

      // First, deploy a baseline with both shop and channels
      const baselineConfig = {
        shop: {
          defaultMailSenderName: "Exclude Baseline Store",
          defaultMailSenderAddress: "exclude@test.com",
        },
        channels: [
          {
            name: "Baseline Channel",
            slug: "baseline-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
        ],
      };

      await writeYaml(configPath, baselineConfig);

      const baselineDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(baselineDeploy);

      // Modify both sections, but exclude channels from deployment
      const modifiedConfig = {
        shop: {
          defaultMailSenderName: "MODIFIED Exclude Store", // Should be applied
          defaultMailSenderAddress: "exclude@test.com",
        },
        channels: [
          {
            name: "MODIFIED Baseline Channel", // Should NOT be applied (excluded)
            slug: "baseline-channel",
            currencyCode: "EUR", // Should NOT change
            defaultCountry: "DE", // Should NOT change
            isActive: false, // Should NOT change
          },
        ],
      };

      await writeYaml(configPath, modifiedConfig);

      console.log("🚫 Testing --exclude flag...");
      const excludeResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        exclude: ["channels"],
        skipDiff: true,
      });

      assertDeploymentSuccess(excludeResult);
      expect(excludeResult).toContainInOutput("MODIFIED Exclude Store");

      // Verify exclude worked correctly
      const introspectResult = await cli.introspect(apiUrl, token, {
        config: path.join(testDir, "exclude-result.yml"),
      });

      expect(introspectResult).toHaveSucceeded();
      const resultData = await readYaml(path.join(testDir, "exclude-result.yml"));

      // Shop should be modified
      expect(resultData.shop.defaultMailSenderName).toBe("MODIFIED Exclude Store");

      // Channel should be unchanged (excluded from modification)
      const baselineChannel = resultData.channels?.find(
        (c: TestChannel) => c.slug === "baseline-channel"
      );
      expect(baselineChannel).toBeDefined();
      expect(baselineChannel!.name).toBe("Baseline Channel"); // Original name
      expect(baselineChannel!.currencyCode).toBe("USD"); // Original currency
      expect(baselineChannel!.isActive).toBe(true); // Original status
    }, 150000);

    it("should handle multiple argument combinations", async () => {
      const configPath = path.join(testDir, "multiple-args-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Multiple Args Store",
          defaultMailSenderAddress: "multipleargs@test.com",
        },
        channels: [],
        categories: [
          {
            name: "Multiple Args Category",
            slug: "multiple-args-category",
            description: "Testing multiple arguments together",
          },
        ],
      };

      await writeYaml(configPath, config);

      console.log("🔧 Testing multiple argument combinations...");

      // Test --quiet + --skip-diff + --include
      const multipleArgsResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        quiet: true,
        skipDiff: true,
        include: ["shop", "categories"],
      });

      assertDeploymentSuccess(multipleArgsResult);

      // Should produce minimal output due to --quiet
      expect(multipleArgsResult.cleanStdout.length).toBeLessThan(200);

      // Should not show diff output due to --skip-diff
      expect(multipleArgsResult.cleanStdout).not.toMatch(/diff|comparison/i);

      // Should have deployed included sections
      expect(multipleArgsResult).toContainInOutput("Multiple Args Store");
    }, 120000);
  });

  describe("Environment Variable Handling", () => {
    it("should read configuration from environment variables", async () => {
      const configPath = path.join(testDir, "env-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Environment Store",
          defaultMailSenderAddress: "env@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      console.log("🌍 Testing environment variable usage...");

      // Deploy using environment variables instead of CLI arguments
      const envResult = await cli.deployWithEnv(undefined, undefined, {
        config: configPath,
        skipDiff: true,
        env: { SALEOR_API_URL: apiUrl, SALEOR_TOKEN: token },
      });

      assertDeploymentSuccess(envResult);
      expect(envResult).toContainInOutput("Environment Store");
    }, 120000);

    it("should prioritize CLI arguments over environment variables", async () => {
      const configPath = path.join(testDir, "priority-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Priority Test Store",
          defaultMailSenderAddress: "priority@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      console.log("⚖️ Testing CLI argument priority over environment variables...");

      // Set environment variables to wrong values
      // But provide correct values via CLI arguments
      const priorityResult = await cli.deployWithEnv(
        apiUrl, // Correct URL via CLI
        token, // Correct token via CLI
        {
          config: configPath,
          skipDiff: true,
          env: {
            SALEOR_API_URL: "http://wrong-url.com/graphql/",
            SALEOR_TOKEN: "wrong-token",
          },
        }
      );

      // Should succeed because CLI arguments take priority
      assertDeploymentSuccess(priorityResult);
      expect(priorityResult).toContainInOutput("Priority Test Store");
    }, 120000);

    it("should handle missing environment variables gracefully", async () => {
      const configPath = path.join(testDir, "missing-env-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Missing Env Store",
          defaultMailSenderAddress: "missingenv@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      console.log("❓ Testing missing environment variables...");

      // Try to deploy without setting environment variables and without CLI args
      const missingEnvResult = await cli.deployWithEnv(
        undefined, // No CLI URL
        undefined, // No CLI token
        {
          config: configPath,
          timeout: 10000,
          env: {}, // No environment variables set
        }
      );

      expect(missingEnvResult).toHaveFailed();
      expect(missingEnvResult).toMatchPattern(/url|token|required|missing/i);

      // Should provide helpful error about missing URL/token
      const errorOutput = missingEnvResult.cleanStderr + missingEnvResult.cleanStdout;
      const mentionsRequiredParams =
        errorOutput.includes("url") ||
        errorOutput.includes("token") ||
        errorOutput.includes("required");

      expect(mentionsRequiredParams).toBe(true);
    }, 60000);

    it("should handle environment variables for config file path", async () => {
      const envConfigPath = path.join(testDir, "env-config-path.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Env Config Path Store",
          defaultMailSenderAddress: "envconfigpath@test.com",
        },
        channels: [],
      };

      await writeYaml(envConfigPath, config);

      console.log("📁 Testing environment variable for config file path...");

      // Use environment variable for config path
      const envConfigResult = await cli.deployWithEnv(
        undefined, // No CLI URL - use env
        undefined, // No CLI token - use env
        {
          skipDiff: true,
          // No config specified in args - should use env var
          env: {
            SALEOR_API_URL: apiUrl,
            SALEOR_TOKEN: token,
            SALEOR_CONFIG: envConfigPath,
          },
        }
      );

      assertDeploymentSuccess(envConfigResult);
      expect(envConfigResult).toContainInOutput("Env Config Path Store");
    }, 120000);
  });

  describe("Input Validation and Security", () => {
    it("should validate URL format", async () => {
      const configPath = path.join(testDir, "url-validation-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "URL Validation Store",
          defaultMailSenderAddress: "urlvalidation@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      console.log("🔗 Testing URL format validation...");

      // Test with invalid URL format
      const invalidUrlResult = await cli.deploy("not-a-valid-url", token, {
        config: configPath,
        timeout: 10000,
        skipDiff: true,
      });

      expect(invalidUrlResult).toHaveFailed();
      expect(invalidUrlResult).toMatchPattern(/url|invalid|format/i);
    }, 60000);

    it("should not expose sensitive tokens in error messages", async () => {
      const configPath = path.join(testDir, "token-security-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Token Security Store",
          defaultMailSenderAddress: "tokensecurity@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      console.log("🔐 Testing token security in error messages...");

      const sensitiveToken = "super-secret-token-12345-should-not-appear";

      // Test with invalid token
      const tokenSecurityResult = await cli.deploy(apiUrl, sensitiveToken, {
        config: configPath,
        timeout: 10000,
        skipDiff: true,
      });

      expect(tokenSecurityResult).toHaveFailed();

      // Should not expose the sensitive token in error output
      expect(tokenSecurityResult.cleanStderr).not.toContain(sensitiveToken);
      expect(tokenSecurityResult.cleanStdout).not.toContain(sensitiveToken);

      // Should still provide helpful error message without exposing token
      expect(tokenSecurityResult).toMatchPattern(/auth|token|permission|unauthorized/i);
    }, 60000);

    it("should handle very long argument values", async () => {
      const configPath = path.join(testDir, "long-args-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Long Args Store",
          defaultMailSenderAddress: "longargs@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      console.log("📏 Testing very long argument values...");

      // Create a very long but valid token
      const longToken = token + "A".repeat(1000); // Very long token

      const longArgResult = await cli.deploy(apiUrl, longToken, {
        config: configPath,
        timeout: 10000,
        skipDiff: true,
      });

      // Should handle long arguments gracefully (fail due to invalid token, not crash)
      expect(longArgResult).toHaveFailed();
      expect(longArgResult.exitCode).toBeLessThan(128); // Not a system crash

      // Should not expose the long token
      expect(longArgResult.cleanStderr).not.toContain("A".repeat(100));
    }, 60000);

    it("should handle special characters in arguments", async () => {
      const configPath = path.join(testDir, "special-chars-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Special Chars Store",
          defaultMailSenderAddress: "specialchars@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      console.log("✨ Testing special characters in arguments...");

      // Test with token containing special characters
      const specialToken = "token-with-special!@#$%^&*()_+-=[]{}|;:,.<>?";

      const specialCharsResult = await cli.deploy(apiUrl, specialToken, {
        config: configPath,
        timeout: 10000,
        skipDiff: true,
      });

      // Should handle special characters gracefully
      expect(specialCharsResult).toHaveFailed(); // Due to invalid token
      expect(specialCharsResult.exitCode).toBeLessThan(128); // Not a crash

      // Should not expose special characters that might break shell
      expect(specialCharsResult.cleanStderr).not.toContain("!@#$%^&*");
    }, 60000);
  });

  describe("Interactive Mode and TTY Detection", () => {
    it("should handle non-TTY environments correctly", async () => {
      const configPath = path.join(testDir, "non-tty-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Non-TTY Store",
          defaultMailSenderAddress: "nontty@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      console.log("💻 Testing non-TTY environment handling...");

      // Simulate non-TTY environment
      const nonTtyResult = await cli.deployNonTty(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(nonTtyResult);

      // Should work in non-TTY environment (CI/CD scenarios)
      expect(nonTtyResult).toContainInOutput("Non-TTY Store");
    }, 120000);

    it("should handle missing interactive requirements", async () => {
      const configPath = path.join(testDir, "interactive-missing-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Interactive Missing Store",
          defaultMailSenderAddress: "interactive@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      console.log("🤖 Testing missing interactive requirements...");

      // Try to run without URL and token in non-interactive mode
      const missingInteractiveResult = await cli.deployNonTty(undefined, undefined, {
        config: configPath,
        timeout: 10000,
      });

      expect(missingInteractiveResult).toHaveFailed();
      expect(missingInteractiveResult).toMatchPattern(/url|token|required|interactive/i);

      // Should provide helpful message about missing parameters
      const errorOutput =
        missingInteractiveResult.cleanStderr + missingInteractiveResult.cleanStdout;
      const providesGuidance =
        errorOutput.includes("url") ||
        errorOutput.includes("token") ||
        errorOutput.includes("required");

      expect(providesGuidance).toBe(true);
    }, 60000);
  });

  describe("Help and Version Commands", () => {
    it("should display help information correctly", async () => {
      console.log("❓ Testing help command...");
      const helpResult = await cli.help();

      expect(helpResult).toHaveSucceeded();
      expect(helpResult).toContainInOutput("Saleor Configurator");
      expect(helpResult).toContainInOutput("deploy");
      expect(helpResult).toContainInOutput("introspect");
      expect(helpResult).toContainInOutput("diff");
      expect(helpResult).toContainInOutput("start");

      // Should show usage examples
      expect(helpResult).toMatchPattern(/usage|examples|options/i);
    }, 30000);

    it("should display version information correctly", async () => {
      console.log("📋 Testing version command...");
      const versionResult = await cli.version();

      expect(versionResult).toHaveSucceeded();

      // Should contain version number (matching package.json)
      expect(versionResult).toContainInOutput("0.11.0");

      // Should be concise output
      expect(versionResult.cleanStdout.split("\n").length).toBeLessThan(5);
    }, 30000);

    it("should display command-specific help", async () => {
      console.log("🔍 Testing command-specific help...");

      const deployHelpResult = await cli.deployHelp();

      expect(deployHelpResult).toHaveSucceeded();
      expect(deployHelpResult).toContainInOutput("deploy");
      expect(deployHelpResult).toContainInOutput("--url");
      expect(deployHelpResult).toContainInOutput("--token");
      expect(deployHelpResult).toContainInOutput("--config");
      expect(deployHelpResult).toContainInOutput("--include");
      expect(deployHelpResult).toContainInOutput("--exclude");

      // Should show examples for deploy command
      expect(deployHelpResult).toMatchPattern(/example|usage/i);
    }, 30000);
  });
});
