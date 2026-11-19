import { type Client, CombinedError, type TypedDocumentNode } from "@urql/core";
import { describe, expect, it, vi } from "vitest";
import { ConfigurationRepository } from "./repository";

const removedShopSettingsFields = [
  "automaticFulfillmentDigitalProducts",
  "defaultDigitalMaxDownloads",
  "defaultDigitalUrlValidDays",
] as const;

type MockQueryHandler = (operationName: string, variables: Record<string, unknown>) => unknown;

function createMockClient(queryHandler: MockQueryHandler): Client {
  return {
    query: async (document: TypedDocumentNode, variables: Record<string, unknown>) => {
      const opDef = document.definitions.find(
        (d: { kind: string }) => d.kind === "OperationDefinition"
      ) as { name?: { value: string } } | undefined;
      const name = opDef?.name?.value ?? "unknown";
      return queryHandler(name, variables);
    },
    mutation: async () => {
      throw new Error("Not implemented");
    },
    subscribe: () => {
      throw new Error("Not implemented");
    },
  } as unknown as Client;
}

function makeAttributeEdge(id: string, name: string) {
  return {
    node: {
      id,
      name,
      slug: name.toLowerCase(),
      type: "PRODUCT_TYPE",
      inputType: "DROPDOWN",
      entityType: null,
      choices: { edges: [], pageInfo: { endCursor: null, hasNextPage: false } },
    },
  };
}

function makeChoiceEdge(id: string, name: string) {
  return { node: { id, name, value: name.toLowerCase() } };
}

function makeEmptyConfigData() {
  return {
    shop: null,
    channels: [],
    productTypes: { edges: [] },
    pageTypes: { edges: [] },
    categories: { edges: [] },
    warehouses: { edges: [] },
    collections: { edges: [] },
    menus: { edges: [] },
    taxClasses: { edges: [] },
    shippingZones: { edges: [] },
    attributes: { edges: [] },
    products: { edges: [] },
    pages: { edges: [] },
  };
}

function makeEmptyPage() {
  return { pageInfo: { endCursor: null, hasNextPage: false }, edges: [] };
}

function makeEmptyChoices() {
  return {
    data: {
      attribute: { choices: makeEmptyPage() },
    },
  };
}

