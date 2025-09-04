import { describe, expect, it } from "vitest";

import type { SaleorConfig, TaxClassInput, TaxConfigurationInput } from "./schema";

describe("Tax Schema Validation", () => {
  describe("TaxClassInput", () => {
    // Extract the tax class schema from the main config schema for testing
    const getConfigSchema = async () => {
      const module = await import("./schema.js");
      return module.configSchema;
    };

    const createTestConfig = (taxClasses: TaxClassInput[]): Partial<SaleorConfig> => ({
      taxClasses,
    });

    it("should validate basic tax class", async () => {
      const taxClass: TaxClassInput = {
        name: "Standard Rate",
        countryRates: [
          { countryCode: "US" as const, rate: 8.5 },
          { countryCode: "GB" as const, rate: 20 },
        ],
      };

      const config = createTestConfig([taxClass]);
      const schema = await getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });

    it("should validate tax class without country rates", async () => {
      const taxClass: TaxClassInput = {
        name: "Standard Rate",
      };

      const config = createTestConfig([taxClass]);
      const schema = await getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });

    it("should reject empty tax class name", async () => {
      const taxClass = {
        name: "",
        countryRates: [{ countryCode: "US" as const, rate: 8.5 }],
      };

      const config = createTestConfig([taxClass]);
      const schema = await getConfigSchema();

      expect(() => schema.parse(config)).toThrow();
    });

    it("should reject missing tax class name", async () => {
      const taxClass = {
        // biome-ignore lint/suspicious/noExplicitAny: testing invalid input
        name: undefined as any,
        countryRates: [{ countryCode: "US" as const, rate: 8.5 }],
      };

      const config = createTestConfig([taxClass]);
      const schema = await getConfigSchema();

      expect(() => schema.parse(config)).toThrow();
    });

    it("should reject invalid country codes", async () => {
      const taxClass = {
        name: "Standard Rate",
        // biome-ignore lint/suspicious/noExplicitAny: testing invalid input
        countryRates: [{ countryCode: "INVALID" as any, rate: 8.5 }],
      };

      const config = createTestConfig([taxClass]);
      const schema = await getConfigSchema();

      expect(() => schema.parse(config)).toThrow();
    });

    it("should reject negative tax rates", async () => {
      const taxClass = {
        name: "Standard Rate",
        countryRates: [{ countryCode: "US" as const, rate: -5 }],
      };

      const config = createTestConfig([taxClass]);
      const schema = await getConfigSchema();

      expect(() => schema.parse(config)).toThrow();
    });

    it("should reject tax rates over 100%", async () => {
      const taxClass = {
        name: "Standard Rate",
        countryRates: [{ countryCode: "US" as const, rate: 150 }],
      };

      const config = createTestConfig([taxClass]);
      const schema = await getConfigSchema();

      expect(() => schema.parse(config)).toThrow();
    });

    it("should validate multiple tax classes", async () => {
      const taxClasses = [
        {
          name: "Standard Rate",
          countryRates: [{ countryCode: "US" as const, rate: 8.5 }],
        },
        {
          name: "Reduced Rate",
          countryRates: [{ countryCode: "GB" as const, rate: 5 }],
        },
        {
          name: "Zero Rate",
          countryRates: [
            { countryCode: "US" as const, rate: 0 },
            { countryCode: "GB" as const, rate: 0 },
          ],
        },
      ];

      const config = createTestConfig(taxClasses);
      const schema = await getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });

    it("should validate edge case rates", async () => {
      const taxClass = {
        name: "Edge Cases",
        countryRates: [
          { countryCode: "US" as const, rate: 0 }, // minimum valid rate
          { countryCode: "GB" as const, rate: 100 }, // maximum valid rate
          { countryCode: "FR" as const, rate: 19.6 }, // decimal rate
        ],
      };

      const config = createTestConfig([taxClass]);
      const schema = await getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });
  });

  describe("TaxConfigurationInput in Channel", () => {
    const getConfigSchema = async () => {
      const module = await import("./schema.js");
      return module.configSchema;
    };

    const createChannelWithTaxConfig = (
      taxConfiguration: TaxConfigurationInput
    ): Partial<SaleorConfig> => ({
      channels: [
        {
          name: "Default",
          currencyCode: "USD",
          defaultCountry: "US",
          slug: "default",
          isActive: true,
          taxConfiguration,
        },
      ],
    });

    it("should validate basic tax configuration", async () => {
      const taxConfig = {
        taxCalculationStrategy: "FLAT_RATES" as const,
        chargeTaxes: true,
        displayGrossPrices: true,
        pricesEnteredWithTax: false,
      };

      const config = createChannelWithTaxConfig(taxConfig);
      const schema = await getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });

    it("should validate tax app configuration", async () => {
      const taxConfig = {
        taxCalculationStrategy: "TAX_APP" as const,
        chargeTaxes: true,
        displayGrossPrices: false,
        pricesEnteredWithTax: true,
        taxAppId: "saleor.tax",
      };

      const config = createChannelWithTaxConfig(taxConfig);
      const schema = await getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });

    it("should validate minimal tax configuration", async () => {
      const taxConfig = {
        chargeTaxes: false,
      };

      const config = createChannelWithTaxConfig(taxConfig);
      const schema = await getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });

    it("should reject invalid tax calculation strategy", async () => {
      const taxConfig = {
        // biome-ignore lint/suspicious/noExplicitAny: testing invalid input
        taxCalculationStrategy: "INVALID_STRATEGY" as any,
        chargeTaxes: true,
      };

      const config = createChannelWithTaxConfig(taxConfig);
      const schema = await getConfigSchema();

      expect(() => schema.parse(config)).toThrow();
    });

    it("should validate channel without tax configuration", async () => {
      const config = {
        channels: [
          {
            name: "Default",
            currencyCode: "USD",
            defaultCountry: "US",
            slug: "default",
            isActive: true,
          },
        ],
      };

      const schema = await getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });
  });

  describe("Product with Tax Class Reference", () => {
    const getConfigSchema = async () => {
      const module = await import("./schema.js");
      return module.configSchema;
    };

    it("should validate product with tax class reference", async () => {
      const config = {
        products: [
          {
            name: "Test Product",
            slug: "test-product",
            productType: "Book",
            category: "fiction",
            taxClass: "Standard Rate",
            variants: [
              {
                name: "Default",
                sku: "TEST-001",
              },
            ],
          },
        ],
      };

      const schema = await getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });

    it("should validate product without tax class reference", async () => {
      const config = {
        products: [
          {
            name: "Test Product",
            slug: "test-product",
            productType: "Book",
            category: "fiction",
            variants: [
              {
                name: "Default",
                sku: "TEST-001",
              },
            ],
          },
        ],
      };

      const schema = await getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });
  });

  describe("ProductType with Tax Class Reference", () => {
    const getConfigSchema = async () => {
      const module = await import("./schema.js");
      return module.configSchema;
    };

    it("should validate product type with tax class reference", async () => {
      const config = {
        productTypes: [
          {
            name: "Book",
            isShippingRequired: true,
            taxClass: "Standard Rate",
          },
        ],
      };

      const schema = await getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });

    it("should validate product type without tax class reference", async () => {
      const config = {
        productTypes: [
          {
            name: "Book",
            isShippingRequired: true,
          },
        ],
      };

      const schema = await getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });
  });

  describe("Complete Configuration with Tax Classes", () => {
    const getConfigSchema = async () => {
      const module = await import("./schema.js");
      return module.configSchema;
    };

    it("should validate complete configuration with tax classes", async () => {
      const config: Partial<SaleorConfig> = {
        shop: {
          displayGrossPrices: true,
        },
        taxClasses: [
          {
            name: "Standard Rate",
            countryRates: [
              { countryCode: "US", rate: 8.5 },
              { countryCode: "GB", rate: 20 },
            ],
          },
          {
            name: "Reduced Rate",
            countryRates: [{ countryCode: "US", rate: 4.0 }],
          },
        ],
        channels: [
          {
            name: "Default",
            currencyCode: "USD",
            defaultCountry: "US",
            slug: "default",
            isActive: true,
            taxConfiguration: {
              taxCalculationStrategy: "FLAT_RATES" as const,
              chargeTaxes: true,
              displayGrossPrices: true,
            },
          },
        ],
        productTypes: [
          {
            name: "Book",
            isShippingRequired: true,
            taxClass: "Standard Rate",
          },
        ],
        products: [
          {
            name: "Test Book",
            slug: "test-book",
            productType: "Book",
            category: "books",
            taxClass: "Reduced Rate", // Override product type tax class
            variants: [{ name: "Default", sku: "BOOK-001" }],
          },
        ],
      };

      const schema = await getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });
  });
});
