# Saleor API Patterns and Quirks

## Executive Summary

This guide documents Saleor-specific API behaviors, quirks, and patterns discovered through integration work with the Configurator. Understanding these patterns is critical for successful Saleor API integration and avoiding common pitfalls.

**Saleor Version:** 3.20  
**GraphQL Endpoint:** `https://{your-store}.saleor.cloud/graphql/`

**Key Learnings:**
- Dual error checking (URQL + Saleor business errors)
- UNIQUE error code for duplicate entities
- Cursor-based pagination with edges/nodes
- Bearer token authentication with permission scopes
- Fuzzy search requires exact match filtering
- Channel-based architecture affects all operations

---

## 1. Authentication & Authorization

### 1.1 Bearer Token Authentication

**Token Format:**
```
Authorization: Bearer {token}
```

**Alternative Header** (for proxy scenarios):
```
Authorization-Bearer: {token}
```

**Token Structure:**  
Saleor uses JSON Web Tokens (JWT) signed with RS256 algorithm.

**Token Fields:**
```json
{
  "iat": 1678901234,           // Issued at
  "owner": "saleor",
  "iss": "https://...",         // Issuer
  "exp": 1678987634,           // Expires
  "token": "YbE8g7...",        // Token ID
  "email": "admin@example.com",
  "type": "access",
  "user_id": "VXNlcjo...",
  "is_staff": true
}
```

**Token Verification:**
1. **JWKS Method:** Fetch JSON Web Key Set from `https://{your-domain}/.well-known/jwks.json`
2. **GraphQL Method:** Use mutation to verify token

**Example Token:**
```
YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs
```

**Security:**
- Always transmitted over HTTPS
- No "Bearer" prefix in token itself (added by auth exchange)
- Token should not be logged in production
- Token has expiration time (check `exp` field)

### 1.2 Permission System

**Permission Scopes:**

Saleor uses granular permission scopes. Common permissions used by Configurator:

| Permission | Purpose | Entities Affected |
|------------|---------|-------------------|
| `MANAGE_PRODUCTS` | Create/update/delete products | Products, variants, media |
| `MANAGE_PRODUCT_TYPES_AND_ATTRIBUTES` | Manage product types | Product types, attributes |
| `MANAGE_CHANNELS` | Manage sales channels | Channels |
| `MANAGE_ORDERS` | Manage orders | Orders, fulfillments |
| `MANAGE_PAGES` | Manage CMS pages | Pages, page types |
| `MANAGE_MENUS` | Manage navigation | Menus, menu items |
| `MANAGE_SETTINGS` | Manage shop settings | Shop configuration |
| `MANAGE_SHIPPING` | Manage shipping | Shipping zones, methods |
| `MANAGE_TAXES` | Manage tax configuration | Tax classes, rates |
| `MANAGE_APPS` | Manage Saleor apps | Apps, webhooks |
| `MANAGE_STAFF` | Manage staff users | Users, permissions |

**Permission Checking:**

Saleor checks permissions at the GraphQL resolver level. If insufficient permissions:

```json
{
  "errors": [
    {
      "message": "You need one of the following permissions: MANAGE_PRODUCTS",
      "extensions": {
        "exception": {
          "code": "PermissionDenied"
        }
      }
    }
  ]
}
```

**App vs User Permissions:**

**For Saleor Apps:**
- Apps have two-stage auth: authentication + authorization
- App scope = intersection of app permissions AND user permissions
- Apps with required permission can execute queries regardless of user

**Token Generation:**
1. Go to Saleor Dashboard → Configuration → Apps
2. Create new app or use existing
3. Generate token with required permissions
4. Copy token immediately (shown only once)

### 1.3 Authentication Errors

**Pattern Detection:**

**Location:** `src/lib/errors/graphql.ts:172-194`

```typescript
static isForbiddenError(error: CombinedError): boolean {
  // Check GraphQL errors for permission denied
  if (error.graphQLErrors?.length) {
    const hasPermissionError = error.graphQLErrors.some((graphQLError) => {
      const exceptionCode =
        graphQLError.extensions?.exception?.code;
      
      return (
        exceptionCode === "PermissionDenied" ||
        graphQLError.message.includes("need one of the following permissions")
      );
    });
    if (hasPermissionError) return true;
  }
  
  // Fallback: check message
  const message = error.message?.toLowerCase() || "";
  return message.includes("forbidden") || message.includes("403");
}
```

**User-Friendly Message:**

```
Permission Denied

This usually means:
  • Your authentication token doesn't have the required permissions
  • Your token has expired or is invalid

💡 Generate a new token with the required permissions in your Saleor Dashboard

Required permissions: MANAGE_PRODUCTS, MANAGE_CHANNELS
```

