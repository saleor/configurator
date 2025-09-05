import { writeFileSync } from "node:fs";
import type {
  CategoryInput,
  ChannelInput,
  CountryCode,
  CurrencyCode,
  PageTypeInput,
  ProductInput,
  ProductTypeInput,
  SaleorConfig,
  ShopInput,
} from "../modules/config/schema/schema";
import type { TempDirectory } from "./filesystem";

// Re-export for convenience in tests
export type ChannelConfig = ChannelInput;
export type ProductTypeConfig = ProductTypeInput;
export type ProductConfig = ProductInput;
export type PageTypeConfig = PageTypeInput;
export type CategoryConfig = CategoryInput;
export type ShopConfig = ShopInput;
export type ConfigFileContent = SaleorConfig;

/**
 * A builder class for creating configuration files in tests.
 * Provides a fluent API for building various types of config files
 * and can be reused across different integration tests.
 */
export class ConfigFileBuilder {
  private content: SaleorConfig = {};
  private format: "yaml" | "json" = "yaml";

  constructor() {
    this.reset();
  }

  /**
   * Reset the builder to start fresh
   */
  reset(): ConfigFileBuilder {
    this.content = {};
    this.format = "yaml";
    return this;
  }

  /**
   * Set the output format (yaml or json)
   */
  setFormat(format: "yaml" | "json"): ConfigFileBuilder {
    this.format = format;
    return this;
  }

  /**
   * Configure shop settings
   */
  withShop(shop: ShopInput): ConfigFileBuilder {
    this.content.shop = { ...this.content.shop, ...shop };
    return this;
  }

  /**
   * Add a single channel
   */
  withChannel(channel: ChannelInput): ConfigFileBuilder {
    if (!this.content.channels) {
      this.content.channels = [];
    }
    this.content.channels.push(channel);
    return this;
  }

  /**
   * Add multiple channels
   */
  withChannels(channels: ChannelInput[]): ConfigFileBuilder {
    if (!this.content.channels) {
      this.content.channels = [];
    }
    this.content.channels.push(...channels);
    return this;
  }

  /**
   * Add a single product type
   */
  withProductType(productType: ProductTypeInput): ConfigFileBuilder {
    if (!this.content.productTypes) {
      this.content.productTypes = [];
    }
    this.content.productTypes.push(productType);
    return this;
  }

  /**
   * Add multiple product types
   */
  withProductTypes(productTypes: ProductTypeInput[]): ConfigFileBuilder {
    if (!this.content.productTypes) {
      this.content.productTypes = [];
    }
    this.content.productTypes.push(...productTypes);
    return this;
  }

  /**
   * Add a single page type
   */
  withPageType(pageType: PageTypeInput): ConfigFileBuilder {
    if (!this.content.pageTypes) {
      this.content.pageTypes = [];
    }
    this.content.pageTypes.push(pageType);
    return this;
  }

  /**
   * Add multiple page types
   */
  withPageTypes(pageTypes: PageTypeInput[]): ConfigFileBuilder {
    if (!this.content.pageTypes) {
      this.content.pageTypes = [];
    }
    this.content.pageTypes.push(...pageTypes);
    return this;
  }

  /**
   * Add a single category
   */
  withCategory(category: CategoryInput): ConfigFileBuilder {
    if (!this.content.categories) {
      this.content.categories = [];
    }
    this.content.categories.push(category);
    return this;
  }

  /**
   * Add multiple categories
   */
  withCategories(categories: CategoryInput[]): ConfigFileBuilder {
    if (!this.content.categories) {
      this.content.categories = [];
    }
    this.content.categories.push(...categories);
    return this;
  }

  /**
   * Add a single product
   */
  withProduct(product: ProductInput): ConfigFileBuilder {
    if (!this.content.products) {
      this.content.products = [];
    }
    this.content.products.push(product);
    return this;
  }

  /**
   * Add multiple products
   */
  withProducts(products: ProductInput[]): ConfigFileBuilder {
    if (!this.content.products) {
      this.content.products = [];
    }
    this.content.products.push(...products);
    return this;
  }

