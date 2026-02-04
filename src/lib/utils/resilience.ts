/**
 * Resilience utilities for handling rate limiting and API errors
 *
 * This module provides:
 * - Adaptive rate limiting with exponential backoff
 * - Retry wrapper with configurable options
 * - Concurrency limiting for parallel requests
 * - Circuit breaker for failing services
 */

import CircuitBreaker from "opossum";
import pLimit, { type LimitFunction } from "p-limit";
import pRetry, { type RetryContext, type Options as RetryOptions } from "p-retry";
import { cliConsole } from "../../cli/console";
import { logger } from "../logger";

// === Adaptive Rate Limiter ===

/**
 * Tracks rate limit occurrences and calculates adaptive delays
 * to prevent overwhelming the API during high-traffic periods
 */
class AdaptiveRateLimiter {
  private recentRateLimits = 0;
  private lastRateLimitTime = 0;
  private readonly windowMs = 60000; // 1 minute window

  /**
   * Record a rate limit occurrence for adaptive delay calculation
   */
  trackRateLimit(): void {
    const now = Date.now();
    // Reset counter if outside the window
    if (now - this.lastRateLimitTime > this.windowMs) {
      this.recentRateLimits = 0;
    }
    this.recentRateLimits++;
    this.lastRateLimitTime = now;

    logger.warn("Rate limit detected", {
      recentRateLimits: this.recentRateLimits,
      windowMs: this.windowMs,
    });
  }

  /**
   * Calculate an adaptive delay based on recent rate limit occurrences
   * Uses exponential backoff capped at 15 seconds
   */
  getAdaptiveDelay(baseDelay: number): number {
    if (this.recentRateLimits === 0) return baseDelay;
    // Exponential backoff: baseDelay * 2^recentRateLimits, capped at 15s
    return Math.min(baseDelay * 2 ** this.recentRateLimits, 15000);
  }

  /**
   * Parse the Retry-After header from an HTTP response
   * @returns Delay in milliseconds, or null if header is invalid/missing
   */
  parseRetryAfter(header: string | null | undefined): number | null {
    if (!header) return null;
    const seconds = Number.parseInt(header, 10);
    return Number.isNaN(seconds) ? null : seconds * 1000;
  }

  /**
   * Get the current number of recent rate limits (for monitoring)
   */
  getRecentRateLimitCount(): number {
    return this.recentRateLimits;
  }
}

export const rateLimiter = new AdaptiveRateLimiter();

// === Retry Wrapper ===

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  retries: 5,
  minTimeout: 1000,
  maxTimeout: 30000,
  factor: 2,
  randomize: true,
  onFailedAttempt: (context: RetryContext) => {
    logger.warn(`Retry attempt ${context.attemptNumber} failed`, {
      retriesLeft: context.retriesLeft,
      error: context.error.message,
    });
  },
};

/**
 * Wrap an async function with retry logic using exponential backoff
 *
 * @param fn - The async function to execute with retries
 * @param options - Optional retry configuration overrides
 * @returns The result of the function execution
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  return pRetry(fn, { ...DEFAULT_RETRY_OPTIONS, ...options });
}

// === Concurrency Limiter ===

// Default to 10 concurrent requests
let requestLimit: LimitFunction = pLimit(10);
let currentConcurrency = 10;

/**
 * Wrap an async function with concurrency limiting
 * Prevents overwhelming the API with too many parallel requests
 *
 * @param fn - The async function to execute with concurrency limiting
 * @returns The result of the function execution
 */
export async function withConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  return requestLimit(fn);
}

/**
 * Adjust the concurrency limit based on rate limiting feedback
 * Decreases on rate limit, increases on success (within bounds)
 *
 * @param isRateLimited - Whether a rate limit was just encountered
 */
