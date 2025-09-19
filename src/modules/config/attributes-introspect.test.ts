import { describe, expect, it } from "vitest";
import yaml from "yaml";
import { ConfigurationService } from "./config-service";
import type { ConfigurationOperations, RawSaleorConfig } from "./repository";
import type { ConfigurationStorage } from "./yaml-manager";

class MemoryStorage implements ConfigurationStorage {
  saved?: any;
  async save(config: any): Promise<void> {
    this.saved = config;
  }
  async load(): Promise<any> {
    return this.saved;
  }
}

function makeService(raw: RawSaleorConfig) {
  const repo: ConfigurationOperations = { fetchConfig: async () => raw };
  const storage = new MemoryStorage();
  return new ConfigurationService(repo, storage);
}

describe("ConfigurationService – attributes introspection", () => {
  it("includes all choices for attributes when >10 values exist", async () => {
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
    const attrs = cfg.attributes as any[];
    expect(attrs[0].values.length).toBe(12);
  });

  it("maps PRODUCT_TYPE attributes into top-level config.attributes", async () => {
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
    expect(cfg.attributes?.length).toBe(1);
    expect(cfg.attributes?.[0]).toMatchObject({
      name: "COD < 15 Years",
      inputType: "BOOLEAN",
      type: "PRODUCT_TYPE",
    });
  });

  it("orders attributes before productTypes in YAML output", async () => {
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
    const idxAttr = yml.indexOf("attributes:");
    const idxPT = yml.indexOf("productTypes:");
    expect(idxAttr).toBeGreaterThanOrEqual(0);
    expect(idxPT).toBeGreaterThanOrEqual(0);
    expect(idxAttr).toBeLessThan(idxPT);
  });
});
