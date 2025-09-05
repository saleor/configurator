import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertDeploymentSuccess,
  assertIntrospectionSuccess,
  assertNoChanges,
} from "../../utils/assertions.ts";
import { CliRunner } from "../../utils/cli-runner.ts";
import { getAdminToken, getTestConfig, waitForApi } from "../../utils/test-env.ts";
import { cleanupTempDir, createTempDir, readYaml, writeYaml } from "../../utils/test-helpers.ts";

// Type definitions for E2E test data structures
interface TestChannel {
  name: string;
  slug: string;
  currencyCode: string;
  defaultCountry: string;
  isActive?: boolean;
}

interface TestCategory {
  name: string;
  slug: string;
  description?: string;
  parent?: string;
}

interface TestAttributeValue {
  name: string;
  slug: string;
  value?: string; // For swatch colors
}

interface TestProductAttribute {
  name: string;
  slug: string;
  type: string;
  inputType: string;
  valueRequired?: boolean;
  visibleInStorefront?: boolean;
  filterableInStorefront?: boolean;
  filterableInDashboard?: boolean;
  availableInGrid?: boolean;
  choices?: string[];
  values?: TestAttributeValue[];
}

interface TestProductType {
  name: string;
  slug?: string;
  hasVariants?: boolean;
  isShippingRequired?: boolean;
  productAttributes: TestProductAttribute[];
  variantAttributes: TestProductAttribute[];
}

interface TestPageAttribute {
  name: string;
  slug: string;
  type: string;
  inputType: string;
  valueRequired?: boolean;
  visibleInStorefront?: boolean;
  availableInGrid?: boolean;
  storefrontSearchPosition?: number;
  values?: TestAttributeValue[];
}

interface TestPageType {
  name: string;
  slug?: string;
  attributes: TestPageAttribute[];
}

