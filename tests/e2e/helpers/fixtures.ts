import yaml from "yaml";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Test fixture data for e2e tests
 */
export const fixtures = {
  /**
   * Sample valid configuration
   */
  validConfig: {
    shop: {
      defaultMailSenderName: "Test Shop",
      defaultMailSenderAddress: "test@example.com",
      limitQuantityPerCheckout: 100,
      enableAccountConfirmationByEmail: true,
      defaultWeightUnit: "KG",
    },
    channels: [
      {
        slug: "default-channel",
        name: "Default Channel",
        currencyCode: "USD",
        defaultCountry: "US",
        isActive: true,
        orderSettings: {
          automaticallyConfirmAllNewOrders: false,
          automaticallyFulfillNonShippableGiftCard: true,
        },
        settings: {
          allowUnpaidOrders: false,
          includeDraftOrderInVouchers: false,
        },
        stockSettings: {
          allocationStrategy: "PRIORITIZE_HIGH_STOCK",
        },
      },
    ],
    warehouses: [
      {
        slug: "main-warehouse",
        name: "Main Warehouse",
        isPrivate: false,
        clickAndCollectOption: "DISABLED",
        address: {
          streetAddress1: "123 Test St",
          city: "Test City",
          country: "US",
          postalCode: "12345",
        },
      },
    ],
    shippingZones: [
      {
        name: "United States",
        description: "Shipping zone for US",
        countries: ["US"],
        channels: ["default-channel"],
      },
    ],
    taxes: {
      taxCalculationStrategy: "FLAT_RATES",
      chargeTaxesOnShipping: true,
      displayGrossPrices: false,
      pricesEnteredWithTax: false,
      taxClasses: [
        {
          name: "Standard Tax",
          rates: [
            {
              name: "US Sales Tax",
              rate: 10,
            },
          ],
        },
      ],
    },
  },

  /**
   * Invalid configurations for error testing
   */
  invalidConfigs: {
    missingRequired: {
      shop: {
        // Missing required fields
      },
    },
    duplicateSlugs: {
      channels: [
        { slug: "duplicate", name: "Channel 1", currencyCode: "USD" },
        { slug: "duplicate", name: "Channel 2", currencyCode: "EUR" },
      ],
    },
    invalidTypes: {
      shop: {
        limitQuantityPerCheckout: "not-a-number", // Should be number
        enableAccountConfirmationByEmail: "yes", // Should be boolean
      },
    },
    circularReference: {
      channels: [
        {
          slug: "channel-1",
          name: "Channel 1",
          warehouses: ["warehouse-1"],
        },
      ],
      warehouses: [
        {
          slug: "warehouse-1",
          name: "Warehouse 1",
          channels: ["channel-1"],
        },
      ],
    },
  },

  /**
   * Large configuration for performance testing
   */
  largeConfig: {
    generateLarge: (size: {
      channels?: number;
      products?: number;
      warehouses?: number;
      categories?: number;
    }) => {
      const config: any = {
        shop: fixtures.validConfig.shop,
        channels: [],
        products: [],
        warehouses: [],
        categories: [],
      };

      // Generate channels
      for (let i = 0; i < (size.channels ?? 10); i++) {
        config.channels.push({
          slug: `channel-${i}`,
          name: `Channel ${i}`,
          currencyCode: ["USD", "EUR", "GBP"][i % 3],
          defaultCountry: ["US", "GB", "DE"][i % 3],
          isActive: true,
        });
      }

      // Generate products
      for (let i = 0; i < (size.products ?? 100); i++) {
        config.products.push({
          slug: `product-${i}`,
          name: `Product ${i}`,
          description: `Description for product ${i}`,
          category: `category-${i % 10}`,
          isPublished: i % 2 === 0,
        });
      }

      // Generate warehouses
      for (let i = 0; i < (size.warehouses ?? 5); i++) {
        config.warehouses.push({
          slug: `warehouse-${i}`,
          name: `Warehouse ${i}`,
          address: {
            streetAddress1: `${i} Warehouse St`,
            city: `City ${i}`,
            country: ["US", "GB", "DE"][i % 3],
            postalCode: `${10000 + i}`,
          },
        });
      }

      // Generate categories
      for (let i = 0; i < (size.categories ?? 20); i++) {
        config.categories.push({
          slug: `category-${i}`,
          name: `Category ${i}`,
          description: `Category ${i} description`,
        });
      }

      return config;
    },
  },

  /**
   * Configuration mutations for testing updates
   */
  mutations: {
    updateShopEmail: (config: any, email: string) => ({
      ...config,
      shop: {
        ...config.shop,
        defaultMailSenderAddress: email,
      },
    }),
    addChannel: (config: any, channel: any) => ({
      ...config,
      channels: [...(config.channels || []), channel],
    }),
    removeChannel: (config: any, slug: string) => ({
      ...config,
      channels: config.channels?.filter((c: any) => c.slug !== slug) || [],
    }),
    updateTaxRate: (config: any, className: string, rate: number) => ({
      ...config,
      taxes: {
        ...config.taxes,
        taxClasses: config.taxes?.taxClasses?.map((tc: any) =>
          tc.name === className
            ? {
                ...tc,
                rates: tc.rates.map((r: any) => ({ ...r, rate })),
              }
            : tc
        ),
      },
    }),
  },
};

