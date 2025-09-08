import type { CombinedError } from "@urql/core";
import { logger } from "../logger";
import { BaseError, errorFormatHelpers } from "./shared";

// Type guards for error properties
function hasStatus(obj: unknown): obj is { status: number } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "status" in obj &&
    typeof (obj as Record<string, unknown>).status === "number"
  );
}

function hasStatusCode(obj: unknown): obj is { statusCode: number } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "statusCode" in obj &&
    typeof (obj as Record<string, unknown>).statusCode === "number"
  );
}

function hasCode(obj: unknown): obj is { code: string } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "code" in obj &&
    typeof (obj as Record<string, unknown>).code === "string"
  );
}

export class GraphQLError extends BaseError {
  constructor(message: string) {
    super(message, "GRAPHQL_ERROR");
  }

  /**
   * Creates a GraphQLError with automatically formatted GraphQL error messages
   */
  static fromGraphQLErrors(errors: CombinedError["graphQLErrors"], message?: string): GraphQLError {
    const formattedErrors = errors.map((error) => {
      let errorMessage = error.message;

      if (error.locations && Array.isArray(error.locations) && error.locations.length > 0) {
        const locations = error.locations.map((loc) => `${loc.line}:${loc.column}`).join(", ");
        errorMessage += ` at ${locations}`;
      }

      if (error.path && Array.isArray(error.path) && error.path.length > 0) {
        errorMessage += ` (path: ${error.path.join(".")})`;
      }

      return errorMessage;
    });

    const combinedMessage = errorFormatHelpers.formatGenericErrorMessage(
      message,
      `GraphQL errors: ${formattedErrors.join("; ")}`
    );

    return new GraphQLError(combinedMessage);
  }

  static fromDataErrors(
    message: string,
    errors: Array<{
      message: string | null | undefined;
      field?: string | null | undefined;
      code?: string | null | undefined;
    }>
  ): GraphQLError {
    if (!errors.length) {
      return new GraphQLError("Unknown GraphQL data error");
    }

    const formatted = errors.map((e) => {
      let msg = e.message ?? "Unknown error";

      if (e.field) msg = `[${e.field}] ${msg}`;
      if (e.code) msg += ` (code: ${e.code})`;
      return msg;
    });

    const combinedMessage = errorFormatHelpers.formatGenericErrorMessage(
      message,
      formatted.join("; ")
    );
    return new GraphQLError(combinedMessage);
  }

  /**
   * Creates a GraphQLError with smart error detection and helpful messages
   */
  static fromCombinedError(message: string, error: CombinedError): GraphQLError {
    if (process.env.NODE_ENV !== "test") {
      logger.error("GraphQL error", { error });
    }
    const errorMessage = error.message;

    // Check for specific network error types
    if (GraphQLError.isForbiddenError(error)) {
      // Extract required permissions from GraphQL errors for better messaging
      const requiredPermissions = new Set<string>();
      if (error.graphQLErrors?.length) {
        error.graphQLErrors.forEach((graphQLError) => {
          const match = graphQLError.message.match(
            /need one of the following permissions: ([^,]+(?:, [^,]+)*)/
          );
          if (match) {
            match[1].split(", ").forEach((perm) => requiredPermissions.add(perm.trim()));
          }
        });
      }

      const permissionList =
        Array.from(requiredPermissions).length > 0
          ? `\n\n  Required permissions: ${Array.from(requiredPermissions).join(", ")}`
          : "";

      return new GraphQLError(
        `${message}: Permission Denied\n\n` +
          `This usually means:\n` +
          `  • Your authentication token doesn't have the required permissions\n` +
          `  • Your token has expired or is invalid\n\n` +
          `💡 Generate a new token with the required permissions in your Saleor Dashboard${permissionList}`
      );
    }

    if (GraphQLError.isNotFoundError(error)) {
      return new GraphQLError(
        `${message}: Not Found (404)\n\n` +
          `This usually means:\n` +
          `  • Your URL is incorrect or missing the /graphql/ endpoint\n` +
          `    Expected format: https://your-store.saleor.cloud/graphql/\n` +
          `  • The Saleor instance doesn't exist at this URL\n\n` +
          `💡 Check your URL and ensure it ends with /graphql/`
      );
    }

    if (GraphQLError.isUnauthorizedError(error)) {
      return new GraphQLError(
        `${message}: Unauthorized (401)\n\n` +
          `This usually means:\n` +
          `  • Your authentication token is missing or invalid\n` +
          `  • Your token has expired\n\n` +
          `💡 Check your token and regenerate it if necessary`
      );
    }

    // Handle GraphQL errors
    if (error.graphQLErrors?.length) {
      return GraphQLError.fromGraphQLErrors(error.graphQLErrors, message);
    }

    // Fallback for other errors
    return new GraphQLError(`${message}: ${errorMessage}`);
  }

