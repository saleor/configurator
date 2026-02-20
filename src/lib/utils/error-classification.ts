/**
 * Type guards and utilities for classifying GraphQL and network errors.
 * Extracted from client.ts to allow reuse across production code and tests.
 *
 * NOTE: This module must NOT import from resilience.ts to avoid pulling in
 * heavy dependencies (opossum, p-retry) that break test loading.
 */

export interface ErrorWithResponse {
  response: {
    status?: number;
    headers?: {
      get?: (name: string) => string | null;
    };
  };
}

export interface ErrorWithNetworkError {
  networkError: unknown;
}

export interface GraphQLErrorItem {
  message?: string;
  extensions?: { code?: string };
}

export interface ErrorWithGraphQLErrors {
  graphQLErrors: GraphQLErrorItem[];
}

/** Type guard to check if a value is a non-null object */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Type guard to check if an object has an extensions property with a specific code
 * @param obj - The object to check
 * @param code - The extension code to match
 */
export function hasExtensionCode(obj: unknown, code: string): boolean {
  if (!isObject(obj)) return false;
  if (!("extensions" in obj) || !isObject(obj.extensions)) return false;
  return obj.extensions.code === code;
}

/** Network error patterns to detect connectivity issues (stored lowercase for efficient comparison) */
export const NETWORK_ERROR_PATTERNS = [
  "network",
  "econnrefused",
  "etimedout",
  "enotfound",
  "econnreset",
  "fetch failed",
] as const;

/** Check if an error message indicates a network error */
export function isNetworkErrorMessage(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return NETWORK_ERROR_PATTERNS.some((pattern) => lowerMessage.includes(pattern));
}

/**
 * Type guard to check if an error has a response with an HTTP status code
 */
export function hasResponseWithStatus(error: unknown): error is ErrorWithResponse {
  if (!isObject(error)) return false;
  if (!("response" in error)) return false;
  const response = error.response;
  if (!isObject(response)) return false;
  if (!("status" in response)) return false;
  return typeof response.status === "number";
}

/**
 * Type guard to check if an error has a networkError property
 */
export function hasNetworkError(error: unknown): error is ErrorWithNetworkError {
  return isObject(error) && "networkError" in error;
}

/**
 * Type guard to check if an error contains GraphQL rate limit errors.
 * Detects rate limits via message content or extension code.
 */
export function hasGraphQLRateLimitError(error: unknown): error is ErrorWithGraphQLErrors {
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
 * Parse a Retry-After header value into milliseconds
 * @returns Delay in milliseconds, or null if header is invalid/missing
 */
export function parseRetryAfter(header: string | null | undefined): number | null {
  if (!header) return null;
  const seconds = Number.parseInt(header, 10);
  return Number.isNaN(seconds) ? null : seconds * 1000;
}

/**
 * Extract the Retry-After delay from an error's response headers
 * @returns Delay in milliseconds, or undefined if not available
 */
export function extractRetryAfterMs(error: unknown): number | undefined {
  if (!hasResponseWithStatus(error)) return undefined;
  const headers = error.response?.headers;
  if (!headers || typeof headers.get !== "function") return undefined;
  const retryAfterHeader = headers.get("Retry-After") || headers.get("retry-after");
  return parseRetryAfter(retryAfterHeader) ?? undefined;
}

/**
 * Check if an error indicates rate limiting.
 * Supports various error formats from different APIs.
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("429") ||
      message.includes("rate limit") ||
      message.includes("too many requests") ||
      message.includes("throttl")
    );
  }

  // Check for HTTP response with 429 status
  if (hasResponseWithStatus(error)) {
    return error.response.status === 429;
  }

  return false;
}
