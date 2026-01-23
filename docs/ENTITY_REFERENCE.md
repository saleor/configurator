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
| Pages | slug | ModelOperations | ModelService | ModelComparator | Content pages (internal: Models) |
| Products | slug | ProductOperations | ProductService | ProductComparator | Product catalog |
| ProductTypes | name | ProductTypeOperations | ProductTypeService | ProductTypeComparator | Product structure definitions |
| PageTypes | name | PageTypeOperations | PageTypeService | PageTypeComparator | Page structure definitions |
| TaxClasses | name | TaxOperations | TaxService | TaxClassComparator | Tax configurations |
| Warehouses | slug | WarehouseOperations | WarehouseService | WarehouseComparator | Inventory locations |
| ShippingZones | name | ShippingZoneOperations | ShippingZoneService | ShippingZoneComparator | Shipping configurations |
| Attributes | name | AttributeRepository | AttributeService | AttributesComparator | Reusable attributes |
| Configuration | internal | ConfigurationRepository | ConfigurationService | — | Full config orchestration |

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

### Content Page Entities

The content page system has three related concepts:

| Concept | Identifier | Purpose |
|---------|------------|---------|
| **PageTypes** | name | Define structure and attributes for pages |
| **Pages** | slug | Actual content instances using a PageType |

**Configuration Example:**
```yaml
# First, define the page structure
pageTypes:
  - name: "Blog Post"
    attributes:
      - name: "Author"
        inputType: PLAIN_TEXT
      - name: "Published Date"
        inputType: DATE

# Then, create pages using that type
pages:
  - name: "Welcome Post"
    slug: "welcome-post"
    pageType: "Blog Post"  # References PageType by name
    content: "Welcome to our blog..."
```

> **Note:** Internally, Pages are called "Models" in the codebase. The CLI uses "pages" in config.yml for clarity.

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

## Attribute System

Attributes are reusable typed fields that can be assigned to Products (via ProductTypes) or Models (via PageTypes).

### Attribute Types

| inputType | Description | Required Fields | Example |
|-----------|-------------|-----------------|---------|
| `DROPDOWN` | Single-select from predefined values | `values` array | Color: Red, Blue, Green |
| `MULTISELECT` | Multi-select from predefined values | `values` array | Tags: Sale, New, Featured |
| `PLAIN_TEXT` | Unformatted text | none | Material: "100% Cotton" |
| `RICH_TEXT` | Formatted content blocks | none | Product description with HTML |
| `NUMERIC` | Numbers with optional units | none | Weight: 500, Dimensions |
| `BOOLEAN` | Yes/no values | none | Is Organic: true/false |
| `DATE` | Date values | none | Release Date: 2024-01-15 |
| `DATE_TIME` | Date and time values | none | Event Time: 2024-01-15T10:00:00 |
| `FILE` | File attachments | none | Product Manual (PDF) |
| `SWATCH` | Color codes or images | `values` array | Visual color picker |
| `REFERENCE` | Links to other entities | `entityType` | Related Products |

### REFERENCE Attribute Entity Types

REFERENCE attributes link entities together. The `entityType` field specifies what can be linked:

| entityType | Links To | Use Case |
|------------|----------|----------|
| `PAGE` | Models/Pages | Custom entities (Brands, Authors, Ingredients) |
| `PRODUCT` | Products | Related products, cross-sells, upsells |
| `PRODUCT_VARIANT` | Product Variants | Specific variant references |

**Example Configuration:**
```yaml
productTypes:
  - name: "Perfume"
    productAttributes:
      # Link to custom Models
      - name: "Scent Profiles"
        inputType: REFERENCE
        entityType: PAGE

      # Link to other Products
      - name: "Frequently Bought Together"
        inputType: REFERENCE
        entityType: PRODUCT

pageTypes:
  - name: "Author"
    attributes:
      # Link to Products the author wrote
      - name: "Books Written"
        inputType: REFERENCE
        entityType: PRODUCT

      # Link to other Authors (collaborators)
      - name: "Co-Authors"
        inputType: REFERENCE
        entityType: PAGE
```

### Attribute Reuse Pattern

Attributes can be reused across different ProductTypes or PageTypes:

```yaml
productTypes:
  # First type: defines the attribute
  - name: "Book"
    productAttributes:
      - name: "Author"
        inputType: PLAIN_TEXT
      - name: "Genre"
        inputType: DROPDOWN
        values:
          - name: "Fiction"
          - name: "Non-Fiction"

  # Second type: reuses existing attributes
  - name: "E-Book"
    productAttributes:
      - attribute: Author     # Reuses "Author" from Book
      - attribute: Genre      # Reuses "Genre" from Book
      - name: "File Format"   # New attribute specific to E-Books
        inputType: DROPDOWN
        values:
          - name: "PDF"
          - name: "EPUB"
```

### Models/Pages Terminology

> **Note**: Saleor documentation uses "Models" and "Model Types", but the GraphQL API still uses `pages` and `pageTypes`. The configurator supports both terms.

| Documentation Term | API/Config Term | Purpose |
|-------------------|-----------------|---------|
| Model Types | `pageTypes` | Define structure and attributes for custom entities |
| Models | `models` | Instances with specific attribute values |

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