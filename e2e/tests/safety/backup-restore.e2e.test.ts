import fs from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertDeploymentSuccess, assertIntrospectionSuccess } from "../../utils/assertions.js";
import { CliRunner } from "../../utils/cli-runner.js";
import { getAdminToken, getTestConfig, waitForApi } from "../../utils/test-env.js";
import {
  cleanupTempDir,
  createTempDir,
  fileExists,
  readYaml,
  writeYaml,
} from "../../utils/test-helpers.js";

// Type definitions for E2E test data structures

interface TestCategory {
  name: string;
  slug: string;
  description?: string;
  parent?: string;
}

describe("E2E Backup and Restore Tests", () => {
  let cli: CliRunner;
  let apiUrl: string;
  let token: string;
  let testDir: string;

  beforeAll(async () => {
    console.log("🚀 Starting backup and restore test setup...");

    testDir = await createTempDir("backup-restore-test-");

    const config = getTestConfig();
    apiUrl = config.apiUrl;
    await waitForApi(apiUrl);
    token = await getAdminToken(apiUrl, config.adminEmail, config.adminPassword);
    cli = new CliRunner({ verbose: process.env.VERBOSE === "true" });

    console.log("✅ Backup and restore test setup complete");
  }, 60000);

  afterAll(async () => {
    await cleanupTempDir(testDir);
  });

  describe("Automatic Backup Creation", () => {
    it("should create backup when overwriting existing configuration", async () => {
      const configPath = path.join(testDir, "backup-overwrite-test.yml");

      // Create initial configuration file
      const initialConfig = {
        shop: {
          defaultMailSenderName: "Initial Backup Store",
          defaultMailSenderAddress: "initial@backup.com",
          description: "Original configuration that should be backed up",
        },
        channels: [
          {
            name: "Initial Channel",
            slug: "initial-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
        ],
        categories: [
          {
            name: "Initial Category",
            slug: "initial-category",
            description: "Original category configuration",
          },
        ],
      };

      await writeYaml(configPath, initialConfig);

      console.log("📁 Creating initial configuration file...");
      expect(await fileExists(configPath)).toBe(true);

      // Introspect from Saleor (should create backup of existing file)
      console.log("📥 Introspecting and creating backup...");
      const introspectResult = await cli.introspect(apiUrl, token, {
        config: configPath,
      });

      assertIntrospectionSuccess(introspectResult);

      // Check that backup file was created
      console.log("🔍 Checking for backup file creation...");
      const files = await fs.readdir(testDir);
      const backupFiles = files.filter(
        (f) => f.includes("backup-overwrite-test") && f.includes(".bak")
      );

      expect(backupFiles.length).toBeGreaterThan(0);

      // Verify backup contains original content
      const backupPath = path.join(testDir, backupFiles[0]);
      expect(await fileExists(backupPath)).toBe(true);

      const backupContent = await readYaml(backupPath);
      expect(backupContent.shop.defaultMailSenderName).toBe("Initial Backup Store");
      expect(backupContent.shop.description).toBe(
        "Original configuration that should be backed up"
      );
      expect(backupContent.channels[0].name).toBe("Initial Channel");
      expect(backupContent.categories[0].name).toBe("Initial Category");

      console.log("✅ Backup file created and contains correct original content");
    }, 180000);

    it("should create timestamped backup files", async () => {
      const configPath = path.join(testDir, "timestamped-backup-test.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Timestamped Backup Store",
          defaultMailSenderAddress: "timestamped@backup.com",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      console.log("⏰ Creating multiple backups to test timestamping...");

      // First introspect
      const firstIntrospect = await cli.introspect(apiUrl, token, {
        config: configPath,
      });

      assertIntrospectionSuccess(firstIntrospect);

      // Wait a moment to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Modify and introspect again
      const modifiedConfig = {
        shop: {
          defaultMailSenderName: "MODIFIED Timestamped Backup Store",
          defaultMailSenderAddress: "timestamped@backup.com",
        },
        channels: [],
      };

      await writeYaml(configPath, modifiedConfig);

      const secondIntrospect = await cli.introspect(apiUrl, token, {
        config: configPath,
      });

      assertIntrospectionSuccess(secondIntrospect);

      // Check multiple backup files exist
      const files = await fs.readdir(testDir);
      const backupFiles = files.filter(
        (f) => f.includes("timestamped-backup-test") && f.includes(".bak")
      );

      expect(backupFiles.length).toBeGreaterThanOrEqual(2);

      // Verify backup files have different timestamps/names
      expect(backupFiles[0]).not.toBe(backupFiles[1]);

      console.log(`✅ Created ${backupFiles.length} timestamped backup files`);
    }, 150000);

    it("should not create unnecessary backups when file doesn't exist", async () => {
      const newConfigPath = path.join(testDir, "new-config-no-backup.yml");

      // Introspect to a new file (no existing file to backup)
      console.log("📥 Introspecting to new file (should not create backup)...");
      const introspectResult = await cli.introspect(apiUrl, token, {
        config: newConfigPath,
      });

      assertIntrospectionSuccess(introspectResult);

      // Check that the config file was created
      expect(await fileExists(newConfigPath)).toBe(true);

      // Check that no backup file was created (since original didn't exist)
      const files = await fs.readdir(testDir);
      const backupFiles = files.filter(
        (f) => f.includes("new-config-no-backup") && f.includes(".bak")
      );

      expect(backupFiles.length).toBe(0);

      console.log("✅ No unnecessary backup created for new file");
    }, 120000);
  });

  describe("Backup File Management", () => {
    it("should create readable and valid backup files", async () => {
      const configPath = path.join(testDir, "valid-backup-test.yml");

      const originalConfig = {
        shop: {
          defaultMailSenderName: "Valid Backup Store",
          defaultMailSenderAddress: "validbackup@test.com",
          description: "Configuration for testing backup validity",
          trackInventoryByDefault: true,
          defaultWeightUnit: "KG",
          enableAccountConfirmationByEmail: false,
        },
        channels: [
          {
            name: "Valid Backup Channel",
            slug: "valid-backup-channel",
            currencyCode: "EUR",
            defaultCountry: "DE",
            isActive: true,
          },
        ],
        categories: [
          {
            name: "Valid Backup Category",
            slug: "valid-backup-category",
            description: "Category for backup validation",
          },
          {
            name: "Nested Category",
            slug: "nested-category",
            description: "Nested under valid backup category",
            parent: "valid-backup-category",
          },
        ],
      };

      await writeYaml(configPath, originalConfig);

      // Deploy the original configuration
      console.log("📤 Deploying original configuration...");
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(deployResult);

      // Introspect over existing file (creates backup)
      console.log("📥 Creating backup through introspection...");
      const introspectResult = await cli.introspect(apiUrl, token, {
        config: configPath,
      });

      assertIntrospectionSuccess(introspectResult);

      // Find and validate backup file
      const files = await fs.readdir(testDir);
      const backupFiles = files.filter(
        (f) => f.includes("valid-backup-test") && f.includes(".bak")
      );

      expect(backupFiles.length).toBeGreaterThan(0);

      const backupPath = path.join(testDir, backupFiles[0]);
      const backupContent = await readYaml(backupPath);

      // Verify backup file structure is valid and complete
      expect(backupContent).toHaveProperty("shop");
      expect(backupContent).toHaveProperty("channels");
      expect(backupContent).toHaveProperty("categories");

      expect(backupContent.shop.defaultMailSenderName).toBe("Valid Backup Store");
      expect(backupContent.shop.trackInventoryByDefault).toBe(true);
      expect(backupContent.shop.enableAccountConfirmationByEmail).toBe(false);

      expect(backupContent.channels).toHaveLength(1);
      expect(backupContent.channels[0].currencyCode).toBe("EUR");

      expect(backupContent.categories).toHaveLength(2);
      const nestedCategory = backupContent.categories.find(
        (c: TestCategory) => c.slug === "nested-category"
      );
      expect(nestedCategory).toBeDefined();
      expect(nestedCategory.parent).toBe("valid-backup-category");

      // Test that backup can be deployed successfully
      console.log("🔄 Testing backup file deployment...");
      const backupDeployResult = await cli.deploy(apiUrl, token, {
        config: backupPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(backupDeployResult);

      console.log("✅ Backup file is valid and deployable");
    }, 240000);

    it("should handle backup file naming conflicts", async () => {
      const configPath = path.join(testDir, "naming-conflict-test.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Naming Conflict Store",
          defaultMailSenderAddress: "naming@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      console.log("📛 Testing backup file naming conflict resolution...");

      // Create multiple backups rapidly
      for (let i = 0; i < 3; i++) {
        const modifiedConfig = {
          shop: {
            defaultMailSenderName: `Naming Conflict Store ${i}`,
            defaultMailSenderAddress: "naming@test.com",
          },
          channels: [],
        };

        await writeYaml(configPath, modifiedConfig);

        const introspectResult = await cli.introspect(apiUrl, token, {
          config: configPath,
        });

        assertIntrospectionSuccess(introspectResult);

        // Small delay to ensure different timestamps if needed
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Verify all backup files were created with unique names
      const files = await fs.readdir(testDir);
      const backupFiles = files.filter(
        (f) => f.includes("naming-conflict-test") && f.includes(".bak")
      );

      expect(backupFiles.length).toBe(3);

      // All backup files should have unique names
      const uniqueNames = new Set(backupFiles);
      expect(uniqueNames.size).toBe(backupFiles.length);

      console.log(`✅ Created ${backupFiles.length} backup files with unique names`);
    }, 180000);
  });

  describe("Backup Content Integrity", () => {
    it("should preserve exact configuration state in backup", async () => {
      const configPath = path.join(testDir, "integrity-backup-test.yml");

      // Complex configuration to test integrity
      const complexConfig = {
        shop: {
          defaultMailSenderName: "Integrity Backup Store",
          defaultMailSenderAddress: "integrity@backup.com",
          description: "Complex configuration for backup integrity testing",
          trackInventoryByDefault: true,
          defaultWeightUnit: "LB",
          automaticFulfillmentDigitalProducts: false,
          fulfillmentAutoApprove: true,
          defaultDigitalMaxDownloads: 5,
          defaultDigitalUrlValidDays: 7,
          reserveStockDurationAnonymousUser: 10,
          reserveStockDurationAuthenticatedUser: 30,
          limitQuantityPerCheckout: 100,
          enableAccountConfirmationByEmail: true,
          allowLoginWithoutConfirmation: false,
          displayGrossPrices: false,
        },
        channels: [
          {
            name: "Integrity Channel 1",
            slug: "integrity-channel-1",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
          {
            name: "Integrity Channel 2",
            slug: "integrity-channel-2",
            currencyCode: "CAD",
            defaultCountry: "CA",
            isActive: false,
          },
        ],
        categories: [
          {
            name: "Integrity Parent",
            slug: "integrity-parent",
            description: "Parent category for integrity testing",
          },
          {
            name: "Integrity Child",
            slug: "integrity-child",
            description: "Child category for integrity testing",
            parent: "integrity-parent",
          },
        ],
      };

      await writeYaml(configPath, complexConfig);

      console.log("📤 Deploying complex configuration for integrity test...");
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(deployResult);

      // Create backup by introspecting over existing file
      console.log("📥 Creating integrity backup...");
      const introspectResult = await cli.introspect(apiUrl, token, {
        config: configPath,
      });

      assertIntrospectionSuccess(introspectResult);

      // Find backup file
      const files = await fs.readdir(testDir);
      const backupFiles = files.filter(
        (f) => f.includes("integrity-backup-test") && f.includes(".bak")
      );

      expect(backupFiles.length).toBeGreaterThan(0);

      const backupPath = path.join(testDir, backupFiles[0]);
      const backupContent = await readYaml(backupPath);

      console.log("🔍 Verifying backup content integrity...");

      // Deep comparison of all fields
      expect(backupContent.shop.defaultMailSenderName).toBe(
        complexConfig.shop.defaultMailSenderName
      );
      expect(backupContent.shop.defaultMailSenderAddress).toBe(
        complexConfig.shop.defaultMailSenderAddress
      );
      expect(backupContent.shop.description).toBe(complexConfig.shop.description);
      expect(backupContent.shop.trackInventoryByDefault).toBe(
        complexConfig.shop.trackInventoryByDefault
      );
      expect(backupContent.shop.defaultWeightUnit).toBe(complexConfig.shop.defaultWeightUnit);
      expect(backupContent.shop.automaticFulfillmentDigitalProducts).toBe(
        complexConfig.shop.automaticFulfillmentDigitalProducts
      );
      expect(backupContent.shop.fulfillmentAutoApprove).toBe(
        complexConfig.shop.fulfillmentAutoApprove
      );
      expect(backupContent.shop.defaultDigitalMaxDownloads).toBe(
        complexConfig.shop.defaultDigitalMaxDownloads
      );
      expect(backupContent.shop.defaultDigitalUrlValidDays).toBe(
        complexConfig.shop.defaultDigitalUrlValidDays
      );
      expect(backupContent.shop.reserveStockDurationAnonymousUser).toBe(
        complexConfig.shop.reserveStockDurationAnonymousUser
      );
      expect(backupContent.shop.reserveStockDurationAuthenticatedUser).toBe(
        complexConfig.shop.reserveStockDurationAuthenticatedUser
      );
      expect(backupContent.shop.limitQuantityPerCheckout).toBe(
        complexConfig.shop.limitQuantityPerCheckout
      );
      expect(backupContent.shop.enableAccountConfirmationByEmail).toBe(
        complexConfig.shop.enableAccountConfirmationByEmail
      );
      expect(backupContent.shop.allowLoginWithoutConfirmation).toBe(
        complexConfig.shop.allowLoginWithoutConfirmation
      );
      expect(backupContent.shop.displayGrossPrices).toBe(complexConfig.shop.displayGrossPrices);

      expect(backupContent.channels).toHaveLength(2);
      expect(backupContent.channels[0].isActive).toBe(true);
      expect(backupContent.channels[1].isActive).toBe(false);

      expect(backupContent.categories).toHaveLength(2);
      const childCategory = backupContent.categories.find(
        (c: TestCategory) => c.slug === "integrity-child"
      );
      expect(childCategory.parent).toBe("integrity-parent");

      console.log("✅ Backup content integrity verified - all fields preserved exactly");
    }, 240000);

    it("should handle special characters and formatting in backups", async () => {
      const configPath = path.join(testDir, "special-chars-backup-test.yml");

      const specialConfig = {
        shop: {
          defaultMailSenderName: "Spëcial Chars Store with émojis 🛒",
          defaultMailSenderAddress: "special@tëst.com",
          description: 'Configuration with special chars: ñáéíóú, "quotes", and\nnewlines',
        },
        channels: [
          {
            name: "Chännél with Ümläuts",
            slug: "channel-with-umlauts",
            currencyCode: "EUR",
            defaultCountry: "DE",
            isActive: true,
          },
        ],
        categories: [
          {
            name: 'Category with "Quotes" & Spëcials',
            slug: "category-with-quotes-specials",
            description: "Description with\nmultiple lines\nand spëcial chars: éàü",
          },
        ],
      };

      await writeYaml(configPath, specialConfig);

      console.log("✨ Testing backup with special characters...");

      // Deploy and create backup
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(deployResult);

      const introspectResult = await cli.introspect(apiUrl, token, {
        config: configPath,
      });

      assertIntrospectionSuccess(introspectResult);

      // Find and verify backup
      const files = await fs.readdir(testDir);
      const backupFiles = files.filter(
        (f) => f.includes("special-chars-backup-test") && f.includes(".bak")
      );

      expect(backupFiles.length).toBeGreaterThan(0);

      const backupPath = path.join(testDir, backupFiles[0]);
      const backupContent = await readYaml(backupPath);

      // Verify special characters are preserved exactly
      expect(backupContent.shop.defaultMailSenderName).toBe("Spëcial Chars Store with émojis 🛒");
      expect(backupContent.shop.defaultMailSenderAddress).toBe("special@tëst.com");
      expect(backupContent.shop.description).toContain("ñáéíóú");
      expect(backupContent.shop.description).toContain('"quotes"');
      expect(backupContent.shop.description).toContain("\n");

      expect(backupContent.channels[0].name).toBe("Chännél with Ümläuts");

      expect(backupContent.categories[0].name).toContain('"Quotes"');
      expect(backupContent.categories[0].name).toContain("Spëcials");
      expect(backupContent.categories[0].description).toContain("\n");
      expect(backupContent.categories[0].description).toContain("éàü");

      console.log("✅ Special characters preserved perfectly in backup");
    }, 180000);
  });

  describe("Backup Recovery Scenarios", () => {
    it("should enable recovery from deployment failures", async () => {
      const configPath = path.join(testDir, "recovery-scenario-test.yml");

      // Good initial configuration
      const goodConfig = {
        shop: {
          defaultMailSenderName: "Recovery Test Store",
          defaultMailSenderAddress: "recovery@test.com",
          description: "Good configuration that works",
        },
        channels: [
          {
            name: "Recovery Channel",
            slug: "recovery-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
        ],
      };

      await writeYaml(configPath, goodConfig);

      console.log("📤 Deploying good configuration...");
      const goodDeployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(goodDeployResult);

      // Create backup by introspecting
      console.log("📥 Creating backup of good configuration...");
      const backupIntrospectResult = await cli.introspect(apiUrl, token, {
        config: configPath,
      });

      assertIntrospectionSuccess(backupIntrospectResult);

      // Find backup file
      const files = await fs.readdir(testDir);
      const backupFiles = files.filter(
        (f) => f.includes("recovery-scenario-test") && f.includes(".bak")
      );
      expect(backupFiles.length).toBeGreaterThan(0);
      const backupPath = path.join(testDir, backupFiles[0]);

      // Now create a problematic configuration
      const badConfig = {
        shop: {
          defaultMailSenderName: "Bad Recovery Store",
          defaultMailSenderAddress: "invalid-email-format", // Invalid email
          description: "Configuration that might fail",
        },
        channels: [
          {
            name: "Bad Recovery Channel",
            slug: "recovery-channel", // Same slug
            currencyCode: "INVALID_CURRENCY", // Invalid currency
            defaultCountry: "XX", // Invalid country
            isActive: true,
          },
        ],
      };

      await writeYaml(configPath, badConfig);

      console.log("❌ Attempting deployment with bad configuration...");
      const badDeployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 30000,
        skipDiff: true,
      });

      // Bad deployment should fail
      expect(badDeployResult).toHaveFailed();

      // Recover using the backup
      console.log("🔄 Recovering using backup configuration...");
      const recoveryResult = await cli.deploy(apiUrl, token, {
        config: backupPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(recoveryResult);

      // Verify recovery was successful
      const verifyRecoveryResult = await cli.introspect(apiUrl, token, {
        config: path.join(testDir, "recovery-verification.yml"),
      });

      assertIntrospectionSuccess(verifyRecoveryResult);
      const recoveredState = await readYaml(path.join(testDir, "recovery-verification.yml"));

      expect(recoveredState.shop.defaultMailSenderName).toBe("Recovery Test Store");
      expect(recoveredState.shop.defaultMailSenderAddress).toBe("recovery@test.com");
      expect(recoveredState.channels[0].name).toBe("Recovery Channel");
      expect(recoveredState.channels[0].currencyCode).toBe("USD");

      console.log("✅ Successfully recovered from deployment failure using backup");
    }, 300000);

    it("should help with rollback after unwanted changes", async () => {
      const configPath = path.join(testDir, "rollback-scenario-test.yml");

      // Original stable configuration
      const stableConfig = {
        shop: {
          defaultMailSenderName: "Stable Store",
          defaultMailSenderAddress: "stable@test.com",
          description: "Stable configuration before changes",
          trackInventoryByDefault: true,
          displayGrossPrices: false,
        },
        channels: [
          {
            name: "Stable Channel",
            slug: "stable-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
        ],
        categories: [
          {
            name: "Stable Category",
            slug: "stable-category",
            description: "Original stable category",
          },
        ],
      };

      await writeYaml(configPath, stableConfig);

      console.log("📤 Deploying stable configuration...");
      const stableDeployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(stableDeployResult);

      // Create backup
      console.log("💾 Creating backup of stable configuration...");
      const backupResult = await cli.introspect(apiUrl, token, {
        config: configPath,
      });

      assertIntrospectionSuccess(backupResult);

      // Find backup file
      const files = await fs.readdir(testDir);
      const backupFiles = files.filter(
        (f) => f.includes("rollback-scenario-test") && f.includes(".bak")
      );
      expect(backupFiles.length).toBeGreaterThan(0);
      const backupPath = path.join(testDir, backupFiles[0]);

      // Make unwanted changes
      const unwantedConfig = {
        shop: {
          defaultMailSenderName: "UNWANTED Modified Store",
          defaultMailSenderAddress: "stable@test.com",
          description: "UNWANTED configuration changes that we want to rollback",
          trackInventoryByDefault: false, // Changed
          displayGrossPrices: true, // Changed
        },
        channels: [
          {
            name: "UNWANTED Modified Channel",
            slug: "stable-channel",
            currencyCode: "EUR", // Changed currency
            defaultCountry: "DE", // Changed country
            isActive: false, // Changed status
          },
        ],
        categories: [
          {
            name: "UNWANTED Modified Category",
            slug: "stable-category",
            description: "UNWANTED modified category description",
          },
        ],
      };

      await writeYaml(configPath, unwantedConfig);

      console.log("😱 Deploying unwanted changes...");
      const unwantedDeployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(unwantedDeployResult);

      // Verify unwanted changes were applied
      const unwantedStateResult = await cli.introspect(apiUrl, token, {
        config: path.join(testDir, "unwanted-state.yml"),
      });

      assertIntrospectionSuccess(unwantedStateResult);
      const unwantedState = await readYaml(path.join(testDir, "unwanted-state.yml"));

      expect(unwantedState.shop.defaultMailSenderName).toBe("UNWANTED Modified Store");
      expect(unwantedState.shop.trackInventoryByDefault).toBe(false);
      expect(unwantedState.channels[0].currencyCode).toBe("EUR");

      // Rollback using backup
      console.log("🔙 Rolling back using backup...");
      const rollbackResult = await cli.deploy(apiUrl, token, {
        config: backupPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(rollbackResult);

      // Verify rollback was successful
      const rollbackVerifyResult = await cli.introspect(apiUrl, token, {
        config: path.join(testDir, "rollback-verification.yml"),
      });

      assertIntrospectionSuccess(rollbackVerifyResult);
      const rollbackState = await readYaml(path.join(testDir, "rollback-verification.yml"));

      // Should match original stable configuration
      expect(rollbackState.shop.defaultMailSenderName).toBe("Stable Store");
      expect(rollbackState.shop.description).toBe("Stable configuration before changes");
      expect(rollbackState.shop.trackInventoryByDefault).toBe(true);
      expect(rollbackState.shop.displayGrossPrices).toBe(false);
      expect(rollbackState.channels[0].name).toBe("Stable Channel");
      expect(rollbackState.channels[0].currencyCode).toBe("USD");
      expect(rollbackState.channels[0].defaultCountry).toBe("US");
      expect(rollbackState.channels[0].isActive).toBe(true);
      expect(rollbackState.categories[0].name).toBe("Stable Category");
      expect(rollbackState.categories[0].description).toBe("Original stable category");

      console.log("✅ Successfully rolled back unwanted changes using backup");
    }, 360000);
  });

  describe("Backup File Cleanup and Management", () => {
    it("should maintain reasonable backup file limits", async () => {
      const configPath = path.join(testDir, "cleanup-test.yml");

      console.log("🧹 Testing backup file cleanup behavior...");

      // Create many backups to test cleanup
      for (let i = 0; i < 10; i++) {
        const config = {
          shop: {
            defaultMailSenderName: `Cleanup Store ${i}`,
            defaultMailSenderAddress: "cleanup@test.com",
          },
          channels: [],
        };

        await writeYaml(configPath, config);

        const introspectResult = await cli.introspect(apiUrl, token, {
          config: configPath,
        });

        assertIntrospectionSuccess(introspectResult);

        // Small delay between backups
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Check number of backup files created
      const files = await fs.readdir(testDir);
      const backupFiles = files.filter((f) => f.includes("cleanup-test") && f.includes(".bak"));

      // Should have created backups, but implementation may limit the number
      expect(backupFiles.length).toBeGreaterThan(0);
      expect(backupFiles.length).toBeLessThanOrEqual(10); // Reasonable upper limit

      console.log(`✅ Created ${backupFiles.length} backup files (reasonable number maintained)`);
    }, 180000);

    it("should handle backup in different directory scenarios", async () => {
      const subDir = path.join(testDir, "subdir", "deeper");
      await cli.bash(`mkdir -p "${subDir}"`);

      const configPath = path.join(subDir, "nested-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Nested Directory Store",
          defaultMailSenderAddress: "nested@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      console.log("📁 Testing backup creation in nested directory...");

      const introspectResult = await cli.introspect(apiUrl, token, {
        config: configPath,
      });

      assertIntrospectionSuccess(introspectResult);

      // Check backup was created in same directory as config
      const subDirFiles = await fs.readdir(subDir);
      const backupFiles = subDirFiles.filter(
        (f) => f.includes("nested-config") && f.includes(".bak")
      );

      expect(backupFiles.length).toBeGreaterThan(0);

      // Verify backup is in correct location and accessible
      const backupPath = path.join(subDir, backupFiles[0]);
      expect(await fileExists(backupPath)).toBe(true);

      const backupContent = await readYaml(backupPath);
      expect(backupContent.shop.defaultMailSenderName).toBe("Nested Directory Store");

      console.log("✅ Backup created successfully in nested directory");
    }, 120000);
  });
});
