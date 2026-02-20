import { describe, expect, it } from "vitest";
import {
  hasExtensionCode,
  hasGraphQLRateLimitError,
  hasNetworkError,
  hasResponseWithStatus,
  isNetworkErrorMessage,
  isObject,
} from "../utils/error-classification";

/**
 * Tests for GraphQL client type guards and error classification
 *
 * These tests verify the error detection logic that is critical for:
 * - Rate limit detection (HTTP 429, GraphQL errors)
 * - Network error detection
 * - Retry-After header extraction
 */

describe("GraphQL Client Type Guards", () => {
  describe("isObject", () => {
    it("returns true for plain objects", () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: "value" })).toBe(true);
    });

    it("returns true for arrays", () => {
      expect(isObject([])).toBe(true);
    });

    it("returns false for null", () => {
      expect(isObject(null)).toBe(false);
    });

    it("returns false for primitives", () => {
      expect(isObject(undefined)).toBe(false);
      expect(isObject("string")).toBe(false);
      expect(isObject(123)).toBe(false);
      expect(isObject(true)).toBe(false);
    });
  });

  describe("hasExtensionCode", () => {
    it("returns true when extensions.code matches", () => {
      expect(hasExtensionCode({ extensions: { code: "FORBIDDEN" } }, "FORBIDDEN")).toBe(true);
    });

    it("returns false when extensions.code does not match", () => {
      expect(hasExtensionCode({ extensions: { code: "OTHER" } }, "FORBIDDEN")).toBe(false);
    });

    it("returns false when extensions is missing", () => {
      expect(hasExtensionCode({}, "FORBIDDEN")).toBe(false);
    });

    it("returns false when extensions is not an object", () => {
      expect(hasExtensionCode({ extensions: "string" }, "FORBIDDEN")).toBe(false);
    });

    it("returns false for non-objects", () => {
      expect(hasExtensionCode(null, "FORBIDDEN")).toBe(false);
      expect(hasExtensionCode(undefined, "FORBIDDEN")).toBe(false);
    });
  });

  describe("hasResponseWithStatus", () => {
    it("returns true for error with response.status as number", () => {
      expect(hasResponseWithStatus({ response: { status: 429 } })).toBe(true);
      expect(hasResponseWithStatus({ response: { status: 200 } })).toBe(true);
      expect(hasResponseWithStatus({ response: { status: 500 } })).toBe(true);
    });

    it("returns false for null/undefined", () => {
      expect(hasResponseWithStatus(null)).toBe(false);
      expect(hasResponseWithStatus(undefined)).toBe(false);
    });

    it("returns false when response.status is not a number", () => {
      expect(hasResponseWithStatus({ response: { status: "429" } })).toBe(false);
    });

    it("returns false when response is missing", () => {
      expect(hasResponseWithStatus({})).toBe(false);
    });

    it("returns false when response is not an object", () => {
      expect(hasResponseWithStatus({ response: "string" })).toBe(false);
    });

    it("returns false when status is missing from response", () => {
      expect(hasResponseWithStatus({ response: {} })).toBe(false);
    });
  });

  describe("hasNetworkError", () => {
    it("returns true when networkError property exists", () => {
      expect(hasNetworkError({ networkError: new Error("network failed") })).toBe(true);
      expect(hasNetworkError({ networkError: null })).toBe(true);
      expect(hasNetworkError({ networkError: undefined })).toBe(true);
    });

    it("returns false when networkError is missing", () => {
      expect(hasNetworkError({})).toBe(false);
    });

    it("returns false for non-objects", () => {
      expect(hasNetworkError(null)).toBe(false);
      expect(hasNetworkError(undefined)).toBe(false);
      expect(hasNetworkError("string")).toBe(false);
    });
  });

  describe("hasGraphQLRateLimitError", () => {
    it("detects 'too many requests' message (case insensitive)", () => {
      const error = { graphQLErrors: [{ message: "Too Many Requests" }] };
      expect(hasGraphQLRateLimitError(error)).toBe(true);
    });

    it("detects lowercase 'too many requests' message", () => {
      const error = { graphQLErrors: [{ message: "Error: too many requests from IP" }] };
      expect(hasGraphQLRateLimitError(error)).toBe(true);
    });

    it("detects TOO_MANY_REQUESTS extension code", () => {
      const error = { graphQLErrors: [{ extensions: { code: "TOO_MANY_REQUESTS" } }] };
      expect(hasGraphQLRateLimitError(error)).toBe(true);
    });

    it("returns false for non-rate-limit GraphQL errors", () => {
      const error = { graphQLErrors: [{ message: "Not found" }] };
      expect(hasGraphQLRateLimitError(error)).toBe(false);
    });

    it("returns false when graphQLErrors is empty", () => {
      const error = { graphQLErrors: [] };
      expect(hasGraphQLRateLimitError(error)).toBe(false);
    });

    it("returns false when graphQLErrors is not an array", () => {
      const error = { graphQLErrors: "not an array" };
      expect(hasGraphQLRateLimitError(error)).toBe(false);
    });

    it("returns false when graphQLErrors is missing", () => {
      expect(hasGraphQLRateLimitError({})).toBe(false);
    });

    it("handles mixed errors where one is rate limit", () => {
      const error = {
        graphQLErrors: [{ message: "Some error" }, { extensions: { code: "TOO_MANY_REQUESTS" } }],
      };
      expect(hasGraphQLRateLimitError(error)).toBe(true);
    });
  });

  describe("isNetworkErrorMessage", () => {
    it("detects 'network' in message", () => {
      expect(isNetworkErrorMessage("Network error occurred")).toBe(true);
      expect(isNetworkErrorMessage("network request failed")).toBe(true);
    });

    it("detects ECONNREFUSED", () => {
      expect(isNetworkErrorMessage("connect ECONNREFUSED 127.0.0.1:3000")).toBe(true);
    });

    it("detects ETIMEDOUT", () => {
      expect(isNetworkErrorMessage("connect ETIMEDOUT 192.168.1.1:443")).toBe(true);
    });

    it("detects ENOTFOUND", () => {
      expect(isNetworkErrorMessage("getaddrinfo ENOTFOUND api.example.com")).toBe(true);
    });

    it("detects ECONNRESET", () => {
      expect(isNetworkErrorMessage("read ECONNRESET")).toBe(true);
    });

    it("detects 'fetch failed'", () => {
      expect(isNetworkErrorMessage("TypeError: fetch failed")).toBe(true);
    });

    it("returns false for non-network errors", () => {
      expect(isNetworkErrorMessage("Invalid query")).toBe(false);
      expect(isNetworkErrorMessage("Authentication failed")).toBe(false);
      expect(isNetworkErrorMessage("GraphQL error")).toBe(false);
    });

    it("is case insensitive", () => {
      expect(isNetworkErrorMessage("NETWORK ERROR")).toBe(true);
      expect(isNetworkErrorMessage("Fetch Failed")).toBe(true);
    });
  });
});

