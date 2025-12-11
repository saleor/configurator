# GraphQL Error Handling Patterns

This reference documents error handling patterns for GraphQL operations in the configurator.

## Error Types

### Network Errors (CombinedError)

Network errors occur when the GraphQL request fails to complete.

```typescript
import { CombinedError } from '@urql/core';

const result = await client.query(GetCategoriesQuery, { first: 100 });

if (result.error) {
  // CombinedError contains network and GraphQL errors
  throw GraphQLError.fromCombinedError(result.error, 'GetCategories');
}
```

### Mutation Validation Errors

Mutations return errors in the response data, not as network errors.

```typescript
const result = await client.mutation(CreateCategoryMutation, { input });

// Check network errors first
if (result.error) {
  throw GraphQLError.fromCombinedError(result.error, 'CreateCategory');
}

// Then check mutation-specific errors
if (result.data?.categoryCreate?.errors?.length) {
  throw new ValidationError(
    'Category creation failed',
    result.data.categoryCreate.errors
  );
}
```

### Bulk Operation Errors

Bulk mutations can have per-item errors while succeeding overall.

```typescript
const result = await client.mutation(BulkCreateMutation, {
  entities: inputs,
  errorPolicy: 'IGNORE_FAILED',
});

// Collect successes and failures
const successful: Entity[] = [];
const failed: FailedItem[] = [];

result.data?.bulkCreate?.results?.forEach((r, i) => {
  if (r.errors?.length) {
    failed.push({
      input: inputs[i],
      errors: r.errors,
    });
  } else if (r.entity) {
    successful.push(r.entity);
  }
});

return { successful, failed };
```

## Error Wrapping

### GraphQLError Class

Use `GraphQLError.fromCombinedError()` to wrap urql errors with context.

```typescript
// src/lib/errors/graphql-error.ts
export class GraphQLError extends BaseError {
  static fromCombinedError(
    error: CombinedError,
    operationName: string,
    context?: Record<string, unknown>
  ): GraphQLError {
    const message = error.graphQLErrors?.[0]?.message ?? error.message;
    return new GraphQLError(message, {
      operationName,
      networkError: error.networkError?.message,
      graphqlErrors: error.graphQLErrors?.map((e) => e.message),
      ...context,
    });
  }
}
```

### Error Context

Always include operation context for debugging:

```typescript
// BAD - No context
if (result.error) {
  throw new Error(result.error.message);
}

// GOOD - Include operation name and input
if (result.error) {
  throw GraphQLError.fromCombinedError(result.error, 'CreateCategory', {
    categorySlug: input.slug,
    parentSlug: input.parent,
  });
}
```

## Error Scenarios

### Network Errors

| Error | Cause | Recovery |
|-------|-------|----------|
| `ECONNREFUSED` | Server not running | Check Saleor instance URL |
| `ETIMEDOUT` | Request timeout | Retry with exponential backoff |
| `ENOTFOUND` | DNS resolution failed | Verify URL format |

### Authentication Errors

| Error | Cause | Recovery |
|-------|-------|----------|
| `Unauthorized` | Invalid token | Re-generate token |
| `Permission denied` | Missing scope | Check token permissions |
| `Token expired` | Token TTL exceeded | Generate new token |

### Validation Errors

| Error Code | Cause | Recovery |
|------------|-------|----------|
| `REQUIRED` | Missing field | Check input data |
| `UNIQUE` | Duplicate value | Use different identifier |
| `NOT_FOUND` | Reference invalid | Check referenced entity exists |

## Retry Logic

The urql client is configured with retry logic for transient errors.

```typescript
import { retryExchange } from '@urql/exchange-retry';

const client = new Client({
  exchanges: [
    // ... other exchanges
    retryExchange({
      initialDelayMs: 1000,
      maxDelayMs: 15000,
      maxNumberAttempts: 5,
      retryIf: (error) => {
        // Retry on rate limits and network errors
        return error?.response?.status === 429 || !error?.response;
      },
    }),
    fetchExchange,
  ],
});
```

## Error Classification

Use registry pattern for error classification:

```typescript
interface ErrorMatcher {
  matches: (msg: string) => boolean;
  create: (error: Error, operation: string) => DeploymentError;
}

const ERROR_MATCHERS: ErrorMatcher[] = [
  {
    matches: (msg) => msg.includes('fetch failed'),
    create: (error, op) => new NetworkDeploymentError('Connection failed', { operation: op }),
  },
  {
    matches: (msg) => msg.includes('unauthorized'),
    create: (error, op) => new AuthenticationDeploymentError('Auth failed', { operation: op }),
  },
];

function classifyError(error: Error, operation: string): DeploymentError {
  const msg = error.message.toLowerCase();
  const matcher = ERROR_MATCHERS.find((m) => m.matches(msg));
  return matcher?.create(error, operation) ?? new UnexpectedDeploymentError(error.message);
}
```

## Testing Error Scenarios

### MSW Error Handlers

```typescript
import { graphql, HttpResponse } from 'msw';

// Network error
server.use(
  graphql.query('GetCategories', () => {
    return HttpResponse.error();
  })
);

// GraphQL error
server.use(
  graphql.query('GetCategories', () => {
    return HttpResponse.json({
      errors: [{ message: 'Not authorized' }],
    });
  })
);

// Mutation validation error
server.use(
  graphql.mutation('CreateCategory', () => {
    return HttpResponse.json({
      data: {
        categoryCreate: {
          category: null,
          errors: [
            { field: 'slug', message: 'Slug already exists', code: 'UNIQUE' },
          ],
        },
      },
    });
  })
);
```
