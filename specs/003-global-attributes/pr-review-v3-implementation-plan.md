# 003-Global-Attributes: PR Review v3 — Implementation Plan

**Date:** 2026-03-02
**Branch:** `003-global-attributes`
**Review Source:** 5-agent parallel review (performance, error handling/bugs, logging/cliConsole, code quality/design, test coverage)
**Totals:** 4 Critical, 10 High, 12 Medium across all dimensions

---

## Executive Summary

The v3 review focused on production-readiness: performance hotspots, silent error paths, missing user-facing output, code quality violations, and test coverage gaps. The most impactful findings are:

1. **Transient errors silently swallowed** — `EnhancedDeploymentPipeline` catches rate-limit/network errors and continues, breaking the retry contract
2. **Inverted validation guard** — `validateAttributeReferences` skips validation when global sections are empty, allowing invalid refs through
3. **Cache not populated on partial failures** — Downstream stages run with an empty attribute cache when any attribute fails
4. **Zero test coverage** on 7 new files including the core preflight validators and `attributesStage`

---

## Phase 1: Critical Bug Fixes

*These block merge. Each is a standalone fix that can be committed independently.*

### Task 1.1: Fix `EnhancedDeploymentPipeline` transient error swallowing

**File:** `src/core/deployment/enhanced-pipeline.ts:87-124`
**Effort:** Small

**Problem:** The catch block in `executeStageWithResultCollection` catches all errors — including transient errors (rate limit, ECONNREFUSED) — records them as failed stages, and continues. Individual stages explicitly re-throw transient errors via `if (isTransientError(error)) throw error`, but those propagate into this catch block where they are silently consumed.

**Fix:**
```typescript
// In the catch block, before result recording:
} catch (error) {
  if (isTransientError(error)) {
    stopSpinner();
    throw error; // Let transient errors abort the pipeline for caller-level retry
  }
  // ... existing failure handling
}
```

**Test:** Add a test in `enhanced-pipeline.test.ts` that verifies transient errors propagate out of the pipeline instead of being recorded as stage failures.

---

### Task 1.2: Fix `validateAttributeReferences` early-return guard

**File:** `src/core/validation/preflight.ts:184`
**Effort:** Small

**Problem:** When `productAttributes` and `contentAttributes` are both empty, the function returns immediately. This skips validation for `productTypes`/`pageTypes`/`modelTypes` that reference attributes via `{ attribute: "Name" }`. Invalid references proceed to runtime.

**Fix:** The validation should be skipped only when there are no references to validate, not when the definitions are missing. When definitions are missing but references exist, that should be an error.

```typescript
export function validateAttributeReferences(config: SaleorConfig, filePath: string): void {
  const productAttrNames = new Set((config.productAttributes ?? []).map((a) => a.name));
  const contentAttrNames = new Set((config.contentAttributes ?? []).map((a) => a.name));

  // Collect all attribute references from entity types
  const errors: Array<{ path: string; message: string }> = [];

  for (const pt of config.productTypes ?? []) {
    for (const ref of [...(pt.productAttributes ?? []), ...(pt.variantAttributes ?? [])]) {
      if ("attribute" in ref && !productAttrNames.has(ref.attribute)) {
        errors.push({
          path: `productTypes.${pt.name}`,
          message: `References attribute "${ref.attribute}" which does not exist in productAttributes`,
        });
      }
    }
  }

  // ... pageTypes and modelTypes checks remain the same ...

  if (errors.length > 0) {
    throw new ConfigurationValidationError("Unresolved attribute references", filePath, errors);
  }
}
```

**Test:** Add test cases in `preflight.test.ts`:
- Config with `productTypes` referencing `{ attribute: "Color" }` but no `productAttributes` section → should throw
- Config with `productAttributes: [{ name: "Color", ... }]` and matching references → should pass
- Config with no references anywhere → should pass (no-op)

---

### Task 1.3: Fix `executeConcurrently` silent error loss

**File:** `src/core/diff/service.ts:524-543`
**Effort:** Medium

**Problem:** If a promise rejects, the `.then()` handler is skipped, `executePromise` is never removed from `executing`, and `results` silently misses entries. `Promise.race` throws on rejection without cleanup.