describe("E2E Complete Round-Trip Tests - All Entities", () => {
  let cli: CliRunner;
  let apiUrl: string;
  let token: string;
  let testDir: string;

  beforeAll(async () => {
    console.log("🚀 Starting complete round-trip test setup...");

    testDir = await createTempDir("round-trip-complete-test-");

    const config = getTestConfig();
    apiUrl = config.apiUrl;
    await waitForApi(apiUrl);
    token = await getAdminToken(apiUrl, config.adminEmail, config.adminPassword);
    cli = new CliRunner({ verbose: process.env.VERBOSE === "true" });

    console.log("✅ Complete round-trip test setup complete");
  }, 60000);

  afterAll(async () => {
    await cleanupTempDir(testDir);
  });

  describe("Complete Entity Round-Trip", () => {
    it("should preserve ALL entity data through introspect → deploy → introspect cycle", async () => {
      const originalConfigPath = path.join(testDir, "complete-original.yml");
      const firstIntrospectPath = path.join(testDir, "first-introspect.yml");
      const secondIntrospectPath = path.join(testDir, "second-introspect.yml");

      // Comprehensive configuration covering ALL supported entities
      const completeConfig = {
        shop: {
          defaultMailSenderName: "Complete Round-Trip Store",
          defaultMailSenderAddress: "roundtrip@test.com",
          description: "Comprehensive store for complete round-trip testing",
          trackInventoryByDefault: true,
          defaultWeightUnit: "KG",
          automaticFulfillmentDigitalProducts: false,
          fulfillmentAutoApprove: true,
          fulfillmentAllowUnpaid: false,
          defaultDigitalMaxDownloads: 10,
          defaultDigitalUrlValidDays: 30,
          customerSetPasswordUrl: "https://example.com/set-password",
          reserveStockDurationAnonymousUser: 5,
          reserveStockDurationAuthenticatedUser: 15,
          limitQuantityPerCheckout: 50,
          enableAccountConfirmationByEmail: true,
          allowLoginWithoutConfirmation: false,
          displayGrossPrices: true,
        },
        channels: [
          {
            name: "Primary Sales Channel",
            slug: "primary-sales",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
          {
            name: "European Market Channel",
            slug: "european-market",
            currencyCode: "EUR",
            defaultCountry: "DE",
            isActive: true,
          },
          {
            name: "UK Market Channel",
            slug: "uk-market",
            currencyCode: "GBP",
            defaultCountry: "GB",
            isActive: false,
          },
          {
            name: "Asian Pacific Channel",
            slug: "asian-pacific",
            currencyCode: "JPY",
            defaultCountry: "JP",
            isActive: true,
          },
        ],
        categories: [
          {
            name: "Electronics",
            slug: "electronics",
            description: "All electronic products and devices",
          },
          {
            name: "Computers & Laptops",
            slug: "computers-laptops",
            description: "Desktop computers, laptops, and accessories",
            parent: "electronics",
          },
          {
            name: "Gaming Laptops",
            slug: "gaming-laptops",
            description: "High-performance gaming laptops",
            parent: "computers-laptops",
          },
          {
            name: "Smartphones & Tablets",
            slug: "smartphones-tablets",
            description: "Mobile devices and tablets",
            parent: "electronics",
          },
          {
            name: "Audio & Video",
            slug: "audio-video",
            description: "Audio equipment and video devices",
            parent: "electronics",
          },
          {
            name: "Headphones",
            slug: "headphones",
            description: "All types of headphones and earbuds",
            parent: "audio-video",
          },
          {
            name: "Home & Garden",
            slug: "home-garden",
            description: "Home improvement and garden products",
          },
          {
            name: "Kitchen Appliances",
            slug: "kitchen-appliances",
            description: "Kitchen tools and appliances",
            parent: "home-garden",
          },
          {
            name: "Outdoor Furniture",
            slug: "outdoor-furniture",
            description: "Garden and patio furniture",
            parent: "home-garden",
          },
          {
            name: "Fashion & Apparel",
            slug: "fashion-apparel",
            description: "Clothing and fashion accessories",
          },
        ],
        productTypes: [
          {
            name: "Electronics Product",
            isShippingRequired: true,
            productAttributes: [
              {
                name: "Brand",
                slug: "brand",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                valueRequired: true,
                visibleInStorefront: true,
                filterableInStorefront: true,
                filterableInDashboard: true,
                availableInGrid: true,
                values: [
                  { name: "Apple", slug: "apple" },
                  { name: "Samsung", slug: "samsung" },
                  { name: "Sony", slug: "sony" },
                  { name: "LG", slug: "lg" },
                  { name: "Dell", slug: "dell" },
                  { name: "HP", slug: "hp" },
                ],
              },
              {
                name: "Warranty Period",
                slug: "warranty-period",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                valueRequired: false,
                visibleInStorefront: true,
                filterableInStorefront: true,
                filterableInDashboard: true,
                values: [
                  { name: "6 months", slug: "6-months" },
                  { name: "1 year", slug: "1-year" },
                  { name: "2 years", slug: "2-years" },
                  { name: "3 years", slug: "3-years" },
                ],
              },
              {
                name: "Energy Rating",
                slug: "energy-rating",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                valueRequired: false,
                visibleInStorefront: true,
                filterableInStorefront: false,
                filterableInDashboard: true,
                values: [
                  { name: "A+++", slug: "a-plus-plus-plus" },
                  { name: "A++", slug: "a-plus-plus" },
                  { name: "A+", slug: "a-plus" },
                  { name: "A", slug: "a" },
                  { name: "B", slug: "b" },
                  { name: "C", slug: "c" },
                ],
              },
              {
                name: "Model Number",
                slug: "model-number",
                type: "PLAIN_TEXT",
                inputType: "PLAIN_TEXT",
                valueRequired: false,
                visibleInStorefront: true,
                filterableInStorefront: false,
                filterableInDashboard: true,
              },
            ],
            variantAttributes: [
              {
                name: "Color",
                slug: "color",
                type: "SWATCH",
                inputType: "SWATCH",
                valueRequired: true,
                visibleInStorefront: true,
                filterableInStorefront: true,
                filterableInDashboard: true,
                values: [
                  { name: "Black", slug: "black", value: "#000000" },
                  { name: "White", slug: "white", value: "#FFFFFF" },
                  { name: "Silver", slug: "silver", value: "#C0C0C0" },
                  { name: "Gold", slug: "gold", value: "#FFD700" },
                  { name: "Space Gray", slug: "space-gray", value: "#4B4B4D" },
                ],
              },
              {
                name: "Storage Size",
                slug: "storage-size",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                valueRequired: true,
                visibleInStorefront: true,
                filterableInStorefront: true,
                filterableInDashboard: true,
                values: [
                  { name: "64GB", slug: "64gb" },
                  { name: "128GB", slug: "128gb" },
                  { name: "256GB", slug: "256gb" },
                  { name: "512GB", slug: "512gb" },
                  { name: "1TB", slug: "1tb" },
                ],
              },
            ],
          },
          {
            name: "Fashion Product",
            isShippingRequired: true,
            productAttributes: [
              {
                name: "Material",
                slug: "material",
                type: "MULTISELECT",
                inputType: "MULTISELECT",
                valueRequired: false,
                visibleInStorefront: true,
                filterableInStorefront: true,
                filterableInDashboard: true,
                values: [
                  { name: "Cotton", slug: "cotton" },
                  { name: "Polyester", slug: "polyester" },
                  { name: "Wool", slug: "wool" },
                  { name: "Silk", slug: "silk" },
                  { name: "Leather", slug: "leather" },
                  { name: "Denim", slug: "denim" },
                ],
              },
              {
                name: "Care Instructions",
                slug: "care-instructions",
                type: "RICH_TEXT",
                inputType: "RICH_TEXT",
                valueRequired: false,
                visibleInStorefront: true,
                filterableInStorefront: false,
                filterableInDashboard: false,
              },
            ],
            variantAttributes: [
              {
                name: "Size",
                slug: "size",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                valueRequired: true,
                visibleInStorefront: true,
                filterableInStorefront: true,
                filterableInDashboard: true,
                values: [
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
                slug: "fashion-color",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                valueRequired: true,
                visibleInStorefront: true,
                filterableInStorefront: true,
                filterableInDashboard: true,
                values: [
                  { name: "Red", slug: "red" },
                  { name: "Blue", slug: "blue" },
                  { name: "Green", slug: "green" },
                  { name: "Black", slug: "fashion-black" },
                  { name: "White", slug: "fashion-white" },
                ],
              },
            ],
          },
          {
            name: "Digital Product",
            isShippingRequired: false,
            productAttributes: [
              {
                name: "File Format",
                slug: "file-format",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                valueRequired: true,
                visibleInStorefront: true,
                filterableInStorefront: true,
                filterableInDashboard: true,
                values: [
                  { name: "PDF", slug: "pdf" },
                  { name: "MP4", slug: "mp4" },
                  { name: "MP3", slug: "mp3" },
                  { name: "ZIP", slug: "zip" },
                  { name: "EXE", slug: "exe" },
                ],
              },
              {
                name: "File Size",
                slug: "file-size",
                type: "PLAIN_TEXT",
                inputType: "PLAIN_TEXT",
                valueRequired: false,
                visibleInStorefront: true,
                filterableInStorefront: false,
                filterableInDashboard: true,
              },
            ],
            variantAttributes: [
              {
                name: "License Type",
                slug: "license-type",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                valueRequired: true,
                visibleInStorefront: true,
                filterableInStorefront: true,
                filterableInDashboard: true,
                values: [
                  { name: "Personal", slug: "personal" },
                  { name: "Commercial", slug: "commercial" },
                  { name: "Extended", slug: "extended" },
                ],
              },
            ],
          },
        ],
        pageTypes: [
          {
            name: "Blog Post",
            attributes: [
              {
                name: "Author",
                slug: "author",
                type: "PLAIN_TEXT",
                inputType: "PLAIN_TEXT",
                valueRequired: true,
                visibleInStorefront: true,
                availableInGrid: true,
                storefrontSearchPosition: 1,
              },
              {
                name: "Publication Date",
                slug: "publication-date",
                type: "DATE",
                inputType: "DATE",
                valueRequired: true,
                visibleInStorefront: true,
                availableInGrid: true,
                storefrontSearchPosition: 2,
              },
              {
                name: "Tags",
                slug: "tags",
                type: "MULTISELECT",
                inputType: "MULTISELECT",
                valueRequired: false,
                visibleInStorefront: true,
                availableInGrid: true,
                values: [
                  { name: "Technology", slug: "technology" },
                  { name: "Fashion", slug: "fashion-tag" },
                  { name: "Lifestyle", slug: "lifestyle" },
                  { name: "Business", slug: "business" },
                  { name: "Tutorial", slug: "tutorial" },
                ],
              },
              {
                name: "Featured Image",
                slug: "featured-image",
                type: "FILE",
                inputType: "FILE",
                valueRequired: false,
                visibleInStorefront: true,
                availableInGrid: false,
              },
              {
                name: "Content Summary",
                slug: "content-summary",
                type: "RICH_TEXT",
                inputType: "RICH_TEXT",
                valueRequired: false,
                visibleInStorefront: true,
                availableInGrid: false,
              },
            ],
          },
          {
            name: "Landing Page",
            attributes: [
              {
                name: "Page Title",
                slug: "page-title",
                type: "PLAIN_TEXT",
                inputType: "PLAIN_TEXT",
                valueRequired: true,
                visibleInStorefront: true,
                availableInGrid: true,
                storefrontSearchPosition: 1,
              },
              {
                name: "Meta Description",
                slug: "meta-description",
                type: "PLAIN_TEXT",
                inputType: "PLAIN_TEXT",
                valueRequired: false,
                visibleInStorefront: false,
                availableInGrid: true,
              },
              {
                name: "Hero Banner",
                slug: "hero-banner",
                type: "FILE",
                inputType: "FILE",
                valueRequired: false,
                visibleInStorefront: true,
                availableInGrid: false,
              },
              {
                name: "Call to Action",
                slug: "call-to-action",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                valueRequired: false,
                visibleInStorefront: true,
                availableInGrid: true,
                values: [
                  { name: "Shop Now", slug: "shop-now" },
                  { name: "Learn More", slug: "learn-more" },
                  { name: "Sign Up", slug: "sign-up" },
                  { name: "Contact Us", slug: "contact-us" },
                ],
              },
            ],
          },
          {
            name: "FAQ Page",
            attributes: [
              {
                name: "Category",
                slug: "faq-category",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                valueRequired: true,
                visibleInStorefront: true,
                availableInGrid: true,
                storefrontSearchPosition: 1,
                values: [
                  { name: "Shipping", slug: "shipping" },
                  { name: "Returns", slug: "returns" },
                  { name: "Payment", slug: "payment" },
                  { name: "Account", slug: "account" },
                  { name: "Technical", slug: "technical" },
                ],
              },
              {
                name: "Priority Level",
                slug: "priority-level",
                type: "NUMERIC",
                inputType: "NUMERIC",
                valueRequired: false,
                visibleInStorefront: false,
                availableInGrid: true,
              },
              {
                name: "Last Updated",
                slug: "last-updated",
                type: "DATE_TIME",
                inputType: "DATE_TIME",
                valueRequired: false,
                visibleInStorefront: true,
                availableInGrid: true,
              },
            ],
          },
        ],
      };

      await writeYaml(originalConfigPath, completeConfig);

      // Step 1: Deploy the comprehensive configuration
      console.log("📤 Step 1: Deploying comprehensive configuration...");
      const deployResult = await cli.deploy(apiUrl, token, {
        config: originalConfigPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(deployResult);

      // Step 2: Introspect the deployed configuration
      console.log("📥 Step 2: Introspecting deployed configuration...");
      const firstIntrospectResult = await cli.introspect(apiUrl, token, {
        config: firstIntrospectPath,
      });

      assertIntrospectionSuccess(firstIntrospectResult);
      const firstIntrospectedData = await readYaml(firstIntrospectPath);

      // Step 3: Deploy the introspected configuration (should be idempotent)
      console.log("🔄 Step 3: Deploying introspected configuration...");
      const secondDeployResult = await cli.deploy(apiUrl, token, {
        config: firstIntrospectPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(secondDeployResult);

      // Step 4: Introspect again to verify round-trip integrity
      console.log("📥 Step 4: Second introspection for round-trip verification...");
      const secondIntrospectResult = await cli.introspect(apiUrl, token, {
        config: secondIntrospectPath,
      });

      assertIntrospectionSuccess(secondIntrospectResult);
      const secondIntrospectedData = await readYaml(secondIntrospectPath);

      // Step 5: Verify no differences detected
      console.log("🔍 Step 5: Verifying no differences detected...");
      const diffResult = await cli.diff(apiUrl, token, {
        config: secondIntrospectPath,
      });

      assertNoChanges(diffResult);

      // Step 6: Deep data integrity verification
      console.log("🔬 Step 6: Deep data integrity verification...");

      // Verify Shop data preservation
      expect(firstIntrospectedData.shop.defaultMailSenderName).toBe(
        completeConfig.shop.defaultMailSenderName
      );
      expect(firstIntrospectedData.shop.defaultMailSenderAddress).toBe(
        completeConfig.shop.defaultMailSenderAddress
      );
      expect(firstIntrospectedData.shop.description).toBe(completeConfig.shop.description);
      expect(firstIntrospectedData.shop.trackInventoryByDefault).toBe(
        completeConfig.shop.trackInventoryByDefault
      );
      expect(firstIntrospectedData.shop.defaultWeightUnit).toBe(
        completeConfig.shop.defaultWeightUnit
      );

      // Verify Channels data preservation
      expect(firstIntrospectedData.channels).toHaveLength(4);
      const primaryChannel = firstIntrospectedData.channels.find(
        (c: TestChannel) => c.slug === "primary-sales"
      );
      expect(primaryChannel).toBeDefined();
      expect(primaryChannel?.name).toBe("Primary Sales Channel");
      expect(primaryChannel?.currencyCode).toBe("USD");
      expect(primaryChannel?.defaultCountry).toBe("US");
      expect(primaryChannel?.isActive).toBe(true);

      const europeanChannel = firstIntrospectedData.channels.find(
        (c: TestChannel) => c.slug === "european-market"
      );
      expect(europeanChannel).toBeDefined();
      expect(europeanChannel?.currencyCode).toBe("EUR");
      expect(europeanChannel?.defaultCountry).toBe("DE");

      const ukChannel = firstIntrospectedData.channels.find(
        (c: TestChannel) => c.slug === "uk-market"
      );
      expect(ukChannel).toBeDefined();
      expect(ukChannel?.isActive).toBe(false); // Should preserve false value

      // Verify Categories data preservation with hierarchy
      expect(firstIntrospectedData.categories).toHaveLength(10);
      const electronicsCategory = firstIntrospectedData.categories?.find(
        (c: TestCategory) => c.slug === "electronics"
      );
      expect(electronicsCategory).toBeDefined();
      expect(electronicsCategory?.name).toBe("Electronics");

      const computersCategory = firstIntrospectedData.categories?.find(
        (c: TestCategory) => c.slug === "computers-laptops"
      );
      expect(computersCategory).toBeDefined();
      expect(computersCategory?.parent).toBe("electronics");

      const gamingLaptopsCategory = firstIntrospectedData.categories?.find(
        (c: TestCategory) => c.slug === "gaming-laptops"
      );
      expect(gamingLaptopsCategory).toBeDefined();
      expect(gamingLaptopsCategory?.parent).toBe("computers-laptops");

      // Verify ProductTypes with attributes preservation
      expect(firstIntrospectedData.productTypes).toHaveLength(3);

      const electronicsProductType = firstIntrospectedData.productTypes.find(
        (pt: TestProductType) => pt.name === "Electronics Product"
      );
      expect(electronicsProductType).toBeDefined();
      expect(electronicsProductType?.isShippingRequired).toBe(true);
      expect(electronicsProductType?.productAttributes).toHaveLength(4);
      expect(electronicsProductType?.variantAttributes).toHaveLength(2);

      const brandAttribute = electronicsProductType?.productAttributes.find(
        (attr: TestProductAttribute) => attr.slug === "brand"
      );
      expect(brandAttribute).toBeDefined();
      expect(brandAttribute?.type).toBe("DROPDOWN");
      expect(brandAttribute?.valueRequired).toBe(true);
      expect(brandAttribute?.values).toHaveLength(6);

      const colorVariantAttribute = electronicsProductType?.variantAttributes.find(
        (attr: TestProductAttribute) => attr.slug === "color"
      );
      expect(colorVariantAttribute).toBeDefined();
      expect(colorVariantAttribute?.type).toBe("SWATCH");
      expect(colorVariantAttribute?.values).toHaveLength(5);

      const digitalProductType = firstIntrospectedData.productTypes.find(
        (pt: TestProductType) => pt.name === "Digital Product"
      );
      expect(digitalProductType).toBeDefined();
      expect(digitalProductType?.isShippingRequired).toBe(false); // Digital products don't require shipping

      // Verify PageTypes with attributes preservation
      expect(firstIntrospectedData.pageTypes).toHaveLength(3);

      const blogPostPageType = firstIntrospectedData.pageTypes.find(
        (pt: TestPageType) => pt.name === "Blog Post"
      );
      expect(blogPostPageType).toBeDefined();
      expect(blogPostPageType?.attributes).toHaveLength(5);

      const authorAttribute = blogPostPageType?.attributes.find(
        (attr: TestPageAttribute) => attr.slug === "author"
      );
      expect(authorAttribute).toBeDefined();
      expect(authorAttribute?.type).toBe("PLAIN_TEXT");
      expect(authorAttribute?.valueRequired).toBe(true);
      expect(authorAttribute?.storefrontSearchPosition).toBe(1);

      const tagsAttribute = blogPostPageType?.attributes.find(
        (attr: TestPageAttribute) => attr.slug === "tags"
      );
      expect(tagsAttribute).toBeDefined();
      expect(tagsAttribute?.type).toBe("MULTISELECT");
      expect(tagsAttribute?.values).toHaveLength(5);

      // Verify data consistency between first and second introspection
      expect(JSON.stringify(secondIntrospectedData, null, 2)).toBe(
        JSON.stringify(firstIntrospectedData, null, 2)
      );

      console.log("✅ Complete round-trip test passed - all data preserved perfectly!");
    }, 480000);
  });

  describe("Selective Round-Trip Testing", () => {
    it("should preserve data integrity in selective round-trip operations", async () => {
      const configPath = path.join(testDir, "selective-round-trip.yml");
      const introspectPath = path.join(testDir, "selective-introspected.yml");

      // Deploy comprehensive base configuration
      const baseConfig = {
        shop: {
          defaultMailSenderName: "Selective Round-Trip Store",
          defaultMailSenderAddress: "selective@test.com",
          description: "Store for selective round-trip testing",
        },
        channels: [
          {
            name: "Selective Channel 1",
            slug: "selective-channel-1",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
          {
            name: "Selective Channel 2",
            slug: "selective-channel-2",
            currencyCode: "EUR",
            defaultCountry: "DE",
            isActive: true,
          },
        ],
        categories: [
          {
            name: "Selective Category 1",
            slug: "selective-category-1",
            description: "First selective category",
          },
          {
            name: "Selective Category 2",
            slug: "selective-category-2",
            description: "Second selective category",
          },
        ],
      };

      await writeYaml(configPath, baseConfig);

      console.log("📤 Deploying base configuration for selective testing...");
      const baseDeployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(baseDeployResult);

      // Introspect only shop and channels (selective)
      console.log("📥 Selective introspection (shop and channels only)...");
      const selectiveIntrospectResult = await cli.introspect(apiUrl, token, {
        config: introspectPath,
        include: ["shop", "channels"],
      });

      assertIntrospectionSuccess(selectiveIntrospectResult);
      const selectiveIntrospectedData = await readYaml(introspectPath);

      // Verify selective introspection contains only requested sections
      expect(selectiveIntrospectedData.shop).toBeDefined();
      expect(selectiveIntrospectedData.channels).toBeDefined();
      expect(selectiveIntrospectedData.channels).toHaveLength(2);

      // Categories should not be included in selective introspection
      expect(selectiveIntrospectedData.categories).toBeUndefined();

      // Deploy selective configuration back (should only affect shop and channels)
      console.log("🎯 Deploying selective configuration back...");
      const selectiveDeployResult = await cli.deploy(apiUrl, token, {
        config: introspectPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(selectiveDeployResult);

      // Verify full introspection still contains all original data
      console.log("🔍 Verifying full data integrity after selective operations...");
      const fullIntrospectPath = path.join(testDir, "full-after-selective.yml");
      const fullIntrospectResult = await cli.introspect(apiUrl, token, {
        config: fullIntrospectPath,
      });

      assertIntrospectionSuccess(fullIntrospectResult);
      const fullIntrospectedData = await readYaml(fullIntrospectPath);

      // All original data should still be present
      expect(fullIntrospectedData.shop.defaultMailSenderName).toBe("Selective Round-Trip Store");
      expect(fullIntrospectedData.channels).toHaveLength(2);
      expect(fullIntrospectedData.categories).toHaveLength(2);

      const originalCategory1 = fullIntrospectedData.categories?.find(
        (c: TestCategory) => c.slug === "selective-category-1"
      );
      expect(originalCategory1).toBeDefined();
      expect(originalCategory1?.description).toBe("First selective category");
    }, 240000);
  });

  describe("Complex Data Structure Round-Trip", () => {
    it("should preserve complex nested structures and relationships", async () => {
      const configPath = path.join(testDir, "complex-structures.yml");
      const introspectPath = path.join(testDir, "complex-introspected.yml");

      // Complex configuration with deep nesting and relationships
      const complexConfig = {
        shop: {
          defaultMailSenderName: "Complex Structure Store",
          defaultMailSenderAddress: "complex@test.com",
          description: "Store testing complex data structures",
          trackInventoryByDefault: true,
          defaultWeightUnit: "KG",
          reserveStockDurationAnonymousUser: 5,
          reserveStockDurationAuthenticatedUser: 15,
          limitQuantityPerCheckout: 100,
          enableAccountConfirmationByEmail: true,
          allowLoginWithoutConfirmation: false,
          displayGrossPrices: true,
        },
        channels: [
          {
            name: "Multi-Region Channel",
            slug: "multi-region-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
        ],
        categories: [
          {
            name: "Root Category",
            slug: "root-category",
            description: "Top-level root category",
          },
          {
            name: "Level 1 Category A",
            slug: "level-1-category-a",
            description: "First level 1 category",
            parent: "root-category",
          },
          {
            name: "Level 1 Category B",
            slug: "level-1-category-b",
            description: "Second level 1 category",
            parent: "root-category",
          },
          {
            name: "Level 2 Category A1",
            slug: "level-2-category-a1",
            description: "First level 2 under A",
            parent: "level-1-category-a",
          },
          {
            name: "Level 2 Category A2",
            slug: "level-2-category-a2",
            description: "Second level 2 under A",
            parent: "level-1-category-a",
          },
          {
            name: "Level 2 Category B1",
            slug: "level-2-category-b1",
            description: "First level 2 under B",
            parent: "level-1-category-b",
          },
          {
            name: "Level 3 Deep Category",
            slug: "level-3-deep-category",
            description: "Deep nested category",
            parent: "level-2-category-a1",
          },
        ],
        productTypes: [
          {
            name: "Complex Product Type",
            isShippingRequired: true,
            productAttributes: [
              {
                name: "Complex Multiselect",
                slug: "complex-multiselect",
                type: "MULTISELECT",
                inputType: "MULTISELECT",
                valueRequired: false,
                visibleInStorefront: true,
                filterableInStorefront: true,
                filterableInDashboard: true,
                availableInGrid: true,
                values: [
                  { name: "Option Alpha", slug: "option-alpha" },
                  { name: "Option Beta", slug: "option-beta" },
                  { name: "Option Gamma", slug: "option-gamma" },
                  { name: "Option Delta", slug: "option-delta" },
                  { name: "Option Epsilon", slug: "option-epsilon" },
                  { name: "Option Zeta", slug: "option-zeta" },
                  { name: "Option Eta", slug: "option-eta" },
                  { name: "Option Theta", slug: "option-theta" },
                ],
              },
              {
                name: "Rich Text Description",
                slug: "rich-text-description",
                type: "RICH_TEXT",
                inputType: "RICH_TEXT",
                valueRequired: false,
                visibleInStorefront: true,
                filterableInStorefront: false,
                filterableInDashboard: false,
                availableInGrid: false,
              },
              {
                name: "Numeric Rating",
                slug: "numeric-rating",
                type: "NUMERIC",
                inputType: "NUMERIC",
                valueRequired: false,
                visibleInStorefront: true,
                filterableInStorefront: true,
                filterableInDashboard: true,
                availableInGrid: true,
              },
            ],
            variantAttributes: [
              {
                name: "Advanced Swatch Colors",
                slug: "advanced-swatch-colors",
                type: "SWATCH",
                inputType: "SWATCH",
                valueRequired: true,
                visibleInStorefront: true,
                filterableInStorefront: true,
                filterableInDashboard: true,
                values: [
                  { name: "Midnight Blue", slug: "midnight-blue", value: "#191970" },
                  { name: "Forest Green", slug: "forest-green", value: "#228B22" },
                  { name: "Crimson Red", slug: "crimson-red", value: "#DC143C" },
                  { name: "Golden Yellow", slug: "golden-yellow", value: "#FFD700" },
                  { name: "Royal Purple", slug: "royal-purple", value: "#7851A9" },
                  { name: "Ocean Teal", slug: "ocean-teal", value: "#008080" },
                ],
              },
              {
                name: "Complex Variant Dropdown",
                slug: "complex-variant-dropdown",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                valueRequired: true,
                visibleInStorefront: true,
                filterableInStorefront: true,
                filterableInDashboard: true,
                values: [
                  { name: "Configuration A", slug: "configuration-a" },
                  { name: "Configuration B", slug: "configuration-b" },
                  { name: "Configuration C", slug: "configuration-c" },
                  { name: "Premium Configuration", slug: "premium-configuration" },
                  { name: "Enterprise Configuration", slug: "enterprise-configuration" },
                ],
              },
            ],
          },
        ],
        pageTypes: [
          {
            name: "Complex Page Type",
            attributes: [
              {
                name: "Multi-Level Dropdown",
                slug: "multi-level-dropdown",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                valueRequired: false,
                visibleInStorefront: true,
                availableInGrid: true,
                storefrontSearchPosition: 1,
                values: [
                  { name: "Primary Level 1", slug: "primary-level-1" },
                  { name: "Primary Level 2", slug: "primary-level-2" },
                  { name: "Secondary Level 1", slug: "secondary-level-1" },
                  { name: "Secondary Level 2", slug: "secondary-level-2" },
                  { name: "Tertiary Advanced", slug: "tertiary-advanced" },
                ],
              },
              {
                name: "Complex File Upload",
                slug: "complex-file-upload",
                type: "FILE",
                inputType: "FILE",
                valueRequired: false,
                visibleInStorefront: false,
                availableInGrid: false,
              },
              {
                name: "Advanced Date Time",
                slug: "advanced-date-time",
                type: "DATE_TIME",
                inputType: "DATE_TIME",
                valueRequired: false,
                visibleInStorefront: true,
                availableInGrid: true,
                storefrontSearchPosition: 2,
              },
              {
                name: "Complex Boolean Logic",
                slug: "complex-boolean-logic",
                type: "BOOLEAN",
                inputType: "BOOLEAN",
                valueRequired: false,
                visibleInStorefront: true,
                availableInGrid: true,
              },
            ],
          },
        ],
      };

      await writeYaml(configPath, complexConfig);

      console.log("📤 Deploying complex structure configuration...");
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(deployResult);

      console.log("📥 Introspecting complex structures...");
      const introspectResult = await cli.introspect(apiUrl, token, {
        config: introspectPath,
      });

      assertIntrospectionSuccess(introspectResult);
      const introspectedData = await readYaml(introspectPath);

      console.log("🔄 Re-deploying introspected complex structures...");
      const redeployResult = await cli.deploy(apiUrl, token, {
        config: introspectPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(redeployResult);

      console.log("🔍 Verifying complex structure preservation...");
      const diffResult = await cli.diff(apiUrl, token, {
        config: introspectPath,
      });

      assertNoChanges(diffResult);

      // Verify complex nested category hierarchy
      expect(introspectedData.categories).toHaveLength(7);
      const rootCategory = introspectedData.categories?.find(
        (c: TestCategory) => c.slug === "root-category"
      );
      expect(rootCategory).toBeDefined();
      expect(rootCategory?.parent).toBeUndefined(); // Root has no parent

      const level3Category = introspectedData.categories?.find(
        (c: TestCategory) => c.slug === "level-3-deep-category"
      );
      expect(level3Category).toBeDefined();
      expect(level3Category?.parent).toBe("level-2-category-a1");

      // Verify complex product type with all attribute types
      const complexProductType = introspectedData.productTypes.find(
        (pt: TestProductType) => pt.name === "Complex Product Type"
      );
      expect(complexProductType).toBeDefined();
      expect(complexProductType?.productAttributes).toHaveLength(3);
      expect(complexProductType?.variantAttributes).toHaveLength(2);

      const multiselectAttr = complexProductType?.productAttributes.find(
        (attr: TestProductAttribute) => attr.type === "MULTISELECT"
      );
      expect(multiselectAttr).toBeDefined();
      expect(multiselectAttr?.values).toHaveLength(8);

      const swatchAttr = complexProductType?.variantAttributes.find(
        (attr: TestProductAttribute) => attr.type === "SWATCH"
      );
      expect(swatchAttr).toBeDefined();
      expect(swatchAttr?.values).toHaveLength(6);
      expect(swatchAttr?.values?.[0].value).toBe("#191970"); // Midnight Blue hex value

      // Verify complex page type with all attribute types
      const complexPageType = introspectedData.pageTypes.find(
        (pt: TestPageType) => pt.name === "Complex Page Type"
      );
      expect(complexPageType).toBeDefined();
      expect(complexPageType?.attributes).toHaveLength(4);

      const fileAttr = complexPageType?.attributes.find(
        (attr: TestPageAttribute) => attr.type === "FILE"
      );
      expect(fileAttr).toBeDefined();

      const dateTimeAttr = complexPageType?.attributes.find(
        (attr: TestPageAttribute) => attr.type === "DATE_TIME"
      );
      expect(dateTimeAttr).toBeDefined();
      expect(dateTimeAttr?.storefrontSearchPosition).toBe(2);

      console.log("✅ Complex structure round-trip test passed!");
    }, 360000);
  });

  describe("Edge Case Round-Trip Testing", () => {
    it("should handle edge cases and special characters in round-trip", async () => {
      const configPath = path.join(testDir, "edge-cases.yml");
      const introspectPath = path.join(testDir, "edge-cases-introspected.yml");

      // Configuration with edge cases and special characters
      const edgeCaseConfig = {
        shop: {
          defaultMailSenderName: "Edge-Case Store with Special Characters: éàü & Co.",
          defaultMailSenderAddress: "edge-case@test-domain.com",
          description: 'Store with émojis 🛒, spëcial chars & "quotes", and (parentheses)',
        },
        channels: [
          {
            name: "Spëcial Ñamé Channel",
            slug: "special-name-channel",
            currencyCode: "EUR",
            defaultCountry: "DE",
            isActive: true,
          },
        ],
        categories: [
          {
            name: 'Category with "Quotes" & Spëcials',
            slug: "category-with-quotes-specials",
            description: "Description with émojis 📦, newlines\nand special chars: ñáéíóú",
          },
          {
            name: "Very Long Category Name That Exceeds Normal Length Expectations And Contains Many Words",
            slug: "very-long-category-name",
            description:
              "A very detailed description that contains multiple sentences. It includes various punctuation marks, such as commas, semicolons; and even em-dashes—like this one. The purpose is to test how well the system handles longer text content.",
          },
        ],
        productTypes: [
          {
            name: "Edge Case Product Type",
            isShippingRequired: true,
            productAttributes: [
              {
                name: "Attribute with Spëcial Chars",
                slug: "attribute-with-special-chars",
                type: "DROPDOWN",
                inputType: "DROPDOWN",
                valueRequired: false,
                visibleInStorefront: true,
                filterableInStorefront: true,
                filterableInDashboard: true,
                values: [
                  { name: "Optiön Ålpha", slug: "option-alpha-special" },
                  { name: 'Choice with "quotes"', slug: "choice-with-quotes" },
                  { name: "Émoji Choice 🎉", slug: "emoji-choice" },
                  { name: "Numbers & Symbols: 123!@#", slug: "numbers-symbols" },
                ],
              },
            ],
            variantAttributes: [],
          },
        ],
        pageTypes: [
          {
            name: "Edge Case Page Type",
            attributes: [
              {
                name: "Spëcial Attributë",
                slug: "special-attribute",
                type: "PLAIN_TEXT",
                inputType: "PLAIN_TEXT",
                valueRequired: false,
                visibleInStorefront: true,
                availableInGrid: true,
                storefrontSearchPosition: 1,
              },
            ],
          },
        ],
      };

      await writeYaml(configPath, edgeCaseConfig);

      console.log("📤 Deploying edge case configuration...");
      const deployResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(deployResult);

      console.log("📥 Introspecting edge case data...");
      const introspectResult = await cli.introspect(apiUrl, token, {
        config: introspectPath,
      });

      assertIntrospectionSuccess(introspectResult);
      const introspectedData = await readYaml(introspectPath);

      console.log("🔄 Re-deploying edge case introspected data...");
      const redeployResult = await cli.deploy(apiUrl, token, {
        config: introspectPath,
        skipDiff: true,
      });

      assertDeploymentSuccess(redeployResult);

      console.log("🔍 Verifying edge case data preservation...");
      const diffResult = await cli.diff(apiUrl, token, {
        config: introspectPath,
      });

      assertNoChanges(diffResult);

      // Verify special characters are preserved
      expect(introspectedData.shop.defaultMailSenderName).toBe(
        "Edge-Case Store with Special Characters: éàü & Co."
      );
      expect(introspectedData.shop.description).toContain("émojis 🛒");
      expect(introspectedData.shop.description).toContain("spëcial");
      expect(introspectedData.shop.description).toContain('"quotes"');

      const specialChannel = introspectedData.channels.find(
        (c: TestChannel) => c.slug === "special-name-channel"
      );
      expect(specialChannel).toBeDefined();
      expect(specialChannel?.name).toBe("Spëcial Ñamé Channel");

      const categoryWithQuotes = introspectedData.categories?.find(
        (c: TestCategory) => c.slug === "category-with-quotes-specials"
      );
      expect(categoryWithQuotes).toBeDefined();
      expect(categoryWithQuotes?.name).toContain('"Quotes"');
      expect(categoryWithQuotes?.description).toContain("📦");
      expect(categoryWithQuotes?.description).toContain("\n");

      const longCategory = introspectedData.categories?.find(
        (c: TestCategory) => c.slug === "very-long-category-name"
      );
      expect(longCategory).toBeDefined();
      expect(longCategory?.name.length).toBeGreaterThan(80);
      expect(longCategory?.description).toContain("em-dashes—like");

      const edgeProductType = introspectedData.productTypes.find(
        (pt: TestProductType) => pt.name === "Edge Case Product Type"
      );
      expect(edgeProductType).toBeDefined();

      const specialAttribute = edgeProductType?.productAttributes.find(
        (attr: TestProductAttribute) => attr.slug === "attribute-with-special-chars"
      );
      expect(specialAttribute).toBeDefined();
      expect(specialAttribute?.name).toContain("Spëcial");

      const emojiValue = specialAttribute?.values?.find(
        (val: TestAttributeValue) => val.slug === "emoji-choice"
      );
      expect(emojiValue).toBeDefined();
      expect(emojiValue?.name).toContain("🎉");

      console.log("✅ Edge case round-trip test passed!");
    }, 300000);
  });
});
