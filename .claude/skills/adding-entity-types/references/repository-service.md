# Repository-Service Layer Reference

## Architecture Overview

```
┌─────────────────┐
│    Service      │  Business logic, validation, orchestration
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Repository    │  Data access, GraphQL operations, error mapping
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GraphQL Client │  urql with auth, retry, caching
└─────────────────┘
```

## Repository Pattern

### Interface Definition

```typescript
// Define operations interface for dependency injection
export interface EntityOperations {
  getEntities(): Promise<Entity[]>;
  getEntityBySlug(slug: string): Promise<Entity | null>;
  createEntity(input: EntityInput): Promise<Entity>;
  updateEntity(id: string, input: EntityInput): Promise<Entity>;
  deleteEntity(id: string): Promise<void>;
  bulkCreateEntities(inputs: EntityInput[]): Promise<BulkResult>;
}
```

### Repository Implementation

```typescript
import type { Client } from "@urql/core";
import { GraphQLError, NotFoundError } from "@/lib/errors";
import {
  getEntitiesQuery,
  getEntityBySlugQuery,
  createEntityMutation,
  updateEntityMutation,
  deleteEntityMutation,
  bulkCreateEntitiesMutation,
} from "./operations";

export class EntityRepository implements EntityOperations {
  constructor(private client: Client) {}

  async getEntities(): Promise<Entity[]> {
    const result = await this.client.query(getEntitiesQuery, { first: 100 });

    if (result.error) {
      throw GraphQLError.fromCombinedError(result.error);
    }

    return result.data?.entities?.edges?.map(e => e.node) ?? [];
  }

  async getEntityBySlug(slug: string): Promise<Entity | null> {
    const result = await this.client.query(getEntityBySlugQuery, { slug });

    if (result.error) {
      throw GraphQLError.fromCombinedError(result.error);
    }

    return result.data?.entity ?? null;
  }

  async createEntity(input: EntityInput): Promise<Entity> {
    const result = await this.client.mutation(createEntityMutation, { input });

    // Network/GraphQL error
    if (result.error) {
      throw GraphQLError.fromCombinedError(result.error);
    }

    // Mutation validation errors
    const data = result.data?.entityCreate;
    if (data?.errors?.length) {
      throw new ValidationError(
        `Failed to create entity: ${data.errors.map(e => e.message).join(", ")}`
      );
    }

    return data!.entity!;
  }

  async updateEntity(id: string, input: EntityInput): Promise<Entity> {
    const result = await this.client.mutation(updateEntityMutation, { id, input });

    if (result.error) {
      throw GraphQLError.fromCombinedError(result.error);
    }

    const data = result.data?.entityUpdate;
    if (data?.errors?.length) {
      throw new ValidationError(
        `Failed to update entity: ${data.errors.map(e => e.message).join(", ")}`
      );
    }

    return data!.entity!;
  }

  async deleteEntity(id: string): Promise<void> {
    const result = await this.client.mutation(deleteEntityMutation, { id });

    if (result.error) {
      throw GraphQLError.fromCombinedError(result.error);
    }

    const data = result.data?.entityDelete;
    if (data?.errors?.length) {
      throw new ValidationError(
        `Failed to delete entity: ${data.errors.map(e => e.message).join(", ")}`
      );
    }
  }
}
```

## Service Pattern

### Service Implementation

```typescript
import type { EntityOperations } from "./repository";
import type { Logger } from "@/lib/logger";
import { entitySchema, type EntityConfig } from "@/modules/config/schema";

export class EntityService {
  constructor(
    private repository: EntityOperations,
    private logger: Logger
  ) {}

  async getEntities(): Promise<Entity[]> {
    this.logger.debug("Fetching all entities");
    return this.repository.getEntities();
  }

  async getEntityBySlug(slug: string): Promise<Entity> {
    this.logger.debug(`Fetching entity: ${slug}`);

    const entity = await this.repository.getEntityBySlug(slug);

    if (!entity) {
      throw new NotFoundError(`Entity not found: ${slug}`);
    }

    return entity;
  }

  async createEntity(config: EntityConfig): Promise<Entity> {
    // Validate input
    const input = entitySchema.parse(config);

    this.logger.info(`Creating entity: ${input.name}`);

    // Check for duplicates
    const existing = await this.repository.getEntityBySlug(input.slug);
    if (existing) {
      throw new ConflictError(`Entity already exists: ${input.slug}`);
    }

    const entity = await this.repository.createEntity(input);

    this.logger.info(`Created entity: ${entity.id}`);

    return entity;
  }

  async createEntities(configs: EntityConfig[]): Promise<BulkResult> {
    // Validate all inputs
    const validated = configs.map(c => entitySchema.parse(c));

    this.logger.info(`Creating ${validated.length} entities`);

    const result = await this.repository.bulkCreateEntities(validated);

    this.logger.info(
      `Bulk create: ${result.successful.length} created, ${result.failed.length} failed`
    );

    return result;
  }

  async syncEntities(
    localConfigs: EntityConfig[],
    remoteEntities: Entity[]
  ): Promise<SyncResult> {
    const toCreate: EntityConfig[] = [];
    const toUpdate: Array<{ id: string; config: EntityConfig }> = [];

    // Build remote lookup
    const remoteBySlug = new Map(remoteEntities.map(e => [e.slug, e]));

    // Determine actions
    for (const config of localConfigs) {
      const validated = entitySchema.parse(config);
      const existing = remoteBySlug.get(validated.slug);

      if (!existing) {
        toCreate.push(validated);
      } else if (this.hasChanges(existing, validated)) {
        toUpdate.push({ id: existing.id, config: validated });
      }
    }

    // Execute
    const createResult = toCreate.length > 0
      ? await this.createEntities(toCreate)
      : { successful: [], failed: [] };

    const updateResult = await this.updateEntities(toUpdate);

    return {
      created: createResult.successful,
      updated: updateResult.successful,
      failed: [...createResult.failed, ...updateResult.failed],
    };
  }

  private hasChanges(existing: Entity, config: EntityInput): boolean {
    return existing.name !== config.name || existing.isActive !== config.isActive;
  }
}
```

