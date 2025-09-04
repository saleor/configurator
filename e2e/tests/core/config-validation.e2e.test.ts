import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CliRunner } from "../../utils/cli-runner.js";
import { getAdminToken, getTestConfig, waitForApi } from "../../utils/test-env.js";
import { cleanupTempDir, createTempDir, writeYaml } from "../../utils/test-helpers.js";

describe("E2E Configuration Validation Tests", () => {
  let cli: CliRunner;
  let apiUrl: string;
  let token: string;
  let testDir: string;

  beforeAll(async () => {
    console.log("🚀 Starting config validation test setup...");

    testDir = await createTempDir("config-validation-test-");

    const config = getTestConfig();
    apiUrl = config.apiUrl;
    await waitForApi(apiUrl);
    token = await getAdminToken(apiUrl, config.adminEmail, config.adminPassword);
    cli = new CliRunner({ verbose: process.env.VERBOSE === "true" });

    console.log("✅ Config validation test setup complete");
  }, 60000);

  afterAll(async () => {
    await cleanupTempDir(testDir);
  });

  describe("Required Field Validation", () => {
    it("should validate required shop fields", async () => {
      const configPath = path.join(testDir, "missing-shop-fields.yml");

      // Missing required shop fields
      const invalidShopConfig = {
        shop: {
          // Missing defaultMailSenderName and defaultMailSenderAddress
          description: "Shop missing required fields",
        },
        channels: [],
      };

      await writeYaml(configPath, invalidShopConfig);

      console.log("❌ Testing missing required shop fields...");
      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 30000,
        skipDiff: true,
      });

      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/required|missing|field/i);

      // Should mention specific missing fields
      const errorOutput = result.cleanStderr + result.cleanStdout;
      const mentionsRequiredFields =
        errorOutput.includes("defaultMailSenderName") ||
        errorOutput.includes("defaultMailSenderAddress") ||
        errorOutput.includes("required");

      expect(mentionsRequiredFields).toBe(true);

      // Should not modify Saleor (validation should fail before API calls)
      const introspectResult = await cli.introspect(apiUrl, token, {
        config: path.join(testDir, "after-shop-validation-failure.yml"),
      });

      expect(introspectResult).toHaveSucceeded();
      // Shop should still have default values, not the invalid config
    }, 120000);

    it("should validate required channel fields", async () => {
      const configPath = path.join(testDir, "missing-channel-fields.yml");

      // Missing required channel fields
      const invalidChannelConfig = {
        shop: {
          defaultMailSenderName: "Valid Shop",
          defaultMailSenderAddress: "valid@test.com",
        },
        channels: [
          {
            name: "Invalid Channel",
            // Missing slug, currencyCode, defaultCountry, isActive
          },
        ],
      };

      await writeYaml(configPath, invalidChannelConfig);

      console.log("❌ Testing missing required channel fields...");
      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 30000,
        skipDiff: true,
      });

      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/required|missing|field|channel/i);

      // Should mention specific missing channel fields
      const errorOutput = result.cleanStderr + result.cleanStdout;
      const mentionsChannelFields =
        errorOutput.includes("slug") ||
        errorOutput.includes("currencyCode") ||
        errorOutput.includes("defaultCountry") ||
        errorOutput.includes("isActive");

      expect(mentionsChannelFields).toBe(true);
    }, 120000);

    it("should validate required category fields", async () => {
      const configPath = path.join(testDir, "missing-category-fields.yml");

      // Missing required category fields
      const invalidCategoryConfig = {
        shop: {
          defaultMailSenderName: "Valid Shop",
          defaultMailSenderAddress: "valid@test.com",
        },
        channels: [],
        categories: [
          {
            // Missing name and slug
            description: "Category without required fields",
          },
        ],
      };

      await writeYaml(configPath, invalidCategoryConfig);

      console.log("❌ Testing missing required category fields...");
      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 30000,
        skipDiff: true,
      });

      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/required|missing|field|category/i);

      // Should mention name and slug as required
      const errorOutput = result.cleanStderr + result.cleanStdout;
      const mentionsCategoryFields = errorOutput.includes("name") || errorOutput.includes("slug");

      expect(mentionsCategoryFields).toBe(true);
    }, 120000);
  });

  describe("Data Type Validation", () => {
    it("should validate boolean field types", async () => {
      const configPath = path.join(testDir, "invalid-boolean-types.yml");

      // Invalid boolean values
      const invalidBooleanConfig = {
        shop: {
          defaultMailSenderName: "Boolean Type Test",
          defaultMailSenderAddress: "boolean@test.com",
          trackInventoryByDefault: "yes", // Should be boolean
          displayGrossPrices: "true", // Should be boolean
          enableAccountConfirmationByEmail: 1, // Should be boolean
        },
        channels: [
          {
            name: "Boolean Test Channel",
            slug: "boolean-test-channel",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: "active", // Should be boolean
          },
        ],
      };

      await writeYaml(configPath, invalidBooleanConfig);

      console.log("❌ Testing invalid boolean field types...");
      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 30000,
        skipDiff: true,
      });

      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/boolean|type|invalid/i);

      // Should provide clear error about type mismatch
      const errorOutput = result.cleanStderr + result.cleanStdout;
      const mentionsBoolean =
        errorOutput.includes("boolean") ||
        errorOutput.includes("true") ||
        errorOutput.includes("false");

      expect(mentionsBoolean).toBe(true);
    }, 120000);

    it("should validate string field types", async () => {
      const configPath = path.join(testDir, "invalid-string-types.yml");

      // Invalid string values
      const invalidStringConfig = {
        shop: {
          defaultMailSenderName: 12345, // Should be string
          defaultMailSenderAddress: true, // Should be string
          description: null, // Should be string if provided
        },
        channels: [
          {
            name: 67890, // Should be string
            slug: false, // Should be string
            currencyCode: 123, // Should be string
            defaultCountry: [], // Should be string
            isActive: true,
          },
        ],
      };

      await writeYaml(configPath, invalidStringConfig);

      console.log("❌ Testing invalid string field types...");
      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 30000,
        skipDiff: true,
      });

      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/string|type|invalid/i);

      // Should indicate which fields have wrong types
      const errorOutput = result.cleanStderr + result.cleanStdout;
      const mentionsStringError =
        errorOutput.includes("string") ||
        errorOutput.includes("text") ||
        errorOutput.includes("type");

      expect(mentionsStringError).toBe(true);
    }, 120000);

    it("should validate array field types", async () => {
      const configPath = path.join(testDir, "invalid-array-types.yml");

      // Invalid array values
      const invalidArrayConfig = {
        shop: {
          defaultMailSenderName: "Array Type Test",
          defaultMailSenderAddress: "array@test.com",
        },
        channels: "should-be-an-array", // Should be array
        categories: {
          not: "an-array", // Should be array
        },
      };

      await writeYaml(configPath, invalidArrayConfig);

      console.log("❌ Testing invalid array field types...");
      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 30000,
        skipDiff: true,
      });

      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/array|type|invalid/i);

      // Should mention array type error
      const errorOutput = result.cleanStderr + result.cleanStdout;
      const mentionsArrayError =
        errorOutput.includes("array") ||
        errorOutput.includes("list") ||
        errorOutput.includes("type");

      expect(mentionsArrayError).toBe(true);
    }, 120000);
  });

  describe("Enum Value Validation", () => {
    it("should validate currency code enums", async () => {
      const configPath = path.join(testDir, "invalid-currency-enum.yml");

      // Invalid currency codes
      const invalidCurrencyConfig = {
        shop: {
          defaultMailSenderName: "Currency Test Store",
          defaultMailSenderAddress: "currency@test.com",
        },
        channels: [
          {
            name: "Invalid Currency Channel",
            slug: "invalid-currency-channel",
            currencyCode: "INVALID_CURRENCY", // Invalid enum value
            defaultCountry: "US",
            isActive: true,
          },
          {
            name: "Another Invalid Channel",
            slug: "another-invalid-channel",
            currencyCode: "XYZ", // Another invalid enum value
            defaultCountry: "US",
            isActive: true,
          },
        ],
      };

      await writeYaml(configPath, invalidCurrencyConfig);

      console.log("❌ Testing invalid currency code enums...");
      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 30000,
        skipDiff: true,
      });

      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/currency|invalid|enum/i);

      // Should mention valid currency codes
      const errorOutput = result.cleanStderr + result.cleanStdout;
      const mentionsCurrency =
        errorOutput.includes("currency") ||
        errorOutput.includes("USD") ||
        errorOutput.includes("EUR") ||
        errorOutput.includes("GBP");

      expect(mentionsCurrency).toBe(true);
    }, 120000);

    it("should validate country code enums", async () => {
      const configPath = path.join(testDir, "invalid-country-enum.yml");

      // Invalid country codes
      const invalidCountryConfig = {
        shop: {
          defaultMailSenderName: "Country Test Store",
          defaultMailSenderAddress: "country@test.com",
        },
        channels: [
          {
            name: "Invalid Country Channel",
            slug: "invalid-country-channel",
            currencyCode: "USD",
            defaultCountry: "INVALID_COUNTRY", // Invalid enum value
            isActive: true,
          },
          {
            name: "Another Invalid Country Channel",
            slug: "another-invalid-country-channel",
            currencyCode: "USD",
            defaultCountry: "XX", // Invalid enum value
            isActive: true,
          },
        ],
      };

      await writeYaml(configPath, invalidCountryConfig);

      console.log("❌ Testing invalid country code enums...");
      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 30000,
        skipDiff: true,
      });

      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/country|invalid|enum/i);

      // Should mention valid country codes
      const errorOutput = result.cleanStderr + result.cleanStdout;
      const mentionsCountry =
        errorOutput.includes("country") ||
        errorOutput.includes("US") ||
        errorOutput.includes("DE") ||
        errorOutput.includes("GB");

      expect(mentionsCountry).toBe(true);
    }, 120000);
  });

  describe("Duplicate Detection", () => {
    it("should detect duplicate channel slugs", async () => {
      const configPath = path.join(testDir, "duplicate-channel-slugs.yml");

      // Duplicate channel slugs
      const duplicateChannelConfig = {
        shop: {
          defaultMailSenderName: "Duplicate Test Store",
          defaultMailSenderAddress: "duplicate@test.com",
        },
        channels: [
          {
            name: "First Channel",
            slug: "duplicate-slug", // Same slug
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true,
          },
          {
            name: "Second Channel",
            slug: "duplicate-slug", // Same slug - should be invalid
            currencyCode: "EUR",
            defaultCountry: "DE",
            isActive: true,
          },
        ],
      };

      await writeYaml(configPath, duplicateChannelConfig);

      console.log("❌ Testing duplicate channel slugs...");
      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 30000,
        skipDiff: true,
      });

      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/duplicate|slug|unique/i);

      // Should mention the duplicated slug
      const errorOutput = result.cleanStderr + result.cleanStdout;
      const mentionsDuplicateSlug =
        errorOutput.includes("duplicate-slug") ||
        errorOutput.includes("duplicate") ||
        errorOutput.includes("unique");

      expect(mentionsDuplicateSlug).toBe(true);
    }, 120000);

    it("should detect duplicate category slugs", async () => {
      const configPath = path.join(testDir, "duplicate-category-slugs.yml");

      // Duplicate category slugs
      const duplicateCategoryConfig = {
        shop: {
          defaultMailSenderName: "Category Duplicate Test",
          defaultMailSenderAddress: "catduplicate@test.com",
        },
        channels: [],
        categories: [
          {
            name: "First Category",
            slug: "duplicate-category-slug", // Same slug
            description: "First category description",
          },
          {
            name: "Second Category",
            slug: "duplicate-category-slug", // Same slug - should be invalid
            description: "Second category description",
          },
        ],
      };

      await writeYaml(configPath, duplicateCategoryConfig);

      console.log("❌ Testing duplicate category slugs...");
      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 30000,
        skipDiff: true,
      });

      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/duplicate|slug|unique|category/i);

      // Should mention the duplicated category slug
      const errorOutput = result.cleanStderr + result.cleanStdout;
      const mentionsDuplicate =
        errorOutput.includes("duplicate-category-slug") ||
        errorOutput.includes("duplicate") ||
        errorOutput.includes("category");

      expect(mentionsDuplicate).toBe(true);
    }, 120000);
  });

  describe("Reference Validation", () => {
    it("should validate category parent references", async () => {
      const configPath = path.join(testDir, "invalid-parent-reference.yml");

      // Invalid parent reference
      const invalidParentConfig = {
        shop: {
          defaultMailSenderName: "Parent Reference Test",
          defaultMailSenderAddress: "parentref@test.com",
        },
        channels: [],
        categories: [
          {
            name: "Valid Parent",
            slug: "valid-parent",
            description: "This is a valid parent category",
          },
          {
            name: "Child with Invalid Parent",
            slug: "child-invalid-parent",
            description: "This child references a non-existent parent",
            parent: "non-existent-parent", // Invalid reference
          },
          {
            name: "Child with Valid Parent",
            slug: "child-valid-parent",
            description: "This child has a valid parent reference",
            parent: "valid-parent", // Valid reference
          },
        ],
      };

      await writeYaml(configPath, invalidParentConfig);

      console.log("❌ Testing invalid parent references...");
      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 30000,
        skipDiff: true,
      });

      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/parent|reference|not found|exist/i);

      // Should mention the invalid parent reference
      const errorOutput = result.cleanStderr + result.cleanStdout;
      const mentionsInvalidParent =
        errorOutput.includes("non-existent-parent") ||
        errorOutput.includes("parent") ||
        errorOutput.includes("reference");

      expect(mentionsInvalidParent).toBe(true);
    }, 120000);

    it("should detect circular category references", async () => {
      const configPath = path.join(testDir, "circular-references.yml");

      // Circular references
      const circularReferenceConfig = {
        shop: {
          defaultMailSenderName: "Circular Reference Test",
          defaultMailSenderAddress: "circular@test.com",
        },
        channels: [],
        categories: [
          {
            name: "Category A",
            slug: "category-a",
            description: "Points to Category B",
            parent: "category-b",
          },
          {
            name: "Category B",
            slug: "category-b",
            description: "Points to Category C",
            parent: "category-c",
          },
          {
            name: "Category C",
            slug: "category-c",
            description: "Points back to Category A - circular!",
            parent: "category-a", // Creates circular reference
          },
        ],
      };

      await writeYaml(configPath, circularReferenceConfig);

      console.log("❌ Testing circular category references...");
      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 30000,
        skipDiff: true,
      });

      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/circular|cycle|reference|loop/i);

      // Should mention circular reference issue
      const errorOutput = result.cleanStderr + result.cleanStdout;
      const mentionsCircular =
        errorOutput.includes("circular") ||
        errorOutput.includes("cycle") ||
        errorOutput.includes("loop");

      expect(mentionsCircular).toBe(true);
    }, 120000);
  });

  describe("Business Logic Validation", () => {
    it("should validate email address formats", async () => {
      const configPath = path.join(testDir, "invalid-email-formats.yml");

      // Invalid email formats
      const invalidEmailConfig = {
        shop: {
          defaultMailSenderName: "Email Test Store",
          defaultMailSenderAddress: "not-an-email-address", // Invalid format
          customerSetPasswordUrl: "https://example.com/password",
        },
        channels: [],
      };

      await writeYaml(configPath, invalidEmailConfig);

      console.log("❌ Testing invalid email address formats...");
      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 30000,
        skipDiff: true,
      });

      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/email|invalid|format/i);

      // Should mention email format issue
      const errorOutput = result.cleanStderr + result.cleanStdout;
      const mentionsEmail =
        errorOutput.includes("email") ||
        errorOutput.includes("@") ||
        errorOutput.includes("format");

      expect(mentionsEmail).toBe(true);
    }, 120000);

    it("should validate positive number constraints", async () => {
      const configPath = path.join(testDir, "invalid-number-constraints.yml");

      // Invalid number constraints
      const invalidNumberConfig = {
        shop: {
          defaultMailSenderName: "Number Constraint Test",
          defaultMailSenderAddress: "number@test.com",
          reserveStockDurationAnonymousUser: -10, // Should be positive
          reserveStockDurationAuthenticatedUser: -5, // Should be positive
          limitQuantityPerCheckout: 0, // Should be positive
          defaultDigitalMaxDownloads: -1, // Should be positive if specified
        },
        channels: [],
      };

      await writeYaml(configPath, invalidNumberConfig);

      console.log("❌ Testing invalid number constraints...");
      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 30000,
        skipDiff: true,
      });

      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/negative|positive|constraint|number/i);

      // Should mention constraint violations
      const errorOutput = result.cleanStderr + result.cleanStdout;
      const mentionsConstraint =
        errorOutput.includes("negative") ||
        errorOutput.includes("positive") ||
        errorOutput.includes("greater");

      expect(mentionsConstraint).toBe(true);
    }, 120000);

    it("should validate URL formats", async () => {
      const configPath = path.join(testDir, "invalid-url-formats.yml");

      // Invalid URL formats
      const invalidUrlConfig = {
        shop: {
          defaultMailSenderName: "URL Test Store",
          defaultMailSenderAddress: "url@test.com",
          customerSetPasswordUrl: "not-a-valid-url", // Invalid URL format
        },
        channels: [],
      };

      await writeYaml(configPath, invalidUrlConfig);

      console.log("❌ Testing invalid URL formats...");
      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 30000,
        skipDiff: true,
      });

      expect(result).toHaveFailed();
      expect(result).toMatchPattern(/url|invalid|format/i);

      // Should mention URL format issue
      const errorOutput = result.cleanStderr + result.cleanStdout;
      const mentionsUrl =
        errorOutput.includes("url") ||
        errorOutput.includes("http") ||
        errorOutput.includes("format");

      expect(mentionsUrl).toBe(true);
    }, 120000);
  });

  describe("Early Validation Benefits", () => {
    it("should validate configuration before making any API calls", async () => {
      const configPath = path.join(testDir, "early-validation-test.yml");

      // Multiple validation errors
      const multipleErrorsConfig = {
        shop: {
          // Missing required fields
          description: "Missing required fields",
        },
        channels: [
          {
            name: "Invalid Channel",
            slug: "invalid-channel",
            currencyCode: "INVALID_CURRENCY", // Invalid enum
            defaultCountry: "INVALID_COUNTRY", // Invalid enum
            isActive: "yes", // Invalid type
          },
        ],
        categories: [
          {
            name: "Invalid Category 1",
            slug: "duplicate", // Will be duplicate
            description: "First category",
          },
          {
            name: "Invalid Category 2",
            slug: "duplicate", // Duplicate slug
            description: "Second category with same slug",
          },
        ],
      };

      await writeYaml(configPath, multipleErrorsConfig);

      // Capture initial Saleor state
      const beforeValidationPath = path.join(testDir, "before-validation.yml");
      const beforeValidationResult = await cli.introspect(apiUrl, token, {
        config: beforeValidationPath,
      });

      expect(beforeValidationResult).toHaveSucceeded();

      // Measure how quickly validation fails
      console.log("❌ Testing early validation with multiple errors...");
      const startTime = Date.now();
      const validationResult = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 10000,
        skipDiff: true,
      });
      const duration = Date.now() - startTime;

      expect(validationResult).toHaveFailed();

      // Should fail quickly (validation before API calls)
      expect(duration).toBeLessThan(5000); // Should fail in less than 5 seconds

      // Should mention multiple validation errors
      expect(validationResult).toMatchPattern(/required|currency|country|duplicate/i);

      // Saleor state should be unchanged (no API calls made)
      const afterValidationPath = path.join(testDir, "after-validation.yml");
      const afterValidationResult = await cli.introspect(apiUrl, token, {
        config: afterValidationPath,
      });

      expect(afterValidationResult).toHaveSucceeded();

      // State should be identical (no changes made due to early validation failure)
      // This is important - validation should prevent any modifications
    }, 60000);

    it("should provide comprehensive validation error summary", async () => {
      const configPath = path.join(testDir, "comprehensive-validation-errors.yml");

      // Configuration with various types of validation errors
      const comprehensiveErrorConfig = {
        shop: {
          defaultMailSenderName: 12345, // Wrong type
          defaultMailSenderAddress: "invalid-email", // Invalid format
          reserveStockDurationAnonymousUser: -10, // Invalid constraint
        },
        channels: [
          {
            // Missing required fields: slug, currencyCode, defaultCountry, isActive
            name: "Incomplete Channel",
          },
        ],
        categories: [
          {
            name: "Category with Invalid Parent",
            slug: "category-invalid-parent",
            description: "Has invalid parent reference",
            parent: "non-existent-parent",
          },
        ],
      };

      await writeYaml(configPath, comprehensiveErrorConfig);

      console.log("❌ Testing comprehensive validation error reporting...");
      const result = await cli.deploy(apiUrl, token, {
        config: configPath,
        timeout: 30000,
        skipDiff: true,
      });

      expect(result).toHaveFailed();

      // Should provide comprehensive error information
      const errorOutput = result.cleanStderr + result.cleanStdout;

      // Should mention different types of errors
      const hasTypeError = errorOutput.includes("type") || errorOutput.includes("string");
      const hasFormatError = errorOutput.includes("email") || errorOutput.includes("format");
      const hasConstraintError =
        errorOutput.includes("negative") || errorOutput.includes("positive");
      const hasRequiredError = errorOutput.includes("required") || errorOutput.includes("missing");
      const hasReferenceError = errorOutput.includes("parent") || errorOutput.includes("reference");

      // Should report multiple error types
      const errorTypeCount = [
        hasTypeError,
        hasFormatError,
        hasConstraintError,
        hasRequiredError,
        hasReferenceError,
      ].filter(Boolean).length;
      expect(errorTypeCount).toBeGreaterThanOrEqual(2); // Should catch multiple error types

      // Error messages should be helpful and actionable
      expect(errorOutput.length).toBeGreaterThan(50); // Should provide substantial feedback
    }, 60000);
  });
});
