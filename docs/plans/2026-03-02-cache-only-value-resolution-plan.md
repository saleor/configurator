# Cache-Only Attribute Value Resolution — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the AttributeCache to store `entityType` and `choices`, then convert both AttributeResolver (products/variants) and ModelAttributeResolver (models/pages) to use cache-only lookups, eliminating all API re-fetching for attribute value resolution.

**Architecture:** The existing `CachedAttribute` type gains two new fields (`entityType`, `choices`). A `ResolverAttribute` interface and adapter function bridge the flat cache shape to the edge/node shape resolvers expect. The attribute repository's single-create/update mutations must be updated to return full choice metadata (currently they only return `name`, missing `id` and `value`). The `attributeChoicesPreflightStage` + `ProductService.primeAttributeCache` pattern is replaced by having resolvers read directly from the shared `IAttributeCache`.

**Tech Stack:** TypeScript 5.5.4, Vitest, gql.tada (typed GraphQL)

---

### Task 1: Update GraphQL Mutations to Return Full Choice Data

The `createAttributeMutation` and `updateAttributeMutation` in the attribute repository currently only return `choices.edges.node.name`. The bulk mutations already return `id`, `name`, `value`. We need consistency so the cache can be populated with choice IDs regardless of which code path created the attribute.

**Files:**
- Modify: `src/modules/attribute/repository.ts:6-54` (both mutation definitions)

**Step 1: Update `createAttributeMutation` choices fragment**

In `src/modules/attribute/repository.ts`, find the `createAttributeMutation` (line 6) and change the choices node from `name` only to `id`, `name`, `value`:

```typescript
// Lines 15-21: Replace choices fragment
choices(first: 250) {
  edges {
    node {
      id
      name
      value
    }
  }
}
```

**Step 2: Update `updateAttributeMutation` choices fragment**

Same change in `updateAttributeMutation` (line 31). Replace the choices node:

```typescript
// Lines 42-48: Replace choices fragment
choices(first: 250) {
  edges {
    node {
      id
      name
      value
    }
  }
}
```

**Step 3: Verify compilation**

Run: `pnpm build`
Expected: PASS — gql.tada will re-derive the `Attribute` type automatically since it's based on `ResultOf<typeof createAttributeMutation>`.

**Step 4: Commit**

```bash
git add src/modules/attribute/repository.ts
git commit -m "feat: return full choice metadata from create/update attribute mutations"
```

---

### Task 2: Extend CachedAttribute Type and Add Adapter

Add `entityType` and `choices` to `CachedAttribute`, define a `ResolverAttribute` interface for the resolver contract, and add a `cachedToResolverAttribute` adapter function.

**Files:**
- Modify: `src/modules/attribute/attribute-cache.ts:32-37` (type definition)
- Test: `src/modules/attribute/attribute-cache.test.ts`

**Step 1: Write failing test for extended CachedAttribute and adapter**

Add a new describe block in `src/modules/attribute/attribute-cache.test.ts`:

```typescript
import { cachedToResolverAttribute, type CachedAttribute } from "./attribute-cache";

// Update existing sampleProductAttributes to include new fields:
const sampleProductAttributes: CachedAttribute[] = [
  { id: "attr1", name: "Publisher", slug: "publisher", inputType: "PLAIN_TEXT", entityType: null, choices: [] },
  { id: "attr2", name: "Genre", slug: "genre", inputType: "DROPDOWN", entityType: null, choices: [
    { id: "genre-fiction", name: "Fiction", value: "fiction" },
    { id: "genre-nonfiction", name: "Non-Fiction", value: "nonfiction" },
  ]},
  { id: "attr3", name: "Condition", slug: "condition", inputType: "DROPDOWN", entityType: null, choices: [] },
];

const sampleContentAttributes: CachedAttribute[] = [
  { id: "attr4", name: "Author", slug: "author", inputType: "PLAIN_TEXT", entityType: null, choices: [] },
  { id: "attr5", name: "Scent Family", slug: "scent-family", inputType: "DROPDOWN", entityType: null, choices: [] },
];
```

Add adapter tests:

