---
name: diff-engine-development
description: "Develops diff comparators, formatters, and DiffService for configuration comparison. Use when adding comparators for new entities, implementing formatters, working on normalization logic, selective operations (--include/--exclude/--only), or debugging diff results."
metadata:
  author: Ollie Shop
  version: 1.0.0
compatibility: "Claude Code with Node.js >=20, pnpm, TypeScript 5.5+"
---

# Diff Engine Development

## Overview

Guide the implementation of diff comparators, formatters, and the DiffService that powers `pnpm dev diff` and `pnpm dev introspect` commands. The diff engine compares local YAML configuration against remote Saleor state.

## When to Use

- Adding diff support for a new entity type
- Implementing or modifying a comparator
- Adding or modifying a formatter
- Working on normalization logic
- Implementing selective filtering (`--include`/`--exclude`/`--only`)
- Debugging diff results or false positives

## Architecture

```
src/core/diff/
├── service.ts                  # DiffService: orchestrates comparisons
├── types.ts                    # DiffResult, DiffChange, DiffSummary types
├── errors.ts                   # DiffComparisonError, EntityValidationError
├── comparators/
│   ├── base-comparator.ts      # BaseEntityComparator abstract class
│   ├── index.ts                # Re-exports all comparators
│   ├── category-comparator.ts  # Example: slug-based entity
│   ├── product-type-comparator.ts # Example: name-based entity
│   └── ...                     # One per entity type
└── formatters/
    ├── base-formatter.ts       # BaseDiffFormatter abstract class
    ├── constants.ts            # Icons, labels, separator config
    ├── ci-types.ts             # CI output type definitions
    ├── deploy-formatter.ts     # Deploy command output
    ├── detailed-formatter.ts   # Detailed diff with field changes
    ├── summary-formatter.ts    # Summary counts
    ├── introspect-formatter.ts # Introspect diff output
    ├── json-formatter.ts       # JSON output for CI
    └── github-comment-formatter.ts # GitHub PR comment markdown
```

## Adding a New Comparator

### Step 1: Create comparator file

Create `src/core/diff/comparators/<entity>-comparator.ts`:

```typescript
import type { DiffChange, DiffOptions, DiffResult, EntityType } from '../types';
import { BaseEntityComparator, type ComparatorOptions } from './base-comparator';

// Use the config type from your schema
type MyEntity = { slug: string; name: string; /* ... */ };

export class MyEntityComparator extends BaseEntityComparator<
  readonly MyEntity[],  // TLocal: local config array
  readonly MyEntity[],  // TRemote: remote config array
  MyEntity              // TEntity: individual entity
> {
  protected readonly entityType: EntityType = 'My Entities';

  // Slug-based identification
  protected getEntityName(entity: MyEntity): string {
    return entity.slug;  // or entity.name for name-based
  }

  compare(
    local: readonly MyEntity[],
    remote: readonly MyEntity[],
    options?: ComparatorOptions | DiffOptions
  ): readonly DiffResult[] {
    const localEntities = this.deduplicateEntities(local);
    const remoteEntities = this.deduplicateEntities(remote);

    const localMap = this.createEntityMap(localEntities);
    const remoteMap = this.createEntityMap(remoteEntities);

    const results: DiffResult[] = [];

    // Creates: in local but not in remote
    for (const [name, entity] of localMap) {
      if (!remoteMap.has(name)) {
        results.push(this.createCreateResult(entity));
      }
    }

    // Updates: in both, check for field changes
    for (const [name, localEntity] of localMap) {
      const remoteEntity = remoteMap.get(name);
      if (remoteEntity) {
        const changes = this.compareEntityFields(localEntity, remoteEntity, options);
        if (changes.length > 0) {
          results.push(this.createUpdateResult(localEntity, remoteEntity, changes));
        }
      }
    }

    // Deletes: in remote but not in local
    for (const [name, entity] of remoteMap) {
      if (!localMap.has(name)) {
        results.push(this.createDeleteResult(entity));
      }
    }

    return results;
  }

  protected compareEntityFields(
    local: MyEntity,
    remote: MyEntity,
    _options?: ComparatorOptions
  ): DiffChange[] {
    const changes: DiffChange[] = [];

    if (local.name !== remote.name) {
      changes.push(this.createFieldChange('name', remote.name, local.name));
    }
    // Compare other fields...

    return changes;
  }
}
```

### Step 2: Register in DiffService

Edit `src/core/diff/service.ts` → `createComparators()`:

```typescript
private createComparators(): ReadonlyMap<string, EntityComparator> {
  return new Map([
    // ... existing entries
    ['myEntities', new MyEntityComparator() as EntityComparator],
  ]);
}
```

Also add `'myEntities'` to the `entityTypes` array in `performComparisons()` and the `entityTypeMappings` in `performSelectiveComparisons()`.

### Step 3: Export from index

Add to `src/core/diff/comparators/index.ts`.

### Step 4: Add tests

Create `src/core/diff/comparators/<entity>-comparator.test.ts`. Test:
- Creates detected (local only)
- Updates detected (field differences)
- Deletes detected (remote only)
- Unchanged entities (no false positives)
- Duplicate handling (deduplication)
- Edge cases: empty arrays, null fields

