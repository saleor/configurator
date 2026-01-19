# GraphQL Contracts: Variant Selector Attribute Configuration

**Date**: 2026-01-19
**Feature**: 001-variant-selector-attr

## Overview

This document defines the GraphQL operations required for the variant selection feature. All operations use existing Saleor GraphQL API capabilities - no schema changes required.

---

## Query: Introspect Variant Attributes

### Current GetConfig Query Enhancement

The existing `GetConfig` query needs to include the `variantSelection` field in the `assignedVariantAttributes` selection.

```graphql
query GetConfig {
  productTypes(first: 100) {
    edges {
      node {
        id
        name
        slug
        kind
        isShippingRequired
        isDigital
        weight {
          value
          unit
        }
        taxClass {
          name
        }
        productAttributes {
          id
          name
          slug
          type
          inputType
          # ... other attribute fields
        }
        assignedVariantAttributes {
          variantSelection    # <-- ADD THIS FIELD
          attribute {
            id
            name
            slug
            type
            inputType
            # ... other attribute fields
          }
        }
      }
    }
  }
}
```

### Response Shape

```typescript
interface GetConfigResponse {
  productTypes: {
    edges: Array<{
      node: {
        // ... other ProductType fields
        assignedVariantAttributes: Array<{
          variantSelection: boolean;  // Always present in response
          attribute: {
            id: string;
            name: string;
            slug: string;
            type: string;
            inputType: string;
            // ... other attribute fields
          };
        }>;
      };
    }>;
  };
}
```

---

## Mutation: Assign Attributes with Variant Selection

### productAttributeAssign

Used when assigning NEW variant attributes to a product type.

```graphql
mutation AssignAttributesToProductType(
  $productTypeId: ID!
  $operations: [ProductAttributeAssignInput!]!
) {
  productAttributeAssign(
    productTypeId: $productTypeId
    operations: $operations
  ) {
    productType {
      id
      assignedVariantAttributes {
        variantSelection
        attribute {
          id
          name
        }
      }
    }
    errors {
      field
      message
      code
    }
  }
}
```

### Input Type

```graphql
input ProductAttributeAssignInput {
  id: ID!                      # Attribute ID
  type: ProductAttributeType!  # PRODUCT or VARIANT
  variantSelection: Boolean    # Optional, defaults to false
}
```

### Example Variables

```json
{
  "productTypeId": "UHJvZHVjdFR5cGU6MQ==",
  "operations": [
    {
      "id": "QXR0cmlidXRlOjE=",
      "type": "VARIANT",
      "variantSelection": true
    },
    {
      "id": "QXR0cmlidXRlOjI=",
      "type": "VARIANT",
      "variantSelection": false
    }
  ]
}
```

---

## Mutation: Update Existing Attribute Assignment

### productAttributeAssignmentUpdate

Used when updating the `variantSelection` status of an EXISTING variant attribute assignment.

```graphql
mutation UpdateAttributeAssignment(
  $productTypeId: ID!
  $operations: [ProductAttributeAssignmentUpdateInput!]!
) {
  productAttributeAssignmentUpdate(
    productTypeId: $productTypeId
    operations: $operations
  ) {
    productType {
      id
      assignedVariantAttributes {
        variantSelection
        attribute {
          id
          name
        }
      }
    }
    errors {
      field
      message
      code
    }
  }
}
```

### Input Type

```graphql
input ProductAttributeAssignmentUpdateInput {
  id: ID!                      # Attribute ID
  variantSelection: Boolean!   # New value for variantSelection
}
```

### Example Variables

```json
{
  "productTypeId": "UHJvZHVjdFR5cGU6MQ==",
  "operations": [
    {
      "id": "QXR0cmlidXRlOjE=",
      "variantSelection": true
    }
  ]
}
```

---

## Error Handling

### Expected Error Codes

| Code | Scenario | Handling |
|------|----------|----------|
| `INVALID` | variantSelection on unsupported inputType | Validate locally before mutation |
| `NOT_FOUND` | Invalid attribute ID | Should not occur with proper ID resolution |
| `REQUIRED` | Missing required field | Validate input before mutation |

### Error Response Shape

```typescript
interface MutationError {
  field: string;
  message: string;
  code: string;
}
```

---

## Implementation Notes

### Repository Changes

**File**: `src/modules/config/repository.ts`

Add `variantSelection` to the GetConfig query fragment:

```typescript
// In the assignedVariantAttributes selection
assignedVariantAttributes {
  variantSelection  // ADD THIS
  attribute {
    id
    name
    // ... existing fields
  }
}
```

**File**: `src/modules/product-type/repository.ts`

Include `variantSelection` in the assign mutation input mapping:

```typescript
// In assignAttributesToProductType method
operations: attributes.map((attr) => ({
  id: attr.id,
  type,
  ...(type === 'VARIANT' && attr.variantSelection && { variantSelection: true }),
})),
```

### Existing Mutation Reference

The `productAttributeAssignmentUpdate` mutation may need to be added if it doesn't exist in the codebase. Check for existing implementation first.

---

## gql.tada Type Generation

After modifying the GraphQL queries, run:

```bash
pnpm fetch-schema
```

This will regenerate types based on the updated query selections.

---

## Test Fixtures

### Mock Response: Introspect with variantSelection

```typescript
const mockAssignedVariantAttributes = [
  {
    variantSelection: true,
    attribute: {
      id: 'attr-1',
      name: 'Size',
      slug: 'size',
      inputType: 'DROPDOWN',
    },
  },
  {
    variantSelection: false,
    attribute: {
      id: 'attr-2',
      name: 'Material',
      slug: 'material',
      inputType: 'DROPDOWN',
    },
  },
];
```

### Mock Response: Assign Mutation Success

```typescript
const mockAssignResponse = {
  productAttributeAssign: {
    productType: {
      id: 'pt-1',
      assignedVariantAttributes: [
        {
          variantSelection: true,
          attribute: { id: 'attr-1', name: 'Size' },
        },
      ],
    },
    errors: [],
  },
};
```
