# Entity Identification Reference

Complete reference for how entities are identified and matched in Saleor Configurator.

## Identification Strategy Matrix

| Entity | Strategy | Field | Uniqueness Scope | Case Sensitive |
|--------|----------|-------|------------------|----------------|
| Categories | slug | `slug` | Global | Yes |
| Channels | slug | `slug` | Global | Yes |
| Collections | slug | `slug` | Global | Yes |
| Menus | slug | `slug` | Global | Yes |
| Products | slug | `slug` | Global | Yes |
| Warehouses | slug | `slug` | Global | Yes |
| ProductTypes | name | `name` | Global | Yes |
| PageTypes | name | `name` | Global | Yes |
| TaxClasses | name | `name` | Global | Yes |
| ShippingZones | name | `name` | Global | Yes |
| Attributes | name | `name` | Global | Yes |
| Shop | singleton | N/A | Unique | N/A |

## Slug-Based Identification

### Rules for Slugs

1. **Format**: Lowercase alphanumeric with hyphens only
2. **Pattern**: `/^[a-z0-9-]+$/`
3. **Length**: 1-50 characters recommended
4. **Generation**: Often derived from name

### Slug Validation

```typescript
const EntitySlugSchema = z
  .string()
  .min(1, 'Slug is required')
  .max(50, 'Slug must be less than 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens');
```

### Slug Generation from Name

```typescript
const generateSlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// "iPhone 15 Pro" → "iphone-15-pro"
// "Summer Sale 2024!" → "summer-sale-2024"
```

## Name-Based Identification

### Rules for Names

1. **Format**: Any printable characters
2. **Length**: 1-100 characters recommended
3. **Uniqueness**: Must be unique within entity type

### Name Comparison

Names are compared **exactly** (case-sensitive):

```typescript
const isSameEntity = (local: ProductType, remote: ProductType) =>
  local.name === remote.name;

// "Product Type" !== "product type" (different!)
```

## Singleton Identification

The Shop entity is a singleton - only one exists per Saleor instance.

```typescript
// No identifier needed - always refers to THE shop
const shopConfig = await shopRepository.get();
await shopRepository.update(newConfig);
```

## Duplicate Detection

Before deployment, duplicates are detected:

```typescript
const validateNoDuplicateIdentifiers = <T extends { slug: string }>(
  entities: T[],
  entityType: string
): void => {
  const slugs = entities.map(e => e.slug);
  const duplicates = slugs.filter((slug, i) => slugs.indexOf(slug) !== i);

  if (duplicates.length > 0) {
    throw new DuplicateIdentifierError(
      `Duplicate ${entityType} slugs found: ${duplicates.join(', ')}`
    );
  }
};
```

## Cross-Reference Validation

When entities reference each other, references are validated:

```typescript
// Product references ProductType by name
const product = {
  name: "iPhone 15",
  productType: "Physical Product"  // Must exist!
};

// Validation during deployment
const productType = await productTypeRepository.findByName(product.productType);
if (!productType) {
  throw new EntityReferenceError(
    `ProductType "${product.productType}" not found for product "${product.name}"`
  );
}
```

## Identification in Comparators

Each comparator uses the appropriate identification strategy:

```typescript
// Category Comparator (slug-based)
const findMatchingRemote = (local: Category, remoteEntities: Category[]) =>
  remoteEntities.find(remote => remote.slug === local.slug);

// ProductType Comparator (name-based)
const findMatchingRemote = (local: ProductType, remoteEntities: ProductType[]) =>
  remoteEntities.find(remote => remote.name === local.name);
```

## Identification in Repositories

Repositories provide lookup methods based on identification strategy:

```typescript
// Slug-based repository
interface SlugBasedRepository<T> {
  findBySlug(slug: string): Promise<T | null>;
  existsBySlug(slug: string): Promise<boolean>;
}

// Name-based repository
interface NameBasedRepository<T> {
  findByName(name: string): Promise<T | null>;
  existsByName(name: string): Promise<boolean>;
}
```

## Migration Considerations

When migrating between Saleor instances:
- Slugs must remain consistent for URL preservation
- Names should match exactly for type mapping
- Singleton (Shop) settings may need adjustment per environment