**Common Causes:**
1. Token missing required permission scope
2. Token expired (check `exp` field)
3. Token revoked in Dashboard
4. Wrong token for environment (dev token used in prod)

---

## 2. Error Handling

### 2.1 Dual Error Sources

**Critical Pattern:** Saleor returns errors in TWO places:

#### 2.1.1 Transport-Level Errors (`result.error`)

**Source:** URQL/network layer

**Types:**
- Network errors (connection failed, timeout)
- HTTP errors (404, 401, 403, 429, 500)
- GraphQL syntax errors
- Malformed requests

**Example:**
```typescript
{
  error: {
    message: "[Network] request to https://... failed",
    networkError: Error { ... },
    graphQLErrors: []
  }
}
```

#### 2.1.2 Business Logic Errors (`result.data.{mutation}.errors`)

**Source:** Saleor application layer

**Types:**
- Validation errors (required field, invalid format)
- Business rule violations (duplicate slug, constraint)
- Permission errors (at field level)
- State errors (cannot perform action in current state)

**Example:**
```typescript
{
  data: {
    channelCreate: {
      channel: null,  // null when errors present
      errors: [
        {
          field: "slug",
          message: "Channel with this slug already exists",
          code: "UNIQUE"
        }
      ]
    }
  }
}
```

### 2.2 Error Code Enums

**Standard Error Codes:**

| Code | Meaning | Common Cause |
|------|---------|--------------|
| `REQUIRED` | Required field missing | Missing field in input |
| `INVALID` | Invalid value | Wrong format, out of range |
| `UNIQUE` | Uniqueness constraint violated | Duplicate slug, name, SKU |
| `NOT_FOUND` | Entity not found | Referenced entity doesn't exist |
| `GRAPHQL_ERROR` | General GraphQL error | Various issues |
| `DUPLICATED_INPUT_ITEM` | Duplicate in array input | Same item listed twice |
| `ALREADY_EXISTS` | Entity already exists | Attempting to create existing |

**Permission Errors:**
- `FORBIDDEN` - Insufficient permissions (HTTP 403)
- `UNAUTHENTICATED` - No valid authentication (HTTP 401)

**Rate Limiting:**
- HTTP 429 - Too Many Requests

**Entity-Specific Error Codes:**

Each entity type has its own error code enum:
- `ChannelErrorCode`
- `ProductErrorCode`
- `ProductTypeErrorCode`
- `CategoryErrorCode`
- `CollectionErrorCode`
- etc.

**Example:**
```graphql
enum ChannelErrorCode {
  ALREADY_EXISTS
  GRAPHQL_ERROR
  INVALID
  NOT_FOUND
  REQUIRED
  UNIQUE
  CHANNELS_CURRENCY_MUST_BE_THE_SAME
  CHANNEL_WITH_ORDERS
  DUPLICATED_INPUT_ITEM
}
```

### 2.3 UNIQUE Error Pattern

**Most Common Business Error:** Duplicate entities (e.g., slug already exists)

**Pattern:**
```json
{
  "data": {
    "channelCreate": {
      "channel": null,
      "errors": [
        {
          "field": "slug",
          "message": "Channel with this slug already exists",
          "code": "UNIQUE"
        }
      ]
    }
  }
}
```

**Handling in Configurator:**

**Preventative:** Duplicate detection in config validation
```typescript
// src/core/validation/preflight.ts
function scanForDuplicateIdentifiers(config: Config): DuplicateIssue[] {
  const duplicates: DuplicateIssue[] = [];
  
  // Check channels
  const channelSlugs = config.channels?.map(c => c.slug) ?? [];
  const channelDupes = findDuplicates(channelSlugs);
  if (channelDupes.length > 0) {
    duplicates.push({
      entityType: "Channel",
      identifierType: "slug",
      duplicates: channelDupes
    });
  }
  
  // ... check other entities
  
  return duplicates;
}
```

**Reactive:** Deduplicate remote data in comparators
```typescript
// src/core/diff/comparators/base-comparator.ts
protected deduplicateEntities(entities: readonly TEntity[]): readonly TEntity[] {
  const seen = new Set<string>();
  const duplicateNames = new Set<string>();
  const deduplicatedEntities: TEntity[] = [];
  
  for (const entity of entities) {
    const name = this.getEntityName(entity);
    
    if (seen.has(name)) {
      duplicateNames.add(name);
    } else {
      seen.add(name);
      deduplicatedEntities.push(entity);
    }
  }
  
  if (duplicateNames.size > 0) {
    logger.warn(
      `Duplicate ${this.entityType} detected: ${Array.from(duplicateNames).join(", ")}. ` +
      `Using first occurrence only.`
    );
  }
  
  return deduplicatedEntities;
}
```