## Error Handling

### Error Types

```typescript
// Base error
export class BaseError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// GraphQL errors (network, query errors)
export class GraphQLError extends BaseError {
  constructor(message: string, public originalError?: unknown) {
    super(message, "GRAPHQL_ERROR");
  }

  static fromCombinedError(error: CombinedError): GraphQLError {
    const messages = error.graphQLErrors?.map(e => e.message).join(", ");
    return new GraphQLError(
      messages || error.message || "GraphQL operation failed",
      error
    );
  }
}

// Validation errors (schema, mutation errors)
export class ValidationError extends BaseError {
  constructor(message: string, public errors?: FieldError[]) {
    super(message, "VALIDATION_ERROR");
  }
}

// Not found
export class NotFoundError extends BaseError {
  constructor(message: string) {
    super(message, "NOT_FOUND");
  }
}

// Conflict (duplicate)
export class ConflictError extends BaseError {
  constructor(message: string) {
    super(message, "CONFLICT");
  }
}
```

### Error Handling Pattern

```typescript
// In service
async createEntity(config: EntityConfig): Promise<Entity> {
  try {
    const input = entitySchema.parse(config);
    return await this.repository.createEntity(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        `Invalid entity config: ${formatZodError(error)}`
      );
    }
    throw error;
  }
}
```

## Dependency Injection

### Factory Function

```typescript
// src/modules/<entity>/index.ts
import { createClient } from "@/lib/graphql/client";
import { EntityRepository } from "./repository";
import { EntityService } from "./service";
import { createLogger } from "@/lib/logger";

export function createEntityService(token: string, url: string): EntityService {
  const client = createClient(token, url);
  const repository = new EntityRepository(client);
  const logger = createLogger("EntityService");

  return new EntityService(repository, logger);
}

// Export types
export type { EntityOperations } from "./repository";
export { EntityService } from "./service";
```

### Testing with DI

```typescript
describe("EntityService", () => {
  const mockRepository: EntityOperations = {
    getEntities: vi.fn(),
    getEntityBySlug: vi.fn(),
    createEntity: vi.fn(),
    updateEntity: vi.fn(),
    deleteEntity: vi.fn(),
    bulkCreateEntities: vi.fn(),
  };

  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  const service = new EntityService(mockRepository, mockLogger);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates entity with validation", async () => {
    const config = { name: "Test", slug: "test" };
    const expected = { id: "1", ...config };

    vi.mocked(mockRepository.getEntityBySlug).mockResolvedValue(null);
    vi.mocked(mockRepository.createEntity).mockResolvedValue(expected);

    const result = await service.createEntity(config);

    expect(result).toEqual(expected);
    expect(mockRepository.createEntity).toHaveBeenCalledWith(config);
  });

  it("throws on duplicate", async () => {
    const config = { name: "Test", slug: "test" };

    vi.mocked(mockRepository.getEntityBySlug).mockResolvedValue({ id: "1", ...config });

    await expect(service.createEntity(config)).rejects.toThrow(ConflictError);
  });
});
```

## File Structure

```
src/modules/<entity>/
├── operations.ts           # GraphQL queries/mutations
├── repository.ts           # EntityRepository class
├── service.ts              # EntityService class
├── types.ts                # Entity-specific types
├── index.ts                # Exports + factory
├── service.test.ts         # Service unit tests
└── repository.test.ts      # Repository integration tests
```
