import type { CombinedError } from "@urql/core";
import { describe, expect, it } from "vitest";
import { GraphQLError, GraphQLUnknownError } from "../graphql";

describe("GraphQLError", () => {
  describe("constructor", () => {
    it("should create GraphQL errors with code", () => {
      const error = new GraphQLError("Test error");

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("GRAPHQL_ERROR");
      expect(error.name).toBe("GraphQLError");
    });
  });

  describe("fromGraphQLErrors", () => {
    it("should format permission errors with suggestions", () => {
      const graphQLErrors = [
        {
          message: "You need one of the following permissions: MANAGE_PRODUCTS",
          extensions: { code: "FORBIDDEN" },
          locations: undefined,
          path: undefined,
          source: undefined,
          positions: undefined,
          originalError: undefined,
          nodes: undefined,
        },
      ];

      const error = GraphQLError.fromGraphQLErrors(
        graphQLErrors as unknown as Parameters<typeof GraphQLError.fromGraphQLErrors>[0],
        "Failed to create product"
      );

      expect(error.message).toContain("Failed to create product");
      expect(error.message).toContain("You need one of the following permissions: MANAGE_PRODUCTS");
      expect(error.code).toBe("GRAPHQL_ERROR");
    });

    it("should handle multiple permissions", () => {
      const graphQLErrors = [
        {
          message: "You need one of the following permissions: MANAGE_PRODUCTS, MANAGE_STAFF",
          extensions: { code: "FORBIDDEN" },
          locations: undefined,
          path: undefined,
          source: undefined,
          positions: undefined,
          originalError: undefined,
          nodes: undefined,
        },
      ];

      const error = GraphQLError.fromGraphQLErrors(
        graphQLErrors as unknown as Parameters<typeof GraphQLError.fromGraphQLErrors>[0],
        "Failed to update"
      );

      expect(error.message).toContain(
        "You need one of the following permissions: MANAGE_PRODUCTS, MANAGE_STAFF"
      );
    });

    it("should handle validation errors", () => {
      const graphQLErrors = [
        {
          message: "Invalid input",
          extensions: { code: "GRAPHQL_VALIDATION_FAILED" },
          path: ["product", "name"],
          locations: undefined,
          source: undefined,
          positions: undefined,
          originalError: undefined,
          nodes: undefined,
        },
        {
          message: "Required field",
          extensions: { code: "GRAPHQL_VALIDATION_FAILED" },
          path: ["product", "slug"],
          locations: undefined,
          source: undefined,
          positions: undefined,
          originalError: undefined,
          nodes: undefined,
        },
      ];

      const error = GraphQLError.fromGraphQLErrors(
        graphQLErrors as unknown as Parameters<typeof GraphQLError.fromGraphQLErrors>[0],
        "Failed to create product"
      );

      expect(error.message).toContain("Failed to create product");
      expect(error.message).toContain("Invalid input");
      expect(error.message).toContain("Required field");
      expect(error.message).toContain("path: product.name");
      expect(error.message).toContain("path: product.slug");
    });

    it("should extract field from error message if not in extensions", () => {
      const graphQLErrors = [
        {
          message: 'Variable "$name" of required type "String!" was not provided.',
          extensions: undefined,
          locations: undefined,
          path: undefined,
          source: undefined,
          positions: undefined,
          originalError: undefined,
          nodes: undefined,
        },
      ];

      const error = GraphQLError.fromGraphQLErrors(
        graphQLErrors as unknown as Parameters<typeof GraphQLError.fromGraphQLErrors>[0],
        "Failed to create"
      );

      expect(error.message).toContain(
        'Variable "$name" of required type "String!" was not provided.'
      );
    });
  });

  describe("fromCombinedError", () => {
    it("should detect 404 errors and suggest URL fixes", () => {
      const combinedError = {
        message: "Not found",
        networkError: { statusCode: 404 },
      } as unknown as CombinedError;

      const error = GraphQLError.fromCombinedError("Failed to fetch", combinedError);

      expect(error.message).toContain("Failed to fetch: Not Found (404)");
      expect(error.message).toContain("This usually means:");
      expect(error.message).toContain("Your URL is incorrect or missing the /graphql/ endpoint");
      expect(error.message).toContain("Check your URL and ensure it ends with /graphql/");
      expect(error.code).toBe("GRAPHQL_ERROR");
    });

    it("should detect 403 forbidden errors", () => {
      const combinedError = {
        message: "Forbidden",
        networkError: { statusCode: 403 },
      } as unknown as CombinedError;

      const error = GraphQLError.fromCombinedError("Failed to fetch", combinedError);

      expect(error.message).toContain("Failed to fetch: Permission Denied");
      expect(error.message).toContain(
        "Your authentication token doesn't have the required permissions"
      );
    });

    it("should detect 401 unauthorized errors", () => {
      const combinedError = {
        message: "Unauthorized",
        networkError: { statusCode: 401 },
      } as unknown as CombinedError;

      const error = GraphQLError.fromCombinedError("Failed to fetch", combinedError);

      expect(error.message).toContain("Failed to fetch: Unauthorized (401)");
      expect(error.message).toContain("Your authentication token is missing or invalid");
    });

    it("should detect connection errors", () => {
      const combinedError = {
        message: "Connection error",
        networkError: {
          code: "ENOTFOUND",
          message: "getaddrinfo ENOTFOUND example.com",
        },
      } as unknown as CombinedError;

      const error = GraphQLError.fromCombinedError("Failed to connect", combinedError);

      expect(error.message).toContain("Failed to connect: Connection error");
    });

    it("should handle GraphQL errors in CombinedError", () => {
      const combinedError = {
        message: "GraphQL error",
        graphQLErrors: [
          {
            message: "Field error",
            extensions: { code: "BAD_USER_INPUT" },
          },
        ],
      } as unknown as CombinedError;

      const error = GraphQLError.fromCombinedError("Failed to process", combinedError);

      expect(error.message).toContain("Failed to process");
      expect(error.message).toContain("Field error");
    });
  });

  describe("fromDataErrors", () => {
    it("should format business logic errors", () => {
      const dataErrors = [
        { message: "Slug already exists", field: "slug" },
        { message: "Invalid SKU format", field: "sku" },
      ];

      const error = GraphQLError.fromDataErrors("Failed to create product", dataErrors);

      expect(error.message).toContain("Failed to create product");
      expect(error.message).toContain("[slug] Slug already exists");
      expect(error.message).toContain("[sku] Invalid SKU format");
      expect(error.code).toBe("GRAPHQL_ERROR");
    });

    it("should handle errors without field", () => {
      const dataErrors = [
        { message: "General error" },
        { message: "Another error", field: "field1" },
      ];

      const error = GraphQLError.fromDataErrors("Failed", dataErrors);

      expect(error.message).toContain("Failed");
      expect(error.message).toContain("General error");
      expect(error.message).toContain("[field1] Another error");
    });
  });
});

describe("GraphQLUnknownError", () => {
  it("should create unknown GraphQL errors", () => {
    const error = new GraphQLUnknownError("Something went wrong");

    expect(error).toBeInstanceOf(GraphQLError);
    expect(error.message).toContain("Something went wrong");
    expect(error.code).toBe("GRAPHQL_ERROR");
  });
});