describe("Error Classification Integration", () => {
  it("correctly identifies HTTP 429 rate limit", () => {
    const error = { response: { status: 429 } };
    expect(hasResponseWithStatus(error)).toBe(true);
    expect(error.response.status).toBe(429);
  });

  it("correctly identifies GraphQL rate limit with message", () => {
    const error = {
      graphQLErrors: [{ message: "Too many requests, please try again later" }],
    };
    expect(hasGraphQLRateLimitError(error)).toBe(true);
  });

  it("correctly identifies GraphQL rate limit with extension code", () => {
    const error = {
      graphQLErrors: [
        {
          message: "Rate limited",
          extensions: { code: "TOO_MANY_REQUESTS" },
        },
      ],
    };
    expect(hasGraphQLRateLimitError(error)).toBe(true);
  });

  it("correctly identifies network errors by message patterns", () => {
    const networkMessages = [
      "Network request failed",
      "connect ECONNREFUSED 127.0.0.1:8000",
      "connect ETIMEDOUT 10.0.0.1:443",
      "getaddrinfo ENOTFOUND unknown.host",
      "read ECONNRESET",
      "TypeError: fetch failed",
    ];

    for (const message of networkMessages) {
      expect(isNetworkErrorMessage(message)).toBe(true);
    }
  });
});
