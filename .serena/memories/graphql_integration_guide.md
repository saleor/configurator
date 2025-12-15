# GraphQL Integration Guide

## Executive Summary

The Saleor Configurator uses **URQL** as the GraphQL client and **gql.tada** for compile-time type generation. All GraphQL operations go through the **Repository Pattern**, ensuring consistent error handling, type safety, and testability.

**Key Technologies:**
- **URQL Core**: Lightweight GraphQL client with exchange system
- **gql.tada**: TypeScript plugin for compile-time GraphQL type generation
- **Saleor API**: GraphQL endpoint (version 3.20)
- **Network-Only Policy**: No caching (always fresh data)
- **Bearer Token Authentication**: Via auth exchange

**Critical Pattern:** **Dual Error Checking** - Check both `result.error` (URQL errors) AND `result.data.{mutation}.{entity}` (Saleor business errors).

---

## 1. URQL Client Configuration

### 1.1 Client Creation

**Location:** `src/lib/graphql/client.ts:4-26`

```typescript
import { Client, fetchExchange } from "@urql/core";
import { authExchange } from "@urql/exchange-auth";

export const createClient = (token: string, url: string) => {
  return new Client({
    url,
    requestPolicy: "network-only",  // ⚠️ No caching!
    exchanges: [
      authExchange(async (utils) => {
        return {
          async refreshAuth() {},
          didAuthError(error, _operation) {
            return error.graphQLErrors.some((e) => 
              e.extensions?.code === "FORBIDDEN"
            );
          },
          addAuthToOperation(operation) {
            if (!token) return operation;
            return utils.appendHeaders(operation, {
              Authorization: `Bearer ${token}`,
            });
          },
        };
      }),
      fetchExchange,
    ],
  });
};
```

### 1.2 Key Configuration

#### 1.2.1 Request Policy: "network-only"

**Why:**
- Always fetch fresh data from Saleor
- No cache inconsistencies
- Simpler debugging (no cache invalidation)
- Configurator is primarily write-heavy (deployment)

**Trade-off:**
- More network requests
- Slower than caching
- Acceptable for CLI tool (not real-time UI)

**When to Change:**
- Never for deployment operations
- Consider for read-only operations (introspect, diff)
- Would require cache invalidation strategy

#### 1.2.2 Auth Exchange

**Purpose:**
- Adds `Authorization: Bearer {token}` header to all requests
- Detects authentication errors (FORBIDDEN)
- Handles token refresh (currently empty, but hooks exist)

**Authentication Flow:**
```
1. User provides --token flag
2. createClient() creates URQL client with authExchange
3. authExchange.addAuthToOperation() adds Bearer token to every request
4. If FORBIDDEN error, didAuthError() returns true
5. refreshAuth() is called (currently no-op)
```

**Token Format:**
```
Authorization: Bearer <saleor-token>
```

**Example Token:**
```
YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs
```

**Security Notes:**
- Token passed via CLI flag (not stored)
- Token logged only in DEBUG mode (not INFO)
- Token transmitted over HTTPS
- No token caching

#### 1.2.3 Exchange Order

**Order:**
1. `authExchange` - Adds authentication
2. `fetchExchange` - Makes HTTP request

**Why This Order:**
- Auth must modify operation before fetch
- Fetch is always last (actual HTTP call)

**Alternative Exchanges (Not Used):**
- `cacheExchange` - Caching (explicitly NOT used)
- `errorExchange` - Global error handling (handled in repositories)
- `retryExchange` - Retry logic (not needed for CLI)

### 1.3 Client Lifecycle

**Creation:**
- Created once per command in `createConfigurator()`
- Passed to `ServiceComposer.compose()`
- Injected into all repositories

**Lifetime:**
- Lives for duration of single command
- Garbage collected after command completes
- New client for every command execution

**Sharing:**
- Single client instance shared across all repositories
- All repositories reference same client
- Ensures consistent authentication and configuration

---

## 2. gql.tada Type Generation

### 2.1 TypeScript Plugin Configuration

**Location:** `tsconfig.json:22-28`

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "gql.tada/ts-plugin",
        "schema": "./src/lib/graphql/schema.graphql",
        "tadaOutputLocation": "./src/lib/graphql/graphql-env.d.ts"
      }
    ]
  }
}
```

### 2.2 Schema Management

#### 2.2.1 Schema File

**Location:** `src/lib/graphql/schema.graphql`

**Source:** Saleor GitHub repository (version 3.20)

**Size:** ~984 KB (comprehensive Saleor schema)

**Format:** Standard GraphQL SDL (Schema Definition Language)

**Version:** Controlled via `package.json`:
```json
{
  "saleor": {
    "schemaVersion": "3.20"
  }
}
```

#### 2.2.2 Schema Update Process

**Script:** `src/lib/graphql/fetch-schema.ts`

```typescript
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../../../");

const packageJson = JSON.parse(
  readFileSync(join(projectRoot, "package.json"), "utf-8")
);

const version = packageJson.saleor.schemaVersion;
const url = `https://raw.githubusercontent.com/saleor/saleor/${version}/saleor/graphql/schema.graphql`;

const response = await fetch(url);
const schema = await response.text();

writeFileSync(join(projectRoot, "src/lib/graphql/schema.graphql"), schema);
```

**Usage:**
```bash
pnpm fetch-schema
```

**When to Run:**
1. After updating `saleor.schemaVersion` in package.json
2. When Saleor API changes
3. When adding new fields to queries/mutations
4. Before release (ensure schema is current)

**After Running:**
1. Commit new schema.graphql
2. Run `pnpm typecheck` to verify no breaking changes
3. Run tests to catch incompatibilities
4. Update queries/mutations if needed

#### 2.2.3 Type Generation Output

**Location:** `src/lib/graphql/graphql-env.d.ts`

**Size:** ~946 KB (generated TypeScript types)

**Content:**
- All GraphQL types
- Query/Mutation return types
- Input types
- Enum types
- Union types

**Generated By:** gql.tada TypeScript plugin

**When Generated:**
- Automatically when TypeScript compiler runs
- During `pnpm typecheck`
- During `pnpm build`
- In IDE (on save, via TS language server)

**Do NOT:**
- Manually edit graphql-env.d.ts (auto-generated)
- Commit graphql-env.d.ts (gitignored)
- Use it directly (import from gql.tada instead)

### 2.3 Type Extraction

#### 2.3.1 ResultOf<T>

**Purpose:** Extract result type from GraphQL query/mutation

**Import:**
```typescript
import { type ResultOf } from "gql.tada";
```

**Usage:**
```typescript
const getChannelsQuery = graphql(`
  query GetChannels {
    channels {
      id
      name
      slug
      isActive
      currencyCode
    }
  }
`);

