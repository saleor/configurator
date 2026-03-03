import type { Client, TypedDocumentNode } from "@urql/core";
import { describe, expect, it } from "vitest";
import { AttributeRepository } from "./repository";

type MockQueryHandler = (operationName: string, variables: Record<string, unknown>) => unknown;
type DocumentCapturingMockClient = Client & { capturedDocuments: TypedDocumentNode[] };

function createMockClient(handlers: {
  query?: MockQueryHandler;
  mutation?: MockQueryHandler;
}): DocumentCapturingMockClient {
  const capturedDocuments: TypedDocumentNode[] = [];

  return {
    capturedDocuments,
    query: async (document: TypedDocumentNode, variables: Record<string, unknown>) => {
      capturedDocuments.push(document);
      const opDef = document.definitions.find(
        (d: { kind: string }) => d.kind === "OperationDefinition"
      ) as { name?: { value: string } } | undefined;
      const name = opDef?.name?.value ?? "unknown";
      return handlers.query?.(name, variables) ?? { data: {} };
    },
    mutation: async (document: TypedDocumentNode, variables: Record<string, unknown>) => {
      capturedDocuments.push(document);
      const opDef = document.definitions.find(
        (d: { kind: string }) => d.kind === "OperationDefinition"
      ) as { name?: { value: string } } | undefined;
      const name = opDef?.name?.value ?? "unknown";
      return handlers.mutation?.(name, variables) ?? { data: {} };
    },
    subscribe: () => {
      throw new Error("Not implemented");
    },
  } as unknown as DocumentCapturingMockClient;
}

function makeAttributeNode(id: string, name: string) {
  return {
    id,
    name,
    type: "PRODUCT_TYPE",
    inputType: "DROPDOWN",
    entityType: null,
    choices: { edges: [] },
  };
}

function makePage(
  nodes: ReturnType<typeof makeAttributeNode>[],
  hasNextPage: boolean,
  endCursor: string | null
) {
  return {
    data: {
      attributes: {
        pageInfo: { endCursor, hasNextPage },
        edges: nodes.map((node) => ({ node })),
      },
    },
  };
}

