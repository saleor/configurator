# Entity Reference Guide

Quick reference for all supported entities in the Saleor Configurator, their identification strategies, and implementation patterns.

## Quick Reference Table

| Entity | Identifier | Repository | Service | Comparator | Notes |
|--------|------------|------------|---------|------------|-------|
| Shop | singleton | ShopOperations | ShopService | ShopComparator | Global settings, single instance |
| Channels | slug | ChannelOperations | ChannelService | ChannelComparator | Sales channels with currency |
| Categories | slug | CategoryOperations | CategoryService | CategoryComparator | Hierarchical structure |
| Collections | slug | CollectionOperations | CollectionService | CollectionComparator | Product groupings |
| Menus | slug | MenuOperations | MenuService | MenuComparator | Navigation structures |
| Models/Pages | slug | ModelOperations | ModelService | ModelComparator | Content pages |
| Products | slug | ProductOperations | ProductService | ProductComparator | Product catalog |
| ProductTypes | name | ProductTypeOperations | ProductTypeService | ProductTypeComparator | Product type definitions |
| PageTypes | name | PageTypeOperations | PageTypeService | PageTypeComparator | Page type definitions |
| TaxClasses | name | TaxOperations | TaxService | TaxClassComparator | Tax configurations |
| Warehouses | slug | WarehouseOperations | WarehouseService | WarehouseComparator | Inventory locations |
| ShippingZones | name | ShippingZoneOperations | ShippingZoneService | ShippingZoneComparator | Shipping configurations |
| Attributes | name | AttributeOperations | AttributeService | - | Reusable attributes |

## Entity Identification Strategy

### Slug-Based Entities (Use `slug` for identification)
**Entities**: Categories, Channels, Collections, Menus, Models/Pages, Products, Warehouses

**Key Rules:**
- Primary identifier is `slug` field
- Slug must be unique within entity type
- Slug is required in schema definition
- Comparators use slug for entity matching

**Schema Pattern:**
```typescript
const entitySchema = z.object({
  name: z.string().describe("Entity.name"),
  slug: z.string().describe("Entity.slug"), // Required for identification
  // ... other fields
});
```

**Comparator Pattern:**
```typescript
protected getEntityName(entity: Entity): string {
  if (!entity.slug) {
    throw new EntityValidationError("Entity must have a valid slug");
  }
  return entity.slug;
}
```

### Name-Based Entities (Use `name` for identification)
**Entities**: ProductTypes, PageTypes, TaxClasses, ShippingZones, Attributes

**Key Rules:**
- Primary identifier is `name` field
- Name must be unique within entity type
- No slug available in Saleor API
- Comparators use name for entity matching

**Schema Pattern:**
```typescript
const entitySchema = z.object({
  name: z.string().describe("Entity.name"), // Required for identification
  // ... other fields (no slug)
});
```

**Comparator Pattern:**
```typescript
protected getEntityName(entity: Entity): string {
  if (!entity.name) {
    throw new EntityValidationError("Entity must have a valid name");
  }
  return entity.name;
}
```

### Singleton Entities
**Entities**: Shop

**Key Rules:**
- Single instance per Saleor instance
- No identifier needed for uniqueness
- Always update, never create/delete
- Special handling in deployment pipeline

## Implementation Requirements

### 1. Schema Definition
- **Slug entities**: MUST include slug as required field
- **Name entities**: MUST include name as required field  
- **Validation**: Use appropriate Zod validators
- **Documentation**: Include entity description in schema

### 2. Comparator Implementation
- **getEntityName()**: Return appropriate identifier (slug or name)
- **Error Handling**: Throw EntityValidationError for missing identifiers
- **Consistency**: Use same identifier strategy across all comparisons

### 3. Validation Requirements
- **Unique Identifiers**: Use `validateUniqueIdentifiers()` helper
- **Cross-References**: Validate entity references exist
- **Hierarchy**: Handle parent-child relationships for nested entities

### 4. Service Integration
- **Repository Pattern**: Each entity has dedicated repository
- **Error Wrapping**: Use ServiceErrorWrapper for consistent error handling
- **Dependency Injection**: Register in ServiceContainer
- **Bootstrap Operations**: Support bulk entity creation

## Cross-Entity Relationships

### Hierarchical Relationships
```
Categories (slug-based)
├── Subcategories (nested within parent)
└── Products reference category slugs

Menus (slug-based)  
├── Menu Items (nested structure)
└── Reference categories, collections, pages by slug
```

### Reference Relationships
```
Products → ProductType (by name)
Products → Category (by slug)
Collections → Products (by slug array)
Collections → Channels (by slug for listings)
Models/Pages → PageType (by name)
```

### Dependency Order
**Deployment must follow dependency order:**
1. **Independent**: Shop, Channels, ProductTypes, PageTypes, TaxClasses, ShippingZones
2. **Level 1**: Categories, Warehouses, Attributes  
3. **Level 2**: Collections, Models/Pages
4. **Level 3**: Products, Menus

## Common Patterns

### Entity Creation Pattern
```typescript
export class EntityService {
  async bootstrapEntities(entities: EntityInput[]): Promise<void> {
    for (const entity of entities) {
      await this.validateEntityInput(entity);
      const existing = await this.repository.getByIdentifier(
        this.getIdentifier(entity)
      );
      
      if (existing) {
        await this.updateEntity(entity, existing);
      } else {
        await this.createEntity(entity);
      }
    }
  }
  
  private getIdentifier(entity: EntityInput): string {
    // Return slug for slug-based entities, name for name-based
    return entity.slug || entity.name;
  }
}
```

### Validation Pattern
```typescript
validateUniqueIdentifiers(entities: EntityInput[]): void {
  const identifiers = new Set<string>();
  
  for (const entity of entities) {
    const id = this.getIdentifier(entity);
    
    if (identifiers.has(id)) {
      throw new EntityValidationError(
        `Duplicate identifier '${id}' found in entity configuration`
      );
    }
    
    identifiers.add(id);
  }
}
```

## Troubleshooting

### Common Issues

**Identifier Conflicts:**
- Same slug/name used for multiple entities
- Empty or undefined identifiers
- Case sensitivity issues

**Reference Errors:**
- Referenced entity doesn't exist
- Circular dependencies in hierarchies
- Cross-entity reference validation failures

**Schema Validation:**
- Missing required identifier fields
- Invalid identifier format
- Type mismatches in references

### Quick Fixes

**Check Entity Existence:**
```bash
# Verify entity exists in remote
pnpm dev introspect --url=$URL --token=$TOKEN --include=entityType
```

**Validate Configuration:**
```bash
# Check schema validation
pnpm dev deploy --url=$URL --token=$TOKEN --dry-run
```

**Debug Identifier Issues:**
```bash
# Enable debug logging
LOG_LEVEL=debug pnpm dev diff --url=$URL --token=$TOKEN --include=entityType
```

---

**Related Documentation:**
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Complete troubleshooting procedures
- [DEVELOPMENT_WORKFLOWS.md](DEVELOPMENT_WORKFLOWS.md) - Entity development workflows
- [ARCHITECTURE.md](ARCHITECTURE.md) - Service architecture details
- [CLAUDE.md](CLAUDE.md) - Main navigation hub