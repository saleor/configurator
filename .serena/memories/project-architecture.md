# Saleor Configurator - Project Architecture

## What is This Project?

A "commerce as code" CLI tool for managing Saleor e-commerce configuration declaratively via YAML files.

**Core Commands:**
- `introspect` - Download remote Saleor config to local YAML
- `deploy` - Apply local YAML to remote Saleor instance
- `diff` - Compare local vs remote configuration
- `start` - Interactive setup wizard

## Key Directories

```
src/
├── cli/                    # CLI commands and user interface
│   ├── commands/           # Command implementations (introspect, deploy, diff)
│   ├── console.ts          # Output formatting (chalk, ora)
│   └── reporters/          # Result formatting
├── core/
│   └── diff/
│       └── comparators/    # Entity comparison logic
├── lib/
│   ├── errors/             # Error types (BaseError, GraphQLError)
│   └── graphql/
│       └── client.ts       # urql client configuration
├── modules/
│   ├── config/
│   │   └── schema/         # Zod schemas (source of truth)
│   ├── deployment/         # Deployment pipeline stages
│   └── <entity>/           # Per-entity modules
│       ├── operations.ts   # GraphQL operations (gql.tada)
│       ├── repository.ts   # Data access layer
│       ├── service.ts      # Business logic
│       └── *.test.ts       # Tests
└── test-helpers/           # Test utilities, builders
```

## Entity Modules Pattern

Each entity follows consistent structure:

```typescript
// operations.ts - GraphQL with gql.tada
export const GetEntitiesQuery = graphql(`...`);
export const BulkCreateMutation = graphql(`...`);

// repository.ts - Data access
export class EntityRepository {
  constructor(private client: Client) {}
  async findAll(): Promise<Entity[]> { ... }
  async bulkCreate(inputs: EntityInput[]): Promise<BulkResult> { ... }
}

// service.ts - Business logic
export class EntityService {
  constructor(private repository: EntityRepository) {}
  async sync(configs: EntityConfig[]): Promise<SyncResult> { ... }
}
```

## Supported Entity Types

| Entity | Identifier | Module Location |
|--------|------------|-----------------|
| Categories | `slug` | `src/modules/category/` |
| Channels | `slug` | `src/modules/channel/` |
| Product Types | `name` | `src/modules/product-type/` |
| Page Types | `name` | `src/modules/page-type/` |
| Attributes | `name` | `src/modules/attribute/` |
| Tax Classes | `name` | `src/modules/tax/` |
| Warehouses | `slug` | `src/modules/warehouse/` |
| Shipping Zones | `name` | `src/modules/shipping/` |
| Menus | `slug` | `src/modules/menu/` |

## Type Flow (Critical Pattern)

```
Saleor schema.graphql
    ↓ (fetch-schema)
gql.tada query/mutation
    ↓ (ResultOf<>)
Zod validation schema
    ↓ (z.infer<>)
Domain TypeScript type
```

**Never manually define types** - always infer from Zod schemas.
