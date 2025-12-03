# Testing with Zod Schemas

## Test Data Builders

```typescript
class CategoryTestBuilder {
  private data: Partial<z.infer<typeof CategorySchema>> = {};

  withName(name: string): this {
    this.data.name = name as EntityName;
    return this;
  }

  withSlug(slug: string): this {
    this.data.slug = slug as EntitySlug;
    return this;
  }

  withParent(parent: string): this {
    this.data.parent = parent as EntitySlug;
    return this;
  }

  build(): z.infer<typeof CategorySchema> {
    const defaults = {
      name: 'Test Category' as EntityName,
      slug: 'test-category' as EntitySlug,
      isVisible: true,
    };

    return CategorySchema.parse({ ...defaults, ...this.data });
  }
}

// Usage in tests
const category = new CategoryTestBuilder()
  .withName('Electronics')
  .withSlug('electronics')
  .build();
```

## Schema Validation Tests

```typescript
describe('CategorySchema', () => {
  it('should accept valid category', () => {
    const input = {
      name: 'Electronics',
      slug: 'electronics',
    };

    expect(() => CategorySchema.parse(input)).not.toThrow();
  });

  it('should reject invalid slug', () => {
    const input = {
      name: 'Electronics',
      slug: 'Invalid Slug!',  // Contains invalid chars
    };

    expect(() => CategorySchema.parse(input)).toThrow();
  });

  it('should apply defaults', () => {
    const result = CategorySchema.parse({
      name: 'Test',
      slug: 'test',
    });

    expect(result.isVisible).toBe(true);
  });
});
```

## Safe Parsing with Error Handling

```typescript
const validateInput = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): T => {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errorDetails = result.error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    throw new ValidationError(
      `Validation failed for ${context}`,
      errorDetails
    );
  }

  return result.data;
};

// Usage
const category = validateInput(CategorySchema, input, 'category');
```
