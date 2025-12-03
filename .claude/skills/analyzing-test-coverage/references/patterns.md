# Test Patterns Reference

Detailed test pattern implementations for Vitest with MSW.

## Service Test Pattern

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CategoryService } from './category-service';

describe('CategoryService', () => {
  // Declare dependencies
  let categoryService: CategoryService;
  let mockValidator: EntityValidator<CategoryInput>;
  let mockRepository: EntityRepository<Category, CategoryInput>;
  let mockLogger: Logger;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Create mock implementations
    mockValidator = {
      validateInput: vi.fn(),
      validateUniqueness: vi.fn(),
    };

    mockRepository = {
      findBySlug: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    // Create service with mocks
    categoryService = new CategoryService(
      mockValidator,
      mockRepository,
      mockLogger
    );
  });

  describe('processEntity', () => {
    it('should successfully create category when input is valid', async () => {
      // Arrange
      const validInput = createValidCategory({
        name: 'Electronics',
        slug: 'electronics',
      });

      const expectedCategory: Category = {
        ...validInput,
        id: 'cat-1',
        createdAt: new Date(),
      };

      vi.mocked(mockValidator.validateInput).mockResolvedValue(validInput);
      vi.mocked(mockValidator.validateUniqueness).mockResolvedValue();
      vi.mocked(mockRepository.create).mockResolvedValue(expectedCategory);

      // Act
      const result = await categoryService.processEntity(validInput);

      // Assert
      expect(result).toEqual(expectedCategory);
      expect(mockValidator.validateInput).toHaveBeenCalledWith(validInput);
      expect(mockRepository.create).toHaveBeenCalledWith(validInput);
    });

    it('should throw EntityValidationError when input is invalid', async () => {
      // Arrange
      const invalidInput = { name: '' };
      const validationError = new EntityValidationError('Invalid input');

      vi.mocked(mockValidator.validateInput).mockRejectedValue(validationError);

      // Act & Assert
      await expect(
        categoryService.processEntity(invalidInput as CategoryInput)
      ).rejects.toThrow(EntityValidationError);

      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });
});
```

## Repository Test with MSW

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { graphql, HttpResponse } from 'msw';
import { CategoryRepository } from './repository';
import { createTestClient } from '@/test-helpers/graphql-mocks';

// Define handlers
const handlers = [
  graphql.query('GetCategories', () => {
    return HttpResponse.json({
      data: {
        categories: {
          edges: [
            {
              node: {
                id: 'cat-1',
                name: 'Electronics',
                slug: 'electronics',
              },
            },
          ],
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

  it('should fetch all categories', async () => {
    const client = createTestClient();
    const repository = new CategoryRepository(client);

    const categories = await repository.findAll();

    expect(categories).toHaveLength(1);
    expect(categories[0].slug).toBe('electronics');
  });

  it('should handle GraphQL errors', async () => {
    // Override handler for this test
    server.use(
      graphql.query('GetCategories', () => {
        return HttpResponse.json({
          errors: [{ message: 'Internal server error' }],
        });
      })
    );

    const client = createTestClient();
    const repository = new CategoryRepository(client);

    await expect(repository.findAll()).rejects.toThrow(GraphQLError);
  });
});
```

## Comparator Test Pattern

```typescript
import { describe, it, expect } from 'vitest';
import { compareCategories } from './category-comparator';

describe('CategoryComparator', () => {
  describe('compareCategories', () => {
    it('should detect new category to create', () => {
      const local = [
        { name: 'Electronics', slug: 'electronics' },
      ];
      const remote: Category[] = [];

      const result = compareCategories(local, remote);

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('create');
      expect(result[0].local?.slug).toBe('electronics');
    });

    it('should detect category to update', () => {
      const local = [
        { name: 'Electronics Updated', slug: 'electronics' },
      ];
      const remote = [
        { id: '1', name: 'Electronics', slug: 'electronics' },
      ];

      const result = compareCategories(local, remote);

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('update');
      expect(result[0].changes).toContainEqual({
        field: 'name',
        from: 'Electronics',
        to: 'Electronics Updated',
      });
    });

    it('should detect category to delete', () => {
      const local: Category[] = [];
      const remote = [
        { id: '1', name: 'Electronics', slug: 'electronics' },
      ];

      const result = compareCategories(local, remote);

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('delete');
    });

    it('should detect unchanged category', () => {
      const local = [
        { name: 'Electronics', slug: 'electronics' },
      ];
      const remote = [
        { id: '1', name: 'Electronics', slug: 'electronics' },
      ];

      const result = compareCategories(local, remote);

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('unchanged');
    });
  });
});
```

## Mock Function Patterns

### Simple Mocks

```typescript
// Simple mock
const mockFn = vi.fn();
mockFn.mockReturnValue('value');
mockFn.mockResolvedValue('async value');
mockFn.mockRejectedValue(new Error('error'));

// Typed mock
vi.mocked(mockRepository.findBySlug).mockResolvedValue(category);

// Implementation mock
vi.mocked(mockValidator.validateInput).mockImplementation(async (input) => {
  if (!input.name) {
    throw new ValidationError('Name required');
  }
  return input;
});
```

### Module Mocks

```typescript
// Mock entire module
vi.mock('@/lib/graphql/client', () => ({
  createClient: vi.fn(() => mockClient),
}));

// Partial mock (keep some real implementations)
vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual('@/lib/utils');
  return {
    ...actual,
    generateSlug: vi.fn(() => 'mocked-slug'),
  };
});
```
