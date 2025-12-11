# Type Safety Examples

This reference documents type-safe patterns used in the configurator codebase.

## Branded Types

Branded types add compile-time safety to distinguish values that have the same runtime representation.

### Entity Identifiers

```typescript
// Define branded types for entity identifiers
type EntitySlug = string & { readonly __brand: unique symbol };
type EntityName = string & { readonly __brand: unique symbol };

// Zod schema with branding
const EntitySlugSchema = z.string()
  .regex(/^[a-z0-9-]+$/)
  .transform((v) => v as EntitySlug);

const EntityNameSchema = z.string()
  .min(1)
  .max(255)
  .transform((v) => v as EntityName);

// Usage - compiler prevents mixing slugs and names
function findBySlug(slug: EntitySlug): Entity | undefined { ... }
function findByName(name: EntityName): Entity | undefined { ... }

// This would be a compile error:
// findBySlug(someName); // Error: EntityName not assignable to EntitySlug
```

### ID Types

```typescript
// Saleor uses base64-encoded IDs
type SaleorID = string & { readonly __brand: 'SaleorID' };

// Helper to create branded IDs
const asSaleorID = (id: string): SaleorID => id as SaleorID;

// Repository returns properly typed IDs
interface Entity {
  id: SaleorID;
  name: string;
}
```

## Type Guards

Type guards enable runtime type checking with TypeScript inference.

### Object Type Guards

```typescript
// Guard for slug-based entities
const isSlugBasedEntity = (
  entity: unknown
): entity is { slug: string; name: string } => {
  return (
    typeof entity === 'object' &&
    entity !== null &&
    'slug' in entity &&
    typeof entity.slug === 'string' &&
    'name' in entity &&
    typeof entity.name === 'string'
  );
};

// Usage
if (isSlugBasedEntity(unknownData)) {
  // TypeScript knows unknownData has slug and name
  console.log(unknownData.slug);
}
```

### Discriminated Union Guards

```typescript
// Discriminated union for operation results
type OperationResult =
  | { type: 'success'; data: Entity }
  | { type: 'error'; error: Error }
  | { type: 'skipped'; reason: string };

// Type guard narrows the union
const isSuccess = (result: OperationResult): result is { type: 'success'; data: Entity } => {
  return result.type === 'success';
};

// Usage in filter
const successfulResults = results.filter(isSuccess);
// TypeScript knows these all have `data` property
```

### Nullable Filtering

```typescript
// Filter out null/undefined with type guard
const items = [1, null, 2, undefined, 3];
const numbers = items.filter((x): x is number => x !== null && x !== undefined);
// numbers is number[], not (number | null | undefined)[]
```

## Discriminated Unions

Discriminated unions provide type-safe handling of variant types.

### Entity Type Variants

```typescript
// Different attribute types have different properties
type AttributeInput =
  | { inputType: 'DROPDOWN'; values: string[] }
  | { inputType: 'MULTISELECT'; values: string[] }
  | { inputType: 'NUMERIC'; unit?: string }
  | { inputType: 'REFERENCE'; entityType: string }
  | { inputType: 'PLAIN_TEXT' }
  | { inputType: 'RICH_TEXT' };

// Exhaustive handling
function processAttribute(attr: AttributeInput): void {
  switch (attr.inputType) {
    case 'DROPDOWN':
    case 'MULTISELECT':
      console.log('Values:', attr.values);
      break;
    case 'NUMERIC':
      console.log('Unit:', attr.unit);
      break;
    case 'REFERENCE':
      console.log('Entity type:', attr.entityType);
      break;
    case 'PLAIN_TEXT':
    case 'RICH_TEXT':
      // No additional properties
      break;
    default:
      // TypeScript error if we miss a case (with noUncheckedIndexedAccess)
      const _exhaustive: never = attr;
  }
}
```

### Zod Discriminated Unions

```typescript
const AttributeSchema = z.discriminatedUnion('inputType', [
  z.object({
    inputType: z.literal('DROPDOWN'),
    values: z.array(z.string()),
  }),
  z.object({
    inputType: z.literal('REFERENCE'),
    entityType: z.string(),
  }),
  z.object({
    inputType: z.literal('PLAIN_TEXT'),
  }),
]);

type Attribute = z.infer<typeof AttributeSchema>;
// Type is properly narrowed based on inputType
```

## satisfies Operator

The `satisfies` operator validates types while preserving literal types.

### Config Objects

```typescript
// Without satisfies - loses literal types
const CONFIG: ConfigShape = {
  MAX_ITEMS: 10,
  TIMEOUT: 5000,
};
// CONFIG.MAX_ITEMS is `number`, not `10`

// With satisfies - preserves literals
interface ConfigShape {
  readonly MAX_ITEMS: number;
  readonly TIMEOUT: number;
}

const CONFIG = {
  MAX_ITEMS: 10,
  TIMEOUT: 5000,
} as const satisfies ConfigShape;
// CONFIG.MAX_ITEMS is `10` (literal type preserved)
```

### CLI Flags

```typescript
type CliFlag = `--${string}`;

const CLI_FLAGS = ['--json', '--verbose', '--dry-run'] as const satisfies readonly CliFlag[];
// Each element is validated to match the pattern
// Literal types are preserved for autocomplete
```

### Entity Type Arrays

```typescript
type EntityType = 'categories' | 'products' | 'channels' | 'attributes';

const SUPPORTED_ENTITIES = [
  'categories',
  'products',
  'attributes',
] as const satisfies readonly EntityType[];
// Validated against EntityType union
// Preserves literal types for type narrowing
```

## Generic Constraints

Generic constraints ensure type parameters meet specific requirements.

### Repository Pattern

```typescript
// Constrain to entities with ID
interface HasId {
  id: string;
}

interface Repository<T extends HasId> {
  findById(id: string): Promise<T | undefined>;
  save(entity: T): Promise<T>;
}

// Usage
class CategoryRepository implements Repository<Category> {
  // Category must have id: string
}
```

### Mapper Functions

```typescript
// Generic mapper with constraints
function mapEntities<TInput extends { id: string }, TOutput>(
  entities: TInput[],
  mapper: (entity: TInput) => TOutput
): Map<string, TOutput> {
  return new Map(entities.map((e) => [e.id, mapper(e)]));
}
```

## readonly Modifiers

Use `readonly` to enforce immutability at the type level.

### Immutable Arrays

```typescript
// Mutable array
function process(items: string[]): void {
  items.push('new'); // Allowed
}

// Immutable array
function processReadonly(items: readonly string[]): void {
  items.push('new'); // Error: push does not exist on readonly string[]
}
```

### Deep Readonly

```typescript
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

interface Config {
  api: { url: string; timeout: number };
  features: string[];
}

type ReadonlyConfig = DeepReadonly<Config>;
// All nested properties are readonly
```

### Zod Schema Inference

```typescript
// Zod infers readonly types with as const
const schema = z.object({
  values: z.array(z.string()),
});

type Mutable = z.infer<typeof schema>;
// { values: string[] }

type Immutable = z.infer<typeof schema.readonly()>;
// { readonly values: readonly string[] }
```
