# Bulk Mutations Reference

## When to Use Bulk Mutations

| Items Count | Strategy | Rationale |
|-------------|----------|-----------|
| 1-10 | Sequential | Better error granularity |
| 10+ | Bulk with chunking | Performance, rate limits |
| 100+ | Bulk with delays | Rate limit compliance |

## Configuration

From `src/lib/utils/bulk-operation-constants.ts`:

```typescript
export const BulkOperationThresholds = {
  ATTRIBUTES: 10,
  MODELS: 5,        // Lower due to rate limiting
  PRODUCTS: 10,
  DEFAULT: 10,
};

export const ChunkSizeConfig = {
  DEFAULT_CHUNK_SIZE: 10,
  PRODUCT_TYPES_CHUNK_SIZE: 10,
};

export const DelayConfig = {
  DEFAULT_CHUNK_DELAY_MS: 500,
  MODEL_PROCESSING_DELAY_MS: 100,
};

export const ErrorPolicy = {
  IGNORE_FAILED: "IGNORE_FAILED",           // Continue on failures
  REJECT_EVERYTHING: "REJECT_EVERYTHING",   // Abort all on any failure
  REJECT_FAILED_ROWS: "REJECT_FAILED_ROWS", // Reject only failed items
};
```

## Decision Flow

```
items.length > threshold?
│
├─ NO → Sequential Processing
│       └─ Individual mutations with granular errors
│
└─ YES → Bulk Processing
         │
         ├─ Split into chunks (10 items)
         │
         ├─ Process each chunk with delay
         │
         └─ Collect { successful, failed }
```

## Implementation Pattern

### Repository Method

```typescript
async bulkCreateEntities(inputs: EntityInput[]): Promise<BulkResult> {
  const threshold = BulkOperationThresholds.DEFAULT;

  if (inputs.length <= threshold) {
    // Sequential for better error handling
    return this.createSequentially(inputs);
  }

  // Bulk with chunking
  return this.createInChunks(inputs);
}

private async createInChunks(inputs: EntityInput[]): Promise<BulkResult> {
  const result = await processInChunks(
    inputs,
    (chunk) => this.executeBulkCreate(chunk),
    {
      chunkSize: ChunkSizeConfig.DEFAULT_CHUNK_SIZE,
      delayMs: DelayConfig.DEFAULT_CHUNK_DELAY_MS,
    }
  );

  return this.aggregateResults(result);
}
```

### Bulk Mutation Execution

```typescript
private async executeBulkCreate(inputs: EntityInput[]) {
  const result = await this.client.mutation(bulkCreateEntitiesMutation, {
    entities: inputs,
    errorPolicy: "IGNORE_FAILED",
  });

  if (result.error) {
    throw GraphQLError.fromCombinedError(result.error);
  }

  return this.processResults(result.data, inputs);
}

private processResults(data: BulkCreateData, inputs: EntityInput[]) {
  const successful: Entity[] = [];
  const failed: FailedItem[] = [];

  data?.entityBulkCreate?.results?.forEach((r, index) => {
    if (r.errors?.length) {
      failed.push({
        input: inputs[index],
        errors: r.errors.map(e => `${e.path}: ${e.message}`),
      });
    } else if (r.entity) {
      successful.push(r.entity);
    }
  });

  return { successful, failed, count: data?.entityBulkCreate?.count ?? 0 };
}
```

## Chunked Processor Utility

From `src/lib/utils/chunked-processor.ts`:

```typescript
export interface ChunkedProcessorOptions {
  chunkSize?: number;
  delayMs?: number;
  onChunkComplete?: (chunkIndex: number) => void;
}

export interface ChunkedProcessorResult<T, R> {
  successes: R[];
  failures: Array<{ chunk: T[]; error: Error }>;
  chunksProcessed: number;
}

export async function processInChunks<T, R>(
  items: T[],
  processFn: (chunk: T[]) => Promise<R>,
  options: ChunkedProcessorOptions = {}
): Promise<ChunkedProcessorResult<T, R>> {
  const {
    chunkSize = ChunkSizeConfig.DEFAULT_CHUNK_SIZE,
    delayMs = DelayConfig.DEFAULT_CHUNK_DELAY_MS,
  } = options;

  const chunks = splitIntoChunks(items, chunkSize);
  const successes: R[] = [];
  const failures: Array<{ chunk: T[]; error: Error }> = [];

  for (let i = 0; i < chunks.length; i++) {
    try {
      const result = await processFn(chunks[i]);
      successes.push(result);
    } catch (error) {
      failures.push({ chunk: chunks[i], error: error as Error });
    }

    // Delay between chunks (except last)
    if (i < chunks.length - 1 && delayMs > 0) {
      await delay(delayMs);
    }
  }

  return { successes, failures, chunksProcessed: chunks.length };
}
```

