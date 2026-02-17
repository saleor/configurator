---
name: reviewing-typescript-code
description: "Reviews TypeScript code for project-specific quality patterns. Use when writing entities, services, repositories, comparators, formatters, bootstrap methods, deployment stages, diff support, or reviewing PRs with functional patterns. Do NOT use for general TypeScript tutorials or non-Configurator projects."
allowed-tools: "Read, Grep, Glob"
metadata:
  author: Ollie Shop
  version: 1.0.0
compatibility: "Claude Code with Node.js >=20, pnpm, TypeScript 5.5+"
---

# TypeScript Code Quality Patterns

## Overview

Project-specific code quality checklist for the Saleor Configurator codebase. Covers type safety conventions, error handling patterns, and architectural standards unique to this project.

## When to Use

- Adding entity types, services, repositories, comparators, formatters
- Implementing deployment stages or bootstrap methods
- Creating Zod schemas or error classes
- Reviewing code before commit or PR merge

## Quick Reference

| Convention | Rule |
|-----------|------|
| No `any` | Production code only; allowed in test mocks |
| Branded types | Use `EntitySlug`, `EntityName` for domain values |
| Error classes | Extend `BaseError` with error code |
| GraphQL errors | Wrap with `GraphQLError.fromCombinedError()` |
| Zod errors | Wrap with `ZodValidationError.fromZodError()` |
| Functions | 10-50 lines ideal, ~100 max |
| Style | Functional (`map`/`filter`/`flatMap`) over loops |

## Quality Checklist

### Type Safety

- [ ] No `any` types in production code
- [ ] No unsafe assertions (`as unknown as T`)
- [ ] No non-null assertions (`!`) without justification
- [ ] Branded types for domain values (`EntitySlug`, `EntityName`)
- [ ] Discriminated unions over inheritance
- [ ] `satisfies` for type validation with literal preservation
- [ ] `readonly` for immutable data

### Clean Code

- [ ] Single responsibility per function
- [ ] Functions under 50 lines (ideally)
- [ ] Meaningful, declarative names
- [ ] Boolean names use `is`/`has`/`should`/`can` prefix
- [ ] Named constants instead of magic numbers
- [ ] Registry/strategy pattern for long conditional chains
- [ ] Arrow functions for consistency

### Functional Patterns

- [ ] No direct mutation of arrays/objects
- [ ] `map`/`filter`/`flatMap` over `for`/`forEach` loops
- [ ] No accumulating spreads in `reduce` (use `Map`)

### Error Handling

- [ ] Custom errors extend `BaseError` with error code
- [ ] GraphQL errors: `GraphQLError.fromCombinedError()`
- [ ] Zod errors: `ZodValidationError.fromZodError()`
- [ ] Error messages are actionable with recovery suggestions
- [ ] Error includes relevant context

## Review Output Format

Structure findings as:

### Critical Issues
Items that must be fixed before merge.

### Important Improvements
Items that should be addressed but are not blocking.

### Suggestions
Nice-to-have improvements for future consideration.

### Positive Observations
Well-implemented patterns worth highlighting.

## Project-Specific Conventions

- **Entity identification**: Slug-based (categories, products) vs Name-based (productTypes, pageTypes)
- **Service pattern**: Constructor DI with validator, repository, logger
- **Repository pattern**: GraphQL operations encapsulated, responses mapped to domain models
- **Test pattern**: `vi.fn()` mocks with schema-generated test data
- **Zod-first**: Define schemas before implementing logic; use `z.infer<>` for types

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `any` in production code | Use `unknown` + type guards |
| Exposing GraphQL types to services | Map to domain types in repository |
| Missing error context in GraphQL calls | Include operation name in error |
| Long `if-else` chains | Refactor to registry/strategy pattern |
| Accumulating spreads in `reduce` | Use `Map` or `Object.fromEntries` |
| Mutation in loops (`push`) | Use `map`/`filter`/`flatMap` |

## References

### Skill Reference Files
- **[Anti-Patterns](references/anti-patterns.md)** - Code examples of common anti-patterns with corrections
- **[Type Safety Examples](references/type-safety-examples.md)** - Branded types, type guards, discriminated unions

### Project Resources
- `docs/CODE_QUALITY.md` - Complete coding standards
- `docs/ARCHITECTURE.md` - Service patterns
- `biome.json` - Linting rules

## Related Skills

- **Complete entity workflow**: See `adding-entity-types` for architectural patterns
- **Zod standards**: See `designing-zod-schemas` for schema review criteria
- **Pre-commit checks**: See `validating-pre-commit` for quality gate commands

## Quick Reference Rule

For a condensed quick reference, see `.claude/rules/code-quality.md` (automatically loaded when editing `src/**/*.ts` files).
