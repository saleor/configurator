import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractRetryAfterMs,
  isNetworkError,
  isRateLimitError,
  isTransientError,
  parseRetryAfter,
} from "./error-classification";

describe("parseRetryAfter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for null/undefined/empty", () => {
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter(undefined)).toBeNull();
    expect(parseRetryAfter("")).toBeNull();
  });

  it("parses integer seconds to milliseconds", () => {
    expect(parseRetryAfter("5")).toBe(5000);
    expect(parseRetryAfter("30")).toBe(30_000);
    expect(parseRetryAfter("0")).toBe(0);
  });

  it("parses decimal seconds", () => {
    expect(parseRetryAfter("1.5")).toBe(1500);
  });

  it("parses HTTP-date values", () => {
    vi.useFakeTimers();
    const now = new Date("2026-02-20T10:00:00.000Z");
    vi.setSystemTime(now);

    expect(parseRetryAfter("Fri, 20 Feb 2026 10:00:03 GMT")).toBe(3000);
    expect(parseRetryAfter("Fri, 20 Feb 2026 09:59:59 GMT")).toBe(0);
  });

  it("returns null for invalid values", () => {
    expect(parseRetryAfter("abc")).toBeNull();
    expect(parseRetryAfter("not-a-date")).toBeNull();
  });

  it("clamps Retry-After to 300000ms", () => {
    expect(parseRetryAfter("999999")).toBe(300_000);

    vi.useFakeTimers();
    const now = new Date("2026-02-20T10:00:00.000Z");
    vi.setSystemTime(now);
    expect(parseRetryAfter("Fri, 20 Feb 2026 10:30:01 GMT")).toBe(300_000);
  });
});

describe("extractRetryAfterMs", () => {
  it("returns null for non-object errors", () => {
    expect(extractRetryAfterMs(null)).toBeNull();
    expect(extractRetryAfterMs("error")).toBeNull();
    expect(extractRetryAfterMs(42)).toBeNull();
  });

  it("returns null when error has no response", () => {
    expect(extractRetryAfterMs({})).toBeNull();
    expect(extractRetryAfterMs(new Error("oops"))).toBeNull();
  });

  it("returns null when response has no headers.get", () => {
    expect(extractRetryAfterMs({ response: { status: 429 } })).toBeNull();
    expect(extractRetryAfterMs({ response: { status: 429, headers: {} } })).toBeNull();
  });

  it("extracts Retry-After from response headers", () => {
    const error = {
      response: {
        status: 429,
        headers: {
          get: (name: string) => (name === "Retry-After" ? "10" : null),
        },
      },
    };
    expect(extractRetryAfterMs(error)).toBe(10_000);
  });

  it("extracts lowercase retry-after header", () => {
    const error = {
      response: {
        status: 429,
        headers: {
          get: (name: string) => (name === "retry-after" ? "5" : null),
        },
      },
    };
    expect(extractRetryAfterMs(error)).toBe(5000);
  });

  it("returns null when Retry-After header is invalid", () => {
    const error = {
      response: {
        status: 429,
        headers: {
          get: () => "not-a-number",
        },
      },
    };
    expect(extractRetryAfterMs(error)).toBeNull();
  });
});

describe("isRateLimitError", () => {
  it("detects HTTP 429 response object (structured check)", () => {
    expect(isRateLimitError({ response: { status: 429 } })).toBe(true);
  });

  it("detects GraphQL rate limit error", () => {
    expect(
      isRateLimitError({
        graphQLErrors: [{ extensions: { code: "TOO_MANY_REQUESTS" } }],
      })
    ).toBe(true);
  });

  it("detects Error with 'rate limit' in message", () => {
    expect(isRateLimitError(new Error("Rate limit exceeded"))).toBe(true);
  });

  it("detects Error with 'too many requests' in message", () => {
    expect(isRateLimitError(new Error("Too Many Requests"))).toBe(true);
  });

  it("detects Error with 'throttl' in message", () => {
    expect(isRateLimitError(new Error("Request throttled"))).toBe(true);
  });

  it("does NOT match bare '429' in message (avoids false positives)", () => {
    expect(isRateLimitError(new Error("Processed 429 items"))).toBe(false);
    expect(isRateLimitError(new Error("Entity ID: 429"))).toBe(false);
  });

  it("returns false for unrelated errors", () => {
    expect(isRateLimitError(new Error("Not found"))).toBe(false);
    expect(isRateLimitError(new Error("Internal server error"))).toBe(false);
  });

  it("returns false for non-429 response object", () => {
    expect(isRateLimitError({ response: { status: 500 } })).toBe(false);
    expect(isRateLimitError({ response: { status: 200 } })).toBe(false);
  });

  it("returns false for non-error primitives", () => {
    expect(isRateLimitError(null)).toBe(false);
    expect(isRateLimitError(undefined)).toBe(false);
    expect(isRateLimitError("string")).toBe(false);
    expect(isRateLimitError(123)).toBe(false);
  });
});

describe("isNetworkError", () => {
  it("detects error with networkError property", () => {
    expect(isNetworkError({ networkError: new Error("fetch failed") })).toBe(true);
  });

  it("detects Error with network error patterns in message", () => {
    expect(isNetworkError(new Error("fetch failed"))).toBe(true);
    expect(isNetworkError(new Error("ECONNREFUSED"))).toBe(true);
    expect(isNetworkError(new Error("ETIMEDOUT"))).toBe(true);
    expect(isNetworkError(new Error("ENOTFOUND"))).toBe(true);
    expect(isNetworkError(new Error("ECONNRESET"))).toBe(true);
  });

  it("returns false for non-network errors", () => {
    expect(isNetworkError(new Error("Not found"))).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});

describe("isTransientError", () => {
  it("returns true for rate limit errors", () => {
    expect(isTransientError({ response: { status: 429 } })).toBe(true);
  });

  it("returns true for network errors", () => {
    expect(isTransientError(new Error("ECONNREFUSED"))).toBe(true);
  });

  it("returns false for domain errors", () => {
    expect(isTransientError(new Error("Entity not found"))).toBe(false);
  });
});
