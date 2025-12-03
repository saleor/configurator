# Object and Array Schema Patterns

## Base Object with Extensions

```typescript
// Base schema with common fields
const BaseEntitySchema = z.object({
  name: EntityNameSchema,
  description: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Extended schema for specific entity
const CategorySchema = BaseEntitySchema.extend({
  slug: EntitySlugSchema,
  parent: EntitySlugSchema.optional(),
  isVisible: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});

// Pick specific fields
const CategoryIdentifierSchema = CategorySchema.pick({
  name: true,
  slug: true,
});

// Omit specific fields
const CategoryInputSchema = CategorySchema.omit({
  createdAt: true,
  updatedAt: true,
});
```

## Discriminated Unions

```typescript
// Discriminated union for type-safe variants
const EntityInputSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('category'),
    data: CategorySchema,
  }),
  z.object({
    type: z.literal('product'),
    data: ProductSchema,
  }),
  z.object({
    type: z.literal('collection'),
    data: CollectionSchema,
  }),
]);

// Type-safe handling
const processEntity = (input: z.infer<typeof EntityInputSchema>) => {
  switch (input.type) {
    case 'category':
      return processCategory(input.data); // TypeScript knows it's Category
    case 'product':
      return processProduct(input.data); // TypeScript knows it's Product
    case 'collection':
      return processCollection(input.data);
  }
};
```

## Nested Objects

```typescript
const AddressSchema = z.object({
  streetAddress1: z.string().min(1),
  streetAddress2: z.string().optional(),
  city: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().length(2), // ISO country code
});

const WarehouseSchema = z.object({
  name: EntityNameSchema,
  slug: EntitySlugSchema,
  address: AddressSchema,
  shippingZones: z.array(z.string()).default([]),
});
```

## Array Schema Patterns

```typescript
// Array with constraints
const TagsSchema = z
  .array(z.string().min(1))
  .min(1, 'At least one tag required')
  .max(10, 'Maximum 10 tags allowed');

// Array of objects
const VariantsSchema = z.array(
  z.object({
    sku: z.string().min(1),
    name: z.string().min(1),
    price: PriceSchema,
  })
).min(1, 'At least one variant required');

// Unique items
const UniqueSlugArraySchema = z
  .array(EntitySlugSchema)
  .refine(
    (items) => new Set(items).size === items.length,
    'Duplicate slugs found'
  );
```

## Transform and Refine

### Transforms

```typescript
// Transform input to normalized form
const NormalizedNameSchema = z
  .string()
  .transform((val) => val.trim().toLowerCase());

// Generate slug from name
const AutoSlugSchema = z
  .string()
  .transform((name) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );

// Parse JSON string
const JsonObjectSchema = z
  .string()
  .transform((val, ctx) => {
    try {
      return JSON.parse(val);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid JSON',
      });
      return z.NEVER;
    }
  });
```

### Refinements

```typescript
// Cross-field validation
const DateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
}).refine(
  (data) => data.endDate > data.startDate,
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);

// Complex business rule
const ProductSchema = z.object({
  name: z.string(),
  productType: z.string(),
  isDigital: z.boolean(),
  weight: z.number().optional(),
}).refine(
  (data) => data.isDigital || data.weight !== undefined,
  {
    message: 'Physical products must have weight',
    path: ['weight'],
  }
);
```

## Partial Validation

```typescript
// Partial for updates (all fields optional)
const CategoryUpdateSchema = CategorySchema.partial();

// Deep partial for nested structures
const DeepPartialCategorySchema = CategorySchema.deepPartial();

// Required for creation (ensure required fields)
const CategoryCreateSchema = CategorySchema.required({
  name: true,
  slug: true,
});
```

## Type Inference

```typescript
// Infer types from schemas
type Category = z.infer<typeof CategorySchema>;
type CategoryInput = z.infer<typeof CategoryInputSchema>;
type CategoryUpdate = z.infer<typeof CategoryUpdateSchema>;

// Input vs Output types (when transforms exist)
type CategoryRaw = z.input<typeof CategorySchema>;
type CategoryParsed = z.output<typeof CategorySchema>;
```
