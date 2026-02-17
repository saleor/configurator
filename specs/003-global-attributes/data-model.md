# Data Model: Global Attributes Section

**Feature**: 003-global-attributes
**Date**: 2026-02-03

## Entities

### ProductAttribute (YAML Section)

Attributes of type `PRODUCT_TYPE` used by product types for product and variant attributes.

```typescript
// src/modules/config/schema/global-attributes.schema.ts
import { z } from 'zod';

const attributeValueSchema = z.object({
  name: z.string(),
});

// Base fields for all attribute types
const baseProductAttributeSchema = z.object({
  name: z.string().min(1).describe("Unique name within productAttributes section"),
});

// Discriminated union based on inputType
const dropdownProductAttributeSchema = baseProductAttributeSchema.extend({
  inputType: z.literal("DROPDOWN"),
  values: z.array(attributeValueSchema).min(1),
});

const multiselectProductAttributeSchema = baseProductAttributeSchema.extend({
  inputType: z.literal("MULTISELECT"),
  values: z.array(attributeValueSchema).min(1),
});

const swatchProductAttributeSchema = baseProductAttributeSchema.extend({
  inputType: z.literal("SWATCH"),
  values: z.array(attributeValueSchema).min(1),
});

const referenceProductAttributeSchema = baseProductAttributeSchema.extend({
  inputType: z.literal("REFERENCE"),
  entityType: z.enum(["PAGE", "PRODUCT", "PRODUCT_VARIANT"]),
});

const simpleProductAttributeSchema = baseProductAttributeSchema.extend({
  inputType: z.enum(["PLAIN_TEXT", "NUMERIC", "DATE", "BOOLEAN", "RICH_TEXT", "DATE_TIME", "FILE"]),
});

export const productAttributeSchema = z.discriminatedUnion("inputType", [
  dropdownProductAttributeSchema,
  multiselectProductAttributeSchema,
  swatchProductAttributeSchema,
  referenceProductAttributeSchema,
  simpleProductAttributeSchema,
]);

export type ProductAttribute = z.infer<typeof productAttributeSchema>;
```

**YAML Example**:
```yaml
productAttributes:
  - name: Publisher
    inputType: PLAIN_TEXT
  - name: Genre
    inputType: DROPDOWN
    values:
      - name: Fantasy
      - name: Science Fiction
  - name: Condition
    inputType: DROPDOWN
    values:
      - name: MINT
      - name: VG+
```

### ContentAttribute (YAML Section)

Attributes of type `PAGE_TYPE` used by model types for model attributes.

```typescript
// Same discriminated union structure as ProductAttribute
// Reuse the same base schemas, just with different semantic meaning

export const contentAttributeSchema = z.discriminatedUnion("inputType", [
  dropdownContentAttributeSchema,
  multiselectContentAttributeSchema,
  swatchContentAttributeSchema,
  referenceContentAttributeSchema,
  simpleContentAttributeSchema,
]);

export type ContentAttribute = z.infer<typeof contentAttributeSchema>;
```

**YAML Example**:
```yaml
contentAttributes:
  - name: Author
    inputType: PLAIN_TEXT
  - name: Scent Family
    inputType: DROPDOWN
    values:
      - name: Citrus
      - name: Woody
      - name: Floral
```

### AttributeReference (Existing, Unchanged)

Reference pattern used in productTypes and modelTypes.

```typescript
// src/modules/config/schema/attribute.schema.ts (existing)
export const referencedAttributeSchema = z.object({
  attribute: z.string(),
  variantSelection: z.boolean().optional(),
});
```

**YAML Example**:
```yaml
productTypes:
  - name: Board Game
    productAttributes:
      - attribute: Publisher      # Reference to productAttributes
      - attribute: Genre
    variantAttributes:
      - attribute: Condition
```

### AttributeCache (Runtime)

In-memory cache for attribute metadata during deployment.

```typescript
// src/modules/attribute/attribute-cache.ts

interface CachedAttribute {
  id: string;
  name: string;
  inputType: string;
  slug: string;
}

export class AttributeCache {
  private productAttributes = new Map<string, CachedAttribute>();
  private contentAttributes = new Map<string, CachedAttribute>();

  // Populate from API response after create/update
  populateProductAttributes(attrs: CachedAttribute[]): void;
  populateContentAttributes(attrs: CachedAttribute[]): void;

  // Lookup methods
  getProductAttribute(name: string): CachedAttribute | undefined;
  getContentAttribute(name: string): CachedAttribute | undefined;
  hasProductAttribute(name: string): boolean;
  hasContentAttribute(name: string): boolean;

  // For validation: check if attribute exists in wrong section
  findAttributeInWrongSection(
    name: string,
    expectedSection: 'product' | 'content'
  ): { found: boolean; actualSection?: 'product' | 'content' };
}
```

## Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                        config.yml                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  productAttributes:        contentAttributes:                    │
│  ┌──────────────────┐     ┌──────────────────┐                  │
│  │ - name: Publisher│     │ - name: Author   │                  │
│  │ - name: Genre    │     │ - name: Scent... │                  │
│  │ - name: Condition│     └──────────────────┘                  │
│  └────────┬─────────┘              │                            │
│           │                        │                            │
│           │ REFERENCES             │ REFERENCES                 │
│           ▼                        ▼                            │
│  productTypes:              modelTypes:                         │
│  ┌──────────────────┐     ┌──────────────────┐                  │
│  │ - name: Board Gm │     │ - name: Scent... │                  │
│  │   productAttr:   │     │   attributes:    │                  │
│  │    - attr: Pub.. │────▶│    - attr: Au.. │────▶              │
│  │    - attr: Genre │     │    - attr: Sc.. │                   │
│  │   variantAttr:   │     └──────────────────┘                  │
│  │    - attr: Cond. │                                           │
│  └──────────────────┘                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Deployment Flow:
================
1. attributesStage:
   - Process productAttributes → Create in Saleor → Cache results
   - Process contentAttributes → Create in Saleor → Cache results

2. productTypesStage:
   - For each { attribute: "Name" } reference
   - Lookup in AttributeCache.getProductAttribute(name)
   - Use cached ID for assignment

3. modelTypesStage:
   - For each { attribute: "Name" } reference
   - Lookup in AttributeCache.getContentAttribute(name)
   - Use cached ID for assignment
```

## Validation Rules

### Rule 1: No Inline Definitions

**Scope**: productTypes, modelTypes
**Validation**: At config load time (preflight)

```typescript
function validateNoInlineDefinitions(config: SaleorConfig): void {
  const errors: ValidationError[] = [];

  for (const pt of config.productTypes ?? []) {
    const inlineAttrs = [...(pt.productAttributes ?? []), ...(pt.variantAttributes ?? [])]
      .filter(attr => !isReferencedAttribute(attr));

    if (inlineAttrs.length > 0) {
      errors.push(new InlineAttributeError(
        'productTypes',
        pt.name,
        inlineAttrs.map(a => a.name)
      ));
    }
  }

  // Same for modelTypes...

  if (errors.length > 0) {
    throw new AggregateValidationError(errors);
  }
}
```

### Rule 2: Reference Resolution

**Scope**: productTypes references → productAttributes
**Validation**: During productTypesStage

```typescript
function validateAttributeReference(
  attrName: string,
  cache: AttributeCache,
  productTypeName: string
): CachedAttribute {
  // Check correct section first
  const attr = cache.getProductAttribute(attrName);
  if (attr) return attr;

  // Check wrong section for better error message
  const wrongSection = cache.findAttributeInWrongSection(attrName, 'product');
  if (wrongSection.found) {
    throw new WrongAttributeTypeError(
      attrName,
      wrongSection.actualSection!,
      'productAttributes',
      productTypeName
    );
  }

  // Not found anywhere
  throw new AttributeNotFoundError(attrName, 'productAttributes', productTypeName);
}
```

### Rule 3: Dropdown Attributes Must Have Values

**Scope**: productAttributes, contentAttributes
**Validation**: At schema level (Zod)

```typescript
const dropdownAttributeSchema = z.object({
  inputType: z.literal("DROPDOWN"),
  values: z.array(attributeValueSchema).min(1, "Dropdown attributes must have at least one value"),
});
```

## State Transitions

### Attribute Lifecycle During Deploy

```
                                    ┌──────────────┐
                                    │  NOT EXISTS  │
                                    └──────┬───────┘
                                           │
                            attributesStage (create)
                                           │
                                           ▼
┌──────────────┐     attributesStage    ┌──────────────┐
│   EXISTS     │◀──────(update)─────────│   CREATED    │
│  (in Saleor) │                        │  (in Saleor) │
└──────────────┘                        └──────────────┘
       │                                       │
       │                                       │
       └───────────────┬───────────────────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  CACHED          │
              │  (AttributeCache)│
              └────────┬─────────┘
                       │
        productTypesStage / modelTypesStage
              (resolve reference)
                       │
                       ▼
              ┌──────────────────┐
              │  ASSIGNED        │
              │  (to entity type)│
              └──────────────────┘
```

## Migration Path

### From Old Format

```yaml
# OLD (will fail validation)
attributes:
  - name: Publisher
    inputType: PLAIN_TEXT
    type: PRODUCT_TYPE
  - name: Author
    inputType: PLAIN_TEXT
    type: PAGE_TYPE

productTypes:
  - name: Book
    productAttributes:
      - name: Publisher      # Inline definition - ERROR
        inputType: PLAIN_TEXT
```

### To New Format

```yaml
# NEW (correct format)
productAttributes:
  - name: Publisher
    inputType: PLAIN_TEXT

contentAttributes:
  - name: Author
    inputType: PLAIN_TEXT

productTypes:
  - name: Book
    productAttributes:
      - attribute: Publisher  # Reference only
```

### Migration Steps

1. Run `saleor-configurator introspect` to generate correct format
2. OR manually:
   - Move PRODUCT_TYPE attributes to `productAttributes`
   - Move PAGE_TYPE attributes to `contentAttributes`
   - Remove `type` field from each attribute
   - Convert inline definitions to `{ attribute: "Name" }` references
   - Delete old `attributes` section
