# Research: Global Attributes Section

**Feature**: 003-global-attributes
**Date**: 2026-02-03
**Status**: Complete

## Research Questions

### Q1: How are attributes currently resolved during deployment?

**Finding**: The `ProductTypeService.getExistingAttributesToAssign()` method resolves attribute references by querying the Saleor API:

```typescript
// src/modules/product-type/product-type-service.ts:175-235
const resolvedAttributes = await this.attributeService.repo.getAttributesByNames({
  names: referencedAttrNames,
  type: "PRODUCT_TYPE",
});
```

**Underlying GraphQL Query** (from `src/modules/attribute/repository.ts:162-188`):

```graphql
query GetAttributesByNames($names: [String!]!, $type: AttributeTypeEnum) {
  attributes(
    first: 100
    where: { name: { oneOf: $names }, type: { eq: $type } }
  ) {
    edges {
      node {
        id
        name
        type
        inputType
        entityType
        choices(first: 100) {
          edges {
            node { id, name, value }
          }
        }
      }
    }
  }
}
```

**Key insight**: Attributes are resolved by **name** + **type** filter. The `name` field is the unique identifier within each attribute type (PRODUCT_TYPE or PAGE_TYPE).

**Problem**: When product types are processed in parallel chunks, attributes referenced via `{ attribute: "Name" }` may not yet exist in Saleor because:
1. Attributes are defined inline in other product types within the same chunk
2. The `attributesStage` runs before `productTypesStage` but only handles top-level `config.attributes`
3. Inline attribute definitions in productTypes are NOT processed by attributesStage

**Decision**: Create global attribute sections that are processed BEFORE any entity that references them.

---

### Q2: What is the current deployment stage order?

**Finding**: From `src/core/deployment/stages.ts:595-614`, the 17-stage order is:

1. validationStage
2. shopSettingsStage
3. taxClassesStage
4. **attributesStage** ← Currently handles `config.attributes` (unassigned)
5. **productTypesStage** ← Resolves attribute references HERE
6. channelsStage
7. pageTypesStage
8. **modelTypesStage** ← Also resolves attribute references
9. categoriesStage
10. collectionsStage
11. menusStage
12. modelsStage
13. warehousesStage
14. shippingZonesStage
15. attributeChoicesPreflightStage
16. productsStage

**Decision**: Modify `attributesStage` to:
1. Process `productAttributes` section first (creates PRODUCT_TYPE attributes)
2. Process `contentAttributes` section second (creates PAGE_TYPE attributes)
3. Populate an in-memory cache with created/updated attribute metadata
4. Pass cache to subsequent stages via DeploymentContext

---

### Q3: How does introspection currently extract attributes?

**Finding**: From `src/modules/config/config-service.ts:269-310`:

```typescript
private mapAllAttributes(raw: RawSaleorConfig): FullAttribute[] {
  // Fetches ALL attributes from Saleor (both PRODUCT_TYPE and PAGE_TYPE)
  // Returns them as a unified array with `type` field distinguishing them
}
```

The current output structure:
```yaml
attributes:
  - name: Publisher
    inputType: PLAIN_TEXT
    type: PRODUCT_TYPE  # Type field embedded in each attribute
  - name: Author
    inputType: PLAIN_TEXT
    type: PAGE_TYPE
```

**Decision**: Modify introspection to split by type:
```yaml
productAttributes:
  - name: Publisher
    inputType: PLAIN_TEXT
    # No 'type' field needed - section implies it

contentAttributes:
  - name: Author
    inputType: PLAIN_TEXT
```

---

### Q4: How should attribute caching work?

**Finding**: The spec specifies "Cache after creation" strategy:
- `attributesStage` creates/updates attributes and caches results
- Subsequent stages use cache for reference resolution
- Avoids redundant API queries to Saleor

**Current pattern in codebase**: Services use constructor dependency injection. For example:
```typescript
// src/modules/product-type/product-type-service.ts
class ProductTypeService {
  constructor(
    readonly repo: ProductTypeOperations,
    private readonly attributeService: AttributeService,
    // ...
  )
}
```

**Decision**: Implement `AttributeCache` class:
```typescript
class AttributeCache {
  private productAttributes = new Map<string, AttributeMeta>();
  private contentAttributes = new Map<string, AttributeMeta>();

  populateFromCreatedAttributes(attrs: AttributeMeta[], type: 'PRODUCT_TYPE' | 'PAGE_TYPE'): void;
  getProductAttribute(name: string): AttributeMeta | undefined;
  getContentAttribute(name: string): AttributeMeta | undefined;
}
```

