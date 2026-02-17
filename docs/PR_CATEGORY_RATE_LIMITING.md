# Category Rate Limiting Fix

Hey! Here's what went down with this PR.

## The Problem

Categories were absolutely hammering the API. Check out the deployment report:

```
Total deployment:  3m 43s
Categories alone:  3m 16s  (88% of the time!)
Rate limit hits:   19      (100% from categories)
```

So basically, categories were the bottleneck and causing all our rate limits.

## Why It Was Happening

The lookup logic was... aggressive. For every single category, we were doing:

1. `getCategoryBySlug()` → API call
2. `getCategoryByName()` → another API call
3. `getAllCategories()` → yet another API call (as fallback)

That's potentially 3 calls per category. With 60 categories? That's ~180 API calls just for lookups. No wonder we were getting rate limited.

## What We Did

### 1. Added Caching to the Repository

Simple in-memory cache that lives for the deployment session:

```typescript
private allCategoriesCache: Category[] | null = null;
private categoryBySlugCache = new Map<string, Category>();
```

- `getAllCategories()` now caches results
- `getCategoryBySlug()` checks cache first
- `createCategory()` invalidates the cache

### 2. Pre-fetch Before Processing

In `bootstrapCategories()`, we now prime the cache before doing anything:

```typescript
await this.repository.getAllCategories(); // prime cache
// then process categories...
```

One API call upfront = all subsequent lookups hit cache.

### 3. Simplified the Lookup Logic

Removed the `getCategoryByName()` call entirely since cache is primed:

```typescript
// Before: 3 calls
const bySlug = await getCategoryBySlug(slug);
const byName = await getCategoryByName(name);  // removed this
const all = await getAllCategories();

// After: 1-2 calls (usually just cache hits)
const bySlug = await getCategoryBySlug(slug);  // cache hit
const all = await getAllCategories();          // cache hit
```

### 4. Adaptive Delays

Switched from fixed 100ms delays to adaptive ones:

```typescript
delayMs: rateLimiter.getAdaptiveDelay(100)
```

If we hit rate limits, delays increase automatically. If things are smooth, stays at base.

### 5. Better Type Safety

Added proper type guards instead of casting:

- `isRateLimitError()` - detects 429s properly
- `hasNetworkErrorStatus()` - type guard for network errors
- `hasSubcategories()` - type guard for category input
- `assertCategoryReturned()` - assertion for mutation results

## Results

```
                    Before      After       Change
Total deployment    3m 43s      2m 30s      -33%
Categories stage    3m 16s      2m 0s       -39%
Rate limit hits     19          5           -73%
```

Not bad! Categories still take the most time (can't parallelize parent-child creation), but at least we're not getting hammered by rate limits anymore.

## Files Changed

- `src/modules/category/repository.ts` - caching, rate limit detection
- `src/modules/category/category-service.ts` - pre-fetch, simplified lookups, type guards
- `src/modules/category/category-service.test.ts` - updated mocks

## Future Ideas

Categories still account for 80% of deployment time. To go faster we'd need:

- Parallel sibling creation (create siblings at the same time, just maintain parent→child order)
- Saleor to add `categoryBulkCreate` (they have it for products, not categories)

But for now, this is a solid win.
