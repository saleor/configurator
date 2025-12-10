# Adding Entity Types

Creates new Saleor entity types with complete implementation: GraphQL operations, Zod schemas, bulk mutations, repository/service layers, and tests. Use when implementing new entities, adding modules, or creating features that interact with Saleor API.

## Quick Reference

| Step | Output | Key File |
|------|--------|----------|
| 1. Schema | Zod validation | `src/modules/config/schema/<entity>.schema.ts` |
| 2. GraphQL | gql.tada operations | `src/modules/<entity>/operations.ts` |
| 3. Repository | Data access | `src/modules/<entity>/repository.ts` |
| 4. Bulk Mutations | Chunked processing | Integrated in repository |
| 5. Service | Business logic | `src/modules/<entity>/service.ts` |
| 6. Tests | Vitest + MSW | `src/modules/<entity>/*.test.ts` |
| 7. Pipeline | Deployment stage | `src/modules/deployment/stages/` |

## E2E Workflow

```
┌─────────────────┐
│ 1. Zod Schema   │  Define validation + infer types
└────────┬────────┘
         ▼
┌─────────────────┐
│ 2. GraphQL Ops  │  gql.tada queries/mutations
└────────┬────────┘
         ▼
┌─────────────────┐
│ 3. Repository   │  Data access + error wrapping
└────────┬────────┘
         ▼
┌─────────────────┐
│ 4. Bulk Mutations│  Chunking + error policies
└────────┬────────┘
         ▼
┌─────────────────┐
│ 5. Service      │  Business logic + orchestration
└────────┬────────┘
         ▼
┌─────────────────┐
│ 6. Tests        │  Unit + integration + builders
└────────┬────────┘
         ▼
┌─────────────────┐
│ 7. Pipeline     │  Add deployment stage
└─────────────────┘
```

## Step 1: Define Zod Schema

Create config schema in `src/modules/config/schema/`:

```typescript
// entity.schema.ts
import { z } from "zod";

// Base schema with validation
const entitySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  isActive: z.boolean().default(true),
});

// Infer TypeScript type
export type EntityInput = z.infer<typeof entitySchema>;

// Export for config validation
export { entitySchema };
```

**Key patterns:** [See references/zod-schemas.md](references/zod-schemas.md)
- Discriminated unions for variant types
- Branded types for type safety
- Transform for data normalization

## Step 2: Create GraphQL Operations

Define operations in `src/modules/<entity>/operations.ts`:

