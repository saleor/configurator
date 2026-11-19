import { describe, expect, it } from "vitest";
import { checkConfiguration, summarizeUnknownKeys } from "./check-configuration";
import { configSchema } from "./schema/schema";

const warehouse = {
  name: "Main",
  slug: "main",
  email: "",
  isPrivate: false,
  clickAndCollectOption: "DISABLED",
  address: { streetAddress1: "Street 1", city: "Wroclaw", postalCode: "50-001", country: "PL" },
};

function unknownKeysOf(config: unknown) {
  const result = checkConfiguration(config);
  if (!result.success) {
    throw new Error(`Expected a valid config: ${result.error.message}`);
  }
  return result.unknownKeys;
}

describe("checkConfiguration", () => {
  it("returns the same data as parsing with the schema", () => {
    const config = { warehouses: [{ ...warehouse, emial: "x" }] };

    const result = checkConfiguration(config);

    expect(result).toMatchObject({ success: true, data: configSchema.parse(config) });
  });

  it("reports no unknown keys for a config the schema fully covers", () => {
    expect(unknownKeysOf({ warehouses: [warehouse] })).toEqual([]);
  });

  it("reports an unknown top-level section", () => {
    expect(unknownKeysOf({ unknownSection: [] })).toEqual([{ path: "", key: "unknownSection" }]);
  });

  it("reports unknown keys on an entity and on a nested object", () => {
    const config = {
      warehouses: [
        { ...warehouse, emial: "x", address: { ...warehouse.address, cityy: "Wroclaw" } },
      ],
    };

    expect(unknownKeysOf(config)).toEqual([
      { path: "warehouses.0.address", key: "cityy" },
      { path: "warehouses.0", key: "emial" },
    ]);
  });

  it("keeps subcategories and reports only the unknown key inside them", () => {
    const config = {
      categories: [
        {
          name: "Apparel",
          slug: "apparel",
          subcategories: [{ name: "Shirts", slug: "shirts", descripton: "typo" }],
        },
      ],
    };

    const result = checkConfiguration(config);

    expect(result.success && result.data.categories).toEqual([
      { name: "Apparel", slug: "apparel", subcategories: [{ name: "Shirts", slug: "shirts" }] },
    ]);
    expect(result.success && result.unknownKeys).toEqual([
      { path: "categories.0.subcategories.0", key: "descripton" },
    ]);
  });

  it("reports unknown keys on inline attributes and attribute references", () => {
    const config = {
      productTypes: [
        {
          name: "Shirt",
          productAttributes: [
            { name: "Color", inputType: "DROPDOWN", values: [{ name: "Red" }], requird: true },
            { attribute: "Size", requird: true },
          ],
        },
      ],
    };

    expect(unknownKeysOf(config)).toEqual([
      { path: "productTypes.0.productAttributes.0", key: "requird" },
      { path: "productTypes.0.productAttributes.1", key: "requird" },
    ]);
  });

  it("does not report keys of free-form attribute value maps", () => {
    const config = {
      models: [
        { title: "About", slug: "about", modelType: "Page", attributes: { anyAttribute: "x" } },
      ],
    };

    expect(unknownKeysOf(config)).toEqual([]);
  });

  it("fails on invalid values", () => {
    const result = checkConfiguration({ warehouses: [{ ...warehouse, isPrivate: "no" }] });

    expect(result.success).toBe(false);
  });
});

describe("summarizeUnknownKeys", () => {
  it("keeps the exact location of a key that occurs once", () => {
    expect(summarizeUnknownKeys([{ path: "warehouses.0", key: "emial" }])).toEqual([
      {
        location: "warehouses.0.emial",
        occurrences: 1,
        message: 'Unknown key "warehouses.0.emial" is not supported and was ignored',
      },
    ]);
  });

  it("groups a key repeated across entries into one warning", () => {
    const unknownKeys = Array.from({ length: 1200 }, (_, index) => ({
      path: `products.${index}.variants.0`,
      key: "stock",
    }));

    expect(summarizeUnknownKeys(unknownKeys)).toEqual([
      {
        location: "products[].variants[].stock",
        occurrences: 1200,
        message:
          'Unknown key "products[].variants[].stock" is not supported and was ignored (1200 occurrences)',
      },
    ]);
  });

  it("reports a top-level key by name", () => {
    expect(summarizeUnknownKeys([{ path: "", key: "unknownSection" }])[0]?.location).toBe(
      "unknownSection"
    );
  });
});
