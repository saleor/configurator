import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertDeploymentSuccess, assertIntrospectionSuccess } from "../../utils/assertions.ts";
import { CliRunner } from "../../utils/cli-runner.ts";
import { getAdminToken, getTestConfig, waitForApi } from "../../utils/test-env.ts";
import { cleanupTempDir, createTempDir, readYaml, writeYaml } from "../../utils/test-helpers.ts";

describe("E2E Complex Scenarios", () => {
  let cli: CliRunner;
  let apiUrl: string;
  let token: string;
  let testDir: string;

  beforeAll(async () => {
    console.log("🚀 Starting complex scenarios test setup...");

    testDir = await createTempDir("complex-test-");

    const config = getTestConfig();
    apiUrl = config.apiUrl;
    await waitForApi(apiUrl);
    token = await getAdminToken(apiUrl, config.adminEmail, config.adminPassword);
    cli = new CliRunner({ verbose: process.env.VERBOSE === "true" });

    console.log("✅ Complex scenarios test setup complete");
  }, 60000);

  afterAll(async () => {
    await cleanupTempDir(testDir);
  });

  describe("Multi-Channel E-commerce Setup", () => {
    it("should handle complex multi-region setup with products and channels", async () => {
      const configPath = path.join(testDir, "multi-region-config.yml");

      const complexConfig = {
        shop: {
          defaultMailSenderName: "Global Commerce Store",
          defaultMailSenderAddress: "global@commerce.com",
          description: "A multi-region e-commerce platform",
        },
        channels: [
          {
            name: "North America",
            slug: "north-america",
            currencyCode: "USD",
            defaultCountry: "US",
          },
          {
            name: "Europe",
            slug: "europe",
            currencyCode: "EUR",
            defaultCountry: "DE",
          },
          {
            name: "Asia Pacific",
            slug: "asia-pacific",
            currencyCode: "JPY",
            defaultCountry: "JP",
          },
          {
            name: "United Kingdom",
            slug: "united-kingdom",
            currencyCode: "GBP",
            defaultCountry: "GB",
          },
        ],
        categories: [
          {
            name: "Technology",
            slug: "technology",
            description: "Latest technology and gadgets",
          },
          {
            name: "Computers",
            slug: "computers",
            description: "Desktops, laptops, and accessories",
            parent: "technology",
          },
          {
            name: "Smartphones",
            slug: "smartphones",
            description: "Mobile phones and accessories",
            parent: "technology",
          },
          {
            name: "Gaming",
            slug: "gaming",
            description: "Gaming consoles and games",
            parent: "technology",
          },
          {
            name: "Fashion",
            slug: "fashion",
            description: "Clothing and accessories",
          },
          {
            name: "Men's Fashion",
            slug: "mens-fashion",
            description: "Men's clothing and accessories",
            parent: "fashion",
          },
          {
            name: "Women's Fashion",
            slug: "womens-fashion",
            description: "Women's clothing and accessories",
            parent: "fashion",
          },
        ],
        productTypes: [
          {
            name: "Electronics",
            slug: "electronics",
            hasVariants: true,
            productAttributes: [
              {
                name: "Brand",
                slug: "brand",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                choices: [
                  "Apple",
                  "Samsung",
                  "Sony",
                  "Microsoft",
                  "Nintendo",
                  "Dell",
                  "HP",
                  "Lenovo",
                ],
              },
              {
                name: "Warranty Period",
                slug: "warranty-period",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                choices: ["6 months", "1 year", "2 years", "3 years"],
              },
              {
                name: "Energy Rating",
                slug: "energy-rating",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                choices: ["A+++", "A++", "A+", "A", "B", "C", "D"],
              },
            ],
            variantAttributes: [
              {
                name: "Color",
                slug: "color",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                choices: ["Black", "White", "Silver", "Gold", "Blue", "Red", "Green"],
              },
              {
                name: "Storage Capacity",
                slug: "storage-capacity",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                choices: ["64GB", "128GB", "256GB", "512GB", "1TB", "2TB"],
              },
            ],
          },
          {
            name: "Clothing",
            slug: "clothing",
            hasVariants: true,
            productAttributes: [
              {
                name: "Material",
                slug: "material",
                type: "DROPDOWN",
                inputType: "MULTISELECT",
                choices: ["Cotton", "Polyester", "Wool", "Silk", "Linen", "Denim", "Leather"],
              },
              {
                name: "Care Instructions",
                slug: "care-instructions",
                type: "RICH_TEXT",
                inputType: "RICH_TEXT",
              },
              {
                name: "Country of Origin",
                slug: "country-of-origin",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                choices: ["USA", "China", "India", "Bangladesh", "Vietnam", "Turkey", "Italy"],
              },
            ],
            variantAttributes: [
              {
                name: "Size",
                slug: "size",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                choices: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
              },
              {
                name: "Color",
                slug: "clothing-color",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                choices: [
                  "Black",
                  "White",
                  "Navy",
                  "Gray",
                  "Red",
                  "Blue",
                  "Green",
                  "Yellow",
                  "Pink",
                ],
              },
            ],
          },
        ],
        pageTypes: [
          {
            name: "Product Landing Page",
            slug: "product-landing-page",
            attributes: [
              {
                name: "Hero Title",
                slug: "hero-title",
                type: "PLAIN_TEXT",
                inputType: "PLAIN_TEXT",
              },
              {
                name: "Hero Subtitle",
                slug: "hero-subtitle",
                type: "PLAIN_TEXT",
                inputType: "PLAIN_TEXT",
              },
              {
                name: "Featured Products",
                slug: "featured-products",
                type: "PRODUCT_REFERENCE",
                inputType: "MULTISELECT",
              },
              {
                name: "SEO Keywords",
                slug: "seo-keywords",
                type: "PLAIN_TEXT",
                inputType: "PLAIN_TEXT",
              },
            ],
          },
          {
            name: "Blog Article",
            slug: "blog-article",
            attributes: [
              {
                name: "Author Name",
                slug: "author-name",
                type: "PLAIN_TEXT",
                inputType: "PLAIN_TEXT",
              },
              {
                name: "Publication Date",
                slug: "publication-date",
                type: "DATE",
                inputType: "DATE",
              },
              {
                name: "Article Category",
                slug: "article-category",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                choices: ["Technology", "Fashion", "Lifestyle", "Business", "Reviews"],
              },
              {
                name: "Featured Image",
                slug: "featured-image",
                type: "FILE",
                inputType: "FILE",
              },
            ],
          },
        ],
      };

      await writeYaml(configPath, complexConfig);

      // Deploy the complex configuration
      console.log("🌍 Deploying complex multi-region setup...");
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(deployResult);

      // Verify all channels are created
      expect(deployResult).toContainInOutput("North America");
      expect(deployResult).toContainInOutput("Europe");
      expect(deployResult).toContainInOutput("Asia Pacific");
      expect(deployResult).toContainInOutput("United Kingdom");

      // Verify category hierarchy
      expect(deployResult).toContainInOutput("Technology");
      expect(deployResult).toContainInOutput("Computers");
      expect(deployResult).toContainInOutput("Fashion");

      // Verify product types and attributes
      expect(deployResult).toContainInOutput("Electronics");
      expect(deployResult).toContainInOutput("Clothing");

      // Introspect back to verify the full configuration
      console.log("🔍 Verifying complex configuration integrity...");
      const verifyPath = path.join(testDir, "complex-verify.yml");
      const introspectResult = await cli.introspect(apiUrl, token, {
        config: verifyPath,
      });

      assertIntrospectionSuccess(introspectResult);

      const verifyConfig = await readYaml(verifyPath);

      // Verify channels with currencies
      expect(verifyConfig.channels).toBeDefined();
      expect(verifyConfig.channels.length).toBeGreaterThanOrEqual(4);

      const naChannel = verifyConfig.channels.find((c: TestChannel) => c.slug === "north-america");
      const euChannel = verifyConfig.channels.find((c: TestChannel) => c.slug === "europe");
      const apChannel = verifyConfig.channels.find((c: TestChannel) => c.slug === "asia-pacific");
      const ukChannel = verifyConfig.channels.find((c: TestChannel) => c.slug === "united-kingdom");

      expect(naChannel?.currencyCode).toBe("USD");
      expect(euChannel?.currencyCode).toBe("EUR");
      expect(apChannel?.currencyCode).toBe("JPY");
      expect(ukChannel?.currencyCode).toBe("GBP");

      // Verify category hierarchy is preserved
      const technology = verifyConfig.categories.find((c: TestCategory) => c.slug === "technology");
      const computers = verifyConfig.categories.find((c: TestCategory) => c.slug === "computers");
      const smartphones = verifyConfig.categories.find(
        (c: TestCategory) => c.slug === "smartphones"
      );
      const menssFashion = verifyConfig.categories.find(
        (c: TestCategory) => c.slug === "mens-fashion"
      );

      expect(technology).toBeDefined();
      expect(computers).toBeDefined();
      expect(smartphones).toBeDefined();
      expect(menssFashion).toBeDefined();

      expect(computers.parent).toBe("technology");
      expect(smartphones.parent).toBe("technology");
      expect(menssFashion.parent).toBe("fashion");

      // Verify product types with attributes
      const electronicsType = verifyConfig.productTypes.find(
        (pt: TestProductType) => pt.slug === "electronics"
      );
      const clothingType = verifyConfig.productTypes.find(
        (pt: TestProductType) => pt.slug === "clothing"
      );

      expect(electronicsType).toBeDefined();
      expect(clothingType).toBeDefined();
      expect(electronicsType.hasVariants).toBe(true);
      expect(clothingType.hasVariants).toBe(true);

      // Verify attributes are properly created
      const brandAttr = electronicsType.productAttributes.find(
        (attr: TestAttribute) => attr.slug === "brand"
      );
      const materialAttr = clothingType.productAttributes.find(
        (attr: TestAttribute) => attr.slug === "material"
      );

      expect(brandAttr).toBeDefined();
      expect(materialAttr).toBeDefined();
      expect(brandAttr.choices).toContain("Apple");
      expect(materialAttr.choices).toContain("Cotton");

      // Verify page types
      expect(verifyConfig.pageTypes).toBeDefined();
      const landingPageType = verifyConfig.pageTypes.find(
        (pt: TestPageType) => pt.slug === "product-landing-page"
      );
      const blogType = verifyConfig.pageTypes.find(
        (pt: TestPageType) => pt.slug === "blog-article"
      );

      expect(landingPageType).toBeDefined();
      expect(blogType).toBeDefined();

      console.log("✅ Complex multi-region setup verified successfully");
    }, 300000); // 5 minutes timeout for complex setup
  });

  describe("Incremental Configuration Changes", () => {
    it("should handle progressive configuration expansion", async () => {
      const configPath = path.join(testDir, "incremental-config.yml");

      // Phase 1: Start with minimal configuration
      console.log("📈 Phase 1: Deploying minimal configuration...");
      const phase1Config = {
        shop: {
          defaultMailSenderName: "Incremental Store",
          defaultMailSenderAddress: "incremental@test.com",
        },
        channels: [
          {
            name: "Main Channel",
            slug: "main-channel",
            currencyCode: "USD",
            defaultCountry: "US",
          },
        ],
      };

      await writeYaml(configPath, phase1Config);
      const phase1Result = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });
      assertDeploymentSuccess(phase1Result);

      // Phase 2: Add categories
      console.log("📈 Phase 2: Adding category structure...");
      const phase2Config = {
        ...phase1Config,
        categories: [
          {
            name: "Home & Garden",
            slug: "home-garden",
            description: "Home and garden products",
          },
          {
            name: "Furniture",
            slug: "furniture",
            description: "Indoor and outdoor furniture",
            parent: "home-garden",
          },
          {
            name: "Decor",
            slug: "decor",
            description: "Home decoration items",
            parent: "home-garden",
          },
        ],
      };

      await writeYaml(configPath, phase2Config);
      const phase2Result = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });
      assertDeploymentSuccess(phase2Result);
      expect(phase2Result).toContainInOutput("Home & Garden");

      // Phase 3: Add product types with attributes
      console.log("📈 Phase 3: Adding product types and attributes...");
      const phase3Config = {
        ...phase2Config,
        productTypes: [
          {
            name: "Furniture",
            slug: "furniture-type",
            hasVariants: true,
            productAttributes: [
              {
                name: "Material Type",
                slug: "material-type",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                choices: ["Wood", "Metal", "Plastic", "Glass", "Fabric"],
              },
              {
                name: "Room Type",
                slug: "room-type",
                type: "DROPDOWN",
                inputType: "MULTISELECT",
                choices: ["Living Room", "Bedroom", "Dining Room", "Kitchen", "Office", "Bathroom"],
              },
            ],
            variantAttributes: [
              {
                name: "Color Finish",
                slug: "color-finish",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                choices: ["Natural Wood", "Black", "White", "Brown", "Gray", "Cherry", "Oak"],
              },
              {
                name: "Size Variant",
                slug: "size-variant",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                choices: ["Small", "Medium", "Large", "Extra Large"],
              },
            ],
          },
        ],
      };

      await writeYaml(configPath, phase3Config);
      const phase3Result = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });
      assertDeploymentSuccess(phase3Result);
      expect(phase3Result).toContainInOutput("Furniture");

      // Phase 4: Add page types
      console.log("📈 Phase 4: Adding page types...");
      const phase4Config = {
        ...phase3Config,
        pageTypes: [
          {
            name: "Category Page",
            slug: "category-page",
            attributes: [
              {
                name: "Banner Image",
                slug: "banner-image",
                type: "FILE",
                inputType: "FILE",
              },
              {
                name: "Category Description",
                slug: "category-description",
                type: "RICH_TEXT",
                inputType: "RICH_TEXT",
              },
              {
                name: "Featured Products Count",
                slug: "featured-products-count",
                type: "NUMERIC",
                inputType: "NUMERIC",
              },
            ],
          },
        ],
      };

      await writeYaml(configPath, phase4Config);
      const phase4Result = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });
      assertDeploymentSuccess(phase4Result);
      expect(phase4Result).toContainInOutput("Category Page");

      // Final verification: Introspect complete configuration
      console.log("🔍 Final verification of incremental changes...");
      const finalVerifyPath = path.join(testDir, "incremental-final.yml");
      const finalResult = await cli.introspect(apiUrl, token, {
        config: finalVerifyPath,
      });

      assertIntrospectionSuccess(finalResult);

      const finalConfig = await readYaml(finalVerifyPath);

      // Verify all phases are present
      expect(finalConfig.shop.defaultMailSenderName).toBe("Incremental Store");
      expect(
        finalConfig.channels.find((c: TestChannel) => c.slug === "main-channel")
      ).toBeDefined();
      expect(
        finalConfig.categories.find((c: TestCategory) => c.slug === "home-garden")
      ).toBeDefined();
      expect(
        finalConfig.categories.find((c: TestCategory) => c.slug === "furniture")
      ).toBeDefined();
      expect(
        finalConfig.productTypes.find((pt: TestProductType) => pt.slug === "furniture-type")
      ).toBeDefined();
      expect(
        finalConfig.pageTypes.find((pt: TestPageType) => pt.slug === "category-page")
      ).toBeDefined();

      console.log("✅ Incremental configuration changes verified successfully");
    }, 240000); // 4 minutes timeout
  });

  describe("Configuration Rollback and Recovery", () => {
    it("should handle configuration rollback scenarios", async () => {
      const originalConfigPath = path.join(testDir, "rollback-original.yml");
      const modifiedConfigPath = path.join(testDir, "rollback-modified.yml");

      // Create original configuration
      const originalConfig = {
        shop: {
          defaultMailSenderName: "Rollback Store",
          defaultMailSenderAddress: "rollback@test.com",
          description: "Original configuration",
        },
        channels: [
          {
            name: "Rollback Channel",
            slug: "rollback-channel",
            currencyCode: "USD",
            defaultCountry: "US",
          },
        ],
        categories: [
          {
            name: "Original Category",
            slug: "original-category",
            description: "This is the original category",
          },
        ],
      };

      await writeYaml(originalConfigPath, originalConfig);

      // Deploy original configuration
      console.log("📦 Deploying original configuration...");
      const originalDeployResult = await cli.deploy(apiUrl, token, {
        config: originalConfigPath,
        skipDiff: true,
      });
      assertDeploymentSuccess(originalDeployResult);

      // Create modified configuration (with problematic changes)
      const modifiedConfig = {
        shop: {
          defaultMailSenderName: "Modified Rollback Store",
          defaultMailSenderAddress: "modified@rollback.com",
          description: "Modified configuration with issues",
        },
        channels: [
          {
            name: "Modified Channel",
            slug: "modified-channel",
            currencyCode: "EUR", // Changed currency
            defaultCountry: "DE",
          },
        ],
        categories: [
          {
            name: "Modified Category",
            slug: "modified-category",
            description: "This category replaces the original",
          },
          {
            name: "Additional Category",
            slug: "additional-category",
            description: "This is an additional category",
          },
        ],
        productTypes: [
          {
            name: "New Product Type",
            slug: "new-product-type",
            hasVariants: false,
          },
        ],
      };

      await writeYaml(modifiedConfigPath, modifiedConfig);

      // Deploy modified configuration
      console.log("🔄 Deploying modified configuration...");
      const modifiedDeployResult = await cli.deploy(apiUrl, token, {
        config: modifiedConfigPath,
        skipDiff: true,
      });
      assertDeploymentSuccess(modifiedDeployResult);

      // Verify the modified state
      const modifiedVerifyPath = path.join(testDir, "rollback-modified-verify.yml");
      const modifiedIntrospectResult = await cli.introspect(apiUrl, token, {
        config: modifiedVerifyPath,
      });
      assertIntrospectionSuccess(modifiedIntrospectResult);

      const modifiedVerifyConfig = await readYaml(modifiedVerifyPath);
      expect(modifiedVerifyConfig.shop.defaultMailSenderName).toBe("Modified Rollback Store");
      expect(
        modifiedVerifyConfig.channels.find((c: TestChannel) => c.slug === "modified-channel")
      ).toBeDefined();
      expect(
        modifiedVerifyConfig.categories.find((c: TestCategory) => c.slug === "modified-category")
      ).toBeDefined();
      expect(
        modifiedVerifyConfig.productTypes?.find(
          (pt: TestProductType) => pt.slug === "new-product-type"
        )
      ).toBeDefined();

      // Now rollback to original configuration
      console.log("⏪ Rolling back to original configuration...");
      const rollbackResult = await cli.deploy(apiUrl, token, {
        config: originalConfigPath,
        skipDiff: true,
      });
      assertDeploymentSuccess(rollbackResult);

      // Verify rollback was successful
      const rollbackVerifyPath = path.join(testDir, "rollback-final-verify.yml");
      const rollbackIntrospectResult = await cli.introspect(apiUrl, token, {
        config: rollbackVerifyPath,
      });
      assertIntrospectionSuccess(rollbackIntrospectResult);

      const rollbackVerifyConfig = await readYaml(rollbackVerifyPath);
      expect(rollbackVerifyConfig.shop.defaultMailSenderName).toBe("Rollback Store");
      expect(rollbackVerifyConfig.shop.description).toBe("Original configuration");
      expect(
        rollbackVerifyConfig.channels.find((c: TestChannel) => c.slug === "rollback-channel")
      ).toBeDefined();
      expect(
        rollbackVerifyConfig.categories.find((c: TestCategory) => c.slug === "original-category")
      ).toBeDefined();

      // Verify modified entities are no longer present
      expect(
        rollbackVerifyConfig.channels.find((c: TestChannel) => c.slug === "modified-channel")
      ).toBeUndefined();
      expect(
        rollbackVerifyConfig.categories.find((c: TestCategory) => c.slug === "modified-category")
      ).toBeUndefined();

      console.log("✅ Configuration rollback verified successfully");
    }, 240000); // 4 minutes timeout
  });
});
