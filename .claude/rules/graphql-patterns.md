---
paths:
  - src/lib/graphql/**/*.ts
  - src/modules/**/repository.ts
  - src/modules/**/operations.ts
alwaysApply: false
---

# GraphQL Patterns

## Before You Start

Before creating or modifying GraphQL operations, invoke the `writing-graphql-operations` skill for comprehensive patterns.

## Stack

- **gql.tada**: Type-safe GraphQL with automatic type inference
- **urql**: GraphQL client with auth and retry
- **MSW**: Mocking for tests

## Quick Reference

### Query Pattern

```typescript
import { graphql } from 'gql.tada';

export const GetCategoryBySlugQuery = graphql(`
  query GetCategoryBySlug($slug: String!) {
    category(slug: $slug) {
      id
      name
      slug
      parent { slug }
    }
  }
`);
```

### Mutation Pattern

```typescript
export const CreateCategoryMutation = graphql(`
  mutation CreateCategory($input: CategoryInput!) {
    categoryCreate(input: $input) {
      category { id name slug }
      errors { field message code }
    }
  }
`);
```

## Repository Pattern

```typescript
export class CategoryRepository {
  constructor(private readonly client: Client) {}

  async findBySlug(slug: string): Promise<Category | null> {
    const result = await this.client.query(GetCategoryBySlugQuery, { slug });

    if (result.error) {
      throw GraphQLError.fromCombinedError(result.error, 'GetCategoryBySlug');
    }

    return result.data?.category
      ? this.mapCategory(result.data.category)
      : null;
  }

  async create(input: CategoryInput): Promise<Category> {
    const result = await this.client.mutation(CreateCategoryMutation, { input });

    if (result.error) {
      throw GraphQLError.fromCombinedError(result.error, 'CreateCategory');
    }

    // Check mutation-specific errors
    if (result.data?.categoryCreate?.errors?.length) {
      throw new ValidationError(result.data.categoryCreate.errors);
    }

    return this.mapCategory(result.data!.categoryCreate!.category!);
  }
}
```

## Error Handling Checklist

- [ ] Check `result.error` (network/GraphQL errors)
- [ ] Check `result.data?.mutation?.errors` (validation errors)
- [ ] Include operation name in error context
- [ ] Map GraphQL types to domain types (don't expose raw types)

## Type Inference

```typescript
import { ResultOf, VariablesOf } from 'gql.tada';

// Infer types from operations
type CategoryResult = ResultOf<typeof GetCategoryBySlugQuery>;
type CategoryVariables = VariablesOf<typeof GetCategoryBySlugQuery>;
```

## Fragment Pattern

```typescript
const CategoryFragment = graphql(`
  fragment CategoryFields on Category {
    id
    name
    slug
  }
`);

const GetCategoryQuery = graphql(`
  query GetCategory($id: ID!) {
    category(id: $id) {
      ...CategoryFields
    }
  }
`, [CategoryFragment]);
```

## Schema Updates

When Saleor adds new fields:

```bash
pnpm fetch-schema
```

Then update:
1. Queries/mutations to include new fields
2. Zod schemas for validation
3. MSW mocks in `src/lib/graphql/__mocks__/`

## Validation Checkpoint

After completing GraphQL changes:
- [ ] Schema fetched (`pnpm fetch-schema`)
- [ ] Error handling covers both result.error and mutation errors
- [ ] Types mapped to domain types
- [ ] MSW mocks updated for tests

**Required Skill**: `writing-graphql-operations` (invoke before implementation)
