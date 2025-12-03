# Primitive Schema Patterns

## String Schemas

```typescript
import { z } from 'zod';

// Basic string with constraints
const NameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .trim();

// Slug pattern (URL-friendly)
const SlugSchema = z
  .string()
  .min(1, 'Slug is required')
  .max(50, 'Slug must be less than 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens');

// Email pattern
const EmailSchema = z
  .string()
  .email('Invalid email address')
  .toLowerCase();

// URL pattern
const UrlSchema = z
  .string()
  .url('Invalid URL');
```

## Branded Types for Domain Safety

```typescript
// Create branded types for domain-specific values
type EntitySlug = string & { readonly __brand: unique symbol };
type EntityName = string & { readonly __brand: unique symbol };

// Schema with branded type transform
const EntitySlugSchema = z
  .string()
  .min(1, 'Slug is required')
  .regex(/^[a-z0-9-]+$/, 'Invalid slug format')
  .transform((value) => value as EntitySlug);

const EntityNameSchema = z
  .string()
  .min(1, 'Name is required')
  .transform((value) => value.trim() as EntityName);
```

## Number Schemas

```typescript
// Integer with range
const QuantitySchema = z
  .number()
  .int('Must be a whole number')
  .min(0, 'Quantity cannot be negative')
  .max(10000, 'Quantity too large');

// Decimal with precision
const PriceSchema = z
  .number()
  .min(0, 'Price cannot be negative')
  .multipleOf(0.01, 'Price must have max 2 decimal places');

// Optional with default
const PageSizeSchema = z
  .number()
  .int()
  .min(1)
  .max(100)
  .default(50);
```

## Enum Schemas

```typescript
// Native enum
enum EntityType {
  PRODUCT = 'PRODUCT',
  CATEGORY = 'CATEGORY',
  COLLECTION = 'COLLECTION',
}

const EntityTypeSchema = z.nativeEnum(EntityType);

// String literal union
const InputTypeSchema = z.enum([
  'DROPDOWN',
  'MULTISELECT',
  'RICH_TEXT',
  'PLAIN_TEXT',
  'BOOLEAN',
  'DATE',
  'NUMERIC',
  'REFERENCE',
]);

// With const assertion
const SUPPORTED_TYPES = ['categories', 'products', 'collections'] as const;
const SupportedTypeSchema = z.enum(SUPPORTED_TYPES);
```
