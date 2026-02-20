import { describe, expect, it } from "vitest";
import { extractRetryAfterMs, isRateLimitError, parseRetryAfter } from "./error-classification";

describe("parseRetryAfter", () => {
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

  it("returns null for non-numeric strings", () => {
    expect(parseRetryAfter("abc")).toBeNull();
    expect(parseRetryAfter("Wed, 21 Oct 2015 07:28:00 GMT")).toBeNull();
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
  it("detects Error with 429 in message", () => {
    expect(isRateLimitError(new Error("HTTP 429"))).toBe(true);
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

  it("returns false for unrelated errors", () => {
    expect(isRateLimitError(new Error("Not found"))).toBe(false);
    expect(isRateLimitError(new Error("Internal server error"))).toBe(false);
  });

  it("detects HTTP 429 response object", () => {
    expect(isRateLimitError({ response: { status: 429 } })).toBe(true);
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