export function adjustConcurrency(isRateLimited: boolean): void {
  if (isRateLimited) {
    // Reduce concurrency more aggressively on rate limit
    currentConcurrency = Math.max(1, currentConcurrency - 2);
    logger.info(`Reduced concurrency to ${currentConcurrency} due to rate limiting`);
    cliConsole.warn(
      `${cliConsole.icon("warning")} Rate limit detected, reducing concurrency to ${currentConcurrency}`
    );
  } else {
    // Slowly increase concurrency back to normal
    currentConcurrency = Math.min(10, currentConcurrency + 1);
  }
  // Recreate the limiter with new concurrency
  requestLimit = pLimit(currentConcurrency);
}

/**
 * Get the current concurrency limit (for monitoring)
 */
export function getCurrentConcurrency(): number {
  return currentConcurrency;
}

// === Circuit Breaker ===

interface CircuitBreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
}

const DEFAULT_CIRCUIT_BREAKER_OPTIONS: CircuitBreakerOptions = {
  timeout: 30000, // 30 second timeout
  errorThresholdPercentage: 50, // Open circuit after 50% failures
  resetTimeout: 30000, // Try again after 30 seconds
};

/**
 * Create a circuit breaker for an async function
 * Prevents cascading failures by "opening" the circuit after repeated failures
 *
 * @param fn - The async function to wrap with circuit breaker
 * @param options - Optional circuit breaker configuration
 * @returns A circuit breaker instance
 */
export function createCircuitBreaker<T>(
  fn: (...args: unknown[]) => Promise<T>,
  options?: CircuitBreakerOptions
): CircuitBreaker<unknown[], T> {
  const opts = { ...DEFAULT_CIRCUIT_BREAKER_OPTIONS, ...options };

  const breaker = new CircuitBreaker(fn, opts);

  breaker.on("open", () => {
    logger.warn("Circuit breaker OPEN - stopping requests to failing service");
    cliConsole.warn(`${cliConsole.icon("warning")} Circuit breaker opened - service may be down`);
  });

  breaker.on("halfOpen", () => {
    logger.info("Circuit breaker HALF-OPEN - testing if service recovered");
  });

  breaker.on("close", () => {
    logger.info("Circuit breaker CLOSED - service recovered");
    cliConsole.success(
      `${cliConsole.icon("success")} Service recovered, resuming normal operations`
    );
  });

  return breaker;
}

// === Rate Limit Detection ===

/**
 * Check if an error indicates rate limiting
 * Supports various error formats from different APIs
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
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { status?: number } }).response?.status === "number"
  ) {
    return (error as { response: { status: number } }).response.status === 429;
  }

  return false;
}

// === Utility Functions ===

/**
 * Create a promise that resolves after the specified delay
 */
export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Process items in chunks with delays between chunks
 * Useful for batch operations that need rate limiting protection
 *
 * @param items - Array of items to process
 * @param processor - Function to process each item
 * @param options - Configuration for chunk size and delay
 */
export async function processWithRateLimiting<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: {
    chunkSize?: number;
    delayMs?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<{ successes: R[]; failures: Array<{ item: T; error: Error }> }> {
  const { chunkSize = 10, delayMs = 500, onProgress } = options;

  const successes: R[] = [];
  const failures: Array<{ item: T; error: Error }> = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);

    const results = await Promise.allSettled(
      chunk.map((item) => withConcurrencyLimit(() => processor(item)))
    );

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        successes.push(result.value);
      } else {
        const item = chunk[index];
        const error =
          result.reason instanceof Error ? result.reason : new Error(String(result.reason));

        // Track rate limits for adaptive delay
        if (isRateLimitError(error)) {
          rateLimiter.trackRateLimit();
          adjustConcurrency(true);
        }

        failures.push({ item, error });
      }
    });

    onProgress?.(Math.min(i + chunkSize, items.length), items.length);

    // Add delay between chunks (but not after the last chunk)
    if (i + chunkSize < items.length) {
      const adaptiveDelay = rateLimiter.getAdaptiveDelay(delayMs);
      if (adaptiveDelay > delayMs) {
        logger.debug(`Using adaptive delay of ${adaptiveDelay}ms (base: ${delayMs}ms)`);
      }
      await delay(adaptiveDelay);
    }
  }

  return { successes, failures };
}
