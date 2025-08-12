import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as yaml from "yaml";
import { ConfigurationService } from "../modules/config/config-service";
import { YamlConfigurationManager } from "../modules/config/yaml-manager";
import type { RawSaleorConfig } from "../modules/config/repository";

describe("Introspect Command - E2E Test for Nested Categories", () => {
  const TEST_CONFIG_PATH = "test-introspect-output.yml";
  
  beforeEach(() => {
    // Clean up any existing test file
    try {
      unlinkSync(TEST_CONFIG_PATH);
    } catch {
      // File doesn't exist, that's fine
    }
  });

  it("should correctly introspect and write nested categories to YAML", async () => {
    // Mock the repository to return nested categories
    const mockRawConfig: RawSaleorConfig = {
      shop: {
        name: "Test Shop",
        enableAccountConfirmationByEmail: false,
        defaultMailSenderName: "Test Shop",
        defaultMailSenderAddress: "shop@example.com",
        customerSetPasswordUrl: "https://example.com/reset",
      },
      channels: [
        {
          id: "1",
          name: "Default Channel",
          slug: "default-channel",
          isActive: true,
          currencyCode: "USD",
          defaultCountry: { code: "US" },
          checkoutSettings: {
            useLegacyErrorFlow: false,
            automaticallyCompleteFullyPaidCheckouts: true,
          },
          orderSettings: {
            automaticallyConfirmAllNewOrders: true,
            automaticallyFulfillNonShippableGiftCard: true,
            expireOrdersAfter: "30",
            deleteExpiredOrdersAfter: "30",
            markAsPaidStrategy: "PAYMENT_FLOW",
            allowUnpaidOrders: false,
            includeDraftOrderInVoucherUsage: false,
          },
          paymentSettings: {
            defaultTransactionFlowStrategy: "CHARGE",
          },
          stockSettings: {
            allocationStrategy: "PRIORITIZE_SORTING_ORDER",
          },
        },
      ],
      productTypes: null,
      pageTypes: null,
      categories: {
        edges: [
          // Root categories
          {
            node: {
              id: "cat-1",
              name: "Electronics",
              slug: "electronics",
              level: 0,
              parent: null,
            },
          },
          {
            node: {
              id: "cat-2",
              name: "Clothing",
              slug: "clothing",
              level: 0,
              parent: null,
            },
          },
          // Level 1 - Electronics subcategories
          {
            node: {
              id: "cat-3",
              name: "Computers",
              slug: "computers",
              level: 1,
              parent: {
                id: "cat-1",
                slug: "electronics",
              },
            },
          },
          {
            node: {
              id: "cat-4",
              name: "Audio & Video",
              slug: "audio-video",
              level: 1,
              parent: {
                id: "cat-1",
                slug: "electronics",
              },
            },
          },
          // Level 2 - Computers subcategories
          {
            node: {
              id: "cat-5",
              name: "Laptops",
              slug: "laptops",
              level: 2,
              parent: {
                id: "cat-3",
                slug: "computers",
              },
            },
          },
          {
            node: {
              id: "cat-6",
              name: "Desktop PCs",
              slug: "desktop-pcs",
              level: 2,
              parent: {
                id: "cat-3",
                slug: "computers",
              },
            },
          },
          {
            node: {
              id: "cat-7",
              name: "Computer Accessories",
              slug: "computer-accessories",
              level: 2,
              parent: {
                id: "cat-3",
                slug: "computers",
              },
            },
          },
          // Level 3 - Laptops subcategories
          {
            node: {
              id: "cat-8",
              name: "Gaming Laptops",
              slug: "gaming-laptops",
              level: 3,
              parent: {
                id: "cat-5",
                slug: "laptops",
              },
            },
          },
          {
            node: {
              id: "cat-9",
              name: "Business Laptops",
              slug: "business-laptops",
              level: 3,
              parent: {
                id: "cat-5",
                slug: "laptops",
              },
            },
          },
          {
            node: {
              id: "cat-10",
              name: "Ultrabooks",
              slug: "ultrabooks",
              level: 3,
              parent: {
                id: "cat-5",
                slug: "laptops",
              },
            },
          },
          // Level 1 - Clothing subcategories
          {
            node: {
              id: "cat-11",
              name: "Men's Clothing",
              slug: "mens-clothing",
              level: 1,
              parent: {
                id: "cat-2",
                slug: "clothing",
              },
            },
          },
          {
            node: {
              id: "cat-12",
              name: "Women's Clothing",
              slug: "womens-clothing",
              level: 1,
              parent: {
                id: "cat-2",
                slug: "clothing",
              },
            },
          },
          // Level 2 - Men's clothing subcategories
          {
            node: {
              id: "cat-13",
              name: "Men's Shirts",
              slug: "mens-shirts",
              level: 2,
              parent: {
                id: "cat-11",
                slug: "mens-clothing",
              },
            },
          },
          {
            node: {
              id: "cat-14",
              name: "Men's Pants",
              slug: "mens-pants",
              level: 2,
              parent: {
                id: "cat-11",
                slug: "mens-clothing",
              },
            },
          },
        ],
      },
      shippingZones: null,
      warehouses: null,
    };

    // Create a mock repository that returns our test data
    const mockRepository = {
      fetchConfig: vi.fn().mockResolvedValue(mockRawConfig),
    };

    // Create the YAML manager
    const yamlManager = new YamlConfigurationManager(TEST_CONFIG_PATH);

    // Create the configuration service with our mocked repository
    const configService = new ConfigurationService(mockRepository as any, yamlManager);

    // Run the introspection (retrieve will save to YAML)
    const config = await configService.retrieve();

    // Write to YAML to verify the format
    const yamlContent = yaml.stringify(config);
    writeFileSync(TEST_CONFIG_PATH, yamlContent);

    // Read back and verify
    const writtenContent = readFileSync(TEST_CONFIG_PATH, "utf-8");
    const parsedConfig = yaml.parse(writtenContent);

    // Verify the nested structure
    expect(parsedConfig.categories).toBeDefined();
    expect(parsedConfig.categories).toHaveLength(2); // Two root categories

    // Check Electronics hierarchy
    const electronics = parsedConfig.categories.find((c: any) => c.slug === "electronics");
    expect(electronics).toEqual({
      name: "Electronics",
      slug: "electronics",
      subcategories: [
        {
          name: "Computers",
          slug: "computers",
          subcategories: [
            {
              name: "Laptops",
              slug: "laptops",
              subcategories: [
                { name: "Gaming Laptops", slug: "gaming-laptops" },
                { name: "Business Laptops", slug: "business-laptops" },
                { name: "Ultrabooks", slug: "ultrabooks" },
              ],
            },
            { name: "Desktop PCs", slug: "desktop-pcs" },
            { name: "Computer Accessories", slug: "computer-accessories" },
          ],
        },
        { name: "Audio & Video", slug: "audio-video" },
      ],
    });

    // Check Clothing hierarchy
    const clothing = parsedConfig.categories.find((c: any) => c.slug === "clothing");
    expect(clothing).toEqual({
      name: "Clothing",
      slug: "clothing",
      subcategories: [
        {
          name: "Men's Clothing",
          slug: "mens-clothing",
          subcategories: [
            { name: "Men's Shirts", slug: "mens-shirts" },
            { name: "Men's Pants", slug: "mens-pants" },
          ],
        },
        { name: "Women's Clothing", slug: "womens-clothing" },
      ],
    });

    // Clean up
    unlinkSync(TEST_CONFIG_PATH);
  });

  it("should produce valid YAML with proper indentation for nested categories", async () => {
    const mockRawConfig: RawSaleorConfig = {
      shop: null,
      channels: null,
      productTypes: null,
      pageTypes: null,
      categories: {
        edges: [
          {
            node: {
              id: "1",
              name: "Root",
              slug: "root",
              level: 0,
              parent: null,
            },
          },
          {
            node: {
              id: "2",
              name: "Child",
              slug: "child",
              level: 1,
              parent: { id: "1", slug: "root" },
            },
          },
          {
            node: {
              id: "3",
              name: "Grandchild",
              slug: "grandchild",
              level: 2,
              parent: { id: "2", slug: "child" },
            },
          },
        ],
      },
      shippingZones: null,
      warehouses: null,
    };

    const mockRepository = {
      fetchConfig: vi.fn().mockResolvedValue(mockRawConfig),
    };

    const yamlManager = new YamlConfigurationManager(TEST_CONFIG_PATH);
    const configService = new ConfigurationService(mockRepository as any, yamlManager);

    const config = await configService.retrieve();
    const yamlContent = yaml.stringify(config);

    // Verify YAML structure
    expect(yamlContent).toContain("categories:");
    expect(yamlContent).toContain("  - name: Root");
    expect(yamlContent).toContain("    slug: root");
    expect(yamlContent).toContain("    subcategories:");
    expect(yamlContent).toContain("      - name: Child");
    expect(yamlContent).toContain("        slug: child");
    expect(yamlContent).toContain("        subcategories:");
    expect(yamlContent).toContain("          - name: Grandchild");
    expect(yamlContent).toContain("            slug: grandchild");

    // Write and verify it's valid YAML
    writeFileSync(TEST_CONFIG_PATH, yamlContent);
    
    // Should not throw when parsing
    const reparsed = yaml.parse(yamlContent);
    expect(reparsed.categories[0].subcategories[0].subcategories[0].name).toBe("Grandchild");

    unlinkSync(TEST_CONFIG_PATH);
  });
});