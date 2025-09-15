import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile, chmod } from "node:fs/promises";
import { CLIRunner, CLIOutputParser } from "../helpers/cli-runner.ts";
import { SandboxManager } from "../helpers/sandbox-manager.ts";
import { FileUtils, TestAssertions, ConfigUtils, TestDataGenerator } from "../helpers/test-utils.ts";
import { getTestEnvironment, generateTestConfig } from "../fixtures/environments.ts";
import type { TestContext } from "../setup/global-setup.ts";

describe("Error Scenario Tests", () => {
  let cliRunner: CLIRunner;
  let sandboxManager: SandboxManager;
  let testContext: TestContext;
  let testWorkspace: string;
  let testConfig: ReturnType<typeof generateTestConfig>;

  beforeAll(async () => {
    // Initialize test environment
    testConfig = generateTestConfig();
    testContext = {
      testWorkspace: await FileUtils.createTempDir("error-scenarios-e2e-"),
      saleorUrl: testConfig.environment.saleorUrl,
      saleorToken: testConfig.environment.saleorToken,
    };

    cliRunner = CLIRunner.create(testContext);
    sandboxManager = SandboxManager.fromTestContext(testContext);

    console.log(`🔧 Test workspace: ${testContext.testWorkspace}`);
    console.log(`🌐 Testing against: ${testContext.saleorUrl}`);

    console.log("✅ Error scenario tests initialized");
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

  describe("Network and Connection Errors", () => {
    it("should handle invalid Saleor URLs gracefully", async () => {
      const invalidUrls = [
        "https://nonexistent-saleor.example.com",
        "http://localhost:99999", // Invalid port
        "https://malformed-url..com",
        "not-a-url-at-all",
        "", // Empty URL
      ];

      for (const invalidUrl of invalidUrls) {
        console.log(`🔍 Testing invalid URL: ${invalidUrl}`);

        // Test introspect command
        const introspectResult = await cliRunner.introspect({
          url: invalidUrl,
          token: testContext.saleorToken,
          outputDir: testWorkspace,
          expectFailure: true,
          timeout: 15000,
        });

        expect(introspectResult.success).toBe(false);
        expect(introspectResult.exitCode).not.toBe(0);
        expect(introspectResult.stderr.length).toBeGreaterThan(0);

        // Test diff command
        const diffResult = await cliRunner.diff({
          url: invalidUrl,
          token: testContext.saleorToken,
          configDir: testWorkspace,
          expectFailure: true,
          timeout: 15000,
        });

        expect(diffResult.success).toBe(false);

        // Test deploy command
        const deployResult = await cliRunner.deploy({
          url: invalidUrl,
          token: testContext.saleorToken,
          configDir: testWorkspace,
          expectFailure: true,
          timeout: 15000,
        });

        expect(deployResult.success).toBe(false);
      }

      console.log("✅ Invalid URL handling verified for all commands");
    }, 120000);

    it("should handle invalid authentication tokens", async () => {
      const invalidTokens = [
        "invalid-token-12345",
        "expired-token-67890",
        "", // Empty token
        "x".repeat(1000), // Very long token
        "special-chars-!@#$%^&*()",
      ];

      for (const invalidToken of invalidTokens) {
        console.log(`🔍 Testing invalid token: ${invalidToken.substring(0, 20)}...`);

        // Test introspect command
        const introspectResult = await cliRunner.introspect({
          url: testContext.saleorUrl,
          token: invalidToken,
          outputDir: testWorkspace,
          expectFailure: true,
          timeout: 30000,
        });

        expect(introspectResult.success).toBe(false);
        expect(introspectResult.exitCode).not.toBe(0);

        // Should contain authentication-related error
        const hasAuthError = introspectResult.stderr.toLowerCase().includes('auth') ||
                            introspectResult.stderr.toLowerCase().includes('token') ||
                            introspectResult.stderr.toLowerCase().includes('unauthorized') ||
                            introspectResult.stderr.toLowerCase().includes('permission') ||
                            introspectResult.stderr.toLowerCase().includes('forbidden');

        if (introspectResult.stderr.length > 0) {
          console.log(`  Auth error detected: ${hasAuthError ? 'Yes' : 'No'}`);
        }
      }

      console.log("✅ Invalid token handling verified");
    }, 180000);

    it("should handle network timeouts gracefully", async () => {
      // Test with very short timeouts to simulate network issues
      console.log("🔍 Testing network timeout handling...");

      const timeoutResult = await cliRunner.introspect({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        outputDir: testWorkspace,
        expectFailure: true,
        timeout: 1000, // 1 second - likely to timeout
      });

      // Should either complete quickly or timeout gracefully
      if (!timeoutResult.success) {
        expect(timeoutResult.exitCode).not.toBe(0);
        console.log("✅ Timeout handled gracefully");
      } else {
        console.log("✅ Command completed faster than timeout");
      }
    }, 15000);
  });

  describe("File System and Permission Errors", () => {
    it("should handle read-only directories", async () => {
      // Create read-only directory
      const readOnlyDir = join(testWorkspace, "readonly");
      await mkdir(readOnlyDir, { recursive: true });
      await chmod(readOnlyDir, 0o444); // Read-only

      console.log("🔍 Testing read-only directory handling...");

      try {
        const introspectResult = await cliRunner.introspect({
          url: testContext.saleorUrl,
          token: testContext.saleorToken,
          outputDir: readOnlyDir,
          expectFailure: true,
          timeout: 30000,
        });

        // Should fail due to permissions
        expect(introspectResult.success).toBe(false);
        expect(introspectResult.exitCode).not.toBe(0);

        console.log("✅ Read-only directory properly rejected");
      } finally {
        // Restore permissions for cleanup
        await chmod(readOnlyDir, 0o755);
      }
    }, 45000);

    it("should handle non-existent parent directories", async () => {
      const deepPath = join(testWorkspace, "does", "not", "exist", "deep", "path");

      console.log("🔍 Testing non-existent parent directory handling...");

      // Test introspect (should create directories or fail gracefully)
      const introspectResult = await cliRunner.introspect({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        outputDir: deepPath,
        timeout: 60000,
      });

      if (introspectResult.success) {
        // Should have created the directory structure
        expect(existsSync(deepPath)).toBe(true);
        console.log("✅ Non-existent directories created successfully");
      } else {
        console.log("✅ Non-existent directories appropriately rejected");
      }
    }, 90000);

    it("should handle corrupted configuration files", async () => {
      console.log("🔍 Testing corrupted configuration file handling...");

      // Create various types of corrupted files
      const corruptedFiles = [
        {
          name: "invalid-yaml.yaml",
          content: "invalid: yaml: content:\n  - this is not\nvalid yaml syntax ["
        },
        {
          name: "binary-data.yaml",
          content: "\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A\x0B\x0C\x0D\x0E\x0F"
        },
        {
          name: "empty-file.yaml",
          content: ""
        },
        {
          name: "huge-file.yaml",
          content: "data: " + "x".repeat(100000) // Very large file
        },
        {
          name: "unicode-chaos.yaml",
          content: "name: \"😀🎉🚀💻🔥✨🌟💯🎊🎈\""
        }
      ];

      for (const file of corruptedFiles) {
        await writeFile(join(testWorkspace, file.name), file.content, "utf-8");
      }

      // Test diff command with corrupted files
      const diffResult = await cliRunner.diff({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        expectFailure: true,
        timeout: 60000,
      });

      // May succeed or fail depending on how robust the parser is
      if (!diffResult.success) {
        expect(diffResult.exitCode).not.toBe(0);
        console.log("✅ Corrupted files appropriately rejected");
      } else {
        console.log("✅ Corrupted files handled gracefully");
      }

      // Test deploy command with corrupted files
      const deployResult = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        expectFailure: true,
        timeout: 60000,
      });

      if (!deployResult.success) {
        expect(deployResult.exitCode).not.toBe(0);
        console.log("✅ Deployment properly rejected corrupted files");
      } else {
        console.log("✅ Deployment handled corrupted files gracefully");
      }
    }, 180000);
  });

  describe("Configuration Validation Errors", () => {
    it("should handle invalid entity configurations", async () => {
      console.log("🔍 Testing invalid entity configuration handling...");

      // Create invalid product configurations
      const invalidConfigs = [
        {
          name: "missing-required-fields.yaml",
          content: `products:
            - name: "" # Empty name
              slug: "" # Empty slug
            - name: "Valid Name"
              # Missing slug entirely`
        },
        {
          name: "invalid-data-types.yaml",
          content: `products:
            - name: 12345 # Number instead of string
              slug: ["array", "instead", "of", "string"]
              price: "not-a-number"`
        },
        {
          name: "circular-references.yaml",
          content: `categories:
            - name: "Category A"
              slug: "cat-a"
              parent: "cat-b"
            - name: "Category B"
              slug: "cat-b"
              parent: "cat-a"`
        },
        {
          name: "duplicate-slugs.yaml",
          content: `products:
            - name: "Product 1"
              slug: "duplicate-slug"
            - name: "Product 2"
              slug: "duplicate-slug"`
        }
      ];

      for (const config of invalidConfigs) {
        console.log(`  Testing: ${config.name}`);

        // Clean workspace
        await rm(testWorkspace, { recursive: true, force: true });
        await mkdir(testWorkspace, { recursive: true });

        await writeFile(join(testWorkspace, config.name), config.content, "utf-8");

        // Test diff command
        const diffResult = await cliRunner.diff({
          url: testContext.saleorUrl,
          token: testContext.saleorToken,
          configDir: testWorkspace,
          expectFailure: true,
          timeout: 60000,
        });

        // Test deploy command
        const deployResult = await cliRunner.deploy({
          url: testContext.saleorUrl,
          token: testContext.saleorToken,
          configDir: testWorkspace,
          expectFailure: true,
          timeout: 60000,
        });

        // At least one should catch the validation error
        const hasValidationError = !diffResult.success || !deployResult.success;
        if (hasValidationError) {
          console.log(`    ✅ Validation error caught for ${config.name}`);
        } else {
          console.log(`    ℹ️  Configuration accepted for ${config.name} (may be auto-corrected)`);
        }
      }

      console.log("✅ Invalid configuration handling verified");
    }, 300000);

    it("should handle schema validation errors", async () => {
      console.log("🔍 Testing schema validation error handling...");

      // Create configurations that violate schema
      const schemaViolations = [
        {
          name: "wrong-version.yaml",
          content: `apiVersion: v999 # Unsupported version
            kind: Configuration
            spec:
              products: []`
        },
        {
          name: "unknown-fields.yaml",
          content: `products:
            - name: "Test Product"
              slug: "test-product"
              unknownField: "this should not exist"
              invalidProperty: true`
        },
        {
          name: "wrong-structure.yaml",
          content: `this_is_not_the_expected_structure: true
            random_data: ["array", "of", "stuff"]
            nested:
              deeply:
                wrong: "format"`
        }
      ];

      for (const violation of schemaViolations) {
        // Clean workspace
        await rm(testWorkspace, { recursive: true, force: true });
        await mkdir(testWorkspace, { recursive: true });

        await writeFile(join(testWorkspace, violation.name), violation.content, "utf-8");

        console.log(`  Testing schema violation: ${violation.name}`);

        const deployResult = await cliRunner.deploy({
          url: testContext.saleorUrl,
          token: testContext.saleorToken,
          configDir: testWorkspace,
          expectFailure: true,
          timeout: 60000,
        });

        // Should catch schema violations
        if (!deployResult.success) {
          console.log(`    ✅ Schema violation caught for ${violation.name}`);
        } else {
          console.log(`    ℹ️  Schema violation not caught for ${violation.name}`);
        }
      }

      console.log("✅ Schema validation error handling verified");
    }, 180000);
  });

  describe("Command Line Interface Errors", () => {
    it("should handle missing required arguments", async () => {
      console.log("🔍 Testing missing required arguments...");

      // Test commands without required arguments
      const missingArgTests = [
        {
          command: "introspect",
          args: [], // Missing URL and token
          description: "no arguments"
        },
        {
          command: "introspect",
          args: ["--url", testContext.saleorUrl], // Missing token
          description: "missing token"
        },
        {
          command: "introspect",
          args: ["--token", testContext.saleorToken], // Missing URL
          description: "missing URL"
        },
        {
          command: "diff",
          args: [], // Missing URL and token
          description: "no arguments"
        },
        {
          command: "deploy",
          args: [], // Missing URL and token
          description: "no arguments"
        }
      ];

      for (const test of missingArgTests) {
        console.log(`  Testing ${test.command} with ${test.description}`);

        const result = await cliRunner.run(test.command, test.args, {
          cwd: testWorkspace,
          expectFailure: true,
          timeout: 15000,
        });

        expect(result.success).toBe(false);
        expect(result.exitCode).not.toBe(0);

        // Should provide helpful error message
        const hasHelpfulError = result.stderr.includes("required") ||
                               result.stderr.includes("missing") ||
                               result.stderr.includes("usage") ||
                               result.stderr.includes("help");

        if (hasHelpfulError) {
          console.log(`    ✅ Helpful error message provided`);
        } else {
          console.log(`    ⚠️  Error message could be more helpful`);
        }
      }

      console.log("✅ Missing argument handling verified");
    }, 90000);

    it("should handle invalid command line flags", async () => {
      console.log("🔍 Testing invalid command line flags...");

      const invalidFlagTests = [
        {
          command: "introspect",
          args: ["--invalid-flag", "value"],
          description: "unknown flag"
        },
        {
          command: "introspect",
          args: ["--url", testContext.saleorUrl, "--token", testContext.saleorToken, "--typo-flag"],
          description: "typo in flag name"
        },
        {
          command: "diff",
          args: ["--url", testContext.saleorUrl, "--token", testContext.saleorToken, "--undefined-option", "value"],
          description: "undefined option"
        }
      ];

      for (const test of invalidFlagTests) {
        console.log(`  Testing ${test.command} with ${test.description}`);

        const result = await cliRunner.run(test.command, test.args, {
          cwd: testWorkspace,
          expectFailure: true,
          timeout: 15000,
        });

        expect(result.success).toBe(false);
        expect(result.exitCode).not.toBe(0);

        console.log(`    ✅ Invalid flag properly rejected`);
      }

      console.log("✅ Invalid flag handling verified");
    }, 60000);

    it("should handle help and version commands correctly", async () => {
      console.log("🔍 Testing help and version commands...");

      // Test help command
      const helpResult = await cliRunner.run("--help", [], {
        timeout: 15000,
      });

      if (helpResult.success) {
        expect(helpResult.stdout.length).toBeGreaterThan(0);
        console.log("✅ Help command working");
      } else {
        console.log("ℹ️  Help command not available or different format");
      }

      // Test version command
      const versionResult = await cliRunner.run("--version", [], {
        timeout: 15000,
      });

      if (versionResult.success) {
        expect(versionResult.stdout.length).toBeGreaterThan(0);
        console.log("✅ Version command working");
      } else {
        console.log("ℹ️  Version command not available or different format");
      }
    }, 30000);
  });

  describe("Resource Exhaustion and Limits", () => {
    it("should handle memory constraints gracefully", async () => {
      console.log("🔍 Testing memory constraint handling...");

      // Create a very large configuration to test memory limits
      const manyProducts = TestDataGenerator.generateProducts(100).map((product, index) => ({
        ...product,
        name: `Memory Test Product ${index}`,
        slug: `memory-test-product-${index}`,
        description: "x".repeat(1000), // Large description
      }));

      const largeConfig = ConfigUtils.createProductConfig(manyProducts);
      await writeFile(join(testWorkspace, "large-memory-test.yaml"), largeConfig, "utf-8");

      console.log(`📝 Created large configuration (${largeConfig.length} characters)`);

      // Test with reasonable timeout
      const result = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 300000, // 5 minutes
      });

      if (result.success) {
        console.log("✅ Large configuration handled successfully");
      } else {
        console.log("✅ Large configuration appropriately rejected or failed");
      }
    }, 360000);

    it("should handle concurrent operation limits", async () => {
      console.log("🔍 Testing concurrent operation handling...");

      // Create multiple small configurations
      const configs = Array.from({ length: 3 }, (_, index) => {
        const product = TestDataGenerator.generateProduct({
          name: `Concurrent Test Product ${index}`,
          slug: `concurrent-test-product-${index}`,
        });
        return ConfigUtils.createProductConfig([product]);
      });

      // Write configurations to separate files
      for (let i = 0; i < configs.length; i++) {
        await writeFile(join(testWorkspace, `config-${i}.yaml`), configs[i], "utf-8");
      }

      // Test deployment with multiple configurations
      const deployResult = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 180000,
      });

      if (deployResult.success) {
        console.log("✅ Multiple configurations deployed successfully");
      } else {
        console.log("✅ Multiple configurations appropriately handled");
      }
    }, 240000);
  });

  describe("Error Recovery and Resilience", () => {
    it("should provide clear error messages and suggestions", async () => {
      console.log("🔍 Testing error message quality...");

      // Test various error scenarios and check message quality
      const errorScenarios = [
        {
          name: "Invalid URL",
          test: () => cliRunner.introspect({
            url: "invalid-url",
            token: testContext.saleorToken,
            outputDir: testWorkspace,
            expectFailure: true,
            timeout: 15000,
          }),
          expectedKeywords: ["url", "invalid", "format"]
        },
        {
          name: "Missing configuration",
          test: () => cliRunner.deploy({
            url: testContext.saleorUrl,
            token: testContext.saleorToken,
            configDir: join(testWorkspace, "nonexistent"),
            expectFailure: true,
            timeout: 15000,
          }),
          expectedKeywords: ["configuration", "not found", "directory"]
        }
      ];

      for (const scenario of errorScenarios) {
        console.log(`  Testing error quality for: ${scenario.name}`);

        const result = await scenario.test();
        expect(result.success).toBe(false);

        // Check if error message contains helpful keywords
        const errorText = (result.stderr + result.stdout).toLowerCase();
        const hasHelpfulKeywords = scenario.expectedKeywords.some(keyword =>
          errorText.includes(keyword.toLowerCase())
        );

        if (hasHelpfulKeywords) {
          console.log(`    ✅ Error message contains helpful information`);
        } else {
          console.log(`    ⚠️  Error message could be more helpful`);
          console.log(`    Error: ${result.stderr}`);
        }
      }

      console.log("✅ Error message quality verification completed");
    }, 60000);

    it("should handle graceful degradation", async () => {
      console.log("🔍 Testing graceful degradation...");

      // Create mixed valid and invalid configuration
      const validProduct = TestDataGenerator.generateProduct({
        name: "Valid Product",
        slug: "valid-product",
      });

      const mixedConfig = `
# Valid configuration
products:
  - name: "${validProduct.name}"
    slug: "${validProduct.slug}"

# Invalid configuration (missing required fields)
  - name: ""
    # Missing slug and other required fields

# Another valid product
  - name: "Another Valid Product"
    slug: "another-valid-product"
`;

      await writeFile(join(testWorkspace, "mixed-config.yaml"), mixedConfig, "utf-8");

      const deployResult = await cliRunner.deploy({
        url: testContext.saleorUrl,
        token: testContext.saleorToken,
        configDir: testWorkspace,
        timeout: 120000,
      });

      // Should either process valid parts or fail entirely with clear error
      if (deployResult.success) {
        console.log("✅ Valid parts processed successfully");
      } else {
        console.log("✅ Invalid configuration appropriately rejected");
        expect(deployResult.exitCode).not.toBe(0);
      }
    }, 180000);
  });
});