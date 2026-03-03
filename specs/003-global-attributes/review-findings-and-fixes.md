# 003-Global-Attributes: Critical Review & Implementation Plan (v2)

**Date:** 2026-02-23
**Branch:** `003-global-attributes`
**Reviewer:** Claude Code (pessimistic analysis, 3 independent review agents)
**Status:** Previous P0 issues (C1-C3) fixed. New issues found at depth. Unstaged fixes in progress.

---

## Executive Summary

The global attributes feature introduces `productAttributes` and `contentAttributes` as top-level YAML sections. The original P0 issues from v1 review have been addressed (diff comparisons, duplicate detection, cross-section validation). However, three independent deep-dive reviews uncovered **2 CRITICAL**, **11 HIGH**, and **10 MEDIUM** issues that remain — primarily in error handling, resilience, type safety, and code quality.

The highest-impact root cause is `AttributeRepository.getAttributesByNames` silently swallowing GraphQL errors, which cascades into 5+ downstream silent failures.

---

## v1 Review Status (for reference)

| Original ID | Status | Notes |
|-------------|--------|-------|
| C1 (diff comparisons missing) | **FIXED** | `productAttributes`/`contentAttributes` added to `createComparators()` and `performComparisons()` |
| C2 (within-section duplicate detection) | **FIXED** | Added to `scanForDuplicateIdentifiers` in `preflight.ts` |
| C3 (cross-section duplicate detection) | **FIXED** | New `validateNoCrossSectionDuplicates` function added |
| H1 (pageTypes not checked by inline validator) | **FIXED** | `pageTypes` loop added to `validateNoInlineDefinitions` |
| H4 (cache coherence) | **FIXED** | Cache only populated on zero failures |
| H5 (fulfilled-but-null warning) | **PARTIALLY FIXED** | Warning added, but null results still not treated as failures |
| M5 (dead code) | **FIXED** | `mapAllAttributes` removed |
| M6 (string utils mislocated) | **FIXED** | Moved to `src/lib/utils/string.ts` |
| M7 (slug regex) | **FIXED** | Updated to `/[^a-z0-9]+/g` |

---

## NEW Findings (v2)

### P0: CRITICAL — Must fix before merge

#### C1: `getAttributesByNames` repository method silently swallows all GraphQL/network errors

**File:** `src/modules/attribute/repository.ts` (~line 258)
**Confidence:** 95%

**Problem:** Unlike every other repository method (`createAttribute`, `updateAttribute`, `bulkCreateAttributes`, `bulkUpdateAttributes`), the `getAttributesByNames` method does NOT check `result.error`. It returns `result.data?.attributes?.edges?.map(...)` which evaluates to `undefined` when the GraphQL query fails. Every caller must then handle `undefined` returns, and as documented below, many do so silently.

**Impact:** This is the root cause of findings H1, H2, H3, H6, H7. Any transient API issue during attribute lookup is silently swallowed, producing confusing downstream "attribute not found" errors that mislead users into thinking their config is wrong.

**Fix:**
```typescript
async getAttributesByNames(input: GetAttributesByNamesInput) {
  const result = await this.client.query(getAttributesByNamesQuery, {
    names: input.names,
    type: input.type,
  });

  if (result.error) {
    throw GraphQLError.fromCombinedError(result.error, "GetAttributesByNames");
  }

  return result.data?.attributes?.edges?.map((edge) => edge.node as Attribute) ?? [];
}
```

Also update the `AttributeOperations` interface return type from `Promise<Attribute[] | null | undefined>` to `Promise<Attribute[]>`.

---

#### C2: `attributesStage` has no try/catch — only stage without error wrapping

**File:** `src/core/deployment/stages.ts` lines 267-368
**Confidence:** 95%

**Problem:** Every other stage wraps its body in `try { ... } catch (error) { throw new Error("Failed to manage X: ...") }`. The `attributesStage` does not. If `configStorage.load()` throws a YAML parse error, or `processGlobalAttributes` throws an unexpected runtime error, the raw error propagates without the standardized error wrapping that the deployment error classifier expects.

