import { describe, it, expect } from "vitest";

import type { SaleorConfig } from "./schema";

describe("Tax Schema Validation", () => {
  describe("TaxClassInput", () => {
    // Extract the tax class schema from the main config schema for testing
    const getConfigSchema = async () => {
      const module = await import("./schema.js");
      return module.configSchema;
    };

    const createTestConfig = (taxClasses: unknown[]): Partial<SaleorConfig> => ({
      taxClasses,
    });

    it("should validate basic tax class", async () => {
      const taxClass = {
        name: "Standard Rate",
        countryRates: [
          { countryCode: "US", rate: 8.5 },
          { countryCode: "GB", rate: 20 },
        ],
      };

      const config = createTestConfig([taxClass]);
      const schema = await getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });

    it("should validate tax class without country rates", () => {
      const taxClass = {
        name: "Standard Rate",
      };

      const config = createTestConfig([taxClass]);
      const schema = getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });

    it("should reject empty tax class name", () => {
      const taxClass = {
        name: "",
        countryRates: [{ countryCode: "US", rate: 8.5 }],
      };

      const config = createTestConfig([taxClass]);
      const schema = getConfigSchema();

      expect(() => schema.parse(config)).toThrow();
    });

    it("should reject missing tax class name", () => {
      const taxClass = {
        countryRates: [{ countryCode: "US", rate: 8.5 }],
      };

      const config = createTestConfig([taxClass]);
      const schema = getConfigSchema();

      expect(() => schema.parse(config)).toThrow();
    });

    it("should reject invalid country codes", () => {
      const taxClass = {
        name: "Standard Rate",
        countryRates: [{ countryCode: "INVALID", rate: 8.5 }],
      };

      const config = createTestConfig([taxClass]);
      const schema = getConfigSchema();

      expect(() => schema.parse(config)).toThrow();
    });

    it("should reject negative tax rates", () => {
      const taxClass = {
        name: "Standard Rate",
        countryRates: [{ countryCode: "US", rate: -5 }],
      };

      const config = createTestConfig([taxClass]);
      const schema = getConfigSchema();

      expect(() => schema.parse(config)).toThrow();
    });

    it("should reject tax rates over 100%", () => {
      const taxClass = {
        name: "Standard Rate",
        countryRates: [{ countryCode: "US", rate: 150 }],
      };

      const config = createTestConfig([taxClass]);
      const schema = getConfigSchema();

      expect(() => schema.parse(config)).toThrow();
    });

    it("should validate multiple tax classes", () => {
      const taxClasses = [
        {
          name: "Standard Rate",
          countryRates: [{ countryCode: "US", rate: 8.5 }],
        },
        {
          name: "Reduced Rate",
          countryRates: [{ countryCode: "GB", rate: 5 }],
        },
        {
          name: "Zero Rate",
          countryRates: [
            { countryCode: "US", rate: 0 },
            { countryCode: "GB", rate: 0 },
          ],
        },
      ];

      const config = createTestConfig(taxClasses);
      const schema = getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });

    it("should validate edge case rates", () => {
      const taxClass = {
        name: "Edge Cases",
        countryRates: [
          { countryCode: "US", rate: 0 }, // minimum valid rate
          { countryCode: "GB", rate: 100 }, // maximum valid rate
          { countryCode: "FR", rate: 19.6 }, // decimal rate
        ],
      };

      const config = createTestConfig([taxClass]);
      const schema = getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });
  });

  describe("TaxConfigurationInput in Channel", () => {
    const getConfigSchema = async () => {
      const module = await import("./schema.js");
      return module.configSchema;
    };

    const createChannelWithTaxConfig = (taxConfiguration: unknown): Partial<SaleorConfig> => ({
      channels: [
        {
          name: "Default",
          currencyCode: "USD",
          defaultCountry: "US",
          slug: "default",
          taxConfiguration,
        },
      ],
    });

    it("should validate basic tax configuration", () => {
      const taxConfig = {
        taxCalculationStrategy: "FLAT_RATES",
        chargeTaxes: true,
        displayGrossPrices: true,
        pricesEnteredWithTax: false,
      };

      const config = createChannelWithTaxConfig(taxConfig);
      const schema = getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });

    it("should validate tax app configuration", () => {
      const taxConfig = {
        taxCalculationStrategy: "TAX_APP",
        chargeTaxes: true,
        displayGrossPrices: false,
        pricesEnteredWithTax: true,
        taxAppId: "saleor.tax",
      };

      const config = createChannelWithTaxConfig(taxConfig);
      const schema = getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });

    it("should validate minimal tax configuration", () => {
      const taxConfig = {
        chargeTaxes: false,
      };

      const config = createChannelWithTaxConfig(taxConfig);
      const schema = getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });

    it("should reject invalid tax calculation strategy", () => {
      const taxConfig = {
        taxCalculationStrategy: "INVALID_STRATEGY",
        chargeTaxes: true,
      };

      const config = createChannelWithTaxConfig(taxConfig);
      const schema = getConfigSchema();

      expect(() => schema.parse(config)).toThrow();
    });

    it("should validate channel without tax configuration", () => {
      const config = {
        channels: [
          {
            name: "Default",
            currencyCode: "USD",
            defaultCountry: "US",
            slug: "default",
          },
        ],
      };

      const schema = getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });
  });

  describe("Product with Tax Class Reference", () => {
    const getConfigSchema = async () => {
      const module = await import("./schema.js");
      return module.configSchema;
    };

    it("should validate product with tax class reference", () => {
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

      const schema = getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });

    it("should validate product without tax class reference", () => {
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

      const schema = getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });
  });

  describe("ProductType with Tax Class Reference", () => {
    const getConfigSchema = async () => {
      const module = await import("./schema.js");
      return module.configSchema;
    };

    it("should validate product type with tax class reference", () => {
      const config = {
        productTypes: [
          {
            name: "Book",
            isShippingRequired: true,
            taxClass: "Standard Rate",
          },
        ],
      };

      const schema = getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });

    it("should validate product type without tax class reference", () => {
      const config = {
        productTypes: [
          {
            name: "Book",
            isShippingRequired: true,
          },
        ],
      };

      const schema = getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });
  });

  describe("Complete Configuration with Tax Classes", () => {
    const getConfigSchema = async () => {
      const module = await import("./schema.js");
      return module.configSchema;
    };

    it("should validate complete configuration with tax classes", () => {
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
            taxConfiguration: {
              taxCalculationStrategy: "FLAT_RATES",
              chargeTaxes: true,
              displayGrossPrices: true,
            },
          },
        ],
        productTypes: [
          {
            name: "Book",
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

      const schema = getConfigSchema();

      expect(() => schema.parse(config)).not.toThrow();
    });
  });
});