import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CliRunner } from "../../utils/cli-runner.js";
import { getAdminToken, getTestConfig, waitForApi } from "../../utils/test-env.js";
import { cleanupTempDir, createTempDir, writeYaml } from "../../utils/test-helpers.js";

describe("E2E Error Presentation", () => {
  let cli: CliRunner;
  let apiUrl: string;
  let token: string;
  let testDir: string;

  beforeAll(async () => {
    console.log("🚀 Starting error presentation test setup...");

    testDir = await createTempDir("error-presentation-test-");

    const config = getTestConfig();
    apiUrl = config.apiUrl;
    await waitForApi(apiUrl);
    token = await getAdminToken(apiUrl, config.adminEmail, config.adminPassword);
    cli = new CliRunner({ verbose: process.env.VERBOSE === "true" });

    console.log("✅ Error presentation test setup complete");
  }, 60000);

  afterAll(async () => {
    await cleanupTempDir(testDir);
  });

  describe("Authentication Error Messages", () => {
    it("should provide clear and actionable authentication error messages", async () => {
      const configPath = path.join(testDir, "auth-error-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Auth Error Test Store",
          defaultMailSenderAddress: "autherror@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      console.log("🔐 Testing authentication error message quality...");

      // Test with completely invalid token
      const invalidTokenResult = await cli.deploy(apiUrl, "totally-invalid-token", {
        config: configPath,
        timeout: 10000,
      });

      expect(invalidTokenResult).toHaveFailed();

      // Should contain clear error messaging
      expect(invalidTokenResult).toMatchPattern(/auth|permission|unauthorized|token/i);

      // Should NOT contain technical jargon or stack traces in the main error
      expect(invalidTokenResult.cleanStderr).not.toMatch(/Error:\s*Error:/); // No nested errors
      expect(invalidTokenResult.cleanStderr).not.toMatch(/at Object\./); // No stack traces
      expect(invalidTokenResult.cleanStderr).not.toMatch(/TypeError:|ReferenceError:/); // No technical errors

      // Should contain helpful suggestions (checking for recovery guide patterns)
      const output = invalidTokenResult.cleanStderr + invalidTokenResult.cleanStdout;
      const hasHelpfulContent =
        output.includes("token") ||
        output.includes("authentication") ||
        output.includes("permission") ||
        output.includes("unauthorized");

      expect(hasHelpfulContent).toBe(true);

      // Test with malformed token format
      const malformedTokenResult = await cli.deploy(apiUrl, "Bearer invalid-format-token", {
        config: configPath,
        timeout: 10000,
      });

      expect(malformedTokenResult).toHaveFailed();
      expect(malformedTokenResult).toMatchPattern(/auth|token|invalid|format/i);

      // Test with empty token
      const emptyTokenResult = await cli.deploy(apiUrl, "", {
        config: configPath,
        timeout: 10000,
      });

      expect(emptyTokenResult).toHaveFailed();
      expect(emptyTokenResult).toMatchPattern(/token|required|missing/i);
    }, 120000);
  });

  describe("Network Error Messages", () => {
    it("should provide clear network error messages with helpful suggestions", async () => {
      const configPath = path.join(testDir, "network-error-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Network Error Test Store",
          defaultMailSenderAddress: "networkerror@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      console.log("🌐 Testing network error message quality...");

      // Test connection refused (unreachable port)
      const connectionRefusedResult = await cli.deploy("http://localhost:99999/graphql/", token, {
        config: configPath,
        timeout: 5000,
      });

      expect(connectionRefusedResult).toHaveFailed();
      expect(connectionRefusedResult).toMatchPattern(/connect|network|refused|unreachable/i);

      // Should not contain raw technical stack traces
      expect(connectionRefusedResult.cleanStderr).not.toMatch(/at Object\./);
      expect(connectionRefusedResult.cleanStderr).not.toMatch(/node_modules/);

      // Test invalid hostname
      const invalidHostResult = await cli.deploy(
        "http://this-hostname-does-not-exist-12345.com/graphql/",
        token,
        {
          config: configPath,
          timeout: 5000,
        }
      );

      expect(invalidHostResult).toHaveFailed();
      expect(invalidHostResult).toMatchPattern(/network|host|resolve|connection/i);

      // Test invalid URL format
      const invalidUrlResult = await cli.deploy("not-a-valid-url", token, {
        config: configPath,
        timeout: 5000,
      });

      expect(invalidUrlResult).toHaveFailed();
      expect(invalidUrlResult).toMatchPattern(/url|invalid|format/i);
    }, 60000);
  });

  describe("Configuration Validation Error Messages", () => {
    it("should provide detailed validation errors with field-specific guidance", async () => {
      const configPath = path.join(testDir, "validation-error-config.yml");

      console.log("📋 Testing configuration validation error message quality...");

      // Test missing required fields
      const missingFieldsConfig = {
        shop: {
          // Missing defaultMailSenderName and defaultMailSenderAddress
          description: "Store with missing required fields",
        },
        channels: [
          {
            name: "Test Channel",
            // Missing slug, currencyCode, defaultCountry
          },
        ],
      };

      await writeYaml(configPath, missingFieldsConfig);

      const missingFieldsResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 10000,
      });

      expect(missingFieldsResult).toHaveFailed();
      expect(missingFieldsResult).toMatchPattern(/validation|required|missing|field/i);

      // Should mention specific fields that are missing
      const errorOutput = missingFieldsResult.cleanStderr + missingFieldsResult.cleanStdout;
      const mentionsSpecificFields =
        errorOutput.includes("defaultMailSenderName") ||
        errorOutput.includes("defaultMailSenderAddress") ||
        errorOutput.includes("slug") ||
        errorOutput.includes("currencyCode");

      expect(mentionsSpecificFields).toBe(true);

      // Test wrong data types
      const wrongTypesConfig = {
        shop: {
          defaultMailSenderName: "Wrong Types Store",
          defaultMailSenderAddress: "wrongtypes@test.com",
        },
        channels: "this-should-be-an-array", // Wrong type
        categories: [
          {
            name: "Test Category",
            slug: "test-category",
            description: 12345, // Should be string
          },
        ],
      };

      await writeYaml(configPath, wrongTypesConfig);

      const wrongTypesResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 10000,
      });

      expect(wrongTypesResult).toHaveFailed();
      expect(wrongTypesResult).toMatchPattern(/validation|type|array|string/i);

      // Should not show raw Zod error messages
      expect(wrongTypesResult.cleanStderr).not.toMatch(/ZodError|z\./);

      // Test invalid enum values
      const invalidEnumConfig = {
        shop: {
          defaultMailSenderName: "Invalid Enum Store",
          defaultMailSenderAddress: "invalidenum@test.com",
        },
        channels: [
          {
            name: "Test Channel",
            slug: "test-channel",
            currencyCode: "INVALID_CURRENCY", // Invalid currency code
            defaultCountry: "INVALID_COUNTRY", // Invalid country code
          },
        ],
      };

      await writeYaml(configPath, invalidEnumConfig);

      const invalidEnumResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 10000,
      });

      expect(invalidEnumResult).toHaveFailed();
      expect(invalidEnumResult).toMatchPattern(/validation|invalid|currency|country/i);
    }, 120000);
  });

  describe("Entity Reference Error Messages", () => {
    it("should provide helpful messages for missing entity references", async () => {
      const configPath = path.join(testDir, "reference-error-config.yml");

      console.log("🔗 Testing entity reference error message quality...");

      // Test missing parent category reference
      const missingParentConfig = {
        shop: {
          defaultMailSenderName: "Reference Error Store",
          defaultMailSenderAddress: "referenceerror@test.com",
        },
        channels: [
          {
            name: "Reference Test Channel",
            slug: "reference-test-channel",
            currencyCode: "USD",
            defaultCountry: "US",
          },
        ],
        categories: [
          {
            name: "Child Category",
            slug: "child-category",
            description: "Child category without parent",
            parent: "non-existent-parent", // References non-existent parent
          },
        ],
      };

      await writeYaml(configPath, missingParentConfig);

      const missingParentResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 15000,
      });

      expect(missingParentResult).toHaveFailed();

      // Should mention the specific missing entity
      const errorOutput = missingParentResult.cleanStderr + missingParentResult.cleanStdout;
      const mentionsParent =
        errorOutput.includes("non-existent-parent") ||
        errorOutput.includes("parent") ||
        errorOutput.includes("not found") ||
        errorOutput.includes("reference");

      expect(mentionsParent).toBe(true);

      // Should provide actionable guidance
      expect(missingParentResult).toMatchPattern(/category|parent|reference|not found|exist/i);

      // Test missing product type reference (if products were supported)
      const missingProductTypeConfig = {
        shop: {
          defaultMailSenderName: "Product Type Error Store",
          defaultMailSenderAddress: "producttypeerror@test.com",
        },
        channels: [
          {
            name: "Product Test Channel",
            slug: "product-test-channel",
            currencyCode: "USD",
            defaultCountry: "US",
          },
        ],
        productTypes: [
          {
            name: "Referenced Product Type",
            slug: "referenced-product-type",
            hasVariants: false,
            productAttributes: [
              {
                name: "Test Reference Attribute",
                slug: "test-reference-attribute",
                type: "PRODUCT_REFERENCE",
                inputType: "DROPDOWN",
                // This would reference a non-existent product type in a real scenario
              },
            ],
          },
        ],
      };

      await writeYaml(configPath, missingProductTypeConfig);

      const productTypeResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 15000,
      });

      // This might succeed since we're not actually referencing missing entities
      // but if it fails, it should provide clear messaging
      if (productTypeResult.exitCode !== 0) {
        expect(productTypeResult).toMatchPattern(/reference|type|attribute|not found/i);
      }
    }, 60000);
  });

  describe("Permission Error Messages", () => {
    it("should provide clear permission-related error messages", async () => {
      const configPath = path.join(testDir, "permission-error-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Permission Test Store",
          defaultMailSenderAddress: "permission@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      console.log("🔒 Testing permission error message quality...");

      // Test with a token that might have limited permissions
      // (In a real scenario, this would be a token with read-only access)
      const limitedPermissionResult = await cli.deploy(apiUrl, "fake-limited-token", {
        config: configPath,
        timeout: 10000,
      });

      expect(limitedPermissionResult).toHaveFailed();

      // Should provide clear permission-related messaging
      expect(limitedPermissionResult).toMatchPattern(
        /permission|access|denied|unauthorized|forbidden/i
      );

      // Should not expose sensitive token details
      expect(limitedPermissionResult.cleanStderr).not.toMatch(/fake-limited-token/);

      // Should suggest checking permissions or token validity
      const errorOutput = limitedPermissionResult.cleanStderr + limitedPermissionResult.cleanStdout;
      const hasSuggestions =
        errorOutput.includes("permission") ||
        errorOutput.includes("access") ||
        errorOutput.includes("token") ||
        errorOutput.includes("auth");

      expect(hasSuggestions).toBe(true);
    }, 60000);
  });

  describe("Timeout Error Messages", () => {
    it("should provide clear timeout error messages", async () => {
      const configPath = path.join(testDir, "timeout-error-config.yml");

      const config = {
        shop: {
          defaultMailSenderName: "Timeout Test Store",
          defaultMailSenderAddress: "timeout@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, config);

      console.log("⏰ Testing timeout error message quality...");

      // Test with very short timeout to force timeout error
      const timeoutResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 100, // Very short timeout to trigger timeout
      });

      expect(timeoutResult).toHaveFailed();

      // Should mention timeout clearly
      expect(timeoutResult).toMatchPattern(/timeout|time.*out|timed.*out/i);

      // Should not show technical timeout implementation details
      expect(timeoutResult.cleanStderr).not.toMatch(/SIGTERM|killTimeout/);

      // Should provide actionable guidance about increasing timeout or checking network
      const errorOutput = timeoutResult.cleanStderr + timeoutResult.cleanStdout;
      const hasGuidance =
        errorOutput.includes("timeout") ||
        errorOutput.includes("network") ||
        errorOutput.includes("slow") ||
        errorOutput.includes("connection");

      expect(hasGuidance).toBe(true);
    }, 30000);
  });

  describe("File System Error Messages", () => {
    it("should provide clear file system error messages", async () => {
      console.log("📁 Testing file system error message quality...");

      // Test with non-existent file
      const nonExistentResult = await cli.deploy(apiUrl, token, {
        config: "/path/that/does/not/exist/config.yml",
        timeout: 5000,
      });

      expect(nonExistentResult).toHaveFailed();
      expect(nonExistentResult).toMatchPattern(/file.*not.*found|no such file|does not exist/i);

      // Should mention the specific file path that's missing
      expect(nonExistentResult).toContainInOutput("/path/that/does/not/exist/config.yml");

      // Should not show technical file system error codes in user-facing message
      expect(nonExistentResult.cleanStderr).not.toMatch(/ENOENT.*at/);

      // Test introspect with invalid output directory
      const invalidDirResult = await cli.introspect(apiUrl, token, {
        config: "/invalid/directory/that/cannot/be/created/config.yml",
        timeout: 5000,
      });

      expect(invalidDirResult).toHaveFailed();
      expect(invalidDirResult).toMatchPattern(/directory|path|permission|cannot.*create/i);
    }, 30000);
  });

  describe("GraphQL Error Message Formatting", () => {
    it("should format GraphQL errors in a user-friendly way", async () => {
      const configPath = path.join(testDir, "graphql-error-config.yml");

      console.log("🔧 Testing GraphQL error message formatting...");

      // Test with configuration that might trigger GraphQL validation errors
      const invalidGraphQLConfig = {
        shop: {
          defaultMailSenderName: "GraphQL Error Store",
          defaultMailSenderAddress: "graphqlerror@test.com",
        },
        channels: [
          {
            name: "GraphQL Test Channel",
            slug: "graphql-test-channel",
            currencyCode: "USD",
            defaultCountry: "US",
          },
        ],
        categories: [
          {
            name: "A".repeat(300), // Very long name that might trigger validation error
            slug: "very-long-category-name",
            description: "Category with extremely long name",
          },
        ],
      };

      await writeYaml(configPath, invalidGraphQLConfig);

      const graphqlErrorResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 15000,
      });

      // This might succeed depending on Saleor's validation rules
      if (graphqlErrorResult.exitCode !== 0) {
        // Should not show raw GraphQL error structures
        expect(graphqlErrorResult.cleanStderr).not.toMatch(/\{"errors":\[/);
        expect(graphqlErrorResult.cleanStderr).not.toMatch(/"extensions":/);
        expect(graphqlErrorResult.cleanStderr).not.toMatch(/"locations":/);

        // Should provide human-readable error messages
        expect(graphqlErrorResult).toMatchPattern(/validation|invalid|too long|limit/i);
      }
    }, 60000);
  });

  describe("Entity-Specific Error Messages", () => {
    it("should provide clear error messages for shop configuration errors", async () => {
      const configPath = path.join(testDir, "shop-error-config.yml");

      console.log("🏪 Testing shop configuration error messages...");

      // Invalid shop configuration
      const invalidShopConfig = {
        shop: {
          defaultMailSenderName: "Shop Error Test",
          defaultMailSenderAddress: "not-an-email", // Invalid email format
          reserveStockDurationAnonymousUser: -10, // Invalid negative value
          limitQuantityPerCheckout: 0, // Invalid zero value
          defaultDigitalMaxDownloads: -5, // Invalid negative value
        },
        channels: [],
      };

      await writeYaml(configPath, invalidShopConfig);

      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 10000,
      });

      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/shop|email|invalid|negative|value/i);
    }, 60000);

    it("should provide clear error messages for tax configuration errors", async () => {
      const configPath = path.join(testDir, "tax-error-config.yml");

      console.log("💰 Testing tax configuration error messages...");

      // Invalid tax configuration
      const invalidTaxConfig = {
        shop: {
          defaultMailSenderName: "Tax Error Test",
          defaultMailSenderAddress: "tax@test.com",
        },
        channels: [
          {
            name: "Tax Test Channel",
            slug: "tax-test",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
        ],
        taxConfigurations: [
          {
            channel: "tax-test",
            chargeTaxesOnShipping: true,
            displayGrossPrices: true,
            pricesEnteredWithTax: true,
            countryExceptions: [
              {
                country: "INVALID_COUNTRY", // Invalid country code
                chargeTaxes: true,
                taxCalculationStrategy: "INVALID_STRATEGY", // Invalid strategy
                displayGrossPrices: true,
              },
            ],
          },
        ],
      };

      await writeYaml(configPath, invalidTaxConfig);

      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 10000,
      });

      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/tax|country|strategy|invalid/i);
    }, 60000);

    it("should provide clear error messages for warehouse configuration errors", async () => {
      const configPath = path.join(testDir, "warehouse-error-config.yml");

      console.log("📦 Testing warehouse configuration error messages...");

      // Invalid warehouse configuration
      const invalidWarehouseConfig = {
        shop: {
          defaultMailSenderName: "Warehouse Error Test",
          defaultMailSenderAddress: "warehouse@test.com",
        },
        channels: [
          {
            name: "Warehouse Test Channel",
            slug: "warehouse-test",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
        ],
        warehouses: [
          {
            name: "Invalid Warehouse",
            slug: "invalid-warehouse",
            email: "not-an-email-format", // Invalid email
            isPrivate: "yes", // Should be boolean
            address: {
              streetAddress1: "", // Empty required field
              city: "", // Empty required field
              country: "INVALID", // Invalid country code
              postalCode: "12345",
            },
            clickAndCollectOption: "INVALID_OPTION", // Invalid enum value
            shippingZones: ["non-existent-zone"], // Reference to non-existent zone
          },
        ],
      };

      await writeYaml(configPath, invalidWarehouseConfig);

      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 10000,
      });

      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/warehouse|email|address|country|boolean/i);
    }, 60000);

    it("should provide clear error messages for shipping zone errors", async () => {
      const configPath = path.join(testDir, "shipping-error-config.yml");

      console.log("🚚 Testing shipping zone error messages...");

      // Invalid shipping zone configuration
      const invalidShippingConfig = {
        shop: {
          defaultMailSenderName: "Shipping Error Test",
          defaultMailSenderAddress: "shipping@test.com",
        },
        channels: [
          {
            name: "Shipping Test Channel",
            slug: "shipping-test",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
        ],
        warehouses: [
          {
            name: "Test Warehouse",
            slug: "test-warehouse",
            email: "warehouse@test.com",
            isPrivate: false,
            address: {
              streetAddress1: "123 Test St",
              city: "Test City",
              country: "US",
              postalCode: "12345",
            },
            clickAndCollectOption: "DISABLED",
          },
        ],
        shippingZones: [
          {
            name: "Invalid Shipping Zone",
            description: "Zone with errors",
            default: "yes", // Should be boolean
            countries: ["INVALID_COUNTRY", "XX"], // Invalid country codes
            warehouses: ["non-existent-warehouse"], // Non-existent warehouse
            channels: ["non-existent-channel"], // Non-existent channel
            shippingMethods: [
              {
                name: "Invalid Method",
                type: "INVALID_TYPE", // Invalid shipping type
                taxClass: "non-existent-tax-class", // Non-existent tax class
                channelListings: [
                  {
                    channel: "shipping-test",
                    price: -10, // Negative price
                    minimumOrderPrice: -5, // Negative minimum
                    maximumOrderPrice: -20, // Negative maximum, also less than minimum
                  },
                ],
              },
            ],
          },
        ],
      };

      await writeYaml(configPath, invalidShippingConfig);

      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 10000,
      });

      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/shipping|country|warehouse|price|boolean/i);
    }, 60000);

    it("should provide clear error messages for product type attribute errors", async () => {
      const configPath = path.join(testDir, "product-type-error-config.yml");

      console.log("📋 Testing product type attribute error messages...");

      // Invalid product type configuration
      const invalidProductTypeConfig = {
        shop: {
          defaultMailSenderName: "Product Type Error Test",
          defaultMailSenderAddress: "producttype@test.com",
        },
        channels: [
          {
            name: "Product Type Test Channel",
            slug: "product-type-test",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
        ],
        productTypes: [
          {
            name: "Invalid Product Type",
            isShippingRequired: "yes", // Should be boolean
            productAttributes: [
              {
                name: "Invalid Attribute",
                slug: "invalid attribute with spaces", // Invalid slug format
                type: "INVALID_TYPE", // Invalid attribute type
                inputType: "INVALID_INPUT", // Invalid input type
                valueRequired: "always", // Should be boolean
                visibleInStorefront: 123, // Should be boolean
                filterableInStorefront: "yes", // Should be boolean
                filterableInDashboard: null, // Should be boolean
                unit: "INVALID_UNIT", // Invalid unit type
                values: "not-an-array", // Should be array
              },
            ],
            variantAttributes: [
              {
                name: "Variant Attribute",
                slug: "variant-attr",
                type: "PRODUCT_TYPE",
                inputType: "REFERENCE",
                entityType: "INVALID_ENTITY", // Invalid entity type
                references: "not-an-array", // Should be array
              },
            ],
          },
        ],
      };

      await writeYaml(configPath, invalidProductTypeConfig);

      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 10000,
      });

      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/product.*type|attribute|slug|boolean|type|input/i);
    }, 60000);

    it("should provide clear error messages for page type errors", async () => {
      const configPath = path.join(testDir, "page-type-error-config.yml");

      console.log("📄 Testing page type error messages...");

      // Invalid page type configuration
      const invalidPageTypeConfig = {
        shop: {
          defaultMailSenderName: "Page Type Error Test",
          defaultMailSenderAddress: "pagetype@test.com",
        },
        channels: [
          {
            name: "Page Type Test Channel",
            slug: "page-type-test",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
        ],
        pageTypes: [
          {
            name: "", // Empty name
            attributes: [
              {
                name: "Page Attribute",
                slug: "", // Empty slug
                type: "RICH_TEXT",
                inputType: null, // Null input type
                valueRequired: "sometimes", // Invalid boolean value
                visibleInStorefront: "public", // Invalid boolean value
                availableInGrid: 1, // Should be boolean
                storefrontSearchPosition: "top", // Should be number
              },
            ],
          },
        ],
      };

      await writeYaml(configPath, invalidPageTypeConfig);

      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 10000,
      });

      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/page.*type|name|slug|attribute|boolean|required/i);
    }, 60000);

    it("should provide clear error messages for category hierarchy errors", async () => {
      const configPath = path.join(testDir, "category-error-config.yml");

      console.log("🗂️ Testing category hierarchy error messages...");

      // Invalid category configuration
      const invalidCategoryConfig = {
        shop: {
          defaultMailSenderName: "Category Error Test",
          defaultMailSenderAddress: "category@test.com",
        },
        channels: [
          {
            name: "Category Test Channel",
            slug: "category-test",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
        ],
        categories: [
          {
            name: "Parent Category",
            slug: "parent", // Duplicate slug
            description: "First parent",
          },
          {
            name: "Another Parent",
            slug: "parent", // Duplicate slug - should trigger error
            description: "Second parent with same slug",
          },
          {
            name: "Child Category",
            slug: "child",
            parent: "non-existent-parent", // Reference to non-existent parent
            subcategories: "not-an-array", // Should be array
          },
          {
            name: "", // Empty name
            slug: "", // Empty slug
            description: 123, // Should be string
            subcategories: [
              {
                name: "Nested Child",
                slug: "nested child with spaces", // Invalid slug format
                parent: "circular-reference", // Potential circular reference
              },
            ],
          },
        ],
      };

      await writeYaml(configPath, invalidCategoryConfig);

      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 10000,
      });

      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/category|duplicate|slug|parent|name|required/i);
    }, 60000);

    it("should provide clear error messages for channel configuration errors", async () => {
      const configPath = path.join(testDir, "channel-error-config.yml");

      console.log("📡 Testing channel configuration error messages...");

      // Invalid channel configuration
      const invalidChannelConfig = {
        shop: {
          defaultMailSenderName: "Channel Error Test",
          defaultMailSenderAddress: "channel@test.com",
        },
        channels: [
          {
            name: "Invalid Channel",
            slug: "channel-1", // Duplicate slug
            currencyCode: "INVALID_CURRENCY", // Invalid currency
            defaultCountry: "XX", // Invalid country
            isActive: "true", // Should be boolean, not string
          },
          {
            name: "Another Channel",
            slug: "channel-1", // Duplicate slug - should trigger error
            currencyCode: "", // Empty currency
            defaultCountry: "", // Empty country
            isActive: null, // Null boolean
          },
          {
            name: "", // Empty name
            slug: "", // Empty slug
            currencyCode: 123, // Should be string
            defaultCountry: true, // Should be string
            isActive: "yes", // Invalid boolean string
            settings: "not-an-object", // Should be object if present
          },
        ],
      };

      await writeYaml(configPath, invalidChannelConfig);

      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 10000,
      });

      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/channel|duplicate|slug|currency|country|boolean/i);
    }, 60000);
  });

  describe("Complex Entity Relationship Error Messages", () => {
    it("should provide clear error messages for complex entity relationships", async () => {
      const configPath = path.join(testDir, "complex-relationship-error-config.yml");

      console.log("🔗 Testing complex entity relationship error messages...");

      // Complex configuration with multiple relationship errors
      const complexErrorConfig = {
        shop: {
          defaultMailSenderName: "Complex Error Test",
          defaultMailSenderAddress: "complex@test.com",
        },
        channels: [
          {
            name: "Test Channel",
            slug: "test-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
        ],
        warehouses: [
          {
            name: "Test Warehouse",
            slug: "test-warehouse",
            email: "warehouse@test.com",
            isPrivate: false,
            address: {
              streetAddress1: "123 Test St",
              city: "Test City",
              country: "US",
              postalCode: "12345",
            },
            clickAndCollectOption: "DISABLED",
            shippingZones: ["zone-1"], // References zone defined below
          },
        ],
        shippingZones: [
          {
            name: "Zone 1",
            slug: "zone-1",
            default: false,
            countries: ["US"],
            warehouses: ["non-existent-warehouse"], // References non-existent warehouse
            channels: ["non-existent-channel"], // References non-existent channel
            shippingMethods: [
              {
                name: "Standard Shipping",
                type: "PRICE",
                channelListings: [
                  {
                    channel: "another-non-existent-channel", // Another non-existent channel
                    price: 10,
                  },
                ],
              },
            ],
          },
        ],
        categories: [
          {
            name: "Parent",
            slug: "parent",
            subcategories: [
              {
                name: "Child",
                slug: "child",
                parent: "wrong-parent", // Inconsistent parent reference
              },
            ],
          },
        ],
        productTypes: [
          {
            name: "Type with References",
            isShippingRequired: true,
            productAttributes: [
              {
                name: "Category Reference",
                slug: "cat-ref",
                type: "REFERENCE",
                inputType: "DROPDOWN",
                entityType: "PRODUCT",
                references: ["non-existent-product-type"], // Non-existent product type
              },
            ],
          },
        ],
      };

      await writeYaml(configPath, complexErrorConfig);

      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 15000,
      });

      expect(result).toHaveFailed();

      // Should mention multiple relationship issues
      const errorOutput = result.cleanStderr + result.cleanStdout;
      const mentionsRelationshipIssues =
        errorOutput.includes("warehouse") ||
        errorOutput.includes("channel") ||
        errorOutput.includes("reference") ||
        errorOutput.includes("not found") ||
        errorOutput.includes("exist");

      expect(mentionsRelationshipIssues).toBe(true);
    }, 60000);
  });

  describe("Exit Code Consistency", () => {
    it("should use consistent exit codes for different error types", async () => {
      const configPath = path.join(testDir, "exit-code-config.yml");

      const validConfig = {
        shop: {
          defaultMailSenderName: "Exit Code Store",
          defaultMailSenderAddress: "exitcode@test.com",
        },
        channels: [],
      };

      await writeYaml(configPath, validConfig);

      console.log("🚪 Testing exit code consistency...");

      // Authentication error should have consistent exit code
      const authError = await cli.deploy(apiUrl, "invalid-token", {
        config: configPath,
        timeout: 5000,
      });

      expect(authError).toHaveFailed();
      expect(authError.exitCode).toBeGreaterThan(0);
      expect(authError.exitCode).toBeLessThan(128); // Should not be signal-based exit code

      // Network error should have consistent exit code
      const networkError = await cli.deploy("http://localhost:99999/graphql/", token, {
        config: configPath,
        timeout: 5000,
      });

      expect(networkError).toHaveFailed();
      expect(networkError.exitCode).toBeGreaterThan(0);
      expect(networkError.exitCode).toBeLessThan(128);

      // File not found should have consistent exit code
      const fileError = await cli.deploy(apiUrl, token, {
        config: "/nonexistent/config.yml",
        timeout: 5000,
      });

      expect(fileError).toHaveFailed();
      expect(fileError.exitCode).toBeGreaterThan(0);
      expect(fileError.exitCode).toBeLessThan(128);

      // All different error types should use non-zero exit codes
      expect(authError.exitCode).toBeGreaterThan(0);
      expect(networkError.exitCode).toBeGreaterThan(0);
      expect(fileError.exitCode).toBeGreaterThan(0);
    }, 60000);
  });
});