**Fix:**
```typescript
async execute(context) {
  try {
    const config = (await context.configurator.services.configStorage.load()) as SaleorConfig;
    // ... existing logic ...
  } catch (error) {
    if (error instanceof StageAggregateError) {
      throw error; // preserve structured error
    }
    throw new Error(
      `Failed to manage attributes: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
```

---

### P1: HIGH — Should fix before merge

#### H1: `resolveAttributeNamesWithCache` can push IDs without confirming names, causing false "not found" errors

**File:** `src/modules/attribute/attribute-service.ts` lines 352-356
**Confidence:** 90%

**Problem:** When the API returns attributes with `name: null`, the ID is pushed to `resolvedIds` but the name doesn't appear in `resolvedNameSet`, so the attribute ends up in both `resolvedIds` AND `unresolvedNames` simultaneously. This triggers a `AttributeNotFoundError` for an attribute whose ID was already resolved.

**Fix:** Only push IDs when name is confirmed non-null:
```typescript
if (apiResolved) {
  const resolvedApiAttrs = apiResolved.filter((a) => a.name);
  const resolvedNameSet = new Set(resolvedApiAttrs.map((a) => a.name as string));
  resolvedIds.push(...resolvedApiAttrs.map((a) => a.id));
  const stillUnresolved = cacheMisses.filter((n) => !resolvedNameSet.has(n));
  return { resolvedIds, unresolvedNames: stillUnresolved };
}
```

---

#### H2: Null re-fetch after attribute creation treated as warning, not failure

**File:** `src/core/deployment/stages.ts` lines 206-210
**Confidence:** 90%

**Problem:** When `processGlobalAttributes` creates an attribute but the subsequent re-fetch returns null (eventual consistency, API glitch), the result is logged as a warning but NOT added to `failures`. The cache is populated without this attribute, and `allFailures.length === 0` remains true. Downstream stages get a cache miss and produce a misleading `AttributeNotFoundError`.

**Fix:** Treat null results as failures:
```typescript
} else if (r.status === "fulfilled" && r.value === null) {
  const attrName = fullAttributes[i]?.name ?? "unknown";
  failures.push({
    entity: attrName,
    error: new Error(
      `Attribute "${attrName}" was created but could not be verified (no ID returned from API)`
    ),
  });
}
```

---

#### H3: `bootstrapAttributesBulk` global errors logged but never surfaced to caller

**File:** `src/modules/attribute/attribute-service.ts` lines 236-238
**Confidence:** 90%

**Problem:** Top-level mutation errors (`result.errors`) are logged with `logger.warn` but NOT included in the returned `failed` array. These can indicate authentication failures, rate limiting, or server errors affecting the entire operation. The caller sees `{ successful: [], failed: [] }` with no indication of what went wrong. Same issue in `updateAttributesBulk` (lines 302-304).

**Fix:** Mark all unprocessed attributes as failed when global errors exist:
```typescript
if (result.errors && result.errors.length > 0) {
  const globalErrorMessages = result.errors.map((e) => `${e.path || ""}: ${e.message}`);
  logger.error("Global errors during bulk attribute creation", { errors: result.errors });

  const processedNames = new Set([
    ...successful.map((s) => s.name),
    ...failed.map((f) => f.input.name),
  ]);
  for (const attr of attributes) {
    if (!processedNames.has(attr.name)) {
      failed.push({
        input: attr,
        errors: [`Global mutation error: ${globalErrorMessages.join("; ")}`],
      });
    }
  }
}
```

---

#### H4: `bootstrapAttributesBulk` silently drops results with no errors AND no attribute

**File:** `src/modules/attribute/attribute-service.ts` lines 215-233
**Confidence:** 88%

**Problem:** If a bulk result has `{ attribute: null, errors: [] }` (possible with `IGNORE_FAILED` error policy), the result falls through both conditions. The attribute is neither counted as successful nor failed. Same issue in `updateAttributesBulk` (lines 284-298).

**Fix:** Add explicit else clause:
```typescript
} else {
  const fallbackInput = attributes[index];
  if (fallbackInput) {
    failed.push({
      input: fallbackInput,
      errors: [`API returned neither attribute nor errors for "${fallbackInput.name}"`],
    });
  }
}
```

---

#### H5: `updateAttributesBulk` index mapping bug can crash during error reporting

**File:** `src/modules/attribute/attribute-service.ts` line 286
**Confidence:** 88%

**Problem:** `updateInputs.findIndex(...)` maps from filtered `actualUpdates[index]` back to the original `updates` array. If `findIndex` returns -1 (shouldn't happen, but no guard), `updates[-1]` is `undefined`, causing a `TypeError` at line 289. This crash during error processing masks the actual bulk update errors.

**Fix:** Add guard:
```typescript
const originalIndex = updateInputs.findIndex((u) => u.id === actualUpdates[index].id);
if (originalIndex === -1 || !updates[originalIndex]) {
  logger.error("Failed to map bulk update result back to original input", { index });
  return;
}
```

---

#### H6: `updateAttributes` in ProductTypeService checks only `productAttributes`, misses `variantAttributes`

**File:** `src/modules/product-type/product-type-service.ts` lines 461-463
**Confidence:** 88%

**Problem:** `createAttributes` correctly checks both `productType.productAttributes` AND `productType.variantAttributes` (lines 503-506), but `updateAttributes` checks ONLY `productAttributes`. When `upsertAndAssignAttributes` is called for `type === "VARIANT"`, variant attributes won't be found in `existingAttributeNames`, so they're never updated even when their definitions change.

**Fix:** Mirror `createAttributes`:
```typescript
const existingAttributeNames = new Set([
  ...(productType.productAttributes?.map((attr) => attr.name) ?? []),
  ...(productType.variantAttributes?.map((attr) => attr.name) ?? []),
]);
```

---

#### H7: Catch-and-rethrow in PageTypeService.bootstrapPageType loses structured errors

**File:** `src/modules/page-type/page-type-service.ts` lines 180-186 and 202-208
**Confidence:** 88%

**Problem:** When `resolveReferencedAttributesWithCache` throws `AttributeNotFoundError` or `WrongAttributeTypeError` (which have `similarNames`, `getRecoverySuggestions()`, structured codes), the catch block wraps it in a generic `PageTypeAttributeError` that only preserves the `.message` string. The CLI formatter that may format these errors specially receives a generic error instead.

**Fix:** Preserve structured errors:
```typescript
} catch (error) {
  if (error instanceof AttributeNotFoundError || error instanceof WrongAttributeTypeError) {
    throw error; // preserve rich error context
  }
  throw new PageTypeAttributeError(
    `Failed to resolve referenced attributes for page type: ${
      error instanceof Error ? error.message : String(error)
    }`,
    input.name,
    "attribute_resolution"
  );
}
```

---

#### H8: `buildConfig` catch swallows `UnsupportedInputTypeError`, silently disabling global attributes

**File:** `src/modules/config/config-service.ts` lines 66-85
**Confidence:** 85%

**Problem:** When `mapGlobalAttributeSections` throws `UnsupportedInputTypeError`, the catch block logs the error but continues without `productAttributes` or `contentAttributes`. One unsupported attribute type silently disables the entire feature. Worse: `mapAttribute` is called in a loop, so ONE bad attribute out of hundreds causes ALL to fall back to inline.

**Fix:** Handle per-attribute instead of per-section in `mapGlobalAttributeSections`:
```typescript
try {
  fullAttr = this.mapAttribute(node as RawAttribute, type);
} catch (error) {
  if (error instanceof UnsupportedInputTypeError) {
    logger.warn(`Skipping attribute "${node.name}" with unsupported input type: ${node.inputType}`);
    continue;
  }
  throw error;
}
```

---

#### H9: `productTypesStage` catch block re-wraps `StageAggregateError`, losing structured data

**File:** `src/core/deployment/stages.ts` lines 111-118
**Confidence:** 85%

**Problem:** The catch block checks `error.message.includes("Failed to manage product type")` but `StageAggregateError` has a different message format. The error is caught and re-wrapped in a generic `new Error(...)`, losing the `failures` array, `successes` array, and `getUserMessage()` formatting. Same issue in `pageTypesStage` (line 458) and `modelTypesStage` (line 518).

**Fix:** Check by type, not message:
```typescript
} catch (error) {
  if (error instanceof StageAggregateError) {
    throw error;
  }
  throw new Error(
    `Failed to manage product types: ${error instanceof Error ? error.message : String(error)}`
  );
}
```

---

#### H10: `mapGlobalAttributeSections` silent type coercion accepts unexpected `node.type` values

**File:** `src/modules/config/config-service.ts` line 303
**Confidence:** 85%

**Problem:** `(node.type as "PRODUCT_TYPE" | "PAGE_TYPE") ?? "PRODUCT_TYPE"` — the `as` cast runs only at compile time. At runtime, if Saleor returns a new/unexpected type, the `??` only protects against null/undefined, not unexpected strings. An unexpected value silently drops the attribute from both sections.

**Fix:** Add explicit guard:
```typescript
if (node.type !== "PRODUCT_TYPE" && node.type !== "PAGE_TYPE") {
  logger.warn(`Skipping attribute "${node.name}" with unexpected type "${node.type}"`);
  continue;
}
const type = node.type;
```

---

#### H11: `createAttributes` accesses `createdAttributes[0]` without null check

**File:** `src/modules/product-type/product-type-service.ts` line 537
**Confidence:** 85%

**Problem:** If `bootstrapAttributes` returns an empty array (mutation fails silently), `createdAttributes[0]` is `undefined`, which gets pushed into `newAttributes` and later causes `TypeError` when trying to access `.id`.

**Fix:**
```typescript
if (!createdAttributes[0]) {
  throw new ProductTypeAttributeError(
    `Failed to create attribute "${attributeInput.name}" — API returned no result`,
    productType.name ?? "unknown",
    attributeInput.name
  );
}
newAttributes.push(createdAttributes[0]);
```

---

### P2: MEDIUM — Should fix, can follow up

#### M1: `runPreflightValidation` fail-fast on first error prevents multi-error reporting

**File:** `src/core/validation/preflight.ts` lines 183-192
**Confidence:** 83%

**Problem:** Each validator throws independently. If config has BOTH duplicate identifiers AND cross-section collisions, user only sees the first. Fix-rerun-see-second creates poor developer experience.

**Fix:** Collect and aggregate errors, throw combined.

---

#### M2: `toFullAttribute` throws opaque Zod errors without attribute context

**File:** `src/core/deployment/stages.ts` lines 137-142
**Confidence:** 83%

**Problem:** `fullAttributeSchema.parse(...)` throws raw `ZodError` without naming which attribute or section failed. Use `safeParse` and add context.

---

#### M3: Config loaded from disk on every stage call — no caching

**File:** `src/core/deployment/stages.ts` (16+ call sites)
**Confidence:** 80%

**Problem:** Every stage independently calls `configStorage.load()` which re-reads and re-parses YAML from disk. If the file changes between stages, different stages see different config. Adds unnecessary latency.

**Fix:** Load config once in the pipeline and pass through context, or add caching to `YamlConfigurationManager.load()`.

---

#### M4: Slug generation duplicated 3 times

**Files:** `stages.ts:191-194`, `stages.ts:254-257`, `attribute-service.ts:26-29`
**Confidence:** 95%

**Problem:** Identical slug generation regex in 3 places. If the algorithm needs to change, all 3 must be updated in sync.

**Fix:** Extract to shared utility:
```typescript
// src/lib/utils/string.ts
export function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
```

---

#### M5: `pageTypesStage` and `modelTypesStage` are 90% identical code

**File:** `src/core/deployment/stages.ts` lines 414-529
**Confidence:** 90%

**Problem:** ~115 lines of nearly identical Promise.allSettled + error handling logic. Any bug fix must be applied in both places.

**Fix:** Extract a shared helper like `processEntityTypesWithFallback(entities, bootstrapFn, stageName)`.

---

#### M6: `pageTypesStage` uses `Promise.allSettled` while `productTypesStage` uses `processInChunks`

**File:** `src/core/deployment/stages.ts`
**Confidence:** 80%

**Problem:** Inconsistent concurrency control. `productTypesStage` has rate-limiting via chunks, while `pageTypesStage` fires all page types concurrently. For large configs this could hit Saleor rate limits.

**Fix:** Use `processInChunks` consistently, or document the deliberate difference.

---

#### M7: `WrongAttributeTypeError` recovery suggestion is misleading

**File:** `src/lib/errors/validation-errors.ts` lines 89-95
**Confidence:** 80%

**Problem:** Suggests "Move attribute from X to Y" which changes the Saleor API type and may break other entities referencing it.

**Fix:** Add caveat about downstream impact.

---

#### M8: `processGlobalAttributes` bulk path has no try/catch around API calls

**File:** `src/core/deployment/stages.ts` lines 231-261
**Confidence:** 85%

**Problem:** `bootstrapAttributesBulk`, `updateAttributesBulk`, and `getAttributesByNames` are awaited without try/catch. If any throws, the error propagates unwrapped (compounded by C2).

**Fix:** Wrap in try/catch with section context.

---

#### M9: `resolveReferencedAttributes` (old path) silently returns empty when API returns nothing

**File:** `src/modules/attribute/attribute-service.ts` lines 135-141
**Confidence:** 80%

**Problem:** Logs warning and returns `[]` when no attributes found. Deployment proceeds without attribute assignment.

**Fix:** Consider deprecating this old method since the new cache-first path has proper error handling.

---

#### M10: Cache-hit `Attribute` objects have `choices: null, entityType: null` — fragile contract

**File:** `src/modules/product-type/product-type-service.ts` lines 215-222
**Confidence:** 75%

**Problem:** Minimal `Attribute` objects constructed from cache hits have null values for fields that downstream code may access. Currently safe because these objects are only used for assignment, not for update logic. But the contract is fragile.

**Fix:** Consider adding a dedicated `CacheResolvedAttribute` type or enriching `CachedAttribute` with needed fields.

---

## Implementation Plan

### Phase 1: Root Cause Fix (C1) — Highest Leverage

Fix `getAttributesByNames` repository method to throw on errors. This single fix cascades improvements through H1, H2, H6, H7, M9.

**Files:** `src/modules/attribute/repository.ts`
**Dependencies:** None
**Risk:** Low (adding error checking that every other method already has)

---

### Phase 2: Error Handling & Resilience (C2, H2-H5, H8-H11)

#### 2a: Add try/catch to `attributesStage` (C2)
**Files:** `src/core/deployment/stages.ts`

#### 2b: Fix null re-fetch as failure (H2)
**Files:** `src/core/deployment/stages.ts`

#### 2c: Surface bulk global errors (H3)
**Files:** `src/modules/attribute/attribute-service.ts`

#### 2d: Handle missing bulk results (H4)
**Files:** `src/modules/attribute/attribute-service.ts`

#### 2e: Guard bulk update index mapping (H5)
**Files:** `src/modules/attribute/attribute-service.ts`

#### 2f: Per-attribute error handling in mapGlobalAttributeSections (H8)
**Files:** `src/modules/config/config-service.ts`

#### 2g: Fix StageAggregateError re-wrapping (H9)
**Files:** `src/core/deployment/stages.ts`

#### 2h: Guard against null API type in mapGlobalAttributeSections (H10)
**Files:** `src/modules/config/config-service.ts`

#### 2i: Guard `createdAttributes[0]` access (H11)
**Files:** `src/modules/product-type/product-type-service.ts`

**Dependencies:** Phase 1 should come first, but 2a-2i are independent of each other.

---

### Phase 3: Logic Fixes (H1, H6, H7)

#### 3a: Fix `resolveAttributeNamesWithCache` name/id sync (H1)
**Files:** `src/modules/attribute/attribute-service.ts`

#### 3b: Fix `updateAttributes` to check both attribute sets (H6)
**Files:** `src/modules/product-type/product-type-service.ts`

#### 3c: Preserve structured errors in PageTypeService (H7)
**Files:** `src/modules/page-type/page-type-service.ts`

**Dependencies:** Independent of Phase 1 and 2.

---

### Phase 4: Code Quality (M1-M10) — Can follow up

#### 4a: Aggregate preflight validation errors (M1)
#### 4b: Add context to Zod parse errors (M2)
#### 4c: Cache config loading or load once (M3)
#### 4d: Extract shared slug utility (M4)
#### 4e: Consolidate pageTypes/modelTypes stage logic (M5)
#### 4f: Use consistent concurrency control (M6)
#### 4g: Improve WrongAttributeTypeError suggestion (M7)
#### 4h: Add try/catch to bulk path (M8)
#### 4i: Deprecate old resolveReferencedAttributes (M9)
#### 4j: Strengthen cache-hit type contract (M10)

**Dependencies:** Independent. Can be done as follow-up PR.

---

## Implementation Order (Dependency Graph)

```
Phase 1 (ROOT CAUSE):
  C1: Fix getAttributesByNames error handling ─────────────┐
                                                           │
