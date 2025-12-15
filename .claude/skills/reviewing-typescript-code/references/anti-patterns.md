# Common Anti-Patterns

This reference documents common anti-patterns found in TypeScript code and their corrections.

## Type Safety Anti-Patterns

### Using `any` Type

```typescript
// BAD - Defeats type safety
const processData = (data: any) => {
  return data.value.nested.field; // No type checking
};

// GOOD - Use proper types or unknown
const processData = (data: unknown) => {
  if (isValidData(data)) {
    return data.value.nested.field; // Type-safe access
  }
  throw new Error('Invalid data');
};
```

### Unsafe Type Assertions

```typescript
// BAD - Double assertion bypasses type checking
const result = response as unknown as MyType;

// GOOD - Use type guards
const isMyType = (value: unknown): value is MyType => {
  return typeof value === 'object' && value !== null && 'expectedField' in value;
};

if (isMyType(response)) {
  const result = response; // Properly typed
}
```

### Non-null Assertions Without Justification

```typescript
// BAD - Can cause runtime errors
const value = maybeUndefined!.property;

// GOOD - Optional chaining or guard
const value = maybeUndefined?.property;

// OR with early return
if (!maybeUndefined) {
  throw new Error('Expected value to be defined');
}
const value = maybeUndefined.property;
```

## Functional Programming Anti-Patterns

### Mutation in Loops

```typescript
// BAD - Mutates array
const results: string[] = [];
for (const item of items) {
  results.push(transform(item));
}

// GOOD - Functional approach
const results = items.map(transform);
```

### forEach with Conditional Push

```typescript
// BAD - Imperative accumulation
const results: Result[] = [];
items.forEach((item) => {
  const match = item.match(pattern);
  if (match) {
    results.push({ id: match[1] });
  }
});

// GOOD - map + filter with type guard
const results = items
  .map((item) => {
    const match = item.match(pattern);
    return match ? { id: match[1] } : null;
  })
  .filter((r): r is Result => r !== null);
```

### Accumulating Spreads in Reduce

```typescript
// BAD - O(n^2) performance
const result = items.reduce((acc, item) => ({ ...acc, [item.id]: item }), {});

// GOOD - Use Map for better performance
const result = items.reduce((acc, item) => acc.set(item.id, item), new Map());

// OR use Object.fromEntries
const result = Object.fromEntries(items.map((item) => [item.id, item]));
```

## Error Handling Anti-Patterns

### Silent Failures

```typescript
// BAD - Swallows errors silently
try {
  await riskyOperation();
} catch (e) {
  // Empty catch block
}

// GOOD - Handle or re-throw
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', { error });
  throw new OperationError('Failed to complete operation', error);
}
```

### Not Checking GraphQL Errors

```typescript
// BAD - Missing error check
const result = await client.mutation(CreateEntityMutation, { input });
return result.data?.entityCreate?.entity;

// GOOD - Check both error types
const result = await client.mutation(CreateEntityMutation, { input });

if (result.error) {
  throw GraphQLError.fromCombinedError(result.error, 'CreateEntity');
}

if (result.data?.entityCreate?.errors?.length) {
  throw new ValidationError(result.data.entityCreate.errors);
}

return result.data?.entityCreate?.entity;
```

## Naming Anti-Patterns

### Vague Names

```typescript
// BAD - Unclear purpose
const data = process(items);
const flag = check(user);

// GOOD - Descriptive names
const transformedCategories = transformToCategoryInput(rawCategories);
const isUserAuthorized = checkUserPermissions(user);
```

### Missing Boolean Prefixes

```typescript
// BAD - Unclear boolean
const active = user.status === 'active';
const permission = roles.includes('admin');

// GOOD - Boolean prefixes
const isActive = user.status === 'active';
const hasPermission = roles.includes('admin');
```

## Code Organization Anti-Patterns

### Long Conditional Chains

```typescript
// BAD - Hard to maintain
function classify(error: Error): AppError {
  if (error.message.includes('network')) return new NetworkError();
  if (error.message.includes('auth')) return new AuthError();
  if (error.message.includes('validation')) return new ValidationError();
  return new UnexpectedError();
}

// GOOD - Registry pattern
const ERROR_MATCHERS: ErrorMatcher[] = [
  { matches: (m) => m.includes('network'), create: () => new NetworkError() },
  { matches: (m) => m.includes('auth'), create: () => new AuthError() },
];

function classify(error: Error): AppError {
  const matcher = ERROR_MATCHERS.find((m) => m.matches(error.message));
  return matcher?.create(error) ?? new UnexpectedError();
}
```

### Magic Numbers

```typescript
// BAD - Magic numbers
if (items.length > 10) { truncate(); }
const preview = text.slice(0, 30);

// GOOD - Named constants
const LIMITS = { MAX_ITEMS: 10, MAX_PREVIEW: 30 } as const;
if (items.length > LIMITS.MAX_ITEMS) { truncate(); }
const preview = text.slice(0, LIMITS.MAX_PREVIEW);
```
