---
paths:
  - src/modules/config/**/*.ts
alwaysApply: false
---

# Config Schema Patterns

## Before You Start

Before creating or modifying validation schemas, invoke the `designing-zod-schemas` skill for comprehensive patterns.

## Zod-First Development

1. Define Zod schema first
2. Infer TypeScript types from schema
3. Use schema for runtime validation

```typescript
import { z } from 'zod';

// 1. Define schema
const categorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  isActive: z.boolean().default(true),
});

// 2. Infer type
export type Category = z.infer<typeof categorySchema>;

// 3. Use for validation
const result = categorySchema.safeParse(input);
if (!result.success) {
  throw ZodValidationError.fromZodError(result.error);
}
```

## Common Patterns

### Branded Types

```typescript
const slugSchema = z.string()
  .regex(/^[a-z0-9-]+$/)
  .brand<'Slug'>();

type Slug = z.infer<typeof slugSchema>;
```

### Discriminated Unions

```typescript
const attributeSchema = z.discriminatedUnion('inputType', [
  z.object({
    inputType: z.literal('DROPDOWN'),
    values: z.array(z.string()),
  }),
  z.object({
    inputType: z.literal('TEXT'),
    maxLength: z.number().optional(),
  }),
]);
```

### Transform

```typescript
const priceSchema = z.string()
  .transform((val) => parseFloat(val))
  .pipe(z.number().positive());
```

### Optional with Default

```typescript
const configSchema = z.object({
  retries: z.number().default(3),
  timeout: z.number().default(5000),
});
```

## YAML Configuration Schema

Top-level config structure:

```typescript
const configSchema = z.object({
  shop: shopSchema.optional(),
  channels: z.array(channelSchema).optional(),
  categories: z.array(categorySchema).optional(),
  products: z.array(productSchema).optional(),
  // ... other entity sections
});
```

## Validation Error Handling

```typescript
const result = schema.safeParse(input);

if (!result.success) {
  // Use factory method for consistent error formatting
  throw ZodValidationError.fromZodError(result.error);
}

return result.data;
```

## Validation Checkpoint

After completing schema changes:
- [ ] Schema matches API requirements
- [ ] Types inferred correctly
- [ ] Defaults applied appropriately
- [ ] Error messages are user-friendly

**Required Skill**: `designing-zod-schemas` (invoke before implementation)