Phase 2 (ERROR HANDLING) - can start after Phase 1:       │
  C2: attributesStage try/catch ────────────┐              │
  H2: Null re-fetch as failure ─────────────┤              │
  H3: Bulk global errors ──────────────────┤              │
  H4: Missing bulk results ─────────────────┤─ Parallel ──┤
  H5: Index mapping guard ─────────────────┤              │
  H8: Per-attribute error in mapGlobal ─────┤              │
  H9: StageAggregateError preservation ─────┤              │
  H10: Guard node.type ─────────────────────┤              │
  H11: Guard createdAttributes[0] ──────────┘              │
                                                           │
Phase 3 (LOGIC FIXES) - independent:                      │
  H1: Name/ID sync in cache resolution ────┐              │
  H6: updateAttributes scope fix ───────────┤─ Parallel ──┘
  H7: Preserve structured errors ──────────┘

Phase 4 (CODE QUALITY) - follow up PR:
  M1-M10 ─── All independent
```

---

## Verification Checklist

After all fixes:
- [ ] All existing tests pass (`pnpm test`)
- [ ] New tests added for each error handling fix
- [ ] `pnpm check:ci` passes
- [ ] `pnpm build` succeeds
- [ ] `npx tsc --noEmit` passes
- [ ] E2E: introspect → deploy → deploy (idempotent) → introspect → diff (no changes)
- [ ] Test with partially failing Saleor API (simulate network errors)
- [ ] Test with large config (> threshold) to exercise bulk paths
- [ ] Test with `--include=productTypes` without `--include=productAttributes`
- [ ] Verify error messages include actionable context and recovery suggestions
- [ ] Test with attribute that has unsupported inputType (verify graceful skip)
- [ ] Verify `StageAggregateError` formatting preserved through deployment error classifier

---

## Risk Assessment

| Fix | Risk | Mitigation |
|-----|------|------------|
| C1 (repository error handling) | LOW | Adding standard error checking pattern already used by all other methods |
| C2 (attributesStage try/catch) | LOW | Following existing stage pattern; preserving StageAggregateError passthrough |
| H1 (name/ID sync) | MEDIUM | Need to verify API never returns null names for valid attributes |
| H6 (updateAttributes scope) | LOW | Aligning with existing `createAttributes` logic |
| H7 (preserve structured errors) | LOW | Only changes re-throw behavior; no logic changes |
| H9 (StageAggregateError) | MEDIUM | Need to verify all stage error types that should pass through |
| Phase 4 (code quality) | LOW | Non-behavioral changes; purely structural |
