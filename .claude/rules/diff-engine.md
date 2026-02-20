---
paths:
  - src/core/diff/**/*.ts
alwaysApply: false
---

# Diff Engine Patterns

## Before You Start

Before modifying the diff engine, invoke the `diff-engine-development` skill for comprehensive comparator and formatter patterns. Also see `understanding-saleor-domain` or `adding-entity-types` for domain context.

## Comparator Architecture

Each entity has a dedicated comparator that extends `BaseEntityComparator`:

```typescript
export class CategoryComparator extends BaseEntityComparator<Category> {
  protected getIdentifier(entity: Category): string {
    return entity.slug; // slug-based identification
  }

  protected compareEntity(
    local: Category,
    remote: Category
  ): ComparisonResult {
    const changes: FieldChange[] = [];

    if (local.name !== remote.name) {
      changes.push({ field: 'name', from: remote.name, to: local.name });
    }

    // ... compare other fields

    return changes.length > 0
      ? { hasChanges: true, changes }
      : { hasChanges: false };
  }
}
```

## Diff Result Structure

```typescript
type DiffResult<T> =
  | { action: 'create'; local: T }
  | { action: 'update'; local: T; remote: T; changes: FieldChange[] }
  | { action: 'delete'; remote: T }
  | { action: 'unchanged'; entity: T };

interface FieldChange {
  field: string;
  from: unknown;
  to: unknown;
}
```

## Identification Strategies

### Slug-Based (Categories, Products, Channels)

```typescript
protected getIdentifier(entity: Category): string {
  return entity.slug;
}
```

### Name-Based (ProductTypes, Attributes, TaxClasses)

```typescript
protected getIdentifier(entity: ProductType): string {
  return entity.name;
}
```

## Formatter Patterns

Formatters convert diff results to output formats:

```typescript
export class TableFormatter implements DiffFormatter {
  format(results: DiffResult[]): string {
    // Return table-formatted output
  }
}

export class JsonFormatter implements DiffFormatter {
  format(results: DiffResult[]): string {
    return JSON.stringify(results, null, 2);
  }
}

export class GithubCommentFormatter implements DiffFormatter {
  format(results: DiffResult[]): string {
    // Return markdown for PR comments
  }
}
```

## Adding a New Comparator

1. Create comparator extending `BaseEntityComparator`
2. Implement `getIdentifier()` with correct strategy
3. Implement `compareEntity()` for field comparison
4. Register in `ComparatorRegistry`
5. Add tests

## Validation Checkpoint

After modifying diff engine:
- [ ] Correct identification strategy
- [ ] All relevant fields compared
- [ ] Edge cases handled (nulls, arrays)
- [ ] Formatters updated if needed
- [ ] Tests cover new scenarios

**Required Skills**: `diff-engine-development` (primary), `understanding-saleor-domain`, `adding-entity-types` (invoke before implementation)