Pass via DeploymentContext to avoid modifying service constructors.

---

### Q5: What validation errors should be shown for inline definitions?

**Finding**: The spec requires hard migration with clear error messages:

> "Validation fails with a clear error explaining the new global format requirement"
> "Error includes specific instructions: Run `introspect` to generate YAML in the correct format"

**Current error pattern**: Uses `ValidationError` classes with suggestions:
```typescript
// src/lib/errors/validation-errors.ts
class ValidationError extends BaseError {
  getSuggestions(): string[] {
    return ['suggestion 1', 'suggestion 2'];
  }
}
```

**Decision**: Create `InlineAttributeError`:
```typescript
class InlineAttributeError extends ValidationError {
  constructor(
    entityType: 'productTypes' | 'modelTypes',
    entityName: string,
    inlineAttributes: string[]
  ) {
    super(
      `${entityType} "${entityName}" contains inline attribute definitions: ${inlineAttributes.join(', ')}. ` +
      `Inline definitions are no longer supported.`
    );
  }

  getSuggestions(): string[] {
    return [
      'Run `saleor-configurator introspect` to generate YAML in the correct format',
      'Move attribute definitions to the `productAttributes` or `contentAttributes` sections',
      'Use `{ attribute: "Name" }` references in productTypes/modelTypes'
    ];
  }
}
```

---

### Q6: How should diff output display the two attribute sections?

**Finding**: Current diff shows attributes grouped under "Attributes" entity type. The spec requires:
> "The attribute appears as an addition under 'Product Attributes'"

**Current comparator pattern** (from `deployment_pipeline_architecture` memory):
- Each entity type has its own comparator
- Comparators return `DiffResult` objects with `entityType` field

**Decision**:
1. Add two new entity types: `"Product Attributes"` and `"Content Attributes"`
2. Create separate comparator methods or extend existing `AttributeComparator`
3. Display in diff output:
```
Product Attributes:
  + Publisher (PLAIN_TEXT)
  ~ Genre (PLAIN_TEXT → DROPDOWN)

Content Attributes:
  + Author (PLAIN_TEXT)
```

---

### Q7: What happens to existing `config.attributes` section?

**Finding**: Current schema allows a unified `attributes` section for "unassigned attributes":
```typescript
// src/modules/config/schema/schema.ts:943-950
attributes: z
  .array(fullAttributeSchema)
  .optional()
  .describe("Unassigned attributes...")
```

**Decision**: Remove the unified `attributes` section entirely. The new structure is:
- `productAttributes` - PRODUCT_TYPE attributes (used by productTypes, products)
- `contentAttributes` - PAGE_TYPE attributes (used by modelTypes, models)

This is a **breaking change** requiring migration.

---

### Q8: How to detect wrong-type attribute references?

**Finding**: From spec scenario:
> "Given a product type referencing an attribute that exists in `contentAttributes` (wrong type)"
> "Then the error explains the attribute exists but is a content attribute, not a product attribute"

**Decision**: During validation in `ProductTypeService.getExistingAttributesToAssign()`:
1. First check if attribute exists in `productAttributes` cache
2. If not found, check if it exists in `contentAttributes` cache
3. If found in wrong section, throw specific error:
```typescript
throw new WrongAttributeTypeError(
  attributeName,
  'contentAttributes',  // where it was found
  'productAttributes',  // where it should be
  productTypeName
);
```

---

## Decisions Summary

| Question | Decision | Rationale |
|----------|----------|-----------|
| Attribute resolution | Use in-memory cache populated during attributesStage | Avoids API queries, ensures attributes exist before resolution |
| Deployment order | No change to stage order; modify attributesStage internals | Maintains compatibility, attributes already processed before productTypes |
| Introspection output | Split by type into two sections | Cleaner YAML, no redundant `type` field |
| Caching mechanism | `AttributeCache` class passed via `DeploymentContext` | Clean separation, no service constructor changes |
| Validation errors | `InlineAttributeError` with migration suggestions | User-friendly, actionable guidance |
| Diff display | Two entity types: "Product Attributes", "Content Attributes" | Clear categorization in output |
| Legacy `attributes` section | Remove entirely (breaking change) | Clean migration, no ambiguity |
| Wrong-type references | Check both caches, provide specific error | Helpful debugging for common mistakes |

