# Testing Reference

## Test Stack

- **Vitest** - Test runner and assertions
- **MSW** - Mock Service Worker for GraphQL mocking
- **vi** - Vitest mock utilities

## Test Organization

```
src/modules/<entity>/
├── service.test.ts           # Unit tests (mocked repository)
├── repository.test.ts        # Integration tests (MSW)
└── __fixtures__/
    └── test-data.ts          # Test data builders
```

## Test Builders Pattern

### Builder Implementation

```typescript
// test-data.ts
export const entityBuilder = () => {
  let data: Partial<Entity> = {
    id: "entity-1",
    name: "Default Entity",
    slug: "default-entity",
    isActive: true,
  };

  return {
    withId(id: string) {
      data.id = id;
      return this;
    },
    withName(name: string) {
      data.name = name;
      return this;
    },
    withSlug(slug: string) {
      data.slug = slug;
      return this;
    },
    inactive() {
      data.isActive = false;
      return this;
    },
    build(): Entity {
      return data as Entity;
    },
    buildInput(): EntityInput {
      const { id, ...input } = data;
      return input as EntityInput;
    },
  };
};

// Usage
const entity = entityBuilder()
  .withName("Test Product")
  .withSlug("test-product")
  .build();
```

### Multiple Entities

```typescript
export const createEntities = (count: number): Entity[] => {
  return Array.from({ length: count }, (_, i) =>
    entityBuilder()
      .withId(`entity-${i}`)
      .withName(`Entity ${i}`)
      .withSlug(`entity-${i}`)
      .build()
  );
};
```

## Unit Tests (Service Layer)

### Basic Structure

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EntityService } from "./service";
import type { EntityOperations } from "./repository";
import { entityBuilder } from "./__fixtures__/test-data";

