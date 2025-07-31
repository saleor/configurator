# Slug-Based Identification Migration Plan

## Issue Summary

The Saleor Configurator currently has inconsistent entity identification across different types:
- **Categories**: Uses slug fallback to name, but slug field is missing from schema
- **Channels**: Uses name for identification despite having slug in schema
- **Products**: Has slug in API but missing from schema
- **Page Types**: No slug in API - generates slug artificially from name
- **Product Types**: No slug in API - uses name

This causes duplicate detection issues when entities have the same name but different slugs.

## Root Cause Analysis

### 1. Schema Mismatches
```typescript
// Categories: API returns slug, but schema doesn't include it
const categoryCreateSchema = z.object({
  name: z.string().describe("Category.name"),
  // ❌ Missing: slug: z.string()
});

// Products: API returns slug, but schema doesn't include it  
const productSchema = z.object({
  name: z.string(),
  productType: z.string(),
  category: z.string(),
  // ❌ Missing: slug: z.string()
  // ...
});

// Channels: HAS slug in schema ✅
const channelCreateSchema = z.object({
  name: z.string(),
  slug: z.string(), // ✅ Has slug
  // ...
});
```

### 2. Comparator Inconsistencies
```typescript
// CategoryComparator: Tries to use slug (correct approach)
protected getEntityName(entity: CategoryEntity) {
  return entity.slug || entity.name; // But slug is undefined due to schema
}

// ChannelComparator: Uses name despite having slug available
protected getEntityName(entity: ChannelEntity): string {
  return entity.name; // Should use slug!
}
```

### 3. API Data Availability
- **Has Slug**: Categories, Channels, Products
- **No Slug**: Page Types, Product Types

## Implementation Plan

### Phase 1: Fix Schema Definitions

#### 1.1 Update Category Schema
```typescript
// src/modules/config/schema/schema.ts
const categoryCreateSchema = z.object({
  name: z.string().describe("Category.name"),
  slug: z.string().describe("Category.slug"), // ADD
});

const baseCategoryUpdateSchema = z.object({
  name: z.string().describe("Category.name"),
  slug: z.string().describe("Category.slug"), // ADD
});

// Also update Subcategory interface
interface Subcategory {
  readonly name: string;
  readonly slug: string; // Change from optional to required
  readonly subcategories?: readonly Subcategory[];
}
```

#### 1.2 Update Product Schema
```typescript
// src/modules/config/schema/schema.ts
const productSchema = z.object({
  name: z.string(),
  slug: z.string(), // ADD
  productType: z.string(),
  category: z.string(),
  // ...
});
```

#### 1.3 Keep PageType Schema As-Is
- Page Types don't have slugs in Saleor API
- Current approach of generating slug from name is acceptable
- No changes needed

### Phase 2: Update Comparators

#### 2.1 Fix Channel Comparator
```typescript
// src/core/diff/comparators/channel-comparator.ts
protected getEntityName(entity: ChannelEntity): string {
  if (!entity.slug || typeof entity.slug !== "string") {
    throw new EntityValidationError("Channel entity must have a valid slug");
  }
  return entity.slug; // Use slug instead of name
}
```

#### 2.2 Revert Category Comparator
```typescript
// src/core/diff/comparators/category-comparator.ts
// Change back from deduplicateEntities to validateUniqueNames
compare(
  local: readonly CategoryEntity[],
  remote: readonly CategoryEntity[]
): readonly import("../types").DiffResult[] {
  // Validate unique names (will use slug via getEntityName)
  this.validateUniqueNames(local);
  this.validateUniqueNames(remote);
  // ...
}
```

#### 2.3 Update Subcategory Comparison
```typescript
// src/core/diff/comparators/category-comparator.ts
private compareSubcategories(
  local: readonly Subcategory[],
  remote: readonly Subcategory[]
): DiffChange[] {
  // Use slug-based maps instead of name-based
  const localSubcatMap = new Map(local.map((subcat) => [
    subcat.slug || subcat.name, // Use slug with fallback
    subcat
  ]));
  const remoteSubcatMap = new Map(remote.map((subcat) => [
    subcat.slug || subcat.name, // Use slug with fallback
    subcat
  ]));
  // ...
}
```

### Phase 3: Update Config Service

#### 3.1 Remove Artificial Slug Generation for Page Types
```typescript
// src/modules/config/config-service.ts
private mapPageTypes(rawPageTypes: RawSaleorConfig["pageTypes"]) {
  return (
    rawPageTypes?.edges?.map((edge) => ({
      name: edge.node.name,
      // Remove: slug: edge.node.name.toLowerCase().replace(/\s+/g, "-"),
      attributes: this.mapAttributes(edge.node.attributes ?? [], "PAGE_TYPE"),
    })) ?? []
  );
}
```

### Phase 4: Add Product Comparator (Future)
- Currently products are not compared
- When implemented, should use slug for identification

### Phase 5: Testing & Validation

#### 5.1 Update All Tests
- Add slug fields to test data
- Ensure duplicate detection works with slugs
- Test fallback behavior where appropriate

#### 5.2 Integration Tests
- Test introspection with duplicate names but different slugs
- Test diff operation with slug-based identification
- Test deploy operation with proper entity matching

## Testing Plan

### 1. Unit Tests
```typescript
// Test duplicate categories with different slugs
it("should handle duplicate category names with different slugs", () => {
  const local = [{ name: "Accessories", slug: "accessories" }];
  const remote = [
    { name: "Accessories", slug: "accessories" },
    { name: "Accessories", slug: "accessories-2" }
  ];
  // Should detect 1 DELETE for accessories-2
});

// Test channel identification by slug
it("should identify channels by slug not name", () => {
  const local = [{ name: "Poland", slug: "pl" }];
  const remote = [{ name: "Polska", slug: "pl" }]; // Different name, same slug
  // Should detect name UPDATE, not CREATE/DELETE
});
```

### 2. Integration Tests
- Run full introspection and verify slugs are preserved
- Run diff and verify slug-based matching works
- Deploy configuration and verify correct entity updates

### 3. Manual Testing Checklist
- [ ] Introspect configuration with duplicate category names
- [ ] Verify no validation errors occur
- [ ] Run diff - should show correct changes based on slugs
- [ ] Deploy changes - should update correct entities
- [ ] Re-introspect - configuration should be stable

## Migration Notes

### Breaking Changes
- Channel identification will change from name to slug
- Existing diff results may change after migration
- Deploy operations will match entities differently

### Rollback Plan
1. Revert schema changes
2. Revert comparator changes
3. Re-add deduplication workaround if needed

## Summary

This migration will:
1. **Fix the root cause** of duplicate detection issues
2. **Standardize** entity identification across the codebase
3. **Use slugs** where available for unique identification
4. **Fall back to names** only when slugs don't exist in the API
5. **Improve reliability** of diff and deploy operations

The key principle: **Use the most stable unique identifier available** - slugs when they exist, names when they don't.