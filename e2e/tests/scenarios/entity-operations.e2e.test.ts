import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SaleorTestContainer } from "../../utils/saleor-container.js";
import { CliRunner } from "../../utils/cli-runner.js";
import {
  createTempDir,
  cleanupTempDir,
  readYaml,
  writeYaml,
} from "../../utils/test-helpers.js";
import { assertDeploymentSuccess, assertIntrospectionSuccess } from "../../utils/assertions.js";
import path from "node:path";

describe("E2E Entity Operations", () => {
  let container: SaleorTestContainer;
  let cli: CliRunner;
  let apiUrl: string;
  let token: string;
  let testDir: string;

  beforeAll(async () => {
    console.log("🚀 Starting entity operations test setup...");
    
    testDir = await createTempDir("entity-test-");
    
    container = new SaleorTestContainer({
      projectName: "saleor-entity-test",
    });
    await container.start();
    
    apiUrl = container.getApiUrl();
    token = container.getAdminToken();
    cli = new CliRunner({ verbose: process.env.VERBOSE === "true" });
    
    console.log("✅ Entity operations test setup complete");
  }, 180000);

  afterAll(async () => {
    await container?.stop();
    await cleanupTempDir(testDir);
  });

  describe("Category Operations", () => {
    it("should handle category creation, update, and hierarchy", async () => {
      const configPath = path.join(testDir, "categories-config.yml");
      
      // Create configuration with category hierarchy
      const config = {
        shop: {
          defaultMailSenderName: "Entity Test Store",
          defaultMailSenderAddress: "entity@test.com"
        },
        channels: [
          {
            name: "Entity Test Channel",
            slug: "entity-test-channel", 
            currencyCode: "USD",
            defaultCountry: "US"
          }
        ],
        categories: [
          {
            name: "Electronics",
            slug: "electronics",
            description: "Electronic products and gadgets"
          },
          {
            name: "Smartphones",
            slug: "smartphones", 
            description: "Latest smartphones and mobile devices",
            parent: "electronics"
          },
          {
            name: "Laptops",
            slug: "laptops",
            description: "Laptops and notebooks",
            parent: "electronics"
          }
        ]
      };
      
      await writeYaml(configPath, config);
      
      // Deploy categories
      console.log("📦 Creating category hierarchy...");
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(deployResult);
      expect(deployResult).toContainInOutput("Electronics");
      expect(deployResult).toContainInOutput("Smartphones");
      expect(deployResult).toContainInOutput("Laptops");
      
      // Introspect back to verify hierarchy
      const verifyPath = path.join(testDir, "categories-verify.yml");
      const introspectResult = await cli.introspect(apiUrl, token, {
        config: verifyPath
      });
      
      assertIntrospectionSuccess(introspectResult);
      
      const verifyConfig = await readYaml(verifyPath);
      expect(verifyConfig.categories).toBeDefined();
      expect(verifyConfig.categories.length).toBeGreaterThanOrEqual(3);
      
      // Verify parent-child relationships are preserved
      const electronics = verifyConfig.categories.find((c: any) => c.slug === "electronics");
      const smartphones = verifyConfig.categories.find((c: any) => c.slug === "smartphones");
      const laptops = verifyConfig.categories.find((c: any) => c.slug === "laptops");
      
      expect(electronics).toBeDefined();
      expect(smartphones).toBeDefined();
      expect(laptops).toBeDefined();
      expect(smartphones.parent).toBe("electronics");
      expect(laptops.parent).toBe("electronics");
    }, 120000);
  });

  describe("Product Type and Attribute Operations", () => {
    it("should handle product types with custom attributes", async () => {
      const configPath = path.join(testDir, "product-types-config.yml");
      
      const config = {
        shop: {
          defaultMailSenderName: "Product Type Test Store",
          defaultMailSenderAddress: "producttype@test.com"
        },
        channels: [
          {
            name: "Product Type Channel",
            slug: "product-type-channel",
            currencyCode: "USD", 
            defaultCountry: "US"
          }
        ],
        productTypes: [
          {
            name: "Smartphone",
            slug: "smartphone",
            hasVariants: true,
            productAttributes: [
              {
                name: "Brand",
                slug: "brand", 
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                choices: ["Apple", "Samsung", "Google", "OnePlus"]
              },
              {
                name: "Storage Capacity",
                slug: "storage-capacity",
                type: "DROPDOWN", 
                inputType: "DROPDOWN",
                choices: ["64GB", "128GB", "256GB", "512GB", "1TB"]
              }
            ],
            variantAttributes: [
              {
                name: "Color",
                slug: "color",
                type: "DROPDOWN",
                inputType: "DROPDOWN", 
                choices: ["Black", "White", "Blue", "Red", "Green"]
              }
            ]
          },
          {
            name: "Laptop",
            slug: "laptop",
            hasVariants: false,
            productAttributes: [
              {
                name: "Processor",
                slug: "processor",
                type: "RICH_TEXT",
                inputType: "RICH_TEXT"
              },
              {
                name: "RAM Size",
                slug: "ram-size", 
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                choices: ["8GB", "16GB", "32GB", "64GB"]
              }
            ]
          }
        ]
      };
      
      await writeYaml(configPath, config);
      
      // Deploy product types with attributes
      console.log("🏷️ Creating product types with attributes...");
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(deployResult);
      expect(deployResult).toContainInOutput("Smartphone");
      expect(deployResult).toContainInOutput("Laptop");
      
      // Verify attribute creation
      const verifyPath = path.join(testDir, "product-types-verify.yml");
      const introspectResult = await cli.introspect(apiUrl, token, {
        config: verifyPath
      });
      
      assertIntrospectionSuccess(introspectResult);
      
      const verifyConfig = await readYaml(verifyPath);
      expect(verifyConfig.productTypes).toBeDefined();
      
      const smartphone = verifyConfig.productTypes.find((pt: any) => pt.slug === "smartphone");
      const laptop = verifyConfig.productTypes.find((pt: any) => pt.slug === "laptop");
      
      expect(smartphone).toBeDefined();
      expect(laptop).toBeDefined();
      expect(smartphone.hasVariants).toBe(true);
      expect(laptop.hasVariants).toBe(false);
      
      // Verify attributes are properly assigned
      expect(smartphone.productAttributes).toBeDefined();
      expect(smartphone.variantAttributes).toBeDefined();
      expect(laptop.productAttributes).toBeDefined();
      
      const brandAttr = smartphone.productAttributes.find((attr: any) => attr.slug === "brand");
      expect(brandAttr).toBeDefined();
      expect(brandAttr.choices).toContain("Apple");
    }, 120000);
  });

  describe("Channel and Shipping Operations", () => {
    it("should handle multi-channel setup with different configurations", async () => {
      const configPath = path.join(testDir, "channels-config.yml");
      
      const config = {
        shop: {
          defaultMailSenderName: "Multi Channel Store",
          defaultMailSenderAddress: "multichannel@test.com"
        },
        channels: [
          {
            name: "US Store",
            slug: "us-store",
            currencyCode: "USD",
            defaultCountry: "US"
          },
          {
            name: "EU Store", 
            slug: "eu-store",
            currencyCode: "EUR",
            defaultCountry: "DE"
          },
          {
            name: "UK Store",
            slug: "uk-store", 
            currencyCode: "GBP",
            defaultCountry: "GB"
          }
        ]
      };
      
      await writeYaml(configPath, config);
      
      // Deploy multi-channel configuration
      console.log("🌍 Creating multi-channel setup...");
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(deployResult);
      expect(deployResult).toContainInOutput("US Store");
      expect(deployResult).toContainInOutput("EU Store");
      expect(deployResult).toContainInOutput("UK Store");
      
      // Verify channels are created with correct currencies
      const verifyPath = path.join(testDir, "channels-verify.yml");
      const introspectResult = await cli.introspect(apiUrl, token, {
        config: verifyPath
      });
      
      assertIntrospectionSuccess(introspectResult);
      
      const verifyConfig = await readYaml(verifyPath);
      expect(verifyConfig.channels).toBeDefined();
      expect(verifyConfig.channels.length).toBeGreaterThanOrEqual(3);
      
      const usStore = verifyConfig.channels.find((c: any) => c.slug === "us-store");
      const euStore = verifyConfig.channels.find((c: any) => c.slug === "eu-store");
      const ukStore = verifyConfig.channels.find((c: any) => c.slug === "uk-store");
      
      expect(usStore).toBeDefined();
      expect(euStore).toBeDefined();
      expect(ukStore).toBeDefined();
      expect(usStore.currencyCode).toBe("USD");
      expect(euStore.currencyCode).toBe("EUR");
      expect(ukStore.currencyCode).toBe("GBP");
    }, 120000);
  });

  describe("Page Type Operations", () => {
    it("should handle page types with custom attributes", async () => {
      const configPath = path.join(testDir, "page-types-config.yml");
      
      const config = {
        shop: {
          defaultMailSenderName: "Page Type Store",
          defaultMailSenderAddress: "pagetype@test.com"
        },
        channels: [
          {
            name: "Page Type Channel",
            slug: "page-type-channel",
            currencyCode: "USD",
            defaultCountry: "US"
          }
        ],
        pageTypes: [
          {
            name: "Blog Post",
            slug: "blog-post",
            attributes: [
              {
                name: "Author",
                slug: "author",
                type: "PLAIN_TEXT",
                inputType: "PLAIN_TEXT"
              },
              {
                name: "Publication Date",
                slug: "publication-date",
                type: "DATE",
                inputType: "DATE"
              },
              {
                name: "Tags",
                slug: "tags",
                type: "DROPDOWN",
                inputType: "MULTISELECT",
                choices: ["Technology", "Business", "Lifestyle", "News", "Tutorial"]
              }
            ]
          },
          {
            name: "Landing Page",
            slug: "landing-page",
            attributes: [
              {
                name: "Hero Title",
                slug: "hero-title", 
                type: "PLAIN_TEXT",
                inputType: "PLAIN_TEXT"
              },
              {
                name: "Hero Image",
                slug: "hero-image",
                type: "FILE",
                inputType: "FILE"
              }
            ]
          }
        ]
      };
      
      await writeYaml(configPath, config);
      
      // Deploy page types
      console.log("📄 Creating page types with attributes...");
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true
      });
      
      assertDeploymentSuccess(deployResult);
      expect(deployResult).toContainInOutput("Blog Post");
      expect(deployResult).toContainInOutput("Landing Page");
      
      // Verify page types creation
      const verifyPath = path.join(testDir, "page-types-verify.yml");
      const introspectResult = await cli.introspect(apiUrl, token, {
        config: verifyPath
      });
      
      assertIntrospectionSuccess(introspectResult);
      
      const verifyConfig = await readYaml(verifyPath);
      expect(verifyConfig.pageTypes).toBeDefined();
      
      const blogPost = verifyConfig.pageTypes.find((pt: any) => pt.slug === "blog-post");
      const landingPage = verifyConfig.pageTypes.find((pt: any) => pt.slug === "landing-page");
      
      expect(blogPost).toBeDefined();
      expect(landingPage).toBeDefined();
      expect(blogPost.attributes).toBeDefined();
      expect(landingPage.attributes).toBeDefined();
      
      const authorAttr = blogPost.attributes.find((attr: any) => attr.slug === "author");
      const tagsAttr = blogPost.attributes.find((attr: any) => attr.slug === "tags");
      
      expect(authorAttr).toBeDefined();
      expect(tagsAttr).toBeDefined();
      expect(tagsAttr.choices).toContain("Technology");
    }, 120000);
  });
});