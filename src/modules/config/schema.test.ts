import { describe, expect, it } from "vitest";
import {
  configSchema,
  type ProductTypeCreateInput,
  type ProductTypeUpdateInput,
  type ChannelCreateInput,
  type ChannelUpdateInput,
  type ShopCreateInput,
  type ShopUpdateInput,
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
      expect(result.productTypes![0]).toEqual({ name: "Book" });
      expect("attributes" in result.productTypes![0]).toBe(false);
    });

    it("should parse update input (name + attributes)", () => {
      const updateInput = {
        productTypes: [
          {
            name: "Book",
            attributes: [
              {
                name: "Genre",
                inputType: "DROPDOWN",
                values: [
                  { name: "Fiction" },
                  { name: "Romance" },
                ],
              },
            ],
          },
        ],
      };

      const result = configSchema.parse(updateInput);
      
      expect(result.productTypes).toHaveLength(1);
      expect(result.productTypes![0]).toEqual({
        name: "Book",
        attributes: [
          {
            name: "Genre",
            inputType: "DROPDOWN",
            values: [
              { name: "Fiction" },
              { name: "Romance" },
            ],
          },
        ],
      });
      expect("attributes" in result.productTypes![0]).toBe(true);
    });

    it("should prioritize update schema over create schema", () => {
      // This tests that the union order (update.or(create)) works correctly
      const ambiguousInput = {
        productTypes: [
          {
            name: "Book",
            attributes: [],
          },
        ],
      };

      const result = configSchema.parse(ambiguousInput);
      
      expect(result.productTypes![0]).toEqual({
        name: "Book",
        attributes: [],
      });
      expect("attributes" in result.productTypes![0]).toBe(true);
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
      expect(result.channels![0]).toEqual({
        name: "Poland",
        currencyCode: "PLN",
        defaultCountry: "PL",
        slug: "poland",
      });
      expect("settings" in result.channels![0]).toBe(false);
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
      
      expect(result.channels![0]).toEqual({
        name: "Poland",
        currencyCode: "PLN",
        defaultCountry: "PL",
        slug: "poland",
        settings: {
          useLegacyErrorFlow: false,
          automaticallyCompleteFullyPaidCheckouts: true,
        },
      });
      expect("settings" in result.channels![0]).toBe(true);
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
      expect(result.pageTypes![0]).toEqual({ name: "Article" });
      expect("attributes" in result.pageTypes![0]).toBe(false);
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
      
      expect(result.pageTypes![0]).toEqual({
        name: "Article",
        attributes: [
          {
            name: "Author",
            inputType: "PLAIN_TEXT",
          },
        ],
      });
      expect("attributes" in result.pageTypes![0]).toBe(true);
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
      expect(result.categories![0]).toEqual({ name: "Electronics" });
      expect("subcategories" in result.categories![0]).toBe(false);
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
      
      expect(result.categories![0]).toEqual({
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
      expect("subcategories" in result.categories![0]).toBe(true);
    });
  });

  describe("Type Inference", () => {
    it("should correctly infer create vs update types", () => {
      // This test ensures TypeScript types work correctly
      const createProductType: ProductTypeCreateInput = {
        name: "Book",
      };

      const updateProductType: ProductTypeUpdateInput = {
        name: "Book",
        attributes: [
          {
            name: "Genre",
            inputType: "DROPDOWN",
            values: [{ name: "Fiction" }],
          },
        ],
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
        settings: {
          useLegacyErrorFlow: false,
        },
      };

      const createShop: ShopCreateInput = {};

      const updateShop: ShopUpdateInput = {
        defaultMailSenderName: "Test Store",
      };

      // If these compile without TypeScript errors, the types are working correctly
      expect(createProductType.name).toBe("Book");
      expect(updateProductType.attributes).toHaveLength(1);
      expect(createChannel.name).toBe("US");
      expect(updateChannel.settings?.useLegacyErrorFlow).toBe(false);
      expect(Object.keys(createShop)).toHaveLength(0);
      expect(updateShop.defaultMailSenderName).toBe("Test Store");
    });
  });

  describe("Schema Validation Errors", () => {
    it("should parse invalid attributes as create input (fallback behavior)", () => {
      const invalidInput = {
        productTypes: [
          {
            name: "Book",
            attributes: [
              {
                name: "Genre",
                inputType: "INVALID_TYPE", // Invalid input type
                values: [{ name: "Fiction" }],
              },
            ],
          },
        ],
      };

      // Union schema behavior: when update schema fails, it falls back to create schema
      // This results in attributes being stripped out and only the name being kept
      const result = configSchema.parse(invalidInput);
      
      expect(result.productTypes).toEqual([{ name: "Book" }]);
      expect("attributes" in result.productTypes![0]).toBe(false);
    });

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
  });
});