  /**
   * Generate a large configuration for performance testing
   */
  withLargeDataset(
    options: {
      channelCount?: number;
      productTypeCount?: number;
      pageTypeCount?: number;
      categoryCount?: number;
    } = {}
  ): ConfigFileBuilder {
    const {
      channelCount = 3,
      productTypeCount = 50,
      pageTypeCount = 10,
      categoryCount = 30,
    } = options;

    // Add multiple channels
    const channels: ChannelInput[] = [];
    const currencies: CurrencyCode[] = ["USD", "EUR", "GBP", "JPY", "CAD"];
    const countries: CountryCode[] = ["US", "DE", "GB", "JP", "CA"];

    for (let i = 0; i < channelCount; i++) {
      channels.push({
        name: `Channel ${i + 1}`,
        slug: `channel-${i + 1}`,
        currencyCode: currencies[i % currencies.length],
        defaultCountry: countries[i % countries.length],
        isActive: true,
      });
    }
    this.withChannels(channels);

    // Add multiple product types
    const productTypes: ProductTypeInput[] = [];
    for (let i = 0; i < productTypeCount; i++) {
      productTypes.push({
        name: `Product Type ${i + 1}`,
        isShippingRequired: true,
      });
    }
    this.withProductTypes(productTypes);

    // Add multiple page types
    const pageTypes: PageTypeInput[] = [];
    for (let i = 0; i < pageTypeCount; i++) {
      pageTypes.push({
        name: `Page Type ${i + 1}`,
      });
    }
    this.withPageTypes(pageTypes);

    // Add multiple categories
    const categories: CategoryInput[] = [];
    for (let i = 0; i < categoryCount; i++) {
      categories.push({
        name: `Category ${i + 1}`,
        slug: `category-${i + 1}`,
      });
    }
    this.withCategories(categories);

    return this;
  }

  /**
   * Create an invalid configuration for error testing
   */
  withInvalidData(): ConfigFileBuilder {
    this.content = {
      shop: {
        defaultMailSenderName: "Test Shop",
      },
      channels: [
        {
          name: "Invalid Channel",
          slug: "invalid-channel",
          currencyCode: "INVALID" as CurrencyCode, // Invalid currency code
          defaultCountry: "US", // Valid, but the currency is invalid
          isActive: true,
        },
      ],
      productTypes: [
        {
          name: "", // Empty name
          isShippingRequired: true,
        },
        {
          // Missing name field
          isShippingRequired: true,
        } as ProductTypeInput,
      ],
    };
    return this;
  }

  /**
   * Generate the content as a string
   */
  toYaml(): string {
    return this.generateYaml(this.content);
  }

  /**
   * Generate the content as JSON
   */
  toJson(): string {
    return JSON.stringify(this.content, null, 2);
  }

  /**
   * Save the configuration to a file in the given temp directory
   */
  saveToFile(tempDir: TempDirectory, filename: string = "config.yml"): string {
    const content = this.format === "yaml" ? this.toYaml() : this.toJson();
    return tempDir.createFile(filename, content);
  }

  /**
   * Save the configuration to a specific file path
   */
  saveToPath(filePath: string): string {
    const content = this.format === "yaml" ? this.toYaml() : this.toJson();
    writeFileSync(filePath, content, "utf8");
    return filePath;
  }

  /**
   * Get the raw content object
   */
  getContent(): SaleorConfig {
    return { ...this.content };
  }

  private generateYaml(obj: Record<string, unknown>, indent = 0): string {
    const spaces = "  ".repeat(indent);
    let yaml = "";

    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) {
      } else if (value === null) {
        yaml += `${spaces}${key}: null\n`;
      } else if (Array.isArray(value)) {
        if (value.length === 0) {
          yaml += `${spaces}${key}: []\n`;
        } else {
          yaml += `${spaces}${key}:\n`;
          for (const item of value) {
            if (typeof item === "object" && item !== null) {
              yaml += `${spaces}  -`;
              let isFirst = true;
              for (const [itemKey, itemValue] of Object.entries(item)) {
                const prefix = isFirst ? " " : "    ";
                yaml += `${spaces}${prefix}${itemKey}: ${this.formatYamlValue(itemValue)}\n`;
                isFirst = false;
              }
            } else {
              yaml += `${spaces}  - ${this.formatYamlValue(item)}\n`;
            }
          }
        }
      } else if (typeof value === "object" && value !== null) {
        yaml += `${spaces}${key}:\n`;
        yaml += this.generateYaml(value as Record<string, unknown>, indent + 1);
      } else {
        yaml += `${spaces}${key}: ${this.formatYamlValue(value)}\n`;
      }
    }

    return yaml;
  }

  private generateYamlObject(obj: Record<string, unknown>, indent: number): string {
    const spaces = "  ".repeat(indent);
    let yaml = "";

    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) {
      } else if (value === null) {
        yaml += `${spaces}${key}: null\n`;
      } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        yaml += this.generateYaml(value as Record<string, unknown>, indent + 1);
      } else {
        yaml += `${spaces}${key}: ${this.formatYamlValue(value)}\n`;
      }
    }

    return yaml;
  }

  private formatYamlValue(value: unknown): string {
    if (typeof value === "string") {
      // Quote strings that contain special characters or look like other types
      if (
        value.includes(":") ||
        value.includes('"') ||
        value.includes("\n") ||
        /^\d+$/.test(value) ||
        value === "true" ||
        value === "false" ||
        value === "null" ||
        value === ""
      ) {
        return `"${value.replace(/"/g, '\\"')}"`;
      }
      return value;
    }
    return String(value);
  }
}

