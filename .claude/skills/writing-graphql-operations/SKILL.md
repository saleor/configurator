---
name: writing-graphql-operations
description: "Creates GraphQL queries and mutations using gql.tada and urql. Use when writing operations, implementing repositories, updating schema, or testing GraphQL code."
allowed-tools: "Read, Grep, Glob, Write, Edit"
metadata:
  author: Ollie Shop
  version: 1.0.0
compatibility: "Claude Code with Node.js >=20, pnpm, TypeScript 5.5+"
---

# GraphQL Operations Developer

## Overview

Guide the creation and maintenance of GraphQL operations following project conventions for type safety, organization, error handling, and testing with gql.tada and urql.

## When to Use

- Creating new GraphQL queries or mutations
- Integrating with Saleor API endpoints
- Updating schema after Saleor changes
- Working with urql client configuration
- Creating MSW mocks for testing

## Quick Reference

| Tool | Purpose |
|------|---------|
| **gql.tada** | Type-safe GraphQL with TypeScript inference |
| **urql** | GraphQL client with caching |
| **@urql/exchange-auth** | Authentication (Bearer token) |
| **@urql/exchange-retry** | Rate limit retry (429, max 5 attempts) |

## File Organization

GraphQL operations are **module-local**, not centralized:

```
src/lib/graphql/
├── client.ts              # urql client configuration
├── graphql-types.ts       # gql.tada type definitions
├── graphql-env.d.ts       # Generated schema types
├── fetch-schema.ts        # Schema fetching utility
└── index.ts               # Re-exports

src/modules/<entity>/
├── operations.ts          # GraphQL queries and mutations for this entity
├── repository.ts          # Uses operations, maps to domain models
├── service.ts             # Business logic
└── *.test.ts              # Tests
```

**Key pattern**: Each module defines its own GraphQL operations in `operations.ts`. There are no centralized `operations/` or `fragments/` directories.

## Creating Operations

Use `gql.tada` for all operations. Types are inferred from schema automatically:

```typescript
import { graphql } from 'gql.tada';

export const GetCategoriesQuery = graphql(`
  query GetCategories($first: Int!) {
    categories(first: $first) {
      edges {
        node { id, name, slug, description }
      }
    }
  }
`);

// Type inferred automatically
type GetCategoriesResult = ResultOf<typeof GetCategoriesQuery>;
```

For shared fields, extract fragments and pass as second argument to `graphql()`.

## Repository Pattern

Each entity has a repository class that encapsulates GraphQL operations and maps responses to domain models:

```typescript
export class CategoryRepository {
  constructor(private readonly client: Client) {}

  async findAll(): Promise<Category[]> {
    const result = await this.client.query(GetCategoriesQuery, { first: 100 });
    if (result.error) {
      throw GraphQLError.fromCombinedError(result.error, 'GetCategories');
    }
    return this.mapCategories(result.data?.categories);
  }

  async create(input: CategoryInput): Promise<Category> {
    const result = await this.client.mutation(CreateCategoryMutation, { input });
    if (result.error) {
      throw GraphQLError.fromCombinedError(result.error, 'CreateCategory');
    }
    if (result.data?.categoryCreate?.errors?.length) {
      throw new GraphQLError('Category creation failed', result.data.categoryCreate.errors);
    }
    return this.mapCategory(result.data?.categoryCreate?.category);
  }
}
```

**Key pattern**: Always map GraphQL responses to domain models in the repository. Never expose GraphQL types to services.

## Error Handling

Two error types to always check:

1. **Network/GraphQL errors** (`result.error`): Wrap with `GraphQLError.fromCombinedError(error, 'OperationName', { context })`
2. **Mutation validation errors** (`result.data?.mutation?.errors`): Check array length, throw with field details

See [references/error-handling.md](references/error-handling.md) for complete error patterns, classification, and MSW error mocking.

## Schema Management

```bash
pnpm fetch-schema  # Updates schema.graphql and graphql-env.d.ts
```

