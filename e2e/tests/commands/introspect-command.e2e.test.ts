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
import { assertIntrospectionSuccess, assertDeploymentSuccess } from "../../utils/assertions.js";
import path from "node:path";
import fs from "node:fs/promises";

describe("E2E Introspect Command", () => {
  let container: SaleorTestContainer;
  let cli: CliRunner;
  let apiUrl: string;
  let token: string;
  let testDir: string;

  beforeAll(async () => {
    console.log("🚀 Starting introspect command test setup...");
    
    testDir = await createTempDir("introspect-test-");
    
    container = new SaleorTestContainer({
      projectName: "saleor-introspect-test",
    });
    await container.start();
    
    apiUrl = container.getApiUrl();
    token = container.getAdminToken();
    cli = new CliRunner({ verbose: process.env.VERBOSE === "true" });
    
    console.log("✅ Introspect command test setup complete");
  }, 180000);

  afterAll(async () => {
    await container?.stop();
    await cleanupTempDir(testDir);
  });

  describe("Introspect Command Basic Operations", () => {
    it("should introspect from clean Saleor instance", async () => {
      const configPath = path.join(testDir, "clean-introspect.yml");
      
      console.log("📥 Introspecting from clean Saleor instance...");
      const result = await cli.introspect(apiUrl, token, {
        config: configPath
      });
      
      assertIntrospectionSuccess(result);
      expect(result).toContainInOutput("completed");
      expect(await fileExists(configPath)).toBe(true);
      
      // Verify the introspected configuration structure
      const config = await readYaml(configPath);
      expect(config).toHaveProperty("shop");
      expect(config).toHaveProperty("channels");
      expect(config.channels).toBeInstanceOf(Array);
      
      // Should have basic shop configuration
      expect(config.shop).toHaveProperty("defaultMailSenderName");
      expect(config.shop).toHaveProperty("defaultMailSenderAddress");
    }, 120000);

    it("should create backup when overwriting existing config", async () => {
      const configPath = path.join(testDir, "backup-test.yml");
      
      // Create initial config file
      const initialConfig = {
        shop: {
          defaultMailSenderName: "Initial Store",
          defaultMailSenderAddress: "initial@test.com"
        },
        channels: []
      };
      
      await writeYaml(configPath, initialConfig);
      
      console.log("💾 Testing backup creation on overwrite...");
      const result = await cli.introspect(apiUrl, token, {
        config: configPath
      });
      
      assertIntrospectionSuccess(result);
      
      // Should create a backup file
      const files = await fs.readdir(testDir);
      const backupFiles = files.filter(f => f.includes("backup-test") && f.includes(".bak"));
      expect(backupFiles.length).toBeGreaterThan(0);
      
      // Backup should contain the initial config
      const backupPath = path.join(testDir, backupFiles[0]);
      const backupConfig = await readYaml(backupPath);
      expect(backupConfig.shop.defaultMailSenderName).toBe("Initial Store");
    }, 120000);
  });

  describe("Introspect Command with Existing Data", () => {
    it("should introspect after deploying complex configuration", async () => {
      const deployConfigPath = path.join(testDir, "deploy-complex.yml");
      const introspectConfigPath = path.join(testDir, "introspect-complex.yml");
      
      // First deploy a complex configuration
      const complexConfig = {
        shop: {
          defaultMailSenderName: "Complex Introspect Store",
          defaultMailSenderAddress: "complex@introspect.com",
          description: "A store for testing complex introspection"
        },
        channels: [
          {
            name: "Introspect Channel A",
            slug: "introspect-channel-a",
            currencyCode: "USD",
            defaultCountry: "US"
          },
          {
            name: "Introspect Channel B",
            slug: "introspect-channel-b",
            currencyCode: "EUR",
            defaultCountry: "DE"
          }
        ],
        categories: [
          {
            name: "Electronics Introspect",
            slug: "electronics-introspect",
            description: "Electronics for introspection testing"
          },
          {
            name: "Mobile Introspect",
            slug: "mobile-introspect",
            description: "Mobile devices for testing",
            parent: "electronics-introspect"
          }
        ],
        productTypes: [
          {
            name: "Introspect Product Type",
            slug: "introspect-product-type",
            hasVariants: true,
            productAttributes: [
              {
                name: "Introspect Brand",
                slug: "introspect-brand",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                choices: ["Brand A", "Brand B", "Brand C"]
              }
            ],
            variantAttributes: [
              {
                name: "Introspect Color",
                slug: "introspect-color",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                choices: ["Red", "Blue", "Green"]
              }
            ]
          }
        ],
        pageTypes: [
          {
            name: "Introspect Page Type",
            slug: "introspect-page-type",
            attributes: [
              {
                name: "Introspect Title",
                slug: "introspect-title",
                type: "PLAIN_TEXT",
                inputType: "PLAIN_TEXT"
              }
            ]
          }
        ]
      };
      
      await writeYaml(deployConfigPath, complexConfig);
      
      console.log("🚀 Deploying complex configuration first...");
      const deployResult = await cli.deploy(apiUrl, token, {
        config: deployConfigPath,
        skipDiff: true
      });
      assertDeploymentSuccess(deployResult);
      
      // Now introspect the deployed configuration
      console.log("📥 Introspecting deployed complex configuration...");
      const introspectResult = await cli.introspect(apiUrl, token, {
        config: introspectConfigPath
      });
      
      assertIntrospectionSuccess(introspectResult);
      
      const introspectedConfig = await readYaml(introspectConfigPath);
      
      // Verify shop configuration
      expect(introspectedConfig.shop.defaultMailSenderName).toBe("Complex Introspect Store");
      expect(introspectedConfig.shop.defaultMailSenderAddress).toBe("complex@introspect.com");
      expect(introspectedConfig.shop.description).toBe("A store for testing complex introspection");
      
      // Verify channels
      expect(introspectedConfig.channels).toBeDefined();
      expect(introspectedConfig.channels.length).toBeGreaterThanOrEqual(2);
      
      const channelA = introspectedConfig.channels.find((c: any) => c.slug === "introspect-channel-a");
      const channelB = introspectedConfig.channels.find((c: any) => c.slug === "introspect-channel-b");
      expect(channelA).toBeDefined();
      expect(channelB).toBeDefined();
      expect(channelA.currencyCode).toBe("USD");
      expect(channelB.currencyCode).toBe("EUR");
      
      // Verify category hierarchy
      expect(introspectedConfig.categories).toBeDefined();
      const electronicsCategory = introspectedConfig.categories.find((c: any) => c.slug === "electronics-introspect");
      const mobileCategory = introspectedConfig.categories.find((c: any) => c.slug === "mobile-introspect");
      expect(electronicsCategory).toBeDefined();
      expect(mobileCategory).toBeDefined();
      expect(mobileCategory.parent).toBe("electronics-introspect");
      
      // Verify product types with attributes
      expect(introspectedConfig.productTypes).toBeDefined();
      const productType = introspectedConfig.productTypes.find((pt: any) => pt.slug === "introspect-product-type");
      expect(productType).toBeDefined();
      expect(productType.hasVariants).toBe(true);
      
      const brandAttribute = productType.productAttributes.find((attr: any) => attr.slug === "introspect-brand");
      const colorAttribute = productType.variantAttributes.find((attr: any) => attr.slug === "introspect-color");
      expect(brandAttribute).toBeDefined();
      expect(colorAttribute).toBeDefined();
      expect(brandAttribute.choices).toContain("Brand A");
      expect(colorAttribute.choices).toContain("Red");
      
      // Verify page types
      expect(introspectedConfig.pageTypes).toBeDefined();
      const pageType = introspectedConfig.pageTypes.find((pt: any) => pt.slug === "introspect-page-type");
      expect(pageType).toBeDefined();
      
      const titleAttribute = pageType.attributes.find((attr: any) => attr.slug === "introspect-title");
      expect(titleAttribute).toBeDefined();
      
      console.log("✅ Complex configuration introspected successfully");
    }, 240000);
  });

  describe("Introspect Command Error Handling", () => {
    it("should handle authentication errors gracefully", async () => {
      const configPath = path.join(testDir, "auth-error-introspect.yml");
      
      console.log("🔐 Testing introspect authentication error...");
      const result = await cli.introspect(apiUrl, "invalid-token-12345", {
        config: configPath
      });
      
      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/auth|permission|unauthorized|token/i);
    }, 60000);

    it("should handle network errors gracefully", async () => {
      const configPath = path.join(testDir, "network-error-introspect.yml");
      
      console.log("🌐 Testing introspect network error...");
      const result = await cli.introspect("http://localhost:99999/graphql/", token, {
        config: configPath,
        timeout: 5000
      });
      
      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/connect|network|ECONNREFUSED|timeout/i);
    }, 30000);

    it("should handle write permission errors", async () => {
      const readOnlyDir = path.join(testDir, "readonly");
      await fs.mkdir(readOnlyDir, { mode: 0o444 }); // Read-only directory
      const readOnlyConfigPath = path.join(readOnlyDir, "readonly.yml");
      
      console.log("📁 Testing write permission error...");
      const result = await cli.introspect(apiUrl, token, {
        config: readOnlyConfigPath
      });
      
      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/permission|access|write|EACCES|EPERM/i);
      
      // Clean up - restore write permissions
      await fs.chmod(readOnlyDir, 0o755);
    }, 60000);
  });

  describe("Introspect Command Output Validation", () => {
    it("should generate valid YAML output", async () => {
      const configPath = path.join(testDir, "yaml-validation.yml");
      
      console.log("📝 Testing YAML output validation...");
      const result = await cli.introspect(apiUrl, token, {
        config: configPath
      });
      
      assertIntrospectionSuccess(result);
      
      // Should be able to parse the generated YAML without errors
      let config;
      try {
        config = await readYaml(configPath);
      } catch (error) {
        throw new Error(`Generated YAML is invalid: ${error}`);
      }
      
      // Verify required top-level structure
      expect(typeof config).toBe("object");
      expect(config).toHaveProperty("shop");
      expect(config).toHaveProperty("channels");
      
      // Verify shop structure
      expect(typeof config.shop).toBe("object");
      expect(typeof config.shop.defaultMailSenderName).toBe("string");
      expect(typeof config.shop.defaultMailSenderAddress).toBe("string");
      
      // Verify channels structure
      expect(Array.isArray(config.channels)).toBe(true);
    }, 120000);

    it("should preserve data types and structures", async () => {
      const deployConfigPath = path.join(testDir, "types-deploy.yml");
      const introspectConfigPath = path.join(testDir, "types-introspect.yml");
      
      // Deploy configuration with various data types
      const typesConfig = {
        shop: {
          defaultMailSenderName: "Types Test Store",
          defaultMailSenderAddress: "types@test.com",
          description: "Testing data type preservation"
        },
        channels: [
          {
            name: "Types Channel",
            slug: "types-channel",
            currencyCode: "USD",
            defaultCountry: "US"
          }
        ],
        productTypes: [
          {
            name: "Types Product",
            slug: "types-product",
            hasVariants: true, // Boolean
            productAttributes: [
              {
                name: "Numeric Attribute",
                slug: "numeric-attribute",
                type: "NUMERIC",
                inputType: "NUMERIC"
              },
              {
                name: "Boolean Attribute",
                slug: "boolean-attribute",
                type: "BOOLEAN",
                inputType: "BOOLEAN"
              },
              {
                name: "Date Attribute",
                slug: "date-attribute",
                type: "DATE",
                inputType: "DATE"
              }
            ]
          }
        ]
      };
      
      await writeYaml(deployConfigPath, typesConfig);
      
      // Deploy first
      const deployResult = await cli.deploy(apiUrl, token, {
        config: deployConfigPath,
        skipDiff: true
      });
      assertDeploymentSuccess(deployResult);
      
      // Introspect back
      console.log("🔍 Testing data type preservation...");
      const introspectResult = await cli.introspect(apiUrl, token, {
        config: introspectConfigPath
      });
      
      assertIntrospectionSuccess(introspectResult);
      
      const introspectedConfig = await readYaml(introspectConfigPath);
      
      // Verify boolean values are preserved
      const productType = introspectedConfig.productTypes.find((pt: any) => pt.slug === "types-product");
      expect(productType).toBeDefined();
      expect(typeof productType.hasVariants).toBe("boolean");
      expect(productType.hasVariants).toBe(true);
      
      // Verify attribute types are preserved
      const numericAttr = productType.productAttributes.find((attr: any) => attr.slug === "numeric-attribute");
      const booleanAttr = productType.productAttributes.find((attr: any) => attr.slug === "boolean-attribute");
      const dateAttr = productType.productAttributes.find((attr: any) => attr.slug === "date-attribute");
      
      expect(numericAttr).toBeDefined();
      expect(booleanAttr).toBeDefined();
      expect(dateAttr).toBeDefined();
      expect(numericAttr.type).toBe("NUMERIC");
      expect(booleanAttr.type).toBe("BOOLEAN");
      expect(dateAttr.type).toBe("DATE");
    }, 180000);
  });

  describe("Introspect Command File Handling", () => {
    it("should handle different file paths correctly", async () => {
      // Test with nested directory
      const nestedDir = path.join(testDir, "nested", "config");
      await fs.mkdir(nestedDir, { recursive: true });
      const nestedConfigPath = path.join(nestedDir, "nested-config.yml");
      
      console.log("📂 Testing nested directory creation...");
      const nestedResult = await cli.introspect(apiUrl, token, {
        config: nestedConfigPath
      });
      
      assertIntrospectionSuccess(nestedResult);
      expect(await fileExists(nestedConfigPath)).toBe(true);
      
      // Test with existing file overwrite
      const existingConfigPath = path.join(testDir, "existing-config.yml");
      const existingConfig = {
        shop: { defaultMailSenderName: "Old Store", defaultMailSenderAddress: "old@test.com" },
        channels: []
      };
      await writeYaml(existingConfigPath, existingConfig);
      
      console.log("🔄 Testing existing file overwrite...");
      const overwriteResult = await cli.introspect(apiUrl, token, {
        config: existingConfigPath
      });
      
      assertIntrospectionSuccess(overwriteResult);
      
      // Should contain new introspected data, not old data
      const newConfig = await readYaml(existingConfigPath);
      expect(newConfig.shop.defaultMailSenderName).not.toBe("Old Store");
    }, 120000);
  });
});