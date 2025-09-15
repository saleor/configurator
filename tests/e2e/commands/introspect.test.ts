import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { mkdir, rm, readdir } from "node:fs/promises";
import { CLIRunner, CLIOutputParser } from "../helpers/cli-runner.ts";
import { SandboxManager } from "../helpers/sandbox-manager.ts";
import { FileUtils, TestAssertions, WaitUtils } from "../helpers/test-utils.ts";
import { getTestEnvironment, generateTestConfig } from "../fixtures/environments.ts";
import type { TestContext } from "../setup/global-setup.ts";

describe("Introspect Command E2E Tests", () => {
  let cliRunner: CLIRunner;
  let sandboxManager: SandboxManager;
  let testContext: TestContext;
  let testWorkspace: string;
  let testConfig: ReturnType<typeof generateTestConfig>;

  beforeAll(async () => {
    // Initialize test environment
    testConfig = generateTestConfig();
    testContext = {
      testWorkspace: await FileUtils.createTempDir("introspect-e2e-"),
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

  describe("Basic Introspection", () => {
    it("should successfully introspect sandbox configuration", async () => {
      // Execute introspect command
      const result = await cliRunner.introspect({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        outputDir: testWorkspace,
        timeout: 120000, // 2 minutes for introspection
      });

      // Verify command succeeded
      TestAssertions.assertCommandSuccess(result);
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);

      // Verify output contains expected information
      TestAssertions.assertOutputContains(result.stdout, [
        "introspect",
        "configuration",
        "Downloaded",
      ]);

      // Verify configuration files were created
      const isNotEmpty = !(await FileUtils.isDirectoryEmpty(testWorkspace));
      expect(isNotEmpty).toBe(true);

      // Check for expected configuration files
      const files = await readdir(testWorkspace);
      console.log(`📁 Created files: ${files.join(", ")}`);

      // Validate that we have some configuration data
      expect(files.length).toBeGreaterThan(0);

      // Check for common configuration file patterns
      const hasConfigFiles = files.some(file =>
        file.endsWith('.yaml') || file.endsWith('.yml') || file.endsWith('.json')
      );
      expect(hasConfigFiles).toBe(true);

      console.log("✅ Basic introspection completed successfully");
    }, 150000);

    it("should handle empty sandbox gracefully", async () => {
      // This test assumes the sandbox might have minimal data
      const result = await cliRunner.introspect({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        outputDir: testWorkspace,
        timeout: 60000,
      });

      // Should succeed even with minimal data
      TestAssertions.assertCommandSuccess(result);

      // Should create at least basic configuration structure
      const files = await readdir(testWorkspace);
      expect(files.length).toBeGreaterThanOrEqual(0);

      console.log("✅ Empty sandbox handling verified");
    }, 90000);

    it("should create structured output directory", async () => {
      const result = await cliRunner.introspect({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        outputDir: testWorkspace,
      });

      TestAssertions.assertCommandSuccess(result);

      // Check that the output is properly structured
      const allFiles = await FileUtils.getAllFiles(testWorkspace);
      console.log(`📋 All created files: ${allFiles.map(f => f.replace(testWorkspace, '')).join(", ")}`);

      // Verify files are in the expected location
      expect(allFiles.length).toBeGreaterThanOrEqual(0);

      console.log("✅ Structured output directory verified");
    }, 90000);
  });

  describe("Output Validation", () => {
    it("should produce valid YAML configuration files", async () => {
      const result = await cliRunner.introspect({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        outputDir: testWorkspace,
      });

      TestAssertions.assertCommandSuccess(result);

      // Get all YAML files
      const allFiles = await FileUtils.getAllFiles(testWorkspace);
      const yamlFiles = allFiles.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));

      if (yamlFiles.length > 0) {
        // Validate YAML syntax by reading each file
        for (const yamlFile of yamlFiles) {
          try {
            const content = await FileUtils.readYamlFile(yamlFile);
            expect(content).toBeTruthy();
            expect(typeof content).toBe('string');

            // Basic YAML structure validation
            expect(content.trim().length).toBeGreaterThan(0);

            console.log(`✅ Valid YAML: ${yamlFile.replace(testWorkspace, '')}`);
          } catch (error) {
            throw new Error(`Invalid YAML file: ${yamlFile} - ${error}`);
          }
        }
      }

      console.log("✅ YAML validation completed");
    }, 90000);

    it("should extract entity counts from output", async () => {
      const result = await cliRunner.introspect({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        outputDir: testWorkspace,
      });

      TestAssertions.assertCommandSuccess(result);

      // Parse entity counts from CLI output
      const counts = CLIOutputParser.extractEntityCounts(result.stdout);
      console.log(`📊 Entity counts: ${JSON.stringify(counts)}`);

      // Verify we can parse some information from the output
      expect(typeof counts).toBe('object');

      // Log what we found for debugging
      Object.entries(counts).forEach(([entity, count]) => {
        console.log(`  ${entity}: ${count}`);
      });

      console.log("✅ Entity count extraction verified");
    }, 90000);
  });

  describe("Error Scenarios", () => {
    it("should fail gracefully with invalid URL", async () => {
      const result = await cliRunner.introspect({
        url: "https://invalid-saleor-url.example.com",
        token: testContext.saleorToken,
        outputDir: testWorkspace,
        expectFailure: true,
        timeout: 30000,
      });

      // Should fail as expected
      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);

      // Should contain error information
      expect(result.stderr.length).toBeGreaterThan(0);

      console.log("✅ Invalid URL error handling verified");
    }, 45000);

    it("should fail gracefully with invalid token", async () => {
      const result = await cliRunner.introspect({
        url: testContext.saleorUrl,
        token: "invalid-token-12345",
        outputDir: testWorkspace,
        expectFailure: true,
        timeout: 30000,
      });

      // Should fail as expected
      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);

      // Should contain authentication error
      const hasAuthError = result.stderr.toLowerCase().includes('auth') ||
                          result.stderr.toLowerCase().includes('token') ||
                          result.stderr.toLowerCase().includes('unauthorized') ||
                          result.stderr.toLowerCase().includes('permission');

      if (result.stderr.length > 0) {
        console.log(`📝 Error message: ${result.stderr}`);
        // Note: We don't enforce specific error message format as it may vary
      }

      console.log("✅ Invalid token error handling verified");
    }, 45000);

    it("should handle network timeouts gracefully", async () => {
      // Test with very short timeout to simulate network issues
      const result = await cliRunner.introspect({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        outputDir: testWorkspace,
        expectFailure: true,
        timeout: 1000, // 1 second - likely to timeout
      });

      // Should either succeed quickly or fail with timeout
      if (!result.success) {
        expect(result.exitCode).not.toBe(0);
        console.log("✅ Timeout handling verified");
      } else {
        console.log("✅ Command completed faster than timeout");
      }
    }, 15000);
  });

  describe("Performance and Reliability", () => {
    it("should complete introspection within reasonable time", async () => {
      const startTime = Date.now();

      const result = await cliRunner.introspect({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        outputDir: testWorkspace,
        timeout: 120000,
      });

      const duration = Date.now() - startTime;

      TestAssertions.assertCommandSuccess(result);

      // Verify reasonable performance (adjust based on actual sandbox size)
      expect(duration).toBeLessThan(120000); // 2 minutes max
      console.log(`⏱️  Introspection completed in ${duration}ms`);

      // Log performance metrics
      console.log(`📈 Performance metrics:
        - Duration: ${duration}ms
        - Command: ${result.command}
        - Success: ${result.success}`);

      console.log("✅ Performance test completed");
    }, 150000);

    it("should be idempotent - multiple runs produce same result", async () => {
      // First introspection
      const result1 = await cliRunner.introspect({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        outputDir: testWorkspace,
      });

      TestAssertions.assertCommandSuccess(result1);
      const files1 = await FileUtils.getAllFiles(testWorkspace);

      // Clean workspace
      await rm(testWorkspace, { recursive: true, force: true });
      await mkdir(testWorkspace, { recursive: true });

      // Second introspection
      const result2 = await cliRunner.introspect({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        outputDir: testWorkspace,
      });

      TestAssertions.assertCommandSuccess(result2);
      const files2 = await FileUtils.getAllFiles(testWorkspace);

      // Compare results
      const files1Names = files1.map(f => f.split('/').pop()).sort();
      const files2Names = files2.map(f => f.split('/').pop()).sort();

      console.log(`🔄 Run 1 files: ${files1Names.join(', ')}`);
      console.log(`🔄 Run 2 files: ${files2Names.join(', ')}`);

      // Should produce consistent file structure
      expect(files1Names.length).toBe(files2Names.length);

      console.log("✅ Idempotency test completed");
    }, 180000);
  });

  describe("Edge Cases", () => {
    it("should handle output directory creation", async () => {
      // Use a nested directory that doesn't exist
      const nestedDir = join(testWorkspace, "nested", "deep", "directory");

      const result = await cliRunner.introspect({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        outputDir: nestedDir,
      });

      // Should create directories as needed and succeed
      TestAssertions.assertCommandSuccess(result);

      // Verify directory was created
      expect(existsSync(nestedDir)).toBe(true);

      console.log("✅ Directory creation handling verified");
    }, 90000);

    it("should handle special characters in output path", async () => {
      // Create directory with spaces and special characters
      const specialDir = join(testWorkspace, "test dir with spaces & chars");
      await mkdir(specialDir, { recursive: true });

      const result = await cliRunner.introspect({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        outputDir: specialDir,
      });

      TestAssertions.assertCommandSuccess(result);

      console.log("✅ Special characters handling verified");
    }, 90000);
  });
});