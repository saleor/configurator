import { describe, expect, it } from "vitest";
import type { ConfigurationOperations, RawSaleorConfig } from "./repository";
import { ConfigurationService } from "./config-service";
import type { ConfigurationStorage } from "./yaml-manager";

class MemoryStorage implements ConfigurationStorage {
  saved?: any;
  async save(config: any): Promise<void> { this.saved = config; }
  async load(): Promise<any> { return this.saved; }
}

function makeService(raw: RawSaleorConfig) {
  const repo: ConfigurationOperations = { fetchConfig: async () => raw };
  const storage = new MemoryStorage();
  return new ConfigurationService(repo, storage);
}

describe("ConfigurationService – attributes introspection", () => {
  it("includes all choices when attribute has >10 values (uses 100 page size)", async () => {
    const values = Array.from({ length: 12 }, (_, i) => ({ node: { name: `v${i+1}` } }));
    const raw = {
      shop: {},
      channels: [],
      productTypes: { edges: [ { node: { id: "pt1", name: "Type", isShippingRequired: true, productAttributes: [ { id: "a1", name: "Countries", type: "PRODUCT_TYPE", inputType: "DROPDOWN", choices: { edges: values } } ], assignedVariantAttributes: [] } } ] },
      pageTypes: { edges: [] },
      categories: { edges: [] },
      warehouses: { edges: [] },
      shippingZones: { edges: [] },
      taxClasses: { edges: [] },
      collections: { edges: [] },
      menus: { edges: [] },
      pages: { edges: [] },
      products: { edges: [] },
      attributes: { edges: [] },
    } as unknown as RawSaleorConfig;

    const svc = makeService(raw);
    const cfg = await svc.retrieveWithoutSaving();
    const attrs = cfg.productTypes?.[0]?.productAttributes as any[];
    expect(attrs[0].values.length).toBe(12);
  });

  it("maps unassigned PRODUCT_TYPE attributes into top-level config.attributes", async () => {
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
      attributes: { edges: [ { node: { id: "a1", name: "COD < 15 Years", slug: "cod-less-15-years", type: "PRODUCT_TYPE", inputType: "BOOLEAN", entityType: null, choices: { edges: [] } } } ] },
    } as unknown as RawSaleorConfig;

    const svc = makeService(raw);
    const cfg = await svc.retrieveWithoutSaving();
    expect(cfg.attributes?.length).toBe(1);
    expect(cfg.attributes?.[0]).toMatchObject({ name: "COD < 15 Years", inputType: "BOOLEAN", type: "PRODUCT_TYPE" });
  });
});

