# Data Model: Variant Selector Attribute Configuration

**Date**: 2026-01-19
**Feature**: 001-variant-selector-attr

## Overview

This document defines the data model changes required to support the `variantSelection` property on variant attributes within product types.

---

## Entity: VariantAttribute (Extended)

### Schema Changes

The existing attribute schema is extended with an optional `variantSelection` boolean property.

```typescript
// Extension to existing attribute schema
interface VariantAttributeWithSelection {
  // Existing fields from simpleAttributeSchema/referencedAttributeSchema
  name: string;
  slug?: string;
  inputType: AttributeInputType;
  // ... other existing fields

  // NEW: Variant selection flag
  variantSelection?: boolean;  // Only meaningful for variant attributes
}
```

### Field Definitions

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `variantSelection` | `boolean` | No | `false` | When `true`, this attribute will be used for variant selection in storefronts |

### Validation Rules

1. **Input Type Constraint**: `variantSelection: true` is only valid for attributes with `inputType` in:
   - `DROPDOWN`
   - `BOOLEAN`
   - `SWATCH`
   - `NUMERIC`

2. **Context Constraint**: The `variantSelection` property is only meaningful on variant attributes (inside `productType.variantAttributes`), not product attributes.

3. **Default Behavior**: When `variantSelection` is omitted or `false`, the attribute will NOT be used for variant selection.

---

## Entity: ProductType (Unchanged)

The ProductType entity structure remains unchanged. The `variantAttributes` array now accepts attributes with the optional `variantSelection` property.

```typescript
interface ProductType {
  name: string;
  slug?: string;
  kind?: "NORMAL" | "GIFT_CARD";
  isShippingRequired?: boolean;
  isDigital?: boolean;
  weight?: string;
  taxClass?: string;
  productAttributes?: Attribute[];
  variantAttributes?: VariantAttributeWithSelection[];  // Now supports variantSelection
}
```

---

## Entity: AssignedVariantAttribute (GraphQL Response)

This is the shape returned by Saleor's GraphQL API when introspecting variant attributes.

```graphql
type AssignedVariantAttribute {
  attribute: Attribute!
  variantSelection: Boolean!
}
```

### Mapping: GraphQL → Config

```typescript
// Transform during introspection
const mapAssignedVariantAttribute = (assigned: AssignedVariantAttribute): VariantAttributeWithSelection => ({
  ...mapAttribute(assigned.attribute),
  // Only include variantSelection if true (omit when false for cleaner YAML)
  ...(assigned.variantSelection && { variantSelection: true }),
});
```

---

## Entity: ProductAttributeAssignInput (GraphQL Mutation)

This is the input shape for assigning attributes to product types.

```graphql
input ProductAttributeAssignInput {
  id: ID!
  type: ProductAttributeType!
  variantSelection: Boolean
}
```

### Mapping: Config → GraphQL

```typescript
// Transform during deployment
const mapToAssignInput = (attribute: ResolvedAttribute, type: "PRODUCT" | "VARIANT"): ProductAttributeAssignInput => ({
  id: attribute.id,
  type,
  // Only include variantSelection for VARIANT type when true
  ...(type === "VARIANT" && attribute.variantSelection && { variantSelection: true }),
});
```

---

## State Transitions

### Attribute Assignment States

```
┌─────────────────────────────────────────────────────────────────┐
│                    Variant Attribute States                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐    deploy with     ┌──────────────────┐      │
│   │   Not Used   │   variantSelection │  Variant Selector │      │
│   │ for Selection│ ────────────────── │     Enabled       │      │
│   └──────────────┘       true         └──────────────────┘      │
│          ▲                                     │                 │
│          │                                     │                 │
│          │      remove variantSelection        │                 │
│          │         or set to false             │                 │
│          └─────────────────────────────────────┘                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Valid State Transitions

| From | To | Trigger |
|------|----|---------|
| Not Assigned | Selector Enabled | Deploy with `variantSelection: true` |
| Not Assigned | Not Used | Deploy without variantSelection |
| Not Used | Selector Enabled | Update to `variantSelection: true` |
| Selector Enabled | Not Used | Remove variantSelection property |

---

## Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                        Saleor Config                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ProductType (1)                                                │
│       │                                                          │
│       ├──── productAttributes (0..*)                             │
│       │         └── Attribute                                    │
│       │              (variantSelection NOT applicable)           │
│       │                                                          │
│       └──── variantAttributes (0..*)                             │
│                 └── Attribute                                    │
│                      └── variantSelection?: boolean              │
│                          (only on supported inputTypes)          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Zod Schema Definition

```typescript
// New: Variant selection validation constant
const VARIANT_SELECTION_SUPPORTED_TYPES = [
  'DROPDOWN',
  'BOOLEAN',
  'SWATCH',
  'NUMERIC'
] as const;

// Extension to simpleAttributeSchema (conceptual)
const variantAttributeExtension = z.object({
  variantSelection: z.boolean().optional(),
});

// Combined schema for variant attributes
const variantAttributeSchema = simpleAttributeSchema.extend(variantAttributeExtension);

// Validation refinement
const validatedVariantAttributeSchema = variantAttributeSchema.refine(
  (attr) => {
    if (attr.variantSelection && !VARIANT_SELECTION_SUPPORTED_TYPES.includes(attr.inputType)) {
      return false;
    }
    return true;
  },
  {
    message: `variantSelection is only supported for input types: ${VARIANT_SELECTION_SUPPORTED_TYPES.join(', ')}`,
  }
);
```

---

## YAML Representation

### With Variant Selection Enabled

```yaml
productTypes:
  - name: Apparel
    variantAttributes:
      - name: Size
        inputType: DROPDOWN
        variantSelection: true
        values:
          - name: Small
          - name: Medium
          - name: Large
      - name: Color
        inputType: SWATCH
        variantSelection: true
        values:
          - name: Red
            value: "#FF0000"
          - name: Blue
            value: "#0000FF"
```

### Without Variant Selection (Default)

```yaml
productTypes:
  - name: Apparel
    variantAttributes:
      - name: Material
        inputType: DROPDOWN
        # variantSelection omitted = false (not used for selection)
        values:
          - name: Cotton
          - name: Polyester
```

### Referenced Attribute with Variant Selection

```yaml
productTypes:
  - name: Apparel
    variantAttributes:
      - slug: size              # Reference existing attribute by slug
        variantSelection: true  # Enable variant selection
```

---

## Summary

| Entity | Change Type | Description |
|--------|-------------|-------------|
| VariantAttribute | Extended | Added optional `variantSelection: boolean` |
| ProductType | Unchanged | Structure unchanged, accepts extended attributes |
| AssignedVariantAttribute | Reference | GraphQL response type (no changes) |
| ProductAttributeAssignInput | Reference | GraphQL input type (no changes) |
