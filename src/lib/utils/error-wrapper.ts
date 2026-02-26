import type { CombinedError } from "@urql/core";
import { GraphQLError } from "../errors/graphql";
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
      throw new ErrorClass(message, entityIdentifier);
    }

    const message = `Failed to ${operation} for ${context}: ${
      error instanceof Error ? error.message : String(error)
    }`;
    throw new Error(message);
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
      const result = await Promise.allSettled([
        (async () => {
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
        })(),
      ]);
      results.push(result[0]);
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
