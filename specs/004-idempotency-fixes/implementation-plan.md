# 004 - Idempotency Fixes Implementation Plan

> Discovered during E2E testing of `feat/003-rate-limiting-resilience`. These are **pre-existing bugs** in the diff engine and config mapping that cause false diffs on a second deploy.

## Problem Summary

After a successful deploy, a second deploy with no config changes still shows **58 changes** (16 updates, 42 deletes). A truly idempotent system should show **0 changes**.

---

## Issue 1: publishedAt Ghost Diff (Products)

**Symptom**: Product channel listings always show as "changed" on second deploy.

**Root Cause**: `src/core/diff/comparators/product-comparator.ts:398-427`
- `normalizeChannelListing()` includes `publishedAt` from the remote when present
- Local YAML from introspect never includes `publishedAt` (it's not part of the config schema)
- Result: remote has `publishedAt: "2026-02-27T..."`, local has no `publishedAt` → always different

**Fix**:
- In `normalizeChannelListing()`, only include fields that are present in **both** local and remote, OR
- Strip `publishedAt` from remote before comparison since it's not a user-controlled field (Saleor auto-sets it when `isPublished` changes)
- Recommended: strip `publishedAt` and `availableForPurchase` from comparison when the local listing doesn't include them

**File**: `src/core/diff/comparators/product-comparator.ts`
**Lines**: 413-425
**Complexity**: Low
**Risk**: Low

---

## Issue 2: Variant Attribute Ordering (Products)

**Symptom**: Variant attributes show as "changed" even when values are identical.

**Root Cause**: `src/core/diff/comparators/product-comparator.ts:346`
```typescript
if (JSON.stringify(local.attributes) !== JSON.stringify(remote.attributes))
```
- `JSON.stringify` is order-sensitive for object keys
- Remote attributes may return in a different key order than local YAML
- Result: `{"color":"red","size":"M"}` ≠ `{"size":"M","color":"red"}`

**Fix**:
- Sort attribute keys before comparison, or
- Use a deep-equal with order-insensitive object comparison
- Recommended: normalize both sides by sorting keys alphabetically before `JSON.stringify`

```typescript
const sortedStringify = (obj: unknown) =>
  JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort());
```

**File**: `src/core/diff/comparators/product-comparator.ts`
**Lines**: 346
**Complexity**: Low
**Risk**: Low

---

## Issue 3: Missing Attributes with Falsy Values (Products)

**Symptom**: Attributes like "Load Index" or "XL Rating" with value `0` or `""` are silently dropped during introspect, causing ghost creates/deletes.

**Root Cause**: `src/modules/config/config-service.ts:935-948`
```typescript
.filter((value): value is string => Boolean(value));
// ...
if (rawValues.length === 1) {
  result[attributeName] = rawValues[0];
} else if (rawValues.length > 1) {
  result[attributeName] = rawValues;
}
// No else → attributes with 0 values are silently omitted
```
- `Boolean("")` is `false`, `Boolean("0")` doesn't apply here since these are already strings
- The real issue: attributes whose ALL values are empty/undefined after `.filter(Boolean)` end up with `rawValues.length === 0` → attribute omitted entirely
- This means any attribute with only empty/null values on remote won't appear in the introspected config, but Saleor still has them

**Fix**:
- When `rawValues.length === 0` but the attribute exists on remote, still include it as `null` or empty string in the config
- Or: include a sentinel that indicates "attribute present but empty" so the comparator doesn't see it as "missing"
- Recommended: emit the attribute key with `null` value when the attribute exists but has no meaningful values

**File**: `src/modules/config/config-service.ts`
**Lines**: 944-948
**Complexity**: Medium (needs corresponding comparator awareness of `null` values)
**Risk**: Medium (changes config schema semantics)

---

## Issue 4: Category Subcategories Pagination (Config Introspect)

**Symptom**: Categories with >50 subcategories are truncated during introspect, causing ghost deletes of missing child categories.

**Root Cause**: `src/modules/config/repository.ts:113`
```graphql
categories(first: 50) {
```
- Hard limit of 50 subcategories per parent category
- No pagination cursor (`after` parameter)
- If a parent has >50 children, the rest are invisible to introspect
- They appear in the remote (via `category/repository.ts` which does paginate) but not in the local config → ghost deletes

**Fix**:
- Add pagination to the subcategories query in `config/repository.ts`
- Follow the pattern already used in `category/repository.ts:64-66` which has `$after: String` and `first: 100`
- Recommended: paginate subcategories with `first: 100, after: $cursor` in a loop

**File**: `src/modules/config/repository.ts`
**Lines**: 113
**Complexity**: Medium (requires restructuring the query or post-fetching subcategories)
**Risk**: Low

---

## Issue 5: Shipping Method Currency Default (Shipping Zones)

**Symptom**: Shipping methods show as "updated" even when nothing changed.

**Root Cause**: `src/core/diff/comparators/shipping-zone-comparator.ts:247-260`
```typescript
currency: listing.price?.currency || "USD",
// ... and for input:
currency: inputListing.currency || "USD",
```
- When YAML doesn't include `currency`, it defaults to `"USD"`
- Remote has the actual currency (e.g., `"EUR"` for European channels)
- Result: local `"USD"` ≠ remote `"EUR"` → always shows as changed

**Fix**:
- Don't default currency to `"USD"` for local listings
- Instead, use the remote's currency when local doesn't specify one (inherit from remote on comparison)
- Or: during introspect, always include currency in the YAML so it round-trips correctly
- Recommended: always include currency in introspected config AND change default to `undefined` instead of `"USD"` so missing values don't create false diffs

**File**: `src/core/diff/comparators/shipping-zone-comparator.ts`
**Lines**: 247, 257
**Also**: Check introspect mapping to ensure currency is always emitted
**Complexity**: Low
**Risk**: Medium (changing default could affect deploys that rely on USD default)

---

## Issue 6: Warehouse Phone Normalization

**Symptom**: Warehouse address shows as "updated" due to phone number format differences.

**Root Cause**: `src/core/diff/comparators/warehouse-comparator.ts:153-161`
```typescript
// City gets case-insensitive comparison, but phone does NOT
field === "city"
  ? localValue.toLowerCase() !== remoteValue.toLowerCase()
  : localValue !== remoteValue;
```
- Saleor uses `libphonenumber` to normalize phone numbers on save (e.g., `+1234567890` → `+1 234 567 890`)
- Strict string equality means the pre-normalization input always differs from the post-normalization remote
- City already has case normalization, but phone doesn't have format normalization

**Fix**:
- Normalize phone numbers before comparison by stripping all non-digit characters (except leading `+`)
- Or: use a lightweight phone normalization (strip spaces, dashes, parentheses)
- Recommended: strip all whitespace and formatting from both sides before comparing

```typescript
const normalizePhone = (phone: string) => phone.replace(/[\s\-\(\)\.]/g, "");
```

**File**: `src/core/diff/comparators/warehouse-comparator.ts`
**Lines**: 153-161
**Complexity**: Low
**Risk**: Low

---

## Implementation Order

Based on impact (number of false diffs) and complexity:

| Priority | Issue | False Diffs | Complexity | Branch |
|----------|-------|-------------|------------|--------|
| P1 | #1 publishedAt ghost | ~15-20 products | Low | `fix/idempotency-publishedat` |
| P1 | #5 Shipping currency | ~10-15 methods | Low | `fix/idempotency-shipping-currency` |
| P1 | #2 Attr ordering | ~5-10 variants | Low | `fix/idempotency-attr-order` |
| P2 | #6 Phone normalization | ~2-3 warehouses | Low | `fix/idempotency-phone` |
| P2 | #3 Missing falsy attrs | ~5 products | Medium | `fix/idempotency-falsy-attrs` |
| P3 | #4 Category pagination | 0 (only >50 subcats) | Medium | `fix/idempotency-category-pagination` |

### Suggested Approach

**Option A - Single branch** (recommended for this scope):
- All 6 fixes are small and isolated in different comparators/services
- Create `fix/004-idempotency-fixes` branch
- One commit per issue for clean history
- E2E test: deploy → deploy → should show 0 changes

**Option B - Individual PRs**:
- Separate branch per issue
- Slower but safer for review

---

## Observability Gaps (Bonus)

During E2E testing, we also identified missing observability that should be addressed:

| Gap | Location | Fix |
|-----|----------|-----|
| Cache metrics debug-only | `category/repository.ts` | Add cache hit/miss summary at `info` level at end of stage |
| No cache stats in report | `core/deployment/report.ts` | Add `cacheMetrics` section to deployment report JSON |
| Governor stats not summarized | `core/deployment/summary.ts` | Add total 429s, retries, cooldowns to summary output |
| Per-operation API call counts | `resilience-tracker.ts` | Track and report per-operation-name call counts |

These are non-blocking and can be addressed as a separate follow-up.

---

## Verification Plan

After implementing all fixes:

```bash
# 1. Build and test
pnpm check:fix && pnpm build && pnpm test

# 2. First deploy (establish baseline)
export $(grep -v '^#' .env.local | xargs)
pnpm dev deploy --url=$SALEOR_URL --token=$SALEOR_TOKEN --ci

# 3. Second deploy (idempotency check - should be 0 changes)
pnpm dev deploy --url=$SALEOR_URL --token=$SALEOR_TOKEN --ci

# 4. Introspect round-trip test
rm config.yml
pnpm dev introspect --url=$SALEOR_URL --token=$SALEOR_TOKEN --ci
pnpm dev diff --url=$SALEOR_URL --token=$SALEOR_TOKEN --ci
# Should show no diff
```

**Success criteria**: Second deploy shows **0 changes** (0 creates, 0 updates, 0 deletes).
