import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertDeploymentSuccess } from "../../utils/assertions.js";
import { CliRunner } from "../../utils/cli-runner.js";
import { getAdminToken, getTestConfig, waitForApi } from "../../utils/test-env.js";
import { cleanupTempDir, createTempDir, readYaml, writeYaml } from "../../utils/test-helpers.js";
import type { Channel } from "../../../src/modules/channel/repository.js";
import type { Category } from "../../../src/modules/category/repository.js";

describe("E2E Error Recovery and Partial Failure Tests", () => {
  let cli: CliRunner;
  let apiUrl: string;
  let token: string;
  let testDir: string;

  beforeAll(async () => {
    console.log("🚀 Starting error recovery test setup...");

    testDir = await createTempDir("error-recovery-test-");

    const config = getTestConfig();
    apiUrl = config.apiUrl;
    await waitForApi(apiUrl);
    token = await getAdminToken(apiUrl, config.adminEmail, config.adminPassword);
    cli = new CliRunner({ verbose: process.env.VERBOSE === "true" });

    console.log("✅ Error recovery test setup complete");
  }, 60000);

  afterAll(async () => {
    await cleanupTempDir(testDir);
  });

  describe("Partial Failure Recovery", () => {
    it("should handle deployment failures and allow safe retry", async () => {
      const configPath = path.join(testDir, "partial-failure-config.yml");

      // Create config with some valid and some potentially problematic data
      const mixedConfig = {
        shop: {
          defaultMailSenderName: "Partial Failure Store",
          defaultMailSenderAddress: "partial@test.com",
          description: "Store for testing partial failures",
        },
        channels: [
          {
            name: "Valid Channel",
            slug: "valid-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
          {
            name: "Another Valid Channel",
            slug: "another-valid-channel",
            currencyCode: "EUR",
            defaultCountry: "DE",
            isActive: true,
          },
        ],
        categories: [
          {
            name: "Valid Category",
            slug: "valid-category",
            description: "This should succeed",
          },
          {
            name: "Another Valid Category",
            slug: "another-valid-category",
            description: "This should also succeed",
          },
          {
            name: "Problematic Category",
            slug: "problematic-category",
            description: "This might cause issues but we'll handle it",
          },
        ],
      };

      await writeYaml(configPath, mixedConfig);

      // Deploy the configuration
      console.log("📤 Deploying configuration that may have partial failures...");
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      // Even if some entities fail, successful ones should be created
      if (deployResult.exitCode === 0) {
        // Full success - verify all entities exist
        assertDeploymentSuccess(deployResult);

        const introspectPath = path.join(testDir, "successful-deploy.yml");
        const introspectResult = await cli.introspect(apiUrl, token, {
          config: introspectPath,
        });

        expect(introspectResult).toHaveSucceeded();
        const introspectedConfig = await readYaml(introspectPath);

        expect(introspectedConfig.shop.defaultMailSenderName).toBe("Partial Failure Store");
        expect(introspectedConfig.channels.length).toBeGreaterThanOrEqual(2);
        expect(introspectedConfig.categories.length).toBeGreaterThanOrEqual(2);
      } else {
        // Partial failure occurred - verify system is still in consistent state
        console.log("⚠️ Partial failure detected, checking system consistency...");

        // System should still be responsive
        const introspectPath = path.join(testDir, "after-partial-failure.yml");
        const introspectResult = await cli.introspect(apiUrl, token, {
          config: introspectPath,
        });

        expect(introspectResult).toHaveSucceeded(); // Introspect should still work

        // Some entities may have been created successfully
        const partialState = await readYaml(introspectPath);

        // Shop should likely succeed (it's usually processed first)
        if (partialState.shop) {
          expect(partialState.shop.defaultMailSenderName).toMatch(/Partial Failure Store/);
        }

        // Retry deployment should work
        console.log("🔄 Retrying deployment after partial failure...");
        const retryResult = await cli.deploy(apiUrl, token, {
          config: configPath,
          skipDiff: true,
        });

        // Retry should either succeed or fail gracefully
        expect(retryResult.exitCode).toBeLessThan(128); // Not a system crash

        if (retryResult.exitCode === 0) {
          console.log("✅ Retry succeeded - system recovered");
          assertDeploymentSuccess(retryResult);
        } else {
          console.log("⚠️ Retry also failed, but system remains stable");

          // Even after retry failure, introspection should still work
          const retryIntrospectResult = await cli.introspect(apiUrl, token, {
            config: path.join(testDir, "after-retry.yml"),
          });

          expect(retryIntrospectResult).toHaveSucceeded();
        }
      }
    }, 240000);

    it("should maintain data integrity after deployment errors", async () => {
      const configPath = path.join(testDir, "integrity-test-config.yml");

      // Start with a known good state
      const baselineConfig = {
        shop: {
          defaultMailSenderName: "Integrity Test Store",
          defaultMailSenderAddress: "integrity@test.com",
          description: "Known good baseline",
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
        categories: [
          {
            name: "Baseline Category",
            slug: "baseline-category",
            description: "Known good category",
          },
        ],
      };

      await writeYaml(configPath, baselineConfig);

      // Deploy baseline successfully
      console.log("📤 Deploying known good baseline...");
      const baselineDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(baselineDeploy);

      // Capture baseline state
      const baselineIntrospectPath = path.join(testDir, "baseline-state.yml");
      const baselineIntrospect = await cli.introspect(apiUrl, token, {
        config: baselineIntrospectPath,
      });

      expect(baselineIntrospect).toHaveSucceeded();
      const _baselineState = await readYaml(baselineIntrospectPath);

      // Create problematic config that might cause errors
      const problematicConfig = {
        shop: {
          defaultMailSenderName: "Problematic Store Update",
          defaultMailSenderAddress: "integrity@test.com",
          description: "This update might fail but shouldn't corrupt existing data",
        },
        channels: [
          {
            name: "Baseline Channel", // Keep existing
            slug: "baseline-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
          {
            name: "Problematic Channel",
            slug: "problematic-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
        ],
        categories: [
          {
            name: "Baseline Category", // Keep existing
            slug: "baseline-category",
            description: "Known good category",
          },
          {
            name: "Problematic Category",
            slug: "problematic-category",
            description: "This might cause issues",
          },
        ],
      };

      await writeYaml(configPath, problematicConfig);

      // Deploy problematic config
      console.log("⚠️ Deploying potentially problematic config...");
      const _problematicDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
        timeout: 60000, // Shorter timeout to catch hanging issues
      });

      // Check system integrity regardless of success/failure
      console.log("🔍 Checking system integrity after problematic deployment...");
      const integrityIntrospectPath = path.join(testDir, "integrity-check.yml");
      const integrityIntrospect = await cli.introspect(apiUrl, token, {
        config: integrityIntrospectPath,
      });

      expect(integrityIntrospect).toHaveSucceeded(); // Introspection should always work
      const integrityState = await readYaml(integrityIntrospectPath);

      // Baseline entities should still exist and be uncorrupted
      expect(integrityState.shop).toBeDefined();
      expect(integrityState.channels).toBeDefined();
      expect(integrityState.categories).toBeDefined();

      const baselineChannel = integrityState.channels?.find(
        (c: Channel) => c.slug === "baseline-channel"
      );
      expect(baselineChannel).toBeDefined();
      expect(baselineChannel.name).toBe("Baseline Channel");
      expect(baselineChannel.currencyCode).toBe("USD");

      const baselineCategory = integrityState.categories?.find(
        (c: Category) => c.slug === "baseline-category"
      );
      expect(baselineCategory).toBeDefined();
      expect(baselineCategory.name).toBe("Baseline Category");

      // System should still be responsive to new operations
      console.log("✅ Verifying system responsiveness...");
      const diffResult = await cli.diff(apiUrl, token, {
        config: configPath,
      });

      expect(diffResult.exitCode).toBeLessThan(128); // Should not crash

      // Should be able to introspect again
      const finalIntrospectResult = await cli.introspect(apiUrl, token, {
        config: path.join(testDir, "final-integrity-check.yml"),
      });

      expect(finalIntrospectResult).toHaveSucceeded();
    }, 60000);
  });

  describe("Network and Connection Recovery", () => {
    it("should handle network timeouts gracefully", async () => {
      const configPath = path.join(testDir, "timeout-test-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Timeout Test Store",
          defaultMailSenderAddress: "timeout@test.com",
        },
        channels: Array.from({ length: 10 }, (_, i) => ({
          name: `Channel ${i + 1}`,
          slug: `channel-${i + 1}`,
          currencyCode: "USD",
          defaultCountry: "US",
          isActive: true,
        })),
        categories: Array.from({ length: 15 }, (_, i) => ({
          name: `Category ${i + 1}`,
          slug: `category-${i + 1}`,
          description: `Description for category ${i + 1}`,
        })),
      };

      await writeYaml(configPath, config);

      // Deploy with very short timeout to force timeout scenario
      console.log("⏰ Testing timeout handling...");
      const timeoutResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 5000, // Very short timeout
        skipDiff: true,
      });

      // Should handle timeout gracefully (not crash)
      expect(timeoutResult.exitCode).toBeGreaterThan(0); // Should fail
      expect(timeoutResult.exitCode).toBeLessThan(128); // But not crash

      // Should provide meaningful error message
      if (timeoutResult.cleanStderr) {
        expect(timeoutResult).toMatchPattern(/timeout|time.*out/i);
      }

      // System should still be responsive after timeout
      console.log("🔍 Checking system responsiveness after timeout...");
      const introspectAfterTimeoutResult = await cli.introspect(apiUrl, token, {
        config: path.join(testDir, "after-timeout.yml"),
      });

      expect(introspectAfterTimeoutResult).toHaveSucceeded(); // System should still work

      // Should be able to retry with longer timeout
      console.log("🔄 Retrying with longer timeout...");
      const retryResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 120000, // Much longer timeout
        skipDiff: true,
      });

      // Should either succeed or fail gracefully
      expect(retryResult.exitCode).toBeLessThan(128);

      if (retryResult.exitCode === 0) {
        console.log("✅ Retry with longer timeout succeeded");
        assertDeploymentSuccess(retryResult);
      }
    }, 60000);

    it("should recover from connection interruptions", async () => {
      const configPath = path.join(testDir, "connection-test-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Connection Test Store",
          defaultMailSenderAddress: "connection@test.com",
          description: "Testing connection recovery",
        },
        channels: [
          {
            name: "Connection Channel",
            slug: "connection-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
        ],
      };

      await writeYaml(configPath, config);

      // Test with invalid URL to simulate connection issue
      console.log("🔌 Testing connection error handling...");
      const connectionErrorResult = await cli.deploy(
        "http://invalid-host-that-does-not-exist.com/graphql/",
        token,
        {
          config: configPath,
          timeout: 10000,
          skipDiff: true,
        }
      );

      expect(connectionErrorResult).toHaveFailed();
      expect(connectionErrorResult).toMatchPattern(/connection|network|host|resolve/i);

      // Should provide helpful error message
      expect(connectionErrorResult.cleanStderr.length).toBeGreaterThan(0);

      // Should be able to recover with correct URL
      console.log("🔄 Recovering with correct connection...");
      const recoveryResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(recoveryResult);

      // Verify data was deployed correctly after recovery
      const verifyResult = await cli.introspect(apiUrl, token, {
        config: path.join(testDir, "connection-recovery-verify.yml"),
      });

      expect(verifyResult).toHaveSucceeded();
      const verifyState = await readYaml(path.join(testDir, "connection-recovery-verify.yml"));

      expect(verifyState.shop.defaultMailSenderName).toBe("Connection Test Store");
      expect(verifyState.channels[0].name).toBe("Connection Channel");
    }, 120000);
  });

  describe("Authentication and Permission Recovery", () => {
    it("should handle authentication errors gracefully", async () => {
      const configPath = path.join(testDir, "auth-error-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Auth Error Store",
          defaultMailSenderAddress: "auth@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      // Test with invalid token
      console.log("🔐 Testing authentication error handling...");
      const authErrorResult = await cli.deploy(apiUrl, "invalid-token-12345", {
        config: configPath,
        timeout: 30000,
        skipDiff: true,
      });

      expect(authErrorResult).toHaveFailed();
      expect(authErrorResult).toMatchPattern(/auth|token|permission|unauthorized/i);

      // Should not expose the invalid token in error messages (security)
      expect(authErrorResult.cleanStderr).not.toMatch(/invalid-token-12345/);

      // Should provide helpful guidance
      const errorOutput = authErrorResult.cleanStderr + authErrorResult.cleanStdout;
      expect(errorOutput).toMatch(/token|auth|permission/i);

      // Should be able to recover with valid token
      console.log("🔄 Recovering with valid authentication...");
      const authRecoveryResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(authRecoveryResult);

      // Verify system works normally after auth recovery
      const diffAfterAuthRecoveryResult = await cli.diff(apiUrl, token, {
        config: configPath,
      });

      expect(diffAfterAuthRecoveryResult).toHaveSucceeded();
      expect(diffAfterAuthRecoveryResult).toContainInOutput("No differences found");
    }, 120000);

    it("should handle permission-related errors appropriately", async () => {
      const configPath = path.join(testDir, "permission-error-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Permission Error Store",
          defaultMailSenderAddress: "permission@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      // Test with token that might have limited permissions
      // (Using obviously fake token to simulate permission denied)
      console.log("🚫 Testing permission error handling...");
      const permissionErrorResult = await cli.deploy(apiUrl, "limited-permission-token", {
        config: configPath,
        timeout: 30000,
        skipDiff: true,
      });

      expect(permissionErrorResult).toHaveFailed();
      expect(permissionErrorResult).toMatchPattern(/auth|permission|access|denied|forbidden/i);

      // Should provide helpful guidance about permissions
      const errorOutput = permissionErrorResult.cleanStderr + permissionErrorResult.cleanStdout;
      const hasPermissionGuidance =
        errorOutput.includes("permission") ||
        errorOutput.includes("access") ||
        errorOutput.includes("token") ||
        errorOutput.includes("auth");

      expect(hasPermissionGuidance).toBe(true);

      // Should be able to work with proper permissions
      console.log("🔄 Using token with proper permissions...");
      const properPermissionResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(properPermissionResult);
    }, 120000);
  });

  describe("Configuration Error Recovery", () => {
    it("should handle malformed configuration gracefully", async () => {
      const configPath = path.join(testDir, "malformed-config.yml");

      // Create malformed YAML
      const malformedYaml = `
shop:
  defaultMailSenderName: "Malformed Store"
  defaultMailSenderAddress: "malformed@test.com"
channels:
  - name: "Channel 1"
    slug: "channel-1" 
    currencyCode: "USD"
    defaultCountry: "US"
    isActive: true
  - name: "Channel 2"
    slug: "channel-2"
    # Missing required fields intentionally
categories
  # Malformed YAML structure
  name: "Bad Category"
  slug: "bad-category"
`;

      await writeYaml(configPath, malformedYaml);

      // Should handle malformed YAML gracefully
      console.log("📋 Testing malformed configuration handling...");
      const malformedResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 30000,
        skipDiff: true,
      });

      expect(malformedResult).toHaveFailed();
      expect(malformedResult).toMatchPattern(/yaml|parse|syntax|invalid/i);

      // Should provide helpful error message
      expect(malformedResult.cleanStderr.length).toBeGreaterThan(0);

      // Fix the configuration
      const fixedConfig = {
        shop: {
          defaultMailSenderName: "Fixed Store",
          defaultMailSenderAddress: "fixed@test.com",
        },
        channels: [
          {
            name: "Fixed Channel",
            slug: "fixed-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
        ],
        categories: [
          {
            name: "Fixed Category",
            slug: "fixed-category",
            description: "This is properly formatted",
          },
        ],
      };

      await writeYaml(configPath, fixedConfig);

      // Should work after fixing the configuration
      console.log("🔧 Testing recovery with fixed configuration...");
      const fixedResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(fixedResult);

      // Verify the fix was applied
      const verifyFixResult = await cli.introspect(apiUrl, token, {
        config: path.join(testDir, "verify-fix.yml"),
      });

      expect(verifyFixResult).toHaveSucceeded();
      const verifyState = await readYaml(path.join(testDir, "verify-fix.yml"));

      expect(verifyState.shop.defaultMailSenderName).toBe("Fixed Store");
      expect(verifyState.channels[0].name).toBe("Fixed Channel");
      expect(verifyState.categories[0].name).toBe("Fixed Category");
    }, 120000);

    it("should handle missing configuration file gracefully", async () => {
      const nonExistentConfigPath = path.join(testDir, "does-not-exist.yml");

      // Try to deploy with non-existent config file
      console.log("📄 Testing missing configuration file handling...");
      const missingFileResult = await cli.deploy(apiUrl, token, {
        config: nonExistentConfigPath,
        timeout: 10000,
        skipDiff: true,
      });

      expect(missingFileResult).toHaveFailed();
      expect(missingFileResult).toMatchPattern(/file.*not.*found|does not exist|no such file/i);

      // Should mention the specific file that's missing
      expect(missingFileResult).toContainInOutput("does-not-exist.yml");

      // Should provide helpful error message
      expect(missingFileResult.cleanStderr.length).toBeGreaterThan(0);

      // Create the missing file
      const newConfig = {
        shop: {
          defaultMailSenderName: "Recovered Store",
          defaultMailSenderAddress: "recovered@test.com",
        },
        channels: [],
      };

      await writeYaml(nonExistentConfigPath, newConfig);

      // Should work after creating the file
      console.log("📁 Testing recovery after creating missing file...");
      const recoveredResult = await cli.deploy(apiUrl, token, {
        config: nonExistentConfigPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(recoveredResult);
      expect(recoveredResult).toContainInOutput("Recovered Store");
    }, 120000);
  });

  describe("System Resource Recovery", () => {
    it("should handle resource constraints gracefully", async () => {
      const configPath = path.join(testDir, "resource-test-config.yml");

      // Create a larger config that might stress system resources
      const largeConfig = {
        shop: {
          defaultMailSenderName: "Resource Test Store",
          defaultMailSenderAddress: "resource@test.com",
        },
        channels: Array.from({ length: 20 }, (_, i) => ({
          name: `Resource Channel ${i + 1}`,
          slug: `resource-channel-${i + 1}`,
          currencyCode: "USD",
          defaultCountry: "US",
          isActive: true,
        })),
        categories: Array.from({ length: 50 }, (_, i) => ({
          name: `Resource Category ${i + 1}`,
          slug: `resource-category-${i + 1}`,
          description: `Description for category ${i + 1} with some additional text to increase size`,
        })),
      };

      await writeYaml(configPath, largeConfig);

      // Deploy large configuration
      console.log("💾 Testing large configuration deployment...");
      const resourceTestResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 300000, // 5 minute timeout for large config
        skipDiff: true,
      });

      // Should handle large configs gracefully
      if (resourceTestResult.exitCode === 0) {
        console.log("✅ Large configuration deployed successfully");
        assertDeploymentSuccess(resourceTestResult);

        // Verify system is still responsive
        const diffResult = await cli.diff(apiUrl, token, {
          config: configPath,
        });

        expect(diffResult).toHaveSucceeded();
        expect(diffResult).toContainInOutput("No differences found");
      } else {
        console.log("⚠️ Large configuration failed, checking error handling...");

        // Should fail gracefully (not crash)
        expect(resourceTestResult.exitCode).toBeLessThan(128);

        // System should still be responsive
        const introspectResult = await cli.introspect(apiUrl, token, {
          config: path.join(testDir, "after-resource-failure.yml"),
        });

        expect(introspectResult).toHaveSucceeded();

        // Should be able to deploy smaller config
        const smallerConfig = {
          shop: {
            defaultMailSenderName: "Smaller Resource Test Store",
            defaultMailSenderAddress: "resource@test.com",
          },
          channels: [
            {
              name: "Small Channel",
              slug: "small-channel",
              currencyCode: "USD",
              defaultCountry: "US",
              isActive: true,
            },
          ],
        };

        await writeYaml(configPath, smallerConfig);

        const smallerResult = await cli.deploy(apiUrl, token, {
          config: configPath,
          skipDiff: true,
        });

        assertDeploymentSuccess(smallerResult);
      }
    }, 400000);
  });
});
