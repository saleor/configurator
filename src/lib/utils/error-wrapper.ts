import type { CombinedError } from "@urql/core";
import { GraphQLError } from "../errors/graphql";
import {
  AttributeNotFoundError,
  InlineAttributeError,
  WrongAttributeTypeError,
} from "../errors/validation-errors";
import { logger } from "../logger";
import { isTransientError } from "./error-classification";

function isCombinedError(error: unknown): error is CombinedError {
  if (typeof error !== "object" || error === null || !("graphQLErrors" in error)) {
    return false;
  }
  return Array.isArray(error.graphQLErrors);
}

type ErrorConstructor = new (message: string, entityIdentifier?: string) => Error;

export async function wrapServiceCall<T>(
  operation: string,
  entityType: string,
  entityIdentifier: string | undefined,
  fn: () => Promise<T>,
  ErrorClass?: ErrorConstructor
): Promise<T> {
  const context = entityIdentifier ? `${entityType} '${entityIdentifier}'` : entityType;

  try {
    logger.debug(`Starting ${operation}`, { entityType, entityIdentifier });
    const result = await fn();
    logger.debug(`Completed ${operation}`, { entityType, entityIdentifier });
    return result;
  } catch (error) {
    if (isTransientError(error)) {
      throw error;
    }

    logger.error(`Failed ${operation}`, {
      entityType,
      entityIdentifier,
      error: error instanceof Error ? error.message : String(error),
    });

    // Preserve structured validation errors that carry recovery suggestions, similar names, etc.
    // These should not be wrapped into generic service errors as that loses their structured data.
    if (
      error instanceof AttributeNotFoundError ||
      error instanceof WrongAttributeTypeError ||
      error instanceof InlineAttributeError
    ) {
      throw error;
    }

    if (ErrorClass && error instanceof ErrorClass) {
      throw error;
    }

    if (isCombinedError(error)) {
      throw GraphQLError.fromCombinedError(`Failed to ${operation} for ${context}`, error);
    }

    if (ErrorClass) {
      const message = `Failed to ${operation} for ${context}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      const wrapped = new ErrorClass(message, entityIdentifier);
      if (error instanceof Error) {
        wrapped.cause = error;
      }
      throw wrapped;
    }

    const message = `Failed to ${operation} for ${context}: ${
      error instanceof Error ? error.message : String(error)
    }`;
    throw new Error(message, { cause: error instanceof Error ? error : undefined });
  }
}

export async function wrapBatch<T, R>(
  items: T[],
  operation: string,
  getIdentifier: (item: T) => string,
  processFn: (item: T) => Promise<R>,
  options?: {
    sequential?: boolean;
    delayMs?: number;
  }
): Promise<{
  successes: Array<{ item: T; result: R }>;
  failures: Array<{ item: T; error: Error }>;
}> {
  const { sequential = false, delayMs = 0 } = options ?? {};

  let results: PromiseSettledResult<
    { item: T; success: true; result: R } | { item: T; success: false; error: Error }
  >[];

  if (sequential) {
    results = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (i > 0 && delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      try {
        const result = await processFn(item);
        results.push({
          status: "fulfilled" as const,
          value: { item, success: true as const, result },
        });
      } catch (error) {
        if (isTransientError(error)) {
          throw error;
        }
        results.push({
          status: "fulfilled" as const,
          value: {
            item,
            success: false as const,
            error: error instanceof Error ? error : new Error(String(error)),
          },
        });
      }
    }
  } else {
    results = await Promise.allSettled(
      items.map(async (item) => {
        try {
          const result = await processFn(item);
          return { item, success: true as const, result };
        } catch (error) {
          if (isTransientError(error)) {
            throw error;
          }
          return {
            item,
            success: false as const,
            error: error instanceof Error ? error : new Error(String(error)),
          };
        }
      })
    );
  }

  const successes: Array<{ item: T; result: R }> = [];
  const failures: Array<{ item: T; error: Error }> = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      if (result.value.success) {
        successes.push({ item: result.value.item, result: result.value.result });
      } else {
        failures.push({ item: result.value.item, error: result.value.error });
      }
    } else {
      // Transient errors (rate-limit, network) must propagate for retry, not be collected as failures
      if (isTransientError(result.reason)) {
        throw result.reason;
      }
      const item = items[i];
      logger.error(`Unexpected rejection in ${operation} batch`, {
        identifier: getIdentifier(item),
        reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
      failures.push({
        item,
        error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
      });
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

export const ServiceErrorWrapper = {
  wrapServiceCall,
  wrapBatch,
};
