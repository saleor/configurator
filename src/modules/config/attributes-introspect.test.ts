import { describe, expect, it } from "vitest";
import yaml from "yaml";
import { ConfigurationService } from "./config-service";
import type { ConfigurationOperations, RawSaleorConfig } from "./repository";
import type { SaleorConfig } from "./schema/schema";
import type { ConfigurationStorage } from "./yaml-manager";

class MemoryStorage implements ConfigurationStorage {
  saved?: SaleorConfig;
  async save(config: SaleorConfig): Promise<void> {
    this.saved = config;
  }
  async load(): Promise<SaleorConfig> {
    return this.saved ?? ({} as SaleorConfig);
  }
}

function makeService(raw: RawSaleorConfig) {
  const repo: ConfigurationOperations = { fetchConfig: async () => raw };
  const storage = new MemoryStorage();
  return new ConfigurationService(repo, storage);
}

describe("ConfigurationService – attributes introspection", () => {
  it("includes all choices for productAttributes when >10 values exist", async () => {
    const values = Array.from({ length: 12 }, (_, i) => ({ node: { name: `v${i + 1}` } }));
    const raw = {
      shop: {},
      channels: [],
      productTypes: { edges: [] },
      pageTypes: { edges: [] },
      categories: { edges: [] },
      warehouses: { edges: [] },
      shippingZones: { edges: [] },
      taxClasses: { edges: [] },
      collections: { edges: [] },
      menus: { edges: [] },
      pages: { edges: [] },
      products: { edges: [] },
      attributes: {
        edges: [
          {
            node: {
              id: "a1",
              name: "Countries",
              slug: "countries",
              type: "PRODUCT_TYPE",
              inputType: "DROPDOWN",
              entityType: null,
              choices: { edges: values },
            },
          },
        ],
      },
    } as unknown as RawSaleorConfig;

    const svc = makeService(raw);
    const cfg = await svc.retrieveWithoutSaving();
    // PRODUCT_TYPE attributes now go to productAttributes section
    const attrs = cfg.productAttributes;
    expect(attrs).toBeDefined();
    expect(attrs?.[0].inputType).toBe("DROPDOWN");
    if (attrs?.[0].inputType === "DROPDOWN") {
      expect(attrs?.[0].values.length).toBe(12);
    }
  });

  it("maps PRODUCT_TYPE attributes into productAttributes section", async () => {
    const raw = {
      shop: {},
      channels: [],
      productTypes: { edges: [] },
      pageTypes: { edges: [] },
      categories: { edges: [] },
      warehouses: { edges: [] },
      shippingZones: { edges: [] },
      taxClasses: { edges: [] },
      collections: { edges: [] },
      menus: { edges: [] },
      pages: { edges: [] },
      products: { edges: [] },
      attributes: {
        edges: [
          {
            node: {
              id: "a1",
              name: "COD < 15 Years",
              slug: "cod-less-15-years",
              type: "PRODUCT_TYPE",
              inputType: "BOOLEAN",
              entityType: null,
              choices: { edges: [] },
            },
          },
        ],
      },
    } as unknown as RawSaleorConfig;

    const svc = makeService(raw);
    const cfg = await svc.retrieveWithoutSaving();
    // Attributes now go to productAttributes section
    expect(cfg.productAttributes?.length).toBe(1);
    expect(cfg.productAttributes?.[0]).toMatchObject({
      name: "COD < 15 Years",
      inputType: "BOOLEAN",
      // Note: type field is now omitted (section implies PRODUCT_TYPE)
    });
    // Verify type field is not present
    expect((cfg.productAttributes?.[0] as Record<string, unknown>).type).toBeUndefined();
  });

  it("maps PAGE_TYPE attributes into contentAttributes section", async () => {
    const raw = {
      shop: {},
      channels: [],
      productTypes: { edges: [] },
      pageTypes: { edges: [] },
      categories: { edges: [] },
      warehouses: { edges: [] },
      shippingZones: { edges: [] },
      taxClasses: { edges: [] },
      collections: { edges: [] },
      menus: { edges: [] },
      pages: { edges: [] },
      products: { edges: [] },
      attributes: {
        edges: [
          {
            node: {
              id: "a1",
              name: "Author",
              slug: "author",
              type: "PAGE_TYPE",
              inputType: "PLAIN_TEXT",
              entityType: null,
              choices: { edges: [] },
            },
          },
        ],
      },
    } as unknown as RawSaleorConfig;

    const svc = makeService(raw);
    const cfg = await svc.retrieveWithoutSaving();
    // PAGE_TYPE attributes go to contentAttributes section
    expect(cfg.contentAttributes?.length).toBe(1);
    expect(cfg.contentAttributes?.[0]).toMatchObject({
      name: "Author",
      inputType: "PLAIN_TEXT",
    });
    // Verify type field is not present
    expect((cfg.contentAttributes?.[0] as Record<string, unknown>).type).toBeUndefined();
  });

  it("deduplicates attributes by name within each section", async () => {
    const raw = {
      shop: {},
      channels: [],
      productTypes: { edges: [] },
      pageTypes: { edges: [] },
      categories: { edges: [] },
      warehouses: { edges: [] },
      shippingZones: { edges: [] },
      taxClasses: { edges: [] },
      collections: { edges: [] },
      menus: { edges: [] },
      pages: { edges: [] },
      products: { edges: [] },
      attributes: {
        edges: [
          {
            node: {
              id: "a1",
              name: "Brand",
              slug: "brand",
              type: "PRODUCT_TYPE",
              inputType: "PLAIN_TEXT",
              entityType: null,
              choices: { edges: [] },
            },
          },
          {
            node: {
              id: "a2",
              name: "Brand", // Duplicate name
              slug: "brand-2",
              type: "PRODUCT_TYPE",
              inputType: "PLAIN_TEXT",
              entityType: null,
              choices: { edges: [] },
            },
          },
        ],
      },
    } as unknown as RawSaleorConfig;

    const svc = makeService(raw);
    const cfg = await svc.retrieveWithoutSaving();
    // Should deduplicate by name - only first occurrence
    expect(cfg.productAttributes?.length).toBe(1);
    expect(cfg.productAttributes?.[0].name).toBe("Brand");
  });

  it("orders productAttributes before productTypes in YAML output", async () => {
    const raw = {
      shop: {},
      channels: [],
      productTypes: {
        edges: [
          {
            node: {
              id: "pt1",
              name: "Type",
              isShippingRequired: true,
              productAttributes: [],
              assignedVariantAttributes: [],
            },
          },
        ],
      },
      pageTypes: { edges: [] },
      categories: { edges: [] },
      warehouses: { edges: [] },
      shippingZones: { edges: [] },
      taxClasses: { edges: [] },
      collections: { edges: [] },
      menus: { edges: [] },
      pages: { edges: [] },
      products: { edges: [] },
      attributes: {
        edges: [
          {
            node: {
              id: "a1",
              name: "External ID",
              slug: "external-id",
              type: "PRODUCT_TYPE",
              inputType: "PLAIN_TEXT",
              entityType: null,
              choices: { edges: [] },
            },
          },
        ],
      },
    } as unknown as RawSaleorConfig;

    const svc = makeService(raw);
    const cfg = await svc.retrieveWithoutSaving();
    const yml = yaml.stringify(cfg);
    const idxAttr = yml.indexOf("productAttributes:");
    const idxPT = yml.indexOf("productTypes:");
    expect(idxAttr).toBeGreaterThanOrEqual(0);
    expect(idxPT).toBeGreaterThanOrEqual(0);
    expect(idxAttr).toBeLessThan(idxPT);
  });

  it("splits mixed attributes into correct sections", async () => {
    const raw = {
      shop: {},
      channels: [],
      productTypes: { edges: [] },
      pageTypes: { edges: [] },
      categories: { edges: [] },
      warehouses: { edges: [] },
      shippingZones: { edges: [] },
      taxClasses: { edges: [] },
      collections: { edges: [] },
      menus: { edges: [] },
      pages: { edges: [] },
      products: { edges: [] },
      attributes: {
        edges: [
          {
            node: {
              id: "a1",
              name: "Brand",
              slug: "brand",
              type: "PRODUCT_TYPE",
              inputType: "PLAIN_TEXT",
              entityType: null,
              choices: { edges: [] },
            },
          },
          {
            node: {
              id: "a2",
              name: "Author",
              slug: "author",
              type: "PAGE_TYPE",
              inputType: "PLAIN_TEXT",
              entityType: null,
              choices: { edges: [] },
            },
          },
          {
            node: {
              id: "a3",
              name: "Size",
              slug: "size",
              type: "PRODUCT_TYPE",
              inputType: "DROPDOWN",
              entityType: null,
              choices: { edges: [{ node: { name: "S" } }, { node: { name: "M" } }] },
            },
          },
        ],
      },
    } as unknown as RawSaleorConfig;

    const svc = makeService(raw);
    const cfg = await svc.retrieveWithoutSaving();

    // PRODUCT_TYPE attributes
    expect(cfg.productAttributes?.length).toBe(2);
    expect(cfg.productAttributes?.map((a) => a.name)).toContain("Brand");
    expect(cfg.productAttributes?.map((a) => a.name)).toContain("Size");

    // PAGE_TYPE attributes
    expect(cfg.contentAttributes?.length).toBe(1);
    expect(cfg.contentAttributes?.[0].name).toBe("Author");
  });
});
