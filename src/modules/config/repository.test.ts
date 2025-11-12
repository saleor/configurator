import type { Client, TypedDocumentNode } from "@urql/core";
import { describe, expect, it } from "vitest";
import { ConfigurationRepository } from "./repository";

describe("ConfigurationRepository", () => {
  it("should keep product channel listings outside variant scope in pagination query", async () => {
    const capturedDocuments: TypedDocumentNode[] = [];

    const mockClient: Client = {
      query: async (document: TypedDocumentNode) => {
        capturedDocuments.push(document);
        return {
          data: {
            products: {
              pageInfo: {
                endCursor: null,
                hasNextPage: false,
              },
              edges: [],
            },
          },
        } as any;
      },
      mutation: async () => {
        throw new Error("Not implemented");
      },
      subscribe: () => {
        throw new Error("Not implemented");
      },
    } as unknown as Client;

    const repository = new ConfigurationRepository(mockClient);

    await (repository as any).fetchAllProducts();
    expect(capturedDocuments).toHaveLength(1);
    const queryDocument = capturedDocuments[0];

    const operation = queryDocument.definitions[0];
    if (operation.kind !== "OperationDefinition" || !operation.selectionSet) {
      throw new Error("Expected operation definition");
    }

    const productsField = operation.selectionSet.selections.find(
      (selection: any) => selection.kind === "Field" && selection.name.value === "products"
    );
    expect(productsField).toBeDefined();

    const edgesField = (productsField as any)?.selectionSet?.selections.find(
      (selection: any) => selection.kind === "Field" && selection.name.value === "edges"
    );
    expect(edgesField).toBeDefined();

    const edgeSelections = edgesField?.selectionSet?.selections ?? [];
    expect(edgeSelections).toHaveLength(1);
    expect(edgeSelections[0].kind).toBe("Field");
    expect(edgeSelections[0].name.value).toBe("node");

    const nodeSelections = edgeSelections[0].selectionSet?.selections ?? [];
    const variantField = nodeSelections.find(
      (selection: any) => selection.kind === "Field" && selection.name.value === "variants"
    );
    expect(variantField).toBeDefined();

    const productLevelChannelListings = nodeSelections.find(
      (selection: any) => selection.kind === "Field" && selection.name.value === "channelListings"
    );
    expect(productLevelChannelListings).toBeDefined();
  });
});
