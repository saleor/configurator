# GraphQL Fragment Patterns

This reference documents fragment patterns for GraphQL operations with gql.tada.

## Why Use Fragments

- **DRY**: Avoid duplicating field selections across queries
- **Type Safety**: gql.tada infers fragment types automatically
- **Consistency**: Same fields selected everywhere
- **Maintainability**: Single place to update when schema changes

## Basic Fragment Usage

### Defining Fragments

```typescript
import { graphql } from 'gql.tada';

// Define reusable fragment
export const CategoryFieldsFragment = graphql(`
  fragment CategoryFields on Category {
    id
    name
    slug
    description
    level
  }
`);

// Define fragment with nested fields
export const CategoryWithParentFragment = graphql(`
  fragment CategoryWithParent on Category {
    id
    name
    slug
    parent {
      id
      slug
      name
    }
  }
`);
```

### Using Fragments in Queries

```typescript
// Pass fragment as second argument to graphql()
export const GetCategoriesQuery = graphql(`
  query GetCategories($first: Int!) {
    categories(first: $first) {
      edges {
        node {
          ...CategoryFields
        }
      }
    }
  }
`, [CategoryFieldsFragment]);

// Multiple fragments
export const GetCategoryDetailQuery = graphql(`
  query GetCategoryDetail($slug: String!) {
    category(slug: $slug) {
      ...CategoryFields
      ...CategoryWithParent
      children(first: 100) {
        edges {
          node {
            ...CategoryFields
          }
        }
      }
    }
  }
`, [CategoryFieldsFragment, CategoryWithParentFragment]);
```

## Fragment Composition

### Nested Fragments

Fragments can reference other fragments:

```typescript
export const AddressFragment = graphql(`
  fragment Address on Address {
    streetAddress1
    streetAddress2
    city
    postalCode
    country {
      code
      country
    }
  }
`);

export const WarehouseFragment = graphql(`
  fragment Warehouse on Warehouse {
    id
    name
    slug
    address {
      ...Address
    }
  }
`, [AddressFragment]);

// Use in query
export const GetWarehousesQuery = graphql(`
  query GetWarehouses($first: Int!) {
    warehouses(first: $first) {
      edges {
        node {
          ...Warehouse
        }
      }
    }
  }
`, [WarehouseFragment, AddressFragment]); // Include all fragments
```

### Conditional Fragments

Use inline fragments for union/interface types:

```typescript
export const GetAttributeValuesQuery = graphql(`
  query GetAttributeValues($id: ID!) {
    attribute(id: $id) {
      id
      name
      choices(first: 100) {
        edges {
          node {
            id
            name
            ... on AttributeValue {
              slug
              value
              file {
                url
              }
            }
          }
        }
      }
    }
  }
`);
```

## Type Inference

### FragmentOf Helper

Use `FragmentOf` to get the TypeScript type of a fragment:

```typescript
import { FragmentOf, readFragment } from 'gql.tada';

// Get the type of the fragment
type CategoryData = FragmentOf<typeof CategoryFieldsFragment>;
// { id: string; name: string; slug: string; description: string | null; level: number }

// Use in function signatures
function formatCategory(data: CategoryData): string {
  return `${data.name} (${data.slug})`;
}
```

### Reading Fragment Data

Use `readFragment` to extract typed data from query results:

```typescript
import { readFragment } from 'gql.tada';

const result = await client.query(GetCategoriesQuery, { first: 100 });

const categories = result.data?.categories?.edges?.map((edge) => {
  // Extract fragment data with proper typing
  const category = readFragment(CategoryFieldsFragment, edge.node);
  return category;
});
```

## Common Fragment Patterns

### Error Fragment

Standard error fields for mutations:

```typescript
export const MutationErrorFragment = graphql(`
  fragment MutationError on Error {
    field
    message
    code
  }
`);

export const CreateCategoryMutation = graphql(`
  mutation CreateCategory($input: CategoryInput!) {
    categoryCreate(input: $input) {
      category {
        ...CategoryFields
      }
      errors {
        ...MutationError
      }
    }
  }
`, [CategoryFieldsFragment, MutationErrorFragment]);
```

### Pagination Fragment

PageInfo for cursor-based pagination:

```typescript
export const PageInfoFragment = graphql(`
  fragment PageInfo on PageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
`);

export const GetCategoriesPaginatedQuery = graphql(`
  query GetCategoriesPaginated($first: Int!, $after: String) {
    categories(first: $first, after: $after) {
      pageInfo {
        ...PageInfo
      }
      edges {
        cursor
        node {
          ...CategoryFields
        }
      }
    }
  }
`, [CategoryFieldsFragment, PageInfoFragment]);
```

### Metadata Fragment

Common metadata fields:

```typescript
export const MetadataFragment = graphql(`
  fragment Metadata on ObjectWithMetadata {
    metadata {
      key
      value
    }
    privateMetadata {
      key
      value
    }
  }
`);
```

## Best Practices

### Do's

- Create fragments for commonly used field sets
- Name fragments descriptively (e.g., `CategoryBasicFields`, `CategoryWithChildren`)
- Include fragments at the module level for reuse
- Use `readFragment` for type-safe data extraction

### Don'ts

- Don't create fragments for single-use field sets
- Don't nest fragments more than 2-3 levels deep
- Don't forget to pass all required fragments to `graphql()`
- Don't mix fragment and inline field selection for same type

### Fragment Organization

```
src/lib/graphql/
├── fragments/
│   ├── category.ts      # Category fragments
│   ├── product.ts       # Product fragments
│   ├── common.ts        # Shared fragments (errors, pagination)
│   └── index.ts         # Re-exports
├── operations/
│   ├── categories.ts    # Category queries/mutations
│   └── products.ts      # Product queries/mutations
└── client.ts
```
