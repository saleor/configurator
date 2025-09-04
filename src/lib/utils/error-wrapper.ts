import type { CombinedError } from "@urql/core";
import { GraphQLError } from "../errors/graphql";
import { logger } from "../logger";

/**
 * Type guard to check if error is a CombinedError from URQL
 */
function isCombinedError(error: unknown): error is CombinedError {
  return (
    typeof error === "object" &&
    error !== null &&
    "graphQLErrors" in error &&
    Array.isArray((error as Record<string, unknown>).graphQLErrors)
  );
}

/**
 * Wraps a service method with error handling and logging
 */
export async function wrapServiceCall<T>(
  operation: string,
  entityType: string,
  entityIdentifier: string | undefined,
  fn: () => Promise<T>,
  ErrorClass?: new (message: string, entityIdentifier?: string) => Error
): Promise<T> {
  const context = entityIdentifier ? `${entityType} '${entityIdentifier}'` : entityType;

  try {
    logger.debug(`Starting ${operation}`, { entityType, entityIdentifier });
    const result = await fn();
    logger.debug(`Completed ${operation}`, { entityType, entityIdentifier });
    return result;
  } catch (error) {
    logger.error(`Failed ${operation}`, {
      entityType,
      entityIdentifier,
      error: error instanceof Error ? error.message : String(error),
    });

    // If it's already the expected error type, re-throw it
    if (ErrorClass && error instanceof ErrorClass) {
      throw error;
    }

    // Handle GraphQL errors with proper context
    if (isCombinedError(error)) {
      throw GraphQLError.fromCombinedError(`Failed to ${operation} for ${context}`, error);
    }

    // Wrap in the provided error class if available
    if (ErrorClass) {
      const message = `Failed to ${operation} for ${context}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      throw new ErrorClass(message, entityIdentifier);
    }

    // Default error wrapping
    const message = `Failed to ${operation} for ${context}: ${
      error instanceof Error ? error.message : String(error)
    }`;
    throw new Error(message);
  }
}

/**
 * Wraps multiple async operations with individual error handling
 */
export async function wrapBatch<T, R>(
  items: T[],
  operation: string,
  getIdentifier: (item: T) => string,
  processFn: (item: T) => Promise<R>
): Promise<{
  successes: Array<{ item: T; result: R }>;
  failures: Array<{ item: T; error: Error }>;
}> {
  const results = await Promise.allSettled(
    items.map(async (item) => {
      try {
        const result = await processFn(item);
        return { item, success: true as const, result };
      } catch (error) {
        return {
          item,
          success: false as const,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    })
  );

  const successes: Array<{ item: T; result: R }> = [];
  const failures: Array<{ item: T; error: Error }> = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      if (result.value.success) {
        successes.push({ item: result.value.item, result: result.value.result });
      } else {
        failures.push({ item: result.value.item, error: result.value.error });
      }
    }
  }

  if (failures.length > 0) {
    logger.warn(`${operation} completed with ${failures.length} failures`, {
      successCount: successes.length,
      failureCount: failures.length,
      failedItems: failures.map((f) => getIdentifier(f.item)),
    });
  }

  return { successes, failures };
}

/**
 * @deprecated Use named exports instead of the ServiceErrorWrapper class
 */
export const ServiceErrorWrapper = {
  wrapServiceCall,
  wrapBatch,
};