// Predefined templates for common test scenarios

/**
 * Minimal valid configuration
 */
export function createMinimalConfig(): ConfigFileBuilder {
  return new ConfigFileBuilder().withShop({
    defaultMailSenderName: "Minimal Shop",
  });
}

/**
 * Standard configuration with common entities
 */
export function createStandardConfig(): ConfigFileBuilder {
  return new ConfigFileBuilder()
    .withShop({
      defaultMailSenderName: "Standard Shop",
    })
    .withChannel({
      name: "Default Channel",
      slug: "default-channel",
      currencyCode: "USD",
      defaultCountry: "US",
      isActive: true,
    })
    .withProductType({
      name: "Standard Product",
      isShippingRequired: true,
    });
}

/**
 * Complex configuration with multiple entities
 */
export function createComplexConfig(): ConfigFileBuilder {
  return new ConfigFileBuilder()
    .withShop({
      defaultMailSenderName: "Complex Shop",
      defaultMailSenderAddress: "noreply@complex.com",
      displayGrossPrices: true,
      trackInventoryByDefault: true,
    })
    .withChannels([
      {
        name: "US Channel",
        slug: "us-channel",
        currencyCode: "USD",
        defaultCountry: "US",
        isActive: true,
      },
      {
        name: "EU Channel",
        slug: "eu-channel",
        currencyCode: "EUR",
        defaultCountry: "DE",
        isActive: true,
      },
    ])
    .withProductTypes([
      {
        name: "Electronics",
        isShippingRequired: true,
      },
      {
        name: "Books",
        isShippingRequired: true,
      },
    ])
    .withPageTypes([
      {
        name: "Article",
      },
    ])
    .withCategories([
      {
        name: "Gadgets",
        slug: "gadgets",
      },
    ]);
}

/**
 * Configuration that matches current mock server state (for no-changes scenarios)
 */
export function createMatchingCurrentStateConfig(): ConfigFileBuilder {
  return new ConfigFileBuilder()
    .withShop({
      defaultMailSenderName: "Current Shop Name",
      defaultMailSenderAddress: "noreply@test.com",
      displayGrossPrices: true,
      enableAccountConfirmationByEmail: true,
      limitQuantityPerCheckout: undefined,
      trackInventoryByDefault: true,
      reserveStockDurationAnonymousUser: 10,
      reserveStockDurationAuthenticatedUser: 10,
      defaultDigitalMaxDownloads: undefined,
      defaultDigitalUrlValidDays: undefined,
      defaultWeightUnit: "KG",
      allowLoginWithoutConfirmation: false,
    })
    .withChannel({
      name: "Default Channel",
      slug: "default-channel",
      currencyCode: "USD",
      defaultCountry: "US",
      isActive: true,
    });
}

/**
 * Invalid configuration for error testing
 */
export function createInvalidConfig(): ConfigFileBuilder {
  return new ConfigFileBuilder().withInvalidData();
}

/**
 * Large configuration for performance testing
 */
export function createLargeConfig(
  options?: Parameters<ConfigFileBuilder["withLargeDataset"]>[0]
): ConfigFileBuilder {
  return new ConfigFileBuilder()
    .withShop({
      defaultMailSenderName: "Large Configuration Shop",
    })
    .withLargeDataset(options);
}

// Convenience function to create a new builder
export function createConfigFile(): ConfigFileBuilder {
  return new ConfigFileBuilder();
}
