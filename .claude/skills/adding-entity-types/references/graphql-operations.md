# GraphQL Operations Reference

## gql.tada Setup

The project uses gql.tada for type-safe GraphQL operations with automatic TypeScript inference.

```typescript
import { graphql, type ResultOf, type VariablesOf } from "gql.tada";
```

## Query Patterns

### Basic Query

```typescript
export const getEntityBySlugQuery = graphql(`
  query GetEntityBySlug($slug: String!) {
    entity(slug: $slug) {
      id
      name
      slug
      metadata {
        key
        value
      }
    }
  }
`);

// Type inference
type EntityResult = ResultOf<typeof getEntityBySlugQuery>;
type EntityVariables = VariablesOf<typeof getEntityBySlugQuery>;
```

### Paginated Query

```typescript
export const getEntitiesQuery = graphql(`
  query GetEntities($first: Int!, $after: String) {
    entities(first: $first, after: $after) {
      edges {
        node {
          id
          name
          slug
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`);
```

### Query with Fragments

```typescript
// Define reusable fragment
const EntityFragment = graphql(`
  fragment EntityFields on Entity {
    id
    name
    slug
    isActive
  }
`);

// Use in query
export const getEntityQuery = graphql(`
  query GetEntity($id: ID!) {
    entity(id: $id) {
      ...EntityFields
    }
  }
`, [EntityFragment]);
```

## Mutation Patterns

### Single Mutation

```typescript
export const createEntityMutation = graphql(`
  mutation CreateEntity($input: EntityCreateInput!) {
    entityCreate(input: $input) {
      entity {
        id
        name
        slug
      }
      errors {
        field
        message
        code
      }
    }
  }
`);
```

### Update Mutation

```typescript
export const updateEntityMutation = graphql(`
  mutation UpdateEntity($id: ID!, $input: EntityUpdateInput!) {
    entityUpdate(id: $id, input: $input) {
      entity {
        id
        name
        slug
      }
      errors {
        field
        message
        code
      }
    }
  }
`);
```

### Bulk Mutation

```typescript
export const bulkCreateEntitiesMutation = graphql(`
  mutation BulkCreateEntities(
    $entities: [EntityCreateInput!]!
    $errorPolicy: ErrorPolicyEnum
  ) {
    entityBulkCreate(
      entities: $entities
      errorPolicy: $errorPolicy
    ) {
      count
      results {
        entity {
          id
          name
          slug
        }
        errors {
          path
          message
          code
        }
      }
      errors {
        path
        message
        code
      }
    }
  }
`);
```

## Error Handling

### Network/GraphQL Errors

```typescript
import { GraphQLError } from "@/lib/errors";

const result = await client.query(query, variables);

if (result.error) {
  throw GraphQLError.fromCombinedError(result.error);
}
```

### Mutation Validation Errors

```typescript
const result = await client.mutation(createEntityMutation, { input });

// Check for mutation-level errors
const data = result.data?.entityCreate;
if (data?.errors?.length) {
  throw new ValidationError(
    data.errors.map(e => `${e.field}: ${e.message}`)
  );
}

return data!.entity!;
```

## Schema Management

Update schema when needed:

```bash
pnpm fetch-schema
```

This updates:
- `src/lib/graphql/schema.graphql` - Full Saleor schema
- `graphql-env.d.ts` - Type definitions for gql.tada

## File Organization

```
src/modules/<entity>/
├── operations.ts      # All GraphQL operations for entity
├── repository.ts      # Uses operations, handles errors
└── fragments.ts       # Shared fragments (if needed)
```

## Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Query | `get<Entity>Query` | `getProductQuery` |
| List Query | `get<Entities>Query` | `getProductsQuery` |
| Create | `create<Entity>Mutation` | `createProductMutation` |
| Update | `update<Entity>Mutation` | `updateProductMutation` |
| Delete | `delete<Entity>Mutation` | `deleteProductMutation` |
| Bulk Create | `bulkCreate<Entities>Mutation` | `bulkCreateProductsMutation` |