**Why Both?**
- **Local config:** Strict validation (block deployment)
- **Remote data:** Tolerant deduplication (corrupted state from manual changes)

### 2.4 Error Message Best Practices

**❌ DON'T:**
```typescript
// Generic, unhelpful
throw new Error("Failed");

// Expose GraphQL details
throw new Error(result.error.message);
```

**✅ DO:**
```typescript
// Specific, actionable
throw GraphQLError.fromGraphQLErrors(
  result.error?.graphQLErrors ?? [],
  `Failed to create channel '${input.slug}'. Check if channel already exists.`
);
```

**Message Structure:**
```
{Context}: {Specific Issue}

This usually means:
  • {Most likely cause}
  • {Alternative cause}

💡 {Actionable hint}
```

**Example:**
```
Failed to create channel 'us-store': Permission Denied

This usually means:
  • Your authentication token doesn't have the required permissions
  • Your token has expired or is invalid

💡 Generate a new token with the MANAGE_CHANNELS permission

Required permissions: MANAGE_CHANNELS
```

### 2.5 Rate Limiting

**HTTP 429 Response:**

Saleor may rate limit requests if too many are sent in short period.

**Detection:**

**Location:** `src/lib/errors/graphql.ts:99-108`

```typescript
if (error.response && hasStatus(error.response) && error.response.status === 429) {
  return new GraphQLError(
    `${message}: Rate Limited (429)\n\n` +
    `The API is rate limiting your requests. This usually means:\n` +
    `  • Too many requests sent in a short time period\n` +
    `  • You need to add delays between API calls\n\n` +
    `💡 Wait a few moments and try again, or reduce the number of concurrent operations`
  );
}
```

**Mitigation Strategies:**
1. Add delays between requests (exponential backoff)
2. Batch operations when possible
3. Reduce concurrent operations
4. Cache results to avoid repeat queries

**Current Approach:**
- Sequential operations (no parallelization in deployment)
- Network-only policy (no caching, but ensures fresh data)
- Progress tracking with delays

---

## 3. Pagination

### 3.1 Cursor-Based Pagination

**Saleor Pattern:** Relay-style cursor pagination

**Structure:**
```graphql
query GetProducts {
  products(first: 100, after: "cursor") {
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
      hasPreviousPage
      startCursor
    }
    totalCount
  }
}
```

**Response:**
```json
{
  "data": {
    "products": {
      "edges": [
        {
          "node": {
            "id": "UHJvZHVjdDox",
            "name": "Product 1",
            "slug": "product-1"
          },
          "cursor": "YXJyYXljb25uZWN0aW9uOjA="
        }
      ],
      "pageInfo": {
        "hasNextPage": true,
        "endCursor": "YXJyYXljb25uZWN0aW9uOjk5",
        "hasPreviousPage": false,
        "startCursor": "YXJyYXljb25uZWN0aW9uOjA="
      },
      "totalCount": 250
    }
  }
}
```

### 3.2 Pagination Parameters

| Parameter | Type | Purpose |
|-----------|------|---------|
| `first` | Int | Number of items to fetch (forward) |
| `after` | String | Cursor to start after (forward) |
| `last` | Int | Number of items to fetch (backward) |
| `before` | String | Cursor to end before (backward) |

**Best Practices:**
- Always specify `first` (default may be too large)
- Use `hasNextPage` to check for more data
- Use `endCursor` as next `after` value
- Don't rely on `totalCount` (can be expensive)

### 3.3 Pagination Implementation Pattern

**Configurator Pattern:**

```typescript
async getAllProducts(): Promise<Product[]> {
  const products: Product[] = [];
  let hasNextPage = true;
  let after: string | undefined;
  
  while (hasNextPage) {
    const result = await this.client.query(getProductsQuery, {
      first: 100,  // Page size
      after       // Cursor from previous page
    });
    
    const data = result.data?.products;
    if (!data) break;
    
    // Extract nodes from edges
    products.push(...data.edges.map(e => e.node));
    
    // Check for more pages
    hasNextPage = data.pageInfo.hasNextPage;
    after = data.pageInfo.endCursor ?? undefined;
  }
  
  return products;
}
```

**Key Points:**
- Extract `node` from each `edge`
- Loop until `hasNextPage` is false
- Use `endCursor` as next `after` value
- Handle empty result gracefully

### 3.4 Page Size Guidelines

**Optimal Page Sizes:**

| Entity Type | Recommended Size | Reason |
|-------------|------------------|--------|
| Channels | 100 | Small, fast query |
| Categories | 100 | Small, fast query |
| Product Types | 50 | Medium, includes attributes |
| Products (no variants) | 50 | Medium size |
| Products (with variants) | 20 | Large, many relations |
| Orders | 50 | Medium size |
| Collections | 50 | Medium size |

