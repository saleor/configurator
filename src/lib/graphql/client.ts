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
import { adjustConcurrency, rateLimiter, withConcurrencyLimit } from "../utils/resilience";
import { resilienceTracker } from "../utils/resilience-tracker";

interface ErrorWithResponse {
  response: {
    status?: number;
    headers?: {
      get?: (name: string) => string | null;
    };
  };
}

interface ErrorWithNetworkError {
  networkError: unknown;
}

interface GraphQLErrorItem {
  message?: string;
  extensions?: { code?: string };
}

interface ErrorWithGraphQLErrors {
  graphQLErrors: GraphQLErrorItem[];
}

/** Type guard to check if a value is a non-null object */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Type guard to check if an object has an extensions property with a specific code
 * @param obj - The object to check
 * @param code - The extension code to match
 */
function hasExtensionCode(obj: unknown, code: string): boolean {
  if (!isObject(obj)) return false;
  if (!("extensions" in obj) || !isObject(obj.extensions)) return false;
  return obj.extensions.code === code;
}

/** Network error patterns to detect connectivity issues */
const NETWORK_ERROR_PATTERNS = [
  "network",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "ECONNRESET",
  "fetch failed",
] as const;

/** Check if an error message indicates a network error */
function isNetworkErrorMessage(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return NETWORK_ERROR_PATTERNS.some((pattern) => lowerMessage.includes(pattern.toLowerCase()));
}

/**
 * Type guard to check if an error has a response with an HTTP status code
 * @param error - The error to check
 * @returns True if the error has a response.status property that is a number
 */
function hasResponseWithStatus(error: unknown): error is ErrorWithResponse {
  if (!isObject(error)) return false;
  if (!("response" in error)) return false;
  const response = error.response;
  if (!isObject(response)) return false;
  if (!("status" in response)) return false;
  return typeof response.status === "number";
}

/**
 * Type guard to check if an error has a networkError property
 * @param error - The error to check
 */
function hasNetworkError(error: unknown): error is ErrorWithNetworkError {
  return isObject(error) && "networkError" in error;
}

/**
 * Type guard to check if an error contains GraphQL rate limit errors
 * Detects rate limits via message content or extension code
 * @param error - The error to check
 */
function hasGraphQLRateLimitError(error: unknown): error is ErrorWithGraphQLErrors {
  if (!isObject(error)) return false;
  if (!("graphQLErrors" in error)) return false;
  const graphQLErrors = error.graphQLErrors;
  if (!Array.isArray(graphQLErrors)) return false;

  return graphQLErrors.some((e: unknown) => {
    if (!isObject(e)) return false;
    const message = "message" in e && typeof e.message === "string" ? e.message : "";
    const hasRateLimitMessage = message.toLowerCase().includes("too many requests");
    const hasRateLimitCode = hasExtensionCode(e, "TOO_MANY_REQUESTS");
    return hasRateLimitMessage || hasRateLimitCode;
  });
}

/**
 * Extract the Retry-After delay from an error's response headers
 * @param error - The error that may contain Retry-After header
 * @returns Delay in milliseconds, or undefined if not available
 */
function extractRetryAfterMs(error: unknown): number | undefined {
  if (!hasResponseWithStatus(error)) return undefined;
  const headers = error.response?.headers;
  if (!headers || typeof headers.get !== "function") return undefined;
  const retryAfterHeader = headers.get("Retry-After") || headers.get("retry-after");
  return rateLimiter.parseRetryAfter(retryAfterHeader) ?? undefined;
}

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

/**
 * Options for executeWithResilience wrapper
 */
interface ExecuteWithResilienceOptions {
  /** Label for logging purposes (default: "GraphQL operation") */
  label?: string;
}

/**
 * Wrap a GraphQL operation with resilience patterns
 *
 * Provides:
 * - Concurrency limiting (prevents overwhelming the API)
 * - Automatic error classification and tracking
 * - Proper logging of failures
 *
 * Note: Retry logic is handled by the retryExchange in createClient.
 * This wrapper handles concurrency control and error tracking.
 *
 * @param operation - The async GraphQL operation to execute
 * @param options - Optional configuration
 * @returns The result of the operation
 * @throws The original error after tracking metrics
 */
export async function executeWithResilience<T>(
  operation: () => Promise<T>,
  options?: ExecuteWithResilienceOptions
): Promise<T> {
  const { label = "GraphQL operation" } = options ?? {};

  return withConcurrencyLimit(async () => {
    try {
      const result = await operation();
      adjustConcurrency(false);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes("GraphQL")) {
        resilienceTracker.recordGraphQLError();
      }

      if (error instanceof Error && isNetworkErrorMessage(error.message)) {
        resilienceTracker.recordNetworkError();
      }

      logger.warn(`${label}: Operation failed`, {
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  });
}
