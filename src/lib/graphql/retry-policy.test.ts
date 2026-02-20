import { describe, expect, it } from "vitest";
import {
  isIdempotentMutation,
  isRetryableTransportStatus,
  shouldRetryOperation,
} from "./retry-policy";

describe("retry-policy", () => {
  describe("isRetryableTransportStatus", () => {
    it("allows 429 and selected 5xx statuses", () => {
      expect(isRetryableTransportStatus(429)).toBe(true);
      expect(isRetryableTransportStatus(502)).toBe(true);
      expect(isRetryableTransportStatus(503)).toBe(true);
      expect(isRetryableTransportStatus(504)).toBe(true);
    });

    it("rejects non-retryable statuses", () => {
      expect(isRetryableTransportStatus(400)).toBe(false);
      expect(isRetryableTransportStatus(401)).toBe(false);
      expect(isRetryableTransportStatus(404)).toBe(false);
      expect(isRetryableTransportStatus(500)).toBe(false);
    });
  });

  describe("isIdempotentMutation", () => {
    it("allows operation names with approved idempotent keywords", () => {
      expect(isIdempotentMutation("productUpdate")).toBe(true);
      expect(isIdempotentMutation("productDelete")).toBe(true);
      expect(isIdempotentMutation("productBulkUpdate")).toBe(true);
      expect(isIdempotentMutation("collectionChannelListingUpdate")).toBe(true);
      expect(isIdempotentMutation("productUpdateMetadata")).toBe(true);
    });

    it("rejects non-idempotent or missing mutation names", () => {
      expect(isIdempotentMutation("productCreate")).toBe(false);
      expect(isIdempotentMutation("productBulkCreate")).toBe(false);
      expect(isIdempotentMutation("")).toBe(false);
      expect(isIdempotentMutation(undefined)).toBe(false);
      expect(isIdempotentMutation(null)).toBe(false);
    });
  });

  describe("shouldRetryOperation", () => {
    it("retries all queries", () => {
      expect(shouldRetryOperation("query", "products")).toBe(true);
      expect(shouldRetryOperation("query", undefined)).toBe(true);
    });

    it("retries only idempotent mutations", () => {
      expect(shouldRetryOperation("mutation", "productUpdate")).toBe(true);
      expect(shouldRetryOperation("mutation", "productDelete")).toBe(true);
      expect(shouldRetryOperation("mutation", "productCreate")).toBe(false);
      expect(shouldRetryOperation("mutation", undefined)).toBe(false);
    });

    it("does not retry non-query/non-mutation operations", () => {
      expect(shouldRetryOperation("subscription", "eventSubscription")).toBe(false);
      expect(shouldRetryOperation("teardown", "eventSubscription")).toBe(false);
      expect(shouldRetryOperation(undefined, "eventSubscription")).toBe(false);
    });
  });
});