// Extract type
type ChannelsData = ResultOf<typeof getChannelsQuery>;
// Type: { channels: Array<{ id: string, name: string, ... }> }

// Use in function
async function getChannels(): Promise<ChannelsData["channels"]> {
  const result = await client.query(getChannelsQuery, {});
  return result.data?.channels ?? [];
}
```

**Type Structure:**
```typescript
ResultOf<Query> = {
  [queryName]: QueryResult
}

// Example:
ResultOf<GetChannelsQuery> = {
  channels: Array<{
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    currencyCode: string;
  }>
}
```

**Key Benefit:** Type safety from GraphQL query to return type

#### 2.3.2 VariablesOf<T>

**Purpose:** Extract variables type from GraphQL query/mutation

**Import:**
```typescript
import { type VariablesOf } from "gql.tada";
```

**Usage:**
```typescript
const createChannelMutation = graphql(`
  mutation CreateChannel($input: ChannelCreateInput!) {
    channelCreate(input: $input) {
      channel {
        id
        name
        slug
      }
    }
  }
`);

// Extract variables type
type CreateChannelVars = VariablesOf<typeof createChannelMutation>;
// Type: { input: ChannelCreateInput }

// Use in function
async function createChannel(
  input: CreateChannelVars["input"]
): Promise<Channel> {
  const result = await client.mutation(createChannelMutation, { input });
  // ...
}
```

**Key Benefit:** Type-safe variables, catches missing/wrong fields at compile time

#### 2.3.3 TadaDocumentNode<T>

**Purpose:** Type for reusable GraphQL document fragments

**Import:**
```typescript
import { type TadaDocumentNode } from "gql.tada";
```

**Usage:**
```typescript
// Define fragment
const channelFragment = graphql(`
  fragment ChannelFields on Channel {
    id
    name
    slug
    isActive
  }
`);

// Use in query
const getChannelsQuery = graphql(`
  query GetChannels {
    channels {
      ...ChannelFields
    }
  }
`, [channelFragment]);

// Type for reusable documents
function executeQuery(
  document: TadaDocumentNode<any, any>
): Promise<any> {
  return client.query(document, {});
}
```

**Use Cases:**
- Reusable fragments
- Generic query executors
- Dynamic query building

### 2.4 Compile-Time Validation

**What gql.tada Validates:**
1. **Query Syntax**: Valid GraphQL syntax
2. **Field Existence**: Fields exist in schema
3. **Type Correctness**: Arguments match expected types
4. **Required Fields**: Non-null fields are present
5. **Variable Types**: Variables match operation definition

**Example Errors:**

```typescript
// ❌ Field doesn't exist
const query = graphql(`
  query {
    channels {
      id
      invalidField  # Compile error: Field doesn't exist on Channel
    }
  }
`);

// ❌ Wrong variable type
const mutation = graphql(`
  mutation CreateChannel($input: ChannelCreateInput!) {
    channelCreate(input: $input) {
      channel { id }
    }
  }
`);

await client.mutation(mutation, {
  input: "wrong type"  // Compile error: Expected ChannelCreateInput
});

// ❌ Missing required field
const mutation = graphql(`
  mutation CreateChannel($input: ChannelCreateInput!) {
    channelCreate(input: $input) {
      channel { id }
    }
  }
`);

await client.mutation(mutation, {
  input: {
    name: "Test"
    // Compile error: Missing required field 'slug'
  }
});
```

**Benefits:**
- Catch errors before runtime
- IDE autocomplete for fields
- Refactoring safety (schema changes break compilation)
- No need for code generation step

---

## 3. Repository Pattern for GraphQL

### 3.1 Standard Repository Structure

**Pattern:**
```typescript
import { type Client } from "@urql/core";
import { graphql, type ResultOf, type VariablesOf } from "gql.tada";
import { logger } from "../../lib/logger";
import { GraphQLError } from "../../lib/errors/graphql-error";