**Factors:**
- Entity complexity (nested fields)
- Number of relations requested
- Database query cost
- Network payload size

**Performance Impact:**
```
Page size 20:  12 requests × 200ms = 2.4s
Page size 50:   5 requests × 300ms = 1.5s
Page size 100:  3 requests × 500ms = 1.5s
Page size 200:  2 requests × 800ms = 1.6s
```

**Sweet Spot:** 50-100 for most entities

---

## 4. Fuzzy Search Behavior

### 4.1 The Problem

**Saleor's `search` filter uses fuzzy matching:** Returns approximate matches, not exact.

**Example:**
```graphql
query {
  products(filter: { search: "shirt" }) {
    edges {
      node { name }
    }
  }
}
```

**Returns:**
- "T-Shirt"
- "Shirt"
- "Shirtless Wonder"
- "Shirting Material"

**Problem for Configurator:** Can't reliably detect if exact entity exists (for getOrCreate pattern).

### 4.2 The Solution: Exact Match Filtering

**Pattern:**

**Step 1:** Use fuzzy search to get candidates
```typescript
const result = await this.client.query(searchProductQuery, {
  filter: { search: productName }
});
```

**Step 2:** Filter for exact match
```typescript
// Find exact match among search results to prevent duplicate creation
const exactMatch = result.data?.products?.edges
  .map(e => e.node)
  .find(p => p.name.toLowerCase() === productName.toLowerCase());

return exactMatch ?? null;
```

**Configurator Implementation:**

**Location:** `src/modules/product/repository.ts:765`

```typescript
async getProductByName(name: string): Promise<Product | null> {
  const result = await this.client.query(searchProductByNameQuery, {
    filter: { search: name },
    first: 10  // Limit candidates
  });
  
  if (!result.data?.products?.edges) {
    return null;
  }
  
  // Find exact match among search results to prevent duplicate creation
  const exactMatch = result.data.products.edges
    .map(e => e.node)
    .find(p => p.name.toLowerCase() === name.toLowerCase());
  
  return exactMatch ?? null;
}
```

**Why This Works:**
- Fuzzy search returns relevant candidates
- Exact filter finds precise match
- Prevents false positives
- Enables reliable getOrCreate pattern

**Used For:**
- Products (by name)
- Categories (by name)
- Product Types (by name)
- Any entity without unique slug/ID query

### 4.3 Search vs Direct Queries

**When to Use Search + Filter:**
- Entity has no unique identifier query (e.g., by slug)
- Need to check existence by name
- Implementing getOrCreate pattern

**When to Use Direct Query:**
- Entity has slug (channels, products with slugs)
- Entity has ID
- Exact identifier available

**Example Comparison:**

**❌ SLOW: Search + Filter for Channels**
```typescript
// Unnecessary - channels have slug query
const result = await client.query(searchChannelsQuery, {
  filter: { search: "us-store" }
});
const exact = result.data?.channels?.edges
  .map(e => e.node)
  .find(c => c.slug === "us-store");
```

**✅ FAST: Direct Query**
```typescript
// Efficient - use slug query
const result = await client.query(getChannelBySlugQuery, {
  slug: "us-store"
});
return result.data?.channel ?? null;
```

---

## 5. Channel Architecture

### 5.1 Channel Concept

**What is a Channel?**
- Sales channel (e.g., US Store, EU Store, B2B Portal)
- Defines currency, availability, pricing
- All products must be assigned to channels
- Multi-channel support for international stores

**Key Properties:**
```typescript
type Channel = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  currencyCode: string;  // USD, EUR, GBP, etc.
  defaultCountry: string;
  stockSettings: {
    allocationStrategy: string;
  };
};
```

### 5.2 Channel Dependency

**Critical Pattern:** Many entities require channel assignment

**Affected Entities:**
- Products (channel listings)
- Collections (channel availability)
- Vouchers (channel restrictions)
- Promotions (channel application)
- Stock (channel allocation)

**Deployment Order:**
```
1. Channels (first - no dependencies)
2. Product Types
3. Categories
4. Products (requires channels)
5. Collections (requires channels)
```

**Why This Matters:**
- Products without channel assignment are invisible
- Channel must exist before product creation
- Channel deletion affects many entities

### 5.3 Channel Listings

**Pattern:**

When creating products, specify channel listings:

```graphql
mutation CreateProduct($input: ProductCreateInput!) {
  productCreate(input: $input) {
    product {
      id
      name
      channelListings {
        channel { slug }
        isPublished
        publishedAt
        isAvailableForPurchase
        availableForPurchaseAt
      }
    }
  }
}
```