  /**
   * Checks if the error is a permission/forbidden error
   */
  static isForbiddenError(error: CombinedError): boolean {
    // Check GraphQL errors for permission denied (primary method for GraphQL APIs)
    if (error.graphQLErrors?.length) {
      const hasPermissionError = error.graphQLErrors.some((graphQLError) => {
        const exceptionCode =
          graphQLError.extensions?.exception &&
          typeof graphQLError.extensions.exception === "object" &&
          "code" in graphQLError.extensions.exception
            ? (graphQLError.extensions.exception as { code: string }).code
            : null;

        return (
          exceptionCode === "PermissionDenied" ||
          graphQLError.message.includes("need one of the following permissions")
        );
      });
      if (hasPermissionError) return true;
    }

    // Fallback to message checking for edge cases
    const message = error.message?.toLowerCase() || "";
    return message.includes("forbidden") || message.includes("403");
  }

  /**
   * Checks if the error is a 404 Not Found error (transport-level only)
   */
  static isNotFoundError(error: CombinedError): boolean {
    // 404 errors are transport-level (invalid endpoint URL)
    if (hasStatus(error.response) && error.response.status === 404) {
      return true;
    }

    // Check networkError for HTTP status properties
    if (error.networkError) {
      if (hasStatus(error.networkError) && error.networkError.status === 404) {
        return true;
      }
      if (hasStatusCode(error.networkError) && error.networkError.statusCode === 404) {
        return true;
      }
    }

    // Fallback to message checking
    const message = error.message?.toLowerCase() || "";
    return message.includes("404") && message.includes("[network]");
  }

  /**
   * Checks if the error is a connection/network error
   */
  static isConnectionError(error: CombinedError): boolean {
    if (!error.networkError) return false;

    // Check for network-related error codes
    if (hasCode(error.networkError)) {
      const code = error.networkError.code.toUpperCase();
      if (code === "ENOTFOUND" || code === "ECONNREFUSED" || code === "ETIMEDOUT") {
        return true;
      }
    }

    // Check error types for fetch failures
    if (error.networkError.name === "TypeError" && error.networkError.message.includes("fetch")) {
      return true;
    }

    // Fallback to message checking
    const message = error.message?.toLowerCase() || "";
    return (
      message.includes("[network]") &&
      (message.includes("enotfound") ||
        message.includes("econnrefused") ||
        message.includes("connection") ||
        message.includes("fetch"))
    );
  }

  /**
   * Checks if the error is a 401 Unauthorized error (transport-level only)
   */
  static isUnauthorizedError(error: CombinedError): boolean {
    // 401 errors are transport-level (missing/invalid Authorization header)
    if (hasStatus(error.response) && error.response.status === 401) {
      return true;
    }

    // Check networkError for HTTP status properties
    if (error.networkError) {
      if (hasStatus(error.networkError) && error.networkError.status === 401) {
        return true;
      }
      if (hasStatusCode(error.networkError) && error.networkError.statusCode === 401) {
        return true;
      }
    }

    // Fallback to message checking
    const message = error.message?.toLowerCase() || "";
    return message.includes("unauthorized") || message.includes("401");
  }
}

export class GraphQLUnknownError extends GraphQLError {
  constructor(message: string) {
    super(errorFormatHelpers.formatGenericErrorMessage(message, "Unknown error"));
  }
}
