# Saleor Configurator - GraphQL Implementation Guide

This guide is designed for AI assistants to understand and extend the GraphQL implementation in the Saleor Configurator. It covers the complete flow from YAML configuration to GraphQL operations.

## Table of Contents
- [GraphQL Architecture Overview](#graphql-architecture-overview)
- [Implementation Patterns](#implementation-patterns)
- [Mapping Between Layers](#mapping-between-layers)
- [Current Schema Coverage](#current-schema-coverage)
- [Step-by-Step: Adding a New Entity](#step-by-step-adding-a-new-entity)
- [Common Patterns & Solutions](#common-patterns--solutions)
- [Future Enhancement Opportunities](#future-enhancement-opportunities)

## GraphQL Architecture Overview

### Technology Stack
- **gql.tada**: Type-safe GraphQL with TypeScript integration
- **@urql/core**: Lightweight GraphQL client
- **Saleor GraphQL v3.20**: E-commerce API schema
- **Zod**: Runtime validation that maps to GraphQL inputs

### Architecture Flow
```
YAML Config → Zod Schema → Service Layer → Repository → GraphQL Client → Saleor API
     ↓            ↓             ↓              ↓              ↓              ↓
  User Input   Validation   Business Logic  GraphQL Ops   Type Safety    Response
```

### Key Files & Locations
```
src/
├── lib/
│   └── graphql/
│       ├── client.ts          # URQL client setup
│       ├── errors.ts          # GraphQL error handling
│       ├── index.ts           # graphql template tag export
│       └── schema.graphql     # Saleor schema (v3.20)
├── modules/
│   ├── [entity]/
│   │   ├── repository.ts      # GraphQL operations
│   │   ├── [entity]-service.ts # Business logic
│   │   └── errors.ts          # Entity-specific errors
│   └── config/
│       └── schema/
│           └── schema.ts      # Zod schemas for YAML
```

### Type Generation Setup
```typescript
// In graphql-env.d.ts (auto-generated)
declare module 'gql.tada' {
  interface setupSchema {
    schema: import('./src/lib/graphql/schema.graphql').Schema;
  }
}
```

## Implementation Patterns

### 1. Define GraphQL Operation (Repository)

```typescript
import { graphql, ResultOf, VariablesOf } from "@/lib/graphql";

// Query Example
const getProductBySlugQuery = graphql(`
  query GetProductBySlug($slug: String!) {
    product(slug: $slug) {
      id
      name
      slug
      description
      productType {
        id
        name
      }
      category {
        id
        name
      }
      attributes {
        attribute {
          id
          slug
          name
        }
        values {
          id
          name
          slug
        }
      }
    }
  }
`);

// Mutation Example
const createProductMutation = graphql(`
  mutation CreateProduct($input: ProductCreateInput!) {
    productCreate(input: $input) {
      product {
        id
        name
        slug
      }
      errors {
        field
        code
        message
      }
    }
  }
`);
```

### 2. Extract TypeScript Types

```typescript
// Extract input types
export type ProductCreateInput = VariablesOf<
  typeof createProductMutation
>["input"];

// Extract response types - handle nullable responses
export type Product = NonNullable<
  ResultOf<typeof getProductBySlugQuery>["product"]
>;

// For mutations with errors
type CreateProductResult = ResultOf<typeof createProductMutation>["productCreate"];
export type ProductCreateErrors = CreateProductResult["errors"];
```

### 3. Implement Repository Interface

```typescript
export interface ProductRepository {
  createProduct(input: ProductCreateInput): Promise<Product>;
  getProductBySlug(slug: string): Promise<Product | null>;
  updateProduct(id: string, input: ProductUpdateInput): Promise<Product>;
  // ... other methods
}

export class ProductGraphQLRepository implements ProductRepository {
  constructor(private client: GraphQLClient) {}

  async createProduct(input: ProductCreateInput): Promise<Product> {
    const result = await this.client.request(createProductMutation, { input });
    
    // Check for GraphQL errors
    if (result.error) {
      throw GraphQLError.fromClientError(
        result.error,
        "Failed to create product"
      );
    }
    
    // Check for business logic errors
    const { product, errors } = result.data?.productCreate ?? {};
    
    if (errors && errors.length > 0) {
      throw GraphQLError.fromMutationErrors(
        errors,
        "Product creation failed"
      );
    }
    
    if (!product) {
      throw new Error("Product creation returned no data");
    }
    
    return product;
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    const result = await this.client.request(getProductBySlugQuery, { slug });
    
    if (result.error) {
      // 404s are expected - return null
      if (GraphQLError.isNotFoundError(result.error)) {
        return null;
      }
      throw GraphQLError.fromClientError(
        result.error,
        `Failed to fetch product: ${slug}`
      );
    }
    
    return result.data?.product ?? null;
  }
}
```

### 4. Service Layer Implementation

```typescript
export class ProductService {
  constructor(
    private productRepository: ProductRepository,
    private productTypeService: ProductTypeService,
    private logger = createLogger("ProductService")
  ) {}

  async createProduct(input: ProductInput): Promise<void> {
    this.logger.debug("Creating product", { name: input.name });
    
    // Check if product exists
    const existing = await this.productRepository.getProductBySlug(
      this.generateSlug(input.name)
    );
    
    if (existing) {
      this.logger.debug("Product already exists", { id: existing.id });
      return;
    }
    
    // Get product type ID
    const productType = await this.productTypeService.ensureProductType(
      input.productType
    );
    
    // Transform Zod input to GraphQL input
    const createInput: ProductCreateInput = {
      name: input.name,
      slug: this.generateSlug(input.name),
      productType: productType.id,
      category: await this.getCategoryId(input.category),
      description: input.description,
      attributes: this.transformAttributes(input.attributes),
    };
    
    await this.productRepository.createProduct(createInput);
    this.logger.info("Product created", { name: input.name });
  }
  
  private transformAttributes(
    attributes?: Record<string, string | string[]>
  ): AttributeValueInput[] {
    if (!attributes) return [];
    
    return Object.entries(attributes).map(([slug, value]) => ({
      id: slug, // Assuming slug is used as reference
      values: Array.isArray(value) ? value : [value],
    }));
  }
}
```

## Mapping Between Layers

### Zod Schema → GraphQL Input Mapping

```typescript
// Zod Schema (from schema.ts)
const productSchema = z.object({
  name: z.string(),
  productType: z.string(),        // Reference by name
  category: z.string(),           // Reference by name
  description: z.string().optional(),
  attributes: z.record(           // Flexible attribute structure
    z.union([z.string(), z.array(z.string())])
  ).optional(),
  channelListings: z.array(productChannelListingSchema).optional(),
  variants: z.array(productVariantSchema),
});

// GraphQL Input Type (from Saleor)
input ProductCreateInput {
  name: String!
  slug: String
  productType: ID!               // Requires ID, not name
  category: ID                   // Requires ID, not name
  description: JSONString
  attributes: [AttributeValueInput!]
}

// Transformation in Service Layer
const transformToGraphQL = (zodInput: ProductInput): ProductCreateInput => {
  return {
    name: zodInput.name,
    slug: generateSlug(zodInput.name),
    productType: await getProductTypeId(zodInput.productType),
    category: await getCategoryId(zodInput.category),
    description: zodInput.description ? 
      JSON.stringify(zodInput.description) : undefined,
    attributes: transformAttributes(zodInput.attributes),
  };
};
```

### Special Cases & Transformations

#### 1. Reference Attributes
```typescript
// Zod: Simple string reference
attributes: { "brand": "Nike" }

// GraphQL: Needs entity type context
{
  slug: "brand",
  inputType: "REFERENCE",
  entityType: "PRODUCT",
  values: ["product-id-for-nike"]
}
```

#### 2. Rich Text Attributes
```typescript
// Zod: Plain string
description: "Product description"

// GraphQL: JSON string
description: JSON.stringify({
  blocks: [{
    type: "paragraph",
    data: { text: "Product description" }
  }]
})
```

#### 3. Multi-value Attributes
```typescript
// Zod: String array
attributes: { "colors": ["red", "blue"] }

// GraphQL: Values array
{
  id: "color-attribute-id",
  values: ["red", "blue"]
}
```

## Current Schema Coverage

### ✅ Fully Implemented Entities

| Entity | Create | Update | Delete | Query | List | Special Features |
|--------|--------|--------|--------|-------|------|-----------------|
| **Shop** | - | ✅ | - | ✅ | - | Global settings only |
| **Channel** | ✅ | ✅ | ❌ | ✅ | ✅ | Full settings support |
| **Attribute** | ✅ | ✅ | ❌ | ✅ | ✅ | All input types |
| **ProductType** | ✅ | ✅ | ❌ | ✅ | ✅ | Attribute assignment |
| **PageType** | ✅ | ✅ | ❌ | ✅ | ✅ | Attribute assignment |
| **Category** | ✅ | ❌ | ❌ | ✅ | ✅ | Hierarchy support |

### ⚠️ Partially Implemented Entities

| Entity | Create | Update | Delete | Query | List | Missing Features |
|--------|--------|--------|--------|-------|------|-----------------|
| **Product** | ✅ | ⚠️ | ❌ | ✅ | ❌ | Channel listings, media |
| **ProductVariant** | ✅ | ⚠️ | ❌ | ❌ | ❌ | Bulk operations, stock |

### ❌ Not Implemented (But Available in Saleor)

- **Collections**: Product groupings for marketing
- **Warehouses & Stock**: Inventory management
- **Shipping Methods**: Delivery options
- **Payment Gateways**: Payment processing
- **Taxes**: Tax rates and classes
- **Vouchers & Sales**: Discounts and promotions
- **Menus**: Navigation structure
- **Pages**: CMS content
- **Translations**: Multi-language support
- **Webhooks**: Event notifications
- **Apps & Permissions**: Access control
- **Gift Cards**: Store credit
- **Customer Groups**: Segmentation
- **Export/Import**: Bulk data operations

## Step-by-Step: Adding a New Entity

Let's add support for **Collections** as an example:

### 1. Add Zod Schema
```typescript
// In schema.ts
const collectionSchema = z.object({
  name: z.string().describe("Collection.name"),
  slug: z.string().optional().describe("Collection.slug"),
  description: z.string().optional().describe("Collection.description"),
  products: z.array(z.string()).optional().describe("Products in collection"),
  published: z.boolean().optional().default(true),
  publicationDate: z.string().optional(), // ISO date
});

// Add to main config schema
export const configSchema = z.object({
  // ... existing fields
  collections: z.array(collectionSchema).optional().describe("Collection"),
});
```

### 2. Create Repository
```typescript
// src/modules/collection/repository.ts
import { graphql, ResultOf, VariablesOf } from "@/lib/graphql";
import type { GraphQLClient } from "@/lib/graphql/client";

const createCollectionMutation = graphql(`
  mutation CreateCollection($input: CollectionCreateInput!) {
    collectionCreate(input: $input) {
      collection {
        id
        name
        slug
      }
      errors {
        field
        code
        message
      }
    }
  }
`);

const getCollectionBySlugQuery = graphql(`
  query GetCollectionBySlug($slug: String!, $channel: String!) {
    collection(slug: $slug, channel: $channel) {
      id
      name
      slug
      products(first: 100) {
        edges {
          node {
            id
          }
        }
      }
    }
  }
`);

export type CollectionCreateInput = VariablesOf<
  typeof createCollectionMutation
>["input"];

export type Collection = NonNullable<
  ResultOf<typeof getCollectionBySlugQuery>["collection"]
>;

export interface CollectionRepository {
  createCollection(input: CollectionCreateInput): Promise<Collection>;
  getCollectionBySlug(slug: string, channel: string): Promise<Collection | null>;
  addProductsToCollection(id: string, productIds: string[]): Promise<void>;
}

export class CollectionGraphQLRepository implements CollectionRepository {
  constructor(private client: GraphQLClient) {}
  
  // Implementation following the same pattern as ProductRepository
}
```

### 3. Create Service
```typescript
// src/modules/collection/collection-service.ts
export class CollectionService {
  constructor(
    private collectionRepository: CollectionRepository,
    private productService: ProductService,
    private logger = createLogger("CollectionService")
  ) {}
  
  async createCollection(input: CollectionInput): Promise<void> {
    const slug = input.slug || this.generateSlug(input.name);
    
    // Check existence
    const existing = await this.collectionRepository.getCollectionBySlug(
      slug,
      "default-channel"
    );
    
    if (existing) {
      await this.updateCollection(existing.id, input);
      return;
    }
    
    // Create collection
    const createInput: CollectionCreateInput = {
      name: input.name,
      slug,
      description: input.description,
      isPublished: input.published,
      publicationDate: input.publicationDate,
    };
    
    const collection = await this.collectionRepository.createCollection(
      createInput
    );
    
    // Add products if specified
    if (input.products?.length) {
      const productIds = await this.resolveProductIds(input.products);
      await this.collectionRepository.addProductsToCollection(
        collection.id,
        productIds
      );
    }
  }
  
  private async resolveProductIds(productRefs: string[]): Promise<string[]> {
    // Convert product names/slugs to IDs
    const ids = await Promise.all(
      productRefs.map(ref => this.productService.getProductId(ref))
    );
    return ids.filter((id): id is string => id !== null);
  }
}
```

### 4. Add to Configurator
```typescript
// In configurator.ts
export class Configurator {
  async push(config: SaleorConfig): Promise<void> {
    // ... existing steps
    
    // Add collections after products
    if (config.collections) {
      await this.createCollections(config.collections);
    }
  }
  
  private async createCollections(collections: CollectionInput[]): Promise<void> {
    const progress = new BulkOperationProgress(
      "collection",
      collections.length
    );
    
    for (const collection of collections) {
      try {
        await this.collectionService.createCollection(collection);
        progress.increment();
      } catch (error) {
        progress.addError(`Failed to create collection: ${collection.name}`);
      }
    }
    
    progress.finish();
  }
}
```

### 5. Add Tests
```typescript
// src/modules/collection/collection-service.test.ts
describe("CollectionService", () => {
  let service: CollectionService;
  let mockRepository: MockedObject<CollectionRepository>;
  
  beforeEach(() => {
    mockRepository = {
      createCollection: vi.fn(),
      getCollectionBySlug: vi.fn(),
      addProductsToCollection: vi.fn(),
    };
    
    service = new CollectionService(mockRepository, mockProductService);
  });
  
  it("should create collection with products", async () => {
    // Test implementation
  });
});
```

## Common Patterns & Solutions

### Pattern 1: Idempotent Operations
```typescript
// Always check existence before creating
const existing = await repository.findBySlug(slug);
if (existing) {
  return this.update(existing.id, input);
}
```

### Pattern 2: Reference Resolution
```typescript
// Convert names to IDs
private async resolveReferences(name: string): Promise<string> {
  const entity = await this.repository.findByName(name);
  if (!entity) {
    throw new NotFoundError(`Entity not found: ${name}`);
  }
  return entity.id;
}
```

### Pattern 3: Batch Operations
```typescript
// Process in chunks to avoid timeouts
const BATCH_SIZE = 50;
for (let i = 0; i < items.length; i += BATCH_SIZE) {
  const batch = items.slice(i, i + BATCH_SIZE);
  await this.processBatch(batch);
}
```

### Pattern 4: Error Context
```typescript
// Provide helpful error messages
catch (error) {
  if (GraphQLError.isPermissionError(error)) {
    throw new Error(
      `Permission denied. Ensure your API token has MANAGE_PRODUCTS permission.`
    );
  }
  throw error;
}
```

### Pattern 5: Progress Tracking
```typescript
// Use BulkOperationProgress for user feedback
const progress = new BulkOperationProgress("product", products.length);
for (const product of products) {
  try {
    await this.create(product);
    progress.increment();
  } catch (error) {
    progress.addError(`Failed: ${product.name}`);
  }
}
progress.finish();
```

## Future Enhancement Opportunities

### Priority 1: Complete Core Commerce Features
1. **Fix Product Channel Listings**: Implement `productChannelListingUpdate`
2. **Add Collections**: Group products for merchandising
3. **Implement Warehouses & Stock**: Inventory management
4. **Add Delete Operations**: Clean up test data

### Priority 2: Enhanced Features
1. **Bulk Operations**: Use Saleor's bulk mutations for performance
2. **Media Management**: Product images and documents
3. **SEO Metadata**: Improve search visibility
4. **Translations**: Multi-language support

### Priority 3: Advanced Features
1. **Webhooks**: Real-time event notifications
2. **Custom Apps**: Extend Saleor functionality
3. **Import/Export**: Bulk data operations
4. **Promotions**: Sales and voucher management

### Performance Optimizations
1. **Implement Pagination**: Handle large datasets properly
2. **Concurrent Operations**: Process independent entities in parallel
3. **Caching**: Cache reference lookups (IDs for names)
4. **Batch Queries**: Combine multiple queries where possible

### GraphQL Advanced Features
1. **Subscriptions**: Real-time updates
2. **Fragments**: Reusable query parts
3. **Persisted Queries**: Reduce payload size
4. **Field Aliases**: Fetch multiple variants in one query

## Key Takeaways for AI Assistants

1. **Always Follow the Pattern**: Repository → Service → Configurator
2. **Type Safety First**: Use gql.tada's type extraction utilities
3. **Handle Errors Gracefully**: Provide context and recovery hints
4. **Think Idempotently**: Operations should be safe to run multiple times
5. **User Experience**: Show progress, handle failures gracefully
6. **Test Everything**: Repository mocks, service logic, edge cases

When implementing new features:
- Start with the Zod schema in `schema.ts`
- Create repository with GraphQL operations
- Implement service with business logic
- Add to configurator's push method
- Write comprehensive tests
- Update this guide with new patterns

This architecture ensures consistency, type safety, and maintainability as the configurator grows to support more Saleor features.