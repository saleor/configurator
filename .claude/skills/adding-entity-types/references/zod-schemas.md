# Zod Schemas Reference

## Core Principle: Zod-First Development

1. Define Zod schema first (source of truth)
2. Infer TypeScript types with `z.infer<>`
3. Share validation across runtime and tests
4. Compose complex schemas from primitives

## Basic Patterns

### Simple Object Schema

```typescript
import { z } from "zod";

const entitySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Invalid slug format"),
  isActive: z.boolean().default(true),
});

export type EntityInput = z.infer<typeof entitySchema>;
```

### String Validation

```typescript
// Slug validation
const slugSchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be lowercase with hyphens");

// Name validation
const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name too long");

// Email
const emailSchema = z.string().email();

// URL
const urlSchema = z.string().url();
```

### Number Validation

```typescript
const priceSchema = z.number().positive().multipleOf(0.01);
const quantitySchema = z.number().int().min(0);
const percentageSchema = z.number().min(0).max(100);
```

## Advanced Patterns

### Discriminated Unions

Use for entities with variant types:

```typescript
const baseAttributeSchema = z.object({
  name: z.string(),
  slug: z.string(),
});

const dropdownAttributeSchema = baseAttributeSchema.extend({
  inputType: z.literal("DROPDOWN"),
  values: z.array(z.object({ name: z.string() })),
});

const textAttributeSchema = baseAttributeSchema.extend({
  inputType: z.literal("PLAIN_TEXT"),
});

const referenceAttributeSchema = baseAttributeSchema.extend({
  inputType: z.literal("REFERENCE"),
  entityType: z.enum(["PAGE", "PRODUCT", "PRODUCT_VARIANT"]),
});

// Discriminated union
export const attributeSchema = z.discriminatedUnion("inputType", [
  dropdownAttributeSchema,
  textAttributeSchema,
  referenceAttributeSchema,
]);

export type Attribute = z.infer<typeof attributeSchema>;
```

### Branded Types

For type-safe IDs and slugs:

```typescript
const EntitySlug = z.string().brand<"EntitySlug">();
type EntitySlug = z.infer<typeof EntitySlug>;

const EntityId = z.string().brand<"EntityId">();
type EntityId = z.infer<typeof EntityId>;

// Usage prevents mixing up IDs
function getEntity(id: EntityId) { /* ... */ }
function getEntityBySlug(slug: EntitySlug) { /* ... */ }
```

### Optional with Defaults

```typescript
const configSchema = z.object({
  name: z.string(),
  enabled: z.boolean().default(true),
  retries: z.number().int().default(3),
  timeout: z.number().optional(), // undefined if not provided
});
```

### Transforms

Normalize data during parsing:

```typescript
const slugSchema = z
  .string()
  .transform((val) => val.toLowerCase().replace(/\s+/g, "-"));

const trimmedStringSchema = z.string().transform((s) => s.trim());

const dateSchema = z.string().transform((s) => new Date(s));
```

### Refinements

Cross-field validation:

```typescript
const dateRangeSchema = z
  .object({
    startDate: z.string(),
    endDate: z.string(),
  })
  .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });
```

### Arrays

```typescript
const tagsSchema = z.array(z.string()).min(1).max(10);

const uniqueTagsSchema = z
  .array(z.string())
  .refine((items) => new Set(items).size === items.length, {
    message: "Tags must be unique",
  });
```

## Parsing Patterns

### Safe Parsing

```typescript
const result = entitySchema.safeParse(input);

if (!result.success) {
  // Handle validation errors
  const errors = result.error.flatten();
  throw new ValidationError(errors.fieldErrors);
}

// result.data is typed as EntityInput
return result.data;
```

### Strict Parsing

```typescript
try {
  const entity = entitySchema.parse(input);
  return entity;
} catch (error) {
  if (error instanceof z.ZodError) {
    throw ZodValidationError.fromZodError(error);
  }
  throw error;
}
```

## Composition Patterns

### Extending Schemas

```typescript
const baseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
});

const entitySchema = baseSchema.extend({
  name: z.string(),
  slug: z.string(),
});
```

### Merging Schemas

```typescript
const schema1 = z.object({ name: z.string() });
const schema2 = z.object({ slug: z.string() });

const mergedSchema = schema1.merge(schema2);
// { name: string, slug: string }
```

### Partial Schemas

```typescript
const updateSchema = entitySchema.partial();
// All fields optional

const patchSchema = entitySchema.partial().required({ id: true });
// Only id required
```

### Pick/Omit

```typescript
const createSchema = entitySchema.omit({ id: true, createdAt: true });
const summarySchema = entitySchema.pick({ id: true, name: true });
```

## File Organization

```
src/modules/config/schema/
├── helpers.schema.ts     # Shared primitives (slugSchema, nameSchema)
├── attribute.schema.ts   # Attribute schemas with unions
├── product.schema.ts     # Product schemas
├── schema.ts             # Main config schema (imports all)
└── index.ts              # Exports
```

## Testing Schemas

```typescript
import { describe, it, expect } from "vitest";
import { entitySchema } from "./entity.schema";

describe("entitySchema", () => {
  it("accepts valid input", () => {
    const input = { name: "Test", slug: "test" };
    expect(() => entitySchema.parse(input)).not.toThrow();
  });

  it("rejects invalid slug", () => {
    const input = { name: "Test", slug: "Invalid Slug!" };
    const result = entitySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("applies defaults", () => {
    const input = { name: "Test", slug: "test" };
    const result = entitySchema.parse(input);
    expect(result.isActive).toBe(true);
  });
});
```
