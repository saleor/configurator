# Research: Variant Selector Attribute Configuration

**Date**: 2026-01-19
**Feature**: 001-variant-selector-attr

## Executive Summary

This research documents findings for implementing variant selection attribute configuration. All technical unknowns have been resolved through codebase exploration and Saleor API schema analysis.

---

## Research Item 1: Saleor GraphQL API for Variant Selection

### Decision
Use existing `productAttributeAssign` mutation with `variantSelection: Boolean` parameter, and `productAttributeAssignmentUpdate` mutation for updating existing assignments.

### Rationale
- The GraphQL schema already supports `variantSelection` in `ProductAttributeAssignInput`
- The `assignedVariantAttributes` query field returns `variantSelection: Boolean!`
- No API changes needed - only need to use existing fields

### Findings

**ProductAttributeAssignInput** (schema.graphql:28104-28121):
```graphql
input ProductAttributeAssignInput {
  id: ID!
  type: ProductAttributeType!
  variantSelection: Boolean  # Optional, defaults to false
}
```

**AssignedVariantAttribute** (schema.graphql:8641-8651):
```graphql
type AssignedVariantAttribute {
  attribute: Attribute!
  variantSelection: Boolean!  # Always present in response
}
```

**Supported Input Types**: DROPDOWN, BOOLEAN, SWATCH, NUMERIC

### Alternatives Considered
- Custom mutation: Rejected - existing mutation supports the feature
- Separate update endpoint: Not needed - single mutation handles both create and update

---

## Research Item 2: Current Attribute Schema Patterns

### Decision
Extend `simpleAttributeSchema` discriminated union to include optional `variantSelection` boolean property that applies only to variant attributes.

### Rationale
- Follows existing pattern where properties are added to the base attribute schema
- Zod discriminated unions allow clean extension
- Optional property aligns with YAML convention (omit when false)

### Findings

**Current Schema Structure** (`src/modules/config/schema/attribute.schema.ts`):
- `simpleAttributeSchema`: Discriminated union based on `inputType`
- `attributeInputSchema`: Union of simple | referenced
- `FullAttribute`: Combines simpleAttributeSchema + `type` field

**Pattern for Adding Properties**:
```typescript
// Existing pattern for optional boolean properties
const productTypeSchema = z.object({
  // ...
  isShippingRequired: z.boolean().optional(),
});
```

### Alternatives Considered
- Add to referenced attributes only: Rejected - inline attributes also need it
- Create separate variant attribute schema: Over-engineering, adds complexity

---

## Research Item 3: Config Mapping Patterns

### Decision
Modify `mapProductTypes()` to preserve `variantSelection` from `assignedVariantAttributes` and include it in the mapped attribute objects.

### Rationale
- Current code extracts only `.attribute` from `AssignedVariantAttribute`, losing metadata
- Need to merge the `variantSelection` flag into the attribute definition
- Should omit property when `false` for cleaner YAML output

### Findings

**Current Code** (`src/modules/config/config-service.ts:230-234`):
```typescript
// CURRENT: Loses variantSelection metadata
edge.node.assignedVariantAttributes?.map((attribute) => attribute.attribute)
```

**Required Change**:
```typescript
// PROPOSED: Preserve variantSelection
edge.node.assignedVariantAttributes?.map((assigned) => ({
  ...assigned.attribute,
  variantSelection: assigned.variantSelection || undefined,  // Omit false
}))
```

### Alternatives Considered
- Separate mapping step: Adds complexity, single pass is cleaner
- Always include variantSelection: Rejected - per spec, omit when false

---

## Research Item 4: Diff Comparator Patterns

### Decision
Extend `compareAttributes()` in ProductTypeComparator to detect changes in the `variantSelection` property for variant attributes.

### Rationale
- Current comparator only checks attribute names (added/removed)
- Need property-level comparison for variantSelection
- Follows existing `compareEntityFields()` pattern for property changes

### Findings

**Current Implementation** (`src/core/diff/comparators/product-type-comparator.ts:142-172`):
- Uses name-based matching for attributes
- Only detects additions and removals
- Does not compare attribute-level properties

**Existing Property Comparison Pattern**:
```typescript
// From compareEntityFields() - pattern to follow
if (local.property !== remote.property) {
  changes.push({
    field: 'property',
    currentValue: remote.property,
    desiredValue: local.property,
    description: 'descriptive message'
  });
}
```

### Alternatives Considered
- Dedicated attribute comparator: Over-engineering for single property
- Hash-based comparison: Less readable diffs, harder to debug

---

## Research Item 5: Validation Requirements

### Decision
Add validation in ProductTypeService to ensure `variantSelection: true` is only set on supported input types (DROPDOWN, BOOLEAN, SWATCH, NUMERIC).

### Rationale
- Saleor API will reject invalid assignments, but we should fail fast with clear message
- Validation before mutation saves API round-trips
- Aligns with existing validation pattern for REFERENCE types

### Findings

**Existing Validation Pattern** (`src/modules/product-type/product-type-service.ts:249-276`):
```typescript
// Current validation for REFERENCE attributes
if (attribute.inputType === "REFERENCE" && !attribute.entityType) {
  throw new ProductTypeAttributeValidationError(...);
}
```

**Supported Types Constant**:
```typescript
const VARIANT_SELECTION_SUPPORTED_TYPES = ['DROPDOWN', 'BOOLEAN', 'SWATCH', 'NUMERIC'] as const;
```

### Alternatives Considered
- Rely on API validation: Worse UX, slower feedback
- Warning instead of error: Rejected - invalid config should fail early

---

## Research Item 6: Round-Trip Integrity

### Decision
Implement introspection to output `variantSelection: true` only when enabled, omitting the property entirely when `false` (matching Saleor's default).

### Rationale
- Per spec clarification: "Omit the property entirely (cleaner YAML, matches Saleor's default behavior)"
- Deploy must treat missing `variantSelection` as `false`
- Diff must treat missing field same as explicit `false`

### Findings

**YAML Output Strategy**:
```yaml
# When variantSelection is true:
variantAttributes:
  - name: Size
    inputType: DROPDOWN
    variantSelection: true

# When variantSelection is false (default):
variantAttributes:
  - name: Description
    inputType: PLAIN_TEXT
    # variantSelection omitted
```

**Equivalence Logic**:
- `variantSelection: true` ≠ `undefined`/`false`
- `variantSelection: false` = `undefined` (treated same)
- Diff shows no change between omitted and explicit `false`

### Alternatives Considered
- Always output variantSelection: Clutters YAML, violates spec
- Use null instead of omission: Less idiomatic YAML

---

## Summary of Resolved Items

| Unknown | Resolution |
|---------|------------|
| GraphQL API support | Confirmed - existing mutations support variantSelection |
| Schema extension pattern | Extend simpleAttributeSchema with optional boolean |
| Config mapping approach | Merge variantSelection into attribute during mapping |
| Diff detection method | Extend compareAttributes() with property comparison |
| Validation approach | Fail-fast validation before API calls |
| Round-trip integrity | Omit false values, treat missing as false |

All technical unknowns have been resolved. Ready to proceed to Phase 1: Design & Contracts.
