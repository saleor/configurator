# Rate Limiting & Resilience Improvements - Task List

## Problem Summary

The Configurator CLI experiences rate limiting (HTTP 429) despite using bulk mutations because:
1. **Underutilized Bulk API**: `productBulkCreate` supports nested `channelListings`, `variants`, and `media` - but we ignore these fields
2. **Unused Bulk Update**: `repository.bulkUpdateVariants()` exists but is NEVER called
3. **Parallel Bursts**: `Promise.all` fires hundreds of simultaneous requests
4. **No Adaptive Throttling**: System only reacts to 429s, never prevents them

---

## Tasks

### Phase 1: Full Bulk Mutation Utilization (Products) ❌

- [ ] **1.1** Refactor `bootstrapProductsBulk` in `product-service.ts` to include nested fields:
  - [ ] Add `channelListings` to `ProductBulkCreateInput`
  - [ ] Add `variants` with nested `channelListings` and `stocks`
  - [ ] Add `media` via `mediaUrl` field
- [ ] **1.2** Update `bulkCreateProducts` mutation in `repository.ts` if needed
- [ ] **1.3** Remove separate API calls for NEW products (lines 1156-1286 in product-service.ts):
  - [ ] Remove separate `updateProductChannelListings` Promise.all
  - [ ] Remove separate `productVariantBulkCreate` per-product calls
  - [ ] Remove separate `syncProductMedia` Promise.all
- [ ] **1.4** Add tests verifying nested bulk create works

### Phase 2: Variant Bulk Update for Existing Products ❌

- [ ] **2.1** Implement usage of `bulkUpdateVariants` for existing product updates
- [ ] **2.2** Use `channelListings: { create: [], update: [], remove: [] }` structure
- [ ] **2.3** Collect all variants to update across products, batch into single call

### Phase 3: Shipping Zone Improvements ❌

- [ ] **3.1** Add 200ms delay between channel listing updates in `syncShippingMethods`
- [ ] **3.2** Apply `processInChunks` to shipping zones stage in `stages.ts`
- [ ] **3.3** Use `wrapBatch` with `sequential: true` for zones > 3

### Phase 4: Adaptive Rate Limiting ❌

- [ ] **4.1** Create rate limit tracker module
  - [ ] Track recent 429 count
  - [ ] Parse `Retry-After` header
  - [ ] Export `getAdaptiveDelay()` function
- [ ] **4.2** Integrate with GraphQL client retry exchange
- [ ] **4.3** Apply adaptive delays to remaining parallel operations

### Phase 5: Additional Resilience Patterns ❌

- [ ] **5.1** Circuit breaker pattern for cascading failures
- [ ] **5.2** Request queue with configurable concurrency limit
- [ ] **5.3** Exponential backoff with jitter (improve existing retry logic)
- [ ] **5.4** Rate limit metrics logging for debugging

---

## Files to Modify

| File | Purpose |
|------|--------|
| `src/modules/product/product-service.ts` | Main bulk create refactor |
| `src/modules/product/repository.ts` | Verify/update bulk mutations |
| `src/modules/shipping-zone/shipping-zone-service.ts` | Add delays |
| `src/core/deployment/stages.ts` | Chunking for shipping zones |
| `src/lib/graphql/client.ts` | Adaptive rate limiting |
| `src/lib/utils/rate-limiter.ts` (NEW) | Rate limit tracker module |

---

## API Call Impact

**Before** (50 products, 6 variants, 3 media, 2 channels):
- productBulkCreate: 1 call
- updateProductChannelListings: 50 calls (parallel)
- productVariantBulkCreate: 50 calls (per product)
- syncProductMedia: 50+ calls (parallel with nested loops)
- **Total: 151+ calls**

**After** (with full nesting):
- productBulkCreate: 1 call (with everything nested)
- **Total: 1 call**

---

## Saleor API Constraints

1. `productType` and `name` are REQUIRED in bulk create
2. Variant `attributes` list is REQUIRED (can be empty `[]`)
3. Variant channel listings require product to be listed in that channel first
4. Media uses external URLs via `mediaUrl` - Saleor fetches and stores
5. `productVariantBulkUpdate` uses different structure: `{ create: [], update: [], remove: [] }`

---

## Verification

```bash
# E2E Test
--url=https://store-rzalldyg.saleor.cloud/graphql/
--token=YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs

rm -rf config.yml
pnpm dev introspect [credentials]
# Modify config to have 30+ products with variants/media
pnpm dev deploy [credentials]  # Should complete without 429s
pnpm dev deploy [credentials]  # Idempotent - no changes
```

---

## References

- Saleor Bulk Operations Docs: Shows examples of nested product creation
- Schema: `src/lib/graphql/schema.graphql` (lines 20646, 29099, 29151)
- ADR: `docs/adr/001-bulk-mutations-optimization.md`

---

## Key Decisions (Updated)

1. **Replace urql retryExchange** with `p-retry` wrapper for cleaner architecture
2. **Include circuit breaker** (opossum) in Phase 3
3. **Concurrency limit** via `p-limit` (max 10 concurrent requests)
4. **Adaptive throttling** based on recent 429 count
5. **Retry-After header** parsing for server-requested backoff

## Dependencies to Add

```bash
pnpm add p-retry p-limit opossum
pnpm add -D @types/opossum
```
