import { readFileSync, unlinkSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as yaml from "yaml";
import { ConfigurationService } from "../modules/config/config-service";
import type { RawSaleorConfig } from "../modules/config/repository";
import { YamlConfigurationManager } from "../modules/config/yaml-manager";
import { type IntrospectCommandArgs, introspectCommandSchema } from "./introspect";

// Mock modules
vi.mock("../cli/console", () => ({
  cliConsole: {
    header: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    processing: vi.fn(),
    important: vi.fn((text: string) => text),
    setOptions: vi.fn(),
  },
}));

vi.mock("../core/configurator", () => ({
  createConfigurator: vi.fn(),
}));

vi.mock("../lib/utils/file", () => ({
  fileExists: vi.fn(),
  createBackup: vi.fn(),
}));

describe("introspect command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("introspectCommandSchema", () => {
    // Test data
    const validArgs: IntrospectCommandArgs = {
      config: "test-config.yml",
      url: "https://test.saleor.cloud/graphql/",
      token: "test-token",
      quiet: false,
      dryRun: false,
      include: undefined,
      exclude: undefined,
      backup: true,
      verbose: false,
      format: "table",
      ci: false,
    };

    it("should validate valid arguments", () => {
      // Act
      const result = introspectCommandSchema.safeParse(validArgs);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject(validArgs);
      }
    });

    it("should apply default values correctly", () => {
      // Arrange
      const minimalArgs = {
        config: "test.yml",
        url: "https://test.saleor.cloud/graphql/",
        token: "test-token",
      };

      // Act
      const result = introspectCommandSchema.safeParse(minimalArgs);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quiet).toBe(false);
        expect(result.data.dryRun).toBe(false);
        expect(result.data.backup).toBe(true);
        expect(result.data.verbose).toBe(false);
        expect(result.data.format).toBe("table");
        expect(result.data.ci).toBe(false);
      }
    });

    it("should validate format enum values", () => {
      // Arrange
      const validFormats = ["table", "json", "yaml"];
      const invalidFormat = "invalid";

      // Act & Assert
      for (const format of validFormats) {
        const result = introspectCommandSchema.safeParse({
          ...validArgs,
          format,
        });
        expect(result.success).toBe(true);
      }

      const invalidResult = introspectCommandSchema.safeParse({
        ...validArgs,
        format: invalidFormat,
      });
      expect(invalidResult.success).toBe(false);
    });

    it("should handle selective options parsing", () => {
      // Arrange
      const argsWithInclude = { ...validArgs, include: "channels,shop" };
      const argsWithExclude = { ...validArgs, exclude: "products,categories" };

      // Act
      const includeResult = introspectCommandSchema.safeParse(argsWithInclude);
      const excludeResult = introspectCommandSchema.safeParse(argsWithExclude);

      // Assert
      expect(includeResult.success).toBe(true);
      expect(excludeResult.success).toBe(true);

      if (includeResult.success) {
        expect(includeResult.data.include).toBe("channels,shop");
      }
      if (excludeResult.success) {
        expect(excludeResult.data.exclude).toBe("products,categories");
      }
    });

    it("should handle CI mode flag correctly", () => {
      // Arrange
      const argsWithCi = { ...validArgs, ci: true };

      // Act
      const result = introspectCommandSchema.safeParse(argsWithCi);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ci).toBe(true);
      }
    });

    it("should handle boolean flags correctly", () => {
      // Arrange
      const argsWithFlags = {
        ...validArgs,
        dryRun: true,
        backup: false,
        verbose: true,
        quiet: true,
        ci: true,
      };

      // Act
      const result = introspectCommandSchema.safeParse(argsWithFlags);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dryRun).toBe(true);
        expect(result.data.backup).toBe(false);
        expect(result.data.verbose).toBe(true);
        expect(result.data.quiet).toBe(true);
        expect(result.data.ci).toBe(true);
      }
    });
  });

  describe("Integration - Nested Categories", () => {
    const TEST_CONFIG_PATH = "test-introspect-output.yml";

    beforeEach(() => {
      // Clean up any existing test file
      try {
        unlinkSync(TEST_CONFIG_PATH);
      } catch {
        // File doesn't exist, that's fine
      }
    });

    it("should correctly write nested categories to YAML", async () => {
      // Mock the repository to return nested categories
      const mockRawConfig: RawSaleorConfig = {
        shop: {
          defaultMailSenderName: "Test Store",
          defaultMailSenderAddress: "test@example.com",
          displayGrossPrices: false,
          enableAccountConfirmationByEmail: false,
          limitQuantityPerCheckout: 10,
          trackInventoryByDefault: false,
          reserveStockDurationAnonymousUser: 60,
          reserveStockDurationAuthenticatedUser: 60,
          defaultDigitalMaxDownloads: 10,
          defaultDigitalUrlValidDays: 10,
          defaultWeightUnit: "KG" as const,
          allowLoginWithoutConfirmation: false,
        },
        channels: [],
        productTypes: { edges: [] },
        pageTypes: { edges: [] },
        categories: {
          edges: [
            {
              node: {
                id: "1",
                name: "Electronics",
                slug: "electronics",
                level: 0,
                parent: null,
              },
            },
            {
              node: {
                id: "2",
                name: "Laptops",
                slug: "laptops",
                level: 1,
                parent: { id: "1", slug: "electronics" },
              },
            },
            {
              node: {
                id: "3",
                name: "Gaming Laptops",
                slug: "gaming-laptops",
                level: 2,
                parent: { id: "2", slug: "laptops" },
              },
            },
            {
              node: {
                id: "4",
                name: "Clothing",
                slug: "clothing",
                level: 0,
                parent: null,
              },
            },
            {
              node: {
                id: "5",
                name: "Mens",
                slug: "mens",
                level: 1,
                parent: { id: "4", slug: "clothing" },
              },
            },
          ],
        },
        shippingZones: null,
        warehouses: null,
        products: { edges: [] },
        taxClasses: { edges: [] },
      };

      const mockRepository = {
        fetchConfig: vi.fn().mockResolvedValue(mockRawConfig),
      };

      const yamlManager = new YamlConfigurationManager(TEST_CONFIG_PATH);
      const configService = new ConfigurationService(mockRepository, yamlManager);

      // Get the mapped configuration
      const config = configService.mapConfig(mockRawConfig);

      // Save to YAML
      await yamlManager.save(config);

      // Read the YAML file and verify structure
      const yamlContent = readFileSync(TEST_CONFIG_PATH, "utf-8");
      const parsedYaml = yaml.parse(yamlContent);

      expect(parsedYaml.categories).toHaveLength(2);
      expect(parsedYaml.categories[0].name).toBe("Electronics");
      expect(parsedYaml.categories[0].subcategories).toHaveLength(1);
      expect(parsedYaml.categories[0].subcategories[0].name).toBe("Laptops");
      expect(parsedYaml.categories[0].subcategories[0].subcategories).toHaveLength(1);
      expect(parsedYaml.categories[0].subcategories[0].subcategories[0].name).toBe(
        "Gaming Laptops"
      );
      expect(parsedYaml.categories[1].name).toBe("Clothing");
      expect(parsedYaml.categories[1].subcategories).toHaveLength(1);
      expect(parsedYaml.categories[1].subcategories[0].name).toBe("Mens");

      // Clean up
      unlinkSync(TEST_CONFIG_PATH);
    });

    it("should produce valid YAML with proper indentation for nested categories", async () => {
      const mockRawConfig: RawSaleorConfig = {
        shop: {
          defaultMailSenderName: "Test Store",
          defaultMailSenderAddress: "test@example.com",
          displayGrossPrices: false,
          enableAccountConfirmationByEmail: false,
          limitQuantityPerCheckout: 10,
          trackInventoryByDefault: false,
          reserveStockDurationAnonymousUser: 60,
          reserveStockDurationAuthenticatedUser: 60,
          defaultDigitalMaxDownloads: 10,
          defaultDigitalUrlValidDays: 10,
          defaultWeightUnit: "KG" as const,
          allowLoginWithoutConfirmation: false,
        },
        channels: [],
        productTypes: { edges: [] },
        pageTypes: { edges: [] },
        categories: {
          edges: [
            {
              node: {
                id: "1",
                name: "Parent",
                slug: "parent",
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
                parent: { id: "1", slug: "parent" },
              },
            },
          ],
        },
        shippingZones: null,
        warehouses: null,
        products: { edges: [] },
        taxClasses: { edges: [] },
      };

      const mockRepository = {
        fetchConfig: vi.fn().mockResolvedValue(mockRawConfig),
      };

      const yamlManager = new YamlConfigurationManager(TEST_CONFIG_PATH);
      const configService = new ConfigurationService(mockRepository, yamlManager);

      // Get the mapped configuration
      const config = configService.mapConfig(mockRawConfig);

      // Save to YAML
      await yamlManager.save(config);

      // Read the raw YAML content to check formatting
      const yamlContent = readFileSync(TEST_CONFIG_PATH, "utf-8");

      // Check proper indentation for nested structure
      expect(yamlContent).toContain("categories:");
      expect(yamlContent).toContain("  - name: Parent");
      expect(yamlContent).toContain("    subcategories:");
      expect(yamlContent).toContain("      - name: Child");

      // Clean up
      unlinkSync(TEST_CONFIG_PATH);
    });
  });
});
