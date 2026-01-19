import type { Client, TypedDocumentNode } from "@urql/core";
import { describe, expect, it, vi } from "vitest";
import { GraphQLError } from "../../lib/errors/graphql";
import { ProductTypeRepository } from "./repository";

/** Create a mock client for testing */
const createMockClient = (
  mutationResponse: { data?: unknown; error?: { graphQLErrors: Array<{ message: string }> } } = {}
): Client =>
  ({
    query: vi.fn(),
    mutation: vi.fn().mockResolvedValue(mutationResponse),
    subscribe: vi.fn(),
  }) as unknown as Client;

describe("ProductTypeRepository", () => {
  describe("updateAttributeAssignments", () => {
    it("should update variantSelection on existing attribute assignments", async () => {
      const mockClient = createMockClient({
        data: {
          productAttributeAssignmentUpdate: {
            productType: { id: "product-type-1" },
            errors: [],
          },
        },
      });

      const repository = new ProductTypeRepository(mockClient);

      const result = await repository.updateAttributeAssignments({
        productTypeId: "product-type-1",
        operations: [
          { id: "attr-1", variantSelection: true },
          { id: "attr-2", variantSelection: false },
        ],
      });

      expect(result).toEqual({ id: "product-type-1" });
      expect(mockClient.mutation).toHaveBeenCalledWith(expect.anything(), {
        productTypeId: "product-type-1",
        operations: [
          { id: "attr-1", variantSelection: true },
          { id: "attr-2", variantSelection: false },
        ],
      });
    });

    it("should throw GraphQLError when mutation returns errors", async () => {
      const mockClient = createMockClient({
        data: {
          productAttributeAssignmentUpdate: {
            productType: null,
            errors: [{ message: "Attribute not found" }],
          },
        },
      });

      const repository = new ProductTypeRepository(mockClient);

      await expect(
        repository.updateAttributeAssignments({
          productTypeId: "product-type-1",
          operations: [{ id: "invalid-attr", variantSelection: true }],
        })
      ).rejects.toThrow(GraphQLError);
    });

    it("should throw GraphQLError when productType is null in response", async () => {
      const mockClient = createMockClient({
        data: {
          productAttributeAssignmentUpdate: {
            productType: null,
            errors: [],
          },
        },
      });

      const repository = new ProductTypeRepository(mockClient);

      // When errors array is empty, fromDataErrors returns "Unknown GraphQL data error"
      await expect(
        repository.updateAttributeAssignments({
          productTypeId: "product-type-1",
          operations: [{ id: "attr-1", variantSelection: true }],
        })
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe("assignAttributesToProductType", () => {
    it("should include variantSelection only for VARIANT type when explicitly true", async () => {
      const capturedVariables: unknown[] = [];
      const mockClient: Client = {
        query: vi.fn(),
        mutation: vi.fn().mockImplementation((_doc: TypedDocumentNode, variables: unknown) => {
          capturedVariables.push(variables);
          return Promise.resolve({
            data: {
              productAttributeAssign: {
                productType: { id: "product-type-1" },
                errors: [],
              },
            },
          });
        }),
        subscribe: vi.fn(),
      } as unknown as Client;

      const repository = new ProductTypeRepository(mockClient);

      // Test VARIANT type with variantSelection: true
      await repository.assignAttributesToProductType({
        productTypeId: "product-type-1",
        attributes: [
          { id: "attr-1", variantSelection: true },
          { id: "attr-2", variantSelection: false },
          { id: "attr-3" }, // undefined variantSelection
        ],
        type: "VARIANT",
      });

      expect(capturedVariables[0]).toEqual({
        productTypeId: "product-type-1",
        operations: [
          { id: "attr-1", type: "VARIANT", variantSelection: true },
          { id: "attr-2", type: "VARIANT" }, // false is NOT included
          { id: "attr-3", type: "VARIANT" }, // undefined is NOT included
        ],
      });
    });

    it("should NOT include variantSelection for PRODUCT type", async () => {
      const capturedVariables: unknown[] = [];
      const mockClient: Client = {
        query: vi.fn(),
        mutation: vi.fn().mockImplementation((_doc: TypedDocumentNode, variables: unknown) => {
          capturedVariables.push(variables);
          return Promise.resolve({
            data: {
              productAttributeAssign: {
                productType: { id: "product-type-1" },
                errors: [],
              },
            },
          });
        }),
        subscribe: vi.fn(),
      } as unknown as Client;

      const repository = new ProductTypeRepository(mockClient);

      // Test PRODUCT type - variantSelection should NOT be included
      await repository.assignAttributesToProductType({
        productTypeId: "product-type-1",
        attributes: [{ id: "attr-1", variantSelection: true }],
        type: "PRODUCT",
      });

      expect(capturedVariables[0]).toEqual({
        productTypeId: "product-type-1",
        operations: [
          { id: "attr-1", type: "PRODUCT" }, // variantSelection NOT included for PRODUCT type
        ],
      });
    });
  });
});
