# Rate Limiting & Resilience Implementation Plan

## Status: IN PROGRESS

## Executive Summary

**Root Cause**: We are NOT fully utilizing Saleor's bulk mutation capabilities. The `productBulkCreate` mutation supports nested `channelListings`, `variants` (with their own `channelListings` and `stocks`), and `media` - but we're ignoring these fields and making separate API calls after product creation.

**Impact**: 151+ API calls for 50 products vs 1-5 calls with proper bulk usage.

---

## Phase 1: Dependencies & Infrastructure

### New Dependencies
```bash
pnpm add p-retry p-limit opossum
pnpm add -D @types/opossum
```

| Package | Purpose |
|---------|----------|
| `p-retry` | Exponential backoff with retries |
| `p-limit` | Concurrency control for parallel operations |
| `opossum` | Circuit breaker pattern |

---

## Phase 2: Resilience Utilities Module

**File**: `src/lib/utils/resilience.ts` (NEW)

### Components to Implement:

1. **AdaptiveRateLimiter class**
   - Track recent rate limits with time window
   - Calculate adaptive delays (exponential increase)
   - Parse Retry-After headers

2. **withRetry wrapper** (using p-retry)
   - Default 5 retries
   - Exponential backoff: 1s → 30s max
   - Jitter enabled (randomize: true)
   - Logging on failed attempts

3. **createCircuitBreaker factory** (using opossum)
   - 30s timeout
   - 50% error threshold to open
   - 30s reset timeout
   - Event logging (open/halfOpen/close)

4. **withConcurrencyLimit wrapper** (using p-limit)
   - Max 10 concurrent requests
   - adjustConcurrency helper for dynamic adjustment

---

## Phase 3: GraphQL Client Refactor

**File**: `src/lib/graphql/client.ts`

### Changes:
1. Import resilience utilities
2. Create `executeWithResilience<T>` wrapper function
3. Integrate concurrency pool, circuit breaker, and retry logic
4. Rate limit detection and Retry-After parsing
5. Remove or simplify existing retryExchange if present

### executeWithResilience Signature:
```typescript
export async function executeWithResilience<T>(
  operation: () => Promise<T>,
  options?: { retries?: number; label?: string }
): Promise<T>
```

---

## Phase 4: Product Bulk Create Refactor

**File**: `src/modules/product/product-service.ts`

### Current Flow (Causes Rate Limiting):
```
1. productBulkCreate (basic fields only)
2. Promise.all → updateProductChannelListings (N parallel calls)
3. productVariantBulkCreate per product (N sequential calls)
4. Promise.all → syncProductMedia (N parallel calls)
```

### Target Flow (Single API Call):
```
1. productBulkCreate with:
   - channelListings (inline)
   - variants (inline, each with channelListings AND stocks)
   - media (inline via mediaUrl)
```

### Key Implementation Details:

**ProductBulkCreateInput structure**:
```typescript
const input = {
  name: productInput.name,
  slug: productInput.slug,
  productType: productTypeId,
  category: categoryId,
  attributes: [{ id: "...", values: ["..."] }],
  channelListings: productInput.channelListings?.map(listing => ({
    channelId: resolvedChannelId,
    isPublished: listing.isPublished ?? false,
    visibleInListings: listing.visibleInListings ?? false,
    isAvailableForPurchase: listing.isAvailableForPurchase,
  })),
  variants: productInput.variants?.map(variant => ({
    sku: variant.sku,
    attributes: [{ id: "...", values: [variant.size] }],
    stocks: variant.stocks?.map(stock => ({
      warehouse: warehouseId,
      quantity: stock.quantity,
    })),
    channelListings: variant.channelListings?.map(listing => ({
      channelId: resolvedChannelId,
      price: listing.price,
    })),
  })),
  media: productInput.media?.map(m => ({
    mediaUrl: m.url,
    alt: m.alt,
  })),
};
```

### Important Constraints:
- `productType` is REQUIRED
- Product `name` is REQUIRED
- Variant `attributes` list is REQUIRED (can be empty `[]`)
- Variant channel listings require the product to be listed in that channel first
- Stocks require valid warehouse IDs
- Media can be external URLs via `mediaUrl` field

---

## Phase 5: Shipping Zone Resilience

**Files**:
- `src/modules/shipping-zone/shipping-zone-service.ts`
- `src/core/deployment/stages.ts`

### Changes:
1. Add 200ms delay between channel listing updates in `syncShippingMethods`
2. Use `wrapBatch` with `sequential: true` for zones > 3
3. Apply `processInChunks` to shipping zones stage with `chunkSize: 3, delayMs: 500`

---

## Files to Modify Summary

| File | Changes |
|------|----------|
| `package.json` | Add p-retry, p-limit, opossum dependencies |
| `src/lib/utils/resilience.ts` | NEW - Create resilience utilities module |
| `src/lib/graphql/client.ts` | Integrate resilience patterns |
| `src/modules/product/product-service.ts` | Refactor bootstrapProductsBulk for nested inputs |
| `src/modules/product/repository.ts` | Verify bulk mutation includes nested fields |
| `src/modules/shipping-zone/shipping-zone-service.ts` | Add delays, sequential mode |
| `src/core/deployment/stages.ts` | Apply processInChunks to shipping zones |

---

## Verification Plan

### Unit Tests
- [ ] Verify bulk create input includes channelListings, variants, media
- [ ] Test that variants include their channelListings
- [ ] Verify adaptive delay increases after 429s

### Integration Tests
- [ ] Create 20 new products with variants, channel listings, media - should be 1 bulk call
- [ ] Update 20 existing products - verify delays between updates
- [ ] Create 10 shipping zones - verify chunking and delays

### E2E Validation
```bash
--url=https://store-rzalldyg.saleor.cloud/graphql/
--token=YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs

rm -rf config.yml
pnpm dev introspect [credentials]
# Modify config to have 30+ products with variants/media
pnpm dev deploy [credentials]  # Should complete without 429s
pnpm dev deploy [credentials]  # Idempotent - no changes
```

---

## Pre-Commit Checklist
```bash
pnpm check:fix && pnpm build && pnpm test && pnpm check:ci
```