```typescript
describe("cachedToResolverAttribute", () => {
  it("should convert cached attribute with choices to resolver shape", () => {
    const cached: CachedAttribute = {
      id: "attr2",
      name: "Genre",
      slug: "genre",
      inputType: "DROPDOWN",
      entityType: null,
      choices: [
        { id: "genre-fiction", name: "Fiction", value: "fiction" },
        { id: "genre-nonfiction", name: "Non-Fiction", value: "nonfiction" },
      ],
    };

    const result = cachedToResolverAttribute(cached);

    expect(result.id).toBe("attr2");
    expect(result.name).toBe("Genre");
    expect(result.inputType).toBe("DROPDOWN");
    expect(result.entityType).toBeNull();
    expect(result.choices?.edges).toHaveLength(2);
    expect(result.choices?.edges?.[0].node.id).toBe("genre-fiction");
    expect(result.choices?.edges?.[0].node.name).toBe("Fiction");
    expect(result.choices?.edges?.[0].node.value).toBe("fiction");
  });

  it("should convert cached attribute with entityType for references", () => {
    const cached: CachedAttribute = {
      id: "attr-ref",
      name: "Related Product",
      slug: "related-product",
      inputType: "REFERENCE",
      entityType: "PRODUCT",
      choices: [],
    };

    const result = cachedToResolverAttribute(cached);

    expect(result.entityType).toBe("PRODUCT");
  });

  it("should handle empty choices array", () => {
    const cached: CachedAttribute = {
      id: "attr1",
      name: "Publisher",
      slug: "publisher",
      inputType: "PLAIN_TEXT",
      entityType: null,
      choices: [],
    };

    const result = cachedToResolverAttribute(cached);

    expect(result.choices?.edges).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/modules/attribute/attribute-cache.test.ts`
Expected: FAIL — `CachedAttribute` doesn't have `entityType`/`choices`, `cachedToResolverAttribute` doesn't exist.

**Step 3: Implement CachedAttribute extension and adapter**

In `src/modules/attribute/attribute-cache.ts`, add the new types and function:

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
  readonly entityType: string | null;
  readonly choices: readonly CachedAttributeChoice[];
}

/**
 * Shape that attribute resolvers expect — mirrors the GraphQL edge/node structure.
 * Decoupled from the full GraphQL Attribute type to keep the cache independent.
 */
export interface ResolverAttribute {
  readonly id: string;
  readonly name: string;
  readonly entityType: string | null;
  readonly inputType: string;
  readonly choices: {
    readonly edges: ReadonlyArray<{
      readonly node: {
        readonly id: string;
        readonly name: string;
        readonly value: string;
      };
    }>;
  } | null;
}

