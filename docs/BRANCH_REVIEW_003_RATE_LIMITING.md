# Branch Review: feat/003-rate-limiting-resilience

**Date:** 2026-02-25
**Branch:** `feat/003-rate-limiting-resilience` vs `main`
**Commits:** 11 (4ad8028..0cff68d)
**Files changed:** 62 (55,130 additions / 3,280 deletions)
**Build:** PASSING
**Tests:** 87 files, 1064 tests passing (1 file skipped)

---

## 1. What We Are Delivering

### Core Infrastructure

| Component | File | Purpose |
|-----------|------|---------|
| **GraphQL Governor** | `src/lib/graphql/governor.ts` | Bottleneck-based concurrency limiter with cooldown support. Controls max concurrency (4), interval cap (20/s), and rate-limit-triggered cooldowns. Configurable via env vars. |
| **Retry Policy** | `src/lib/graphql/retry-policy.ts` | Defines which operations are retryable (queries always, mutations only if idempotent: Update/Delete/BulkUpdate). Identifies retryable HTTP statuses (429, 502, 503, 504). |
| **Error Classification** | `src/lib/utils/error-classification.ts` | Comprehensive type guards for classifying errors: rate limit, network, transient. Parses `Retry-After` headers (numeric seconds and HTTP-date). Clamped to 5min max. |
| **Resilience Tracker** | `src/lib/utils/resilience-tracker.ts` | Per-stage metrics collection using `AsyncLocalStorage`. Tracks rate limits, retries, GraphQL errors, and network errors at both stage and operation granularity. |
| **Deployment Utils** | `src/core/deployment/utils.ts` | Duration formatting and operation-level resilience hotspot analysis for reports. |

### Client Integration

- **GraphQL Client** (`src/lib/graphql/client.ts`): Major refactor. All requests now flow through the Governor. The `fetch` wrapper detects HTTP 429 and registers cooldowns. The `retryExchange` uses the new retry policy with governor-aware logging and resilience tracking.
- **Bottleneck dependency** added to `package.json`.

### Service-Layer Hardening

| Service | Key Changes |
|---------|-------------|
| **CategoryService** | Sequential processing with delays, optimized level-based processing for large trees, `wrapBatch` integration |
| **CategoryRepository** | Multi-level caching (slug + all-categories), incremental cache updates on create, `isRateLimitError` checks on all operations |
| **ProductService** | Bulk mutations (`bootstrapProductsBulk`), category/attribute/product-type caching, transient error propagation, channel listing resilience |
| **ProductRepository** | Rate limit detection, sequential media operations |
| **ShippingZoneService** | Sequential processing with delays for >3 zones, transient error propagation in warehouse pre-assignment |
| **CollectionService** | Transient error propagation in product/channel resolution |
| **WarehouseService** | `ServiceErrorWrapper` integration |
| **AttributeResolver** | Transient error propagation, strategy pattern for attribute types |

### Deployment Pipeline

- **MetricsCollector** (`metrics.ts`): Integrates with `resilienceTracker` for per-stage resilience metrics.
- **DeploymentReportGenerator** (`report.ts`): Completely rewritten. Generates structured JSON reports with resilience stats and operation hotspots.
- **DeploymentSummaryReport** (`summary.ts`): CLI display of timing, changes, resilience stats, and top throttle hotspots.
- **Stages** (`stages.ts`): Size-adaptive strategies (sequential vs bulk) for attributes, models, categories, products.
- **Removed** `report-storage.ts` (managed directory + pruning). Reports now save to working directory with timestamp filenames.

### Configuration Constants

`bulk-operation-constants.ts` expanded with:
- `BulkOperationThresholds`: Configurable thresholds for switching between sequential/bulk processing
- `DelayConfig`: Centralized delay values
- `ChunkSizeConfig`: Chunk sizes for batch processing
- `RetryConfig`: GraphQL client retry parameters
- `StageNames`, `EntityTypes`: Centralized string constants

