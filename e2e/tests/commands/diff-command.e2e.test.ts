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

describe("E2E Diff Command - Critical Accuracy Tests", () => {
  let cli: CliRunner;
  let apiUrl: string;
  let token: string;
  let testDir: string;

  beforeAll(async () => {
    console.log("🚀 Starting diff command test setup...");
    
    testDir = await createTempDir("diff-command-test-");
    
    const config = getTestConfig();
    apiUrl = config.apiUrl;
    await waitForApi(apiUrl);
    token = await getAdminToken(apiUrl, config.adminEmail, config.adminPassword);
    cli = new CliRunner({ verbose: process.env.VERBOSE === "true" });
    
    console.log("✅ Diff command test setup complete");
  }, 60000);

  afterAll(async () => {
    await cleanupTempDir(testDir);
  });

  describe("Diff Accuracy - Core Functionality", () => {
    it("should show no differences after deploy", async () => {
      const configPath = path.join(testDir, "no-diff-config.yml");
      
      const config = {
        shop: {
          defaultMailSenderName: "No Diff Test Store",
          defaultMailSenderAddress: "nodiff@test.com",
          description: "Store for testing diff accuracy"
        },
        channels: [
          {
            name: "No Diff Channel",
            slug: "no-diff-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true
          }
        ],
        categories: [
          {
            name: "No Diff Category",
            slug: "no-diff-category",
            description: "Category for diff testing"
          }
        ]
      };
      
      await writeYaml(configPath, config);
      
      // Deploy the configuration
      console.log("📤 Deploying initial configuration...");
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(deployResult);
      
      // Run diff - should show no changes
      console.log("🔍 Running diff after deployment...");
      const diffResult = await cli.diff(apiUrl, token, {
        config: configPath
      });
      
      expect(diffResult).toHaveSucceeded();
      expect(diffResult).toContainInOutput("No differences found");
      expect(diffResult).toContainInOutput("configurations are in sync");
      
      // Should not show any specific entity changes
      expect(diffResult.cleanStdout).not.toMatch(/CREATE|UPDATE|DELETE/i);
      expect(diffResult.cleanStdout).not.toMatch(/shop|channel|category/i);
    }, 120000);

    it("should accurately detect CREATE operations", async () => {
      const configPath = path.join(testDir, "create-diff-config.yml");
      
      // Start with minimal config
      const initialConfig = {
        shop: {
          defaultMailSenderName: "Create Diff Store",
          defaultMailSenderAddress: "create@test.com"
        },
        channels: [],
        categories: []
      };
      
      await writeYaml(configPath, initialConfig);
      
      // Deploy minimal config
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(deployResult);
      
      // Add new entities
      const expandedConfig = {
        ...initialConfig,
        channels: [
          {
            name: "New Channel",
            slug: "new-channel",
            currencyCode: "EUR",
            defaultCountry: "DE",
            isActive: true
          }
        ],
        categories: [
          {
            name: "New Category",
            slug: "new-category",
            description: "A brand new category"
          },
          {
            name: "Another Category",
            slug: "another-category",
            description: "Another new category"
          }
        ]
      };
      
      await writeYaml(configPath, expandedConfig);
      
      // Run diff - should show CREATE operations
      console.log("🔍 Running diff to detect CREATE operations...");
      const diffResult = await cli.diff(apiUrl, token, {
        config: configPath
      });
      
      expect(diffResult).toHaveSucceeded();
      expect(diffResult).toContainInOutput("differences");
      expect(diffResult).toMatchPattern(/3.*difference/); // 1 channel + 2 categories
      
      // Should mention CREATE operations
      expect(diffResult).toMatchPattern(/create/i);
      
      // Should mention the specific entities being created
      expect(diffResult).toMatchPattern(/new.*channel/i);
      expect(diffResult).toMatchPattern(/new.*category/i);
      expect(diffResult).toMatchPattern(/another.*category/i);
    }, 120000);

    it("should accurately detect UPDATE operations", async () => {
      const configPath = path.join(testDir, "update-diff-config.yml");
      
      // Start with existing entities
      const initialConfig = {
        shop: {
          defaultMailSenderName: "Update Diff Store",
          defaultMailSenderAddress: "update@test.com",
          description: "Original description"
        },
        channels: [
          {
            name: "Update Channel",
            slug: "update-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true
          }
        ],
        categories: [
          {
            name: "Update Category",
            slug: "update-category",
            description: "Original category description"
          }
        ]
      };
      
      await writeYaml(configPath, initialConfig);
      
      // Deploy initial config
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(deployResult);
      
      // Modify existing entities
      const updatedConfig = {
        shop: {
          defaultMailSenderName: "Update Diff Store - MODIFIED",
          defaultMailSenderAddress: "update@test.com",
          description: "UPDATED description with changes"
        },
        channels: [
          {
            name: "Update Channel - RENAMED",
            slug: "update-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true
          }
        ],
        categories: [
          {
            name: "Update Category",
            slug: "update-category",
            description: "COMPLETELY NEW category description"
          }
        ]
      };
      
      await writeYaml(configPath, updatedConfig);
      
      // Run diff - should show UPDATE operations
      console.log("🔍 Running diff to detect UPDATE operations...");
      const diffResult = await cli.diff(apiUrl, token, {
        config: configPath
      });
      
      expect(diffResult).toHaveSucceeded();
      expect(diffResult).toContainInOutput("differences");
      expect(diffResult).toMatchPattern(/3.*difference/); // shop + channel + category
      
      // Should mention UPDATE operations
      expect(diffResult).toMatchPattern(/update/i);
      
      // Should mention the modified entities
      expect(diffResult).toMatchPattern(/shop/i);
      expect(diffResult).toMatchPattern(/channel/i);
      expect(diffResult).toMatchPattern(/category/i);
    }, 120000);

    it("should accurately detect DELETE operations", async () => {
      const configPath = path.join(testDir, "delete-diff-config.yml");
      
      // Start with multiple entities
      const fullConfig = {
        shop: {
          defaultMailSenderName: "Delete Diff Store",
          defaultMailSenderAddress: "delete@test.com"
        },
        channels: [
          {
            name: "Keep Channel",
            slug: "keep-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true
          },
          {
            name: "Delete Channel",
            slug: "delete-channel",
            currencyCode: "EUR",
            defaultCountry: "DE",
            isActive: true
          }
        ],
        categories: [
          {
            name: "Keep Category",
            slug: "keep-category",
            description: "This category will be kept"
          },
          {
            name: "Delete Category",
            slug: "delete-category",
            description: "This category will be removed"
          }
        ]
      };
      
      await writeYaml(configPath, fullConfig);
      
      // Deploy full config
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(deployResult);
      
      // Remove some entities
      const reducedConfig = {
        shop: {
          defaultMailSenderName: "Delete Diff Store",
          defaultMailSenderAddress: "delete@test.com"
        },
        channels: [
          {
            name: "Keep Channel",
            slug: "keep-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true
          }
        ],
        categories: [
          {
            name: "Keep Category",
            slug: "keep-category",
            description: "This category will be kept"
          }
        ]
      };
      
      await writeYaml(configPath, reducedConfig);
      
      // Run diff - should show DELETE operations
      console.log("🔍 Running diff to detect DELETE operations...");
      const diffResult = await cli.diff(apiUrl, token, {
        config: configPath
      });
      
      expect(diffResult).toHaveSucceeded();
      expect(diffResult).toContainInOutput("differences");
      expect(diffResult).toMatchPattern(/2.*difference/); // 1 channel + 1 category deletion
      
      // Should mention DELETE operations
      expect(diffResult).toMatchPattern(/delete/i);
      
      // Should mention the entities being deleted
      expect(diffResult).toMatchPattern(/delete.*channel/i);
      expect(diffResult).toMatchPattern(/delete.*category/i);
    }, 120000);

    it("should show mixed CREATE, UPDATE, DELETE operations correctly", async () => {
      const configPath = path.join(testDir, "mixed-diff-config.yml");
      
      // Start with baseline config
      const baselineConfig = {
        shop: {
          defaultMailSenderName: "Mixed Diff Store",
          defaultMailSenderAddress: "mixed@test.com",
          description: "Original description"
        },
        channels: [
          {
            name: "Existing Channel",
            slug: "existing-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true
          },
          {
            name: "Will Be Deleted",
            slug: "will-be-deleted",
            currencyCode: "EUR",
            defaultCountry: "DE",
            isActive: true
          }
        ],
        categories: [
          {
            name: "Keep Category",
            slug: "keep-category",
            description: "Will be kept as-is"
          },
          {
            name: "Update Category",
            slug: "update-category",
            description: "Will be modified"
          }
        ]
      };
      
      await writeYaml(configPath, baselineConfig);
      
      // Deploy baseline
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(deployResult);
      
      // Create mixed changes
      const mixedConfig = {
        shop: {
          defaultMailSenderName: "Mixed Diff Store - UPDATED", // UPDATE
          defaultMailSenderAddress: "mixed@test.com",
          description: "UPDATED description"
        },
        channels: [
          {
            name: "Existing Channel",
            slug: "existing-channel", 
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true // UNCHANGED
          },
          {
            name: "Brand New Channel", // CREATE
            slug: "brand-new-channel",
            currencyCode: "GBP",
            defaultCountry: "GB",
            isActive: true
          }
          // "will-be-deleted" channel removed = DELETE
        ],
        categories: [
          {
            name: "Keep Category",
            slug: "keep-category",
            description: "Will be kept as-is" // UNCHANGED
          },
          {
            name: "Update Category",
            slug: "update-category",
            description: "MODIFIED description" // UPDATE
          },
          {
            name: "New Category", // CREATE
            slug: "new-category",
            description: "Completely new category"
          }
        ]
      };
      
      await writeYaml(configPath, mixedConfig);
      
      // Run diff - should show mixed operations
      console.log("🔍 Running diff to detect mixed operations...");
      const diffResult = await cli.diff(apiUrl, token, {
        config: configPath
      });
      
      expect(diffResult).toHaveSucceeded();
      expect(diffResult).toContainInOutput("differences");
      
      // Should show total changes: 1 shop update + 1 channel delete + 1 channel create + 1 category update + 1 category create = 5
      expect(diffResult).toMatchPattern(/5.*difference/);
      
      // Should show all operation types
      expect(diffResult).toMatchPattern(/create/i);
      expect(diffResult).toMatchPattern(/update/i);
      expect(diffResult).toMatchPattern(/delete/i);
      
      // Should mention specific entities
      expect(diffResult).toMatchPattern(/brand.*new.*channel/i);
      expect(diffResult).toMatchPattern(/new.*category/i);
      expect(diffResult).toMatchPattern(/will.*be.*deleted/i);
    }, 120000);
  });

  describe("Diff with Selective Operations", () => {
    it("should only show differences for included sections", async () => {
      const configPath = path.join(testDir, "selective-diff-config.yml");
      
      const config = {
        shop: {
          defaultMailSenderName: "Selective Diff Store",
          defaultMailSenderAddress: "selective@test.com"
        },
        channels: [
          {
            name: "Selective Channel",
            slug: "selective-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true
          }
        ],
        categories: [
          {
            name: "Selective Category",
            slug: "selective-category",
            description: "Original description"
          }
        ]
      };
      
      await writeYaml(configPath, config);
      
      // Deploy initial config
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(deployResult);
      
      // Modify ALL sections
      const modifiedConfig = {
        shop: {
          defaultMailSenderName: "MODIFIED Selective Diff Store",
          defaultMailSenderAddress: "selective@test.com"
        },
        channels: [
          {
            name: "MODIFIED Selective Channel",
            slug: "selective-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true
          }
        ],
        categories: [
          {
            name: "Selective Category",
            slug: "selective-category",
            description: "MODIFIED description"
          }
        ]
      };
      
      await writeYaml(configPath, modifiedConfig);
      
      // Run diff with --include shop only
      console.log("🎯 Running diff with --include shop...");
      const shopOnlyDiff = await cli.diff(apiUrl, token, {
        config: configPath,
        include: ["shop"]
      });
      
      expect(shopOnlyDiff).toHaveSucceeded();
      expect(shopOnlyDiff).toContainInOutput("1"); // Only 1 change (shop)
      expect(shopOnlyDiff).toMatchPattern(/shop/i);
      expect(shopOnlyDiff.cleanStdout).not.toMatch(/channel/i);
      expect(shopOnlyDiff.cleanStdout).not.toMatch(/category/i);
      
      // Run diff with --include categories only
      console.log("📂 Running diff with --include categories...");
      const categoriesOnlyDiff = await cli.diff(apiUrl, token, {
        config: configPath,
        include: ["categories"]
      });
      
      expect(categoriesOnlyDiff).toHaveSucceeded();
      expect(categoriesOnlyDiff).toContainInOutput("1"); // Only 1 change (category)
      expect(categoriesOnlyDiff).toMatchPattern(/category/i);
      expect(categoriesOnlyDiff.cleanStdout).not.toMatch(/shop/i);
      expect(categoriesOnlyDiff.cleanStdout).not.toMatch(/channel/i);
    }, 120000);

    it("should exclude specified sections from diff", async () => {
      const configPath = path.join(testDir, "exclude-diff-config.yml");
      
      const config = {
        shop: {
          defaultMailSenderName: "Exclude Diff Store",
          defaultMailSenderAddress: "exclude@test.com"
        },
        channels: [
          {
            name: "Exclude Channel",
            slug: "exclude-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true
          }
        ],
        categories: [
          {
            name: "Exclude Category",
            slug: "exclude-category",
            description: "Original description"
          }
        ]
      };
      
      await writeYaml(configPath, config);
      
      // Deploy initial config
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(deployResult);
      
      // Modify ALL sections
      const modifiedConfig = {
        shop: {
          defaultMailSenderName: "MODIFIED Exclude Diff Store",
          defaultMailSenderAddress: "exclude@test.com"
        },
        channels: [
          {
            name: "MODIFIED Exclude Channel", 
            slug: "exclude-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true
          }
        ],
        categories: [
          {
            name: "Exclude Category",
            slug: "exclude-category",
            description: "MODIFIED description"
          }
        ]
      };
      
      await writeYaml(configPath, modifiedConfig);
      
      // Run diff excluding shop
      console.log("🚫 Running diff with --exclude shop...");
      const excludeShopDiff = await cli.diff(apiUrl, token, {
        config: configPath,
        exclude: ["shop"]
      });
      
      expect(excludeShopDiff).toHaveSucceeded();
      expect(excludeShopDiff).toContainInOutput("2"); // channels + categories changes only
      expect(excludeShopDiff).toMatchPattern(/channel/i);
      expect(excludeShopDiff).toMatchPattern(/category/i);
      expect(excludeShopDiff.cleanStdout).not.toMatch(/shop/i);
    }, 120000);
  });

  describe("Diff Output Validation", () => {
    it("should exit with code 0 when no differences", async () => {
      const configPath = path.join(testDir, "exit-code-config.yml");
      
      const config = {
        shop: {
          defaultMailSenderName: "Exit Code Store",
          defaultMailSenderAddress: "exitcode@test.com"
        },
        channels: []
      };
      
      await writeYaml(configPath, config);
      
      // Deploy config
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(deployResult);
      
      // Diff should succeed with no changes
      const diffResult = await cli.diff(apiUrl, token, {
        config: configPath
      });
      
      expect(diffResult).toHaveSucceeded(); // Exit code 0
      expect(diffResult.exitCode).toBe(0);
      expect(diffResult).toContainInOutput("No differences found");
    }, 60000);

    it("should exit with code 0 even when differences exist", async () => {
      const configPath = path.join(testDir, "differences-exit-code-config.yml");
      
      const config = {
        shop: {
          defaultMailSenderName: "Differences Store",
          defaultMailSenderAddress: "differences@test.com"
        },
        channels: []
      };
      
      await writeYaml(configPath, config);
      
      // Deploy config
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(deployResult);
      
      // Modify config
      const modifiedConfig = {
        shop: {
          defaultMailSenderName: "MODIFIED Differences Store",
          defaultMailSenderAddress: "differences@test.com"
        },
        channels: []
      };
      
      await writeYaml(configPath, modifiedConfig);
      
      // Diff should still succeed even with changes (diff is informational)
      const diffResult = await cli.diff(apiUrl, token, {
        config: configPath
      });
      
      expect(diffResult).toHaveSucceeded(); // Exit code 0
      expect(diffResult.exitCode).toBe(0);
      expect(diffResult).toContainInOutput("differences");
    }, 60000);

    it("should provide helpful summary messages", async () => {
      const configPath = path.join(testDir, "summary-config.yml");
      
      const config = {
        shop: {
          defaultMailSenderName: "Summary Store",
          defaultMailSenderAddress: "summary@test.com"
        },
        channels: []
      };
      
      await writeYaml(configPath, config);
      
      // Deploy and then modify
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(deployResult);
      
      const modifiedConfig = {
        shop: {
          defaultMailSenderName: "MODIFIED Summary Store",
          defaultMailSenderAddress: "summary@test.com"
        },
        channels: [
          {
            name: "New Summary Channel",
            slug: "new-summary-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true
          }
        ]
      };
      
      await writeYaml(configPath, modifiedConfig);
      
      const diffResult = await cli.diff(apiUrl, token, {
        config: configPath
      });
      
      expect(diffResult).toHaveSucceeded();
      
      // Should provide helpful summary
      expect(diffResult).toContainInOutput("differences that would be applied by 'deploy'");
      expect(diffResult).toMatchPattern(/found.*2.*difference/i); // 1 shop update + 1 channel create
      
      // Should be actionable
      expect(diffResult).toMatchPattern(/deploy/); // Mentions what command to run next
    }, 60000);
  });

  describe("Diff Performance and Reliability", () => {
    it("should handle large configurations efficiently", async () => {
      const configPath = path.join(testDir, "large-diff-config.yml");
      
      // Create a larger config with multiple entities
      const largeConfig = {
        shop: {
          defaultMailSenderName: "Large Config Store",
          defaultMailSenderAddress: "large@test.com"
        },
        channels: [
          {
            name: "Channel 1",
            slug: "channel-1",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true
          },
          {
            name: "Channel 2",
            slug: "channel-2",
            currencyCode: "EUR",
            defaultCountry: "DE",
            isActive: true
          }
        ],
        categories: Array.from({ length: 20 }, (_, i) => ({
          name: `Category ${i + 1}`,
          slug: `category-${i + 1}`,
          description: `Description for category ${i + 1}`
        }))
      };
      
      await writeYaml(configPath, largeConfig);
      
      // Deploy and then modify
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(deployResult);
      
      // Modify several entities
      const modifiedLargeConfig = {
        ...largeConfig,
        shop: {
          defaultMailSenderName: "MODIFIED Large Config Store",
          defaultMailSenderAddress: "large@test.com"
        },
        categories: [
          ...largeConfig.categories.slice(0, 15), // Keep first 15
          // Remove last 5 (DELETE operations)
          {
            name: "New Category 21", // CREATE operation
            slug: "new-category-21",
            description: "Newly added category"
          }
        ]
      };
      
      await writeYaml(configPath, modifiedLargeConfig);
      
      // Measure diff performance
      const startTime = Date.now();
      const diffResult = await cli.diff(apiUrl, token, {
        config: configPath
      });
      const duration = Date.now() - startTime;
      
      expect(diffResult).toHaveSucceeded();
      expect(diffResult).toContainInOutput("differences");
      
      // Should complete reasonably quickly (less than 30 seconds for this size)
      expect(duration).toBeLessThan(30000);
      
      // Should accurately count changes: 1 shop update + 5 category deletes + 1 category create = 7
      expect(diffResult).toMatchPattern(/7.*difference/);
    }, 120000);
  });
});