/** Convert flat cache entry to the edge/node shape resolvers expect. */
export function cachedToResolverAttribute(cached: CachedAttribute): ResolverAttribute {
  return {
    id: cached.id,
    name: cached.name,
    entityType: cached.entityType,
    inputType: cached.inputType,
    choices: {
      edges: cached.choices.map((c) => ({
        node: { id: c.id, name: c.name, value: c.value },
      })),
    },
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test src/modules/attribute/attribute-cache.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/modules/attribute/attribute-cache.ts src/modules/attribute/attribute-cache.test.ts
git commit -m "feat: extend CachedAttribute with entityType and choices, add resolver adapter"
```

---

### Task 3: Update Cache Population in Stages

Update the `processAttributesSequentially` and `processAttributesBulk` functions to include `entityType` and `choices` when creating `CachedAttribute` objects.

**Files:**
- Modify: `src/core/deployment/stages.ts:213-221` (sequential path CachedAttribute creation)
- Modify: `src/core/deployment/stages.ts:316-326` (bulk path CachedAttribute creation)
- Modify: `src/core/deployment/stages.ts:333-343` (bulk path missing-attribute fetch)

**Step 1: Update sequential path (lines 216-221)**

In `processAttributesSequentially`, where the `CachedAttribute` object is created, replace:

```typescript
return {
  id: result.id,
  name: result.name,
  slug: toSlug(result.name),
  inputType: resolvedInputType ?? attr.inputType,
} satisfies CachedAttribute;
```

With:

```typescript
return {
  id: result.id,
  name: result.name,
  slug: toSlug(result.name),
  inputType: resolvedInputType ?? attr.inputType,
  entityType: result.entityType ?? null,
  choices: (result.choices?.edges ?? [])
    .filter((e): e is typeof e & { node: { id: string; name: string; value: string } } =>
      Boolean(e?.node?.id && e?.node?.name))
    .map((e) => ({ id: e.node.id, name: e.node.name, value: e.node.value ?? "" })),
} satisfies CachedAttribute;
```

Note: After Task 1, `result.choices` will have `id`, `name`, `value` from the updated mutations. But for the sequential path using `existingAttribute` (from `getAttributesByNames`), these fields were already present.

**Step 2: Update bulk path — successful attributes (lines 316-326)**

In `processAttributesBulk`, the `successfulAttrs` array currently stores `{ id, name, inputType }`. Expand it to include `entityType` and `choices`:

Replace the `successfulAttrs` type and population:

```typescript
// Change type from Array<{ id: string; name: string; inputType: string }> to include new fields:
const successfulAttrs: Array<{
  id: string;
  name: string;
  inputType: string;
  entityType: string | null;
  choices: Array<{ id: string; name: string; value: string }>;
}> = [];
```

Update both the create and update result loops to capture the new fields:

```typescript
// In the create result loop (around line 282):
for (const attr of createResult.successful) {
  if (attr.id && attr.name && attr.inputType) {
    successfulAttrs.push({
      id: attr.id,
      name: attr.name,
      inputType: attr.inputType,
      entityType: attr.entityType ?? null,
      choices: (attr.choices?.edges ?? [])
        .filter((e): e is typeof e & { node: { id: string; name: string } } =>
          Boolean(e?.node?.id && e?.node?.name))
        .map((e) => ({ id: e.node.id, name: e.node.name, value: e.node.value ?? "" })),
    });
  }
}
```

Same for the update result loop (around line 302).

Then update the cache push (lines 319-324):

```typescript
for (const attr of successfulAttrs) {
  const parsedInputType = toAttributeInputType(attr.inputType);
  if (parsedInputType) {
    cached.push({
      id: attr.id,
      name: attr.name,
      slug: toSlug(attr.name),
      inputType: parsedInputType,
      entityType: attr.entityType,
      choices: attr.choices,
    });
  }
}
```

**Step 3: Update bulk path — missing attributes fetch (lines 333-343)**

Same pattern for the `fetched` attributes:

```typescript
for (const attr of fetched) {
  const parsedInputType = toAttributeInputType(attr.inputType);
  if (attr.id && attr.name && parsedInputType) {
    cached.push({
      id: attr.id,
      name: attr.name,
      slug: toSlug(attr.name),
      inputType: parsedInputType,
      entityType: attr.entityType ?? null,
      choices: (attr.choices?.edges ?? [])
        .filter((e): e is typeof e & { node: { id: string; name: string } } =>
          Boolean(e?.node?.id && e?.node?.name))
        .map((e) => ({ id: e.node.id, name: e.node.name, value: e.node.value ?? "" })),
    });
  }
}
```

**Step 4: Verify compilation**

Run: `pnpm build`
Expected: PASS

**Step 5: Run full test suite**

Run: `pnpm test`
Expected: Some tests may fail due to mock CachedAttribute objects missing new fields — those will be fixed in subsequent tasks.

**Step 6: Commit**

```bash
git add src/core/deployment/stages.ts
git commit -m "feat: preserve entityType and choices when populating attribute cache"
```

---

### Task 4: Fix Existing Tests for New CachedAttribute Shape

Update all test files that create `CachedAttribute` mocks to include the new `entityType` and `choices` fields.

**Files:**
- Modify: `src/modules/attribute/attribute-cache.test.ts` (sample data)
- Modify: `src/modules/attribute/repository.test.ts` (if it references CachedAttribute)
- Modify: `src/modules/product-type/product-type-service.test.ts` (if it creates CachedAttribute mocks)
- Modify: `src/modules/page-type/page-type-service.test.ts` (if it creates CachedAttribute mocks)
- Search for: any other test files creating CachedAttribute objects

**Step 1: Find all files creating CachedAttribute objects**

Run: `grep -rn "CachedAttribute\|satisfies CachedAttribute\|: CachedAttribute" src/ --include="*.test.ts"`

This will show all test files that need updating.

**Step 2: Update each mock**

For each `CachedAttribute` mock that only has `{ id, name, slug, inputType }`, add `entityType: null, choices: []`.

Example — in `attribute-cache.test.ts`:

```typescript
// Before:
{ id: "attr1", name: "Publisher", slug: "publisher", inputType: "PLAIN_TEXT" }

// After:
{ id: "attr1", name: "Publisher", slug: "publisher", inputType: "PLAIN_TEXT", entityType: null, choices: [] }
```

**Step 3: Run full test suite**

Run: `pnpm test`
Expected: PASS — all tests should pass with the new required fields.

**Step 4: Commit**

```bash
git add -A  # All test file changes
git commit -m "test: update CachedAttribute mocks with entityType and choices fields"
```

---

### Task 5: Make AttributeResolver Cache-Only

Remove the API fallback in `AttributeResolver.fetchAttribute()` and make it throw on cache miss.

**Files:**
- Modify: `src/modules/product/attribute-resolver.ts:1-10,372-385`
- Test: `src/modules/product/attribute-resolver.test.ts`

**Step 1: Write failing tests for cache-only behavior**

In `src/modules/product/attribute-resolver.test.ts`, add new tests:

```typescript
import type { ResolverAttribute } from "../attribute/attribute-cache";

describe("cache-only resolution", () => {
  it("should resolve attribute from cache without calling API", async () => {
    const cachedAttribute: ResolverAttribute = {
      id: "attr-color",
      name: "Color",
      entityType: null,
      inputType: "DROPDOWN",
      choices: {
        edges: [
          { node: { id: "red-id", name: "Red", value: "red" } },
          { node: { id: "blue-id", name: "Blue", value: "blue" } },
        ],
      },
    };

    const cacheResolver = new AttributeResolver(mockRepository, {
      getAttributeByNameFromCache: (name: string) =>
        name === "Color" ? cachedAttribute : null,
    });

    const result = await cacheResolver.resolveAttributes({ Color: "Red" });

    expect(result).toEqual([{ id: "attr-color", dropdown: { id: "red-id" } }]);
    // API should NOT be called
    expect(mockRepository.getAttributeByName).not.toHaveBeenCalled();
  });

  it("should throw when attribute is not in cache", async () => {
    const cacheResolver = new AttributeResolver(mockRepository, {
      getAttributeByNameFromCache: () => null,
    });

    await expect(
      cacheResolver.resolveAttributes({ "Missing Attr": "value" })
    ).rejects.toThrow(/not found in attribute cache/i);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test src/modules/product/attribute-resolver.test.ts`
Expected: FAIL — cache miss currently returns null silently, API fallback still exists.

**Step 3: Implement cache-only fetchAttribute**

In `src/modules/product/attribute-resolver.ts`:

1. Import `ResolverAttribute` type:

```typescript
import type { ResolverAttribute } from "../attribute/attribute-cache";
```

2. Update the `ReferenceResolvers` type to make cache accessor required conceptually (but keep backward compat for now):

```typescript
type ReferenceResolvers = {
  getPageBySlug?: (slug: string) => Promise<{ id: string } | null>;
  getAttributeByNameFromCache?: (name: string) => ResolverAttribute | null;
};
```

3. Replace `fetchAttribute` method (lines 372-385):

```typescript
private fetchAttribute(attributeName: string): ResolverAttribute {
  const cached = this.refs?.getAttributeByNameFromCache?.(attributeName);
  if (cached) return cached;

  throw new Error(
    `Attribute "${attributeName}" not found in attribute cache. ` +
    `Ensure the attribute is defined in productAttributes or contentAttributes config.`
  );
}
```

Note: this is now synchronous (no `await`).

4. Update `resolveAttribute` (line 338): change `await this.fetchAttribute(attributeName)` to `this.fetchAttribute(attributeName)`. The return is no longer a Promise for the fetch step, but `handler.handle()` can still be async.

5. Update `AttributeHandlerContext.attribute` type from `Attribute` (product repo) to `ResolverAttribute`:

```typescript
interface AttributeHandlerContext {
  attribute: ResolverAttribute;
  attributeName: string;
  repository: ProductOperations;
  refs?: ReferenceResolvers;
}
```

6. Update the `DropdownAttributeHandler.findChoice` parameter type:

```typescript
private findChoice(valueName: string, attribute: ResolverAttribute) {
```

**Step 4: Update existing tests**

The existing tests that mock `getAttributeByName` on the repository need to be updated to use the cache accessor instead. For tests that create an `AttributeResolver` without refs (cache), they should now provide a cache accessor.

For backward compatibility during migration: update existing test setup to provide cache accessor:

```typescript
// Helper to create resolver with cache
function createResolverWithCache(attributes: Map<string, ResolverAttribute>): AttributeResolver {
  return new AttributeResolver(mockRepository, {
    getAttributeByNameFromCache: (name) => attributes.get(name) ?? null,
  });
}
```

Migrate each existing test to use this helper instead of mocking `mockRepository.getAttributeByName`.

**Step 5: Run tests to verify they pass**

Run: `pnpm test src/modules/product/attribute-resolver.test.ts`
Expected: PASS

**Step 6: Verify compilation**

Run: `pnpm build`
Expected: PASS

**Step 7: Commit**

```bash
git add src/modules/product/attribute-resolver.ts src/modules/product/attribute-resolver.test.ts
git commit -m "feat: make AttributeResolver cache-only, remove API fallback"
```

---

### Task 6: Make ModelAttributeResolver Cache-Only

Replace the `AttributeOperations` dependency with `IAttributeCache` and use the adapter.

**Files:**
- Modify: `src/modules/model/model-attribute-resolver.ts`
- Test: `src/modules/model/model-attribute-resolver.test.ts`

**Step 1: Write failing test for cache-based resolution**

In `src/modules/model/model-attribute-resolver.test.ts`, rewrite to use cache:

```typescript
import { describe, expect, it } from "vitest";
import { AttributeCache, type CachedAttribute } from "../attribute/attribute-cache";
import { ModelAttributeResolver } from "./model-attribute-resolver";

describe("ModelAttributeResolver", () => {
  it("resolves dropdown, boolean, and date from cache", async () => {
    const cache = new AttributeCache();
    cache.populateContentAttributes([
      {
        id: "attr-cat", name: "Category", slug: "category", inputType: "DROPDOWN",
        entityType: null,
        choices: [{ id: "cat-news", name: "News", value: "news" }],
      },
      {
        id: "attr-featured", name: "Featured", slug: "featured", inputType: "BOOLEAN",
        entityType: null, choices: [],
      },
      {
        id: "attr-date", name: "Published", slug: "published", inputType: "DATE",
        entityType: null, choices: [],
      },
    ]);

    const resolver = new ModelAttributeResolver(cache);
    const result = await resolver.resolveAttributes({
      Category: "News",
      Featured: "true",
      Published: "2025-01-01",
    });

    expect(result).toContainEqual({ id: "attr-cat", dropdown: { id: "cat-news" } });
    expect(result).toContainEqual(expect.objectContaining({ id: "attr-featured", boolean: true }));
    expect(result).toContainEqual(expect.objectContaining({ id: "attr-date", date: "2025-01-01" }));
  });

  it("throws when attribute is not in cache", async () => {
    const cache = new AttributeCache();
    cache.populateContentAttributes([]); // empty

    const resolver = new ModelAttributeResolver(cache);
    await expect(
      resolver.resolveAttributes({ Missing: "value" })
    ).rejects.toThrow(/not found in attribute cache/i);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/modules/model/model-attribute-resolver.test.ts`
Expected: FAIL — constructor expects `AttributeOperations`, not `IAttributeCache`.

**Step 3: Implement cache-only ModelAttributeResolver**

Rewrite `src/modules/model/model-attribute-resolver.ts`:

```typescript
import type { AttributeValueInput } from "../../lib/graphql/graphql-types";
import { logger } from "../../lib/logger";
import {
  cachedToResolverAttribute,
  type IAttributeCache,
  type ResolverAttribute,
} from "../attribute/attribute-cache";

/**
 * Resolves model/page attribute values into typed AttributeValueInput payloads.
 * Uses the shared attribute cache — no API calls.
 */
export class ModelAttributeResolver {
  constructor(private readonly cache: IAttributeCache) {}

  async resolveAttributes(
    attributes: Record<string, unknown> = {}
  ): Promise<AttributeValueInput[]> {
    const names = Object.keys(attributes);
    if (names.length === 0) return [];

    const results: AttributeValueInput[] = [];
    for (const name of names) {
      const value = attributes[name];
      const cached = this.cache.getContentAttribute(name);
      if (!cached) {
        throw new Error(
          `Content attribute "${name}" not found in attribute cache. ` +
          `Ensure it is defined in contentAttributes config.`
        );
      }
      const resolved = cachedToResolverAttribute(cached);
      const payload = this.toPayload(resolved, value);
      if (payload) results.push(payload);
    }
    return results;
  }

  private toPayload(attribute: ResolverAttribute, raw: unknown): AttributeValueInput | null {
    // ... keep the existing toPayload logic, using ResolverAttribute type
    // (same switch on inputType, same choice lookup via attribute.choices?.edges)
  }
}
```

The `toPayload` method stays largely the same — it already works with the edge/node shape. Just update the parameter type from the inline object type to `ResolverAttribute`.

**Step 4: Run tests to verify they pass**

Run: `pnpm test src/modules/model/model-attribute-resolver.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/modules/model/model-attribute-resolver.ts src/modules/model/model-attribute-resolver.test.ts
git commit -m "feat: make ModelAttributeResolver cache-only, remove API dependency"
```

---

### Task 7: Update ModelService to Pass Cache Instead of Repository

The `ModelService` creates `ModelAttributeResolver` instances with `this.attributeService.repo`. Update it to pass the attribute cache instead.

**Files:**
- Modify: `src/modules/model/model-service.ts:8-10,107-121,301-329`
- Test: `src/modules/model/model-service.test.ts`

**Step 1: Update ModelService constructor and resolver creation**

In `src/modules/model/model-service.ts`:

1. Add `IAttributeCache` import:

```typescript
import type { IAttributeCache } from "../attribute/attribute-cache";
```

2. Add `attributeCache` parameter to the constructor:

```typescript
export class ModelService {
  constructor(
    private repository: ModelOperations,
    private pageTypeService: PageTypeService,
    private attributeCache: IAttributeCache,
  ) {}
```

Remove the `attributeService: AttributeService` parameter since it's only used for `attributeService.repo` which the resolver no longer needs.

3. Update all `ModelAttributeResolver` instantiations (lines 115, 319):

```typescript
// Before:
const attrResolver = new ModelAttributeResolver(this.attributeService.repo);

// After:
const attrResolver = new ModelAttributeResolver(this.attributeCache);
```

**Step 2: Update ModelService tests**

Update `src/modules/model/model-service.test.ts` to provide a mock `IAttributeCache` instead of `attributeService`:

```typescript
import { AttributeCache } from "../attribute/attribute-cache";

// In test setup:
const attributeCache = new AttributeCache();
// Populate with test data as needed
attributeCache.populateContentAttributes([...]);

const service = new ModelService(mockRepository, mockPageTypeService, attributeCache);
```

**Step 3: Run tests**

Run: `pnpm test src/modules/model/model-service.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/modules/model/model-service.ts src/modules/model/model-service.test.ts
git commit -m "feat: wire ModelService to use IAttributeCache instead of AttributeService.repo"
```

---

### Task 8: Update ProductService Cache Accessor to Use Shared Cache

Replace the `ProductService`'s internal `attributeCache: Map<string, Attribute>` and `primeAttributeCache` with a method that reads from the shared `IAttributeCache` via the adapter.

**Files:**
- Modify: `src/modules/product/product-service.ts:22-61`
- Modify: `src/core/deployment/stages.ts` (where `primeAttributeCache` is called)

**Step 1: Update ProductService to accept IAttributeCache**

In `src/modules/product/product-service.ts`:

1. Add imports:

```typescript
import { cachedToResolverAttribute, type IAttributeCache } from "../attribute/attribute-cache";
```

2. Add an `setAttributeCache` method that wires the shared cache to the resolver:

```typescript
setAttributeCache(cache: IAttributeCache) {
  this.refs = {
    ...(this.refs || {}),
    getAttributeByNameFromCache: (name: string) => {
      const cached = cache.getProductAttribute(name);
      return cached ? cachedToResolverAttribute(cached) : null;
    },
  };
  this.attributeResolver.setRefs(this.refs);
}
```

3. Remove the old `private attributeCache: Map<string, Attribute>` field (line 44) and the old `primeAttributeCache` method (lines 53-61). Also remove `setAttributeCacheAccessor` (lines 48-51) if no longer needed elsewhere.

**Step 2: Update stages to use new method**

In `src/core/deployment/stages.ts`, in `attributeChoicesPreflightStage` (around line 925):

```typescript
// Before:
context.configurator.services.product.primeAttributeCache(
  refreshed.map(toProductAttributeMeta)
);

// After: The shared cache is already populated by attributesStage and
// choices are updated by preflight. Re-populate the cache section:
// Actually, the preflight adds new choice values to Saleor then re-fetches.
// We need to update the shared cache with the refreshed data.
```

This requires updating the attribute cache with the refreshed data. Since `attributeChoicesPreflightStage` modifies choice values and re-fetches, we need to update the shared cache:

```typescript
// After adding values and re-fetching:
const refreshedCached = refreshed
  .filter((a) => a.id && a.name && a.inputType)
  .map((attr) => ({
    id: attr.id,
    name: attr.name,
    slug: toSlug(attr.name),
    inputType: toAttributeInputType(attr.inputType) ?? ("PLAIN_TEXT" as const),
    entityType: attr.entityType ?? null,
    choices: (attr.choices?.edges ?? [])
      .filter((e): e is typeof e & { node: { id: string; name: string } } =>
        Boolean(e?.node?.id && e?.node?.name))
      .map((e) => ({ id: e.node.id, name: e.node.name, value: e.node.value ?? "" })),
  }));
context.attributeCache.populateProductAttributes(refreshedCached);
```

This replaces the existing cached entries (Map.set overwrites by name).

3. Wire `setAttributeCache` in the products stage or at pipeline initialization. The simplest place is right before the products stage runs:

In `productsStage.execute()`, add at the top:

```typescript
context.configurator.services.product.setAttributeCache(context.attributeCache);
```

**Step 3: Remove `toProductAttributeMeta` function**

The `toProductAttributeMeta` function (line 37-45) was only used for `primeAttributeCache`. Remove it if no longer referenced.

**Step 4: Verify compilation and run tests**

Run: `pnpm build && pnpm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/modules/product/product-service.ts src/core/deployment/stages.ts
git commit -m "feat: wire ProductService to shared IAttributeCache, remove primeAttributeCache"
```

---

### Task 9: Update Deployment Wiring for ModelService

Update wherever `ModelService` is instantiated to pass the `IAttributeCache` instead of `AttributeService`.

**Files:**
- Modify: `src/core/deployment/stages.ts` (models stage)
- Modify: any service factory/configurator bootstrap file

**Step 1: Find ModelService instantiation**

Run: `grep -rn "new ModelService" src/`

**Step 2: Update instantiation**

Pass `context.attributeCache` (or equivalent) as the third argument instead of `attributeService`.

**Step 3: Run full test suite**

Run: `pnpm test`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: wire ModelService with IAttributeCache in deployment pipeline"
```

---

### Task 10: Remove Dead Code — getAttributeByName from ProductRepository

The `getAttributeByName` method in `ProductRepository` and the `getAttributeByNameQuery` are no longer needed since `AttributeResolver` no longer calls the API.

**Files:**
- Modify: `src/modules/product/repository.ts:408-428,1183-1202`
- Modify: `src/modules/product/repository.ts` (`ProductOperations` interface)

**Step 1: Check for other usages**

Run: `grep -rn "getAttributeByName" src/ --include="*.ts" | grep -v test`

If only referenced by `AttributeResolver` (which no longer uses it) and the repository itself, remove it.

**Step 2: Remove the query and method**

- Remove `getAttributeByNameQuery` GraphQL definition
- Remove `getAttributeByName` from `ProductOperations` interface
- Remove the implementation in `ProductRepository`
- Remove the `Attribute` type export if it was only derived from this query (check if `ResolverAttribute` now serves this purpose)

**Step 3: Update tests that mock `getAttributeByName`**

Tests that set up `getAttributeByName: vi.fn()` in mock repositories can remove that line.

**Step 4: Verify compilation and run tests**

Run: `pnpm build && pnpm test`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove unused getAttributeByName from ProductRepository"
```

---

### Task 11: Final Verification

**Step 1: Run full quality gate**

```bash
pnpm check:fix && pnpm build && pnpm test && npx tsc --noEmit && pnpm check:ci
```

Expected: All PASS

**Step 2: Verify no remaining API fallbacks**

Run: `grep -rn "getAttributeByName\|getAttributesByNames" src/ --include="*.ts" | grep -v test | grep -v repository`

Should show no results in resolvers or services (only the repository definition itself).

**Step 3: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore: final cleanup for cache-only attribute value resolution"
```