## Error Policies

### IGNORE_FAILED (Recommended)

Continue processing even if some items fail:

```typescript
const result = await client.mutation(bulkMutation, {
  entities: inputs,
  errorPolicy: "IGNORE_FAILED",
});

// Process all results, collect failures
result.data?.results?.forEach((r, i) => {
  if (r.errors?.length) {
    failed.push({ input: inputs[i], errors: r.errors });
  } else {
    successful.push(r.entity);
  }
});
```

### REJECT_EVERYTHING

Abort entire batch on any failure:

```typescript
const result = await client.mutation(bulkMutation, {
  entities: inputs,
  errorPolicy: "REJECT_EVERYTHING",
});

// Either all succeed or none
if (result.data?.errors?.length) {
  throw new BulkOperationError(result.data.errors);
}
```

## Rate Limiting

### Automatic Retry (Client Level)

From `src/lib/graphql/client.ts`:

```typescript
retryExchange({
  initialDelayMs: 1000,
  maxDelayMs: 15000,
  maxNumberAttempts: 3,
  retryIf: (error) => {
    if (error?.response?.status === 429) return true;
    if (error?.graphQLErrors?.some(
      e => e.extensions?.code === "TOO_MANY_REQUESTS"
    )) return true;
    return false;
  },
}),
```

### Manual Chunk Delays

```typescript
// For rate-limit sensitive operations
const result = await processInChunks(items, processFn, {
  chunkSize: 5,           // Smaller chunks
  delayMs: 1000,          // Longer delay
});
```

## Service Layer Integration

```typescript
export class EntityService {
  async createEntities(configs: EntityConfig[]): Promise<CreateResult> {
    const validated = configs.map(c => entitySchema.parse(c));

    this.logger.info(`Creating ${validated.length} entities`);

    const result = await this.repository.bulkCreateEntities(validated);

    // Log results
    this.logger.info(
      `Bulk create complete: ${result.successful.length} created, ` +
      `${result.failed.length} failed`
    );

    // Report failures
    if (result.failed.length > 0) {
      result.failed.forEach(f => {
        this.logger.warn(`Failed to create ${f.input.name}: ${f.errors.join(", ")}`);
      });
    }

    return result;
  }
}
```

## Testing Bulk Operations

```typescript
describe("bulkCreateEntities", () => {
  it("uses bulk mutation for large batches", async () => {
    const inputs = Array.from({ length: 15 }, (_, i) => ({
      name: `Entity ${i}`,
      slug: `entity-${i}`,
    }));

    mockClient.mutation.mockResolvedValue({
      data: {
        entityBulkCreate: {
          count: 15,
          results: inputs.map((input, i) => ({
            entity: { id: `${i}`, ...input },
            errors: [],
          })),
        },
      },
    });

    const result = await repository.bulkCreateEntities(inputs);

    expect(result.successful).toHaveLength(15);
    expect(result.failed).toHaveLength(0);
  });

  it("collects partial failures", async () => {
    const inputs = [
      { name: "Valid", slug: "valid" },
      { name: "Invalid", slug: "invalid" },
    ];

    mockClient.mutation.mockResolvedValue({
      data: {
        entityBulkCreate: {
          count: 1,
          results: [
            { entity: { id: "1", ...inputs[0] }, errors: [] },
            { entity: null, errors: [{ path: "slug", message: "Already exists" }] },
          ],
        },
      },
    });

    const result = await repository.bulkCreateEntities(inputs);

    expect(result.successful).toHaveLength(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].input).toEqual(inputs[1]);
  });
});
```
