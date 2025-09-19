import type { Client } from "@urql/core";
import { describe, expect, it } from "vitest";
import { ConfigurationRepository, type RawSaleorConfig } from "./repository";

function makeClient(
  respond: (query: string, variables?: Record<string, unknown> | undefined) => unknown
): Client {
  return {
    query: (_query: unknown, variables?: Record<string, unknown>) => {
      const data = respond("", variables);
      return Promise.resolve({ data });
    },
  } as unknown as Client;
}

describe("ConfigurationRepository – fetchConfig pagination (client stub)", () => {
  it("merges all product pages into the result", async () => {
    // Arrange
    const client = makeClient((_query, variables) => {
      // When variables are undefined or empty, mimic GetConfig
      if (!variables || Object.keys(variables).length === 0) {
        return {
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
          products: {
            edges: [
              {
                node: {
                  id: "p1",
                  name: "P1",
                  slug: "p1",
                  description: null,
                  productType: { id: "t", name: "T" },
                  category: { id: "c", name: "C", slug: "c" },
                  taxClass: null,
                  attributes: [],
                  variants: [],
                  channelListings: [],
                },
              },
            ],
          },
        };
      }
      // When variables include 'after', mimic page queries
      if (variables && Object.hasOwn(variables, "after")) {
        if (!variables.after) {
          return {
            products: {
              pageInfo: { endCursor: "CURSOR_1", hasNextPage: true },
              edges: [
                {
                  node: {
                    id: "p2",
                    name: "P2",
                    slug: "p2",
                    description: null,
                    productType: { id: "t", name: "T" },
                    category: { id: "c", name: "C", slug: "c" },
                    taxClass: null,
                    attributes: [],
                    variants: [],
                    channelListings: [],
                  },
                },
              ],
            },
          };
        }
        return {
          products: {
            pageInfo: { endCursor: null, hasNextPage: false },
            edges: [
              {
                node: {
                  id: "p3",
                  name: "P3",
                  slug: "p3",
                  description: null,
                  productType: { id: "t", name: "T" },
                  category: { id: "c", name: "C", slug: "c" },
                  taxClass: null,
                  attributes: [],
                  variants: [],
                  channelListings: [],
                },
              },
            ],
          },
        };
      }
      return {};
    });
    const repo = new ConfigurationRepository(client);

    // Act
    const data = await repo.fetchConfig();

    // Assert: pagination edges (excluding the initial single edge) are present
    expect(data.products?.edges?.length).toBe(2);
    const slugs = data.products?.edges?.map(
      (e: NonNullable<RawSaleorConfig["products"]>["edges"][number]) => e.node.slug
    );
    expect(slugs).toEqual(["p2", "p3"]);
  });

  it("merges attributes and paginated choices (>100) into the result", async () => {
    const values100 = Array.from({ length: 100 }, (_, i) => ({
      node: { id: `id${i + 1}`, name: `v${i + 1}`, value: `v${i + 1}` },
    }));
    const values20 = Array.from({ length: 20 }, (_, i) => ({
      node: { id: `id${101 + i}`, name: `v${101 + i}`, value: `v${101 + i}` },
    }));

    const client = makeClient((_query, variables) => {
      // Initial GetConfig
      if (!variables || Object.keys(variables).length === 0) {
        return {
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
          attributes: { edges: [] },
        };
      }
      // Attributes page queries (no id, has after)
      if (variables && Object.hasOwn(variables, "after") && !Object.hasOwn(variables, "id")) {
        if (!variables.after) {
          return {
            attributes: {
              pageInfo: { endCursor: "ATTR_CURSOR_1", hasNextPage: true },
              edges: [
                {
                  node: {
                    id: "attr1",
                    name: "Countries",
                    slug: "countries",
                    type: "PRODUCT_TYPE",
                    inputType: "DROPDOWN",
                    entityType: null,
                  },
                },
              ],
            },
          };
        }
        return {
          attributes: {
            pageInfo: { endCursor: null, hasNextPage: false },
            edges: [],
          },
        };
      }
      // Attribute choices page queries (has id)
      if (variables && Object.hasOwn(variables, "id")) {
        // First page of 100
        if (!variables.after) {
          return {
            attribute: {
              choices: {
                pageInfo: { endCursor: "CHOICES_100", hasNextPage: true },
                edges: values100,
              },
            },
          };
        }
        // Second page of 20
        return {
          attribute: {
            choices: { pageInfo: { endCursor: null, hasNextPage: false }, edges: values20 },
          },
        };
      }
      return {};
    });

    const repo = new ConfigurationRepository(client as unknown as Client);
    const data = await repo.fetchConfig();
    const attrs = data.attributes?.edges || [];
    expect(attrs.length).toBe(1);
    const choices = attrs[0]?.node?.choices?.edges || [];
    expect(choices.length).toBe(120);
  });
});
