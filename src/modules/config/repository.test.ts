import type { Client, TypedDocumentNode } from "@urql/core";
import { describe, expect, it, vi } from "vitest";
import { ConfigurationRepository } from "./repository";

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

    await (repository as unknown as Record<string, () => Promise<unknown>>)["fetchAllProducts"]();
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
      )["fetchAllAttributes"]();

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
      )["fetchAllAttributes"]();

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
      const result = await (repo as unknown as Record<string, () => Promise<{ edges: unknown[] }>>)[
        "fetchAllAttributes"
      ]();

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
});
