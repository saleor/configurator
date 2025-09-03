import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getTestConfig, getAdminToken, waitForApi } from "../../utils/test-env.js";
import { CliRunner } from "../../utils/cli-runner.js";
import {
  createTempDir,
  cleanupTempDir,
  readYaml,
  writeYaml,
} from "../../utils/test-helpers.js";
import { assertDeploymentSuccess } from "../../utils/assertions.js";
import path from "node:path";

describe("E2E Deploy Command", () => {
  let cli: CliRunner;
  let apiUrl: string;
  let token: string;
  let testDir: string;

  beforeAll(async () => {
    console.log("🚀 Starting deploy command test setup...");
    
    testDir = await createTempDir("deploy-test-");
    
    const config = getTestConfig();
    apiUrl = config.apiUrl;
    await waitForApi(apiUrl);
    token = await getAdminToken(apiUrl, config.adminEmail, config.adminPassword);
    cli = new CliRunner({ verbose: process.env.VERBOSE === "true" });
    
    console.log("✅ Deploy command test setup complete");
  }, 60000);

  afterAll(async () => {
    await cleanupTempDir(testDir);
  });

  describe("Deploy Command Flags", () => {
    it("should handle --skip-diff flag", async () => {
      const configPath = path.join(testDir, "skip-diff-config.yml");
      
      const config = {
        shop: {
          defaultMailSenderName: "Skip Diff Store",
          defaultMailSenderAddress: "skipdiff@test.com"
        },
        channels: [
          {
            name: "Skip Diff Channel",
            slug: "skip-diff-channel",
            currencyCode: "USD",
            defaultCountry: "US"
          }
        ]
      };
      
      await writeYaml(configPath, config);
      
      // Deploy with --skip-diff should be faster and not show diff output
      console.log("⏭️ Testing --skip-diff flag...");
      const skipDiffResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(skipDiffResult);
      expect(skipDiffResult).toContainInOutput("Skip Diff Store");
      // Should not contain diff-related output
      expect(skipDiffResult.cleanStdout).not.toMatch(/diff|comparison|changes detected/i);
    }, 120000);

    it("should handle --dry-run flag", async () => {
      const configPath = path.join(testDir, "dry-run-config.yml");
      
      const config = {
        shop: {
          defaultMailSenderName: "Dry Run Store",
          defaultMailSenderAddress: "dryrun@test.com"
        },
        channels: [
          {
            name: "Dry Run Channel",
            slug: "dry-run-channel",
            currencyCode: "EUR",
            defaultCountry: "DE"
          }
        ]
      };
      
      await writeYaml(configPath, config);
      
      // Deploy with --dry-run should show what would be deployed without making changes
      console.log("🏃 Testing --dry-run flag...");
      const dryRunResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        dryRun: true
      });
      
      assertDeploymentSuccess(dryRunResult);
      expect(dryRunResult).toContainInOutput("Dry Run Store");
      expect(dryRunResult).toMatchPattern(/dry.?run|would.*deploy|preview|simulation/i);
    }, 120000);
  });

  describe("Deploy Command Validation", () => {
    it("should validate configuration before deployment", async () => {
      const invalidConfigPath = path.join(testDir, "invalid-deploy-config.yml");
      
      // Create invalid configuration
      const invalidConfig = {
        shop: {
          // Missing required defaultMailSenderName
          defaultMailSenderAddress: "invalid@test.com",
          invalidField: "this should not be here"
        },
        channels: "should-be-array", // Wrong type
        categories: [
          {
            name: "Test Category",
            // Missing required slug
            description: "Invalid category"
          }
        ]
      };
      
      await writeYaml(invalidConfigPath, invalidConfig);
      
      console.log("❌ Testing configuration validation...");
      const invalidResult = await cli.deploy(apiUrl, token, {
        config: invalidConfigPath
      });
      
      expect(invalidResult).toHaveFailed();
      expect(invalidResult).toMatchPattern(/validation|invalid|required|must be/i);
    }, 60000);

    it("should handle missing configuration file", async () => {
      const missingConfigPath = path.join(testDir, "nonexistent-config.yml");
      
      console.log("📄 Testing missing configuration file...");
      const missingResult = await cli.deploy(apiUrl, token, {
        config: missingConfigPath
      });
      
      expect(missingResult).toHaveFailed();
      expect(missingResult).toMatchPattern(/not found|does not exist|no such file/i);
    }, 30000);
  });

  describe("Deploy Command Error Handling", () => {
    it("should handle authentication errors gracefully", async () => {
      const configPath = path.join(testDir, "auth-error-config.yml");
      
      const config = {
        shop: {
          defaultMailSenderName: "Auth Error Store",
          defaultMailSenderAddress: "autherror@test.com"
        },
        channels: []
      };
      
      await writeYaml(configPath, config);
      
      console.log("🔐 Testing authentication error handling...");
      const authErrorResult = await cli.deploy(apiUrl, "invalid-token-12345", {
        config: configPath
      });
      
      expect(authErrorResult).toHaveFailed();
      expect(authErrorResult).toMatchPattern(/auth|permission|unauthorized|token|invalid/i);
    }, 60000);

    it("should handle network errors gracefully", async () => {
      const configPath = path.join(testDir, "network-error-config.yml");
      
      const config = {
        shop: {
          defaultMailSenderName: "Network Error Store",
          defaultMailSenderAddress: "networkerror@test.com"
        },
        channels: []
      };
      
      await writeYaml(configPath, config);
      
      console.log("🌐 Testing network error handling...");
      const networkErrorResult = await cli.deploy("http://localhost:99999/graphql/", token, {
        config: configPath,
        timeout: 5000
      });
      
      expect(networkErrorResult).toHaveFailed();
      expect(networkErrorResult).toMatchPattern(/connect|network|ECONNREFUSED|timeout|unreachable/i);
    }, 30000);
  });

  describe("Deploy Command Output Formats", () => {
    it("should provide detailed deployment progress", async () => {
      const configPath = path.join(testDir, "progress-config.yml");
      
      const config = {
        shop: {
          defaultMailSenderName: "Progress Test Store",
          defaultMailSenderAddress: "progress@test.com",
          description: "Testing deployment progress output"
        },
        channels: [
          {
            name: "Progress Channel",
            slug: "progress-channel", 
            currencyCode: "USD",
            defaultCountry: "US"
          }
        ],
        categories: [
          {
            name: "Progress Category",
            slug: "progress-category",
            description: "Category for testing progress"
          }
        ],
        productTypes: [
          {
            name: "Progress Product Type",
            slug: "progress-product-type",
            hasVariants: false
          }
        ]
      };
      
      await writeYaml(configPath, config);
      
      console.log("📊 Testing deployment progress output...");
      const progressResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(progressResult);
      
      // Should contain progress indicators
      expect(progressResult).toContainInOutput("Progress Test Store");
      expect(progressResult).toContainInOutput("Progress Channel");
      expect(progressResult).toContainInOutput("Progress Category"); 
      expect(progressResult).toContainInOutput("Progress Product Type");
      
      // Should indicate completion
      expect(progressResult).toMatchPattern(/completed|success|deployed|finished/i);
    }, 120000);
  });

  describe("Deploy Command with Different Entity Types", () => {
    it("should deploy all supported entity types", async () => {
      const configPath = path.join(testDir, "all-entities-config.yml");
      
      const config = {
        shop: {
          defaultMailSenderName: "All Entities Store",
          defaultMailSenderAddress: "allentities@test.com",
          description: "Store with all entity types"
        },
        channels: [
          {
            name: "All Entities Channel",
            slug: "all-entities-channel",
            currencyCode: "USD",
            defaultCountry: "US"
          }
        ],
        categories: [
          {
            name: "All Entities Category",
            slug: "all-entities-category",
            description: "Category with all entities"
          }
        ],
        productTypes: [
          {
            name: "All Entities Product Type",
            slug: "all-entities-product-type",
            hasVariants: true,
            productAttributes: [
              {
                name: "Test Attribute",
                slug: "test-attribute",
                type: "PLAIN_TEXT",
                inputType: "PLAIN_TEXT"
              }
            ],
            variantAttributes: [
              {
                name: "Test Variant Attribute",
                slug: "test-variant-attribute",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                choices: ["Option 1", "Option 2"]
              }
            ]
          }
        ],
        pageTypes: [
          {
            name: "All Entities Page Type",
            slug: "all-entities-page-type",
            attributes: [
              {
                name: "Page Test Attribute",
                slug: "page-test-attribute",
                type: "RICH_TEXT",
                inputType: "RICH_TEXT"
              }
            ]
          }
        ]
      };
      
      await writeYaml(configPath, config);
      
      console.log("🏭 Testing deployment of all entity types...");
      const allEntitiesResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(allEntitiesResult);
      
      // Verify all entity types are mentioned in output
      expect(allEntitiesResult).toContainInOutput("All Entities Store");
      expect(allEntitiesResult).toContainInOutput("All Entities Channel");
      expect(allEntitiesResult).toContainInOutput("All Entities Category");
      expect(allEntitiesResult).toContainInOutput("All Entities Product Type");
      expect(allEntitiesResult).toContainInOutput("All Entities Page Type");
      
      console.log("✅ All entity types deployed successfully");
    }, 60000);
  });
});