# Saleor Configurator - Development Patterns

## Zod-First Development

Schema is the source of truth. Define Zod schema FIRST, then infer types.

```typescript
// ✅ CORRECT: Schema first, type inferred
const CategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
});
type Category = z.infer<typeof CategorySchema>;

// ❌ WRONG: Manual type definition
interface Category {
  name: string;
  slug: string;
  description?: string;
}
```

**Schema Location:** `src/modules/config/schema/`

## GraphQL with gql.tada

Type-safe GraphQL operations with automatic type inference.

```typescript
import { graphql, ResultOf, VariablesOf } from 'gql.tada';

// Query with automatic typing
export const GetCategoriesQuery = graphql(`
  query GetCategories($first: Int!) {
    categories(first: $first) {
      edges {
        node {
          id
          name
          slug
        }
      }
    }
  }
`);

// Types are inferred automatically
type QueryResult = ResultOf<typeof GetCategoriesQuery>;
type QueryVars = VariablesOf<typeof GetCategoriesQuery>;
```

**Operations Location:** `src/modules/<entity>/operations.ts`

## Bulk Mutations with Chunking

For operations exceeding threshold (default: 10 items), use bulk mutations with chunking.

```typescript
const CHUNK_SIZE = 50;
const THRESHOLD = 10;

async bulkCreate(inputs: EntityInput[]): Promise<BulkResult> {
  if (inputs.length <= THRESHOLD) {
    // Sequential for small batches (better error granularity)
    return this.createSequentially(inputs);
  }

  // Bulk with chunking for large batches
  const chunks = splitIntoChunks(inputs, CHUNK_SIZE);
  const results: BulkResult = { successful: [], failed: [] };

  for (const chunk of chunks) {
    const result = await this.client.mutation(BulkCreateMutation, {
      inputs: chunk,
      errorPolicy: 'IGNORE_FAILED', // Continue on individual failures
    });

    results.successful.push(...result.data?.bulkCreate?.results ?? []);
    results.failed.push(...result.data?.bulkCreate?.errors ?? []);

    await delay(100); // Rate limit protection
  }

  return results;
}
```

## Repository Pattern

Repositories handle GraphQL operations and error wrapping.

```typescript
export class EntityRepository {
  constructor(private readonly client: Client) {}

  async findBySlug(slug: string): Promise<Entity | null> {
    const result = await this.client.query(GetEntityQuery, { slug });

    if (result.error) {
      throw GraphQLError.fromCombinedError(result.error, 'GetEntity');
    }

    return result.data?.entity ?? null;
  }
}
```

## Service Layer

Services handle business logic and orchestration.

```typescript
export class EntityService {
  constructor(
    private readonly repository: EntityRepository,
    private readonly validator: EntityValidator,
    private readonly logger: Logger,
  ) {}

  async sync(configs: EntityConfig[]): Promise<SyncResult> {
    // 1. Validate all configs
    const validated = configs.map(c => this.validator.validate(c));

    // 2. Fetch current state
    const existing = await this.repository.findAll();

    // 3. Compute diff
    const { toCreate, toUpdate, toDelete } = this.computeDiff(validated, existing);

    // 4. Apply changes
    const results = await this.applyChanges(toCreate, toUpdate, toDelete);

    return results;
  }
}
```

## Error Handling

Always wrap errors with context:

```typescript
// GraphQL errors
if (result.error) {
  throw GraphQLError.fromCombinedError(result.error, 'OperationName', {
    entitySlug: input.slug,
  });
}

// Mutation-specific errors
if (result.data?.mutationName?.errors?.length) {
  throw new GraphQLError(
    'Operation failed',
    result.data.mutationName.errors
  );
}

// Validation errors
const parsed = schema.safeParse(data);
if (!parsed.success) {
  throw ZodValidationError.fromZodError(parsed.error, 'EntityConfig');
}
```

## Entity Identification

**Slug-based** (URL-friendly): Categories, Channels, Collections, Products, Warehouses, Menus

**Name-based** (internal): ProductTypes, PageTypes, TaxClasses, ShippingZones, Attributes

```typescript
// Slug-based comparison
const isSame = (local: Category, remote: Category) => local.slug === remote.slug;

// Name-based comparison
const isSame = (local: ProductType, remote: ProductType) => local.name === remote.name;
```
