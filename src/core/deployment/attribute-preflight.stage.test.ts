import { describe, expect, it, vi } from "vitest";
import { AttributeCache } from "../../modules/attribute/attribute-cache";
import { attributeChoicesPreflightStage } from "./stages";
import type { DeploymentContext } from "./types";

describe("attributeChoicesPreflightStage", () => {
  const makeContext = (withProductChange = true): DeploymentContext => {
    const config = {
      products: [
        {
          name: "P",
          slug: "p",
          productType: "T",
          category: "c",
          attributes: { "Country of Production": "Spain", Technology: "Wind" },
          variants: [],
        },
      ],
    } as any;

    const attributeRepo = {
      getAttributesByNames: vi.fn().mockResolvedValue([
        {
          id: "attr1",
          name: "Country of Production",
          inputType: "DROPDOWN",
          choices: { edges: [{ node: { name: "France" } }] },
        },
        {
          id: "attr2",
          name: "Technology",
          inputType: "MULTISELECT",
          choices: { edges: [] },
        },
      ]),
      updateAttribute: vi.fn().mockResolvedValue(undefined),
    };

    const services = {
      attribute: { repo: attributeRepo },
      configStorage: { load: vi.fn().mockResolvedValue(config) },
      product: { primeAttributeCache: vi.fn() },
    } as any;

    const summary = withProductChange
      ? {
          totalChanges: 1,
          creates: 1,
          updates: 0,
          deletes: 0,
          results: [{ entityType: "Products", entityName: "p", operation: "CREATE" }],
        }
      : { totalChanges: 0, creates: 0, updates: 0, deletes: 0, results: [] };

    return {
      configurator: { services } as any,
      args: {
        url: "",
        token: "",
        config: "config.yml",
        quiet: true,
        ci: true,
        verbose: false,
      } as any,
      summary: summary as any,
      startTime: new Date(),
      attributeCache: new AttributeCache(),
    };
  };

  it("skips when there are no product changes", async () => {
    const ctx = makeContext(false);
    const shouldSkip = attributeChoicesPreflightStage.skip?.(ctx) ?? false;
    expect(shouldSkip).toBe(true);
  });

  it("adds missing choice values when products use them", async () => {
    const ctx = makeContext(true);
    await attributeChoicesPreflightStage.execute(ctx);

    // addValues called for missing Spain and Wind
    expect(ctx.configurator.services.attribute.repo.updateAttribute).toHaveBeenCalled();
    expect(ctx.configurator.services.product.primeAttributeCache).toHaveBeenCalled();
  });
});