// 1. Define GraphQL operations
const create{Entity}Mutation = graphql(`
  mutation Create{Entity}($input: {Entity}CreateInput!) {
    {entity}Create(input: $input) {
      {entity} {
        id
        # ... fields
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

const get{Entities}Query = graphql(`
  query Get{Entities} {
    {entities} {
      id
      # ... fields
    }
  }
`);

const get{Entity}BySlugQuery = graphql(`
  query Get{Entity}BySlug($slug: String!) {
    {entity}(slug: $slug) {
      id
      # ... fields
    }
  }
`);

// 2. Define repository class
export class {Entity}Repository {
  constructor(private client: Client) {}
  
  // Query methods
  async get{Entities}(): Promise<Entity[]> {
    const result = await this.client.query(get{Entities}Query, {});
    return result.data?.{entities} ?? [];
  }
  
  async get{Entity}BySlug(slug: string): Promise<Entity | null> {
    const result = await this.client.query(get{Entity}BySlugQuery, { slug });
    return result.data?.{entity} ?? null;
  }
  
  // Mutation methods
  async create{Entity}(input: {Entity}Input): Promise<Entity> {
    const result = await this.client.mutation(create{Entity}Mutation, {
      input,
    });
    
    // ⚠️ CRITICAL: Dual error checking
    if (!result.data?.{entity}Create?.{entity}) {
      throw GraphQLError.fromGraphQLErrors(
        result.error?.graphQLErrors ?? [],
        `Failed to create {entity} ${input.name}`
      );
    }
    
    const {entity} = result.data.{entity}Create.{entity};
    
    logger.info("{Entity} created", { {entity} });
    
    return {entity};
  }
}
```

### 3.2 Query Operations

#### 3.2.1 List Query Pattern

**Purpose:** Fetch all entities (with optional pagination)

**Pattern:**
```typescript
const get{Entities}Query = graphql(`
  query Get{Entities}($first: Int, $after: String) {
    {entities}(first: $first, after: $after) {
      edges {
        node {
          id
          name
          # ... fields
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`);

async get{Entities}(): Promise<Entity[]> {
  const result = await this.client.query(get{Entities}Query, {
    first: 100  // Optional: limit results
  });
  
  // Extract nodes from edges
  return result.data?.{entities}?.edges.map(e => e.node) ?? [];
}
```

**Pagination Pattern:**
```typescript
async getAll{Entities}(): Promise<Entity[]> {
  const entities: Entity[] = [];
  let hasNextPage = true;
  let after: string | undefined;
  
  while (hasNextPage) {
    const result = await this.client.query(get{Entities}Query, {
      first: 100,
      after
    });
    
    const data = result.data?.{entities};
    if (!data) break;
    
    entities.push(...data.edges.map(e => e.node));
    
    hasNextPage = data.pageInfo.hasNextPage;
    after = data.pageInfo.endCursor ?? undefined;
  }
  
  return entities;
}
```

**Key Points:**
- Always provide sensible `first` limit (default 100)
- Handle pagination for large datasets
- Extract nodes from edges structure
- Return empty array on error (not null)

#### 3.2.2 Single Entity Query Pattern

**Purpose:** Fetch entity by unique identifier (ID, slug, etc.)

**Pattern:**
```typescript
const get{Entity}BySlugQuery = graphql(`
  query Get{Entity}BySlug($slug: String!) {
    {entity}(slug: $slug) {
      id
      name
      slug
      # ... fields
    }
  }
`);

async get{Entity}BySlug(slug: string): Promise<Entity | null> {
  const result = await this.client.query(get{Entity}BySlugQuery, { slug });
  return result.data?.{entity} ?? null;
}
```

**Key Points:**
- Return `null` if not found (not throw)
- Use `??` operator for safe access
- Query variables type-checked by gql.tada

**Error Handling:**
```typescript
// ❌ DON'T: Throw on not found
if (!result.data?.{entity}) {
  throw new Error("Not found");
}

// ✅ DO: Return null
return result.data?.{entity} ?? null;
```

**Why:** "Not found" is not an error - it's a valid result. Let service layer decide how to handle.

#### 3.2.3 Filter Query Pattern

**Purpose:** Fetch entities matching criteria

**Pattern:**
```typescript
const get{Entities}ByFilterQuery = graphql(`
  query Get{Entities}ByFilter($filter: {Entity}FilterInput) {
    {entities}(filter: $filter) {
      edges {
        node {
          id
          name
          # ... fields
        }
      }
    }
  }
`);

async get{Entities}ByFilter(
  filter: {Entity}FilterInput
): Promise<Entity[]> {
  const result = await this.client.query(
    get{Entities}ByFilterQuery,
    { filter }
  );
  
  return result.data?.{entities}?.edges.map(e => e.node) ?? [];
}
```

**Common Filters:**
- `search`: Text search
- `ids`: Filter by ID list
- `isPublished`: Boolean filter
- `channel`: Filter by channel
- Custom filters per entity type

### 3.3 Mutation Operations

#### 3.3.1 Create Mutation Pattern

**Purpose:** Create new entity

**Pattern:**
```typescript
const create{Entity}Mutation = graphql(`
  mutation Create{Entity}($input: {Entity}CreateInput!) {
    {entity}Create(input: $input) {
      {entity} {
        id
        name
        slug
        # ... fields
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

async create{Entity}(input: {Entity}Input): Promise<Entity> {
  const result = await this.client.mutation(create{Entity}Mutation, {
    input,
  });
  
  // ⚠️ CRITICAL: Dual error checking
  if (!result.data?.{entity}Create?.{entity}) {
    throw GraphQLError.fromGraphQLErrors(
      result.error?.graphQLErrors ?? [],
      `Failed to create {entity} ${input.name ?? input.slug}`
    );
  }
  
  const {entity} = result.data.{entity}Create.{entity};
  
  logger.info("{Entity} created", { {entity}: { id: {entity}.id, name: {entity}.name } });
  
  return {entity};
}
```

**Key Components:**

1. **Mutation Definition**: Request entity + errors
2. **Dual Error Checking**: Check data exists (catches both error types)
3. **Error Wrapping**: Use GraphQLError.fromGraphQLErrors()
4. **Logging**: Log successful creation
5. **Return Entity**: Return created entity

#### 3.3.2 Update Mutation Pattern

**Purpose:** Update existing entity

**Pattern:**
```typescript
const update{Entity}Mutation = graphql(`
  mutation Update{Entity}($id: ID!, $input: {Entity}UpdateInput!) {
    {entity}Update(id: $id, input: $input) {
      {entity} {
        id
        name
        # ... fields
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

async update{Entity}(
  id: string,
  input: {Entity}UpdateInput
): Promise<Entity> {
  const result = await this.client.mutation(update{Entity}Mutation, {
    id,
    input,
  });
  
  if (!result.data?.{entity}Update?.{entity}) {
    throw GraphQLError.fromGraphQLErrors(
      result.error?.graphQLErrors ?? [],
      `Failed to update {entity} ${id}`
    );
  }
  
  const {entity} = result.data.{entity}Update.{entity};
  
  logger.info("{Entity} updated", { {entity}: { id: {entity}.id } });
  
  return {entity};
}
```

**Key Difference from Create:**
- Takes `id` parameter
- Uses `{Entity}UpdateInput` type (different from CreateInput)
- May have fewer required fields

#### 3.3.3 Delete Mutation Pattern

**Purpose:** Delete entity

**Pattern:**
```typescript
const delete{Entity}Mutation = graphql(`
  mutation Delete{Entity}($id: ID!) {
    {entity}Delete(id: $id) {
      errors {
        field
        message
        code
      }
    }
  }
`);

async delete{Entity}(id: string): Promise<void> {
  const result = await this.client.mutation(delete{Entity}Mutation, {
    id,
  });
  
  // Check for errors in mutation result
  if (result.data?.{entity}Delete?.errors && 
      result.data.{entity}Delete.errors.length > 0) {
    throw GraphQLError.fromGraphQLErrors(
      result.error?.graphQLErrors ?? [],
      `Failed to delete {entity} ${id}`
    );
  }
  
  logger.info("{Entity} deleted", { id });
}
```

**Key Points:**
- Delete mutations don't return entity (already deleted)
- Check `errors` array explicitly
- Return `void` (no data to return)
- Used rarely in Configurator (no deletion in config files)

### 3.4 Dual Error Checking Pattern

#### 3.4.1 Why Two Error Sources?

**URQL Errors** (`result.error`):
- Network errors (timeout, connection failed)
- GraphQL syntax errors
- Authentication errors (FORBIDDEN)
- Invalid query structure

**Saleor Business Errors** (`result.data.{mutation}.errors`):
- Validation errors (invalid field values)
- Permission errors (user lacks permission)
- Business logic errors (slug already exists)
- Constraint violations (foreign key, unique)

**Example:**
```graphql
mutation CreateChannel($input: ChannelCreateInput!) {
  channelCreate(input: $input) {
    channel {
      id
      name
    }
    errors {           # ← Saleor business errors
      field
      message
      code
    }
  }
}
```

**Result Structure:**
```typescript
{
  data: {
    channelCreate: {
      channel: null,  // null if error
      errors: [
        {
          field: "slug",
          message: "Channel with this slug already exists",
          code: "UNIQUE"
        }
      ]
    }
  },
  error: undefined  // or CombinedError if URQL error
}
```

#### 3.4.2 Correct Pattern

**✅ ALWAYS DO THIS:**
```typescript
if (!result.data?.{entity}Create?.{entity}) {
  throw GraphQLError.fromGraphQLErrors(
    result.error?.graphQLErrors ?? [],
    `Failed to create {entity} ${input.name}`
  );
}
```

**Why This Works:**
- If `result.error` exists → no data → throws with URQL error
- If `errors` array has items → no entity → throws with business errors
- If both present → throws with combined context
- Single check catches both error types

#### 3.4.3 Incorrect Patterns

**❌ NEVER DO THIS:**

**Pattern 1: Only check result.error**
```typescript
// ❌ WRONG: Misses business errors
if (result.error) {
  throw new Error(result.error.message);
}
return result.data.channelCreate.channel;  // May be null!
```

**Problem:** Saleor business errors won't have `result.error`, but `channel` will be null.

**Pattern 2: Only check errors array**
```typescript
// ❌ WRONG: Misses URQL errors
if (result.data?.channelCreate?.errors?.length > 0) {
  throw new Error("Failed");
}
return result.data.channelCreate.channel;
```

**Problem:** Network errors won't populate errors array, but operation failed.

**Pattern 3: Separate checks**
```typescript
// ❌ WRONG: Verbose and still incomplete
if (result.error) {
  throw new Error(result.error.message);
}

if (result.data?.channelCreate?.errors?.length > 0) {
  throw new Error("Validation failed");
}

return result.data.channelCreate.channel;
```

**Problem:** Doesn't handle case where both are present.

#### 3.4.4 GraphQLError.fromGraphQLErrors()

**Location:** `src/lib/errors/graphql-error.ts`

**Purpose:** Aggregate GraphQL errors into single BaseError

**Usage:**
```typescript
throw GraphQLError.fromGraphQLErrors(
  result.error?.graphQLErrors ?? [],
  "User-friendly context message"
);
```

**What It Does:**
1. Extracts all GraphQL error messages
2. Combines with user-friendly context
3. Creates BaseError with details array
4. Preserves error codes and extensions

**Result:**
```typescript
{
  message: "User-friendly context message",
  details: [
    "Field 'slug': Channel with this slug already exists",
    "Field 'currencyCode': Invalid currency code"
  ],
  context: {
    graphQLErrors: [/* original errors */]
  }
}
```

---

## 4. Common GraphQL Patterns

### 4.1 Field Selection

**Purpose:** Request only needed fields to reduce payload size

**Pattern:**
```typescript
// ❌ BAD: Request all fields
const getProductQuery = graphql(`
  query GetProduct($id: ID!) {
    product(id: $id) {
      # ... 50+ fields
    }
  }
`);

// ✅ GOOD: Request only needed fields
const getProductQuery = graphql(`
  query GetProduct($id: ID!) {
    product(id: $id) {
      id
      name
      slug
      productType { id }
      category { id }
    }
  }
`);
```

**Benefits:**
- Smaller responses (faster network)
- Clearer intent
- Fewer type errors

**Guidelines:**
- Start with minimal fields
- Add fields as needed
- Group related queries if fetching same entity multiple times

### 4.2 Nested Queries

**Purpose:** Fetch related entities in single request

**Pattern:**
```typescript
const getProductWithRelationsQuery = graphql(`
  query GetProductWithRelations($id: ID!) {
    product(id: $id) {
      id
      name
      slug
      productType {
        id
        name
        productAttributes {
          id
          name
        }
      }
      category {
        id
        name
        parent { id name }
      }
      variants {
        id
        name
        sku
      }
    }
  }
`);
```

**Benefits:**
- Single round-trip
- Avoid N+1 queries
- Atomic data fetching

**Caution:**
- Don't over-fetch (too many levels)
- Large nested queries can timeout
- Balance depth vs number of requests

### 4.3 Fragments for Reusability

**Purpose:** Reuse field selections across queries

**Pattern:**
```typescript
// Define fragment
const channelFieldsFragment = graphql(`
  fragment ChannelFields on Channel {
    id
    name
    slug
    isActive
    currencyCode
  }
`);

// Use in query
const getChannelsQuery = graphql(`
  query GetChannels {
    channels {
      ...ChannelFields
    }
  }
`, [channelFieldsFragment]);

// Use in mutation
const createChannelMutation = graphql(`
  mutation CreateChannel($input: ChannelCreateInput!) {
    channelCreate(input: $input) {
      channel {
        ...ChannelFields
      }
    }
  }
`, [channelFieldsFragment]);
```

**Benefits:**
- DRY (Don't Repeat Yourself)
- Consistent field selection
- Single source of truth
- Easy updates (change fragment, all queries updated)

**When to Use:**
- Same entity queried in multiple places
- Complex nested structures
- Consistent representations needed

### 4.4 Conditional Fields

**Purpose:** Include fields based on type

**Pattern (Union Types):**
```typescript
const getProductMediaQuery = graphql(`
  query GetProductMedia($id: ID!) {
    product(id: $id) {
      id
      media {
        id
        url
        type
        ... on ProductImage {
          alt
        }
        ... on ProductVideo {
          url
          duration
        }
      }
    }
  }
`);
```

**Pattern (Interfaces):**
```typescript
const getNodeQuery = graphql(`
  query GetNode($id: ID!) {
    node(id: $id) {
      id
      ... on Product {
        name
        slug
      }
      ... on Category {
        name
        slug
      }
    }
  }
`);
```

### 4.5 Variables and Directives

**Purpose:** Dynamic query behavior

**Pattern (@include):**
```typescript
const getProductQuery = graphql(`
  query GetProduct($id: ID!, $includeVariants: Boolean!) {
    product(id: $id) {
      id
      name
      variants @include(if: $includeVariants) {
        id
        name
      }
    }
  }
`);

// Usage
const result = await client.query(getProductQuery, {
  id: "123",
  includeVariants: true  // Conditionally include variants
});
```

**Pattern (@skip):**
```typescript
const getProductQuery = graphql(`
  query GetProduct($id: ID!, $skipMedia: Boolean!) {
    product(id: $id) {
      id
      name
      media @skip(if: $skipMedia) {
        id
        url
      }
    }
  }
`);
```

**Use Cases:**
- Optional data fetching
- Performance optimization
- Conditional complexity

---

## 5. Error Handling Best Practices

### 5.1 Error Types and Handling

#### 5.1.1 Network Errors

**Examples:**
- Connection timeout
- DNS resolution failed
- Network unreachable

**Handling:**
```typescript
if (result.error?.networkError) {
  throw new Error(`Network error: Cannot reach Saleor API at ${url}`);
}
```

**User Message:**
> "❌ Cannot connect to Saleor instance. Check URL and network connection."

#### 5.1.2 Authentication Errors

**Examples:**
- Invalid token
- Expired token
- Missing permissions

**Handling:**
```typescript
if (result.error?.graphQLErrors.some(e => 
  e.extensions?.code === "FORBIDDEN" ||
  e.extensions?.code === "UNAUTHENTICATED"
)) {
  throw new Error("Authentication failed. Check your token.");
}
```

**User Message:**
> "❌ Authentication failed. Verify your access token has correct permissions."

#### 5.1.3 Validation Errors

**Examples:**
- Required field missing
- Invalid format
- Out of range

**Handling:**
```typescript
if (result.data?.{entity}Create?.errors) {
  const errors = result.data.{entity}Create.errors;
  const fieldErrors = errors.map(e => 
    `${e.field}: ${e.message}`
  );
  
  throw new GraphQLError(
    `Validation failed for {entity}`,
    fieldErrors
  );
}
```

**User Message:**
> "❌ Validation failed:\n
>   • slug: Required field\n
>   • currencyCode: Invalid currency code 'XXX'"

#### 5.1.4 Business Logic Errors

**Examples:**
- Entity already exists
- Invalid state transition
- Constraint violation

**Handling:**
```typescript
if (!result.data?.channelCreate?.channel) {
  throw GraphQLError.fromGraphQLErrors(
    result.error?.graphQLErrors ?? [],
    `Channel '${input.slug}' may already exist or validation failed`
  );
}
```

**User Message:**
> "❌ Failed to create channel 'us-store':\n
>   • Channel with this slug already exists"

### 5.2 Error Context Best Practices

**Pattern:**
```typescript
// ✅ GOOD: Include context
throw GraphQLError.fromGraphQLErrors(
  result.error?.graphQLErrors ?? [],
  `Failed to create channel '${input.slug}'`
);

// ✅ BETTER: Include context + hint
throw GraphQLError.fromGraphQLErrors(
  result.error?.graphQLErrors ?? [],
  `Failed to create channel '${input.slug}'. Check if channel already exists.`
);

// ❌ BAD: Generic message
throw GraphQLError.fromGraphQLErrors(
  result.error?.graphQLErrors ?? [],
  "Failed to create channel"
);
```

**Guidelines:**
1. Include entity identifier (slug, name, ID)
2. Provide actionable hint when possible
3. Be specific about what failed
4. Keep user-friendly (no technical jargon)

### 5.3 Logging Strategy

**Pattern:**
```typescript
async create{Entity}(input: {Entity}Input): Promise<Entity> {
  // Debug: Log input
  logger.debug("Creating {entity}", { input });
  
  const result = await this.client.mutation(create{Entity}Mutation, {
    input,
  });
  
  if (!result.data?.{entity}Create?.{entity}) {
    // Error: Log failure with details
    logger.error("Failed to create {entity}", {
      input,
      error: result.error,
      saleorErrors: result.data?.{entity}Create?.errors
    });
    
    throw GraphQLError.fromGraphQLErrors(
      result.error?.graphQLErrors ?? [],
      `Failed to create {entity} ${input.name}`
    );
  }
  
  const {entity} = result.data.{entity}Create.{entity};
  
  // Info: Log success
  logger.info("{Entity} created successfully", {
    {entity}: { id: {entity}.id, name: {entity}.name }
  });
  
  return {entity};
}
```

**Log Levels:**
- `logger.debug()`: Input/output for debugging
- `logger.info()`: Successful operations
- `logger.error()`: Failed operations with context
- `logger.warn()`: Unexpected but recoverable

**What to Log:**
- Input data (debug level)
- Success with entity ID (info level)
- Errors with full context (error level)
- Never log sensitive data (tokens, passwords)

---

## 6. Testing GraphQL Integration

### 6.1 Mocking URQL Client

**Pattern:**
```typescript
import { vi } from "vitest";
import type { Client } from "@urql/core";

describe("ChannelRepository", () => {
  let repository: ChannelRepository;
  let mockClient: MockedClient;
  
  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as Client;
    
    repository = new ChannelRepository(mockClient);
  });
  
  it("should create channel successfully", async () => {
    // Arrange: Mock successful response
    mockClient.mutation.mockResolvedValue({
      data: {
        channelCreate: {
          channel: {
            id: "1",
            name: "Test Channel",
            slug: "test-channel",
            isActive: true,
            currencyCode: "USD",
          },
          errors: [],
        },
      },
      error: undefined,
    });
    
    // Act
    const result = await repository.createChannel({
      name: "Test Channel",
      slug: "test-channel",
      currencyCode: "USD",
    });
    
    // Assert
    expect(result).toMatchObject({
      name: "Test Channel",
      slug: "test-channel",
    });
    expect(mockClient.mutation).toHaveBeenCalledWith(
      createChannelMutation,
      {
        input: {
          name: "Test Channel",
          slug: "test-channel",
          currencyCode: "USD",
        },
      }
    );
  });
});
```

### 6.2 Testing Error Scenarios

**Network Error:**
```typescript
it("should handle network errors", async () => {
  mockClient.mutation.mockResolvedValue({
    data: undefined,
    error: {
      networkError: new Error("Connection timeout"),
      graphQLErrors: [],
    },
  });
  
  await expect(repository.createChannel(input))
    .rejects.toThrow(GraphQLError);
});
```

**Validation Error:**
```typescript
it("should handle validation errors", async () => {
  mockClient.mutation.mockResolvedValue({
    data: {
      channelCreate: {
        channel: null,
        errors: [
          {
            field: "slug",
            message: "Channel with this slug already exists",
            code: "UNIQUE",
          },
        ],
      },
    },
    error: undefined,
  });
  
  await expect(repository.createChannel(input))
    .rejects.toThrow(GraphQLError);
});
```

**Authentication Error:**
```typescript
it("should handle authentication errors", async () => {
  mockClient.mutation.mockResolvedValue({
    data: undefined,
    error: {
      graphQLErrors: [
        {
          message: "Forbidden",
          extensions: { code: "FORBIDDEN" },
        },
      ],
    },
  });
  
  await expect(repository.createChannel(input))
    .rejects.toThrow(GraphQLError);
});
```

### 6.3 Integration Testing

**Pattern:**
```typescript
describe("Channel Integration", () => {
  let client: Client;
  let repository: ChannelRepository;
  
  beforeAll(() => {
    // Use real client against test Saleor instance
    client = createClient(
      process.env.TEST_SALEOR_TOKEN!,
      process.env.TEST_SALEOR_URL!
    );
    repository = new ChannelRepository(client);
  });
  
  it("should create, fetch, and update channel", async () => {
    // Create
    const created = await repository.createChannel({
      name: "Test Channel",
      slug: `test-${Date.now()}`,
      currencyCode: "USD",
    });
    
    expect(created.id).toBeDefined();
    
    // Fetch
    const fetched = await repository.getChannelBySlug(created.slug);
    expect(fetched).toMatchObject({
      id: created.id,
      name: "Test Channel",
    });
    
    // Update
    const updated = await repository.updateChannel(created.id, {
      name: "Updated Channel",
    });
    expect(updated.name).toBe("Updated Channel");
  });
  
  afterAll(async () => {
    // Cleanup test data
  });
});
```

---

## 7. Advanced Patterns

### 7.1 Batch Operations

**Purpose:** Reduce round-trips for multiple operations

**Saleor Support:**
- `productBulkCreate`
- `productVariantBulkCreate`
- Limited batch mutation support

**Pattern:**
```typescript
const bulkCreateProductsMutation = graphql(`
  mutation BulkCreateProducts($products: [ProductBulkCreateInput!]!) {
    productBulkCreate(products: $products) {
      results {
        product { id name }
        errors {
          field
          message
        }
      }
      count
    }
  }
`);

async bulkCreateProducts(
  inputs: ProductInput[]
): Promise<BulkResult<Product>> {
  const result = await this.client.mutation(
    bulkCreateProductsMutation,
    { products: inputs }
  );
  
  if (!result.data?.productBulkCreate) {
    throw GraphQLError.fromGraphQLErrors(
      result.error?.graphQLErrors ?? [],
      "Bulk product creation failed"
    );
  }
  
  const { results, count } = result.data.productBulkCreate;
  
  return {
    successes: results.filter(r => r.product).map(r => r.product!),
    failures: results.filter(r => r.errors.length > 0),
    total: count,
  };
}
```

**Benefits:**
- Single GraphQL request
- Faster for large batches
- Transactional (all or nothing)

**Limitations:**
- Not all Saleor mutations support bulk
- Harder error handling (which item failed?)
- May timeout with very large batches

### 7.2 Optimistic Updates

**Not Used in Configurator** (CLI tool, no UI)

**Pattern (for reference):**
```typescript
const result = await client.mutation(
  createChannelMutation,
  { input },
  {
    // Optimistic response (UI update before server confirms)
    optimistic: {
      channelCreate: {
        channel: {
          id: "temp-id",
          ...input,
        },
      },
    },
  }
);
```

**Why Not Used:**
- CLI doesn't need instant feedback
- Network-only policy prevents caching
- Simpler error handling without optimistic updates

### 7.3 Query Batching

**Not Used in Configurator** (network-only policy)

**Pattern (for reference):**
```typescript
// Multiple queries in single HTTP request
const [channels, products] = await Promise.all([
  client.query(getChannelsQuery, {}),
  client.query(getProductsQuery, {}),
]);
```

**Why Not Used:**
- Network-only policy doesn't batch
- Sequential operations more predictable
- Debugging easier with separate requests

### 7.4 Subscriptions

**Not Supported in Configurator** (Saleor doesn't use WebSockets for subscriptions in this version)

**Pattern (for reference):**
```typescript
const productUpdatedSubscription = graphql(`
  subscription ProductUpdated {
    productUpdated {
      product {
        id
        name
      }
    }
  }
`);
```

**Why Not Used:**
- Saleor 3.20 doesn't expose subscriptions
- CLI doesn't need real-time updates
- Polling can be used if needed

---

## 8. Performance Optimization

### 8.1 Field Selection Optimization

**Minimize Payload Size:**

```typescript
// ❌ SLOW: Fetch everything
const query = graphql(`
  query GetProducts {
    products {
      edges {
        node {
          id
          name
          description
          media { url alt }
          variants { id name sku }
          attributes { ... }
          # ... 30 more fields
        }
      }
    }
  }
`);

// ✅ FAST: Fetch only needed
const query = graphql(`
  query GetProducts {
    products {
      edges {
        node {
          id
          name
          slug
          productType { id }
        }
      }
    }
  }
`);
```

**Impact:**
- 10 KB vs 100 KB response
- 100ms vs 500ms query time
- Fewer database joins

### 8.2 Pagination Strategy

**Cursor-Based Pagination:**

```typescript
// ✅ GOOD: Paginate large lists
async getAllProducts(): Promise<Product[]> {
  const products: Product[] = [];
  let hasNextPage = true;
  let after: string | undefined;
  
  while (hasNextPage) {
    const result = await this.client.query(getProductsQuery, {
      first: 100,  // Reasonable page size
      after,
    });
    
    const data = result.data?.products;
    if (!data) break;
    
    products.push(...data.edges.map(e => e.node));
    
    hasNextPage = data.pageInfo.hasNextPage;
    after = data.pageInfo.endCursor ?? undefined;
  }
  
  return products;
}
```

**Page Size Guidelines:**
- **Small entities** (channels, categories): 100 per page
- **Medium entities** (products without variants): 50 per page
- **Large entities** (products with variants/media): 20 per page

### 8.3 Concurrent Queries

**Pattern:**
```typescript
// ✅ GOOD: Parallel independent queries
async loadRemoteConfig(): Promise<Config> {
  const [channels, productTypes, categories] = await Promise.all([
    this.channelService.getChannels(),
    this.productTypeService.getProductTypes(),
    this.categoryService.getCategories(),
  ]);
  
  return { channels, productTypes, categories };
}
```

**Impact:**
- 3 queries × 500ms each = 1500ms sequential
- 3 queries in parallel = 500ms total
- 3x speedup

**Limitation:**
- URQL network-only doesn't batch
- Each query is separate HTTP request
- Server load (3 concurrent requests)

### 8.4 Caching Strategy

**Current: No Caching** (network-only policy)

**Why:**
- Always fresh data
- Simpler debugging
- CLI usage pattern (short-lived)

**When Caching Would Help:**
- Long-running operations
- Multiple reads of same entity
- UI applications (not applicable here)

**If Caching Added:**
```typescript
// Change request policy
const client = new Client({
  url,
  requestPolicy: "cache-first",  // Use cache
  exchanges: [authExchange, cacheExchange(), fetchExchange],
});
```

**Would Require:**
- Cache invalidation strategy
- Manual cache updates after mutations
- TTL (time-to-live) management

---

## 9. Schema Evolution

### 9.1 Updating to New Saleor Version

**Process:**

1. **Update package.json**
   ```json
   {
     "saleor": {
       "schemaVersion": "3.21"  // New version
     }
   }
   ```

2. **Fetch New Schema**
   ```bash
   pnpm fetch-schema
   ```

3. **Run Type Check**
   ```bash
   pnpm typecheck
   ```
   
   **Errors indicate:**
   - Fields removed from schema
   - Fields renamed
   - Type changes
   - New required fields

4. **Fix Breaking Changes**
   - Update affected queries/mutations
   - Handle new required fields
   - Remove references to deleted fields

5. **Run Tests**
   ```bash
   pnpm test
   ```

6. **Update Documentation**
   - Note breaking changes
   - Update examples
   - Add migration guide

### 9.2 Handling Deprecations

**Pattern:**
```typescript
// Old (deprecated)
const query = graphql(`
  query GetProduct($id: ID!) {
    product(id: $id) {
      publicationDate  # Deprecated
    }
  }
`);

// New
const query = graphql(`
  query GetProduct($id: ID!) {
    product(id: $id) {
      publishedAt  # Replacement
    }
  }
`);
```

**Strategy:**
- Check Saleor changelog for deprecations
- Update before deprecation deadline
- Test with new fields before removing old
- Support both temporarily if needed

### 9.3 Adding New Fields

**Pattern:**
```typescript
// Before
const query = graphql(`
  query GetChannel($id: ID!) {
    channel(id: $id) {
      id
      name
      slug
    }
  }
`);

// After (new field available)
const query = graphql(`
  query GetChannel($id: ID!) {
    channel(id: $id) {
      id
      name
      slug
      stockSettings {  # New field
        allocationStrategy
      }
    }
  }
`);
```

**Process:**
1. Fetch latest schema
2. Check new field availability
3. Add to query (optional fields safe to add)
4. Update types (auto-generated)
5. Use new field in code

---

## 10. Troubleshooting

### 10.1 Common Issues

#### Issue: "Cannot find module 'gql.tada'"

**Cause:** TypeScript plugin not loaded

**Fix:**
1. Restart TypeScript server in IDE
2. Run `pnpm typecheck`
3. Check `tsconfig.json` has plugin configured
4. Ensure gql.tada installed: `pnpm install`

#### Issue: "Field X doesn't exist on type Y"

**Cause:** Schema out of date or field name wrong

**Fix:**
1. Check field name spelling
2. Run `pnpm fetch-schema`
3. Verify field exists in `schema.graphql`
4. Check Saleor API version

#### Issue: GraphQL query succeeds but entity is null

**Cause:** Saleor business error (not URQL error)

**Fix:**
1. Check `result.data.{mutation}.errors` array
2. Log full result for debugging
3. Verify input matches schema requirements
4. Check Saleor permissions

#### Issue: "Bearer token" not working

**Cause:** Token format or permissions issue

**Fix:**
1. Verify token format (no "Bearer" prefix in token itself)
2. Check token has required permissions
3. Test token in GraphQL playground
4. Verify Saleor URL is correct

#### Issue: Types not auto-generated

**Cause:** gql.tada plugin not running

**Fix:**
1. Run `pnpm typecheck` to trigger generation
2. Check `graphql-env.d.ts` exists
3. Restart TypeScript language server
4. Verify schema.graphql is valid

### 10.2 Debugging GraphQL Requests

**Enable Debug Logging:**
```bash
LOG_LEVEL=debug pnpm deploy
```

**What Gets Logged:**
- GraphQL operation name
- Variables
- Response data (if LOG_LEVEL=trace)
- Errors with full context

**Manual Testing:**
```typescript
// Add temporary logging
const result = await this.client.mutation(createChannelMutation, {
  input,
});

console.log("GraphQL Result:", JSON.stringify(result, null, 2));
```

**GraphQL Playground:**
1. Open Saleor GraphQL endpoint in browser
2. Add Authorization header: `Bearer {token}`
3. Test query/mutation directly
4. Compare with configurator query

### 10.3 Error Investigation Process

**Step 1: Check Error Type**
```typescript
if (result.error) {
  console.log("URQL Error:", result.error);
  console.log("Network Error:", result.error.networkError);
  console.log("GraphQL Errors:", result.error.graphQLErrors);
}
```

**Step 2: Check Saleor Errors**
```typescript
if (result.data?.{mutation}?.errors) {
  console.log("Saleor Errors:", result.data.{mutation}.errors);
}
```

**Step 3: Verify Input**
```typescript
console.log("Input:", JSON.stringify(input, null, 2));
// Compare with Saleor schema requirements
```

**Step 4: Check Permissions**
```bash
# Test with admin token
pnpm deploy --token <admin-token>
```

**Step 5: Check Saleor Version**
```bash
# Verify schema version matches
cat package.json | grep schemaVersion
# Compare with Saleor instance version
```

---

## 11. Best Practices Summary

### 11.1 Repository Layer

**✅ DO:**
- Use dual error checking pattern
- Return `null` for "not found" (queries)
- Throw `GraphQLError` for failures (mutations)
- Log successful operations
- Extract types with `ResultOf` and `VariablesOf`
- Request only needed fields

**❌ DON'T:**
- Check only `result.error`
- Check only `errors` array
- Throw errors for "not found" queries
- Log sensitive data (tokens)
- Request all fields by default
- Mix business logic in repository

### 11.2 GraphQL Operations

**✅ DO:**
- Define operations as constants
- Use gql.tada `graphql()` function
- Include `errors` field in mutations
- Use meaningful variable names
- Paginate large lists
- Use fragments for repeated fields

**❌ DON'T:**
- Define queries inline
- Forget `errors` field in mutations
- Fetch all entities without pagination
- Use generic variable names (`$input`)
- Over-nest queries (>3 levels)
- Duplicate field selections

### 11.3 Error Handling

**✅ DO:**
- Use `GraphQLError.fromGraphQLErrors()`
- Include context in error messages
- Log errors with full details
- Provide actionable hints to users
- Handle both error types

**❌ DON'T:**
- Use generic error messages
- Log errors without context
- Expose GraphQL details to users
- Silently swallow errors
- Assume only one error type

### 11.4 Type Safety

**✅ DO:**
- Let gql.tada infer types
- Use `ResultOf<T>` for return types
- Use `VariablesOf<T>` for input types
- Enable strict TypeScript
- Run typecheck before commit

**❌ DON'T:**
- Use `any` type
- Manually define GraphQL types
- Ignore TypeScript errors
- Cast types unnecessarily
- Skip type checking

---

## 12. Quick Reference

### 12.1 Common Imports

```typescript
// URQL
import { type Client } from "@urql/core";

// gql.tada
import { 
  graphql, 
  type ResultOf, 
  type VariablesOf,
  type TadaDocumentNode 
} from "gql.tada";

// Errors
import { GraphQLError } from "../../lib/errors/graphql-error";

// Logging
import { logger } from "../../lib/logger";
```

### 12.2 Repository Template

```typescript
export class {Entity}Repository {
  constructor(private client: Client) {}
  
  // Query: List
  async get{Entities}(): Promise<Entity[]> {
    const result = await this.client.query(query, {});
    return result.data?.{entities} ?? [];
  }
  
  // Query: Single
  async get{Entity}BySlug(slug: string): Promise<Entity | null> {
    const result = await this.client.query(query, { slug });
    return result.data?.{entity} ?? null;
  }
  
  // Mutation: Create
  async create{Entity}(input: Input): Promise<Entity> {
    const result = await this.client.mutation(mutation, { input });
    
    if (!result.data?.{entity}Create?.{entity}) {
      throw GraphQLError.fromGraphQLErrors(
        result.error?.graphQLErrors ?? [],
        `Failed to create {entity}`
      );
    }
    
    logger.info("{Entity} created", { id: result.data.{entity}Create.{entity}.id });
    return result.data.{entity}Create.{entity};
  }
}
```

### 12.3 Useful Commands

```bash
# Fetch latest Saleor schema
pnpm fetch-schema

# Type check (triggers gql.tada generation)
pnpm typecheck

# Build (includes type generation)
pnpm build

# Test with debug logging
LOG_LEVEL=debug pnpm deploy

# Test specific module
pnpm test src/modules/channel
```

### 12.4 File Locations

| Purpose | Location |
|---------|----------|
| URQL Client | `src/lib/graphql/client.ts` |
| Schema File | `src/lib/graphql/schema.graphql` |
| Generated Types | `src/lib/graphql/graphql-env.d.ts` |
| GraphQL Error | `src/lib/errors/graphql-error.ts` |
| Example Repository | `src/modules/channel/repository.ts` |
| Example Service | `src/modules/channel/channel-service.ts` |

---

**Last Updated:** 2025-01-12
**Version:** 1.0
**Related Memories:**
- `configurator_architecture_deep_dive` - Complete architecture overview
- `saleor_api_patterns` - Saleor-specific API patterns and quirks
- `project_overview` - High-level project information
