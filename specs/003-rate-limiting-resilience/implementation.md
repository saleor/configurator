# Implementation Details: Rate Limiting Resilience

## Root Cause

We're NOT using Saleor's nested bulk mutation capabilities. The `productBulkCreate` supports inline `channelListings`, `variants`, `stocks`, and `media` - but we ignore them and make 151+ separate calls.

---

## Dependencies to Install

```bash
pnpm add p-retry p-limit opossum && pnpm add -D @types/opossum
```

---

## New File: `src/lib/utils/resilience.ts`

```typescript
import pRetry, { type Options as RetryOptions } from "p-retry";
import pLimit from "p-limit";
import CircuitBreaker from "opossum";
import { logger } from "@/lib/logger";

// === Adaptive Rate Limiter ===
class AdaptiveRateLimiter {
  private recentRateLimits = 0;
  private lastRateLimitTime = 0;
  private readonly windowMs = 60000;

  trackRateLimit(): void {
    const now = Date.now();
    if (now - this.lastRateLimitTime > this.windowMs) {
      this.recentRateLimits = 0;
    }
    this.recentRateLimits++;
    this.lastRateLimitTime = now;
  }

  getAdaptiveDelay(baseDelay: number): number {
    if (this.recentRateLimits === 0) return baseDelay;
    return Math.min(baseDelay * Math.pow(2, this.recentRateLimits), 15000);
  }

  parseRetryAfter(header: string | null): number | null {
    if (!header) return null;
    const seconds = parseInt(header, 10);
    return isNaN(seconds) ? null : seconds * 1000;
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
  onFailedAttempt: (error) => {
    logger.warn(`Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
  },
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  return pRetry(fn, { ...DEFAULT_RETRY_OPTIONS, ...options });
}

// === Concurrency Limiter ===
const requestLimit = pLimit(10);

export async function withConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  return requestLimit(fn);
}

export function adjustConcurrency(isRateLimited: boolean): void {
  if (isRateLimited) {
    requestLimit.concurrency = Math.max(1, requestLimit.concurrency - 2);
  } else {
    requestLimit.concurrency = Math.min(10, requestLimit.concurrency + 1);
  }
}

// === Circuit Breaker ===
export function createCircuitBreaker<T>(fn: () => Promise<T>): CircuitBreaker {
  const breaker = new CircuitBreaker(fn, {
    timeout: 30000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
  });

  breaker.on("open", () => logger.warn("Circuit breaker OPEN"));
  breaker.on("halfOpen", () => logger.info("Circuit breaker HALF-OPEN"));
  breaker.on("close", () => logger.info("Circuit breaker CLOSED"));

  return breaker;
}

// === Rate Limit Detection ===
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes("429") || error.message.includes("rate limit");
  }
  return false;
}

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
```

---

## Update: `src/lib/graphql/client.ts`

Add this wrapper function:

```typescript
import { withRetry, withConcurrencyLimit, rateLimiter, isRateLimitError, delay } from "@/lib/utils/resilience";

export async function executeWithResilience<T>(
  operation: () => Promise<T>,
  options?: { retries?: number; label?: string }
): Promise<T> {
  const { retries = 5, label = "GraphQL operation" } = options ?? {};

  return withConcurrencyLimit(() =>
    withRetry(
      async () => {
        try {
          return await operation();
        } catch (error) {
          if (isRateLimitError(error)) {
            rateLimiter.trackRateLimit();
            const retryAfter = rateLimiter.parseRetryAfter(
              (error as any).response?.headers?.get("Retry-After")
            );
            if (retryAfter) {
              await delay(retryAfter);
            }
            throw error;
          }
          throw error;
        }
      },
      {
        retries,
        minTimeout: rateLimiter.getAdaptiveDelay(1000),
      }
    )
  );
}
```

---

## Refactor: `bootstrapProductsBulk` in `product-service.ts`

### Current Input (incomplete):
```typescript
const input: ProductCreateInput = {
  name: productInput.name,
  slug: productInput.slug,
  productType: productTypeId,
  category: categoryId,
  attributes,
};
```

### Target Input (complete):
```typescript
const input: ProductBulkCreateInput = {
  name: productInput.name,
  slug: productInput.slug,
  description: this.wrapDescriptionAsEditorJS(productInput.description),
  productType: productTypeId,
  category: categoryId,
  attributes,
  // ADD THESE:
  channelListings: productInput.channelListings?.map((listing) => ({
    channelId: this.resolveChannelId(listing.channel),
    isPublished: listing.isPublished ?? false,
    visibleInListings: listing.visibleInListings ?? false,
    isAvailableForPurchase: listing.isAvailableForPurchase,
  })),
  variants: productInput.variants?.map((variant) => ({
    sku: variant.sku,
    name: variant.name,
    attributes: this.mapVariantAttributes(variant),
    stocks: variant.stocks?.map((stock) => ({
      warehouse: this.resolveWarehouseId(stock.warehouse),
      quantity: stock.quantity,
    })),
    channelListings: variant.channelListings?.map((listing) => ({
      channelId: this.resolveChannelId(listing.channel),
      price: listing.price,
    })),
  })),
  media: productInput.media?.map((m) => ({
    mediaUrl: m.url,
    alt: m.alt,
  })),
};
```

### Key Constraints:
- `productType` REQUIRED
- `name` REQUIRED
- Variant `attributes` REQUIRED (can be empty `[]`)
- Product must be listed in channel before variants can have listings
- Stocks need valid warehouse IDs
- Media uses `mediaUrl` for external URLs

---

## Shipping Zone Changes

### In `syncShippingMethods`:
```typescript
// Add delay between channel listing updates
for (const method of methods) {
  await this.updateChannelListing(method);
  await delay(200); // Add 200ms delay
}
```

### In `stages.ts`:
```typescript
// Apply chunking to shipping zones
await processInChunks(shippingZones, {
  chunkSize: 3,
  delayMs: 500,
  processor: (zone) => this.syncShippingZone(zone),
});
```

---

## Validation Commands

```bash
pnpm check:fix && pnpm build && pnpm test && pnpm check:ci
```

## E2E Test

```bash
--url=https://store-rzalldyg.saleor.cloud/graphql/
--token=YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs

rm -rf config.yml
pnpm dev introspect [credentials]
# Add 30+ products with variants/media
pnpm dev deploy [credentials]  # No 429s
pnpm dev deploy [credentials]  # Idempotent
```
