export interface ErrorWithResponse {
  response: {
    status: number;
    headers?: {
      get?: (name: string) => string | null;
    };
  };
}

const MAX_RETRY_AFTER_MS = 300_000;

function clampRetryAfter(ms: number): number {
  if (ms < 0) return 0;
  if (ms > MAX_RETRY_AFTER_MS) return MAX_RETRY_AFTER_MS;
  return ms;
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

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function hasExtensionCode(obj: unknown, code: string): boolean {
  if (!isObject(obj)) return false;
  if (!("extensions" in obj) || !isObject(obj.extensions)) return false;
  return obj.extensions.code === code;
}

export const NETWORK_ERROR_PATTERNS = [
  "network",
  "econnrefused",
  "etimedout",
  "enotfound",
  "econnreset",
  "fetch failed",
] as const;

export function isNetworkErrorMessage(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return NETWORK_ERROR_PATTERNS.some((pattern) => lowerMessage.includes(pattern));
}

export function hasResponseWithStatus(error: unknown): error is ErrorWithResponse {
  if (!isObject(error)) return false;
  if (!("response" in error)) return false;
  const response = error.response;
  if (!isObject(response)) return false;
  if (!("status" in response)) return false;
  return typeof response.status === "number";
}

export function hasNetworkError(error: unknown): error is ErrorWithNetworkError {
  return isObject(error) && "networkError" in error;
}

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

export function parseRetryAfter(header: string | null | undefined): number | null {
  if (!header) return null;

  const trimmed = header.trim();
  if (!trimmed) return null;

  const numericSeconds = Number(trimmed);
  if (Number.isFinite(numericSeconds)) {
    return clampRetryAfter(Math.round(numericSeconds * 1000));
  }

  const dateMs = Date.parse(trimmed);
  if (Number.isNaN(dateMs)) {
    return null;
  }

  return clampRetryAfter(dateMs - Date.now());
}

export function extractRetryAfterMs(error: unknown): number | null {
  if (!hasResponseWithStatus(error)) return null;
  const headers = error.response.headers;
  if (!headers || typeof headers.get !== "function") return null;
  const retryAfterHeader = headers.get("Retry-After") || headers.get("retry-after");
  return parseRetryAfter(retryAfterHeader);
}

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

  if (hasResponseWithStatus(error)) {
    return error.response.status === 429;
  }

  return false;
}
