import { Client, fetchExchange } from "@urql/core";
import { authExchange } from "@urql/exchange-auth";
import { retryExchange } from "@urql/exchange-retry";
import { logger } from "../logger";
import { RetryConfig } from "../utils/bulk-operation-constants";
import {
  adjustConcurrency,
  delay,
  isRateLimitError,
  rateLimiter,
  withConcurrencyLimit,
  withRetry,
} from "../utils/resilience";

/**
 * Creates a configured GraphQL client with authentication and retry logic
 *
 * Features:
 * - Bearer token authentication
 * - Automatic retry on rate limiting (HTTP 429)
 * - Automatic retry on network errors
 * - Exponential backoff with random jitter
 *
 * @param token - Bearer token for authentication
 * @param url - GraphQL endpoint URL
 * @returns Configured GraphQL client
 */
export const createClient = (token: string, url: string) => {
  return new Client({
    url,
    requestPolicy: "network-only",
    exchanges: [
      authExchange(async (utils) => {
        return {
          async refreshAuth() {},
          didAuthError(error, _operation) {
            return error.graphQLErrors.some((e) => e.extensions?.code === "FORBIDDEN");
          },
          addAuthToOperation(operation) {
            if (!token) return operation;
            return utils.appendHeaders(operation, {
              Authorization: `Bearer ${token}`,
            });
          },
        };
      }),
      // Add retry exchange for handling rate limiting and network errors
      retryExchange({
        initialDelayMs: RetryConfig.INITIAL_DELAY_MS,
        maxDelayMs: RetryConfig.MAX_DELAY_MS,
        randomDelay: RetryConfig.USE_RANDOM_DELAY,
        maxNumberAttempts: RetryConfig.MAX_ATTEMPTS,
        retryIf: (error, operation) => {
          // Check for rate limiting (429 status)
          if (error && "response" in error && error.response?.status === 429) {
            logger.warn(`Rate limited on operation ${operation.kind}, retrying...`, {
              operationName: operation.context.operationName || "unknown",
            });
            return true;
          }

          // Check for network errors
          if (error && "networkError" in error && error.networkError) {
            logger.warn(`Network error on operation ${operation.kind}, retrying...`, {
              operationName: operation.context.operationName || "unknown",
              error:
                error.networkError instanceof Error
                  ? error.networkError.message
                  : String(error.networkError),
            });
            return true;
          }

          // Check for specific GraphQL errors that indicate rate limiting
          if (
            error?.graphQLErrors?.some(
              (e) =>
                e.message?.toLowerCase().includes("too many requests") ||
                e.extensions?.code === "TOO_MANY_REQUESTS"
            )
          ) {
            logger.warn(`GraphQL rate limit error on operation ${operation.kind}, retrying...`, {
              operationName: operation.context.operationName || "unknown",
            });
            return true;
          }

          return false;
        },
      }),
      fetchExchange,
    ],
  });
};

/**
 * Options for executeWithResilience wrapper
 */
interface ExecuteWithResilienceOptions {
  /** Number of retries (default: 5) */
  retries?: number;
  /** Label for logging purposes */
  label?: string;
}

/**
 * Wrap a GraphQL operation with resilience patterns
 *
 * Combines:
 * - Concurrency limiting (max 10 parallel requests)
 * - Automatic retry with exponential backoff (up to 5 retries)
 * - Adaptive rate limit detection and handling
 * - Retry-After header parsing
 *
 * @param operation - The async GraphQL operation to execute
 * @param options - Optional configuration
 * @returns The result of the operation
 *
 * @example
 * ```typescript
 * const result = await executeWithResilience(
 *   () => client.mutation(myMutation, { input }),
 *   { label: "ProductBulkCreate" }
 * );
 * ```
 */
export async function executeWithResilience<T>(
  operation: () => Promise<T>,
  options?: ExecuteWithResilienceOptions
): Promise<T> {
  const { retries = 5, label = "GraphQL operation" } = options ?? {};

  return withConcurrencyLimit(() =>
    withRetry(
      async () => {
        try {
          const result = await operation();

          // On success, slowly restore concurrency
          adjustConcurrency(false);

          return result;
        } catch (error) {
          if (isRateLimitError(error)) {
            rateLimiter.trackRateLimit();
            adjustConcurrency(true);

            // Check for Retry-After header
            const retryAfter = rateLimiter.parseRetryAfter(
              (
                error as { response?: { headers?: { get?: (name: string) => string | null } } }
              ).response?.headers?.get?.("Retry-After") ?? null
            );

            if (retryAfter) {
              logger.info(`${label}: Waiting ${retryAfter}ms as per Retry-After header`);
              await delay(retryAfter);
            }

            throw error;
          }

          throw error;
        }
      },
      {
        retries,
        minTimeout: rateLimiter.getAdaptiveDelay(1000),
        onFailedAttempt: (context) => {
          logger.warn(`${label}: Attempt ${context.attemptNumber} failed`, {
            retriesLeft: context.retriesLeft,
            error: context.error.message,
          });
        },
      }
    )
  );
}