Update schema when: new Saleor features needed, after Saleor version upgrade, or when encountering schema drift errors. Always commit schema changes with the feature implementation.

## Testing

Mock GraphQL operations with MSW using `graphql.query()` and `graphql.mutation()` handlers. See `analyzing-test-coverage` skill for full MSW setup patterns.

## Client Configuration

The urql client is configured in `src/lib/graphql/client.ts` with: `cacheExchange`, `authExchange` (Bearer token), `retryExchange` (1s-15s backoff, 5 attempts, retries on 429 and network errors), and `fetchExchange`.

## Best Practices

**Do**:
- Use `gql.tada` for all operations (automatic type inference)
- Keep operations close to their domain modules
- Map GraphQL responses to domain models in repository
- Include operation name in error context
- Update mocks when schema changes
- Extract shared fields to fragments

**Don't**:
- Use raw string queries (no type safety)
- Expose GraphQL types directly to services
- Skip error handling for any operation
- Hardcode pagination limits (use constants)

## Validation Checkpoints

| Phase | Validate | Command |
|-------|----------|---------|
| Schema fresh | No drift | `pnpm fetch-schema` |
| Operations typed | gql.tada inference | Check IDE types |
| Mocks match | MSW handlers | `pnpm test` |
| Error handling | All paths covered | Code review |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Not checking `errors` array | Always check `result.data?.mutation?.errors` |
| Exposing GraphQL types | Map to domain types in repository |
| Missing error context | Include operation name in errors |
| Stale schema | Run `pnpm fetch-schema` after Saleor updates |
| Not using fragments | Extract shared fields to fragments |

## External Documentation

For up-to-date library docs, use Context7 MCP:
- urql: `resolve-library-id` with `/urql-graphql/urql`
- gql.tada: `resolve-library-id` with "gql.tada"

## References

### Skill Reference Files
- **[Error Handling](references/error-handling.md)** - Error types, wrapping, classification, and MSW error mocking
- **[Fragment Patterns](references/fragment-patterns.md)** - Fragment composition and type inference

### Project Resources
- `src/lib/graphql/client.ts` - Client configuration
- `src/lib/graphql/graphql-types.ts` - gql.tada type definitions
- `src/lib/graphql/graphql-env.d.ts` - Generated schema types
- `src/modules/<entity>/operations.ts` - Module-local operations (e.g., `src/modules/category/operations.ts`)
- `docs/CODE_QUALITY.md#graphql--external-integrations` - Quality standards

## Related Skills

- **Complete entity workflow**: See `adding-entity-types` for full implementation including bulk mutations
- **Bulk operations**: See `adding-entity-types/references/bulk-mutations.md` for chunking patterns
- **Testing GraphQL**: See `analyzing-test-coverage` for MSW setup

## Troubleshooting

### Common Error Scenarios

| Error | Cause | Fix |
|-------|-------|-----|
| `CombinedError: [Network]` | API unreachable or URL malformed | Verify `--url` ends with `/graphql/` and instance is running |
| `CombinedError: [GraphQL]` | Invalid query or variables | Run `pnpm fetch-schema` and check operation against schema |
| `result.data?.mutation?.errors` non-empty | Saleor validation rejection | Read `field` and `message` from errors array for specifics |
| `TypeError: Cannot read property of undefined` | Missing null check on response | Always check `result.data` before accessing nested properties |
| HTTP 429 (rate limited) | Too many requests | Built-in retry exchange handles this; increase delay if persistent |

### Debugging Steps

1. **Check schema freshness**: `pnpm fetch-schema` — ensures local schema matches remote
2. **Isolate the operation**: Test the query/mutation in Saleor's GraphQL Playground first
3. **Add error context**: Include operation name in all error wrapping calls
4. **Check MSW handlers**: Ensure test mocks match updated operation signatures
5. **Verify type inference**: Hover over `ResultOf<typeof Query>` in IDE to confirm types

## Quick Reference Rule

For a condensed quick reference, see `.claude/rules/graphql-patterns.md` (automatically loaded when editing GraphQL operations and repository files).