## Key Patterns

### Identification Strategies

| Strategy | Entities | Method |
|----------|----------|--------|
| Slug-based | Categories, Products, Channels, Collections, Menus, Warehouses | `return entity.slug` |
| Name-based | ProductTypes, PageTypes, Attributes, TaxClasses, ShippingZones | `return entity.name` |
| Singleton | Shop | Special handling (no identifier) |

### Normalization

Before comparing, normalize data to avoid false positives:
- **Deduplication**: Use `this.deduplicateEntities()` (keeps first occurrence, logs warning)
- **Null vs undefined**: Treat as equivalent
- **Array ordering**: Sort arrays before comparison if order doesn't matter
- **ID stripping**: Remote entities have IDs; local don't — comparators should not compare IDs

### BaseEntityComparator Helper Methods

| Method | Purpose |
|--------|---------|
| `createEntityMap(entities)` | Creates name/slug → entity lookup map |
| `deduplicateEntities(entities)` | Removes duplicates, keeps first, logs warnings |
| `validateUniqueIdentifiers(entities)` | Throws if duplicates found |
| `createCreateResult(entity)` | Returns `{ operation: 'CREATE', ... }` |
| `createUpdateResult(local, remote, changes)` | Returns `{ operation: 'UPDATE', ... }` |
| `createDeleteResult(entity)` | Returns `{ operation: 'DELETE', ... }` |
| `createFieldChange(field, current, desired)` | Returns `{ field, currentValue, desiredValue, description }` |

## Formatters

Formatters convert `DiffSummary` to output strings. All extend `BaseDiffFormatter`.

| Formatter | Purpose | Used By |
|-----------|---------|---------|
| `DeployFormatter` | Deploy command table output | `pnpm dev deploy` |
| `DetailedFormatter` | Detailed field-level changes | `pnpm dev diff` |
| `SummaryFormatter` | Counts only | Summary views |
| `IntrospectDiffFormatter` | Introspect diff output | `pnpm dev introspect` |
| `JsonFormatter` | Machine-readable JSON | `--json` flag |
| `GithubCommentFormatter` | PR comment markdown | `--github-comment` flag |

### BaseDiffFormatter Utilities

| Method | Purpose |
|--------|---------|
| `groupByEntityType(results)` | Groups results by entity type in stable order |
| `getOperationColor(operation)` | Green=CREATE, Yellow=UPDATE, Red=DELETE |
| `getEntityIcon(entityType)` | Emoji icon for entity type |
| `validateSummary(summary)` | Validates counts are non-negative and consistent |
| `formatPlural(count, singular)` | Pluralization helper |

## DiffService

`src/core/diff/service.ts` orchestrates all comparisons:

- **Concurrent execution**: Comparisons run in parallel with configurable concurrency limit (default: 5)
- **Two modes**: `compare()` for deploy diff (local→remote), `compareForIntrospect()` for introspect diff (remote→local)
- **Selective filtering**: `shouldIncludeSection()` from `src/lib/utils/selective-options.ts` handles `--include`/`--exclude`/`--only`
- **Config**: `DiffServiceConfig` with `maxConcurrentComparisons`, `remoteTimeoutMs` (2 min), `enableDebugLogging`

### Selective Operations

From `src/lib/utils/selective-options.ts`:

```typescript
// Flags: --include, --exclude, --only (alias for --include)
// --include takes priority: if set, only listed sections are included
// --exclude: if set (and no --include), exclude listed sections
// Available sections: shop, channels, productTypes, pageTypes, modelTypes,
//   categories, collections, menus, models, products, attributes,
//   warehouses, shippingZones, taxClasses
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Not deduplicating before comparison | Always call `this.deduplicateEntities()` first |
| Comparing IDs | Remote entities have IDs, local don't — skip ID fields |
| Wrong identification strategy | Slug-based vs name-based — check entity table above |
| Missing `DiffService` registration | Must add to `createComparators()`, `performComparisons()`, AND `performSelectiveComparisons()` |
| Not handling `null`/`undefined` equivalence | Normalize before comparing (treat `null` and `undefined` as equal) |
| Missing comparator index export | Add to `src/core/diff/comparators/index.ts` |

## References

- `src/core/diff/comparators/base-comparator.ts` - Base class with all helper methods
- `src/core/diff/comparators/category-comparator.ts` - Slug-based example
- `src/core/diff/comparators/product-type-comparator.ts` - Name-based example
- `src/core/diff/service.ts` - DiffService orchestration
- `src/core/diff/formatters/base-formatter.ts` - Base formatter utilities
- `src/lib/utils/selective-options.ts` - Selective filtering logic

## Related Skills

- **Entity implementation**: See `adding-entity-types` for the full 8-step pipeline (Step 8 = comparator)
- **Domain knowledge**: See `understanding-saleor-domain` for entity identification rules
- **CLI output**: See `implementing-cli-patterns` for formatter output patterns
- **Testing**: See `analyzing-test-coverage` for comparator test patterns

## Quick Reference Rule

For a condensed quick reference, see `.claude/rules/diff-engine.md` (automatically loaded when editing `src/core/diff/**/*.ts` files).
