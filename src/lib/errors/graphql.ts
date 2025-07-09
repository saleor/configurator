import type { CombinedError } from "@urql/core";
import { BaseError, errorFormatHelpers } from "./shared";

export class GraphQLError extends BaseError {
  constructor(message: string) {
    super(message, "GRAPHQL_ERROR");
  }

  /**
   * Creates a GraphQLError with automatically formatted GraphQL error messages
   */
  static fromGraphQLErrors(
    message: string,
    errors: CombinedError["graphQLErrors"]
  ): GraphQLError {
    const formattedErrors = errors.map((error) => {
      let errorMessage = error.message;

      if (
        error.locations &&
        Array.isArray(error.locations) &&
        error.locations.length > 0
      ) {
        const locations = error.locations
          .map((loc) => `${loc.line}:${loc.column}`)
          .join(", ");
        errorMessage += ` at ${locations}`;
      }

      if (error.path && Array.isArray(error.path) && error.path.length > 0) {
        errorMessage += ` (path: ${error.path.join(".")})`;
      }

      return errorMessage;
    });

    const combinedMessage = `${message}. GraphQL errors: ${formattedErrors.join(
      "; "
    )}`;

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
  static fromCombinedError(
    message: string,
    error: CombinedError
  ): GraphQLError {
    const errorMessage = error.message;

    // Check for specific network error types
    if (GraphQLError.isForbiddenError(error)) {
      return new GraphQLError(
        `${message}: Forbidden (403)\n\n` +
          `This usually means:\n` +
          `  • Your authentication token is invalid or expired\n` +
          `  • Your token doesn't have the required permissions\n\n` +
          `💡 Try generating a new token with all the required permissions`
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

    if (GraphQLError.isConnectionError(error)) {
      return new GraphQLError(
        `${message}: Connection Failed\n\n` +
          `This usually means:\n` +
          `  • Network connectivity issues\n` +
          `  • Invalid domain name in URL\n` +
          `  • Firewall blocking the connection\n\n` +
          `💡 Check your network connection and URL`
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
      return GraphQLError.fromGraphQLErrors(message, error.graphQLErrors);
    }

    // Fallback for other errors
    return new GraphQLError(`${message}: ${errorMessage}`);
  }

  /**
   * Checks if the error is a 403 Forbidden error
   */
  static isForbiddenError(error: CombinedError): boolean {
    // Check response status first (most reliable)
    if (error.response?.status === 403) return true;
    
    // Check networkError properties
    const networkError = error.networkError as any;
    if (networkError?.status === 403 || networkError?.statusCode === 403) return true;
    
    // Fallback to message checking (least reliable)
    const message = error.message.toLowerCase();
    return message.includes("forbidden") || message.includes("403");
  }

  /**
   * Checks if the error is a 404 Not Found error
   */
  static isNotFoundError(error: CombinedError): boolean {
    // Check response status first (most reliable)
    if (error.response?.status === 404) return true;
    
    // Check networkError properties
    const networkError = error.networkError as any;
    if (networkError?.status === 404 || networkError?.statusCode === 404) return true;
    
    // Fallback to message checking
    const message = error.message.toLowerCase();
    return message.includes("404") && message.includes("[network]");
  }

  /**
   * Checks if the error is a connection/network error
   */
  static isConnectionError(error: CombinedError): boolean {
    // Check for network-related error codes
    const networkError = error.networkError as any;
    if (networkError?.code) {
      const code = networkError.code.toUpperCase();
      if (code === "ENOTFOUND" || code === "ECONNREFUSED" || code === "ETIMEDOUT") {
        return true;
      }
    }
    
    // Check error types
    if (networkError?.name === "TypeError" && networkError?.message?.includes("fetch")) {
      return true;
    }
    
    // Fallback to message checking
    const message = error.message.toLowerCase();
    return (
      message.includes("[network]") &&
      (message.includes("enotfound") ||
        message.includes("econnrefused") ||
        message.includes("connection") ||
        message.includes("fetch"))
    );
  }

  /**
   * Checks if the error is a 401 Unauthorized error
   */
  static isUnauthorizedError(error: CombinedError): boolean {
    // Check response status first (most reliable)
    if (error.response?.status === 401) return true;
    
    // Check networkError properties
    const networkError = error.networkError as any;
    if (networkError?.status === 401 || networkError?.statusCode === 401) return true;
    
    // Fallback to message checking
    const message = error.message.toLowerCase();
    return message.includes("unauthorized") || message.includes("401");
  }
}

export class GraphQLUnknownError extends GraphQLError {
  constructor(message: string) {
    super(
      errorFormatHelpers.formatGenericErrorMessage(message, "Unknown error")
    );
  }
}