## Alternatives Considered

### Alternative 1: Soft Migration (Rejected)

Support both inline and global formats during transition period.

**Why rejected**:
- Increases complexity significantly
- Delays addressing the root cause
- Users would encounter same errors until they migrate
- Spec explicitly states "Hard Migration"

### Alternative 2: Automatic Attribute Hoisting (Rejected)

Automatically extract inline attributes to global sections during deployment.

**Why rejected**:
- Modifies user's intent without explicit consent
- May create duplicate attributes
- Hard to handle conflicts between inline definitions
- Violates principle of least surprise

### Alternative 3: Sequential Chunk Processing (Rejected)

Process product types sequentially to ensure attributes are created before references.

**Why rejected**:
- Defeats purpose of parallel processing
- Performance regression
- Doesn't solve the fundamental data model issue

### Alternative 4: Keep Unified `attributes` Section (Rejected)

Keep single section but require `type` field to distinguish PRODUCT_TYPE vs PAGE_TYPE.

**Why rejected**:
- Less intuitive user experience
- Easy to make mistakes with type field
- Doesn't match Saleor Dashboard terminology ("Product Attribute" vs "Content Attribute")
- Spec explicitly requires separate sections

---

## Appendix: GraphQL Patterns for Attributes

Reference documentation for implementers showing current GraphQL operations used for attributes.

### A1: Attribute Resolution Query

Used by `ProductTypeService.getExistingAttributesToAssign()` to resolve `{ attribute: "Name" }` references.

**Location**: `src/modules/attribute/repository.ts:162-188`

```graphql
query GetAttributesByNames($names: [String!]!, $type: AttributeTypeEnum) {
  attributes(
    first: 100
    where: { name: { oneOf: $names }, type: { eq: $type } }
  ) {
    edges {
      node {
        id
        name
        type
        inputType
        entityType
        choices(first: 100) {
          edges {
            node { id, name, value }
          }
        }
      }
    }
  }
}
```

**Identifier used**: `name` (string) + `type` (enum: PRODUCT_TYPE | PAGE_TYPE)

**Cache key strategy**: Use `name` as Map key, separate maps for product vs content attributes.

---

### A2: Introspection Query (Attributes Fragment)

Used by `ConfigRepository` during `introspect` to fetch all attributes.

**Location**: `src/modules/config/repository.ts:319-340`

```graphql
attributes(first: 100) {
  edges {
    node {
      id
      name
      slug
      type           # PRODUCT_TYPE or PAGE_TYPE
      inputType      # DROPDOWN, PLAIN_TEXT, MULTISELECT, etc.
      entityType     # PAGE, PRODUCT, PRODUCT_VARIANT (for REFERENCE type)
      choices(first: 100) {
        pageInfo { endCursor hasNextPage }
        edges {
          node { id, name, value }
        }
      }
    }
  }
}
```

**Implementation note**: The `type` field determines which YAML section the attribute belongs to:
- `PRODUCT_TYPE` → `productAttributes`
- `PAGE_TYPE` → `contentAttributes`

---

### A3: Attribute Lookup by Name (Product Module)

Used by `ProductRepository.getAttributeByName()` for product-level operations.

**Location**: `src/modules/product/repository.ts:405-410`

```graphql
query GetAttributeByName($name: String!) {
  attributes(filter: { search: $name }, first: 100) {
    edges {
      node {
        id
        name
        slug
        inputType
        # ... additional fields
      }
    }
  }
}
```

**Note**: Uses `filter: { search: $name }` (substring match) rather than exact match. The repository code finds exact match among results:

```typescript
const exactMatch = result.data?.attributes?.edges?.find(
  (edge) => edge.node?.name === name
);
```

---

### A4: CachedAttribute Interface

Fields required for the AttributeCache (derived from GraphQL responses):

```typescript
interface CachedAttribute {
  id: string;       // Saleor ID (e.g., "QXR0cmlidXRlOjgz")
  name: string;     // Attribute name (e.g., "Publisher") - CACHE KEY
  slug: string;     // Auto-generated slug (e.g., "publisher")
  inputType: string; // Input type enum value
}
```

**Why these fields**: Minimal set needed for reference resolution:
- `id`: Required for GraphQL mutations (assign attribute to type)
- `name`: Cache lookup key (matches YAML reference)
- `slug`: May be needed for some API operations
- `inputType`: For validation (e.g., variantSelection only valid for certain types)
