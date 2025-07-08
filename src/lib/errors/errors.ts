import type { CombinedError } from "@urql/core";

export abstract class BaseError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = this.constructor.name;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class EnvironmentVariableError extends BaseError {
  constructor(message: string) {
    super(message, "ENVIRONMENT_VARIABLE_ERROR");
  }
}

export class GraphQLError extends BaseError {
  constructor(message: string) {
    super(message, "GRAPHQL_ERROR");
  }

  /**
   * Creates a GraphQLError with automatically formatted GraphQL error messages
   */
  static fromGraphQLErrors(
    errors: CombinedError["graphQLErrors"]
  ): GraphQLError {
    const formattedErrors = errors.map((error) => {
      let message = error.message;

      if (
        error.locations &&
        Array.isArray(error.locations) &&
        error.locations.length > 0
      ) {
        const locations = error.locations
          .map((loc) => `${loc.line}:${loc.column}`)
          .join(", ");
        message += ` at ${locations}`;
      }

      if (error.path && Array.isArray(error.path) && error.path.length > 0) {
        message += ` (path: ${error.path.join(".")})`;
      }

      return message;
    });

    const message = `GraphQL errors: ${formattedErrors.join("; ")}`;

    return new GraphQLError(message);
  }

  static fromDataErrors(
    errors: Array<{ message: string; field?: string; code?: string }>,
    operationName?: string
  ): GraphQLError {
    if (!errors.length) {
      return new GraphQLError("Unknown GraphQL data error");
    }
    const formatted = errors.map((e) => {
      let msg = e.message;
      if (e.field) msg = `[${e.field}] ${msg}`;
      if (e.code) msg += ` (code: ${e.code})`;
      return msg;
    });
    const message = operationName
      ? `GraphQL data errors in operation '${operationName}': ${formatted.join(
          "; "
        )}`
      : `GraphQL data errors: ${formatted.join("; ")}`;
    return new GraphQLError(message);
  }
}
