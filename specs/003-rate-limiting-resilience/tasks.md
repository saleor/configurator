# Tasks: Rate Limiting Resilience

**Feature**: Reduce API calls by using Saleor's nested bulk mutations + add resilience patterns
**Impact**: 151+ API calls → 1-5 calls for 50 products

## Status Legend
- [ ] Pending
- [x] Complete
- [~] In Progress

---

## Phase 1: Dependencies

- [ ] T001 Install `pnpm add p-retry p-limit opossum && pnpm add -D @types/opossum`

---

## Phase 2: Context Gathering (PARALLEL)

**Purpose**: Read all files needed before making changes

- [ ] T002 [P] Read `src/lib/graphql/client.ts` - understand current client setup
- [ ] T003 [P] Read `src/lib/graphql/schema.graphql` - find ProductBulkCreateInput, ProductVariantBulkCreateInput
- [ ] T004 [P] Read `src/modules/product/product-service.ts` - find bootstrapProductsBulk (~line 1055)
- [ ] T005 [P] Read `src/modules/product/repository.ts` - find bulkCreateProducts, bulkUpdateVariants
- [ ] T006 [P] Read `src/modules/shipping-zone/shipping-zone-service.ts` - find syncShippingMethods
- [ ] T007 [P] Read `src/core/deployment/stages.ts` - understand shipping zone stage

---

## Phase 3: Resilience Infrastructure

**Blocks**: Phase 4, Phase 5

- [ ] T008 Create `src/lib/utils/resilience.ts` with:
  - AdaptiveRateLimiter class (track 429s, calculate delays, parse Retry-After)
  - withRetry<T> wrapper (p-retry, 5 retries, 1-30s backoff, jitter)
  - createCircuitBreaker (opossum, 50% threshold, 30s reset)
  - withConcurrencyLimit (p-limit, max 10 concurrent)
  - adjustConcurrency helper

- [ ] T009 Update `src/lib/graphql/client.ts`:
  - Add executeWithResilience<T> wrapper combining all patterns
  - Export for use in repositories

---

## Phase 4: Product Bulk Create Refactor

**Depends on**: T008, T009, T002-T005

- [ ] T010 Update ProductBulkCreateInput in product-service.ts to include:
  - `channelListings` inline (map from productInput.channelListings)
  - `variants` inline with nested `channelListings` and `stocks`
  - `media` inline via `mediaUrl` field

- [ ] T011 Remove/skip separate API calls for NEW products:
  - Skip updateProductChannelListings for new products
  - Skip separate productVariantBulkCreate for new products
  - Skip separate syncProductMedia for new products

- [ ] T012 Keep separate handling for UPDATES (no productBulkUpdate API exists)

---

## Phase 5: Shipping Zone Resilience (PARALLEL with Phase 4)

**Depends on**: T008

- [ ] T013 [P] Add 200ms delay between channel listing updates in syncShippingMethods
- [ ] T014 [P] Use sequential mode (wrapBatch sequential:true) for zones > 3
- [ ] T015 [P] Apply processInChunks to shipping zones in stages.ts (chunkSize:3, delayMs:500)

---

## Phase 6: Validation

- [ ] T016 Run `pnpm check:fix`
- [ ] T017 Run `pnpm build`
- [ ] T018 Run `pnpm test`
- [ ] T019 Run `pnpm check:ci`

---

## Parallel Execution Map

```
T001 (install deps)
  │
  ├──────────────────────────────────────┐
  │                                      │
  v                                      v
T002-T007 (read files - ALL PARALLEL)    │
  │                                      │
  v                                      │
T008 (resilience.ts)                     │
  │                                      │
  v                                      │
T009 (client.ts)                         │
  │                                      │
  ├──────────────┬───────────────────────┘
  │              │
  v              v
T010-T012      T013-T015
(products)     (shipping - PARALLEL)
  │              │
  └──────┬───────┘
         │
         v
T016-T019 (validation - SEQUENTIAL)
```

---

## Key Code References

| What | Where |
|------|-------|
| bootstrapProductsBulk | `src/modules/product/product-service.ts:~1055` |
| ProductBulkCreateInput | `src/lib/graphql/schema.graphql` |
| bulkCreateProducts | `src/modules/product/repository.ts` |
| bulkUpdateVariants (unused!) | `src/modules/product/repository.ts:~1567` |
| syncShippingMethods | `src/modules/shipping-zone/shipping-zone-service.ts` |
| shipping zone stage | `src/core/deployment/stages.ts` |

---

## Context Recovery

If starting fresh, run these reads first:
```
1. Read this tasks.md to see progress
2. Read specs/003-rate-limiting-resilience/implementation.md for details
3. Check git status for uncommitted work
4. Resume from first unchecked task
```

Quick status check:
```bash
# Dependencies installed?
grep -E "p-retry|p-limit|opossum" package.json

# Resilience module exists?
ls src/lib/utils/resilience.ts 2>/dev/null

# What's been modified?
git status
```
