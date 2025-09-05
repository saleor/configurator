import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertDeploymentSuccess, assertIntrospectionSuccess } from "../../utils/assertions.ts";
import { CliRunner } from "../../utils/cli-runner.ts";
import { getAdminToken, getTestConfig, waitForApi } from "../../utils/test-env.ts";
import { cleanupTempDir, createTempDir, readYaml, writeYaml } from "../../utils/test-helpers.ts";

// Type definitions for config structures
interface Category {
  name: string;
  slug: string;
  description?: string;
}

interface Channel {
  name: string;
  slug: string;
  currencyCode: string;
  defaultCountry: string;
}

interface ConfigWithCategories {
  categories: Category[];
  shop?: unknown;
  productTypes?: unknown;
}

interface ConfigWithChannels {
  channels: Channel[];
  shop?: unknown;
  categories?: unknown;
  productTypes?: unknown;
}

describe("E2E Selective Operations", () => {
  let cli: CliRunner;
  let apiUrl: string;
  let token: string;
  let testDir: string;

  beforeAll(async () => {
    console.log("🚀 Starting selective operations test setup...");

    testDir = await createTempDir("selective-test-");

    const config = getTestConfig();
    apiUrl = config.apiUrl;
    await waitForApi(apiUrl);
    token = await getAdminToken(apiUrl, config.adminEmail, config.adminPassword);
    cli = new CliRunner({ verbose: process.env.VERBOSE === "true" });

    console.log("✅ Selective operations test setup complete");
  }, 60000);

  afterAll(async () => {
    await cleanupTempDir(testDir);
  });

  describe("Include Operations", () => {
    it("should deploy only included sections", async () => {
      const configPath = path.join(testDir, "full-config.yml");

      // Create a comprehensive configuration
      const fullConfig = {
        shop: {
          defaultMailSenderName: "Selective Test Store",
          defaultMailSenderAddress: "selective@test.com",
          description: "A test store for selective operations",
        },
        channels: [
          {
            name: "Test Channel",
            slug: "test-channel",
            currencyCode: "USD",
            defaultCountry: "US",
          },
        ],
        categories: [
          {
            name: "Electronics",
            slug: "electronics",
            description: "Electronic products",
          },
        ],
        productTypes: [
          {
            name: "Simple Product",
            slug: "simple-product",
            hasVariants: false,
          },
        ],
        pageTypes: [
          {
            name: "Basic Page",
            slug: "basic-page",
          },
        ],
      };

      await writeYaml(configPath, fullConfig);

      // Deploy only shop configuration using --include
      console.log("🎯 Deploying only shop configuration...");
      const shopOnlyResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        include: ["shop"],
        skipDiff: true,
      });

      assertDeploymentSuccess(shopOnlyResult);
      expect(shopOnlyResult).toContainInOutput("Selective Test Store");
      // Should not mention other sections
      expect(shopOnlyResult.cleanStdout).not.toMatch(/Electronics|Simple Product|Basic Page/i);

      // Deploy only categories using --include
      console.log("📂 Deploying only categories...");
      const categoriesOnlyResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        include: ["categories"],
        skipDiff: true,
      });

      assertDeploymentSuccess(categoriesOnlyResult);
      expect(categoriesOnlyResult).toContainInOutput("Electronics");

      // Deploy multiple sections using --include
      console.log("🎯 Deploying product types and page types...");
      const multiIncludeResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        include: ["productTypes", "pageTypes"],
        skipDiff: true,
      });

      assertDeploymentSuccess(multiIncludeResult);
      expect(multiIncludeResult).toContainInOutput("Simple Product");
      expect(multiIncludeResult).toContainInOutput("Basic Page");
    }, 60000);

    it("should introspect only included sections", async () => {
      const shopOnlyPath = path.join(testDir, "shop-only.yml");
      const categoriesOnlyPath = path.join(testDir, "categories-only.yml");

      // Introspect only shop configuration
      console.log("📥 Introspecting only shop configuration...");
      const shopIntrospectResult = await cli.introspect(apiUrl, token, {
        config: shopOnlyPath,
        include: ["shop"],
      });

      assertIntrospectionSuccess(shopIntrospectResult);

      const shopConfig = await readYaml(shopOnlyPath);
      expect(shopConfig).toHaveProperty("shop");
      expect(shopConfig).not.toHaveProperty("categories");
      expect(shopConfig).not.toHaveProperty("productTypes");
      expect(shopConfig).not.toHaveProperty("pageTypes");

      // Introspect only categories
      console.log("📥 Introspecting only categories...");
      const categoriesIntrospectResult = await cli.introspect(apiUrl, token, {
        config: categoriesOnlyPath,
        include: ["categories"],
      });

      assertIntrospectionSuccess(categoriesIntrospectResult);

      const categoriesConfig = await readYaml(categoriesOnlyPath);
      expect(categoriesConfig).toHaveProperty("categories");
      expect(categoriesConfig).not.toHaveProperty("shop");
      expect(categoriesConfig).not.toHaveProperty("productTypes");

      // Verify the Electronics category is there
      expect(categoriesConfig.categories).toBeDefined();
      const electronics = (categoriesConfig as ConfigWithCategories).categories.find(
        (c: Category) => c.slug === "electronics"
      );
      expect(electronics).toBeDefined();
    }, 120000);
  });

  describe("Exclude Operations", () => {
    it("should deploy all except excluded sections", async () => {
      const configPath = path.join(testDir, "exclude-config.yml");

      const fullConfig = {
        shop: {
          defaultMailSenderName: "Exclude Test Store",
          defaultMailSenderAddress: "exclude@test.com",
        },
        channels: [
          {
            name: "Exclude Test Channel",
            slug: "exclude-test-channel",
            currencyCode: "EUR",
            defaultCountry: "DE",
          },
        ],
        categories: [
          {
            name: "Toys",
            slug: "toys",
            description: "Toys and games",
          },
        ],
        productTypes: [
          {
            name: "Physical Product",
            slug: "physical-product",
            hasVariants: true,
          },
        ],
      };

      await writeYaml(configPath, fullConfig);

      // Deploy excluding categories
      console.log("🚫 Deploying excluding categories...");
      const excludeCategoriesResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        exclude: ["categories"],
        skipDiff: true,
      });

      assertDeploymentSuccess(excludeCategoriesResult);
      expect(excludeCategoriesResult).toContainInOutput("Exclude Test Store");
      expect(excludeCategoriesResult).toContainInOutput("Physical Product");
      expect(excludeCategoriesResult.cleanStdout).not.toMatch(/Toys/i);

      // Deploy excluding multiple sections
      console.log("🚫 Deploying excluding product types and categories...");
      const multiExcludeResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        exclude: ["categories", "productTypes"],
        skipDiff: true,
      });

      assertDeploymentSuccess(multiExcludeResult);
      expect(multiExcludeResult).toContainInOutput("Exclude Test Store");
      expect(multiExcludeResult).toContainInOutput("Exclude Test Channel");
      expect(multiExcludeResult.cleanStdout).not.toMatch(/Toys|Physical Product/i);
    }, 120000);

    it("should introspect all except excluded sections", async () => {
      const excludeShopPath = path.join(testDir, "exclude-shop.yml");

      // Introspect excluding shop configuration
      console.log("📥 Introspecting excluding shop...");
      const excludeIntrospectResult = await cli.introspect(apiUrl, token, {
        config: excludeShopPath,
        exclude: ["shop"],
      });

      assertIntrospectionSuccess(excludeIntrospectResult);

      const config = await readYaml(excludeShopPath);
      expect(config).not.toHaveProperty("shop");
      expect(config).toHaveProperty("channels");
      expect(config).toHaveProperty("categories");
      expect(config).toHaveProperty("productTypes");

      // Verify we have the expected entities
      const excludeChannel = (config as ConfigWithChannels).channels.find(
        (c: Channel) => c.slug === "exclude-test-channel"
      );
      expect(excludeChannel).toBeDefined();
    }, 120000);
  });

  describe("Include/Exclude Validation", () => {
    it("should reject conflicting include and exclude flags", async () => {
      const configPath = path.join(testDir, "conflict-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Conflict Test",
          defaultMailSenderAddress: "conflict@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      // Try to use both include and exclude - should fail
      console.log("❌ Testing conflicting flags...");
      const conflictResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        include: ["shop"],
        exclude: ["channels"],
        skipDiff: true,
      });

      expect(conflictResult).toHaveFailed();
      expect(conflictResult).toMatchPattern(/cannot.*both.*include.*exclude|mutually exclusive/i);
    });

    it("should reject invalid section names", async () => {
      const configPath = path.join(testDir, "invalid-section-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Invalid Section Test",
          defaultMailSenderAddress: "invalid@test.com",
        },
      };

      await writeYaml(configPath, config);

      // Try to include an invalid section
      console.log("❌ Testing invalid section name...");
      const invalidResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        include: ["invalidSection"],
        skipDiff: true,
      });

      expect(invalidResult).toHaveFailed();
      expect(invalidResult).toMatchPattern(/invalid.*section|unknown.*section/i);
    });
  });

  describe("Diff with Selective Operations", () => {
    it("should show diff only for included sections", async () => {
      const configPath = path.join(testDir, "diff-selective-config.yml");

      // Create initial configuration
      const initialConfig = {
        shop: {
          defaultMailSenderName: "Diff Test Store",
          defaultMailSenderAddress: "diff@test.com",
        },
        channels: [
          {
            name: "Diff Channel",
            slug: "diff-channel",
            currencyCode: "USD",
            defaultCountry: "US",
          },
        ],
        categories: [
          {
            name: "Books",
            slug: "books",
            description: "Books and literature",
          },
        ],
      };

      await writeYaml(configPath, initialConfig);

      // Deploy initial configuration
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });
      assertDeploymentSuccess(deployResult);

      // Modify the configuration
      const modifiedConfig = {
        ...initialConfig,
        shop: {
          ...initialConfig.shop,
          defaultMailSenderName: "Modified Diff Store", // Changed
          description: "Added description", // Added
        },
        categories: [
          {
            name: "Books",
            slug: "books",
            description: "Updated books description", // Changed
          },
          {
            name: "Magazines", // Added
            slug: "magazines",
            description: "Magazines and periodicals",
          },
        ],
      };

      await writeYaml(configPath, modifiedConfig);

      // Run diff including only shop - should only show shop changes
      console.log("📊 Running selective diff (shop only)...");
      const shopDiffResult = await cli.diff(apiUrl, token, {
        config: configPath,
        include: ["shop"],
      });

      expect(shopDiffResult).toHaveSucceeded();
      expect(shopDiffResult).toContainInOutput("Modified Diff Store");
      expect(shopDiffResult).toContainInOutput("Added description");
      expect(shopDiffResult.cleanStdout).not.toMatch(/Magazines|Updated books/i);

      // Run diff including only categories - should only show category changes
      console.log("📊 Running selective diff (categories only)...");
      const categoriesDiffResult = await cli.diff(apiUrl, token, {
        config: configPath,
        include: ["categories"],
      });

      expect(categoriesDiffResult).toHaveSucceeded();
      expect(categoriesDiffResult).toContainInOutput("Magazines");
      expect(categoriesDiffResult).toContainInOutput("Updated books");
      expect(categoriesDiffResult.cleanStdout).not.toMatch(/Modified Diff Store/i);
    }, 120000);
  });
});
