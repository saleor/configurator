import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createTempDirectory } from "./filesystem";
import { createMinimalConfig, createStandardConfig, createComplexConfig, createInvalidConfig, createLargeConfig, createConfigFile } from "./config-file-builder";
import type { TempDirectory } from "./filesystem";

describe("ConfigFileBuilder", () => {
  let tempDir: TempDirectory;

  beforeEach(() => {
    tempDir = createTempDirectory();
  });

  afterEach(() => {
    tempDir.cleanup();
  });

  describe("Basic Builder Functionality", () => {
    it("should create a simple configuration", () => {
      const config = createConfigFile()
        .withShop({ defaultMailSenderName: "Test Shop" })
        .withChannel({
          name: "Test Channel",
          slug: "test-channel",
          currencyCode: "USD",
          defaultCountry: "US"
        });

      const yaml = config.toYaml();
      expect(yaml).toContain("defaultMailSenderName: Test Shop");
      expect(yaml).toContain("name: Test Channel");
      expect(yaml).toContain("currencyCode: USD");
    });

    it("should support fluent API chaining", () => {
      const config = createConfigFile()
        .withShop({ defaultMailSenderName: "Fluent Shop" })
        .withChannel({
          name: "Channel 1",
          slug: "channel-1",
          currencyCode: "USD",
          defaultCountry: "US"
        })
        .withChannel({
          name: "Channel 2", 
          slug: "channel-2",
          currencyCode: "EUR",
          defaultCountry: "DE"
        })
        .withProductType({
          name: "Electronics",
        });

      const yaml = config.toYaml();
      expect(yaml).toContain("defaultMailSenderName: Fluent Shop");
      expect(yaml).toContain("Channel 1");
      expect(yaml).toContain("Channel 2");
      expect(yaml).toContain("Electronics");
    });

    it("should save files to temp directory", () => {
      const config = createConfigFile()
        .withShop({ defaultMailSenderName: "File Test" });

      const filePath = config.saveToFile(tempDir, "test-config.yml");
      const fileContent = tempDir.readFile("test-config.yml");

      expect(fileContent).toContain("defaultMailSenderName: File Test");
      expect(filePath).toContain("test-config.yml");
    });

    it("should support JSON format", () => {
      const config = createConfigFile()
        .setFormat('json')
        .withShop({ defaultMailSenderName: "JSON Shop" });

      const json = config.toJson();
      const parsed = JSON.parse(json);
      
      expect(parsed.shop.defaultMailSenderName).toBe("JSON Shop");
    });
  });

  describe("Config Templates", () => {
    it("should provide minimal template", () => {
      const config = createMinimalConfig();
      const yaml = config.toYaml();

      expect(yaml).toContain("defaultMailSenderName: Minimal Shop");
      expect(yaml).not.toContain("channels:");
    });

    it("should provide standard template", () => {
      const config = createStandardConfig();
      const yaml = config.toYaml();

      expect(yaml).toContain("defaultMailSenderName: Standard Shop");
      expect(yaml).toContain("channels:");
      expect(yaml).toContain("productTypes:");
    });

    it("should provide complex template", () => {
      const config = createComplexConfig();
      const yaml = config.toYaml();

      expect(yaml).toContain("defaultMailSenderName: Complex Shop");
      expect(yaml).toContain("US Channel");
      expect(yaml).toContain("EU Channel");
      expect(yaml).toContain("Electronics");
      expect(yaml).toContain("Books");
      expect(yaml).toContain("Article");
      expect(yaml).toContain("Gadgets");
    });

    it("should provide large template with custom sizes", () => {
      const config = createLargeConfig({
        channelCount: 2,
        productTypeCount: 5,
        pageTypeCount: 3,
        categoryCount: 4
      });
      
      const content = config.getContent();

      expect(content.channels).toHaveLength(2);
      expect(content.productTypes).toHaveLength(5);
      expect(content.pageTypes).toHaveLength(3);
      expect(content.categories).toHaveLength(4);
    });

    it("should provide invalid template for error testing", () => {
      const config = createInvalidConfig();
      const content = config.getContent();

      expect(content.channels?.[0]?.currencyCode).toBe("INVALID");
      expect(content.productTypes?.[0]?.name).toBe("");
    });
  });

  describe("YAML Generation", () => {
    it("should generate valid YAML with proper formatting", () => {
      const config = createConfigFile()
        .withShop({
          defaultMailSenderName: "YAML Test",
          displayGrossPrices: true,
          trackInventoryByDefault: false
        })
        .withChannels([
          {
            name: "US Channel",
            slug: "us",
            currencyCode: "USD",
            defaultCountry: "US",
            isActive: true
          },
          {
            name: "EU Channel", 
            slug: "eu",
            currencyCode: "EUR",
            defaultCountry: "DE",
            isActive: false
          }
        ]);

      const yaml = config.toYaml();

      // Check structure
      expect(yaml).toContain("shop:");
      expect(yaml).toContain("channels:");
      expect(yaml).toContain("  - name: US Channel");
      expect(yaml).toContain("  - name: EU Channel");
      
      // Check boolean values
      expect(yaml).toContain("displayGrossPrices: true");
      expect(yaml).toContain("trackInventoryByDefault: false");
      expect(yaml).toContain("isActive: true");
      expect(yaml).toContain("isActive: false");
    });

    it("should handle special characters and strings properly", () => {
      const config = createConfigFile()
        .withShop({
          defaultMailSenderName: "Shop: With Special Characters & Numbers 123"
        })
        .withCategory({
          name: "Category with: colons",
        });

      const yaml = config.toYaml();
      
      // Should quote strings with special characters
      expect(yaml).toContain('"Shop: With Special Characters & Numbers 123"');
      expect(yaml).toContain('"Category with: colons"');
    });
  });

  describe("Builder Reset", () => {
    it("should reset builder state", () => {
      const builder = createConfigFile()
        .withShop({ defaultMailSenderName: "Initial Shop" })
        .withChannel({
          name: "Initial Channel",
          slug: "initial",
          currencyCode: "USD",
          defaultCountry: "US"
        });

      // Reset and build different config
      builder.reset()
        .withShop({ defaultMailSenderName: "Reset Shop" });

      const yaml = builder.toYaml();
      expect(yaml).toContain("defaultMailSenderName: Reset Shop");
      expect(yaml).not.toContain("channels:");
    });
  });
}); 