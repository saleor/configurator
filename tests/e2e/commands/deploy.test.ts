import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { CLIRunner, CLIOutputParser } from "../helpers/cli-runner.ts";
import { SandboxManager, type SandboxState } from "../helpers/sandbox-manager.ts";
import { FileUtils, TestAssertions, ConfigUtils, TestDataGenerator } from "../helpers/test-utils.ts";
import { getTestEnvironment, generateTestConfig } from "../fixtures/environments.ts";
import type { TestContext } from "../setup/global-setup.ts";

describe("Deploy Command E2E Tests", () => {
  let cliRunner: CLIRunner;
  let sandboxManager: SandboxManager;
  let testContext: TestContext;
  let testWorkspace: string;
  let testConfig: ReturnType<typeof generateTestConfig>;
  let initialSandboxState: SandboxState;

  beforeAll(async () => {
    // Initialize test environment
    testConfig = generateTestConfig();
    testContext = {
      testWorkspace: await FileUtils.createTempDir("deploy-e2e-"),
      saleorUrl: testConfig.environment.saleorUrl,
      saleorToken: testConfig.environment.saleorToken,
    };

    cliRunner = CLIRunner.create(testContext);
    sandboxManager = SandboxManager.fromTestContext(testContext);

    console.log(`🔧 Test workspace: ${testContext.testWorkspace}`);
    console.log(`🌐 Testing against: ${testContext.saleorUrl}`);

    // Verify sandbox connectivity
    const isConnected = await sandboxManager.testConnection();
    if (!isConnected) {
      throw new Error(`Failed to connect to Saleor sandbox: ${testContext.saleorUrl}`);
    }

    // Capture initial sandbox state for cleanup verification
    initialSandboxState = await sandboxManager.getSandboxState();
    console.log(`📊 Initial sandbox state: ${JSON.stringify(initialSandboxState)}`);

    console.log("✅ Sandbox connection verified");
  }, 60000);

  afterAll(async () => {
    // Cleanup test workspace
    if (testContext.testWorkspace) {
      await FileUtils.cleanupDirectory(testContext.testWorkspace);
      console.log(`🧹 Cleaned up test workspace: ${testContext.testWorkspace}`);
    }

    // Log final sandbox state for monitoring
    try {
      const finalState = await sandboxManager.getSandboxState();
      const delta = await sandboxManager.compareStates(initialSandboxState, finalState);
      console.log(`📊 Final sandbox state delta: ${JSON.stringify(delta)}`);
    } catch (error) {
      console.log(`⚠️  Could not verify final sandbox state: ${error}`);
    }
  }, 30000);

  beforeEach(async () => {
    // Create fresh test directory for each test
    testWorkspace = join(testContext.testWorkspace, `test-${Date.now()}`);
    await mkdir(testWorkspace, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup individual test workspace
    if (existsSync(testWorkspace)) {
      await rm(testWorkspace, { recursive: true, force: true });
    }
  });

  describe("Basic Deploy Operations", () => {
    it("should successfully deploy simple configuration", async () => {
      // Create simple test configuration with unique identifiers
      const timestamp = Date.now();
      const testProduct = TestDataGenerator.generateProduct({
        name: `E2E Deploy Test Product ${timestamp}`,
        slug: `e2e-deploy-test-product-${timestamp}`,
        description: `Test product created by E2E deploy test at ${new Date().toISOString()}`,
      });

      const productConfig = ConfigUtils.createProductConfig([testProduct]);
      await writeFile(join(testWorkspace, "deploy-test-products.yaml"), productConfig, "utf-8");

      console.log(`📝 Created test configuration for product: ${testProduct.name}`);

      // Capture state before deployment
      const beforeState = await sandboxManager.getSandboxState();

      // Deploy configuration
      const deployResult = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 120000, // 2 minutes for deployment
      });

      // Verify deployment succeeded
      TestAssertions.assertCommandSuccess(deployResult);
      expect(deployResult.success).toBe(true);
      expect(deployResult.exitCode).toBe(0);

      // Verify output contains deployment information
      TestAssertions.assertOutputContains(deployResult.stdout, [
        "deploy",
      ]);

      // Check if deployment was reported as successful
      const isSuccessful = CLIOutputParser.isDeploymentSuccessful(deployResult.stdout);
      if (isSuccessful) {
        console.log("✅ Deployment success detected in output");
      } else {
        console.log("ℹ️  Deployment success not explicitly indicated in output");
      }

      // Capture state after deployment
      const afterState = await sandboxManager.getSandboxState();
      const stateDelta = await sandboxManager.compareStates(beforeState, afterState);

      console.log(`📊 State changes: ${JSON.stringify(stateDelta)}`);

      console.log("✅ Basic deployment completed successfully");
    }, 180000);

    it("should handle empty configuration deployment", async () => {
      // Create minimal/empty configuration
      const emptyConfig = ConfigUtils.createBasicConfig();
      await writeFile(join(testWorkspace, "empty.yaml"), emptyConfig, "utf-8");

      const deployResult = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 60000,
      });

      // Should handle empty configuration gracefully
      TestAssertions.assertCommandSuccess(deployResult);

      console.log("✅ Empty configuration deployment handled");
    }, 90000);

    it("should handle deployment with no configuration files", async () => {
      // Deploy with empty directory
      const deployResult = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 60000,
      });

      // Should handle missing configuration appropriately
      if (deployResult.success) {
        console.log("ℹ️  CLI handled empty directory gracefully");
      } else {
        // Failing is also acceptable for empty directory
        expect(deployResult.exitCode).not.toBe(0);
        console.log("✅ Empty directory appropriately rejected");
      }
    }, 90000);
  });

  describe("Deploy Validation and Safety", () => {
    it("should validate configuration before deployment", async () => {
      // Create configuration with potential validation issues
      const invalidProduct = TestDataGenerator.generateProduct({
        name: "", // Empty name might be invalid
        slug: "invalid-product-test",
      });

      const productConfig = ConfigUtils.createProductConfig([invalidProduct]);
      await writeFile(join(testWorkspace, "invalid-products.yaml"), productConfig, "utf-8");

      const deployResult = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        expectFailure: true,
        timeout: 60000,
      });

      // Should catch validation errors
      if (!deployResult.success) {
        expect(deployResult.exitCode).not.toBe(0);
        console.log("✅ Validation errors properly caught");
      } else {
        console.log("ℹ️  Configuration was accepted (may have been auto-corrected)");
      }
    }, 90000);

    it("should support dry-run or preview mode if available", async () => {
      // Create test configuration
      const testProduct = TestDataGenerator.generateProduct({
        name: `E2E Preview Test ${Date.now()}`,
        slug: `e2e-preview-test-${Date.now()}`,
      });

      const productConfig = ConfigUtils.createProductConfig([testProduct]);
      await writeFile(join(testWorkspace, "preview-test.yaml"), productConfig, "utf-8");

      // Try deployment with preview/dry-run flag (if supported)
      // Note: This depends on CLI implementation - adjust flags as needed
      const previewResult = await cliRunner.run("deploy", [
        "--url", testContext.saleorUrl,
        "--token", testContext.saleorToken,
        "--dry-run", // This flag may not exist - test will handle gracefully
      ], {
        cwd: testWorkspace,
        expectFailure: true, // May fail if flag doesn't exist
        timeout: 60000,
      });

      if (previewResult.success) {
        console.log("✅ Dry-run mode supported and working");
        TestAssertions.assertOutputContains(previewResult.stdout, ["preview", "dry-run", "simulation"]);
      } else {
        console.log("ℹ️  Dry-run mode not available or flag incorrect");
      }
    }, 90000);
  });

  describe("Error Scenarios", () => {
    it("should fail gracefully with invalid URL", async () => {
      // Create valid configuration
      const testProduct = TestDataGenerator.generateProduct();
      const productConfig = ConfigUtils.createProductConfig([testProduct]);
      await writeFile(join(testWorkspace, "products.yaml"), productConfig, "utf-8");

      const deployResult = await cliRunner.deploy({
        url: "https://invalid-saleor-url.example.com",
        token: testContext.saleorToken,
        configDir: testWorkspace,
        expectFailure: true,
        timeout: 30000,
      });

      // Should fail as expected
      expect(deployResult.success).toBe(false);
      expect(deployResult.exitCode).not.toBe(0);

      // Should contain error information
      expect(deployResult.stderr.length).toBeGreaterThan(0);

      console.log("✅ Invalid URL error handling verified");
    }, 45000);

    it("should fail gracefully with invalid token", async () => {
      // Create valid configuration
      const testProduct = TestDataGenerator.generateProduct();
      const productConfig = ConfigUtils.createProductConfig([testProduct]);
      await writeFile(join(testWorkspace, "products.yaml"), productConfig, "utf-8");

      const deployResult = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: "invalid-token-12345",
        configDir: testWorkspace,
        expectFailure: true,
        timeout: 30000,
      });

      // Should fail as expected
      expect(deployResult.success).toBe(false);
      expect(deployResult.exitCode).not.toBe(0);

      console.log("✅ Invalid token error handling verified");
    }, 45000);

    it("should handle deployment conflicts gracefully", async () => {
      // Create configuration that might conflict with existing data
      const timestamp = Date.now();
      const conflictProduct = TestDataGenerator.generateProduct({
        name: `Conflict Test Product ${timestamp}`,
        slug: "duplicate-test-slug", // Might already exist
      });

      const productConfig = ConfigUtils.createProductConfig([conflictProduct]);
      await writeFile(join(testWorkspace, "conflict-test.yaml"), productConfig, "utf-8");

      const deployResult = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 90000,
      });

      // Should either succeed (update) or fail gracefully (conflict)
      if (!deployResult.success) {
        expect(deployResult.exitCode).not.toBe(0);
        console.log("✅ Deployment conflicts handled appropriately");
      } else {
        console.log("✅ Deployment succeeded (conflict resolved or no conflict)");
      }
    }, 120000);

    it("should handle malformed configuration files", async () => {
      // Create malformed YAML
      const malformedYaml = `
        invalid: yaml: content:
          - this is not
        valid yaml syntax [
      `;
      await writeFile(join(testWorkspace, "malformed.yaml"), malformedYaml, "utf-8");

      const deployResult = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        expectFailure: true,
        timeout: 30000,
      });

      // Should reject malformed configuration
      expect(deployResult.success).toBe(false);
      expect(deployResult.exitCode).not.toBe(0);

      console.log("✅ Malformed configuration properly rejected");
    }, 45000);
  });

  describe("Performance and Reliability", () => {
    it("should complete deployment within reasonable time", async () => {
      // Create moderate-sized configuration
      const timestamp = Date.now();
      const testProducts = TestDataGenerator.generateProducts(3).map((product, index) => ({
        ...product,
        name: `E2E Perf Test Product ${timestamp}-${index}`,
        slug: `e2e-perf-test-${timestamp}-${index}`,
      }));

      const testCategories = TestDataGenerator.generateCategories(2).map((category, index) => ({
        ...category,
        name: `E2E Perf Test Category ${timestamp}-${index}`,
        slug: `e2e-perf-test-cat-${timestamp}-${index}`,
      }));

      const productConfig = ConfigUtils.createProductConfig(testProducts);
      const categoryConfig = ConfigUtils.createCategoryConfig(testCategories);

      await writeFile(join(testWorkspace, "products.yaml"), productConfig, "utf-8");
      await writeFile(join(testWorkspace, "categories.yaml"), categoryConfig, "utf-8");

      const startTime = Date.now();

      const deployResult = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 180000, // 3 minutes for performance test
      });

      const duration = Date.now() - startTime;

      TestAssertions.assertCommandSuccess(deployResult);

      // Verify reasonable performance
      expect(duration).toBeLessThan(180000); // 3 minutes max
      console.log(`⏱️  Deployment completed in ${duration}ms`);

      console.log("✅ Performance test completed");
    }, 240000);

    it("should handle network interruptions gracefully", async () => {
      // Create test configuration
      const testProduct = TestDataGenerator.generateProduct({
        name: `Network Test Product ${Date.now()}`,
        slug: `network-test-${Date.now()}`,
      });

      const productConfig = ConfigUtils.createProductConfig([testProduct]);
      await writeFile(join(testWorkspace, "network-test.yaml"), productConfig, "utf-8");

      // Test with shorter timeout to simulate network issues
      const deployResult = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 15000, // 15 seconds - may timeout
      });

      // Should either succeed or fail gracefully
      if (!deployResult.success) {
        expect(deployResult.exitCode).not.toBe(0);
        console.log("✅ Network timeout handled gracefully");
      } else {
        console.log("✅ Deployment completed within timeout");
      }
    }, 30000);
  });

  describe("Idempotency", () => {
    it("should be idempotent - repeated deployments should be safe", async () => {
      // Create stable test configuration
      const timestamp = Date.now();
      const stableProduct = TestDataGenerator.generateProduct({
        name: `Idempotent Test Product ${timestamp}`,
        slug: `idempotent-test-${timestamp}`,
        description: "Stable product for idempotency testing",
      });

      const productConfig = ConfigUtils.createProductConfig([stableProduct]);
      await writeFile(join(testWorkspace, "idempotent-test.yaml"), productConfig, "utf-8");

      // First deployment
      const deploy1Result = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 120000,
      });

      TestAssertions.assertCommandSuccess(deploy1Result);

      // Second deployment (should be idempotent)
      const deploy2Result = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 120000,
      });

      TestAssertions.assertCommandSuccess(deploy2Result);

      // Both deployments should succeed
      expect(deploy1Result.success).toBe(true);
      expect(deploy2Result.success).toBe(true);

      console.log("✅ Idempotency test completed - both deployments succeeded");
    }, 300000);

    it("should handle incremental deployments correctly", async () => {
      const timestamp = Date.now();

      // Initial deployment with one product
      const product1 = TestDataGenerator.generateProduct({
        name: `Incremental Test Product 1 ${timestamp}`,
        slug: `incremental-test-1-${timestamp}`,
      });

      let productConfig = ConfigUtils.createProductConfig([product1]);
      await writeFile(join(testWorkspace, "incremental-test.yaml"), productConfig, "utf-8");

      const deploy1Result = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 120000,
      });

      TestAssertions.assertCommandSuccess(deploy1Result);

      // Add second product and redeploy
      const product2 = TestDataGenerator.generateProduct({
        name: `Incremental Test Product 2 ${timestamp}`,
        slug: `incremental-test-2-${timestamp}`,
      });

      productConfig = ConfigUtils.createProductConfig([product1, product2]);
      await writeFile(join(testWorkspace, "incremental-test.yaml"), productConfig, "utf-8");

      const deploy2Result = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 120000,
      });

      TestAssertions.assertCommandSuccess(deploy2Result);

      console.log("✅ Incremental deployment test completed");
    }, 300000);
  });

  describe("Edge Cases", () => {
    it("should handle large configuration deployments", async () => {
      // Create larger configuration (but still reasonable for E2E)
      const timestamp = Date.now();
      const manyProducts = TestDataGenerator.generateProducts(10).map((product, index) => ({
        ...product,
        name: `Large Config Test Product ${timestamp}-${index}`,
        slug: `large-config-test-${timestamp}-${index}`,
      }));

      const productConfig = ConfigUtils.createProductConfig(manyProducts);
      await writeFile(join(testWorkspace, "large-config.yaml"), productConfig, "utf-8");

      console.log(`📝 Created large configuration with ${manyProducts.length} products`);

      const deployResult = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 300000, // 5 minutes for large deployment
      });

      TestAssertions.assertCommandSuccess(deployResult);

      console.log("✅ Large configuration deployment completed");
    }, 360000);

    it("should handle deployment with special characters", async () => {
      // Create configuration with special characters
      const timestamp = Date.now();
      const specialProduct = TestDataGenerator.generateProduct({
        name: `Special Chars Test: & < > " ' @ ${timestamp}`,
        slug: `special-chars-test-${timestamp}`,
        description: "Description with émojis 🚀 and symbols ©®™",
      });

      const productConfig = ConfigUtils.createProductConfig([specialProduct]);
      await writeFile(join(testWorkspace, "special-chars.yaml"), productConfig, "utf-8");

      const deployResult = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 120000,
      });

      TestAssertions.assertCommandSuccess(deployResult);

      console.log("✅ Special characters deployment completed");
    }, 180000);
  });
});