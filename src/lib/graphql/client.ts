/**
 * GraphQL Client Module
 *
 * Provides a configured GraphQL client with:
 * - Bearer token authentication
 * - Automatic retry on rate limiting (HTTP 429) and network errors
 * - Adaptive rate limiting and concurrency control
 * - Resilience tracking for deployment metrics
 */

import { Client, fetchExchange } from "@urql/core";
import { authExchange } from "@urql/exchange-auth";
import { retryExchange } from "@urql/exchange-retry";
import { logger } from "../logger";
import { RetryConfig } from "../utils/bulk-operation-constants";
import {
  extractRetryAfterMs,
  hasExtensionCode,
  hasGraphQLRateLimitError,
  hasNetworkError,
  hasResponseWithStatus,
} from "../utils/error-classification";
import { adjustConcurrency, rateLimiter } from "../utils/resilience";
import { resilienceTracker } from "../utils/resilience-tracker";

/**
 * Handle a rate limit event by tracking metrics and adjusting concurrency
 * @param error - Optional error that may contain Retry-After header
 */
function handleRateLimitEvent(error?: unknown): void {
  const retryAfterMs = error ? extractRetryAfterMs(error) : undefined;
  rateLimiter.trackRateLimit(retryAfterMs);
  resilienceTracker.recordRateLimit();
  resilienceTracker.recordRetry();
  adjustConcurrency(true);
}

/**
 * Creates a configured GraphQL client with authentication and resilience features
 *
 * Features:
 * - Bearer token authentication
 * - Automatic retry on rate limiting (HTTP 429)
 * - Automatic retry on network errors (ECONNREFUSED, ETIMEDOUT, etc.)
 * - Exponential backoff with random jitter
 * - Resilience tracking for deployment metrics
 *
 * @param token - Bearer token for API authentication
 * @param url - GraphQL endpoint URL
 * @returns Configured URQL GraphQL client
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
            return error.graphQLErrors.some((e) => hasExtensionCode(e, "FORBIDDEN"));
          },
          addAuthToOperation(operation) {
            if (!token) return operation;
            return utils.appendHeaders(operation, {
              Authorization: `Bearer ${token}`,
            });
          },
        };
      }),
      retryExchange({
        initialDelayMs: RetryConfig.INITIAL_DELAY_MS,
        maxDelayMs: RetryConfig.MAX_DELAY_MS,
        randomDelay: RetryConfig.USE_RANDOM_DELAY,
        maxNumberAttempts: RetryConfig.MAX_ATTEMPTS,
        retryIf: (error, operation) => {
          const operationLabel = `${operation.kind}${operation.context.operationName ? ` (${operation.context.operationName})` : ""}`;

          if (hasResponseWithStatus(error) && error.response?.status === 429) {
            handleRateLimitEvent(error);
            logger.warn(`Rate limited on ${operationLabel}, retrying...`);
            return true;
          }

          if (hasNetworkError(error) && error.networkError) {
            resilienceTracker.recordNetworkError();
            resilienceTracker.recordRetry();
            logger.warn(`Network error on ${operationLabel}, retrying...`, {
              error:
                error.networkError instanceof Error
                  ? error.networkError.message
                  : String(error.networkError),
            });
            return true;
          }

          if (hasGraphQLRateLimitError(error)) {
            handleRateLimitEvent(error);
            logger.warn(`GraphQL rate limit error on ${operationLabel}, retrying...`);
            return true;
          }

          return false;
        },
      }),
      fetchExchange,
    ],
  });
};