describe("EntityService", () => {
  // Mock repository
  const mockRepository: EntityOperations = {
    getEntities: vi.fn(),
    getEntityBySlug: vi.fn(),
    createEntity: vi.fn(),
    updateEntity: vi.fn(),
    deleteEntity: vi.fn(),
    bulkCreateEntities: vi.fn(),
  };

  // Mock logger
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

  describe("getEntityBySlug", () => {
    it("returns entity when found", async () => {
      const expected = entityBuilder().withSlug("test").build();
      vi.mocked(mockRepository.getEntityBySlug).mockResolvedValue(expected);

      const result = await service.getEntityBySlug("test");

      expect(result).toEqual(expected);
      expect(mockRepository.getEntityBySlug).toHaveBeenCalledWith("test");
    });

    it("throws NotFoundError when entity not found", async () => {
      vi.mocked(mockRepository.getEntityBySlug).mockResolvedValue(null);

      await expect(service.getEntityBySlug("missing")).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("createEntity", () => {
    it("creates entity with valid input", async () => {
      const input = entityBuilder().buildInput();
      const expected = entityBuilder().build();

      vi.mocked(mockRepository.getEntityBySlug).mockResolvedValue(null);
      vi.mocked(mockRepository.createEntity).mockResolvedValue(expected);

      const result = await service.createEntity(input);

      expect(result).toEqual(expected);
      expect(mockRepository.createEntity).toHaveBeenCalledWith(input);
    });

    it("throws ConflictError on duplicate slug", async () => {
      const input = entityBuilder().buildInput();
      const existing = entityBuilder().build();

      vi.mocked(mockRepository.getEntityBySlug).mockResolvedValue(existing);

      await expect(service.createEntity(input)).rejects.toThrow(ConflictError);
      expect(mockRepository.createEntity).not.toHaveBeenCalled();
    });

    it("throws ValidationError on invalid input", async () => {
      const invalidInput = { name: "", slug: "invalid slug!" };

      await expect(service.createEntity(invalidInput as any)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe("createEntities (bulk)", () => {
    it("creates multiple entities", async () => {
      const inputs = [
        entityBuilder().withName("One").buildInput(),
        entityBuilder().withName("Two").buildInput(),
      ];

      vi.mocked(mockRepository.bulkCreateEntities).mockResolvedValue({
        successful: inputs.map((input, i) => ({ id: `${i}`, ...input })),
        failed: [],
      });

      const result = await service.createEntities(inputs);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });

    it("reports partial failures", async () => {
      const inputs = [
        entityBuilder().withName("Valid").buildInput(),
        entityBuilder().withName("Invalid").buildInput(),
      ];

      vi.mocked(mockRepository.bulkCreateEntities).mockResolvedValue({
        successful: [{ id: "1", ...inputs[0] }],
        failed: [{ input: inputs[1], errors: ["Duplicate slug"] }],
      });

      const result = await service.createEntities(inputs);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
    });
  });
});
```

## Integration Tests (Repository Layer with MSW)

### MSW Setup

```typescript
// setup.ts
import { setupServer } from "msw/node";
import { graphql, HttpResponse } from "msw";

export const server = setupServer();

// Start server before tests
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### GraphQL Handlers

```typescript
// handlers.ts
import { graphql, HttpResponse } from "msw";

export const handlers = {
  getEntities: (entities: Entity[]) =>
    graphql.query("GetEntities", () => {
      return HttpResponse.json({
        data: {
          entities: {
            edges: entities.map(e => ({ node: e })),
          },
        },
      });
    }),

  createEntity: (entity: Entity) =>
    graphql.mutation("CreateEntity", () => {
      return HttpResponse.json({
        data: {
          entityCreate: {
            entity,
            errors: [],
          },
        },
      });
    }),

  createEntityError: (errors: Array<{ field: string; message: string }>) =>
    graphql.mutation("CreateEntity", () => {
      return HttpResponse.json({
        data: {
          entityCreate: {
            entity: null,
            errors,
          },
        },
      });
    }),

  bulkCreateEntities: (results: BulkResult) =>
    graphql.mutation("BulkCreateEntities", () => {
      return HttpResponse.json({
        data: {
          entityBulkCreate: {
            count: results.successful.length,
            results: [
              ...results.successful.map(e => ({ entity: e, errors: [] })),
              ...results.failed.map(f => ({ entity: null, errors: f.errors })),
            ],
          },
        },
      });
    }),
};
```

### Repository Integration Test

```typescript
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { setupServer } from "msw/node";
import { EntityRepository } from "./repository";
import { createClient } from "@/lib/graphql/client";
import { handlers } from "./__fixtures__/handlers";
import { entityBuilder } from "./__fixtures__/test-data";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("EntityRepository", () => {
  const client = createClient("test-token", "http://localhost/graphql");
  const repository = new EntityRepository(client);

  describe("getEntities", () => {
    it("returns entities from API", async () => {
      const expected = [
        entityBuilder().withId("1").build(),
        entityBuilder().withId("2").build(),
      ];

      server.use(handlers.getEntities(expected));

      const result = await repository.getEntities();

      expect(result).toEqual(expected);
    });

    it("returns empty array when no entities", async () => {
      server.use(handlers.getEntities([]));

      const result = await repository.getEntities();

      expect(result).toEqual([]);
    });
  });

  describe("createEntity", () => {
    it("creates entity successfully", async () => {
      const expected = entityBuilder().build();

      server.use(handlers.createEntity(expected));

      const result = await repository.createEntity({
        name: expected.name,
        slug: expected.slug,
      });

      expect(result).toEqual(expected);
    });

    it("throws ValidationError on mutation errors", async () => {
      server.use(
        handlers.createEntityError([
          { field: "slug", message: "Already exists" },
        ])
      );

      await expect(
        repository.createEntity({ name: "Test", slug: "duplicate" })
      ).rejects.toThrow(ValidationError);
    });
  });
});
```

## Testing Patterns

### Arrange-Act-Assert

```typescript
it("creates entity with validation", async () => {
  // Arrange
  const input = entityBuilder().buildInput();
  const expected = entityBuilder().build();
  vi.mocked(mockRepository.createEntity).mockResolvedValue(expected);

  // Act
  const result = await service.createEntity(input);

  // Assert
  expect(result).toEqual(expected);
  expect(mockRepository.createEntity).toHaveBeenCalledWith(input);
});
```

### Testing Errors

```typescript
it("throws specific error type", async () => {
  vi.mocked(mockRepository.getEntityBySlug).mockResolvedValue(null);

  await expect(service.getEntityBySlug("missing")).rejects.toThrow(NotFoundError);
  await expect(service.getEntityBySlug("missing")).rejects.toThrow(
    /Entity not found/
  );
});
```

### Testing Async Operations

```typescript
it("handles concurrent operations", async () => {
  const inputs = createEntities(5).map(e => entityBuilder().buildInput());

  vi.mocked(mockRepository.bulkCreateEntities).mockResolvedValue({
    successful: inputs.map((input, i) => ({ id: `${i}`, ...input })),
    failed: [],
  });

  const result = await service.createEntities(inputs);

  expect(result.successful).toHaveLength(5);
});
```

## Commands

```bash
# Run all tests
pnpm test

# Run specific file
pnpm test -- --filter=entity-service

# Run with pattern
pnpm test -- --grep="creates entity"

# Run with coverage
pnpm test -- --coverage

# Watch mode
pnpm test -- --watch
```