---

## 2. Critical Issues

### CRIT-1: Governor cooldown timeout silently proceeds instead of failing

**File:** `src/lib/graphql/governor.ts:195-201`

When cooldown exceeds the 10-minute maximum wait, the code logs an error and **returns normally**, allowing the request to proceed against a still-rate-limited API. This is a liveness safety valve, but it should throw instead of silently continuing.

```typescript
// Current: silently proceeds
if (elapsed > MAX_TOTAL_WAIT_MS) {
  logger.error(`Governor cooldown exceeded maximum wait time...`);
  return; // <-- should throw
}
```

**Impact:** Deployment stalls for 10 minutes, then hammers a rate-limited API with no user-facing signal.

**Fix:** Throw an error so the caller can abort or surface the issue.

---

### CRIT-2: Product repository `getCategoryBySlug` swallows ALL errors (including transient)

**File:** `src/modules/product/repository.ts:1098-1111`

The fallback search catch block has **no transient error guard**. Rate limit errors during category resolution are silently swallowed, causing products to lose category associations.

```typescript
} catch (error) {
  // Missing: if (isTransientError(error)) throw error;
  logger.warn("Failed to look up category by slug...");
}
```

**Impact:** Products silently lose category associations during API load.

---

### CRIT-3: Category repository fallback swallows non-transient server errors

**Files:** `src/modules/category/repository.ts:191-204` and `:240-253`

Both `getCategoryByName` and `getCategoryBySlug` have fallbacks to `getAllCategories()`. Non-transient errors (500, 403, schema errors) are caught and return `null`, leading to duplicate category creation.

**Impact:** Categories may be duplicated when the API returns server errors.

---

### CRIT-4: Product media operations lack transient error guards

**File:** `src/modules/product/repository.ts:1466-1476` and `:1488-1501`

Media deletion and creation in `replaceAllProductMedia` catch all errors without checking `isTransientError`. Rate limit errors during media replacement cause:
- **Deletion failures**: Products keep old AND get new media (duplication)
- **Creation failures**: Products end up with incomplete media sets

**Impact:** Silent media duplication or loss during deployments.

---

### CRIT-5: `wrapServiceCall` wraps transient errors, breaking structured detection

**File:** `src/lib/utils/error-wrapper.ts:40-69`

The wrapper wraps ALL errors (including transient ones) in new error types. While the inner message is preserved and string-matching in `isRateLimitError` still works, this is fragile — it depends on exact error message phrasing surviving through wrapping layers.

**Fix:** Add `if (isTransientError(error)) throw error;` before wrapping.

---

### CRIT-6: `AsyncLocalStorage.enterWith` leaks context across async boundaries

**File:** `src/lib/utils/resilience-tracker.ts:66`

Using `enterWith` instead of `run` means if async callbacks from a previous stage outlive the stage's `await`, they share the context of the new stage, incorrectly attributing metrics. The sequential pipeline reduces risk, but doesn't eliminate it for in-flight timer callbacks.

**Impact:** Resilience metrics may be attributed to the wrong stage.

---

## 3. High-Severity Issues

| # | File | Issue |
|---|------|-------|
| H-1 | `product/attribute-resolver.ts:363-369` | `resolveAttribute` silently returns null on non-transient errors, dropping attributes from products |
| H-2 | `product/attribute-resolver.ts:267-280` | Reference resolution silently returns null on failure, dropping cross-product references |
| H-3 | `product/product-service.ts:703-716` | Channel listing update failures logged as "non-fatal, will retry on next deploy" — misleading since diff engine may not detect changes |
| H-4 | `product/product-service.ts:1153-1177` | `Promise.all` for channel listing updates — first transient error rejects all, losing other results |
| H-5 | `product/product-service.ts:1331-1351` | Same `Promise.all` issue for media sync operations |
| H-6 | `shipping-zone/shipping-zone-service.ts:393-404` | `updateShippingZone` wraps validation errors (unlike `createShippingZone` which re-throws them) |
| H-7 | `shipping-zone/shipping-zone-service.ts:286-301` | Warehouse pre-assign failures silently continue, causing missing shipping associations |
| H-8 | `product/product-service.ts:1112-1118` | `updateExistingProducts` catch has no transient error guard — rate limits treated as permanent failures |
| H-9 | `lib/graphql/client.ts:83-97` | Rate limit hits at fetch-intercept level not recorded in `resilienceTracker` (under-counting for non-retried ops) |