**Input:**
```typescript
{
  name: "Product Name",
  slug: "product-slug",
  productType: "...",
  channelListings: [
    {
      channelId: "Q2hhbm5lbDox",  // Channel ID
      isPublished: true,
      isAvailableForPurchase: true,
      availableForPurchaseAt: null  // Available immediately
    }
  ]
}
```

**Common Issue:**
```
Product created but not visible in storefront
→ Missing channel listing
→ Solution: Add channel listing with isPublished: true
```

### 5.4 Channel ID Resolution

**Problem:** Config uses slugs, API requires IDs

**Pattern:** Cached resolver functions

```typescript
// In ServiceComposer
const channelService = new ChannelService(repositories.channel);

const productService = new ProductService(repositories.product, {
  getChannelIdBySlug: async (slug: string) => {
    return await channelService.getChannelIdBySlugCached(slug);
  }
});
```

**Caching:**
```typescript
class ChannelService {
  private channelCache = new Map<string, string>();  // slug → id
  
  async getChannelIdBySlugCached(slug: string): Promise<string> {
    if (this.channelCache.has(slug)) {
      return this.channelCache.get(slug)!;
    }
    
    const id = await this.getChannelIdBySlug(slug);
    this.channelCache.set(slug, id);
    return id;
  }
}
```

**Benefits:**
- Single query per channel
- Reused across all products
- 90% reduction in API calls

---

## 6. Saleor-Specific Quirks

### 6.1 Immutable Fields

**Pattern:** Some fields cannot be changed after creation

**Examples:**

| Entity | Immutable Fields | Workaround |
|--------|------------------|------------|
| Product | `productType` | Delete and recreate |
| Channel | `currencyCode` | Delete and recreate |
| Attribute | `type` (TEXT, DROPDOWN, etc.) | Delete and recreate |
| Warehouse | Slug (sometimes) | Use ID-based updates |

**Detection:**
```json
{
  "errors": [
    {
      "field": "currencyCode",
      "message": "Cannot change currency code after creation",
      "code": "INVALID"
    }
  ]
}
```

**Configurator Approach:**
- Document immutable fields in schema docs
- Warn users about limitations
- Suggest delete/recreate workflow

### 6.2 Attribute Choices Preflight

**Pattern:** Attributes with choices (DROPDOWN, MULTISELECT, SWATCH) must have choices defined before use

**Problem:**
```yaml
attributes:
  - name: "Color"
    type: DROPDOWN
    choices: []  # Empty!

productTypes:
  - name: "T-Shirt"
    productAttributes:
      - name: "Color"  # ❌ Fails: no choices defined
```

**Solution:** Preflight validation stage

**Location:** `src/core/deployment/stages.ts`

```typescript
const attributeChoicesPreflightStage: DeploymentStage = {
  name: "attribute-choices-preflight",
  displayName: "Attribute Choices Validation",
  dependencies: [],
  
  execute: async (services, config) => {
    // Validate attributes with choices have non-empty choices array
    const invalid = config.attributes?.filter(attr =>
      ["DROPDOWN", "MULTISELECT", "SWATCH"].includes(attr.type) &&
      (!attr.choices || attr.choices.length === 0)
    );
    
    if (invalid && invalid.length > 0) {
      throw new Error(
        `Attributes require choices: ${invalid.map(a => a.name).join(", ")}`
      );
    }
    
    return { success: true };
  }
};
```

### 6.3 Metadata Limitations

**Pattern:** Metadata key-value storage for custom data

**Limitations:**
- Max key length: 256 characters
- Max value length: Variable (depends on entity)
- Keys must be unique per entity
- Not indexed (poor query performance)

**Use Cases:**
- External system IDs
- Custom flags
- Integration data
- Non-searchable attributes

**Example:**
```graphql
mutation UpdateProduct($id: ID!, $metadata: [MetadataInput!]!) {
  productUpdate(id: $id, input: {
    metadata: $metadata
  }) {
    product {
      metadata {
        key
        value
      }
    }
  }
}
```

### 6.4 Variant SKU Uniqueness

**Critical Rule:** Product variant SKUs must be globally unique

**Problem:**
```yaml
products:
  - name: "T-Shirt Blue"
    variants:
      - sku: "SHIRT-001"  # ✓ OK
  
  - name: "T-Shirt Red"
    variants:
      - sku: "SHIRT-001"  # ❌ Duplicate!
```

**Error:**
```json
{
  "errors": [
    {
      "field": "sku",
      "message": "Product variant with this SKU already exists",
      "code": "UNIQUE"
    }
  ]
}
```

**Best Practices:**
- Use product-specific prefix: `{product-slug}-{variant-id}`
- Include color/size in SKU: `SHIRT-BLUE-M`, `SHIRT-RED-L`
- Validate uniqueness before deployment
- Track SKUs in separate system if needed

### 6.5 Media URL Requirements

