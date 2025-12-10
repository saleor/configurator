# Saleor Configurator - Testing Patterns

## Test Stack

- **Vitest** - Test runner
- **MSW** - GraphQL mocking
- **vi** - Mock utilities

## Test File Organization

```
src/modules/category/
├── service.ts
├── service.test.ts           # Unit tests
├── repository.ts
├── repository.test.ts        # Repository tests with MSW
└── category.integration.test.ts  # Integration tests
```

## Test Builder Pattern

Create type-safe test data with fluent builders:

```typescript
// src/test-helpers/category-builder.ts
export const categoryBuilder = () => ({
  _data: {
    name: 'Test Category',
    slug: 'test-category',
    description: undefined as string | undefined,
  },

  withName(name: string) {
    this._data.name = name;
    return this;
  },

  withSlug(slug: string) {
    this._data.slug = slug;
    return this;
  },

  withDescription(description: string) {
    this._data.description = description;
    return this;
  },

  build() {
    return CategorySchema.parse(this._data);
  },
});

// Usage
const category = categoryBuilder()
  .withName('Electronics')
  .withSlug('electronics')
  .build();
```

## Service Test Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('CategoryService', () => {
  // Declare mocks at suite level
  const mockRepository = {
    findAll: vi.fn(),
    bulkCreate: vi.fn(),
    bulkUpdate: vi.fn(),
  };

  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
  };

  let service: CategoryService;

  beforeEach(() => {
    vi.clearAllMocks(); // Always reset!
    service = new CategoryService(mockRepository, mockLogger);
  });

  describe('sync', () => {
    it('should create new categories', async () => {
      // Arrange
      const configs = [categoryBuilder().build()];
      mockRepository.findAll.mockResolvedValue([]);
      mockRepository.bulkCreate.mockResolvedValue({ successful: configs, failed: [] });

      // Act
      const result = await service.sync(configs);

      // Assert
      expect(result.created).toBe(1);
      expect(mockRepository.bulkCreate).toHaveBeenCalledWith(configs);
    });
  });
});
```

## MSW for GraphQL Mocking

```typescript
import { graphql, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Define handlers
const handlers = [
  graphql.query('GetCategories', () => {
    return HttpResponse.json({
      data: {
        categories: {
          edges: [
            { node: { id: 'cat-1', name: 'Electronics', slug: 'electronics' } },
          ],
        },
      },
    });
  }),

  graphql.mutation('BulkCreateCategories', ({ variables }) => {
    return HttpResponse.json({
      data: {
        categoryBulkCreate: {
          results: variables.inputs.map((input, i) => ({
            category: { id: `new-${i}`, ...input },
          })),
          errors: [],
        },
      },
    });
  }),
];

// Setup server
const server = setupServer(...handlers);

describe('CategoryRepository', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('should fetch categories', async () => {
    const repository = new CategoryRepository(testClient);
    const categories = await repository.findAll();

    expect(categories).toHaveLength(1);
    expect(categories[0].slug).toBe('electronics');
  });

  it('should handle errors', async () => {
    // Override handler for this test
    server.use(
      graphql.query('GetCategories', () => {
        return HttpResponse.json({
          errors: [{ message: 'Network error' }],
        });
      })
    );

    const repository = new CategoryRepository(testClient);
    await expect(repository.findAll()).rejects.toThrow(GraphQLError);
  });
});
```

## Running Tests

```bash
# All tests
pnpm test

# Specific file
pnpm test -- --filter=category-service

# Watch mode
pnpm test -- --watch

# With coverage
pnpm test -- --coverage
```

## Test Checklist

- [ ] Clear mock state in `beforeEach` with `vi.clearAllMocks()`
- [ ] Test both success and error paths
- [ ] Use typed mocks (not `any`)
- [ ] Follow Arrange-Act-Assert pattern
- [ ] Validate test data with Zod schemas in builders
- [ ] Use MSW for GraphQL integration tests