**Fix:** Add error handling to track rejections:
```typescript
private async executeConcurrently<T>(promises: readonly Promise<T>[]): Promise<T[]> {
  const results: T[] = [];
  const errors: Error[] = [];
  const executing = new Set<Promise<void>>();

  for (const promise of promises) {
    const executePromise = promise
      .then((result) => {
        results.push(result);
      })
      .catch((error) => {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      })
      .finally(() => {
        executing.delete(executePromise);
      });

    executing.add(executePromise);

    if (executing.size >= this.config.maxConcurrentComparisons) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);

  if (errors.length > 0) {
    throw new AggregateError(errors, `${errors.length} comparison(s) failed`);
  }

  return results;
}
```

---

### Task 1.4: Populate attribute cache with successful attributes on partial failures

**File:** `src/core/deployment/stages.ts:381-398`
**Effort:** Small

**Problem:** When `allFailures.length > 0`, the cache is not populated even for attributes that succeeded. In the `EnhancedDeploymentPipeline`, the thrown `StageAggregateError` is caught and the pipeline continues — so downstream stages run with an empty cache.

**Fix:**
```typescript
// Always populate cache with successful attributes
context.attributeCache.populateProductAttributes(productCached);
context.attributeCache.populateContentAttributes(contentCached);

const stats = context.attributeCache.getStats();
logger.info(
  `Attribute cache populated: ${stats.productAttributeCount} product, ${stats.contentAttributeCount} content`
);

if (allFailures.length > 0) {
  logger.warn(
    `${allFailures.length} attribute(s) failed but ${productCached.length + contentCached.length} cached successfully`
  );
  throw new StageAggregateError(
    "Managing attributes",
    allFailures,
    [...productAttributes, ...contentAttributes, ...legacyAttributes].map((a) => a.name)
  );
}
```

---

## Phase 2: High-Priority Fixes

*These should be fixed before merge. Can be batched into 2-3 commits.*

### Task 2.1: Eliminate N+1 GraphQL query per new attribute

**File:** `src/core/deployment/stages.ts:211-213`
**Effort:** Medium

**Problem:** After creating each attribute in the sequential path, a separate `getAttributesByNames` fetch is issued just to get the ID back. The create mutation already returns the full attribute object.

**Fix:** Modify `bootstrapAttributes` in `attribute-service.ts` to return the created `Attribute[]` (it already has them internally from `Promise.all`). Then use the returned data directly in `processGlobalAttributes` instead of re-fetching.

This also touches `src/modules/attribute/attribute-service.ts` — the `bootstrapAttributes` method needs to return its result.

---

### Task 2.2: Fix O(n^2) patterns (3 locations)

**Effort:** Small (mechanical)

**Location 1:** `src/core/deployment/stages.ts:294`
```typescript
// Before the loop:
const failedNames = new Set(failures.map((f) => f.entity));
// In the loop:
if (attr.id && attr.name && attr.inputType && !failedNames.has(attr.name)) {
```

**Location 2:** `src/modules/attribute/attribute-service.ts:118-119`
```typescript
const existingSet = new Set(existingAttributeNames);
const unassignedAttributeNames = referencedAttributeNames.filter(
  (name) => !existingSet.has(name)
);
```

**Location 3:** `src/modules/attribute/attribute-service.ts:301-303`
```typescript
const idToIndex = new Map(updateInputs.map((u, i) => [u.id, i]));
// In the loop:
const originalIndex = actualUpdate ? (idToIndex.get(actualUpdate.id) ?? -1) : -1;
```

Also fix `src/modules/page-type/page-type-service.ts` (same `includes()` pattern as Location 2).

---

### Task 2.3: Fix global bulk error misattribution

**File:** `src/modules/attribute/attribute-service.ts:248` and `:324`
**Effort:** Small

**Problem:** Global mutation errors are attributed to `attributes[0]`, potentially marking a valid attribute as failed.

**Fix:** Use a sentinel entity name that cannot match any real attribute:
```typescript
for (const err of result.errors) {
  failed.push({
    input: { name: "(global bulk error)" } as FullAttribute,
    errors: [`Global error: ${err.path || ""}: ${err.message}`],
  });
}
```

---

### Task 2.4: Fix `loadRemoteConfiguration` timeout resource leak

