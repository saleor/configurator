---
paths: src/**/*.ts
alwaysApply: false
---

# Code Quality Standards

## Before You Start

Before implementing TypeScript changes, invoke the `reviewing-typescript-code` skill for comprehensive patterns.

## Quick Reference

### Function Size Guidelines

| Category | Lines | Action |
|----------|-------|--------|
| Ideal | 10-30 | Standard |
| Acceptable | 30-50 | Justified complexity only |
| Refactor | >50 | Must break down |

### Type Safety Checklist

- [ ] No `any` types (test mocks only)
- [ ] No unsafe `as unknown as T` assertions
- [ ] No unguarded `!` non-null assertions
- [ ] Proper type guards for runtime validation
- [ ] Branded types for domain values

## Patterns

### Branded Types

```typescript
type EntitySlug = string & { readonly __brand: unique symbol };

const isSlugBasedEntity = (entity: unknown): entity is { slug: string } =>
  typeof entity === 'object' && entity !== null && 'slug' in entity;
```

### Discriminated Unions

```typescript
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: Error };
```

### Satisfies Operator

```typescript
interface ConfigShape {
  readonly MAX_ITEMS: number;
  readonly TIMEOUT: number;
}

const CONFIG = {
  MAX_ITEMS: 10,
  TIMEOUT: 5000,
} as const satisfies ConfigShape;
// CONFIG.MAX_ITEMS is `10`, not just `number`
```

## Object Calisthenics (Condensed)

- Max 3 levels of nesting — use guard clauses (early returns)
- No `else` after `return` — use early returns
- No `forEach` — use `map`/`filter`/`for...of`
- No parameter reassignment — treat params as immutable
- One responsibility per function

## Zod Schema SSOT

- All domain/config types MUST be `z.infer<typeof Schema>`
- Never define parallel interfaces for data that has a schema
- Service contract interfaces are fine (they define behavior, not data shape)

## Functional Style

### Transform Loops

```typescript
// Instead of forEach + push
const lines = items.map(formatItem);

// Instead of conditional accumulation
const results = items
  .map(item => processItem(item) ?? null)
  .filter((r): r is Result => r !== null);

// Instead of nested loops
const lines = items.flatMap(item => [
  item.header,
  ...item.details.map(d => `  ${d}`),
]);
```

### Avoid Performance Anti-patterns

```typescript
// BAD: O(n^2) spread in reduce
items.reduce((acc, i) => ({ ...acc, [i.id]: i }), {});

// GOOD: Use Map
items.reduce((acc, i) => acc.set(i.id, i), new Map());
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Services | `{Module}Service` | `ProductService` |
| Repositories | `{Module}Repository` | `CategoryRepository` |
| Comparators | `{Entity}Comparator` | `TaxClassComparator` |
| Errors | `{Specific}Error` | `EntityNotFoundError` |
| Booleans | `is/has/should/can` prefix | `isValid`, `hasPermission` |

## Error Handling

### Standard Pattern

```typescript
class EntityError extends BaseError {
  constructor(
    message: string,
    public readonly context: Record<string, unknown>
  ) {
    super(message, 'ENTITY_ERROR');
  }

  getSuggestions(): string[] {
    return ['Check entity configuration'];
  }
}
```

### GraphQL Errors

```typescript
// Always use factory method
throw GraphQLError.fromCombinedError(result.error, 'OperationName');
```

### Validation Errors

```typescript
// Always use factory method
throw ZodValidationError.fromZodError(zodError);
```

## Validation Checkpoint

After completing code changes:
- [ ] Run `pnpm check:fix`
- [ ] Verify with `pnpm build`
- [ ] Check types with `npx tsc --noEmit`

**Required Skill**: `reviewing-typescript-code` (invoke before implementation)