---

## 4. Medium-Severity Issues

| # | File | Issue |
|---|------|-------|
| M-1 | `deployment/metrics.ts:34-36` | `endStage` silently ignores missing start time — should log warning |
| M-2 | `resilience-tracker.ts:99-101` | Metrics outside stage context dropped at debug level — should be warn |
| M-3 | `governor.ts:188-209` | `waitForCooldown` loop may iterate extra times for 1-2ms tail sleeps |
| M-4 | `category-service.ts:115,173,281` | Hard-coded delay values (50ms, 100ms) bypass centralized `DelayConfig` |
| M-5 | `shipping-zone-service.ts:471` | Magic `200ms` delay should reference `DelayConfig` |
| M-6 | `product-service.ts:101` | Empty `catch {}` for JSON.parse discards parse error details |
| M-7 | `product-service.ts:302` | Empty `catch {}` for URL parsing — should log at debug level |
| M-8 | `product-service.ts:871-882` | Pre-cache failures silently degrade to live resolution without warning about rate limit exposure |
| M-9 | `error-wrapper.ts:108-113` | `wrapBatch` inner try-catch catches ALL errors including transient, treating rate limits as per-item failures |
| M-10 | `collection-service.ts:258-271` | Product resolution failures silently exclude products from collections |
| M-11 | `category/repository.ts:284` | Unnecessary `as ResultOf<...>` type cast — gql.tada already provides the type |
| M-12 | `product-service.ts:1044-1068` | Failed bulk product creation doesn't record variant-level skip in failures |
| M-13 | `category-service.ts:139-174` | Comment says "processes siblings concurrently" but code uses `sequential: true` |

---

## 5. Dead Code and Unused Exports

| Item | Location | Status |
|------|----------|--------|
| `getCategoryByName` on `CategoryOperations` interface | `category/repository.ts:93` | Declared but never called by `CategoryService`. Only used in tests. |
| `report-storage.ts` (deleted) | Previously `src/core/deployment/report-storage.ts` | Correctly removed along with tests and exports |
| `report-managed-directory.md` changeset (deleted) | `.changeset/` | Correctly cleaned up |
| `config-backup-greenproject.yml` (deleted) | Root directory | Correctly removed — was a backup file |
| `linear-task-ci-cd.md` (deleted) | Root directory | Correctly removed — was a task tracking file |

---

## 6. Performance Considerations

| Area | Observation | Severity |
|------|-------------|----------|
| **Governor defaults** | 4 concurrent + 20/s interval cap is conservative but safe. Configurable via env vars. | OK |
| **Category caching** | `CategoryRepository` now caches all categories + per-slug. Avoids redundant API calls. Good. | OK |
| **Product bulk mutations** | `bootstrapProductsBulk` uses Saleor bulk APIs instead of individual mutations. Significant improvement. | GOOD |
| **Sequential within levels** | Category optimized processing is sequential within each level — comment claims concurrent but it's not. Not a performance bug, but the `delayMs: 50` is conservative. | LOW |
| **`Promise.all` for media/channel sync** | Uses concurrent processing for post-update operations. Good for throughput, but loses results on first failure (see H-4, H-5). | MEDIUM |
| **Pre-caching** | Product service pre-caches product types, categories, and channels before bulk processing. Good for avoiding N+1 queries. | GOOD |
| **Bottleneck overhead** | Small per-request overhead from Bottleneck scheduling. Negligible for API calls. | OK |
| **Resilience tracker** | `AsyncLocalStorage` has minimal overhead. `Map` operations are O(1). | OK |

