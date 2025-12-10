---
name: reviewing-typescript-code
description: "Reviews TypeScript code for type safety, clean code principles, and project standards. Analyzes type errors, functional patterns, Zod usage, and error handling. Triggers on: code review, PR review, check implementation, audit code, analyze quality, inspect types, validate patterns."
allowed-tools: "Read, Grep, Glob"
---

# TypeScript Code Review

## Purpose

Perform thorough TypeScript code reviews across multiple dimensions: type safety, clean code principles, functional programming patterns, error handling, and project-specific conventions for the Saleor Configurator codebase.

## When to Use

- Reviewing code before committing
- Analyzing pull request changes
- Checking implementation quality
- Auditing existing code for improvements
- Validating adherence to project standards

## Table of Contents

- [Review Checklist](#review-checklist)
  - [Type Safety Analysis](#1-type-safety-analysis)
  - [Clean Code Principles](#2-clean-code-principles)
  - [Functional Programming Patterns](#3-functional-programming-patterns)
  - [Zod Schema Usage](#4-zod-schema-usage)
  - [Error Handling](#5-error-handling)
  - [Performance Considerations](#6-performance-considerations)
- [Review Output Format](#review-output-format)
- [Project-Specific Conventions](#project-specific-conventions)
- [References](#references)

## Review Checklist

### 1. Type Safety Analysis

**Critical (Must Fix)**:
- [ ] No `any` types in production code (only allowed in test mocks)
- [ ] No unsafe type assertions (`as unknown as T`)
- [ ] No non-null assertions (`!`) without strong justification
- [ ] Proper type guards for runtime validation

**Best Practices**:
- [ ] Branded types used for domain-specific values (EntitySlug, EntityName)
- [ ] Discriminated unions preferred over inheritance
- [ ] Type inference leveraged where clear
- [ ] Generic constraints properly applied
- [ ] `readonly` used for immutable data

```typescript
// BAD - Avoid these patterns
const result: any = someOperation();
const value = maybeUndefined!;
const data = response as unknown as MyType;

// GOOD - Use these patterns
type EntitySlug = string & { readonly __brand: unique symbol };
const isSlugBasedEntity = (entity: unknown): entity is { slug: string } => { ... };
const ENTITY_TYPES = ['categories', 'products'] as const;
```

### 2. Clean Code Principles

**Function Quality**:
- [ ] Single Responsibility Principle followed
- [ ] Functions are small (< 20 lines ideally)
- [ ] Pure functions where possible (no side effects)
- [ ] Meaningful, declarative names used
- [ ] Arrow functions for consistency

**Naming Conventions**:
- [ ] Functions describe what they do, not how
- [ ] Variables are descriptive and context-specific
- [ ] Boolean names start with `is`, `has`, `should`, `can`
- [ ] Collections use plural names

```typescript
// BAD naming
const data = process(items);
const flag = check(user);

// GOOD naming
const categoriesToProcess = await fetchPendingCategories();
const isEntitySlugUnique = await validateSlugUniqueness(slug);
```

### 3. Functional Programming Patterns

**Immutability**:
- [ ] No direct mutation of arrays or objects
- [ ] Spread operator or immutable methods used
- [ ] `Map` preferred over object for frequent lookups

**Composition**:
- [ ] Small, composable functions
- [ ] Higher-order functions for reusable logic
- [ ] Pipeline patterns where appropriate

```typescript
// BAD - Mutation
items.push(newItem);
entity.status = 'active';

// GOOD - Immutable
const updatedItems = [...items, newItem];
const updatedEntity = { ...entity, status: 'active' };
```

### 4. Zod Schema Usage

**Schema Patterns**:
- [ ] Schemas defined before implementing logic
- [ ] Type inference with `z.infer<>`
- [ ] Reusable schema primitives (EntitySlugSchema, EntityNameSchema)
- [ ] Discriminated unions for variant types
- [ ] Transform and refinement used appropriately

**Validation**:
- [ ] `safeParse` for error handling
- [ ] Detailed error messages with context
- [ ] Schema reuse in tests

```typescript
// GOOD pattern
const CategorySchema = BaseEntitySchema.extend({
  slug: EntitySlugSchema,
  parent: EntitySlugSchema.optional(),
});

type CategoryInput = z.infer<typeof CategorySchema>;
```

### 5. Error Handling

**Error Types**:
- [ ] Specific error types extend `BaseError`
- [ ] GraphQL errors wrapped with `GraphQLError.fromCombinedError()`
- [ ] Zod errors wrapped with `ZodValidationError.fromZodError()`
- [ ] Error messages are actionable

**Error Design**:
- [ ] Error includes relevant context
- [ ] Recovery suggestions provided
- [ ] Error codes for machine processing

```typescript
// GOOD error pattern
class EntityValidationError extends BaseError {
  constructor(message: string, public readonly validationIssues: ValidationIssue[] = []) {
    super(message, 'ENTITY_VALIDATION_ERROR');
  }

  getSuggestions(): string[] {
    return ['Check entity configuration against schema'];
  }
}
```

### 6. Performance Considerations

**Avoid Anti-patterns**:
- [ ] No accumulating spreads in reduce
- [ ] No function creation in loops
- [ ] No unnecessary object creation

**Optimize**:
- [ ] Use `Map` for frequent lookups
- [ ] Lazy evaluation for expensive operations
- [ ] Memoization where appropriate

```typescript
// BAD - Creates new object each iteration
const result = items.reduce((acc, item) => ({ ...acc, [item.id]: item }), {});

// GOOD - Mutates Map directly
const result = items.reduce((acc, item) => acc.set(item.id, item), new Map());
```

## Review Output Format

Structure findings as:

### Critical Issues
Items that must be fixed before merge.

### Important Improvements
Items that should be addressed but aren't blocking.

### Suggestions
Nice-to-have improvements for future consideration.

### Positive Observations
Well-implemented patterns worth highlighting.

## Project-Specific Conventions

- Entity identification: Slug-based (categories, products) vs Name-based (productTypes, pageTypes)
- Service pattern: Constructor DI with validator, repository, logger
- Repository pattern: GraphQL operations encapsulated
- Test pattern: vi.fn() mocks with schema-generated test data

## References

- See `{baseDir}/docs/CODE_QUALITY.md` for complete coding standards
- See `{baseDir}/docs/ARCHITECTURE.md` for service patterns
- See `{baseDir}/biome.json` for linting rules

## Related Skills

- **Complete entity workflow**: See `adding-entity-types` for architectural patterns
- **Zod standards**: See `designing-zod-schemas` for schema review criteria
- **Pre-commit checks**: See `validating-pre-commit` for quality gate commands
