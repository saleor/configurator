---
paths:
  - src/modules/**/*.ts
  - src/core/diff/comparators/**/*.ts
alwaysApply: false
---

# Entity Development Patterns

## Before You Start

Before implementing Saleor entity features, invoke `understanding-saleor-domain` or `adding-entity-types` skills for comprehensive patterns.

## Entity Identification

Every entity has ONE identification strategy:

### Slug-Based Entities

| Entity | Identifier |
|--------|------------|
| Categories, Products, Collections | `slug` |
| Channels, Menus, Warehouses | `slug` |

```typescript
// Comparison and lookup by slug
const existing = await repository.findBySlug(entity.slug);
const isSame = local.slug === remote.slug;
```

### Name-Based Entities

| Entity | Identifier |
|--------|------------|
| ProductTypes, PageTypes | `name` |
| Attributes, TaxClasses, ShippingZones | `name` |

```typescript
// Comparison and lookup by name
const existing = await repository.findByName(entity.name);
const isSame = local.name === remote.name;
```

## Module Structure

Standard entity module layout:

```
src/modules/{entity}/
├── index.ts           # Public exports
├── {entity}-service.ts
├── repository.ts      # GraphQL operations
└── errors.ts          # Domain errors
```

## Service Pattern

```typescript
export class CategoryService {
  constructor(
    private readonly repository: CategoryRepository,
    private readonly validator: CategoryValidator,
    private readonly logger: Logger
  ) {}

  async bootstrap(input: CategoryInput): Promise<Category> {
    const existing = await this.repository.findBySlug(input.slug);

    if (existing) {
      return this.update(existing, input);
    }

    return this.create(input);
  }
}
```

## Comparator Pattern

```typescript
export class CategoryComparator {
  compare(local: Category[], remote: Category[]): DiffResult<Category>[] {
    const remoteBySlug = new Map(remote.map(r => [r.slug, r]));

    return local.map(localItem => {
      const remoteItem = remoteBySlug.get(localItem.slug);

      if (!remoteItem) return { action: 'create', local: localItem };
      if (this.isEqual(localItem, remoteItem)) return { action: 'unchanged' };
      return { action: 'update', local: localItem, remote: remoteItem };
    });
  }
}
```

## Deployment Order

Respect dependencies when deploying:

1. **First**: ProductTypes, PageTypes, Attributes (no dependencies)
2. **Then**: Categories (may depend on parent categories)
3. **Then**: Products (depend on ProductTypes, Categories)
4. **Finally**: Menus (may reference products)

## Validation Checkpoint

When adding/modifying entities:
- [ ] Correct identification strategy (slug vs name)
- [ ] Zod schema in `src/modules/config/schema/`
- [ ] Comparator in `src/core/diff/comparators/`
- [ ] Service with bootstrap method
- [ ] Tests for service and comparator

**Required Skills**: `understanding-saleor-domain`, `adding-entity-types` (invoke before implementation)
