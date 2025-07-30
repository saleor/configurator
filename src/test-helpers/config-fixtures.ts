import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface TestConfig {
  shop?: {
    defaultMailSenderName?: string;
  };
  channels?: Array<{
    name: string;
    slug: string;
    currencyCode: string;
    defaultCountry?: string;
    isActive?: boolean;
  }>;
  productTypes?: Array<{
    name: string;
    slug?: string;
    hasVariants?: boolean;
    kind?: string;
  }>;
  pageTypes?: Array<{
    name: string;
    slug?: string;
  }>;
  categories?: Array<{
    name: string;
    slug?: string;
    description?: string;
  }>;
}

export function createTestConfigFile(config: TestConfig, filename = "test-config.yml"): string {
  const configYaml = generateConfigYaml(config);
  const tempDir = tmpdir();
  const configPath = join(tempDir, filename);

  try {
    mkdirSync(tempDir, { recursive: true });
  } catch {
    // Directory already exists
  }

  writeFileSync(configPath, configYaml, "utf8");
  return configPath;
}

function generateConfigYaml(config: TestConfig): string {
  const lines: string[] = [];

  if (config.shop) {
    lines.push("shop:");
    if (config.shop.defaultMailSenderName) {
      lines.push(`  defaultMailSenderName: "${config.shop.defaultMailSenderName}"`);
    }
    lines.push("");
  }

  if (config.channels && config.channels.length > 0) {
    lines.push("channels:");
    for (const channel of config.channels) {
      lines.push(`  - name: "${channel.name}"`);
      lines.push(`    slug: "${channel.slug}"`);
      lines.push(`    currencyCode: "${channel.currencyCode}"`);
      if (channel.defaultCountry) {
        lines.push(`    defaultCountry: "${channel.defaultCountry}"`);
      }
      if (channel.isActive !== undefined) {
        lines.push(`    isActive: ${channel.isActive}`);
      }
    }
    lines.push("");
  }

  if (config.productTypes && config.productTypes.length > 0) {
    lines.push("productTypes:");
    for (const productType of config.productTypes) {
      lines.push(`  - name: "${productType.name}"`);
      if (productType.slug) {
        lines.push(`    slug: "${productType.slug}"`);
      }
      if (productType.hasVariants !== undefined) {
        lines.push(`    hasVariants: ${productType.hasVariants}`);
      }
      if (productType.kind) {
        lines.push(`    kind: "${productType.kind}"`);
      }
    }
    lines.push("");
  }

  if (config.pageTypes && config.pageTypes.length > 0) {
    lines.push("pageTypes:");
    for (const pageType of config.pageTypes) {
      lines.push(`  - name: "${pageType.name}"`);
      if (pageType.slug) {
        lines.push(`    slug: "${pageType.slug}"`);
      }
    }
    lines.push("");
  }

  if (config.categories && config.categories.length > 0) {
    lines.push("categories:");
    for (const category of config.categories) {
      lines.push(`  - name: "${category.name}"`);
      if (category.slug) {
        lines.push(`    slug: "${category.slug}"`);
      }
      if (category.description) {
        lines.push(`    description: "${category.description}"`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

// Predefined test scenarios
export const testConfigs = {
  // No changes scenario - config matches current state
  noChanges: (): TestConfig => ({
    shop: {
      defaultMailSenderName: "Test Shop",
    },
    channels: [
      {
        name: "Default Channel",
        slug: "default-channel",
        currencyCode: "USD",
        defaultCountry: "US",
      },
    ],
  }),

  // Safe changes - only creates and updates
  safeChanges: (): TestConfig => ({
    shop: {
      defaultMailSenderName: "Updated Shop Name",
    },
    channels: [
      {
        name: "Default Channel",
        slug: "default-channel",
        currencyCode: "USD",
        defaultCountry: "US",
      },
      { name: "New Channel", slug: "new-channel", currencyCode: "EUR", defaultCountry: "DE" },
    ],
    productTypes: [
      { name: "Book", slug: "book", hasVariants: false },
      { name: "T-Shirt", slug: "t-shirt", hasVariants: true },
    ],
  }),

  // Complex changes with creates, updates, and deletes
  complexChanges: (): TestConfig => ({
    shop: {
      defaultMailSenderName: "Completely New Shop Name",
    },
    channels: [
      { name: "Main Channel", slug: "main", currencyCode: "USD", defaultCountry: "US" }, // Updated
    ],
    productTypes: [
      { name: "Electronics", slug: "electronics", hasVariants: true }, // New
    ],
    pageTypes: [
      { name: "Landing Page", slug: "landing" }, // New
    ],
  }),

  // Minimal valid configuration
  minimal: (): TestConfig => ({
    shop: {
      defaultMailSenderName: "Minimal Shop",
    },
  }),

  // Large configuration for performance testing
  large: (): TestConfig => {
    const productTypes = Array.from({ length: 50 }, (_, i) => ({
      name: `Product Type ${i + 1}`,
      slug: `product-type-${i + 1}`,
      hasVariants: i % 2 === 0,
    }));

    const categories = Array.from({ length: 30 }, (_, i) => ({
      name: `Category ${i + 1}`,
      slug: `category-${i + 1}`,
      description: `Description for category ${i + 1}`,
    }));

    return {
      shop: {
        defaultMailSenderName: "Large Configuration Shop",
      },
      channels: [
        { name: "Main Channel", slug: "main", currencyCode: "USD", defaultCountry: "US" },
        { name: "EU Channel", slug: "eu", currencyCode: "EUR", defaultCountry: "DE" },
        { name: "UK Channel", slug: "uk", currencyCode: "GBP", defaultCountry: "GB" },
      ],
      productTypes,
      categories,
    };
  },
};