```typescript
import { graphql } from "@/lib/graphql/graphql";

// Query with gql.tada (auto-typed)
export const getEntitiesQuery = graphql(`
  query GetEntities($first: Int!) {
    entities(first: $first) {
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

// Mutation
export const createEntityMutation = graphql(`
  mutation CreateEntity($input: EntityInput!) {
    entityCreate(input: $input) {
      entity { id, name, slug }
      errors { field, message, code }
    }
  }
`);

// Bulk mutation
export const bulkCreateEntitiesMutation = graphql(`
  mutation BulkCreateEntities(
    $entities: [EntityInput!]!
    $errorPolicy: ErrorPolicyEnum
  ) {
    entityBulkCreate(entities: $entities, errorPolicy: $errorPolicy) {
      count
      results {
        entity { id, name, slug }
        errors { path, message, code }
      }
    }
  }
`);
```

**Key patterns:** [See references/graphql-operations.md](references/graphql-operations.md)
- Use `ResultOf<typeof Query>` for type inference
- Include error fields in mutations
- Follow naming conventions

## Step 3: Implement Repository

Create `src/modules/<entity>/repository.ts`:

```typescript
import type { Client } from "@urql/core";
import { getEntitiesQuery, createEntityMutation } from "./operations";
import { GraphQLError } from "@/lib/errors";

export interface EntityOperations {
  getEntities(): Promise<Entity[]>;
  createEntity(input: EntityInput): Promise<Entity>;
  bulkCreateEntities(inputs: EntityInput[]): Promise<BulkResult>;
}

export class EntityRepository implements EntityOperations {
  constructor(private client: Client) {}

  async getEntities(): Promise<Entity[]> {
    const result = await this.client.query(getEntitiesQuery, { first: 100 });

    if (result.error) {
      throw GraphQLError.fromCombinedError(result.error);
    }

    return result.data?.entities?.edges?.map(e => e.node) ?? [];
  }

  async createEntity(input: EntityInput): Promise<Entity> {
    const result = await this.client.mutation(createEntityMutation, { input });

    if (result.error) {
      throw GraphQLError.fromCombinedError(result.error);
    }

    const data = result.data?.entityCreate;
    if (data?.errors?.length) {
      throw new ValidationError(data.errors);
    }

    return data!.entity!;
  }
}
```

**Key patterns:** [See references/repository-service.md](references/repository-service.md)

## Step 4: Add Bulk Mutations

Integrate bulk operations with chunking:

```typescript
import { BulkOperationThresholds, ChunkSizeConfig } from "@/lib/utils/bulk-operation-constants";
import { processInChunks } from "@/lib/utils/chunked-processor";

async bulkCreateEntities(inputs: EntityInput[]): Promise<BulkResult> {
  // Use chunking for large batches
  if (inputs.length > BulkOperationThresholds.DEFAULT) {
    return processInChunks(
      inputs,
      (chunk) => this.executeBulkCreate(chunk),
      { chunkSize: ChunkSizeConfig.DEFAULT_CHUNK_SIZE }
    );
  }

  return this.executeBulkCreate(inputs);
}

private async executeBulkCreate(inputs: EntityInput[]) {
  const result = await this.client.mutation(bulkCreateEntitiesMutation, {
    entities: inputs,
    errorPolicy: "IGNORE_FAILED", // Continue on individual failures
  });

  // Collect successes and failures
  const successful: Entity[] = [];
  const failed: FailedItem[] = [];

  result.data?.entityBulkCreate?.results?.forEach((r, i) => {
    if (r.errors?.length) {
      failed.push({ input: inputs[i], errors: r.errors });
    } else if (r.entity) {
      successful.push(r.entity);
    }
  });

  return { successful, failed };
}
```

**Key patterns:** [See references/bulk-mutations.md](references/bulk-mutations.md)
- Thresholds: When to use bulk vs sequential
- Error policies: IGNORE_FAILED, REJECT_EVERYTHING
- Chunking: Rate limit handling

## Step 5: Create Service Layer

Create `src/modules/<entity>/service.ts`:

```typescript
import type { EntityOperations } from "./repository";
import { entitySchema, type EntityInput } from "@/modules/config/schema/entity.schema";

export class EntityService {
  constructor(
    private repository: EntityOperations,
    private logger: Logger
  ) {}

  async createEntities(configs: EntityConfig[]): Promise<CreateResult> {
    // Validate all inputs
    const validated = configs.map(c => entitySchema.parse(c));

    this.logger.info(`Creating ${validated.length} entities`);

    // Delegate to repository
    const result = await this.repository.bulkCreateEntities(validated);

    this.logger.info(`Created ${result.successful.length}, failed ${result.failed.length}`);

    return result;
  }
}
```

**Key patterns:** [See references/repository-service.md](references/repository-service.md)

## Step 6: Write Tests

Create test files in `src/modules/<entity>/`:

```typescript
// entity-service.test.ts
import { describe, it, expect, vi } from "vitest";
import { EntityService } from "./service";
import { entityBuilder } from "./test-helpers";

describe("EntityService", () => {
  const mockRepository = {
    getEntities: vi.fn(),
    createEntity: vi.fn(),
    bulkCreateEntities: vi.fn(),
  };

  it("creates entities with validation", async () => {
    const service = new EntityService(mockRepository, mockLogger);
    const input = entityBuilder().withName("Test").build();

    mockRepository.bulkCreateEntities.mockResolvedValue({
      successful: [{ id: "1", ...input }],
      failed: [],
    });

    const result = await service.createEntities([input]);

    expect(result.successful).toHaveLength(1);
    expect(mockRepository.bulkCreateEntities).toHaveBeenCalledWith([input]);
  });
});
```

**Key patterns:** [See references/testing.md](references/testing.md)
- Test builders for data generation
- MSW for GraphQL mocking
- Integration tests with real operations

## Step 7: Add to Deployment Pipeline

Add stage in `src/modules/deployment/stages/`:

```typescript
// entity-stage.ts
export const entityStage: DeploymentStage = {
  name: "entities",
  order: 10, // After dependencies
  async execute(context: DeploymentContext) {
    const { config, services } = context;

    if (!config.entities?.length) {
      return { skipped: true };
    }

    return services.entity.createEntities(config.entities);
  },
};
```

## Architecture Decision Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Type source | Zod schemas | Single source of truth, runtime validation |
| GraphQL typing | gql.tada | Auto-inference from schema |
| Bulk threshold | 10 items | Balance granularity vs performance |
| Error policy | IGNORE_FAILED | Continue processing, report all failures |
| Chunking | 10 items/chunk | Rate limit compliance |

## Related Skills

- **Domain concepts**: See `understanding-saleor-domain`
- **Testing details**: See `analyzing-test-coverage`
- **Zod patterns**: See `designing-zod-schemas`
- **GraphQL details**: See `writing-graphql-operations`
- **Code quality**: See `reviewing-typescript-code`
