---
paths: src/**/*.ts
alwaysApply: false
---

# TypeScript Strictness

Patterns that go beyond what biome and `strict: true` catch. These enforce runtime safety and domain correctness.

## Catch Variables

With `useUnknownInCatchVariables` enabled, all catch variables are `unknown`.

```typescript
// Required
catch (error: unknown) {
  if (error instanceof BaseError) {
    // handle domain error
  }
  throw new ServiceError('Operation failed', { cause: error });
}

// Forbidden
catch (error) {
  console.log(error.message);  // error is unknown, no .message
}
```

## Branded Types for Domain IDs

Use branded types for entity identifiers in public function signatures.

```typescript
// Required
type EntitySlug = string & { readonly __brand: unique symbol };

function findBySlug(slug: EntitySlug): Promise<Entity | null>;

// Forbidden in public APIs
function findBySlug(slug: string): Promise<Entity | null>;
```

Internal helper functions may use plain `string` when the branding adds no value.

## No `as` Assertions

Type assertions bypass TypeScript checking. Use proper narrowing instead.

```typescript
// Forbidden
const data = response as ProductData;
const items = result as unknown as Item[];

// Allowed
const obj = { key: 'value' } as const;
const mock = vi.fn() as MockedObject<Repo>;  // test mocks only

// Required alternatives
const data = ProductSchema.parse(response);           // Zod parsing
if (isProduct(data)) { /* narrowed */ }               // Type guard
if (result.ok) { result.data }                        // Discriminated union
```

## Discriminated Unions Over Optional Bags

When >3 properties are conditionally present based on a type/kind discriminator, use discriminated unions.

```typescript
// Forbidden
interface DeployResult {
  type: 'success' | 'error' | 'skipped';
  data?: unknown;
  error?: Error;
  reason?: string;
}

// Required
type DeployResult =
  | { type: 'success'; data: unknown }
  | { type: 'error'; error: Error }
  | { type: 'skipped'; reason: string };
```

## Validation Checkpoint

After TypeScript changes:
- [ ] `npx tsc --noEmit` passes
- [ ] No new `as` assertions introduced
- [ ] Catch blocks handle `unknown` properly
- [ ] Domain values use branded types