/**
 * Test scenario generators
 */
export const scenarios = {
  /**
   * Create a minimal valid configuration
   */
  minimal: () => ({
    shop: {
      defaultMailSenderName: "Minimal Shop",
      defaultMailSenderAddress: "minimal@test.com",
    },
    channels: [
      {
        slug: "default",
        name: "Default",
        currencyCode: "USD",
      },
    ],
  }),

  /**
   * Create a configuration with all optional fields
   */
  complete: () => ({
    ...fixtures.validConfig,
    products: [],
    productTypes: [],
    attributes: [],
    categories: [],
    collections: [],
    pages: [],
    pageTypes: [],
    menus: [],
  }),

  /**
   * Create test-specific mutations
   */
  withTestId: (config: any, testId: string) => ({
    ...config,
    shop: {
      ...config.shop,
      defaultMailSenderName: `Test ${testId}`,
    },
  }),
};

/**
 * Helper to create test configuration files
 */
export class ConfigBuilder {
  private config: any = {};

  static from(base: any): ConfigBuilder {
    const builder = new ConfigBuilder();
    builder.config = structuredClone(base);
    return builder;
  }

  withShop(shop: any): this {
    this.config.shop = { ...this.config.shop, ...shop };
    return this;
  }

  withChannel(channel: any): this {
    this.config.channels = this.config.channels || [];
    this.config.channels.push(channel);
    return this;
  }

  withWarehouse(warehouse: any): this {
    this.config.warehouses = this.config.warehouses || [];
    this.config.warehouses.push(warehouse);
    return this;
  }

  withTaxClass(taxClass: any): this {
    this.config.taxes = this.config.taxes || {};
    this.config.taxes.taxClasses = this.config.taxes.taxClasses || [];
    this.config.taxes.taxClasses.push(taxClass);
    return this;
  }

  build(): any {
    return structuredClone(this.config);
  }

  async toYaml(): Promise<string> {
    return yaml.stringify(this.config);
  }

  async toFile(path: string): Promise<void> {
    const content = await this.toYaml();
    const dir = join(path, "..");
    await mkdir(dir, { recursive: true });
    await writeFile(path, content, "utf-8");
  }
}

/**
 * Test environment helpers
 */
export const testEnv = {
  /**
   * Get Saleor connection details
   */
  getSaleorConfig: () => ({
    url: process.env.CONFIGURATOR_E2E_SALEOR_URL ||
         process.env.SALEOR_E2E_URL ||
         process.env.SALEOR_URL ||
         "https://sandbox-a.staging.saleor.cloud/graphql/",
    token: process.env.CONFIGURATOR_E2E_SALEOR_TOKEN ||
           process.env.SALEOR_E2E_TOKEN ||
           process.env.SALEOR_TOKEN,
  }),

  /**
   * Check if e2e tests should run
   */
  shouldRunE2E: () => {
    const config = testEnv.getSaleorConfig();
    return !!config.token;
  },

  /**
   * Get test timeout
   */
  getTimeout: () => {
    const timeout = process.env.CONFIGURATOR_E2E_TIMEOUT;
    return timeout ? parseInt(timeout, 10) : undefined;
  },

  /**
   * Get CI environment flag
   */
  isCI: () => process.env.CI === "true",
};

/**
 * Test data generators
 */
export const generators = {
  /**
   * Generate unique test ID
   */
  testId: () => `${Date.now()}-${Math.random().toString(36).substring(7)}`,

  /**
   * Generate unique slug
   */
  slug: (prefix = "test") => `${prefix}-${generators.testId()}`,

  /**
   * Generate email
   */
  email: (domain = "test.com") => `test-${generators.testId()}@${domain}`,

  /**
   * Generate random number in range
   */
  number: (min = 1, max = 100) => Math.floor(Math.random() * (max - min + 1)) + min,

  /**
   * Generate random boolean
   */
  boolean: () => Math.random() > 0.5,

  /**
   * Pick random item from array
   */
  pick: <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)],
};

/**
 * File system helpers
 */
export const fileHelpers = {
  /**
   * Create temporary config file
   */
  createTempConfig: async (dir: string, config: any, name = "config.yml") => {
    const path = join(dir, name);
    await mkdir(dir, { recursive: true });
    await writeFile(path, yaml.stringify(config), "utf-8");
    return path;
  },

  /**
   * Read config file
   */
  readConfig: async (path: string) => {
    const content = await readFile(path, "utf-8");
    return yaml.parse(content);
  },

  /**
   * Update config file
   */
  updateConfig: async (path: string, updater: (config: any) => any) => {
    const config = await fileHelpers.readConfig(path);
    const updated = updater(config);
    await writeFile(path, yaml.stringify(updated), "utf-8");
    return updated;
  },

  /**
   * Check if file exists
   */
  exists: async (path: string) => {
    try {
      await readFile(path);
      return true;
    } catch {
      return false;
    }
  },
};