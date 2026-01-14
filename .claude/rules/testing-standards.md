---
paths:
  - src/**/*.test.ts
  - src/**/*.integration.test.ts
  - src/test-helpers/**/*.ts
alwaysApply: false
---

# Testing Standards

## Before You Start

Before writing tests, invoke the `analyzing-test-coverage` skill for comprehensive patterns.

## Test Organization

```
src/modules/category/
├── category-service.ts
├── category-service.test.ts      # Unit tests
├── repository.ts
├── repository.test.ts            # Repository tests with MSW
└── category.integration.test.ts  # Integration tests
```

## Quick Reference

### Arrange-Act-Assert Pattern

```typescript
describe('CategoryService', () => {
  let service: CategoryService;
  let mockRepository: MockedObject<CategoryRepository>;

  beforeEach(() => {
    mockRepository = {
      findBySlug: vi.fn(),
      create: vi.fn(),
    };
    service = new CategoryService(mockRepository);
  });

  describe('createCategory', () => {
    it('should create category when slug is unique', async () => {
      // Arrange
      const input = createCategoryInput({ slug: 'electronics' });
      vi.mocked(mockRepository.findBySlug).mockResolvedValue(null);
      vi.mocked(mockRepository.create).mockResolvedValue(expectedCategory);

      // Act
      const result = await service.createCategory(input);

      // Assert
      expect(result.slug).toBe('electronics');
      expect(mockRepository.create).toHaveBeenCalledWith(input);
    });
  });
});
```

## Mock Patterns

### Service Mocks

```typescript
const mockService = {
  findBySlug: vi.fn(),
  create: vi.fn(),
} as MockedObject<CategoryService>;

vi.mocked(mockService.create).mockResolvedValue(expected);
```

### MSW for GraphQL

```typescript
import { graphql, HttpResponse } from 'msw';

export const categoryHandlers = [
  graphql.query('GetCategory', ({ variables }) => {
    return HttpResponse.json({
      data: { category: { id: '1', slug: variables.slug } }
    });
  }),
];
```

## Test Builders

Use builders for consistent test data:

```typescript
const category = new CategoryBuilder()
  .withSlug('electronics')
  .withName('Electronics')
  .build();
```

### Builder Pattern

```typescript
export class CategoryBuilder {
  private data: Partial<Category> = {
    id: 'cat-1',
    name: 'Default Category',
    slug: 'default-category',
  };

  withSlug(slug: string): this {
    this.data.slug = slug;
    return this;
  }

  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  build(): Category {
    return CategorySchema.parse(this.data);
  }
}
```

## Test Checklist

Before completing tests:
- [ ] Tests both success and error paths
- [ ] Mocks reset in `beforeEach` (`vi.clearAllMocks()`)
- [ ] Async operations properly awaited
- [ ] No implementation details tested (test behavior)
- [ ] Descriptive test names

## Running Tests

```bash
pnpm test                          # All tests
pnpm test src/modules/category     # Specific module
pnpm test -- --watch               # Watch mode
pnpm test -- --coverage            # With coverage
```

## Validation Checkpoint

After completing tests:
- [ ] All tests pass (`pnpm test`)
- [ ] Coverage adequate for new code
- [ ] Mocks are realistic
- [ ] Edge cases covered

**Required Skill**: `analyzing-test-coverage` (invoke before implementation)
