import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getTestConfig, getAdminToken, waitForApi } from "../../utils/test-env.js";
import { CliRunner } from "../../utils/cli-runner.js";
import {
  createTempDir,
  cleanupTempDir,
  readYaml,
  writeYaml,
} from "../../utils/test-helpers.js";
import { assertDeploymentSuccess, assertNoChanges } from "../../utils/assertions.js";
import path from "node:path";

describe("E2E Idempotency Tests - Critical Safety", () => {
  let cli: CliRunner;
  let apiUrl: string;
  let token: string;
  let testDir: string;

  beforeAll(async () => {
    console.log("🚀 Starting idempotency test setup...");
    
    testDir = await createTempDir("idempotency-test-");
    
    const config = getTestConfig();
    apiUrl = config.apiUrl;
    await waitForApi(apiUrl);
    token = await getAdminToken(apiUrl, config.adminEmail, config.adminPassword);
    cli = new CliRunner({ verbose: process.env.VERBOSE === "true" });
    
    console.log("✅ Idempotency test setup complete");
  }, 60000);

  afterAll(async () => {
    await cleanupTempDir(testDir);
  });

  describe("CREATE Idempotency", () => {
    it("should be idempotent when deploying new entities multiple times", async () => {
      const configPath = path.join(testDir, "create-idempotent-config.yml");
      
      const config = {
        shop: {
          defaultMailSenderName: "Create Idempotent Store",
          defaultMailSenderAddress: "createidempotent@test.com",
          description: "Store for testing create idempotency"
        },
        channels: [
          {
            name: "Idempotent Channel",
            slug: "idempotent-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true
          }
        ],
        categories: [
          {
            name: "Idempotent Category",
            slug: "idempotent-category",
            description: "Category for idempotency testing"
          },
          {
            name: "Another Idempotent Category",
            slug: "another-idempotent-category",
            description: "Another category for testing"
          }
        ]
      };
      
      await writeYaml(configPath, config);
      
      // First deployment - should create all entities
      console.log("📤 First deployment (CREATE operations)...");
      const firstDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(firstDeploy);
      expect(firstDeploy).toContainInOutput("Idempotent Channel");
      expect(firstDeploy).toContainInOutput("Idempotent Category");
      
      // Second deployment - should be idempotent (no changes)
      console.log("🔄 Second deployment (should be idempotent)...");
      const secondDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(secondDeploy);
      
      // Third deployment - also should be idempotent
      console.log("🔄 Third deployment (should also be idempotent)...");
      const thirdDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(thirdDeploy);
      
      // Verify no differences after multiple deployments
      console.log("🔍 Checking diff after multiple deployments...");
      const diffResult = await cli.diff(apiUrl, token, {
        config: configPath
      });
      
      assertNoChanges(diffResult);
    }, 180000);
  });

  describe("UPDATE Idempotency - Most Critical", () => {
    it("should be idempotent when updating existing entities", async () => {
      const configPath = path.join(testDir, "update-idempotent-config.yml");
      
      // Initial configuration
      const initialConfig = {
        shop: {
          defaultMailSenderName: "Update Idempotent Store",
          defaultMailSenderAddress: "updateidempotent@test.com",
          description: "Original description"
        },
        channels: [
          {
            name: "Original Channel Name",
            slug: "update-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true
          }
        ],
        categories: [
          {
            name: "Original Category Name",
            slug: "update-category",
            description: "Original category description"
          }
        ]
      };
      
      await writeYaml(configPath, initialConfig);
      
      // Deploy initial config
      console.log("📤 Deploying initial configuration...");
      const initialDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(initialDeploy);
      
      // Update the configuration
      const updatedConfig = {
        shop: {
          defaultMailSenderName: "UPDATED Store Name",
          defaultMailSenderAddress: "updateidempotent@test.com",
          description: "UPDATED description with new content"
        },
        channels: [
          {
            name: "UPDATED Channel Name", 
            slug: "update-channel", // Same slug, different name
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true
          }
        ],
        categories: [
          {
            name: "Original Category Name", // Same name
            slug: "update-category",
            description: "UPDATED category description" // Different description
          }
        ]
      };
      
      await writeYaml(configPath, updatedConfig);
      
      // First update deployment - should apply changes
      console.log("🔄 First update deployment...");
      const firstUpdate = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(firstUpdate);
      expect(firstUpdate).toContainInOutput("UPDATED");
      
      // Second update deployment - should be idempotent (no changes needed)
      console.log("🔄 Second update deployment (should be idempotent)...");
      const secondUpdate = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(secondUpdate);
      
      // Third update deployment - should also be idempotent
      console.log("🔄 Third update deployment (should also be idempotent)...");
      const thirdUpdate = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(thirdUpdate);
      
      // Verify no differences after update idempotency
      console.log("🔍 Checking diff after update idempotency...");
      const diffResult = await cli.diff(apiUrl, token, {
        config: configPath
      });
      
      assertNoChanges(diffResult);
      
      // Introspect to verify the updates were actually applied and persisted
      const introspectPath = path.join(testDir, "introspected-after-update.yml");
      const introspectResult = await cli.introspect(apiUrl, token, {
        config: introspectPath
      });
      
      expect(introspectResult).toHaveSucceeded();
      
      const introspectedConfig = await readYaml(introspectPath);
      expect(introspectedConfig.shop.defaultMailSenderName).toBe("UPDATED Store Name");
      expect(introspectedConfig.shop.description).toBe("UPDATED description with new content");
    }, 200000);

    it("should handle complex update scenarios idempotently", async () => {
      const configPath = path.join(testDir, "complex-update-config.yml");
      
      // Initial complex configuration
      const initialConfig = {
        shop: {
          defaultMailSenderName: "Complex Store",
          defaultMailSenderAddress: "complex@test.com",
          description: "Complex store for testing",
          trackInventoryByDefault: true,
          defaultWeightUnit: "KG"
        },
        channels: [
          {
            name: "Main Channel",
            slug: "main-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true
          },
          {
            name: "Secondary Channel",
            slug: "secondary-channel",
            currencyCode: "EUR",
            defaultCountry: "DE",
            isActive: false
          }
        ],
        categories: [
          {
            name: "Electronics",
            slug: "electronics",
            description: "Electronic products"
          },
          {
            name: "Laptops",
            slug: "laptops",
            description: "Laptop computers",
            parent: "electronics"
          }
        ]
      };
      
      await writeYaml(configPath, initialConfig);
      
      // Deploy initial complex config
      console.log("📤 Deploying initial complex configuration...");
      const initialDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(initialDeploy);
      
      // Make complex updates
      const updatedComplexConfig = {
        shop: {
          defaultMailSenderName: "Complex Store UPDATED",
          defaultMailSenderAddress: "complex@test.com",
          description: "UPDATED complex store description",
          trackInventoryByDefault: false, // Changed boolean
          defaultWeightUnit: "LB" // Changed enum
        },
        channels: [
          {
            name: "Main Channel RENAMED",
            slug: "main-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true
          },
          {
            name: "Secondary Channel",
            slug: "secondary-channel",
            currencyCode: "EUR",
            defaultCountry: "DE",
            isActive: true // Changed boolean
          }
        ],
        categories: [
          {
            name: "Electronics UPDATED",
            slug: "electronics",
            description: "UPDATED electronic products description"
          },
          {
            name: "Laptops",
            slug: "laptops",
            description: "UPDATED laptop computers description",
            parent: "electronics"
          }
        ]
      };
      
      await writeYaml(configPath, updatedComplexConfig);
      
      // Apply complex updates - first time
      console.log("🔄 Applying complex updates...");
      const firstComplexUpdate = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(firstComplexUpdate);
      
      // Apply same updates again - should be idempotent
      console.log("🔄 Applying same complex updates again...");
      const secondComplexUpdate = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(secondComplexUpdate);
      
      // Verify idempotency with diff
      console.log("🔍 Verifying complex update idempotency...");
      const diffResult = await cli.diff(apiUrl, token, {
        config: configPath
      });
      
      assertNoChanges(diffResult);
      
      // One more deployment to be extra sure
      console.log("🔄 Final idempotency check...");
      const thirdComplexUpdate = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(thirdComplexUpdate);
      
      const finalDiffResult = await cli.diff(apiUrl, token, {
        config: configPath
      });
      
      assertNoChanges(finalDiffResult);
    }, 240000);
  });

  describe("Mixed Operation Idempotency", () => {
    it("should handle mixed CREATE, UPDATE, DELETE operations idempotently", async () => {
      const configPath = path.join(testDir, "mixed-idempotent-config.yml");
      
      // Start with baseline
      const baselineConfig = {
        shop: {
          defaultMailSenderName: "Mixed Operations Store",
          defaultMailSenderAddress: "mixed@test.com"
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
            name: "Update Channel",
            slug: "update-channel",
            currencyCode: "EUR",
            defaultCountry: "DE",
            isActive: false
          },
          {
            name: "Delete Channel",
            slug: "delete-channel",
            currencyCode: "GBP",
            defaultCountry: "GB",
            isActive: true
          }
        ],
        categories: [
          {
            name: "Keep Category",
            slug: "keep-category",
            description: "Will stay unchanged"
          },
          {
            name: "Update Category",
            slug: "update-category", 
            description: "Will be updated"
          }
        ]
      };
      
      await writeYaml(configPath, baselineConfig);
      
      // Deploy baseline
      console.log("📤 Deploying baseline configuration...");
      const baselineDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(baselineDeploy);
      
      // Make mixed changes
      const mixedConfig = {
        shop: {
          defaultMailSenderName: "Mixed Operations Store",
          defaultMailSenderAddress: "mixed@test.com" // UNCHANGED
        },
        channels: [
          {
            name: "Keep Channel",
            slug: "keep-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true // UNCHANGED
          },
          {
            name: "Update Channel MODIFIED",
            slug: "update-channel",
            currencyCode: "EUR",
            defaultCountry: "DE",
            isActive: true // UPDATE: changed from false to true
          },
          // DELETE: "delete-channel" removed
          {
            name: "Create Channel", // CREATE: new channel
            slug: "create-channel",
            currencyCode: "CAD",
            defaultCountry: "CA",
            isActive: true
          }
        ],
        categories: [
          {
            name: "Keep Category",
            slug: "keep-category",
            description: "Will stay unchanged" // UNCHANGED
          },
          {
            name: "Update Category",
            slug: "update-category",
            description: "UPDATED description" // UPDATE
          },
          {
            name: "Create Category", // CREATE: new category
            slug: "create-category",
            description: "Newly created category"
          }
        ]
      };
      
      await writeYaml(configPath, mixedConfig);
      
      // Apply mixed changes - first time (should make all changes)
      console.log("🔄 Applying mixed changes...");
      const firstMixedDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(firstMixedDeploy);
      
      // Apply same mixed changes again - should be idempotent
      console.log("🔄 Applying same mixed changes again...");
      const secondMixedDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(secondMixedDeploy);
      
      // Verify idempotency
      console.log("🔍 Verifying mixed operation idempotency...");
      const diffResult = await cli.diff(apiUrl, token, {
        config: configPath
      });
      
      assertNoChanges(diffResult);
      
      // Apply one more time to be absolutely sure
      console.log("🔄 Final mixed operation idempotency check...");
      const thirdMixedDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(thirdMixedDeploy);
      
      const finalDiffResult = await cli.diff(apiUrl, token, {
        config: configPath
      });
      
      assertNoChanges(finalDiffResult);
      
      // Introspect to verify final state
      const introspectPath = path.join(testDir, "mixed-final-state.yml");
      const introspectResult = await cli.introspect(apiUrl, token, {
        config: introspectPath
      });
      
      expect(introspectResult).toHaveSucceeded();
      
      const finalState = await readYaml(introspectPath);
      
      // Verify CREATE operations persisted
      const createChannel = finalState.channels?.find((c: any) => c.slug === "create-channel");
      expect(createChannel).toBeDefined();
      expect(createChannel.name).toBe("Create Channel");
      
      const createCategory = finalState.categories?.find((c: any) => c.slug === "create-category");
      expect(createCategory).toBeDefined();
      expect(createCategory.name).toBe("Create Category");
      
      // Verify UPDATE operations persisted  
      const updateChannel = finalState.channels?.find((c: any) => c.slug === "update-channel");
      expect(updateChannel.name).toBe("Update Channel MODIFIED");
      expect(updateChannel.isActive).toBe(true);
      
      const updateCategory = finalState.categories?.find((c: any) => c.slug === "update-category");
      expect(updateCategory.description).toBe("UPDATED description");
      
      // Verify DELETE operations persisted (entity should not exist)
      const deletedChannel = finalState.channels?.find((c: any) => c.slug === "delete-channel");
      expect(deletedChannel).toBeUndefined();
    }, 300000);
  });

  describe("Selective Idempotency", () => {
    it("should be idempotent with selective operations", async () => {
      const configPath = path.join(testDir, "selective-idempotent-config.yml");
      
      const config = {
        shop: {
          defaultMailSenderName: "Selective Idempotent Store",
          defaultMailSenderAddress: "selective@test.com",
          description: "Original description"
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
            description: "Original category"
          }
        ]
      };
      
      await writeYaml(configPath, config);
      
      // Deploy initial config
      const initialDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(initialDeploy);
      
      // Modify all sections
      const modifiedConfig = {
        shop: {
          defaultMailSenderName: "MODIFIED Selective Store",
          defaultMailSenderAddress: "selective@test.com",
          description: "MODIFIED description"
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
            description: "MODIFIED category description"
          }
        ]
      };
      
      await writeYaml(configPath, modifiedConfig);
      
      // Deploy only shop changes multiple times
      console.log("🎯 Deploying shop changes only (1st time)...");
      const firstShopDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        include: ["shop"],
        skipDiff: true
      });
      
      assertDeploymentSuccess(firstShopDeploy);
      
      console.log("🎯 Deploying shop changes only (2nd time - should be idempotent)...");
      const secondShopDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        include: ["shop"],
        skipDiff: true
      });
      
      assertDeploymentSuccess(secondShopDeploy);
      
      // Verify shop-only diff shows no changes
      const shopDiffResult = await cli.diff(apiUrl, token, {
        config: configPath,
        include: ["shop"]
      });
      
      assertNoChanges(shopDiffResult);
      
      // But other sections should still have differences
      const categoriesDiffResult = await cli.diff(apiUrl, token, {
        config: configPath,
        include: ["categories"]
      });
      
      expect(categoriesDiffResult).toHaveSucceeded();
      expect(categoriesDiffResult).toContainInOutput("differences"); // Categories still need updates
      
      // Deploy categories multiple times
      console.log("📂 Deploying category changes only (1st time)...");
      const firstCategoryDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        include: ["categories"],
        skipDiff: true
      });
      
      assertDeploymentSuccess(firstCategoryDeploy);
      
      console.log("📂 Deploying category changes only (2nd time - should be idempotent)...");
      const secondCategoryDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        include: ["categories"],
        skipDiff: true
      });
      
      assertDeploymentSuccess(secondCategoryDeploy);
      
      // Now all sections should be in sync
      const finalDiffResult = await cli.diff(apiUrl, token, {
        config: configPath
      });
      
      assertNoChanges(finalDiffResult);
    }, 240000);
  });

  describe("Performance Impact of Idempotency", () => {
    it("should not degrade performance with repeated deployments", async () => {
      const configPath = path.join(testDir, "performance-idempotent-config.yml");
      
      const config = {
        shop: {
          defaultMailSenderName: "Performance Test Store",
          defaultMailSenderAddress: "performance@test.com"
        },
        channels: Array.from({ length: 5 }, (_, i) => ({
          name: `Performance Channel ${i + 1}`,
          slug: `perf-channel-${i + 1}`,
          currencyCode: "USD",
          defaultCountry: "US",
          isActive: true
        })),
        categories: Array.from({ length: 10 }, (_, i) => ({
          name: `Performance Category ${i + 1}`,
          slug: `perf-category-${i + 1}`,
          description: `Category ${i + 1} for performance testing`
        }))
      };
      
      await writeYaml(configPath, config);
      
      // Initial deployment
      const initialStartTime = Date.now();
      const initialDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      const initialDuration = Date.now() - initialStartTime;
      
      assertDeploymentSuccess(initialDeploy);
      
      // Idempotent deployments - should be faster
      const idempotentTimes: number[] = [];
      
      for (let i = 0; i < 3; i++) {
        console.log(`🔄 Idempotent deployment ${i + 1}/3...`);
        
        const startTime = Date.now();
        const idempotentDeploy = await cli.deploy(apiUrl, token, {
          config: configPath,
          skipDiff: true
        });
        const duration = Date.now() - startTime;
        
        assertDeploymentSuccess(idempotentDeploy);
        idempotentTimes.push(duration);
        
        // Each should be reasonably fast (not significantly slower than initial)
        expect(duration).toBeLessThan(initialDuration * 2); // Should not be more than 2x slower
      }
      
      // Verify no differences after performance test
      const diffResult = await cli.diff(apiUrl, token, {
        config: configPath
      });
      
      assertNoChanges(diffResult);
      
      console.log(`📊 Performance metrics:
        - Initial deployment: ${initialDuration}ms
        - Idempotent deployments: ${idempotentTimes.map(t => `${t}ms`).join(", ")}
        - Average idempotent time: ${Math.round(idempotentTimes.reduce((a, b) => a + b, 0) / idempotentTimes.length)}ms`);
    }, 180000);
  });
});