---

## 7. Test Coverage Gaps

### Critical Gaps (no tests exist)

| File | Missing Tests | Criticality |
|------|--------------|-------------|
| `src/core/deployment/utils.ts` | `formatDuration()` boundaries, `getTopOperationResilienceHotspots()` sorting/filtering/limit | 9/10 |
| `src/core/deployment/report.ts` | `DeploymentReportGenerator.generate()` structure, `saveToFile()`, status propagation | 8/10 |
| `src/lib/graphql/governor.ts` | `getGraphQLGovernorConfigFromEnv()`, `parseBoolean/Integer` helpers | 8/10 |
| `src/lib/graphql/governor.ts` | `waitForCooldown()` max wait safety valve | 8/10 |

### Missing Scenario Tests

| File | Missing Scenario | Criticality |
|------|-----------------|-------------|
| `shipping-zone-service.ts` | Transient error propagation in create/update | 7/10 |
| `collection-service.ts` | Transient error propagation in product/channel resolution | 7/10 |
| `client.ts` | Non-idempotent mutations NOT retried on 429 | 7/10 |
| `category/repository.ts` | Rate limit error propagation in CRUD operations | 6/10 |
| `product-service.ts` | `primeCategoryCache()` direct tests | 5/10 |

### Test Quality Issues

- **Governor tests use real timers** — fragile on CI, potential flakiness
- **Client tests mutate `RetryConfig` constants** — fragile if `Object.freeze` added
- **Product service tests use `as any` for private methods** — existing pattern, not new

---

## 8. Positive Observations

1. **Consistent transient error guard pattern**: Most catch blocks correctly use `isTransientError(error)` → rethrow. This is the core contract of the resilience system and is well-implemented across services.

2. **Idempotent retry policy**: Only idempotent mutations are retried, preventing dangerous double-creation from retried create mutations.

3. **Structured error classification**: The `error-classification.ts` module provides comprehensive, well-tested type guards that are reused throughout the codebase.

4. **Enhanced pipeline continues on failure**: `EnhancedDeploymentPipeline` correctly catches stage failures and continues to subsequent stages instead of aborting.

5. **Comprehensive test coverage for core utilities**: Error classification (188 lines), resilience tracker (198 lines), governor (140 lines), retry policy (62 lines), client (369 lines) — all well-tested.

6. **Report simplification**: Removing the managed directory/pruning logic in `report-storage.ts` in favor of simple timestamped files reduces complexity without losing functionality.

7. **Size-adaptive strategies**: The stages intelligently switch between sequential and bulk processing based on config size, balancing throughput with rate-limit safety.

---

## 9. Recommended Fix Priority

### P0 — Fix Before Merge

1. **CRIT-2**: Add `isTransientError` guard to `product/repository.ts:1106`
2. **CRIT-4**: Add `isTransientError` guards to media deletion/creation loops
3. **H-8**: Add `isTransientError` guard to `updateExistingProducts` catch block

### P1 — Fix Soon After Merge

4. **CRIT-1**: Change governor max-wait from `return` to `throw`
5. **CRIT-3**: Propagate `GraphQLError` in category repository fallbacks
6. **CRIT-5**: Add `isTransientError` passthrough to `wrapServiceCall`
7. **H-4/H-5**: Switch `Promise.all` to `Promise.allSettled` for post-update operations
8. **H-6**: Add validation error re-throw to `updateShippingZone`

### P2 — Improve Incrementally

9. **M-4/M-5**: Replace magic delay values with `DelayConfig` references
10. **M-9**: Add transient error passthrough to `wrapBatch`
11. Add tests for `utils.ts`, `report.ts`, governor config parsing
12. Fix misleading comment about concurrent processing in `bootstrapCategoriesOptimized`
