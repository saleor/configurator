# Design: Cache-Only Attribute Value Resolution

**Date:** 2026-03-02
**Status:** Approved
**Scope:** Eliminate API re-fetching in AttributeResolver and ModelAttributeResolver

## Problem

The attributes stage fetches full attribute metadata (id, name, slug, inputType, entityType, choices) from the Saleor API. When converting to `CachedAttribute`, it discards `entityType` and `choices`. Downstream resolvers (AttributeResolver for products/variants, ModelAttributeResolver for models/pages) must re-fetch this same data from the API during value resolution.

This is wasteful and inconsistent with the cache-only enforcement pattern already applied to attribute reference resolution.

## Constraints

- Choices are finalized during the attributes stage; no new choices are created during product/model stages
- entityType is fixed at attribute creation time
- Scale: 50-200 attributes, up to 100 choices each (in-memory caching is fine)
- This is a declarative "as-code" tool; config.yml defines everything

## Design

### 1. Extend CachedAttribute

Add `entityType` and `choices` to the existing cache type:

```typescript
export interface CachedAttributeChoice {
  readonly id: string;
  readonly name: string;
  readonly value: string;
}

export interface CachedAttribute {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly inputType: AttributeInputType;
  readonly entityType: string | null;                  // NEW
  readonly choices: readonly CachedAttributeChoice[];  // NEW
}
```

### 2. Preserve Data During Cache Population

In the attributes stage, where `CachedAttribute` objects are created from API responses, include `entityType` and flatten `choices` from the edge/node structure:

```typescript
{
  id: result.id,
  name: result.name,
  slug: toSlug(result.name),
  inputType: resolvedInputType,
  entityType: result.entityType ?? null,
  choices: (result.choices?.edges ?? []).map(e => ({
    id: e.node.id,
    name: e.node.name,
    value: e.node.value,
  })),
}
```

### 3. Cache-to-Resolver Adapter

The resolvers (AttributeResolver, ModelAttributeResolver) expect the `Attribute` type (GraphQL edge/node shape). Add an adapter function in the cache module:

```typescript
export function cachedToResolverAttribute(cached: CachedAttribute): ResolverAttribute {
  return {
    id: cached.id,
    name: cached.name,
    entityType: cached.entityType,
    inputType: cached.inputType,
    choices: {
      edges: cached.choices.map(c => ({
        node: { id: c.id, name: c.name, value: c.value }
      }))
    }
  };
}
```

A `ResolverAttribute` interface captures the subset of the GraphQL `Attribute` type that resolvers actually use, decoupling the cache from the full API response shape.

### 4. Update AttributeResolver (Products/Variants)

- `fetchAttribute()` becomes cache-only: look up via `getAttributeByNameFromCache` accessor
- Remove the API fallback (`this.repository.getAttributeByName`)
- On cache miss, throw an error instead of warning and skipping

### 5. Update ModelAttributeResolver (Models/Pages)

- Accept `IAttributeCache` instead of (or alongside) `AttributeOperations`
- Look up attributes from `cache.getContentAttribute(name)` + adapter
- Remove the `getAttributesByNames()` API call
- On cache miss, throw an error

### 6. Error Behavior

Same enforcement pattern as the rest of the cache-only attribute resolution:
- Attribute not in cache = hard error (not a silent skip)
- If attributesStage fails to populate cache, downstream stages fail clearly

## Files Affected

| File | Change |
|------|--------|
| `src/modules/attribute/attribute-cache.ts` | Extend `CachedAttribute` type, add adapter function |
| `src/modules/attribute/attribute-service.ts` | Update cache population to preserve entityType + choices |
| `src/core/deployment/stages.ts` | Update CachedAttribute creation in attributes stage |
| `src/modules/product/attribute-resolver.ts` | Remove API fallback, use cache-only |
| `src/modules/model/model-attribute-resolver.ts` | Accept cache, remove API-only pattern |
| `src/modules/product/product-service.ts` | Update cache accessor to use new adapter |
| `src/modules/model/model-service.ts` | Pass cache to ModelAttributeResolver |
| Tests for all above | Update mocks with new CachedAttribute shape |

## Rejected Alternatives

**Separate metadata cache:** Two caches for the same data creates confusion about which to use and duplicates storage.

**Cache raw API objects:** Couples cache shape to GraphQL response shape, making it fragile to API changes.