**File:** `src/core/diff/service.ts:341-361`
**Effort:** Small

**Problem:** `Promise.race` doesn't cancel the losing promise. The `setTimeout` handle is never cleared.

**Fix:**
```typescript
private async loadRemoteConfiguration(): Promise<SaleorConfig> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Remote configuration retrieval timed out after ${this.config.remoteTimeoutMs}ms`));
      }, this.config.remoteTimeoutMs);
    });

    const configPromise = this.services.configuration.retrieveWithoutSaving();
    const config = await Promise.race([configPromise, timeoutPromise]);
    return config || {};
  } catch (error) {
    throw new RemoteConfigurationError(
      `Failed to retrieve remote configuration: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}
```

---

### Task 2.5: Fix logging/cliConsole issues (3 locations)

**Effort:** Small per location

**Location 1:** `src/core/diff/service.ts:239-253` — Replace `logger.info("📥 ...")` with `cliConsole.muted("📥 ...")` for user-facing progress messages. Currently invisible in CI mode.

**Location 2:** `src/core/deployment/stages.ts:348-352` — Add `cliConsole.warn(...)` alongside `logger.warn(...)` for the legacy `attributes` deprecation warning. Currently suppressed in CI.

**Location 3:** `src/modules/attribute/repository.ts:250` — Change `logger.info("Attribute updated")` to `logger.debug(...)`. This fires per-attribute in a hot path; the service layer already logs this operation.

---

## Phase 3: Code Quality Improvements

*Recommended before merge for maintainability. Can be done in a single commit.*

### Task 3.1: Break down `processGlobalAttributes` (143 lines → ~20 + 3 helpers)

**File:** `src/core/deployment/stages.ts:163-306`

Extract three focused helpers:
- `validateAttributeInputs(attributes, type)` → `{ fullAttributes, failures }`
- `processAttributesSequentially(context, fullAttributes, existingMap, service)` → `{ cached, failures }`
- `processAttributesBulk(context, fullAttributes, existingMap, service, sectionName)` → `{ cached, failures }`

`processGlobalAttributes` becomes a ~20-line orchestrator that calls these three.

---

### Task 3.2: Deduplicate `runPreflightValidation` try/catch blocks

**File:** `src/core/validation/preflight.ts:235-273`

Replace 4 identical try/catch blocks with a loop:
```typescript
const validators = [
  validateNoDuplicateIdentifiers,
  validateNoCrossSectionDuplicates,
  validateNoInlineAttributeDefinitions,
  validateAttributeReferences,
];

for (const validate of validators) {
  try {
    validate(config, filePath);
  } catch (error) {
    if (error instanceof ConfigurationValidationError) {
      errors.push(error);
    } else {
      throw error;
    }
  }
}
```

---

### Task 3.3: Deduplicate `pageTypesStage` / `modelTypesStage`

**File:** `src/core/deployment/stages.ts:463-594`

Extract a shared helper:
```typescript
async function bootstrapEntityTypeStage(
  context: DeploymentContext,
  items: Array<{ name: string }>,
  bootstrapFn: (item: any, options: any) => Promise<void>,
  options: object,
  stageLabel: string
): Promise<void>
```

Both `pageTypesStage` and `modelTypesStage` call this with their specific config key and options.

---

### Task 3.4: Extract `ProductServiceRefs` type

**File:** `src/modules/product/product-service.ts:26-34` and `39-45`

Define the type once and reference it in both locations:
```typescript
type ProductServiceRefs = {
  getPageBySlug?: (slug: string) => Promise<{ id: string } | null>;
  getChannelIdBySlug?: (slug: string) => Promise<string | null>;
  getAttributeByNameFromCache?: (name: string) => Attribute | null;
  getProductTypeIdByName?: (name: string) => Promise<string | null>;
  getCategoryIdBySlug?: (slug: string) => Promise<string | null>;
};
```

---

### Task 3.5: Extract shared bulk result processing

**File:** `src/modules/attribute/attribute-service.ts:213-252` and `298-327`

Extract a shared `processBulkMutationResults()` helper that both `bootstrapAttributesBulk` and `updateAttributesBulk` call.

---

### Task 3.6: Remove `as unknown as` type assertion

**File:** `src/core/deployment/stages.ts:887`

Align the `Attribute` type from the attribute repository with `ProductAttributeMeta` expected by `primeAttributeCache`. Create a shared interface or mapper function.

---

### Task 3.7: Add debug logging to `preflight.ts`

**File:** `src/core/validation/preflight.ts`

Add `import { logger } from "../../lib/logger"` and add:
- `logger.debug("Running preflight validation", { filePath })` at start
- `logger.debug("Preflight validation passed")` at end
- `logger.debug("Skipping attribute reference validation: no global sections")` on early-exit paths

---

### Task 3.8: Add summary debug log to `configService.mapGlobalAttributeSections`

**File:** `src/modules/config/config-service.ts`

Add at the end of `mapGlobalAttributeSections`:
```typescript
logger.debug("Global attributes mapped", {
  productAttributeCount: productAttributes.length,
  contentAttributeCount: contentAttributes.length,
});
```

---

### Task 3.9: Minor cleanups

- Remove commented-out `// slug: existingProduct.slug` at `src/modules/product/product-service.ts:483`
- Replace 3 separate `.filter().length` calls with single loop in `calculateSummary` at `src/core/diff/service.ts:548-551`

---

## Phase 4: Test Coverage

*Critical gap — 7 new files have zero test coverage. These should be added before merge.*

### Task 4.1: Tests for `preflight.ts` new validators

**File to create:** `src/core/validation/preflight.test.ts` (extend existing)
**Covers:** `validateNoCrossSectionDuplicates`, `validateAttributeReferences`, `runPreflightValidation`

**Test cases:**
- Cross-section duplicate: attribute "Color" in both `productAttributes` and `contentAttributes` → throws
- Cross-section: no overlap → passes
- Reference validation: `productType` refs `{ attribute: "Color" }` with `productAttributes: [{ name: "Color" }]` → passes
- Reference validation: ref to non-existent attribute → throws with correct path
- Reference validation: `pageType` refs attribute not in `contentAttributes` → throws
- Reference validation: no global sections and no refs → no-op
- Reference validation: no global sections but refs exist → throws (after Task 1.2 fix)
- `runPreflightValidation`: zero errors → no throw
- `runPreflightValidation`: single error → throws that error directly
- `runPreflightValidation`: multiple errors → throws combined error with all validation errors

---

### Task 4.2: Tests for `inline-attribute-validator.ts`

**File to create:** `src/modules/config/validation/inline-attribute-validator.test.ts`
**Covers:** `isAttributeReference`, `isInlineAttributeDefinition`, `extractInlineAttributeNames`, `validateNoInlineDefinitions`

**Test cases:**
- `isAttributeReference({ attribute: "Color" })` → true
- `isAttributeReference({ attribute: "Color", variantSelection: true })` → true
- `isAttributeReference({ name: "Color", inputType: "DROPDOWN" })` → false
- `isInlineAttributeDefinition({ name: "Color", inputType: "DROPDOWN" })` → true
- `isInlineAttributeDefinition({ attribute: "Color" })` → false
- Object with both `attribute` and `inputType` → treated as reference (not inline)
- `validateNoInlineDefinitions`: config with only references → empty array
- `validateNoInlineDefinitions`: config with inline in productTypes → returns error
- `validateNoInlineDefinitions`: config with inline in pageTypes → returns error
- `validateNoInlineDefinitions`: config with inline in modelTypes → returns error
- `validateNoInlineDefinitions`: empty config → empty array

---

### Task 4.3: Tests for `validation-errors.ts`

**File to create:** `src/lib/errors/validation-errors.test.ts`
**Covers:** `InlineAttributeError`, `AttributeNotFoundError`, `WrongAttributeTypeError`

**Test cases:**
- `InlineAttributeError`: message formatting, `getRecoverySuggestions()` returns 3 suggestions
- `AttributeNotFoundError`: with `similarNames = []` → no "did you mean" suggestion
- `AttributeNotFoundError`: with `similarNames = ["Color", "Colour", "Size", "Material"]` → truncates to 3
- `WrongAttributeTypeError`: `foundInSection = "productAttributes"` → message says "product attribute"
- `WrongAttributeTypeError`: `foundInSection = "contentAttributes"` → message says "content attribute"

---

### Task 4.4: Tests for `string.ts`

**File to create:** `src/lib/utils/string.test.ts`
**Covers:** `levenshteinDistance`, `toSlug`, `findSimilarNames`

**Test cases:**
- `levenshteinDistance("", "")` → 0
- `levenshteinDistance("kitten", "sitting")` → 3
- `levenshteinDistance("abc", "abc")` → 0
- `toSlug("Hello World!")` → `"hello-world"`
- `toSlug("-leading-and-trailing-")` → `"leading-and-trailing"`
- `toSlug("")` → `""`
- `toSlug("Already-slug")` → `"already-slug"`
- `findSimilarNames("color", ["colour", "Color", "size"])` → excludes exact case match, includes "colour"
- `findSimilarNames("xyz", ["abc", "def"])` → empty (too distant)

---

### Task 4.5: Tests for `deployment/utils.ts`

**File to create:** `src/core/deployment/__tests__/utils.test.ts`
**Covers:** `formatDuration`, `getTopOperationResilienceHotspots`

**Test cases:**
- `formatDuration(0)` → `"0ms"`
- `formatDuration(500)` → `"500ms"`
- `formatDuration(1000)` → `"1.0s"`
- `formatDuration(59999)` → sub-60s format
- `formatDuration(60000)` → `"1m 0s"`
- `formatDuration(90000)` → `"1m 30s"`
- `getTopOperationResilienceHotspots(undefined)` → `[]`
- `getTopOperationResilienceHotspots(emptyMap)` → `[]`
- All operations with `throttleEvents = 0` → `[]` (all filtered)
- Multiple operations → sorted by throttle desc, then total desc, then alpha
- `limit` parameter respected

---

### Task 4.6: Tests for `attributesStage`

**File to extend:** `src/core/deployment/__tests__/stages.test.ts`

**Test cases:**
- Happy path: `productAttributes` and `contentAttributes` processed, cache populated
- Legacy `attributes` section triggers deprecation path
- Partial failures: cache still populated with successful attributes (after Task 1.4 fix)
- All failures: `StageAggregateError` thrown
- Skip logic: `attributesStage.skip` returns true when no attribute entity types in summary
- Empty config (no attributes) → no-op, no errors

---

## Execution Order

```
Phase 1 (Critical)  →  Phase 2 (High)  →  Phase 3 (Quality)  →  Phase 4 (Tests)
    1.1 ──┐              2.1 ──┐            3.1 ──┐               4.1 ──┐
    1.2 ──┤              2.2 ──┤            3.2 ──┤               4.2 ──┤
    1.3 ──┤  (1 commit)  2.3 ──┤            3.3 ──┤               4.3 ──┤
    1.4 ──┘              2.4 ──┤  (1-2      3.4 ──┤  (1 commit)   4.4 ──┤ (1-2
                         2.5 ──┘  commits)  3.5 ──┤               4.5 ──┤ commits)
                                            3.6 ──┤               4.6 ──┘
                                            3.7 ──┤
                                            3.8 ──┤
                                            3.9 ──┘
```

**Dependencies:**
- Task 4.1 depends on Task 1.2 (test cases for the fixed early-return guard)
- Task 4.6 depends on Task 1.4 (test case for partial-failure cache population)
- All Phase 4 tasks can run in parallel with each other (except the above)
- Phase 3 tasks are independent of each other

---

## Verification Checklist

After all phases complete:

```bash
pnpm check:fix     # Lint and format
pnpm build          # TypeScript compilation
pnpm test           # Full test suite
npx tsc --noEmit    # Strict type check
pnpm check:ci       # CI validation
```

---

## Scope Notes

**Explicitly deferred (not in this plan):**
- Sequential N+1 `getChannelBySlug` calls in `channelsStage` (pre-existing pattern, not introduced by this PR)
- `resolveWarehouseSlugsToIds` / `resolveChannelSlugsToIds` duplication in `shipping-zone-service.ts` (pre-existing, not introduced by this PR)
- `bootstrapPageType` still has inline attribute creation code path (backward compatibility period — will be removed when inline definitions are fully deprecated)
- `DeploymentReportGenerator` unit tests (low-risk formatter code, covered indirectly by integration tests)
