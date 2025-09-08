import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertDeploymentSuccess, assertIntrospectionSuccess } from "../../utils/assertions.ts";
import { CliRunner } from "../../utils/cli-runner.ts";
import { getAdminToken, getTestConfig, waitForApi } from "../../utils/test-env.ts";
import { cleanupTempDir, createTempDir, writeYaml } from "../../utils/test-helpers.ts";

describe("E2E Entity Operations - Complete Coverage", () => {
  let cli: CliRunner;
  let apiUrl: string;
  let token: string;
  let testDir: string;

  beforeAll(async () => {
    console.log("🚀 Starting comprehensive entity operations test...");

    testDir = await createTempDir("entity-ops-test-");

    const config = getTestConfig();
    apiUrl = config.apiUrl;
    await waitForApi(apiUrl);
    token = await getAdminToken(apiUrl, config.adminEmail, config.adminPassword);
    cli = new CliRunner({ verbose: process.env.VERBOSE === "true" });

    console.log("✅ Entity operations test setup complete");
  }, 60000);

  afterAll(async () => {
    await cleanupTempDir(testDir);
  });

  describe("Shop Configuration", () => {
    it("should manage global shop settings", async () => {
      const configPath = path.join(testDir, "shop-config.yml");

      const config = {
        shop: {
          headerText: "Welcome to Our Store",
          description: "Premium E-commerce Platform",
          defaultMailSenderName: "Store Team",
          defaultMailSenderAddress: "store@example.com",
          customerSetPasswordUrl: "https://store.example.com/reset-password",
          includeTaxesInPrices: false,
          displayGrossPrices: true,
          chargeTaxesOnShipping: true,
          trackInventoryByDefault: true,
          defaultWeightUnit: "KG",
          automaticFulfillmentDigitalProducts: true,
          fulfillmentAutoApprove: false,
          fulfillmentAllowUnpaid: false,
          limitQuantityPerCheckout: 50,
        },
      };

      await writeYaml(configPath, config);

      // Deploy shop configuration
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        ci: true,
      });

      assertDeploymentSuccess(deployResult);
      expect(deployResult).toContainInOutput("shop");

      // Verify idempotency
      const secondDeployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        ci: true,
      });

      assertDeploymentSuccess(secondDeployResult);
      expect(secondDeployResult).toContainInOutput("No changes");
    });
  });

  describe("Channel Operations", () => {
    it("should create and manage multiple channels", async () => {
      const configPath = path.join(testDir, "channels-config.yml");

      const config = {
        channels: [
          {
            name: "US Store",
            slug: "us-store",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
            stockSettings: {
              allocationStrategy: "PRIORITIZE_HIGH_STOCK",
            },
            orderSettings: {
              automaticallyConfirmAllNewOrders: false,
              automaticallyFulfillNonShippableGiftCard: true,
              deleteExpiredOrdersAfter: 30,
              markAsPaidStrategy: "PAYMENT_FLOW",
            },
          },
          {
            name: "EU Store",
            slug: "eu-store",
            currencyCode: "EUR",
            defaultCountry: "DE",
            isActive: true,
            countries: ["DE", "FR", "IT", "ES", "NL"],
          },
          {
            name: "UK Store",
            slug: "uk-store",
            currencyCode: "GBP",
            defaultCountry: "GB",
            isActive: true,
          },
        ],
      };

      await writeYaml(configPath, config);

      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        ci: true,
      });

      assertDeploymentSuccess(deployResult);
      expect(deployResult).toContainInOutput("channels");
      expect(deployResult).toContainInOutput("US Store");
      expect(deployResult).toContainInOutput("EU Store");
      expect(deployResult).toContainInOutput("UK Store");
    });
  });

  describe("Tax Configuration", () => {
    it("should manage tax classes and country-specific rates", async () => {
      const configPath = path.join(testDir, "tax-config.yml");

      const config = {
        taxClasses: [
          {
            name: "Standard Tax",
            countries: [
              { countryCode: "US", rate: 8.5 },
              { countryCode: "CA", rate: 13 },
              { countryCode: "GB", rate: 20 },
              { countryCode: "DE", rate: 19 },
              { countryCode: "FR", rate: 20 },
              { countryCode: "JP", rate: 10 },
            ],
          },
          {
            name: "Reduced Tax",
            countries: [
              { countryCode: "US", rate: 5 },
              { countryCode: "GB", rate: 5 },
              { countryCode: "DE", rate: 7 },
              { countryCode: "FR", rate: 5.5 },
            ],
          },
          {
            name: "Zero Tax",
            countries: [
              { countryCode: "US", rate: 0 },
              { countryCode: "GB", rate: 0 },
              { countryCode: "DE", rate: 0 },
            ],
          },
        ],
        channels: [
          {
            name: "Tax Test Channel",
            slug: "tax-test",
            currencyCode: "USD",
            defaultCountry: "US",
            taxConfiguration: {
              displayGrossPrices: true,
              pricesEnteredWithTax: true,
              chargeTaxesOnShipping: true,
              taxCalculationStrategy: "FLAT_RATES",
            },
          },
        ],
      };

      await writeYaml(configPath, config);

      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        ci: true,
      });

      assertDeploymentSuccess(deployResult);
      expect(deployResult).toContainInOutput("taxClasses");
      expect(deployResult).toContainInOutput("Standard Tax");
      expect(deployResult).toContainInOutput("Reduced Tax");
    });
  });

  describe("Warehouse Operations", () => {
    it("should create and manage warehouses with address details", async () => {
      const configPath = path.join(testDir, "warehouse-config.yml");

      const config = {
        warehouses: [
          {
            name: "Main Warehouse",
            slug: "main-warehouse",
            email: "warehouse@example.com",
            isPrivate: false,
            clickAndCollectOption: "ALL",
            address: {
              streetAddress1: "123 Storage Lane",
              streetAddress2: "Building A",
              city: "New York",
              cityArea: "Manhattan",
              postalCode: "10001",
              country: "US",
              countryArea: "NY",
              phone: "+1-555-0100",
              companyName: "Main Distribution Center",
            },
          },
          {
            name: "European Distribution Center",
            slug: "eu-warehouse",
            email: "eu-warehouse@example.com",
            isPrivate: false,
            clickAndCollectOption: "DISABLED",
            address: {
              streetAddress1: "456 Logistics Strasse",
              city: "Berlin",
              postalCode: "10115",
              country: "DE",
              phone: "+49-30-12345678",
              companyName: "EU Distribution Hub",
            },
          },
          {
            name: "Dropship Partner Warehouse",
            slug: "dropship-warehouse",
            email: "dropship@partner.com",
            isPrivate: true,
            clickAndCollectOption: "DISABLED",
            address: {
              streetAddress1: "789 Partner Drive",
              city: "Los Angeles",
              postalCode: "90001",
              country: "US",
              countryArea: "CA",
            },
          },
        ],
      };

      await writeYaml(configPath, config);

      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        ci: true,
      });

      assertDeploymentSuccess(deployResult);
      expect(deployResult).toContainInOutput("warehouses");
      expect(deployResult).toContainInOutput("Main Warehouse");
      expect(deployResult).toContainInOutput("European Distribution Center");
      expect(deployResult).toContainInOutput("Dropship Partner Warehouse");
    });
  });

  describe("Shipping Zones and Methods", () => {
    it("should configure shipping zones with multiple methods and channel assignments", async () => {
      const configPath = path.join(testDir, "shipping-config.yml");

      // First ensure we have channels and warehouses
      const setupConfig = {
        channels: [
          {
            name: "Shipping Test Channel",
            slug: "shipping-test",
            currencyCode: "USD",
            defaultCountry: "US",
          },
        ],
        warehouses: [
          {
            name: "Shipping Warehouse",
            slug: "ship-warehouse",
            address: {
              streetAddress1: "100 Ship Street",
              city: "Miami",
              postalCode: "33101",
              country: "US",
              countryArea: "FL",
            },
          },
        ],
      };

      const setupPath = path.join(testDir, "shipping-setup.yml");
      await writeYaml(setupPath, setupConfig);
      await cli.deploy(apiUrl, token, { config: setupPath, ci: true });

      // Now create shipping zones
      const config = {
        shippingZones: [
          {
            name: "North America",
            description: "Shipping to US and Canada",
            countries: ["US", "CA"],
            default: true,
            warehouses: ["ship-warehouse"],
            channels: ["shipping-test"],
            shippingMethods: [
              {
                name: "Standard Shipping",
                description: "5-7 business days",
                type: "PRICE",
                taxClass: "Standard Tax",
                channelListings: [
                  {
                    channel: "shipping-test",
                    price: 9.99,
                    minimumOrderPrice: 0,
                    maximumOrderPrice: 100,
                  },
                ],
              },
              {
                name: "Express Shipping",
                description: "2-3 business days",
                type: "PRICE",
                channelListings: [
                  {
                    channel: "shipping-test",
                    price: 19.99,
                    minimumOrderPrice: 0,
                  },
                ],
              },
              {
                name: "Free Shipping",
                description: "5-7 business days - Free for orders over $100",
                type: "PRICE",
                channelListings: [
                  {
                    channel: "shipping-test",
                    price: 0,
                    minimumOrderPrice: 100,
                  },
                ],
              },
            ],
          },
          {
            name: "Europe",
            description: "Shipping to European countries",
            countries: ["GB", "DE", "FR", "IT", "ES", "NL", "BE", "PL"],
            warehouses: ["ship-warehouse"],
            channels: ["shipping-test"],
            shippingMethods: [
              {
                name: "EU Standard",
                description: "7-10 business days",
                type: "PRICE",
                channelListings: [
                  {
                    channel: "shipping-test",
                    price: 15,
                  },
                ],
              },
            ],
          },
        ],
      };

      await writeYaml(configPath, config);

      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        ci: true,
      });

      assertDeploymentSuccess(deployResult);
      expect(deployResult).toContainInOutput("shippingZones");
      expect(deployResult).toContainInOutput("North America");
      expect(deployResult).toContainInOutput("Europe");
      expect(deployResult).toContainInOutput("Standard Shipping");
      expect(deployResult).toContainInOutput("Express Shipping");
    });
  });

  describe("Category Hierarchy", () => {
    it("should create nested category structures", async () => {
      const configPath = path.join(testDir, "categories-config.yml");

      const config = {
        categories: [
          {
            name: "Electronics",
            slug: "electronics",
            description: "Electronic devices and accessories",
            subcategories: [
              {
                name: "Computers",
                slug: "computers",
                description: "Desktop and laptop computers",
                subcategories: [
                  {
                    name: "Laptops",
                    slug: "laptops",
                    description: "Portable computers",
                  },
                  {
                    name: "Desktops",
                    slug: "desktops",
                    description: "Desktop computers",
                  },
                ],
              },
              {
                name: "Mobile Devices",
                slug: "mobile",
                description: "Phones and tablets",
                subcategories: [
                  {
                    name: "Smartphones",
                    slug: "smartphones",
                  },
                  {
                    name: "Tablets",
                    slug: "tablets",
                  },
                ],
              },
            ],
          },
          {
            name: "Clothing",
            slug: "clothing",
            description: "Apparel and fashion",
            subcategories: [
              {
                name: "Men's Clothing",
                slug: "mens-clothing",
              },
              {
                name: "Women's Clothing",
                slug: "womens-clothing",
              },
              {
                name: "Kids' Clothing",
                slug: "kids-clothing",
              },
            ],
          },
        ],
      };

      await writeYaml(configPath, config);

      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        ci: true,
      });

      assertDeploymentSuccess(deployResult);
      expect(deployResult).toContainInOutput("categories");
      expect(deployResult).toContainInOutput("Electronics");
      expect(deployResult).toContainInOutput("Computers");
      expect(deployResult).toContainInOutput("Laptops");
    });
  });

  describe("Product Types with Attributes", () => {
    it("should create product types with various attribute types", async () => {
      const configPath = path.join(testDir, "product-types-config.yml");

      const config = {
        productTypes: [
          {
            name: "Book",
            slug: "book",
            hasVariants: false,
            isShippingRequired: true,
            isDigital: false,
            weight: 0.5,
            taxClass: "Reduced Tax",
            productAttributes: [
              {
                name: "Author",
                slug: "author",
                type: "PRODUCT_TYPE",
                inputType: "PLAIN_TEXT",
                valueRequired: true,
                visibleInStorefront: true,
                filterableInStorefront: true,
                filterableInDashboard: true,
                storefrontSearchPosition: 1,
              },
              {
                name: "ISBN",
                slug: "isbn",
                type: "PRODUCT_TYPE",
                inputType: "PLAIN_TEXT",
                valueRequired: true,
                visibleInStorefront: true,
              },
              {
                name: "Publication Year",
                slug: "publication-year",
                type: "PRODUCT_TYPE",
                inputType: "NUMERIC",
                valueRequired: false,
                visibleInStorefront: true,
                filterableInStorefront: true,
              },
              {
                name: "Genre",
                slug: "genre",
                type: "PRODUCT_TYPE",
                inputType: "DROPDOWN",
                valueRequired: false,
                visibleInStorefront: true,
                filterableInStorefront: true,
                choices: [
                  { name: "Fiction", slug: "fiction" },
                  { name: "Non-Fiction", slug: "non-fiction" },
                  { name: "Science Fiction", slug: "sci-fi" },
                  { name: "Mystery", slug: "mystery" },
                  { name: "Romance", slug: "romance" },
                ],
              },
            ],
          },
          {
            name: "T-Shirt",
            slug: "t-shirt",
            hasVariants: true,
            isShippingRequired: true,
            weight: 0.2,
            variantAttributes: [
              {
                name: "Size",
                slug: "size",
                type: "PRODUCT_TYPE",
                inputType: "DROPDOWN",
                valueRequired: true,
                visibleInStorefront: true,
                filterableInStorefront: true,
                choices: [
                  { name: "XS", slug: "xs" },
                  { name: "S", slug: "s" },
                  { name: "M", slug: "m" },
                  { name: "L", slug: "l" },
                  { name: "XL", slug: "xl" },
                  { name: "XXL", slug: "xxl" },
                ],
              },
              {
                name: "Color",
                slug: "color",
                type: "PRODUCT_TYPE",
                inputType: "SWATCH",
                valueRequired: true,
                visibleInStorefront: true,
                filterableInStorefront: true,
                choices: [
                  { name: "Black", slug: "black", value: "#000000" },
                  { name: "White", slug: "white", value: "#FFFFFF" },
                  { name: "Red", slug: "red", value: "#FF0000" },
                  { name: "Blue", slug: "blue", value: "#0000FF" },
                  { name: "Green", slug: "green", value: "#00FF00" },
                ],
              },
            ],
            productAttributes: [
              {
                name: "Material",
                slug: "material",
                type: "PRODUCT_TYPE",
                inputType: "MULTISELECT",
                valueRequired: false,
                visibleInStorefront: true,
                filterableInStorefront: true,
                choices: [
                  { name: "Cotton", slug: "cotton" },
                  { name: "Polyester", slug: "polyester" },
                  { name: "Wool", slug: "wool" },
                  { name: "Silk", slug: "silk" },
                ],
              },
              {
                name: "Care Instructions",
                slug: "care-instructions",
                type: "PRODUCT_TYPE",
                inputType: "RICH_TEXT",
                valueRequired: false,
                visibleInStorefront: true,
              },
            ],
          },
          {
            name: "Digital Product",
            slug: "digital-product",
            hasVariants: false,
            isShippingRequired: false,
            isDigital: true,
            productAttributes: [
              {
                name: "File Size",
                slug: "file-size",
                type: "PRODUCT_TYPE",
                inputType: "PLAIN_TEXT",
                valueRequired: false,
                visibleInStorefront: true,
                unit: "MB",
              },
              {
                name: "License Type",
                slug: "license-type",
                type: "PRODUCT_TYPE",
                inputType: "DROPDOWN",
                valueRequired: true,
                visibleInStorefront: true,
                choices: [
                  { name: "Personal", slug: "personal" },
                  { name: "Commercial", slug: "commercial" },
                  { name: "Enterprise", slug: "enterprise" },
                ],
              },
            ],
          },
        ],
      };

      await writeYaml(configPath, config);

      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        ci: true,
      });

      assertDeploymentSuccess(deployResult);
      expect(deployResult).toContainInOutput("productTypes");
      expect(deployResult).toContainInOutput("Book");
      expect(deployResult).toContainInOutput("T-Shirt");
      expect(deployResult).toContainInOutput("Digital Product");
    });
  });

  describe("Page Types for CMS", () => {
    it("should create page types with structured content attributes", async () => {
      const configPath = path.join(testDir, "page-types-config.yml");

      const config = {
        pageTypes: [
          {
            name: "Blog Post",
            slug: "blog-post",
            attributes: [
              {
                name: "Title",
                slug: "title",
                type: "PAGE_TYPE",
                inputType: "PLAIN_TEXT",
                valueRequired: true,
                visibleInStorefront: true,
              },
              {
                name: "Content",
                slug: "content",
                type: "PAGE_TYPE",
                inputType: "RICH_TEXT",
                valueRequired: true,
                visibleInStorefront: true,
              },
              {
                name: "Featured Image",
                slug: "featured-image",
                type: "PAGE_TYPE",
                inputType: "FILE",
                valueRequired: false,
                visibleInStorefront: true,
              },
              {
                name: "Tags",
                slug: "tags",
                type: "PAGE_TYPE",
                inputType: "MULTISELECT",
                valueRequired: false,
                visibleInStorefront: true,
                choices: [
                  { name: "Technology", slug: "technology" },
                  { name: "Business", slug: "business" },
                  { name: "Marketing", slug: "marketing" },
                  { name: "Design", slug: "design" },
                ],
              },
              {
                name: "Publication Date",
                slug: "publication-date",
                type: "PAGE_TYPE",
                inputType: "DATE",
                valueRequired: true,
                visibleInStorefront: true,
              },
            ],
          },
          {
            name: "Landing Page",
            slug: "landing-page",
            attributes: [
              {
                name: "Hero Title",
                slug: "hero-title",
                type: "PAGE_TYPE",
                inputType: "PLAIN_TEXT",
                valueRequired: true,
                visibleInStorefront: true,
              },
              {
                name: "Hero Image",
                slug: "hero-image",
                type: "PAGE_TYPE",
                inputType: "FILE",
                valueRequired: false,
                visibleInStorefront: true,
              },
              {
                name: "CTA Button Text",
                slug: "cta-button-text",
                type: "PAGE_TYPE",
                inputType: "PLAIN_TEXT",
                valueRequired: false,
                visibleInStorefront: true,
              },
              {
                name: "CTA Button URL",
                slug: "cta-button-url",
                type: "PAGE_TYPE",
                inputType: "PLAIN_TEXT",
                valueRequired: false,
                visibleInStorefront: true,
              },
            ],
          },
        ],
      };

      await writeYaml(configPath, config);

      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        ci: true,
      });

      assertDeploymentSuccess(deployResult);
      expect(deployResult).toContainInOutput("pageTypes");
      expect(deployResult).toContainInOutput("Blog Post");
      expect(deployResult).toContainInOutput("Landing Page");
    });
  });

  describe("Complete E-commerce Setup", () => {
    it("should deploy a complete store configuration with all entities", async () => {
      const configPath = path.join(testDir, "complete-store.yml");

      const completeConfig = {
        shop: {
          defaultMailSenderName: "Complete Store",
          defaultMailSenderAddress: "info@complete-store.com",
          includeTaxesInPrices: true,
          trackInventoryByDefault: true,
        },
        channels: [
          {
            name: "Main Store",
            slug: "main",
            currencyCode: "USD",
            defaultCountry: "US",
          },
        ],
        warehouses: [
          {
            name: "Central Warehouse",
            slug: "central",
            address: {
              streetAddress1: "1 Main St",
              city: "Boston",
              postalCode: "02101",
              country: "US",
              countryArea: "MA",
            },
          },
        ],
        shippingZones: [
          {
            name: "Worldwide",
            countries: ["US", "GB", "DE", "FR", "CA", "AU", "JP"],
            warehouses: ["central"],
            channels: ["main"],
            shippingMethods: [
              {
                name: "International Standard",
                type: "PRICE",
                channelListings: [
                  {
                    channel: "main",
                    price: 25,
                  },
                ],
              },
            ],
          },
        ],
        taxClasses: [
          {
            name: "General Tax",
            countries: [
              { countryCode: "US", rate: 10 },
              { countryCode: "GB", rate: 20 },
            ],
          },
        ],
        categories: [
          {
            name: "All Products",
            slug: "all-products",
            subcategories: [
              {
                name: "Featured",
                slug: "featured",
              },
              {
                name: "Sale",
                slug: "sale",
              },
            ],
          },
        ],
        productTypes: [
          {
            name: "Simple Product",
            slug: "simple-product",
            hasVariants: false,
            isShippingRequired: true,
            taxClass: "General Tax",
          },
        ],
        pageTypes: [
          {
            name: "Info Page",
            slug: "info-page",
            attributes: [
              {
                name: "Content",
                slug: "content",
                type: "PAGE_TYPE",
                inputType: "RICH_TEXT",
                valueRequired: true,
                visibleInStorefront: true,
              },
            ],
          },
        ],
      };

      await writeYaml(configPath, completeConfig);

      // First deployment
      const firstDeployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        ci: true,
      });

      assertDeploymentSuccess(firstDeployResult);

      // Verify all entities were created
      expect(firstDeployResult).toContainInOutput("shop");
      expect(firstDeployResult).toContainInOutput("channels");
      expect(firstDeployResult).toContainInOutput("warehouses");
      expect(firstDeployResult).toContainInOutput("shippingZones");
      expect(firstDeployResult).toContainInOutput("taxClasses");
      expect(firstDeployResult).toContainInOutput("categories");
      expect(firstDeployResult).toContainInOutput("productTypes");
      expect(firstDeployResult).toContainInOutput("pageTypes");

      // Second deployment should be idempotent
      const secondDeployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        ci: true,
      });

      assertDeploymentSuccess(secondDeployResult);
      expect(secondDeployResult).toContainInOutput("No changes");

      // Introspect and verify round-trip
      const introspectPath = path.join(testDir, "introspected.yml");
      const introspectResult = await cli.introspect(apiUrl, token, {
        config: introspectPath,
      });

      assertIntrospectionSuccess(introspectResult);

      // Deploy introspected config should also show no changes
      const roundTripResult = await cli.deploy(apiUrl, token, {
        config: introspectPath,
        ci: true,
      });

      assertDeploymentSuccess(roundTripResult);
      expect(roundTripResult).toContainInOutput("No changes");
    });
  });
});