describe("AttributeRepository", () => {
  describe("getAttributesByNames pagination", () => {
    it("should fetch all attributes across multiple pages", async () => {
      const page1 = Array.from({ length: 100 }, (_, i) =>
        makeAttributeNode(`attr-${i}`, `Attr ${i}`)
      );
      const page2 = Array.from({ length: 30 }, (_, i) =>
        makeAttributeNode(`attr-${100 + i}`, `Attr ${100 + i}`)
      );

      const client = createMockClient({
        query: (_opName, variables) => {
          const after = variables.after as string | null;
          if (!after) return makePage(page1, true, "cursor-100");
          return makePage(page2, false, null);
        },
      });

      const repo = new AttributeRepository(client);
      const result = await repo.getAttributesByNames({
        names: Array.from({ length: 130 }, (_, i) => `Attr ${i}`),
        type: "PRODUCT_TYPE",
      });

      expect(result).toHaveLength(130);
      expect(result[0].id).toBe("attr-0");
      expect(result[129].id).toBe("attr-129");
    });

    it("should handle exactly 100 attributes in a single page without extra requests", async () => {
      let queryCount = 0;
      const attrs = Array.from({ length: 100 }, (_, i) =>
        makeAttributeNode(`attr-${i}`, `Attr ${i}`)
      );

      const client = createMockClient({
        query: () => {
          queryCount++;
          return makePage(attrs, false, null);
        },
      });

      const repo = new AttributeRepository(client);
      const result = await repo.getAttributesByNames({
        names: Array.from({ length: 100 }, (_, i) => `Attr ${i}`),
        type: "PRODUCT_TYPE",
      });

      expect(result).toHaveLength(100);
      expect(queryCount).toBe(1);
    });

    it("should paginate when results exceed the 100-per-page limit", async () => {
      const requestedCursors: Array<string | null> = [];

      const page1 = Array.from({ length: 100 }, (_, i) =>
        makeAttributeNode(`attr-${i}`, `Attr ${i}`)
      );
      const page2 = Array.from({ length: 100 }, (_, i) =>
        makeAttributeNode(`attr-${100 + i}`, `Attr ${100 + i}`)
      );
      const page3 = Array.from({ length: 50 }, (_, i) =>
        makeAttributeNode(`attr-${200 + i}`, `Attr ${200 + i}`)
      );

      const client = createMockClient({
        query: (_opName, variables) => {
          const after = (variables.after as string | null) ?? null;
          requestedCursors.push(after);
          if (!after) return makePage(page1, true, "cursor-100");
          if (after === "cursor-100") return makePage(page2, true, "cursor-200");
          return makePage(page3, false, null);
        },
      });

      const repo = new AttributeRepository(client);
      const result = await repo.getAttributesByNames({
        names: Array.from({ length: 250 }, (_, i) => `Attr ${i}`),
        type: "PRODUCT_TYPE",
      });

      expect(result).toHaveLength(250);
      expect(requestedCursors).toEqual([null, "cursor-100", "cursor-200"]);
      expect(result[0].id).toBe("attr-0");
      expect(result[249].id).toBe("attr-249");
    });

    it("should pass the after cursor to subsequent page requests", async () => {
      const capturedVariables: Record<string, unknown>[] = [];

      const client = createMockClient({
        query: (_opName, variables) => {
          capturedVariables.push({ ...variables });
          const after = variables.after as string | null;
          if (!after) {
            return makePage([makeAttributeNode("attr-0", "First")], true, "page-2-cursor");
          }
          return makePage([makeAttributeNode("attr-1", "Second")], false, null);
        },
      });

      const repo = new AttributeRepository(client);
      await repo.getAttributesByNames({ names: ["First", "Second"], type: "PRODUCT_TYPE" });

      expect(capturedVariables).toHaveLength(2);
      expect(capturedVariables[0].after).toBeNull();
      expect(capturedVariables[1].after).toBe("page-2-cursor");
    });

    it("should return single-page results without extra requests", async () => {
      let queryCount = 0;
      const client = createMockClient({
        query: () => {
          queryCount++;
          return makePage([makeAttributeNode("attr-1", "Brand")], false, null);
        },
      });

      const repo = new AttributeRepository(client);
      const result = await repo.getAttributesByNames({
        names: ["Brand"],
        type: "PRODUCT_TYPE",
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Brand");
      expect(queryCount).toBe(1);
    });

    it("should return empty array when no attributes match", async () => {
      const client = createMockClient({
        query: () => makePage([], false, null),
      });

      const repo = new AttributeRepository(client);
      const result = await repo.getAttributesByNames({
        names: ["NonExistent"],
        type: "PRODUCT_TYPE",
      });

      expect(result).toHaveLength(0);
    });

    it("should throw on GraphQL errors on first page", async () => {
      const client = createMockClient({
        query: () => ({
          error: {
            graphQLErrors: [{ message: "Query cost exceeded" }],
          },
        }),
      });

      const repo = new AttributeRepository(client);
      await expect(
        repo.getAttributesByNames({ names: ["Brand"], type: "PRODUCT_TYPE" })
      ).rejects.toThrow(/Failed to fetch attributes by names/);
    });

    it("should throw on GraphQL errors on subsequent pages", async () => {
      let callCount = 0;
      const client = createMockClient({
        query: () => {
          callCount++;
          if (callCount === 1) {
            return makePage([makeAttributeNode("attr-0", "First")], true, "cursor-1");
          }
          return {
            error: {
              graphQLErrors: [{ message: "Rate limited" }],
            },
          };
        },
      });

      const repo = new AttributeRepository(client);
      await expect(
        repo.getAttributesByNames({ names: ["First", "Second"], type: "PRODUCT_TYPE" })
      ).rejects.toThrow(/Failed to fetch attributes by names/);
    });

    it("should throw on network errors", async () => {
      const client = createMockClient({
        query: () => ({
          error: {
            message: "Connection refused",
          },
        }),
      });

      const repo = new AttributeRepository(client);
      await expect(
        repo.getAttributesByNames({ names: ["Brand"], type: "PRODUCT_TYPE" })
      ).rejects.toThrow(/Network error while fetching attributes by names/);
    });
  });

  describe("choices(first) limit compliance", () => {
    // Saleor enforces max first: 100 on the choices connection.
    // Exceeding it causes "Requesting N records exceeds the first limit of 100" errors.
    // These tests verify the actual GraphQL documents sent to the client at runtime.

    type ASTNode = {
      kind: string;
      name?: { value: string };
      arguments?: Array<{
        name: { value: string };
        value: { kind: string; value: string };
      }>;
      selectionSet?: { selections: ASTNode[] };
      definitions?: ASTNode[];
    };

    function findChoicesFirstValues(node: ASTNode): number[] {
      const values: number[] = [];
      if (node.kind === "Field" && node.name?.value === "choices") {
        const firstArg = node.arguments?.find((a) => a.name.value === "first");
        if (firstArg?.value.kind === "IntValue") {
          values.push(parseInt(firstArg.value.value, 10));
        }
      }
      if (node.selectionSet) {
        for (const child of node.selectionSet.selections) {
          values.push(...findChoicesFirstValues(child));
        }
      }
      if (node.definitions) {
        for (const def of node.definitions) {
          values.push(...findChoicesFirstValues(def));
        }
      }
      return values;
    }

    it("getAttributesByNames query requests choices(first: 100)", async () => {
      const client = createMockClient({
        query: () => makePage([makeAttributeNode("attr-1", "Brand")], false, null),
      });

      const repo = new AttributeRepository(client);
      await repo.getAttributesByNames({ names: ["Brand"], type: "PRODUCT_TYPE" });

      expect(client.capturedDocuments).toHaveLength(1);
      const limits = findChoicesFirstValues(client.capturedDocuments[0] as unknown as ASTNode);
      expect(limits.length).toBeGreaterThan(0);
      for (const limit of limits) {
        expect(limit).toBeLessThanOrEqual(100);
      }
    });

    it("createAttribute mutation requests choices(first: 100)", async () => {
      const client = createMockClient({
        mutation: () => ({
          data: {
            attributeCreate: {
              attribute: makeAttributeNode("attr-1", "Brand"),
              errors: [],
            },
          },
        }),
      });

      const repo = new AttributeRepository(client);
      await repo.createAttribute({ name: "Brand", type: "PRODUCT_TYPE" });

      expect(client.capturedDocuments).toHaveLength(1);
      const limits = findChoicesFirstValues(client.capturedDocuments[0] as unknown as ASTNode);
      expect(limits.length).toBeGreaterThan(0);
      for (const limit of limits) {
        expect(limit).toBeLessThanOrEqual(100);
      }
    });

    it("updateAttribute mutation requests choices(first: 100)", async () => {
      const client = createMockClient({
        mutation: () => ({
          data: {
            attributeUpdate: {
              attribute: makeAttributeNode("attr-1", "Brand"),
              errors: [],
            },
          },
        }),
      });

      const repo = new AttributeRepository(client);
      await repo.updateAttribute("attr-1", { name: "Brand" });

      expect(client.capturedDocuments).toHaveLength(1);
      const limits = findChoicesFirstValues(client.capturedDocuments[0] as unknown as ASTNode);
      expect(limits.length).toBeGreaterThan(0);
      for (const limit of limits) {
        expect(limit).toBeLessThanOrEqual(100);
      }
    });
  });
});