describe("ConfigurationRepository", () => {
  it("should not query shop settings removed in Saleor 3.23", async () => {
    const capturedDocuments: TypedDocumentNode[] = [];
    const client = createMockClient((opName) => {
      if (opName === "GetConfig") {
        return { data: makeEmptyConfigData() };
      }

      throw new Error("Skip pagination for this query shape assertion");
    });
    const originalQuery = client.query;
    client.query = ((document: TypedDocumentNode, variables: Record<string, unknown>) => {
      capturedDocuments.push(document);
      return originalQuery(document, variables);
    }) as Client["query"];

    const repository = new ConfigurationRepository(client);

    await repository.fetchConfig();

    const getConfigDocument = capturedDocuments[0];
    const serializedDocument = JSON.stringify(getConfigDocument);
    expect(serializedDocument).toContain('"value":"schemaVersion"');
    expect(serializedDocument).toContain('"value":"useLegacyShippingZoneStockAvailability"');

    for (const field of removedShopSettingsFields) {
      expect(serializedDocument).not.toContain(`"value":"${field}"`);
    }
  });

  it("should keep product channel listings outside variant scope in pagination query", async () => {
    const capturedDocuments: TypedDocumentNode[] = [];

    const mockClient: Client = {
      query: async (document: TypedDocumentNode) => {
        capturedDocuments.push(document);
        return {
          data: {
            products: {
              pageInfo: { endCursor: null, hasNextPage: false },
              edges: [],
            },
          },
        };
      },
      mutation: async () => {
        throw new Error("Not implemented");
      },
      subscribe: () => {
        throw new Error("Not implemented");
      },
    } as unknown as Client;

    const repository = new ConfigurationRepository(mockClient);

    await (repository as unknown as Record<string, () => Promise<unknown>>).fetchAllProducts();
    expect(capturedDocuments).toHaveLength(1);
    const queryDocument = capturedDocuments[0];

    const operation = queryDocument.definitions[0];
    if (operation.kind !== "OperationDefinition" || !operation.selectionSet) {
      throw new Error("Expected operation definition");
    }

    const productsField = operation.selectionSet.selections.find(
      (selection: { kind: string; name?: { value: string } }) =>
        selection.kind === "Field" && selection.name?.value === "products"
    );
    expect(productsField).toBeDefined();

    type FieldSelection = {
      kind: string;
      name?: { value: string };
      selectionSet?: { selections: FieldSelection[] };
    };
    const edgesField = (productsField as FieldSelection)?.selectionSet?.selections.find(
      (selection) => selection.kind === "Field" && selection.name?.value === "edges"
    );
    expect(edgesField).toBeDefined();

    const edgeSelections = (edgesField as FieldSelection)?.selectionSet?.selections ?? [];
    expect(edgeSelections).toHaveLength(1);
    expect(edgeSelections[0].kind).toBe("Field");
    expect(edgeSelections[0].name?.value).toBe("node");

    const nodeSelections = (edgeSelections[0] as FieldSelection).selectionSet?.selections ?? [];
    const variantField = nodeSelections.find(
      (selection) => selection.kind === "Field" && selection.name?.value === "variants"
    );
    expect(variantField).toBeDefined();

    const productLevelChannelListings = nodeSelections.find(
      (selection) => selection.kind === "Field" && selection.name?.value === "channelListings"
    );
    expect(productLevelChannelListings).toBeDefined();
  });

  describe("fetchAllAttributes pagination", () => {
    it("should fetch all attributes across multiple pages", async () => {
      const page1Attrs = Array.from({ length: 100 }, (_, i) =>
        makeAttributeEdge(`attr-${i}`, `Attribute ${i}`)
      );
      const page2Attrs = Array.from({ length: 50 }, (_, i) =>
        makeAttributeEdge(`attr-${100 + i}`, `Attribute ${100 + i}`)
      );

      const client = createMockClient((opName, variables) => {
        if (opName === "GetAttributesPage") {
          const after = variables.after as string | null;
          if (!after) {
            return {
              data: {
                attributes: {
                  pageInfo: { endCursor: "cursor-100", hasNextPage: true },
                  edges: page1Attrs,
                },
              },
            };
          }
          return {
            data: {
              attributes: {
                pageInfo: { endCursor: null, hasNextPage: false },
                edges: page2Attrs,
              },
            },
          };
        }
        if (opName === "GetAttributeChoices") {
          return makeEmptyChoices();
        }
        return { data: {} };
      });

      const repo = new ConfigurationRepository(client);
      const result = await (
        repo as unknown as Record<string, () => Promise<{ edges: Array<{ node: { id: string } }> }>>
      ).fetchAllAttributes();

      expect(result.edges).toHaveLength(150);
      expect(result.edges[0].node.id).toBe("attr-0");
      expect(result.edges[149].node.id).toBe("attr-149");
    });

    it("should paginate choices for attributes with 100+ choices", async () => {
      const page1Choices = Array.from({ length: 100 }, (_, i) =>
        makeChoiceEdge(`choice-${i}`, `Choice ${i}`)
      );
      const page2Choices = Array.from({ length: 30 }, (_, i) =>
        makeChoiceEdge(`choice-${100 + i}`, `Choice ${100 + i}`)
      );

      const client = createMockClient((opName, variables) => {
        if (opName === "GetAttributesPage") {
          return {
            data: {
              attributes: {
                pageInfo: { endCursor: null, hasNextPage: false },
                edges: [makeAttributeEdge("attr-1", "Color")],
              },
            },
          };
        }
        if (opName === "GetAttributeChoices") {
          const after = variables.after as string | null;
          if (!after) {
            return {
              data: {
                attribute: {
                  choices: {
                    pageInfo: { endCursor: "choice-cursor-100", hasNextPage: true },
                    edges: page1Choices,
                  },
                },
              },
            };
          }
          return {
            data: {
              attribute: {
                choices: {
                  pageInfo: { endCursor: null, hasNextPage: false },
                  edges: page2Choices,
                },
              },
            },
          };
        }
        return { data: {} };
      });

      const repo = new ConfigurationRepository(client);
      const result = await (
        repo as unknown as Record<
          string,
          () => Promise<{ edges: Array<{ node: { choices: { edges: unknown[] } } }> }>
        >
      ).fetchAllAttributes();

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.choices.edges).toHaveLength(130);
    });

    it("should handle empty attribute list", async () => {
      const client = createMockClient((opName) => {
        if (opName === "GetAttributesPage") {
          return {
            data: { attributes: makeEmptyPage() },
          };
        }
        return { data: {} };
      });

      const repo = new ConfigurationRepository(client);
      const result = await (
        repo as unknown as Record<string, () => Promise<{ edges: unknown[] }>>
      ).fetchAllAttributes();

      expect(result.edges).toHaveLength(0);
    });
  });

  describe("fetchConfig fallback behavior", () => {
    it("should log a warning when paginated fetch fails and return truncated data", async () => {
      const loggerModule = await import("../../lib/logger");
      const warnSpy = vi.spyOn(loggerModule.logger, "warn");

      let queryCount = 0;
      const client = createMockClient(() => {
        queryCount++;
        if (queryCount === 1) {
          return { data: makeEmptyConfigData() };
        }
        throw new Error("Network timeout");
      });

      const repo = new ConfigurationRepository(client);
      const result = await repo.fetchConfig();

      expect(result).toBeDefined();
      expect(warnSpy).toHaveBeenCalledWith(
        "Paginated fetch failed — falling back to initial query data which may be truncated",
        expect.objectContaining({
          error: "Network timeout",
          truncationRisk: expect.stringContaining("Attributes limited to first 100"),
        })
      );

      warnSpy.mockRestore();
    });

    it("should use paginated data when pagination succeeds", async () => {
      const paginatedAttrs = Array.from({ length: 5 }, (_, i) =>
        makeAttributeEdge(`paginated-${i}`, `PaginatedAttr ${i}`)
      );

      const client = createMockClient((opName) => {
        if (opName === "GetConfig") {
          return {
            data: {
              ...makeEmptyConfigData(),
              attributes: { edges: [makeAttributeEdge("initial-0", "InitialAttr")] },
            },
          };
        }
        if (opName === "GetProductsPage") {
          return { data: { products: makeEmptyPage() } };
        }
        if (opName === "GetAttributesPage") {
          return {
            data: {
              attributes: {
                pageInfo: { endCursor: null, hasNextPage: false },
                edges: paginatedAttrs,
              },
            },
          };
        }
        if (opName === "GetAttributeChoices") {
          return makeEmptyChoices();
        }
        return { data: {} };
      });

      const repo = new ConfigurationRepository(client);
      const result = await repo.fetchConfig();

      expect(result.attributes?.edges).toHaveLength(5);
      expect(result.attributes?.edges[0]?.node?.id).toBe("paginated-0");
    });
  });

  describe("lists longer than one page", () => {
    const paginatedLists = {
      productTypes: "GetConfigProductTypesPage",
      pageTypes: "GetConfigPageTypesPage",
      categories: "GetConfigCategoriesPage",
      warehouses: "GetConfigWarehousesPage",
      shippingZones: "GetConfigShippingZonesPage",
      taxClasses: "GetConfigTaxClassesPage",
      collections: "GetConfigCollectionsPage",
      menus: "GetConfigMenusPage",
      pages: "GetConfigPagesPage",
    } as const;

    function makeCategoryEdges(from: number, count: number) {
      return Array.from({ length: count }, (_, i) => ({
        node: {
          id: `cat-${from + i}`,
          name: `Category ${from + i}`,
          slug: `category-${from + i}`,
          level: 0,
          parent: null,
        },
      }));
    }

    function makeCollectionEdge(products: { pageInfo: unknown; edges: unknown[] }) {
      return {
        node: {
          id: "col-1",
          name: "Summer",
          slug: "summer",
          description: null,
          backgroundImage: null,
          products,
          channelListings: [],
        },
      };
    }

    function makeProductEdges(from: number, count: number) {
      return Array.from({ length: count }, (_, i) => ({
        node: { id: `p-${from + i}`, slug: `product-${from + i}`, name: `Product ${from + i}` },
      }));
    }

    /** Answers the product and attribute page queries that every fetchConfig makes. */
    function answerStandardPages(opName: string) {
      if (opName === "GetProductsPage") return { data: { products: makeEmptyPage() } };
      if (opName === "GetAttributesPage") return { data: { attributes: makeEmptyPage() } };
      if (opName === "GetConfigCustomerTypes") return { data: { customerTypes: makeEmptyPage() } };
      return undefined;
    }

    it("reads every category after the first page", async () => {
      const pageRequests: Record<string, unknown>[] = [];
      const client = createMockClient((opName, variables) => {
        if (opName === "GetConfig") {
          return {
            data: {
              ...makeEmptyConfigData(),
              categories: {
                pageInfo: { endCursor: "cursor-100", hasNextPage: true },
                edges: makeCategoryEdges(0, 100),
              },
            },
          };
        }
        if (opName === "GetConfigCategoriesPage") {
          pageRequests.push(variables);
          return {
            data: {
              categories: {
                pageInfo: { endCursor: "cursor-130", hasNextPage: false },
                edges: makeCategoryEdges(100, 30),
              },
            },
          };
        }
        return answerStandardPages(opName) ?? { data: {} };
      });

      const result = await new ConfigurationRepository(client).fetchConfig();

      expect(result.categories?.edges).toHaveLength(130);
      expect(result.categories?.edges[129]?.node.slug).toBe("category-129");
      expect(pageRequests).toEqual([{ first: 100, after: "cursor-100" }]);
    });

    it("makes no extra requests when a list fits in the first page", async () => {
      const operations: string[] = [];
      const client = createMockClient((opName) => {
        operations.push(opName);
        if (opName === "GetConfig") {
          return {
            data: {
              ...makeEmptyConfigData(),
              categories: {
                pageInfo: { endCursor: "cursor-3", hasNextPage: false },
                edges: makeCategoryEdges(0, 3),
              },
            },
          };
        }
        return answerStandardPages(opName) ?? { data: {} };
      });

      const result = await new ConfigurationRepository(client).fetchConfig();

      expect(result.categories?.edges).toHaveLength(3);
      expect(
        operations.filter((op) => Object.values(paginatedLists).includes(op as never))
      ).toEqual([]);
    });

    it("reads every product of a collection after the first page", async () => {
      const client = createMockClient((opName, variables) => {
        if (opName === "GetConfig") {
          return {
            data: {
              ...makeEmptyConfigData(),
              collections: {
                pageInfo: { endCursor: null, hasNextPage: false },
                edges: [
                  makeCollectionEdge({
                    pageInfo: { endCursor: "products-100", hasNextPage: true },
                    edges: makeProductEdges(0, 100),
                  }),
                ],
              },
            },
          };
        }
        if (opName === "GetConfigCollectionProductsPage") {
          expect(variables).toEqual({ id: "col-1", first: 100, after: "products-100" });
          return {
            data: {
              collection: {
                products: {
                  pageInfo: { endCursor: null, hasNextPage: false },
                  edges: makeProductEdges(100, 5),
                },
              },
            },
          };
        }
        return answerStandardPages(opName) ?? { data: {} };
      });

      const result = await new ConfigurationRepository(client).fetchConfig();

      const products = result.collections?.edges[0]?.node.products?.edges ?? [];
      expect(products).toHaveLength(105);
      expect(products[104]?.node.slug).toBe("product-104");
    });

    it("fails instead of returning a partial list when a later page cannot be read", async () => {
      const client = createMockClient((opName) => {
        if (opName === "GetConfig") {
          return {
            data: {
              ...makeEmptyConfigData(),
              categories: {
                pageInfo: { endCursor: "cursor-100", hasNextPage: true },
                edges: makeCategoryEdges(0, 100),
              },
            },
          };
        }
        if (opName === "GetConfigCategoriesPage") {
          return { error: new CombinedError({ networkError: new Error("Connection reset") }) };
        }
        return answerStandardPages(opName) ?? { data: {} };
      });

      await expect(new ConfigurationRepository(client).fetchConfig()).rejects.toThrow(
        "Failed to fetch categories"
      );
    });

    it("selects the same fields in each page query as in the main query", async () => {
      const documents = new Map<string, TypedDocumentNode>();
      const client = createMockClient((opName) => {
        if (opName === "GetConfig") {
          const firstPages = Object.fromEntries(
            Object.keys(paginatedLists).map((field) => [
              field,
              { pageInfo: { endCursor: "next", hasNextPage: true }, edges: [] },
            ])
          );
          return { data: { ...makeEmptyConfigData(), ...firstPages } };
        }
        return answerStandardPages(opName) ?? { data: {} };
      });
      const originalQuery = client.query;
      client.query = ((document: TypedDocumentNode, variables: Record<string, unknown>) => {
        const operation = document.definitions[0] as { name?: { value: string } };
        documents.set(operation.name?.value ?? "unknown", document);
        return originalQuery(document, variables);
      }) as Client["query"];

      await new ConfigurationRepository(client).fetchConfig();

      const mainQuery = documents.get("GetConfig");
      for (const [field, opName] of Object.entries(paginatedLists)) {
        const pageQuery = documents.get(opName);
        expect(pageQuery, `${opName} was not requested`).toBeDefined();
        expect(listSelection(pageQuery, field), field).toEqual(listSelection(mainQuery, field));
      }
    });
  });
});

/** The fields selected under a top-level list, without source locations. */
function listSelection(document: TypedDocumentNode | undefined, field: string): string {
  const operation = document?.definitions[0] as
    | { selectionSet: { selections: Array<{ name?: { value: string }; selectionSet?: unknown }> } }
    | undefined;
  const listField = operation?.selectionSet.selections.find((s) => s.name?.value === field);
  return JSON.stringify(listField?.selectionSet, (key, value) =>
    key === "loc" ? undefined : value
  );
}
