import pLimit, { type LimitFunction } from "p-limit";
import { cliConsole } from "../../cli/console";
import { logger } from "../logger";
import { parseRetryAfter } from "./error-classification";

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_ADAPTIVE_DELAY_MS = 15_000;

class AdaptiveRateLimiter {
  private recentRateLimits = 0;
  private lastRateLimitTime = 0;
  private retryAfterExpiresAt = 0;

  trackRateLimit(retryAfterMs?: number): void {
    const now = Date.now();
    if (now - this.lastRateLimitTime > RATE_LIMIT_WINDOW_MS) {
      this.recentRateLimits = 0;
    }
    this.recentRateLimits++;
    this.lastRateLimitTime = now;

    if (retryAfterMs && retryAfterMs > 0) {
      this.retryAfterExpiresAt = now + retryAfterMs;
      logger.info(`Rate limit with Retry-After: ${retryAfterMs}ms`, {
        recentRateLimits: this.recentRateLimits,
        retryAfterMs,
      });
    } else {
      logger.warn("Rate limit detected", {
        recentRateLimits: this.recentRateLimits,
      });
    }
  }

  private resetIfStale(): void {
    if (Date.now() - this.lastRateLimitTime > RATE_LIMIT_WINDOW_MS) {
      this.recentRateLimits = 0;
    }
  }

  getAdaptiveDelay(baseDelay: number): number {
    this.resetIfStale();
    const now = Date.now();

    if (this.retryAfterExpiresAt > now) {
      const remainingRetryAfter = this.retryAfterExpiresAt - now;
      return Math.max(remainingRetryAfter, baseDelay);
    }

    if (this.recentRateLimits === 0) return baseDelay;
    return Math.min(baseDelay * 2 ** this.recentRateLimits, MAX_ADAPTIVE_DELAY_MS);
  }

  parseRetryAfter(header: string | null | undefined): number | null {
    return parseRetryAfter(header);
  }

  getRecentRateLimitCount(): number {
    this.resetIfStale();
    return this.recentRateLimits;
  }

  shouldWait(): { wait: boolean; delayMs: number } {
    const now = Date.now();
    if (this.retryAfterExpiresAt > now) {
      return { wait: true, delayMs: this.retryAfterExpiresAt - now };
    }
    return { wait: false, delayMs: 0 };
  }
}

export const rateLimiter = new AdaptiveRateLimiter();

const DEFAULT_CONCURRENCY = 10;

let requestLimit: LimitFunction = pLimit(DEFAULT_CONCURRENCY);
let currentConcurrency = DEFAULT_CONCURRENCY;

export async function withConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  return requestLimit(fn);
}

export function adjustConcurrency(isRateLimited: boolean): void {
  if (isRateLimited) {
    currentConcurrency = Math.max(1, currentConcurrency - 2);
    logger.info(`Reduced concurrency to ${currentConcurrency} due to rate limiting`);
    cliConsole.warn(
      `${cliConsole.icon("warning")} Rate limit detected, reducing concurrency to ${currentConcurrency}`
    );
  } else {
    currentConcurrency = Math.min(DEFAULT_CONCURRENCY, currentConcurrency + 1);
  }
  requestLimit = pLimit(currentConcurrency);
}

export function getCurrentConcurrency(): number {
  return currentConcurrency;
}

export function resetConcurrency(): void {
  currentConcurrency = DEFAULT_CONCURRENCY;
  requestLimit = pLimit(DEFAULT_CONCURRENCY);
}

import { isRateLimitError } from "./error-classification";
export { isRateLimitError };

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