**Pattern:** Product images and media

**URL Requirements:**
- Must be publicly accessible
- HTTPS recommended
- Supported formats: JPG, PNG, WEBP, GIF
- Max file size: Varies by Saleor instance

**Two Methods:**

**1. External URL (Configurator uses this)**
```graphql
mutation CreateProduct($input: ProductCreateInput!) {
  productCreate(input: $input) {
    product {
      media {
        url
      }
    }
  }
}

# Input
{
  media: {
    url: "https://example.com/image.jpg",
    alt: "Product image"
  }
}
```

**2. File Upload (not used in Configurator)**
```graphql
mutation UploadMedia($file: Upload!) {
  productMediaCreate(product: "...", media: { image: $file }) {
    media { url }
  }
}
```

**Configurator Pattern:**
- Accepts external URLs in config
- Saleor fetches and stores image
- Returns Saleor-hosted URL
- Deduplicates URLs (same URL = same media)

---

## 7. Performance Considerations

### 7.1 Query Complexity

**Saleor has query complexity limits** to prevent abuse

**Complexity Factors:**
- Number of fields requested
- Depth of nested queries
- Number of relations
- Pagination size

**Example:**
```graphql
# Low complexity (10 points)
query {
  products(first: 10) {
    edges {
      node { id name }
    }
  }
}

# High complexity (500+ points)
query {
  products(first: 100) {
    edges {
      node {
        id name description
        variants {
          id sku
          attributes { id name values { name } }
          channelListings { channel { id name } }
        }
        media { url }
        category { id name parent { id name } }
      }
    }
  }
}
```

**If Exceeded:**
```json
{
  "errors": [
    {
      "message": "Query complexity exceeds maximum allowed",
      "extensions": {
        "cost": 1250,
        "maximum": 1000
      }
    }
  ]
}
```

**Mitigation:**
- Request fewer fields
- Reduce page size
- Avoid deep nesting
- Split into multiple queries

### 7.2 N+1 Query Problem

**Anti-Pattern:** Fetching related entities in loop

**❌ BAD:**
```typescript
// Fetch products
const products = await getProducts();

// N+1: One query per product for category
for (const product of products) {
  const category = await getCategoryById(product.categoryId);
  // Process...
}
```

**✅ GOOD:**
```typescript
// Single query with nested fetch
const products = await client.query(graphql(`
  query {
    products {
      edges {
        node {
          id
          name
          category { id name }  // ← Fetched in single query
        }
      }
    }
  }
`));
```

**Configurator Uses:**
- Nested queries for related data
- Batch operations when possible
- Caching for frequently accessed entities

### 7.3 Concurrent Request Limits

**Saleor may limit concurrent requests** from single client

**Symptoms:**
- Intermittent failures
- Timeout errors
- Rate limiting (429)

**Configurator Strategy:**
- Sequential deployment (no parallelization)
- Concurrent diff fetches (read-only, lower impact)
- Exponential backoff on errors

**Future Consideration:**
```typescript
// Limit concurrency with semaphore
const maxConcurrent = 5;
const semaphore = new Semaphore(maxConcurrent);

await Promise.all(
  items.map(item =>
    semaphore.acquire().then(async (release) => {
      try {
        await processItem(item);
      } finally {
        release();
      }
    })
  )
);
```

---

## 8. Testing Against Saleor API

### 8.1 Test Environment Setup

**Options:**

**1. Saleor Cloud Sandbox**
- Free tier available
- Fully managed
- Latest version
- URL: `https://{sandbox-name}.saleor.cloud/graphql/`

**2. Local Saleor**
- Full control
- Offline development
- Custom configuration
- Requires Docker/PostgreSQL

**3. Dedicated Test Instance**
- Isolated from production
- Persistent data
- Realistic testing

**Recommendation:** Saleor Cloud sandbox for quick testing, dedicated instance for CI/CD

### 8.2 GraphQL Playground

**Access:** Navigate to GraphQL endpoint in browser

**URL:** `https://{your-store}.saleor.cloud/graphql/`

**Setup:**
1. Add HTTP Header:
   ```json
   {
     "Authorization": "Bearer {your-token}"
   }
   ```

2. Write query/mutation

3. Execute and inspect response

**Example:**
```graphql
query {
  me {
    email
    isStaff
  }
  
  channels {
    id
    slug
    name
  }
}
```

**Benefits:**
- Test queries before implementation
- Inspect schema (Documentation Explorer)
- Debug errors with real responses
- Understand data structure

### 8.3 Common Test Scenarios

**1. Permission Testing**
```graphql
# Test with token missing MANAGE_PRODUCTS
mutation {
  productCreate(input: {
    name: "Test"
    productType: "..."
  }) {
    product { id }
    errors { message code }
  }
}

# Expected: Permission denied error
```

