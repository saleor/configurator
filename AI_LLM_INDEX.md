# Saleor Configurator - AI/LLM Documentation Index

## Quick Reference for AI Assistants

This document provides structured information optimized for AI/LLM consumption to understand and work with the Saleor Configurator codebase.

## Project Overview

**Purpose**: Declarative configuration management for Saleor e-commerce platform via GraphQL API.

**Tech Stack**:
- Language: TypeScript
- Runtime: Node.js (>=20)
- Package Manager: pnpm
- Key Libraries: @urql/core, gql.tada, zod, yaml, vitest
- Architecture: Service/Repository pattern with dependency injection

## Core Concepts

### 1. Service Pattern
```typescript
// Pattern: Each module has a service class managing business logic
export class [Entity]Service {
  constructor(
    private readonly repository: [Entity]Repository,
    // ... other service dependencies
  ) {}
  
  async upsert[Entities](inputs: [Entity]Input[]): Promise<[Entity][]>
}
```

### 2. Repository Pattern
```typescript
// Pattern: Each module has a repository handling GraphQL operations
export class [Entity]Repository implements [Entity]Operations {
  constructor(private readonly client: Client) {}
  
  async create[Entity](input: [Entity]CreateInput): Promise<[Entity]>
  async update[Entity](id: string, input: [Entity]UpdateInput): Promise<[Entity]>
  async get[Entity](identifier: string): Promise<[Entity] | null>
}
```

### 3. Module Structure
```
src/modules/[entity]/
├── [entity]-service.ts      # Business logic
├── [entity]-service.test.ts # Unit tests
└── repository.ts            # GraphQL operations
```

## Module Dependency Tree

```
Level 0 (No Dependencies):
- shop
- warehouse
- attribute
- category
- gift-card

Level 1 (Depends on Level 0):
- channel → []
- product-type → [attribute]
- page-type → [attribute]

Level 2 (Depends on Level 0-1):
- collection → [channel]
- tax → [channel]
- shipping → [channel]

Level 3 (Depends on Level 0-2):
- product → [channel, product-type, category, collection, attribute]
- page → [page-type, attribute]
- voucher → [channel, category, collection, product]

Level 4 (Depends on Level 0-3):
- menu → [category, collection, page]

Level 5 (Depends on All):
- translation → [all entities]
```

## Entity Relationships

### Products
- **Requires**: productType (schema), category (optional), collections (optional)
- **Has**: variants, attributes, channelListings, media
- **Referenced by**: vouchers, translations

### Channels
- **Foundation entity**: Most entities have channel-specific settings
- **Controls**: pricing, availability, tax, shipping

### Attributes
- **Types**: PRODUCT_TYPE, PAGE_TYPE
- **Input Types**: DROPDOWN, MULTISELECT, PLAIN_TEXT, RICH_TEXT, NUMERIC, BOOLEAN, DATE, DATE_TIME, FILE, REFERENCE, SWATCH
- **Used by**: products, pages via their types

## Common Operations

### 1. Creating Entities
```typescript
// All services follow upsert pattern
await service.upsert[Entities]([
  { 
    // entity data
    slug: "unique-identifier", // Most entities use slug as identifier
    name: "Display Name",
    // ... specific fields
  }
]);
```

### 2. Relationships
```typescript
// Reference by slug/name
{
  productType: "t-shirt",        // References product type by slug
  category: "clothing",          // References category by slug
  collections: ["summer-2024"],  // References collections by slug
  channelListings: [
    { channel: "default-channel" } // References channel by slug
  ]
}
```

### 3. Error Handling
- All services throw descriptive errors
- GraphQL errors are wrapped with context
- Validation happens at schema level (Zod)

## Configuration Schema

