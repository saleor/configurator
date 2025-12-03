# Test Data Builders

Builder patterns for creating validated test data.

## Schema-Based Builder Pattern

```typescript
// src/test-helpers/builders/category-builder.ts
import { CategorySchema, type CategoryInput } from '@/modules/config/schema';

export class CategoryTestBuilder {
  private data: Partial<CategoryInput> = {};

  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  withSlug(slug: string): this {
    this.data.slug = slug;
    return this;
  }

  withParent(parent: string): this {
    this.data.parent = parent;
    return this;
  }

  withDescription(description: string): this {
    this.data.description = description;
    return this;
  }

  build(): CategoryInput {
    const defaults: CategoryInput = {
      name: 'Test Category',
      slug: 'test-category',
    };

    // Validate against schema
    return CategorySchema.parse({ ...defaults, ...this.data });
  }
}

// Factory function
export const createValidCategory = (
  overrides: Partial<CategoryInput> = {}
): CategoryInput => {
  return new CategoryTestBuilder()
    .withName(overrides.name ?? 'Test Category')
    .withSlug(overrides.slug ?? 'test-category')
    .build();
};
```

## Config File Builder

```typescript
// src/test-helpers/config-file-builder.ts
export class ConfigFileBuilder {
  private config: ConfigFile = {
    shop: {},
    productTypes: [],
    categories: [],
    products: [],
  };

  withShop(shop: ShopConfig): this {
    this.config.shop = shop;
    return this;
  }

  withProductType(productType: ProductTypeConfig): this {
    this.config.productTypes.push(productType);
    return this;
  }

  withCategory(category: CategoryConfig): this {
    this.config.categories.push(category);
    return this;
  }

  build(): ConfigFile {
    return this.config;
  }

  toYaml(): string {
    return yaml.stringify(this.config);
  }
}
```

## Best Practices

- **Always validate with schemas** - Use Zod schemas in the `build()` method
- **Use factory functions** - Provide simple factory functions for common cases
- **Build fluent interfaces** - Chain methods for readable test setup
- **Provide sensible defaults** - Tests should work with minimal configuration