**2. Duplicate Detection**
```graphql
# Create channel
mutation {
  channelCreate(input: {
    name: "US Store"
    slug: "us-store"
    currencyCode: "USD"
  }) {
    channel { id }
  }
}

# Try again with same slug
# Expected: UNIQUE error
```

**3. Fuzzy Search Behavior**
```graphql
query {
  products(filter: { search: "shirt" }, first: 10) {
    edges {
      node {
        name
      }
    }
  }
}

# Observe which products match
```

**4. Pagination**
```graphql
query {
  products(first: 2) {
    edges {
      node { name }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}

# Then use endCursor
query {
  products(first: 2, after: "{endCursor}") {
    edges {
      node { name }
    }
  }
}
```

---

## 9. Troubleshooting Guide

### 9.1 Common Issues & Solutions

#### Issue: "Permission Denied"

**Symptoms:**
```
You need one of the following permissions: MANAGE_PRODUCTS
```

**Causes:**
1. Token missing required permission
2. Token expired
3. Using wrong token (dev vs prod)

**Solutions:**
1. Regenerate token with correct permissions
2. Verify token in GraphQL Playground (`query { me { email } }`)
3. Check token expiration (`jwt.io` to decode)
4. Ensure using correct environment URL + token pair

#### Issue: "Channel with this slug already exists"

**Symptoms:**
```json
{
  "errors": [
    {
      "field": "slug",
      "message": "Channel with this slug already exists",
      "code": "UNIQUE"
    }
  ]
}
```

**Causes:**
1. Channel already exists from previous deployment
2. Manual creation in Dashboard
3. Duplicate in config file

**Solutions:**
1. Use `getOrCreate` pattern (check existence first)
2. Run `introspect` to see existing channels
3. Run preflight validation to catch config duplicates
4. Delete existing channel if safe

#### Issue: "Product not visible in storefront"

**Symptoms:**
- Product created successfully (API)
- Not showing in storefront
- No errors

**Causes:**
1. Missing channel listing
2. `isPublished: false`
3. `isAvailableForPurchase: false`
4. Channel not active

**Solutions:**
```typescript
// Ensure channel listing
{
  channelListings: [
    {
      channelId: "...",
      isPublished: true,              // ← Required
      isAvailableForPurchase: true,   // ← Required
      publishedAt: new Date().toISOString(),
      availableForPurchaseAt: new Date().toISOString()
    }
  ]
}
```

#### Issue: "Rate limited (429)"

**Symptoms:**
```
Rate Limited (429)
The API is rate limiting your requests
```

**Causes:**
1. Too many requests in short period
2. Parallel operations overload
3. Retry loop without backoff

**Solutions:**
1. Add delays between requests
2. Reduce concurrent operations
3. Implement exponential backoff
4. Batch operations when possible

#### Issue: "Fuzzy search returns wrong products"

**Symptoms:**
- Search for "Shirt" returns "T-Shirt", "Shirtless", etc.
- Can't find exact match
- getOrCreate creates duplicates

**Solutions:**
1. Use exact match filtering (see Section 4.2)
2. Use direct queries when available (by slug/ID)
3. Normalize comparison (lowercase, trim)

### 9.2 Debugging Workflow

**Step 1: Enable Debug Logging**
```bash
LOG_LEVEL=debug pnpm deploy
```

**Step 2: Check Error Type**
```typescript
if (error.networkError) {
  console.log("Network error:", error.networkError);
}

if (error.graphQLErrors?.length) {
  console.log("GraphQL errors:", error.graphQLErrors);
}
```

**Step 3: Test in Playground**
1. Copy failing query/mutation
2. Run in GraphQL Playground with token
3. Inspect response and errors

**Step 4: Verify Token**
```graphql
query {
  me {
    email
    isStaff
    userPermissions { code name }
  }
}
```

**Step 5: Check Saleor Version**
```bash
# In package.json
"saleor": {
  "schemaVersion": "3.20"
}

# Verify matches Saleor instance
```

---

## 10. Best Practices Summary

### 10.1 DO ✅

1. **Always check both error sources**
   ```typescript
   if (!result.data?.mutation.entity) {
     throw GraphQLError.fromGraphQLErrors(
       result.error?.graphQLErrors ?? [],
       "Context message"
     );
   }
   ```

2. **Use exact match filtering for fuzzy search**
   ```typescript
   const candidates = await search(name);
   const exact = candidates.find(c => 
     c.name.toLowerCase() === name.toLowerCase()
   );
   ```

3. **Implement getOrCreate pattern**
   ```typescript
   const existing = await getBySlug(slug);
   if (existing) {
     return await update(existing.id, input);
   }
   return await create(input);
   ```