### Root Structure
```yaml
shop: {}                  # Global settings
channels: []              # Sales channels
warehouses: []            # Inventory locations
attributes: []            # Custom fields
productTypes: []          # Product schemas
pageTypes: []             # Page schemas
categories: []            # Product categorization
collections: []           # Product groupings
products: []              # Products and variants
pages: []                 # Content pages
menus: []                 # Navigation
shippingZones: []         # Shipping configuration
taxClasses: []            # Tax categories
taxConfiguration: []      # Channel tax settings
vouchers: []              # Discounts
giftCards: {}             # Gift cards (individual/bulk)
translations: []          # Multi-language content
```

## Testing Patterns

### Service Tests
```typescript
// Mock pattern for services
const mockRepository = {
  createEntity: vi.fn(),
  updateEntity: vi.fn(),
  getEntity: vi.fn(),
} as unknown as EntityRepository;

const service = new EntityService(mockRepository, ...dependencies);
```

### Common Test Scenarios
1. Create when doesn't exist
2. Update when exists
3. Handle missing dependencies
4. Error handling

## GraphQL Patterns

### Query Structure
```graphql
query GetEntity($identifier: String!) {
  entity(slug: $identifier) {
    id
    # ... fields
  }
}
```

### Mutation Structure
```graphql
mutation CreateEntity($input: EntityCreateInput!) {
  entityCreate(input: $input) {
    entity {
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
```

## File Naming Conventions

- Services: `[entity]-service.ts`
- Tests: `[entity]-service.test.ts`
- Repositories: `repository.ts`
- Types/Schema: Embedded in service/repository files

## Environment Configuration

Required variables:
- `GRAPHQL_ENDPOINT`: Saleor GraphQL URL
- `SALEOR_APP_TOKEN`: Authentication token
- `LOG_LEVEL`: Logging verbosity (debug|info|warn|error)

Optional:
- `CONFIG_PATH`: YAML config location (default: ./saleor-config.yml)

## Command Usage

```bash
# Development
pnpm install              # Install dependencies
pnpm test                # Run tests
pnpm run pull            # Pull config from Saleor
pnpm run push            # Push config to Saleor

# With arguments
pnpm run push -- --config ./custom-config.yml
```

## Common Tasks for AI

### Adding a New Entity Module

1. Create module directory: `src/modules/[entity]/`
2. Implement repository with GraphQL operations
3. Implement service with business logic
4. Add tests following existing patterns
5. Update service container
6. Update configurator bootstrap order
7. Update schema in `config/schema.ts`

### Modifying Existing Modules

1. Check dependencies in service container
2. Update both service and repository if needed
3. Update tests
4. Consider impact on dependent modules

### Debugging Issues

1. Check bootstrap order in configurator
2. Verify entity exists (pull from Saleor first)
3. Check GraphQL permissions
4. Enable debug logging: `LOG_LEVEL=debug`

## Type Safety

- All inputs validated by Zod schemas
- GraphQL types generated by gql.tada
- Strict TypeScript configuration
- Runtime validation for API responses

## Performance Considerations

- Batch operations where possible
- Reuse entity lookups within operations
- Channel operations can be expensive
- Translation operations are per-entity

## Security

- API token in environment only
- No credentials in configuration
- All inputs sanitized by GraphQL
- Zod validation prevents injection

## Module-Specific Notes

### Products
- Most complex entity
- Variants require SKU
- Attributes inherited from product type
- Channel listings control visibility

### Translations
- Applied after all entities exist
- Language codes follow ISO standards
- Not all fields are translatable

### Vouchers
- Complex discount rules
- Can target products/categories/collections
- Channel-specific

### Menus
- Recursive structure
- Items can link to categories/collections/pages/URLs

## Integration Points

### GraphQL Client
- Configured in `src/lib/graphql/client.ts`
- Uses URQL with auth exchange
- Handles token authentication

### Configuration
- YAML files parsed and validated
- Schema defined with Zod
- Supports environment variable interpolation

### Logging
- Structured logging with tslog
- Context-aware log messages
- Configurable levels

## Code Quality

- ESLint configuration (if present)
- Prettier formatting
- Comprehensive test coverage
- Type checking with TypeScript

This index is designed to help AI assistants quickly understand the codebase structure, patterns, and conventions when working with the Saleor Configurator. 