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
import { rateLimiter } from "../utils/resilience";
import { resilienceTracker } from "../utils/resilience-tracker";

function handleRateLimitEvent(error?: unknown): void {
  const retryAfterMs = error ? extractRetryAfterMs(error) : null;
  rateLimiter.trackRateLimit(retryAfterMs);
  resilienceTracker.recordRateLimit();
  resilienceTracker.recordRetry();
}

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

          if (hasResponseWithStatus(error) && error.response.status === 429) {
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