4. **Validate config for duplicates before deployment**
   ```typescript
   const dupes = scanForDuplicateIdentifiers(config);
   if (dupes.length > 0) {
     throw ValidationError("Duplicates found", dupes);
   }
   ```

5. **Use pagination for all list queries**
   ```typescript
   while (hasNextPage) {
     const result = await query({ first: 100, after });
     // Process...
     hasNextPage = result.pageInfo.hasNextPage;
     after = result.pageInfo.endCursor;
   }
   ```

6. **Cache frequently accessed data**
   ```typescript
   private cache = new Map<string, string>();
   
   async getChannelId(slug: string): Promise<string> {
     if (this.cache.has(slug)) {
       return this.cache.get(slug)!;
     }
     const id = await fetch(slug);
     this.cache.set(slug, id);
     return id;
   }
   ```

7. **Request only needed fields**
   ```graphql
   # ❌ Don't request everything
   query { products { * } }
   
   # ✅ Request specific fields
   query {
     products {
       id name slug
       productType { id }
     }
   }
   ```

8. **Test with GraphQL Playground first**
   - Verify query syntax
   - Test permissions
   - Understand response structure
   - Debug errors interactively

### 10.2 DON'T ❌

1. **Don't check only result.error**
   ```typescript
   // ❌ WRONG: Misses business errors
   if (result.error) {
     throw new Error(result.error.message);
   }
   ```

2. **Don't trust fuzzy search alone**
   ```typescript
   // ❌ WRONG: May return wrong product
   const product = await search("Shirt");
   // "T-Shirt" might be returned
   ```

3. **Don't fetch all without pagination**
   ```typescript
   // ❌ WRONG: May timeout or hit complexity limit
   const allProducts = await query({ first: 10000 });
   ```

4. **Don't ignore UNIQUE errors**
   ```typescript
   // ❌ WRONG: Silent failure
   try {
     await create(input);
   } catch (error) {
     // Ignore duplicate, use existing
   }
   ```

5. **Don't make N+1 queries**
   ```typescript
   // ❌ WRONG: Multiple queries
   for (const product of products) {
     const category = await getCategory(product.categoryId);
   }
   
   // ✅ BETTER: Single query with nesting
   const products = await query(`
     products { category { id name } }
   `);
   ```

6. **Don't expose GraphQL errors to users**
   ```typescript
   // ❌ WRONG: Technical jargon
   throw new Error(result.error.message);
   
   // ✅ BETTER: User-friendly message
   throw GraphQLError.fromGraphQLErrors(
     result.error?.graphQLErrors ?? [],
     "Failed to create channel. Check if it already exists."
   );
   ```

7. **Don't assume field mutability**
   ```typescript
   // Some fields can't be changed after creation
   // Check documentation before assuming update works
   ```

---

## 11. Quick Reference

### 11.1 Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `UNIQUE` | Duplicate entity | Use getOrCreate, check existence |
| `REQUIRED` | Missing field | Add required field to input |
| `INVALID` | Invalid value | Check format, constraints |
| `NOT_FOUND` | Entity missing | Verify ID/slug, check dependencies |
| `FORBIDDEN` | No permission | Regenerate token with permissions |
| `GRAPHQL_ERROR` | Generic error | Check error message for details |

### 11.2 HTTP Status Codes

| Status | Meaning | Cause |
|--------|---------|-------|
| 200 | OK | Success (check data for business errors) |
| 400 | Bad Request | Malformed GraphQL syntax |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Wrong URL (missing /graphql/) |
| 429 | Too Many Requests | Rate limited |
| 500 | Server Error | Saleor internal error |

### 11.3 Common Permissions

```
MANAGE_PRODUCTS
MANAGE_PRODUCT_TYPES_AND_ATTRIBUTES
MANAGE_CHANNELS
MANAGE_ORDERS
MANAGE_PAGES
MANAGE_MENUS
MANAGE_SETTINGS
MANAGE_SHIPPING
MANAGE_TAXES
MANAGE_APPS
MANAGE_STAFF
```

### 11.4 Useful Queries

**Test Authentication:**
```graphql
query {
  me {
    email
    isStaff
    userPermissions { code }
  }
}
```

**List Channels:**
```graphql
query {
  channels {
    id slug name currencyCode
  }
}
```

**Check Product Existence:**
```graphql
query {
  products(filter: { search: "exact-name" }, first: 10) {
    edges {
      node { id name slug }
    }
  }
}
```

---

**Last Updated:** 2025-01-12  
**Version:** 1.0  
**Saleor Version:** 3.20  
**Related Memories:**
- `configurator_architecture_deep_dive` - Complete architecture overview
- `graphql_integration_guide` - URQL and gql.tada patterns
- `project_overview` - High-level project information
