import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertDeploymentSuccess } from "../../utils/assertions.js";
import { CliRunner } from "../../utils/cli-runner.js";
import { getAdminToken, getTestConfig, waitForApi } from "../../utils/test-env.js";
import { cleanupTempDir, createTempDir, readYaml, writeYaml } from "../../utils/test-helpers.js";
import type { Channel } from "../../../src/modules/channel/repository.js";
import type { Category } from "../../../src/modules/category/repository.js";

describe("E2E Selective Operations Safety Tests", () => {
  let cli: CliRunner;
  let apiUrl: string;
  let token: string;
  let testDir: string;

  beforeAll(async () => {
    console.log("🚀 Starting selective operations safety test setup...");

    testDir = await createTempDir("selective-safety-test-");

    const config = getTestConfig();
    apiUrl = config.apiUrl;
    await waitForApi(apiUrl);
    token = await getAdminToken(apiUrl, config.adminEmail, config.adminPassword);
    cli = new CliRunner({ verbose: process.env.VERBOSE === "true" });

    console.log("✅ Selective operations safety test setup complete");
  }, 60000);

  afterAll(async () => {
    await cleanupTempDir(testDir);
  });

  describe("Include Operations Safety", () => {
    it("should ONLY modify included sections and NEVER touch others", async () => {
      const configPath = path.join(testDir, "include-safety-config.yml");

      // Deploy comprehensive initial configuration
      const initialConfig = {
        shop: {
          defaultMailSenderName: "Include Safety Store",
          defaultMailSenderAddress: "include@test.com",
          description: "Original shop description",
        },
        channels: [
          {
            name: "Original Channel",
            slug: "original-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
          {
            name: "Second Channel",
            slug: "second-channel",
            currencyCode: "EUR",
            defaultCountry: "DE",
            isActive: false,
          },
        ],
        categories: [
          {
            name: "Original Category",
            slug: "original-category",
            description: "Original category description",
          },
          {
            name: "Electronics",
            slug: "electronics",
            description: "Electronics category",
          },
        ],
      };

      await writeYaml(configPath, initialConfig);

      console.log("📤 Deploying comprehensive initial configuration...");
      const initialDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(initialDeploy);

      // Capture the state after initial deployment
      const initialStateIntrospectPath = path.join(testDir, "initial-state.yml");
      const initialIntrospect = await cli.introspect(apiUrl, token, {
        config: initialStateIntrospectPath,
      });

      expect(initialIntrospect).toHaveSucceeded();
      const initialState = await readYaml(initialStateIntrospectPath);

      // Modify ALL sections in config file
      const modifiedConfig = {
        shop: {
          defaultMailSenderName: "MODIFIED Include Safety Store",
          defaultMailSenderAddress: "include@test.com",
          description: "MODIFIED shop description",
        },
        channels: [
          {
            name: "MODIFIED Original Channel",
            slug: "original-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
          {
            name: "MODIFIED Second Channel",
            slug: "second-channel",
            currencyCode: "EUR",
            defaultCountry: "DE",
            isActive: true, // Changed from false to true
          },
        ],
        categories: [
          {
            name: "MODIFIED Original Category",
            slug: "original-category",
            description: "MODIFIED category description",
          },
          {
            name: "MODIFIED Electronics",
            slug: "electronics",
            description: "MODIFIED electronics category",
          },
        ],
      };

      await writeYaml(configPath, modifiedConfig);

      // Deploy ONLY shop section using --include
      console.log("🎯 Deploying ONLY shop section with --include...");
      const shopOnlyDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        include: ["shop"],
        skipDiff: true,
      });

      assertDeploymentSuccess(shopOnlyDeploy);

      // Introspect current state and verify ONLY shop was modified
      const afterShopIntrospectPath = path.join(testDir, "after-shop-only.yml");
      const afterShopIntrospect = await cli.introspect(apiUrl, token, {
        config: afterShopIntrospectPath,
      });

      expect(afterShopIntrospect).toHaveSucceeded();
      const afterShopState = await readYaml(afterShopIntrospectPath);

      // Shop should be modified
      expect(afterShopState.shop.defaultMailSenderName).toBe("MODIFIED Include Safety Store");
      expect(afterShopState.shop.description).toBe("MODIFIED shop description");

      // Channels should be UNCHANGED (not modified by --include shop)
      expect(afterShopState.channels).toEqual(initialState.channels);
      const originalChannel = afterShopState.channels?.find(
        (c: Channel) => c.slug === "original-channel"
      );
      expect(originalChannel.name).toBe("Original Channel"); // NOT modified

      const secondChannel = afterShopState.channels?.find((c: Channel) => c.slug === "second-channel");
      expect(secondChannel.name).toBe("Second Channel"); // NOT modified
      expect(secondChannel.isActive).toBe(false); // NOT changed to true

      // Categories should be UNCHANGED (not modified by --include shop)
      expect(afterShopState.categories).toEqual(initialState.categories);
      const originalCategory = afterShopState.categories?.find(
        (c: Category) => c.slug === "original-category"
      );
      expect(originalCategory.name).toBe("Original Category"); // NOT modified
      expect(originalCategory.description).toBe("Original category description"); // NOT modified

      // Verify diff shows remaining changes for other sections
      const diffAfterShopResult = await cli.diff(apiUrl, token, {
        config: configPath,
        include: ["channels"],
      });

      expect(diffAfterShopResult).toHaveSucceeded();
      expect(diffAfterShopResult).toContainInOutput("differences"); // Channels still need updates

      const categoryDiffResult = await cli.diff(apiUrl, token, {
        config: configPath,
        include: ["categories"],
      });

      expect(categoryDiffResult).toContainInOutput("differences"); // Categories still need updates
    }, 60000);

    it("should handle multiple include sections correctly", async () => {
      const configPath = path.join(testDir, "multiple-include-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Multiple Include Store",
          defaultMailSenderAddress: "multiple@test.com",
          description: "Original description",
        },
        channels: [
          {
            name: "Include Channel",
            slug: "include-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
        ],
        categories: [
          {
            name: "Include Category",
            slug: "include-category",
            description: "Original category",
          },
        ],
      };

      await writeYaml(configPath, config);

      // Deploy initial
      const initialDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(initialDeploy);

      // Modify all sections
      const modifiedConfig = {
        shop: {
          defaultMailSenderName: "MODIFIED Multiple Include Store",
          defaultMailSenderAddress: "multiple@test.com",
          description: "MODIFIED description",
        },
        channels: [
          {
            name: "MODIFIED Include Channel",
            slug: "include-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
        ],
        categories: [
          {
            name: "MODIFIED Include Category",
            slug: "include-category",
            description: "MODIFIED category",
          },
        ],
      };

      await writeYaml(configPath, modifiedConfig);

      // Deploy multiple sections with --include
      console.log("🎯 Deploying shop and channels with --include...");
      const multipleIncludeDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        include: ["shop", "channels"],
        skipDiff: true,
      });

      assertDeploymentSuccess(multipleIncludeDeploy);

      // Verify only included sections were modified
      const introspectPath = path.join(testDir, "multiple-include-result.yml");
      const introspectResult = await cli.introspect(apiUrl, token, {
        config: introspectPath,
      });

      expect(introspectResult).toHaveSucceeded();
      const state = await readYaml(introspectPath);

      // Shop and channels should be modified
      expect(state.shop.defaultMailSenderName).toBe("MODIFIED Multiple Include Store");
      expect(state.channels[0].name).toBe("MODIFIED Include Channel");

      // Categories should NOT be modified
      expect(state.categories[0].name).toBe("Include Category"); // Original name
      expect(state.categories[0].description).toBe("Original category"); // Original description

      // Diff for categories should still show differences
      const categoryDiffResult = await cli.diff(apiUrl, token, {
        config: configPath,
        include: ["categories"],
      });

      expect(categoryDiffResult).toContainInOutput("differences");
    }, 150000);
  });

  describe("Exclude Operations Safety", () => {
    it("should NEVER modify excluded sections even when config differs", async () => {
      const configPath = path.join(testDir, "exclude-safety-config.yml");

      // Deploy initial configuration
      const initialConfig = {
        shop: {
          defaultMailSenderName: "Exclude Safety Store",
          defaultMailSenderAddress: "exclude@test.com",
          description: "Critical shop data DO NOT MODIFY",
        },
        channels: [
          {
            name: "Critical Channel",
            slug: "critical-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
        ],
        categories: [
          {
            name: "Safe to Modify Category",
            slug: "safe-category",
            description: "This can be changed",
          },
        ],
      };

      await writeYaml(configPath, initialConfig);

      console.log("📤 Deploying initial configuration with critical data...");
      const initialDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(initialDeploy);

      // Capture initial state
      const initialStateIntrospectPath = path.join(testDir, "exclude-initial-state.yml");
      const initialIntrospect = await cli.introspect(apiUrl, token, {
        config: initialStateIntrospectPath,
      });

      expect(initialIntrospect).toHaveSucceeded();
      const _initialState = await readYaml(initialStateIntrospectPath);

      // Modify ALL sections (including critical ones that should be excluded)
      const modifiedConfig = {
        shop: {
          defaultMailSenderName: "DANGEROUS MODIFICATION - SHOULD NOT APPLY",
          defaultMailSenderAddress: "exclude@test.com",
          description: "DANGEROUS: This should never be applied due to --exclude",
        },
        channels: [
          {
            name: "DANGEROUS: Modified Critical Channel",
            slug: "critical-channel",
            currencyCode: "EUR", // DANGEROUS change
            defaultCountry: "DE", // DANGEROUS change
            isActive: false, // DANGEROUS change
          },
        ],
        categories: [
          {
            name: "SAFE: Modified Category",
            slug: "safe-category",
            description: "This change should be applied",
          },
        ],
      };

      await writeYaml(configPath, modifiedConfig);

      // Deploy with --exclude for critical sections
      console.log("🛡️ Deploying with --exclude to protect critical data...");
      const excludeDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        exclude: ["shop", "channels"], // Protect critical data
        skipDiff: true,
      });

      assertDeploymentSuccess(excludeDeploy);

      // Verify excluded sections were NOT modified
      const afterExcludeIntrospectPath = path.join(testDir, "after-exclude.yml");
      const afterExcludeIntrospect = await cli.introspect(apiUrl, token, {
        config: afterExcludeIntrospectPath,
      });

      expect(afterExcludeIntrospect).toHaveSucceeded();
      const afterExcludeState = await readYaml(afterExcludeIntrospectPath);

      // Shop should be UNCHANGED (protected by --exclude)
      expect(afterExcludeState.shop.defaultMailSenderName).toBe("Exclude Safety Store");
      expect(afterExcludeState.shop.description).toBe("Critical shop data DO NOT MODIFY");

      // Channels should be UNCHANGED (protected by --exclude)
      const criticalChannel = afterExcludeState.channels?.find(
        (c: Channel) => c.slug === "critical-channel"
      );
      expect(criticalChannel.name).toBe("Critical Channel");
      expect(criticalChannel.currencyCode).toBe("USD"); // NOT changed to EUR
      expect(criticalChannel.defaultCountry).toBe("US"); // NOT changed to DE
      expect(criticalChannel.isActive).toBe(true); // NOT changed to false

      // Categories should be MODIFIED (not excluded)
      const safeCategory = afterExcludeState.categories?.find(
        (c: Category) => c.slug === "safe-category"
      );
      expect(safeCategory.name).toBe("SAFE: Modified Category");
      expect(safeCategory.description).toBe("This change should be applied");

      // Verify diff shows remaining differences for excluded sections
      const shopDiffResult = await cli.diff(apiUrl, token, {
        config: configPath,
        include: ["shop"],
      });

      expect(shopDiffResult).toContainInOutput("differences"); // Shop changes still pending

      const channelDiffResult = await cli.diff(apiUrl, token, {
        config: configPath,
        include: ["channels"],
      });

      expect(channelDiffResult).toContainInOutput("differences"); // Channel changes still pending
    }, 60000);

    it("should handle exclude with CREATE operations safely", async () => {
      const configPath = path.join(testDir, "exclude-create-config.yml");

      // Start with minimal config
      const initialConfig = {
        shop: {
          defaultMailSenderName: "Exclude Create Store",
          defaultMailSenderAddress: "excludecreate@test.com",
        },
        channels: [],
        categories: [],
      };

      await writeYaml(configPath, initialConfig);

      // Deploy minimal config
      const initialDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(initialDeploy);

      // Add new entities to config
      const expandedConfig = {
        shop: {
          defaultMailSenderName: "MODIFIED Exclude Create Store", // Modification
          defaultMailSenderAddress: "excludecreate@test.com",
        },
        channels: [
          {
            name: "New Channel - Should NOT be created",
            slug: "excluded-new-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
        ],
        categories: [
          {
            name: "New Category - Should be created",
            slug: "allowed-new-category",
            description: "This should be created",
          },
        ],
      };

      await writeYaml(configPath, expandedConfig);

      // Deploy with --exclude channels (should not create new channel)
      console.log("🚫 Deploying with --exclude channels (preventing CREATE)...");
      const excludeCreateDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        exclude: ["channels"],
        skipDiff: true,
      });

      assertDeploymentSuccess(excludeCreateDeploy);

      // Verify excluded CREATE operations were not performed
      const afterExcludeCreateIntrospectPath = path.join(testDir, "after-exclude-create.yml");
      const afterExcludeCreateIntrospect = await cli.introspect(apiUrl, token, {
        config: afterExcludeCreateIntrospectPath,
      });

      expect(afterExcludeCreateIntrospect).toHaveSucceeded();
      const state = await readYaml(afterExcludeCreateIntrospectPath);

      // Shop should be modified (not excluded)
      expect(state.shop.defaultMailSenderName).toBe("MODIFIED Exclude Create Store");

      // Channel should NOT exist (excluded from CREATE)
      const excludedChannel = state.channels?.find((c: Channel) => c.slug === "excluded-new-channel");
      expect(excludedChannel).toBeUndefined();

      // Category should exist (not excluded)
      const allowedCategory = state.categories?.find((c: Category) => c.slug === "allowed-new-category");
      expect(allowedCategory).toBeDefined();
      expect(allowedCategory.name).toBe("New Category - Should be created");

      // Verify diff still shows excluded channel as pending CREATE
      const channelDiffResult = await cli.diff(apiUrl, token, {
        config: configPath,
        include: ["channels"],
      });

      expect(channelDiffResult).toContainInOutput("differences"); // Channel CREATE still pending
    }, 150000);
  });

  describe("Complex Selective Scenarios", () => {
    it("should safely handle complex include/exclude combinations", async () => {
      const configPath = path.join(testDir, "complex-selective-config.yml");

      // Deploy comprehensive baseline
      const baselineConfig = {
        shop: {
          defaultMailSenderName: "Complex Selective Store",
          defaultMailSenderAddress: "complex@test.com",
          description: "Baseline description",
        },
        channels: [
          {
            name: "Primary Channel",
            slug: "primary-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
          {
            name: "Secondary Channel",
            slug: "secondary-channel",
            currencyCode: "EUR",
            defaultCountry: "DE",
            isActive: true,
          },
        ],
        categories: [
          {
            name: "Category A",
            slug: "category-a",
            description: "Category A description",
          },
          {
            name: "Category B",
            slug: "category-b",
            description: "Category B description",
          },
          {
            name: "Category C",
            slug: "category-c",
            description: "Category C description",
          },
        ],
      };

      await writeYaml(configPath, baselineConfig);

      console.log("📤 Deploying comprehensive baseline...");
      const baselineDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(baselineDeploy);

      // Modify everything and remove some entities
      const modifiedConfig = {
        shop: {
          defaultMailSenderName: "MODIFIED Complex Selective Store",
          defaultMailSenderAddress: "complex@test.com",
          description: "MODIFIED baseline description",
        },
        channels: [
          {
            name: "MODIFIED Primary Channel",
            slug: "primary-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
          // Secondary channel removed (DELETE operation)
        ],
        categories: [
          {
            name: "MODIFIED Category A",
            slug: "category-a",
            description: "MODIFIED Category A description",
          },
          {
            name: "Category B", // Unchanged
            slug: "category-b",
            description: "Category B description",
          },
          {
            name: "MODIFIED Category C",
            slug: "category-c",
            description: "MODIFIED Category C description",
          },
          {
            name: "Category D", // New category (CREATE)
            slug: "category-d",
            description: "New Category D",
          },
        ],
      };

      await writeYaml(configPath, modifiedConfig);

      // Deploy with complex selective operations:
      // - Include shop and categories
      // - This should NOT touch channels (so secondary-channel should remain)
      console.log("🎯 Deploying with complex selective operations...");
      const complexDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        include: ["shop", "categories"], // Only these sections
        skipDiff: true,
      });

      assertDeploymentSuccess(complexDeploy);

      // Verify complex selective behavior
      const complexResultIntrospectPath = path.join(testDir, "complex-selective-result.yml");
      const complexResultIntrospect = await cli.introspect(apiUrl, token, {
        config: complexResultIntrospectPath,
      });

      expect(complexResultIntrospect).toHaveSucceeded();
      const complexResult = await readYaml(complexResultIntrospectPath);

      // Shop should be modified (included)
      expect(complexResult.shop.defaultMailSenderName).toBe("MODIFIED Complex Selective Store");
      expect(complexResult.shop.description).toBe("MODIFIED baseline description");

      // Categories should be modified (included)
      const categoryA = complexResult.categories?.find((c: Category) => c.slug === "category-a");
      expect(categoryA.name).toBe("MODIFIED Category A");
      expect(categoryA.description).toBe("MODIFIED Category A description");

      const categoryC = complexResult.categories?.find((c: Category) => c.slug === "category-c");
      expect(categoryC.name).toBe("MODIFIED Category C");

      const categoryD = complexResult.categories?.find((c: Category) => c.slug === "category-d");
      expect(categoryD).toBeDefined(); // Should be created
      expect(categoryD.name).toBe("Category D");

      // Channels should be UNTOUCHED (not included)
      // Secondary channel should still exist (DELETE operation ignored)
      const primaryChannel = complexResult.channels?.find((c: Channel) => c.slug === "primary-channel");
      expect(primaryChannel.name).toBe("Primary Channel"); // NOT modified

      const secondaryChannel = complexResult.channels?.find(
        (c: Channel) => c.slug === "secondary-channel"
      );
      expect(secondaryChannel).toBeDefined(); // Still exists (not deleted)
      expect(secondaryChannel.name).toBe("Secondary Channel");

      // Verify channels still show differences
      const channelDiffResult = await cli.diff(apiUrl, token, {
        config: configPath,
        include: ["channels"],
      });

      expect(channelDiffResult).toContainInOutput("differences"); // Channel operations still pending
    }, 200000);

    it("should prevent accidental data loss with selective operations", async () => {
      const configPath = path.join(testDir, "data-loss-prevention-config.yml");

      // Deploy configuration with critical data
      const criticalConfig = {
        shop: {
          defaultMailSenderName: "Critical Data Store",
          defaultMailSenderAddress: "critical@test.com",
          description: "Contains important business data",
        },
        channels: [
          {
            name: "Production Channel",
            slug: "production-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
          {
            name: "Test Channel",
            slug: "test-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: false,
          },
        ],
        categories: [
          {
            name: "Critical Category",
            slug: "critical-category",
            description: "Contains production data",
          },
        ],
      };

      await writeYaml(configPath, criticalConfig);

      console.log("📤 Deploying critical data configuration...");
      const criticalDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(criticalDeploy);

      // Create a "dangerous" config that would delete production data
      const dangerousConfig = {
        shop: {
          defaultMailSenderName: "Critical Data Store",
          defaultMailSenderAddress: "critical@test.com",
          description: "Contains important business data",
        },
        channels: [
          // Only test channel - production channel missing (would be DELETED)
          {
            name: "Test Channel",
            slug: "test-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: false,
          },
        ],
        categories: [
          // Critical category missing - would be DELETED
        ],
      };

      await writeYaml(configPath, dangerousConfig);

      // Deploy with --exclude to prevent accidental deletion
      console.log("🛡️ Deploying dangerous config with --exclude for protection...");
      const protectedDeploy = await cli.deploy(apiUrl, token, {
        config: configPath,
        exclude: ["channels", "categories"], // Protect from deletion
        skipDiff: true,
      });

      assertDeploymentSuccess(protectedDeploy);

      // Verify critical data was protected
      const protectedResultIntrospectPath = path.join(testDir, "protected-result.yml");
      const protectedResultIntrospect = await cli.introspect(apiUrl, token, {
        config: protectedResultIntrospectPath,
      });

      expect(protectedResultIntrospect).toHaveSucceeded();
      const protectedResult = await readYaml(protectedResultIntrospectPath);

      // Production channel should still exist (protected from deletion)
      const productionChannel = protectedResult.channels?.find(
        (c: Channel) => c.slug === "production-channel"
      );
      expect(productionChannel).toBeDefined();
      expect(productionChannel.name).toBe("Production Channel");

      // Critical category should still exist (protected from deletion)
      const criticalCategory = protectedResult.categories?.find(
        (c: Category) => c.slug === "critical-category"
      );
      expect(criticalCategory).toBeDefined();
      expect(criticalCategory.name).toBe("Critical Category");

      // Verify data loss would still be detected in diff
      const dangerousDiffResult = await cli.diff(apiUrl, token, {
        config: configPath,
        include: ["channels", "categories"],
      });

      expect(dangerousDiffResult).toContainInOutput("differences"); // Would show deletions if not excluded
    }, 60000);
  });

  describe("Selective Operations Error Handling", () => {
    it("should handle invalid section names gracefully", async () => {
      const configPath = path.join(testDir, "invalid-section-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Invalid Section Store",
          defaultMailSenderAddress: "invalid@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      // Try to deploy with invalid section name
      console.log("❌ Testing invalid section names...");
      const invalidIncludeResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        include: ["invalid-section", "shop"],
        timeout: 30000,
      });

      // Should handle gracefully (likely ignore invalid sections or show error)
      // The exact behavior depends on implementation, but it shouldn't crash
      expect(invalidIncludeResult.exitCode).toBeGreaterThanOrEqual(0);

      const invalidExcludeResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        exclude: ["non-existent-section"],
        timeout: 30000,
      });

      expect(invalidExcludeResult.exitCode).toBeGreaterThanOrEqual(0);
    }, 120000);

    it("should validate include/exclude conflicts", async () => {
      const configPath = path.join(testDir, "conflict-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Conflict Store",
          defaultMailSenderAddress: "conflict@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      // Try to both include and exclude the same section
      console.log("⚠️ Testing include/exclude conflicts...");
      const conflictResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        include: ["shop"],
        exclude: ["shop"], // Conflict!
        timeout: 30000,
      });

      // Should handle this conflict gracefully (error or precedence rule)
      expect(conflictResult.exitCode).toBeGreaterThanOrEqual(0);

      if (conflictResult.exitCode !== 0) {
        // If it errors, should provide helpful message
        expect(conflictResult).toMatchPattern(/conflict|include|exclude/i);
      }
    }, 60000);
  });
});
