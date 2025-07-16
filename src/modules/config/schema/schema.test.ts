import { describe, expect, it } from "vitest";
import {
  type ChannelCreateInput,
  type ChannelUpdateInput,
  type CountryCode,
  configSchema,
  type ProductTypeInput,
  type ShopInput,
} from "./schema";

describe("Schema Union Types", () => {
  describe("ProductType Schema", () => {
    it("should parse create input (name only)", () => {
      const createInput = {
        productTypes: [
          {
            name: "Book",
          },
        ],
      };

      const result = configSchema.parse(createInput);

      expect(result.productTypes).toHaveLength(1);
      expect(result.productTypes?.[0]).toEqual({
        name: "Book",
        isShippingRequired: false,
      });
      expect(result.productTypes?.[0] && "productAttributes" in result.productTypes[0]).toBe(false);
    });

    it("should parse update input (name + attributes)", () => {
      const updateInput = {
        productTypes: [
          {
            name: "Book",
            productAttributes: [
              {
                name: "Genre",
                inputType: "DROPDOWN",
                values: [{ name: "Fiction" }, { name: "Romance" }],
              },
            ],
          },
        ],
      };

      const result = configSchema.parse(updateInput);

      expect(result.productTypes).toHaveLength(1);
      expect(result.productTypes?.[0]).toEqual({
        name: "Book",
        isShippingRequired: false,
        productAttributes: [
          {
            name: "Genre",
            inputType: "DROPDOWN",
            values: [{ name: "Fiction" }, { name: "Romance" }],
          },
        ],
      });
      expect(result.productTypes?.[0] && "productAttributes" in result.productTypes[0]).toBe(true);
    });

    it("should prioritize update schema over create schema", () => {
      // This tests that the union order (update.or(create)) works correctly
      const ambiguousInput = {
        productTypes: [
          {
            name: "Book",
            productAttributes: [],
            isShippingRequired: false,
          },
        ],
      };

      const result = configSchema.parse(ambiguousInput);

      expect(result.productTypes?.[0]).toEqual({
        name: "Book",
        productAttributes: [],
        isShippingRequired: false,
      });
      expect(result.productTypes?.[0] && "productAttributes" in result.productTypes[0]).toBe(true);
    });
  });

  describe("Channel Schema", () => {
    it("should parse create input (minimal fields)", () => {
      const createInput = {
        channels: [
          {
            name: "Poland",
            currencyCode: "PLN",
            defaultCountry: "PL",
            slug: "poland",
          },
        ],
      };

      const result = configSchema.parse(createInput);

      expect(result.channels).toHaveLength(1);
      expect(result.channels?.[0]).toEqual({
        name: "Poland",
        currencyCode: "PLN",
        defaultCountry: "PL",
        slug: "poland",
        isActive: false,
      });
      expect(result.channels?.[0] && "settings" in result.channels[0]).toBe(false);
    });

    it("should parse update input (with settings)", () => {
      const updateInput = {
        channels: [
          {
            name: "Poland",
            currencyCode: "PLN",
            defaultCountry: "PL",
            slug: "poland",
            settings: {
              useLegacyErrorFlow: false,
              automaticallyCompleteFullyPaidCheckouts: true,
            },
          },
        ],
      };

      const result = configSchema.parse(updateInput);

      expect(result.channels?.[0]).toEqual({
        name: "Poland",
        currencyCode: "PLN",
        defaultCountry: "PL",
        slug: "poland",
        isActive: false,
        settings: {
          useLegacyErrorFlow: false,
          automaticallyCompleteFullyPaidCheckouts: true,
        },
      });
      expect(result.channels?.[0] && "settings" in result.channels[0]).toBe(true);
    });
  });

  describe("Shop Schema", () => {
    it("should parse create input (empty object)", () => {
      const createInput = {
        shop: {},
      };

      const result = configSchema.parse(createInput);

      expect(result.shop).toEqual({});
      expect(Object.keys(result.shop!)).toHaveLength(0);
    });

    it("should parse update input (with settings)", () => {
      const updateInput = {
        shop: {
          defaultMailSenderName: "Test Store",
          displayGrossPrices: true,
          trackInventoryByDefault: false,
        },
      };

      const result = configSchema.parse(updateInput);

      expect(result.shop).toEqual({
        defaultMailSenderName: "Test Store",
        displayGrossPrices: true,
        trackInventoryByDefault: false,
      });
    });
  });

  describe("PageType Schema", () => {
    it("should parse create input (name only)", () => {
      const createInput = {
        pageTypes: [
          {
            name: "Article",
          },
        ],
      };

      const result = configSchema.parse(createInput);

      expect(result.pageTypes).toHaveLength(1);
      expect(result.pageTypes?.[0]).toEqual({ name: "Article" });
      expect(result.pageTypes?.[0] && "productAttributes" in result.pageTypes[0]).toBe(false);
    });

    it("should parse update input (name + attributes)", () => {
      const updateInput = {
        pageTypes: [
          {
            name: "Article",

            attributes: [
              {
                name: "Author",
                inputType: "PLAIN_TEXT",
              },
            ],
          },
        ],
      };

      const result = configSchema.parse(updateInput);

      expect(result.pageTypes?.[0]).toEqual({
        name: "Article",
        attributes: [
          {
            name: "Author",
            inputType: "PLAIN_TEXT",
          },
        ],
      });
      expect(result.pageTypes?.[0] && "attributes" in result.pageTypes[0]).toBe(true);
    });
  });

  describe("Category Schema", () => {
    it("should parse create input (name only)", () => {
      const createInput = {
        categories: [
          {
            name: "Electronics",
          },
        ],
      };

      const result = configSchema.parse(createInput);

      expect(result.categories).toHaveLength(1);
      expect(result.categories?.[0]).toEqual({ name: "Electronics" });
      expect(result.categories?.[0] && "subcategories" in result.categories[0]).toBe(false);
    });

    it("should parse update input (name + subcategories)", () => {
      const updateInput = {
        categories: [
          {
            name: "Electronics",
            subcategories: [
              {
                name: "Phones",
              },
              {
                name: "Laptops",
                subcategories: [
                  {
                    name: "Gaming Laptops",
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = configSchema.parse(updateInput);

      expect(result.categories?.[0]).toEqual({
        name: "Electronics",
        subcategories: [
          {
            name: "Phones",
          },
          {
            name: "Laptops",
            subcategories: [
              {
                name: "Gaming Laptops",
              },
            ],
          },
        ],
      });
      expect(result.categories?.[0] && "subcategories" in result.categories[0]).toBe(true);
    });
  });

  describe("Type Inference", () => {
    it("should correctly infer create vs update types", () => {
      // This test ensures TypeScript types work correctly
      const createProductType: ProductTypeInput = {
        name: "Book",
        isShippingRequired: false,
      };

      const updateProductType: ProductTypeInput = {
        name: "Book",
        isShippingRequired: false,
        productAttributes: [
          {
            name: "Genre",
            inputType: "DROPDOWN",
            values: [{ name: "Fiction" }],
          },
        ],
        variantAttributes: [],
      };

      const createChannel: ChannelCreateInput = {
        name: "US",
        currencyCode: "USD",
        defaultCountry: "US",
        slug: "us",
      };

      const updateChannel: ChannelUpdateInput = {
        name: "US",
        currencyCode: "USD",
        defaultCountry: "US",
        slug: "us",
        isActive: false,
        settings: {
          useLegacyErrorFlow: false,
        },
      };

      const updateShop: ShopInput = {
        defaultMailSenderName: "Test Store",
      };

      // If these compile without TypeScript errors, the types are working correctly
      expect(createProductType.name).toBe("Book");
      expect(updateProductType.productAttributes).toHaveLength(1);
      expect(createChannel.name).toBe("US");
      expect(updateChannel.settings?.useLegacyErrorFlow).toBe(false);
      expect(updateShop.defaultMailSenderName).toBe("Test Store");
    });
  });

  describe("Schema Validation Errors", () => {
    it("should reject invalid country codes", () => {
      const invalidInput = {
        channels: [
          {
            name: "Test",
            currencyCode: "USD",
            defaultCountry: "INVALID", // Invalid country code
            slug: "test",
          },
        ],
      };

      expect(() => configSchema.parse(invalidInput)).toThrow();
    });

    it("should reject missing required fields", () => {
      const invalidInput = {
        channels: [
          {
            name: "Test",
            // Missing required fields: currencyCode, defaultCountry, slug
          },
        ],
      };

      expect(() => configSchema.parse(invalidInput)).toThrow();
    });

    it("should validate duplicate attribute references in product types", () => {
      const validInput = {
        productTypes: [
          {
            name: "Book",
            productAttributes: [
              {
                name: "Genre",
                inputType: "DROPDOWN",
                values: [{ name: "Fiction" }, { name: "Non-Fiction" }],
              },
              {
                attribute: "Genre", // Reference to existing attribute
              },
            ],
          },
        ],
      };

      // This should pass validation as it uses reference syntax
      const result = configSchema.parse(validInput);
      expect(result.productTypes).toHaveLength(1);
      expect(result.productTypes?.[0].productAttributes).toHaveLength(2);
      expect(result.productTypes?.[0].productAttributes?.[0]).toEqual({
        name: "Genre",
        inputType: "DROPDOWN",
        values: [{ name: "Fiction" }, { name: "Non-Fiction" }],
      });
      expect(result.productTypes?.[0].productAttributes?.[1]).toEqual({
        attribute: "Genre",
      });
    });
  });
});

describe("ShopConfigurationSchema", () => {
  const validShopConfig = {
    shop: {
      headerText: "Test Shop",
      description: "Test shop description",
    },
    channels: [
      {
        name: "Test Channel",
        slug: "test-channel",
        currencyCode: "USD",
        defaultCountry: "US" as CountryCode,
      },
    ],
  };

  describe("valid configurations", () => {
    it("should validate a complete valid configuration", () => {
      // Arrange & Act
      const result = configSchema.safeParse(validShopConfig);

      // Assert
      expect(result.success).toBe(true);
    });

    it("should accept configuration with new country codes", () => {
      // Arrange
      const configWithNewCountries = {
        ...validShopConfig,
        channels: [
          {
            ...validShopConfig.channels[0],
            defaultCountry: "AE" as CountryCode,
          },
        ],
      };

      // Act
      const result = configSchema.safeParse(configWithNewCountries);

      // Assert
      expect(result.success).toBe(true);
    });

    it("should accept configuration with all new country codes", () => {
      // Arrange
      const newCountryCodes = [
        "AE",
        "MX",
        "KR",
        "SG",
        "HK",
        "MY",
        "TH",
        "ID",
        "PH",
        "VN",
        "EG",
        "SA",
        "IL",
        "TR",
        "ZA",
        "NG",
        "AR",
        "CL",
        "CO",
        "PE",
        "NZ",
      ];

      const channels = newCountryCodes.map((country, index) => ({
        name: `Test Channel ${index}`,
        slug: `test-channel-${index}`,
        currencyCode: "USD",
        defaultCountry: country as CountryCode,
      }));

      const configWithAllNewCountries = {
        ...validShopConfig,
        channels,
      };

      // Act
      const result = configSchema.safeParse(configWithAllNewCountries);

      // Assert
      expect(result.success).toBe(true);
    });

    it("should accept minimal valid configuration", () => {
      // Arrange
      const minimalConfig = {
        channels: [
          {
            name: "Minimal Channel",
            slug: "minimal",
            currencyCode: "USD",
            defaultCountry: "US" as CountryCode,
          },
        ],
      };

      // Act
      const result = configSchema.safeParse(minimalConfig);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe("invalid configurations", () => {
    it("should reject configuration with invalid country code", () => {
      // Arrange
      const invalidConfig = {
        ...validShopConfig,
        channels: [
          {
            ...validShopConfig.channels[0],
            defaultCountry: "INVALID" as CountryCode,
          },
        ],
      };

      // Act
      const result = configSchema.safeParse(invalidConfig);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.code).toContain("invalid");
    });

    it("should reject configuration with missing required channel fields", () => {
      // Arrange
      const invalidConfig = {
        ...validShopConfig,
        channels: [
          {
            name: "Test Channel",
            // Missing required fields
          },
        ],
      };

      // Act
      const result = configSchema.safeParse(invalidConfig);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject configuration with invalid currency code", () => {
      // Arrange
      const invalidConfig = {
        ...validShopConfig,
        channels: [
          {
            ...validShopConfig.channels[0],
            currencyCode: "INVALID",
          },
        ],
      };

      // Act
      const result = configSchema.safeParse(invalidConfig);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject configuration with unknown fields when strict is enabled", () => {
      // Arrange
      const invalidConfig = {
        ...validShopConfig,
        unknownField: "this should not be allowed",
      };

      // Act
      const result = configSchema.safeParse(invalidConfig);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe("CountryCode validation", () => {
    const { z } = require("zod");
    const countryCodeSchema = z.enum([
      "US",
      "GB",
      "DE",
      "FR",
      "ES",
      "IT",
      "PL",
      "NL",
      "BE",
      "CZ",
      "PT",
      "SE",
      "AT",
      "CH",
      "DK",
      "FI",
      "NO",
      "IE",
      "AU",
      "JP",
      "BR",
      "RU",
      "CN",
      "IN",
      "CA",
      "AE",
      "MX",
      "KR",
      "SG",
      "HK",
      "MY",
      "TH",
      "ID",
      "PH",
      "VN",
      "EG",
      "SA",
      "IL",
      "TR",
      "ZA",
      "NG",
      "AR",
      "CL",
      "CO",
      "PE",
      "NZ",
    ]);

    it("should include all original country codes", () => {
      // Arrange
      const originalCodes = [
        "US",
        "GB",
        "DE",
        "FR",
        "IT",
        "ES",
        "PL",
        "JP",
        "IN",
        "CA",
      ];

      // Act & Assert
      originalCodes.forEach((code) => {
        const result = countryCodeSchema.safeParse(code);
        expect(result.success).toBe(true);
      });
    });

    it("should include all new country codes", () => {
      // Arrange
      const newCodes = [
        "AE",
        "MX",
        "KR",
        "SG",
        "HK",
        "MY",
        "TH",
        "ID",
        "PH",
        "VN",
        "EG",
        "SA",
        "IL",
        "TR",
        "ZA",
        "NG",
        "AR",
        "CL",
        "CO",
        "PE",
        "NZ",
      ];

      // Act & Assert
      newCodes.forEach((code) => {
        const result = countryCodeSchema.safeParse(code);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid country codes", () => {
      // Arrange
      const invalidCodes = ["XX", "INVALID", "US1", "us", ""];

      // Act & Assert
      invalidCodes.forEach((code) => {
        const result = countryCodeSchema.safeParse(code);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("edge cases and validation scenarios", () => {
    it("should handle configuration with optional shop fields", () => {
      // Arrange
      const configWithOptionals = {
        shop: {
          headerText: "Shop Header",
          description: "Shop Description",
          trackInventoryByDefault: true,
          defaultWeightUnit: "KG",
        },
        channels: [
          {
            name: "Test Channel",
            slug: "test-channel",
            currencyCode: "USD",
            defaultCountry: "US" as CountryCode,
          },
        ],
      };

      // Act
      const result = configSchema.safeParse(configWithOptionals);

      // Assert
      expect(result.success).toBe(true);
    });

    it("should validate configuration with multiple channels", () => {
      // Arrange
      const multiChannelConfig = {
        ...validShopConfig,
        channels: [
          validShopConfig.channels[0],
          {
            name: "Second Channel",
            slug: "second-channel",
            currencyCode: "EUR",
            defaultCountry: "DE" as CountryCode,
          },
          {
            name: "Third Channel",
            slug: "third-channel",
            currencyCode: "GBP",
            defaultCountry: "GB" as CountryCode,
          },
        ],
      };

      // Act
      const result = configSchema.safeParse(multiChannelConfig);

      // Assert
      expect(result.success).toBe(true);
    });

    it("should validate configuration with product types", () => {
      // Arrange
      const configWithProductTypes = {
        ...validShopConfig,
        productTypes: [
          {
            name: "Physical Product",
            productAttributes: [
              {
                name: "Color",
                inputType: "DROPDOWN",
                values: [{ name: "Red" }, { name: "Blue" }],
              },
            ],
          },
        ],
      };

      // Act
      const result = configSchema.safeParse(configWithProductTypes);

      // Assert
      expect(result.success).toBe(true);
    });

    it("should validate configuration with categories", () => {
      // Arrange
      const configWithCategories = {
        ...validShopConfig,
        categories: [
          {
            name: "Electronics",
            subcategories: [{ name: "Phones" }, { name: "Laptops" }],
          },
        ],
      };

      // Act
      const result = configSchema.safeParse(configWithCategories);

      // Assert
      expect(result.success).toBe(true);
    });
  });
});
