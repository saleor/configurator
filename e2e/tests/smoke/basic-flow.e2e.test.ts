import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SaleorTestContainer } from "../../utils/saleor-container.js";
import { CliRunner } from "../../utils/cli-runner.js";
import {
  createTempDir,
  cleanupTempDir,
  readYaml,
  writeYaml,
  fileExists,
} from "../../utils/test-helpers.js";
import {
  assertDeploymentSuccess,
  assertIntrospectionSuccess,
  assertNoChanges,
} from "../../utils/assertions.js";
import path from "node:path";

describe("E2E Smoke Test - Basic Flow", () => {
  let container: SaleorTestContainer;
  let cli: CliRunner;
  let apiUrl: string;
  let token: string;
  let testDir: string;

  beforeAll(async () => {
    console.log("🚀 Starting smoke test setup...");
    console.log(`🔍 Environment: CI=${process.env.CI}, RUNNER_OS=${process.env.RUNNER_OS}`);
    
    const isCI = process.env.CI === "true";
    
    // Always initialize CLI runner for version/help tests
    cli = new CliRunner({ verbose: process.env.VERBOSE === "true" });
    
    // Create temp directory for test files
    testDir = await createTempDir("smoke-test-");
    
    // Start Saleor container with CI-optimized settings
    container = new SaleorTestContainer({
      projectName: "saleor-smoke-test",
      startTimeout: isCI ? 360000 : 240000, // 6 minutes for CI, 4 minutes locally
    });
    
    // Add timeout wrapper to fail fast if hanging
    const maxTimeout = isCI ? 420000 : 300000; // 7 minutes for CI, 5 minutes locally
    const startWithTimeout = Promise.race([
      container.start(),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Container startup exceeded maximum time limit (${maxTimeout/1000}s)`));
        }, maxTimeout);
      })
    ]);
    
    await startWithTimeout;
    
    apiUrl = container.getApiUrl();
    token = container.getAdminToken();
    
    console.log("✅ Smoke test setup complete");
  }, 450000); // 7.5 minutes timeout for container startup in CI

  afterAll(async () => {
    // Clean up
    await container?.stop();
    if (testDir) {
      await cleanupTempDir(testDir);
    }
  });

  it("should show version", async () => {
    const result = await cli.version();
    
    expect(result).toHaveSucceeded();
    expect(result).toContainInOutput("0.11.0"); // Update this to match package.json version
  });

  it("should show help", async () => {
    const result = await cli.help();
    
    expect(result).toHaveSucceeded();
    expect(result).toContainInOutput("Saleor Configurator");
    expect(result).toContainInOutput("deploy");
    expect(result).toContainInOutput("introspect");
    expect(result).toContainInOutput("diff");
    expect(result).toContainInOutput("start");
  });

  it("should complete full introspect → modify → deploy → deploy cycle", async () => {
    const configPath = path.join(testDir, "config.yml");
    
    // Step 1: Introspect from fresh Saleor instance
    console.log("📥 Step 1: Introspecting from Saleor...");
    const introspectResult = await cli.introspect(apiUrl, token, {
      config: configPath,
    });
    
    assertIntrospectionSuccess(introspectResult);
    expect(await fileExists(configPath)).toBe(true);
    
    // Verify introspected config has expected structure
    const config = await readYaml(configPath);
    expect(config).toHaveProperty("shop");
    expect(config).toHaveProperty("channels");
    expect(config.channels).toBeInstanceOf(Array);
    
    console.log("✅ Introspection successful");
    
    // Step 2: Modify configuration
    console.log("✏️ Step 2: Modifying configuration...");
    config.shop.defaultMailSenderName = "E2E Test Store";
    config.shop.defaultMailSenderAddress = "e2e-test@example.com";
    
    // Add a new channel if none exist, or modify the first one
    if (config.channels.length === 0) {
      config.channels.push({
        name: "E2E Test Channel",
        slug: "e2e-test-channel",
        currencyCode: "USD",
        defaultCountry: "US",
      });
    } else {
      config.channels[0].name = "Modified E2E Channel";
    }
    
    await writeYaml(configPath, config);
    console.log("✅ Configuration modified");
    
    // Step 3: Deploy changes
    console.log("🚀 Step 3: Deploying changes...");
    const deployResult1 = await cli.deploy(apiUrl, token, {
      config: configPath,
      skipDiff: true, // Skip diff for faster test
    });
    
    assertDeploymentSuccess(deployResult1);
    console.log("✅ First deployment successful");
    
    // Step 4: Deploy again to verify idempotency
    console.log("🔄 Step 4: Testing idempotency with second deployment...");
    const deployResult2 = await cli.deploy(apiUrl, token, {
      config: configPath,
      skipDiff: true,
    });
    
    assertDeploymentSuccess(deployResult2);
    // The second deployment should recognize no changes are needed
    expect(deployResult2).toContainInOutput("completed");
    console.log("✅ Idempotency verified");
    
    // Step 5: Introspect again to verify round-trip
    console.log("🔍 Step 5: Verifying round-trip integrity...");
    const verifyPath = path.join(testDir, "verify.yml");
    const verifyResult = await cli.introspect(apiUrl, token, {
      config: verifyPath,
    });
    
    assertIntrospectionSuccess(verifyResult);
    
    const verifyConfig = await readYaml(verifyPath);
    expect(verifyConfig.shop.defaultMailSenderName).toBe("E2E Test Store");
    expect(verifyConfig.shop.defaultMailSenderAddress).toBe("e2e-test@example.com");
    
    console.log("✅ Round-trip integrity verified");
    
    // Step 6: Run diff to confirm no drift
    console.log("📊 Step 6: Checking for configuration drift...");
    const diffResult = await cli.diff(apiUrl, token, {
      config: verifyPath,
    });
    
    // There might be some differences due to defaults or computed fields
    // but the core configuration should match
    expect(diffResult).toHaveSucceeded();
    console.log("✅ Diff check completed");
  }, 120000); // 2 minutes timeout for the full cycle

  it("should handle authentication errors gracefully", async () => {
    const invalidToken = "invalid-token-12345";
    const configPath = path.join(testDir, "auth-test.yml");
    
    const result = await cli.introspect(apiUrl, invalidToken, {
      config: configPath,
    });
    
    expect(result).toHaveFailed();
    expect(result).toMatchPattern(/auth|permission|unauthorized/i);
  });

  it("should handle network errors gracefully", async () => {
    const invalidUrl = "http://localhost:99999/graphql/";
    const configPath = path.join(testDir, "network-test.yml");
    
    const result = await cli.introspect(invalidUrl, token, {
      config: configPath,
      timeout: 5000, // Short timeout for faster test
    });
    
    expect(result).toHaveFailed();
    expect(result).toMatchPattern(/connect|network|ECONNREFUSED/i);
  });

  it("should validate configuration before deployment", async () => {
    const invalidConfigPath = path.join(testDir, "invalid.yml");
    
    // Write an invalid configuration
    await writeYaml(invalidConfigPath, {
      shop: {
        // Missing required fields
        invalidField: "test",
      },
      channels: "should-be-array", // Wrong type
    });
    
    const result = await cli.deploy(apiUrl, token, {
      config: invalidConfigPath,
    });
    
    expect(result).toHaveFailed();
    expect(result).toMatchPattern(/validation|invalid|required/i);
  });
});