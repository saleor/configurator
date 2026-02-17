import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests for AdaptiveRateLimiter Retry-After functionality
 *
 * These tests verify:
 * - Retry-After header parsing
 * - Adaptive delay calculation with Retry-After
 * - shouldWait method behavior
 * - Rate limit window management
 */

// Since AdaptiveRateLimiter is not exported, we test the exported rateLimiter instance
// We import it fresh in each test via dynamic import to ensure clean state

describe("AdaptiveRateLimiter", () => {
  // Use dynamic import to get a fresh module for each test
  let rateLimiter: Awaited<typeof import("./resilience")>["rateLimiter"];

  beforeEach(async () => {
    vi.useFakeTimers();
    // Reset module to get fresh rateLimiter state
    vi.resetModules();
    const module = await import("./resilience");
    rateLimiter = module.rateLimiter;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("parseRetryAfter", () => {
    it("parses numeric string to milliseconds", () => {
      expect(rateLimiter.parseRetryAfter("5")).toBe(5000);
      expect(rateLimiter.parseRetryAfter("60")).toBe(60000);
      expect(rateLimiter.parseRetryAfter("1")).toBe(1000);
    });

    it("returns null for null/undefined input", () => {
      expect(rateLimiter.parseRetryAfter(null)).toBeNull();
      expect(rateLimiter.parseRetryAfter(undefined)).toBeNull();
    });

    it("returns null for non-numeric strings", () => {
      expect(rateLimiter.parseRetryAfter("not a number")).toBeNull();
      expect(rateLimiter.parseRetryAfter("")).toBeNull();
    });

    it("handles integer parsing (ignores decimals)", () => {
      // parseInt behavior: parses until non-digit
      expect(rateLimiter.parseRetryAfter("5.5")).toBe(5000);
    });
  });

  describe("trackRateLimit", () => {
    it("increments rate limit count", () => {
      expect(rateLimiter.getRecentRateLimitCount()).toBe(0);
      rateLimiter.trackRateLimit();
      expect(rateLimiter.getRecentRateLimitCount()).toBe(1);
      rateLimiter.trackRateLimit();
      expect(rateLimiter.getRecentRateLimitCount()).toBe(2);
    });

    it("resets count after window expires", () => {
      rateLimiter.trackRateLimit();
      expect(rateLimiter.getRecentRateLimitCount()).toBe(1);

      // Advance time past the window (60 seconds)
      vi.advanceTimersByTime(61_000);

      // Count should reset on next getRecentRateLimitCount call
      expect(rateLimiter.getRecentRateLimitCount()).toBe(0);
    });

    it("stores retryAfterExpiresAt when retryAfterMs is provided", () => {
      rateLimiter.trackRateLimit(5000);
      const { wait, delayMs } = rateLimiter.shouldWait();
      expect(wait).toBe(true);
      expect(delayMs).toBeLessThanOrEqual(5000);
      expect(delayMs).toBeGreaterThan(0);
    });
  });

  describe("getAdaptiveDelay", () => {
    it("returns base delay when no rate limits recorded", () => {
      expect(rateLimiter.getAdaptiveDelay(1000)).toBe(1000);
    });

    it("returns exponential backoff after rate limits", () => {
      rateLimiter.trackRateLimit();
      // 1000 * 2^1 = 2000
      expect(rateLimiter.getAdaptiveDelay(1000)).toBe(2000);

      rateLimiter.trackRateLimit();
      // 1000 * 2^2 = 4000
      expect(rateLimiter.getAdaptiveDelay(1000)).toBe(4000);

      rateLimiter.trackRateLimit();
      // 1000 * 2^3 = 8000
      expect(rateLimiter.getAdaptiveDelay(1000)).toBe(8000);
    });

    it("caps delay at MAX_ADAPTIVE_DELAY_MS (15000)", () => {
      // Track many rate limits to exceed cap
      for (let i = 0; i < 10; i++) {
        rateLimiter.trackRateLimit();
      }
      // Should be capped at 15000
      expect(rateLimiter.getAdaptiveDelay(1000)).toBe(15000);
    });

    it("returns remaining Retry-After time when still valid", () => {
      rateLimiter.trackRateLimit(10000);
      const delay = rateLimiter.getAdaptiveDelay(1000);
      // Should use Retry-After (10000ms) instead of base (1000ms)
      expect(delay).toBeGreaterThan(1000);
      expect(delay).toBeLessThanOrEqual(10000);
    });

    it("respects Retry-After over base delay", () => {
      rateLimiter.trackRateLimit(5000);
      // Even though base is 1000, Retry-After should win
      const delay = rateLimiter.getAdaptiveDelay(1000);
      expect(delay).toBeGreaterThanOrEqual(4990); // Allow small timing variance
    });

    it("falls back to exponential backoff after Retry-After expires", async () => {
      rateLimiter.trackRateLimit(100); // 100ms Retry-After

      // Advance past Retry-After
      vi.advanceTimersByTime(150);

      // Should now use exponential backoff (1 rate limit recorded)
      const delay = rateLimiter.getAdaptiveDelay(1000);
      // Should be 1000 * 2^1 = 2000 (exponential backoff)
      expect(delay).toBe(2000);
    });
  });

  describe("shouldWait", () => {
    it("returns { wait: false, delayMs: 0 } when no Retry-After is active", () => {
      const result = rateLimiter.shouldWait();
      expect(result.wait).toBe(false);
      expect(result.delayMs).toBe(0);
    });

    it("returns { wait: true, delayMs: remaining } when Retry-After is active", () => {
      rateLimiter.trackRateLimit(5000);
      const result = rateLimiter.shouldWait();
      expect(result.wait).toBe(true);
      expect(result.delayMs).toBeLessThanOrEqual(5000);
      expect(result.delayMs).toBeGreaterThan(0);
    });

    it("returns { wait: false } after Retry-After expires", () => {
      rateLimiter.trackRateLimit(100);

      // Advance past Retry-After
      vi.advanceTimersByTime(150);

      const result = rateLimiter.shouldWait();
      expect(result.wait).toBe(false);
      expect(result.delayMs).toBe(0);
    });

    it("decreases delayMs as time passes", () => {
      rateLimiter.trackRateLimit(5000);

      const result1 = rateLimiter.shouldWait();
      expect(result1.delayMs).toBeLessThanOrEqual(5000);

      vi.advanceTimersByTime(2000);

      const result2 = rateLimiter.shouldWait();
      expect(result2.delayMs).toBeLessThanOrEqual(3000);
      expect(result2.delayMs).toBeLessThan(result1.delayMs);
    });
  });

  describe("rate limit window behavior", () => {
    it("maintains count within window", () => {
      rateLimiter.trackRateLimit();
      vi.advanceTimersByTime(30_000); // 30 seconds
      rateLimiter.trackRateLimit();

      // Should have 2 rate limits (within 60s window)
      expect(rateLimiter.getRecentRateLimitCount()).toBe(2);
    });

    it("resets count when new rate limit after window", () => {
      rateLimiter.trackRateLimit();
      rateLimiter.trackRateLimit();
      expect(rateLimiter.getRecentRateLimitCount()).toBe(2);

      // Advance past window
      vi.advanceTimersByTime(61_000);

      // Next trackRateLimit should reset and start fresh
      rateLimiter.trackRateLimit();
      expect(rateLimiter.getRecentRateLimitCount()).toBe(1);
    });
  });
});

describe("isRateLimitError", () => {
  let isRateLimitError: Awaited<typeof import("./resilience")>["isRateLimitError"];

  beforeEach(async () => {
    const module = await import("./resilience");
    isRateLimitError = module.isRateLimitError;
  });

  it("detects 429 in error message", () => {
    expect(isRateLimitError(new Error("HTTP 429 Too Many Requests"))).toBe(true);
  });

  it("detects 'rate limit' in error message", () => {
    expect(isRateLimitError(new Error("Rate limit exceeded"))).toBe(true);
    expect(isRateLimitError(new Error("You have been rate limited"))).toBe(true);
  });

  it("detects 'too many requests' in error message", () => {
    expect(isRateLimitError(new Error("Too many requests"))).toBe(true);
  });

  it("detects 'throttl' in error message", () => {
    expect(isRateLimitError(new Error("Request throttled"))).toBe(true);
    expect(isRateLimitError(new Error("API throttling in effect"))).toBe(true);
  });

  it("detects HTTP response with 429 status", () => {
    const error = { response: { status: 429 } };
    expect(isRateLimitError(error)).toBe(true);
  });

  it("returns false for non-rate-limit errors", () => {
    expect(isRateLimitError(new Error("Not found"))).toBe(false);
    expect(isRateLimitError(new Error("Internal server error"))).toBe(false);
    expect(isRateLimitError(new Error("Authentication failed"))).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isRateLimitError(null)).toBe(false);
    expect(isRateLimitError(undefined)).toBe(false);
  });

  it("returns false for non-error objects", () => {
    expect(isRateLimitError({ response: { status: 200 } })).toBe(false);
    expect(isRateLimitError({ response: { status: 500 } })).toBe(false);
  });
});
