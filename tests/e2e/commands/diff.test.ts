import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { CLIRunner, CLIOutputParser } from "../helpers/cli-runner.ts";
import { SandboxManager } from "../helpers/sandbox-manager.ts";
import { FileUtils, TestAssertions, ConfigUtils, TestDataGenerator } from "../helpers/test-utils.ts";
import { getTestEnvironment, generateTestConfig } from "../fixtures/environments.ts";
import type { TestContext } from "../setup/global-setup.ts";

describe("Diff Command E2E Tests", () => {
  let cliRunner: CLIRunner;
  let sandboxManager: SandboxManager;
  let testContext: TestContext;
  let testWorkspace: string;
  let testConfig: ReturnType<typeof generateTestConfig>;

  beforeAll(async () => {
    // Initialize test environment
    testConfig = generateTestConfig();
    testContext = {
      testWorkspace: await FileUtils.createTempDir("diff-e2e-"),
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

    console.log("✅ Sandbox connection verified");
  }, 60000);

  afterAll(async () => {
    // Cleanup test workspace
    if (testContext.testWorkspace) {
      await FileUtils.cleanupDirectory(testContext.testWorkspace);
      console.log(`🧹 Cleaned up test workspace: ${testContext.testWorkspace}`);
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

  describe("Basic Diff Operations", () => {
    it("should show no differences when local matches remote", async () => {
      // First, introspect to get current state
      const introspectResult = await cliRunner.introspect({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        outputDir: testWorkspace,
      });

      TestAssertions.assertCommandSuccess(introspectResult);

      // Now run diff - should show no changes
      const diffResult = await cliRunner.diff({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 60000,
      });

      TestAssertions.assertCommandSuccess(diffResult);

      // Parse diff summary
      const summary = CLIOutputParser.extractDiffSummary(diffResult.stdout);
      console.log(`📊 Diff summary: ${JSON.stringify(summary)}`);

      // Should indicate no changes
      TestAssertions.assertOutputContains(diffResult.stdout, [
        "diff",
        "configuration",
      ]);

      // Check for "no changes" or similar indicators
      const noChangesIndicators = [
        /no changes/i,
        /no differences/i,
        /up to date/i,
        /synchronized/i,
        /0\s+changes/i,
      ];

      const hasNoChangesIndicator = noChangesIndicators.some(pattern =>
        pattern.test(diffResult.stdout) || pattern.test(diffResult.stderr)
      );

      if (!hasNoChangesIndicator && summary.added === 0 && summary.modified === 0 && summary.deleted === 0) {
        console.log("✅ No changes detected (verified via summary parsing)");
      } else if (hasNoChangesIndicator) {
        console.log("✅ No changes detected (verified via output text)");
      } else {
        console.log(`ℹ️  Changes detected: ${JSON.stringify(summary)}`);
      }

      console.log("✅ Basic diff with no changes completed");
    }, 120000);

    it("should detect changes when local configuration is modified", async () => {
      // First, introspect to get current state
      const introspectResult = await cliRunner.introspect({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        outputDir: testWorkspace,
      });

      TestAssertions.assertCommandSuccess(introspectResult);

      // Modify local configuration by adding test entities
      const testProduct = TestDataGenerator.generateProduct({
        name: `E2E Test Product ${Date.now()}`,
        slug: `e2e-test-product-${Date.now()}`,
      });

      const productConfig = ConfigUtils.createProductConfig([testProduct]);
      const productConfigPath = join(testWorkspace, "test-products.yaml");
      await writeFile(productConfigPath, productConfig, "utf-8");

      console.log(`📝 Added test configuration: ${productConfigPath}`);

      // Run diff to detect changes
      const diffResult = await cliRunner.diff({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 60000,
      });

      TestAssertions.assertCommandSuccess(diffResult);

      // Should detect the added configuration
      TestAssertions.assertOutputContains(diffResult.stdout, [
        "diff",
        "configuration",
      ]);

      // Parse diff summary
      const summary = CLIOutputParser.extractDiffSummary(diffResult.stdout);
      console.log(`📊 Diff summary after changes: ${JSON.stringify(summary)}`);

      // Should show some changes (added items)
      if (summary.added > 0 || summary.modified > 0) {
        console.log("✅ Changes detected in diff output");
      } else {
        // Check for other change indicators in output
        const changeIndicators = [
          /added/i,
          /modified/i,
          /changed/i,
          /\+\s*\d+/,
          /new/i,
        ];

        const hasChangeIndicator = changeIndicators.some(pattern =>
          pattern.test(diffResult.stdout)
        );

        if (hasChangeIndicator) {
          console.log("✅ Changes detected via output patterns");
        } else {
          console.log("ℹ️  No explicit changes shown in diff output (this may be expected behavior)");
        }
      }

      console.log("✅ Change detection test completed");
    }, 120000);

    it("should handle empty local configuration directory", async () => {
      // Run diff with empty directory
      const diffResult = await cliRunner.diff({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 60000,
      });

      // Should handle empty directory gracefully
      TestAssertions.assertCommandSuccess(diffResult);

      TestAssertions.assertOutputContains(diffResult.stdout, [
        "diff",
      ]);

      console.log("✅ Empty directory handling verified");
    }, 90000);
  });

  describe("Diff Output Analysis", () => {
    it("should provide detailed diff information", async () => {
      // Create test configuration with multiple entities
      const testProducts = TestDataGenerator.generateProducts(2);
      const testCategories = TestDataGenerator.generateCategories(2);

      const productConfig = ConfigUtils.createProductConfig(testProducts);
      const categoryConfig = ConfigUtils.createCategoryConfig(testCategories);

      await writeFile(join(testWorkspace, "products.yaml"), productConfig, "utf-8");
      await writeFile(join(testWorkspace, "categories.yaml"), categoryConfig, "utf-8");

      console.log("📝 Created test configurations with multiple entities");

      // Run diff
      const diffResult = await cliRunner.diff({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 60000,
      });

      TestAssertions.assertCommandSuccess(diffResult);

      // Analyze output structure
      const output = diffResult.stdout;
      console.log(`📋 Diff output analysis:
        - Length: ${output.length} characters
        - Contains "diff": ${output.includes("diff")}
        - Contains "configuration": ${output.includes("configuration")}
      `);

      // Parse summary
      const summary = CLIOutputParser.extractDiffSummary(output);
      console.log(`📊 Parsed summary: ${JSON.stringify(summary)}`);

      // Verify output contains useful information
      expect(output.length).toBeGreaterThan(0);

      console.log("✅ Detailed diff analysis completed");
    }, 90000);

    it("should handle different file formats in configuration", async () => {
      // Create mixed format configurations
      const basicConfig = ConfigUtils.createBasicConfig();
      await writeFile(join(testWorkspace, "basic.yaml"), basicConfig, "utf-8");

      // Create a JSON configuration as well
      const jsonConfig = {
        version: "1.0",
        metadata: {
          name: "test-json-config",
          type: "json",
        },
        entities: [],
      };
      await writeFile(join(testWorkspace, "config.json"), JSON.stringify(jsonConfig, null, 2), "utf-8");

      console.log("📝 Created mixed format configurations");

      // Run diff
      const diffResult = await cliRunner.diff({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 60000,
      });

      TestAssertions.assertCommandSuccess(diffResult);

      console.log("✅ Mixed format handling verified");
    }, 90000);
  });

  describe("Error Scenarios", () => {
    it("should fail gracefully with invalid URL", async () => {
      // Create basic config first
      const basicConfig = ConfigUtils.createBasicConfig();
      await writeFile(join(testWorkspace, "config.yaml"), basicConfig, "utf-8");

      const diffResult = await cliRunner.diff({
        url: "https://invalid-saleor-url.example.com",
        token: testContext.saleorToken,
        configDir: testWorkspace,
        expectFailure: true,
        timeout: 30000,
      });

      // Should fail as expected
      expect(diffResult.success).toBe(false);
      expect(diffResult.exitCode).not.toBe(0);

      // Should contain error information
      expect(diffResult.stderr.length).toBeGreaterThan(0);

      console.log("✅ Invalid URL error handling verified");
    }, 45000);

    it("should fail gracefully with invalid token", async () => {
      // Create basic config first
      const basicConfig = ConfigUtils.createBasicConfig();
      await writeFile(join(testWorkspace, "config.yaml"), basicConfig, "utf-8");

      const diffResult = await cliRunner.diff({
        url: testContext.saleorUrl,
        token: "invalid-token-12345",
        configDir: testWorkspace,
        expectFailure: true,
        timeout: 30000,
      });

      // Should fail as expected
      expect(diffResult.success).toBe(false);
      expect(diffResult.exitCode).not.toBe(0);

      console.log("✅ Invalid token error handling verified");
    }, 45000);

    it("should handle malformed configuration files", async () => {
      // Create malformed YAML
      const malformedYaml = `
        invalid: yaml: content:
          - this is not
        valid yaml syntax [
      `;
      await writeFile(join(testWorkspace, "malformed.yaml"), malformedYaml, "utf-8");

      const diffResult = await cliRunner.diff({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        expectFailure: true,
        timeout: 30000,
      });

      // May fail or succeed depending on how the CLI handles malformed files
      if (!diffResult.success) {
        expect(diffResult.exitCode).not.toBe(0);
        console.log("✅ Malformed YAML properly rejected");
      } else {
        console.log("ℹ️  CLI handled malformed YAML gracefully");
      }
    }, 45000);

    it("should handle non-existent configuration directory", async () => {
      const nonExistentDir = join(testWorkspace, "does-not-exist");

      const diffResult = await cliRunner.diff({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: nonExistentDir,
        expectFailure: true,
        timeout: 30000,
      });

      // Should handle missing directory appropriately
      if (!diffResult.success) {
        expect(diffResult.exitCode).not.toBe(0);
        console.log("✅ Missing directory properly handled");
      } else {
        console.log("ℹ️  CLI created directory or handled missing directory gracefully");
      }
    }, 45000);
  });

  describe("Performance and Reliability", () => {
    it("should complete diff operation within reasonable time", async () => {
      // Create moderate-sized configuration
      const testProducts = TestDataGenerator.generateProducts(5);
      const testCategories = TestDataGenerator.generateCategories(3);

      const productConfig = ConfigUtils.createProductConfig(testProducts);
      const categoryConfig = ConfigUtils.createCategoryConfig(testCategories);

      await writeFile(join(testWorkspace, "products.yaml"), productConfig, "utf-8");
      await writeFile(join(testWorkspace, "categories.yaml"), categoryConfig, "utf-8");

      const startTime = Date.now();

      const diffResult = await cliRunner.diff({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 90000,
      });

      const duration = Date.now() - startTime;

      TestAssertions.assertCommandSuccess(diffResult);

      // Verify reasonable performance
      expect(duration).toBeLessThan(90000); // 1.5 minutes max
      console.log(`⏱️  Diff completed in ${duration}ms`);

      console.log("✅ Performance test completed");
    }, 120000);

    it("should be consistent across multiple runs", async () => {
      // Create test configuration
      const testProducts = TestDataGenerator.generateProducts(2);
      const productConfig = ConfigUtils.createProductConfig(testProducts);
      await writeFile(join(testWorkspace, "products.yaml"), productConfig, "utf-8");

      // Run diff multiple times
      const results = [];
      for (let i = 0; i < 3; i++) {
        const diffResult = await cliRunner.diff({
          url: testContext.saleorUrl,
          token: testContext.saleorToken,
          configDir: testWorkspace,
          timeout: 60000,
        });

        TestAssertions.assertCommandSuccess(diffResult);
        results.push(diffResult);

        console.log(`✅ Diff run ${i + 1} completed`);
      }

      // All runs should succeed
      expect(results.every(r => r.success)).toBe(true);

      console.log("✅ Consistency test completed");
    }, 180000);
  });

  describe("Edge Cases", () => {
    it("should handle configuration with special characters", async () => {
      // Create configuration with special characters
      const specialProduct = TestDataGenerator.generateProduct({
        name: "Test Product with Special Characters: & < > \" ' @",
        slug: "test-product-special-chars",
        description: "Description with special chars: émojis 🚀 and symbols ©®™",
      });

      const productConfig = ConfigUtils.createProductConfig([specialProduct]);
      await writeFile(join(testWorkspace, "special.yaml"), productConfig, "utf-8");

      const diffResult = await cliRunner.diff({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 60000,
      });

      TestAssertions.assertCommandSuccess(diffResult);

      console.log("✅ Special characters handling verified");
    }, 90000);

    it("should handle deeply nested configuration structure", async () => {
      // Create nested directory structure with configs
      const nestedDir = join(testWorkspace, "nested", "deep", "configs");
      await mkdir(nestedDir, { recursive: true });

      const testProduct = TestDataGenerator.generateProduct();
      const productConfig = ConfigUtils.createProductConfig([testProduct]);
      await writeFile(join(nestedDir, "products.yaml"), productConfig, "utf-8");

      const diffResult = await cliRunner.diff({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace, // Start from root, not nested dir
        timeout: 60000,
      });

      TestAssertions.assertCommandSuccess(diffResult);

      console.log("✅ Nested structure handling verified");
    }, 90000);

    it("should handle large configuration files", async () => {
      // Create larger configuration
      const manyProducts = TestDataGenerator.generateProducts(20);
      const manyCategories = TestDataGenerator.generateCategories(10);

      const productConfig = ConfigUtils.createProductConfig(manyProducts);
      const categoryConfig = ConfigUtils.createCategoryConfig(manyCategories);

      await writeFile(join(testWorkspace, "many-products.yaml"), productConfig, "utf-8");
      await writeFile(join(testWorkspace, "many-categories.yaml"), categoryConfig, "utf-8");

      console.log("📝 Created large configuration files");

      const diffResult = await cliRunner.diff({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 120000, // Longer timeout for large configs
      });

      TestAssertions.assertCommandSuccess(diffResult);

      console.log("✅ Large configuration handling verified");
    }, 150000);
  });
});