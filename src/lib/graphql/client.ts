import { Client, fetchExchange, type Operation } from "@urql/core";
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
  parseRetryAfter,
} from "../utils/error-classification";
import { resilienceTracker } from "../utils/resilience-tracker";
import {
  GraphQLGovernor,
  type GraphQLGovernorStats,
  getGraphQLGovernorConfigFromEnv,
} from "./governor";
import { isRetryableTransportStatus, shouldRetryOperation } from "./retry-policy";

function getOperationDetails(operation: Operation): {
  operationKind: string;
  operationName: string;
  retryOperationName: string | null;
  operationKey: string;
} {
  const operationDefinition = operation.query.definitions.find(
    (definition) => definition.kind === "OperationDefinition"
  );
  const fallbackOperationName =
    operationDefinition && "name" in operationDefinition && operationDefinition.name
      ? operationDefinition.name.value
      : null;
  const retryOperationName = operation.context.operationName || fallbackOperationName;
  const operationKind = operation.kind;
  const operationName = retryOperationName || "anonymous";
  return {
    operationKind,
    operationName,
    retryOperationName,
    operationKey: `${operationKind} ${operationName}`,
  };
}

function logRetryEvent(
  message: string,
  details: {
    operationKind: string;
    operationName: string;
    status?: number;
    retryAfterMs?: number | null;
    governorStats: GraphQLGovernorStats;
    error?: unknown;
  }
): void {
  logger.warn(message, {
    operationKind: details.operationKind,
    operationName: details.operationName,
    status: details.status,
    retryAfterMs: details.retryAfterMs,
    queued: details.governorStats.queued,
    running: details.governorStats.running,
    cooldownMs: details.governorStats.cooldownMs,
    error:
      details.error instanceof Error
        ? details.error.message
        : details.error
          ? String(details.error)
          : undefined,
  });
}

export const createClient = (token: string, url: string) => {
  const governor = new GraphQLGovernor(getGraphQLGovernorConfigFromEnv());

  return new Client({
    url,
    requestPolicy: "network-only",
    fetch: (input, init) =>
      governor.schedule(async () => {
        const response = await globalThis.fetch(input, init);
        if (response.status === 429) {
          const retryAfterMs = parseRetryAfter(
            response.headers.get("Retry-After") || response.headers.get("retry-after")
          );
          governor.registerRateLimit(retryAfterMs);
          resilienceTracker.recordRateLimit();

          const governorStats = governor.getStats();
          logger.warn("HTTP 429 received from GraphQL transport", {
            status: response.status,
            retryAfterMs,
            queued: governorStats.queued,
            running: governorStats.running,
            cooldownMs: governorStats.cooldownMs,
          });
        }
        return response;
      }),
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
          const unknownError: unknown = error;
          const { operationKind, operationName, retryOperationName, operationKey } =
            getOperationDetails(operation);

          if (!shouldRetryOperation(operationKind, retryOperationName)) {
            return false;
          }

          if (hasResponseWithStatus(unknownError)) {
            const status = unknownError.response.status;
            if (isRetryableTransportStatus(status)) {
              if (status === 429) {
                const retryAfterMs = extractRetryAfterMs(unknownError);
                governor.registerRateLimit(retryAfterMs);
                resilienceTracker.recordRateLimit(operationKey);
                resilienceTracker.recordRetry(operationKey);
                logRetryEvent("Rate limited GraphQL operation, retrying", {
                  operationKind,
                  operationName,
                  status,
                  retryAfterMs,
                  governorStats: governor.getStats(),
                });
              } else {
                resilienceTracker.recordRetry(operationKey);
                logRetryEvent("Retryable transport error, retrying", {
                  operationKind,
                  operationName,
                  status,
                  governorStats: governor.getStats(),
                });
              }

              return true;
            }
          }

          if (hasGraphQLRateLimitError(unknownError)) {
            governor.registerRateLimit(null);
            resilienceTracker.recordRateLimit(operationKey);
            resilienceTracker.recordRetry(operationKey);
            logRetryEvent("GraphQL rate-limit error, retrying", {
              operationKind,
              operationName,
              retryAfterMs: null,
              governorStats: governor.getStats(),
            });
            return true;
          }

          if (hasNetworkError(unknownError) && unknownError.networkError) {
            resilienceTracker.recordNetworkError(operationKey);
            resilienceTracker.recordRetry(operationKey);
            logRetryEvent("Network error on GraphQL operation, retrying", {
              operationKind,
              operationName,
              governorStats: governor.getStats(),
              error: unknownError.networkError,
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
