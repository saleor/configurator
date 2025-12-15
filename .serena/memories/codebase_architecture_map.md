# Codebase Architecture Map for Saleor Configurator

## Quick Stats

- **Total Source Files:** ~129
- **Total Test Files:** ~73
- **Total Lines of Code:** ~35,000+
- **Programming Language:** TypeScript (strict mode)
- **Primary Directories:** 4 (cli, commands, core, lib, modules)
- **Domain Modules:** 15
- **Largest File:** modules/product/repository.ts (1,284 lines)

---

## Directory Structure Overview

```
src/
├── cli/                    # CLI framework (4 files)
├── commands/               # CLI commands (6 files)
├── core/                   # Core business logic (40+ files)
│   ├── diff/              # Diff engine
│   ├── deployment/        # Deployment pipeline
│   ├── errors/            # Core errors
│   └── validation/        # Validation logic
├── lib/                    # Shared utilities (30+ files)
│   ├── graphql/           # GraphQL client
│   ├── errors/            # Error utilities
│   ├── utils/             # Generic utilities
│   └── constants/         # Constants
└── modules/                # Domain modules (15 modules)
    ├── attribute/
    ├── category/
    ├── channel/
    ├── collection/
    ├── config/            # ⚠️ Special: configuration
    ├── menu/
    ├── model/
    ├── page-type/
    ├── product/           # ⚠️ Complex: 5 files
    ├── product-type/
    ├── shipping-zone/     # ⚠️ Complex: large files
    ├── shop/
    ├── tax/
    └── warehouse/
```

---

## CLI Layer (src/cli/)

**Purpose:** CLI framework and user interaction utilities

| File | Lines | Key Symbols | Serena Command |
|------|-------|-------------|----------------|
| `command.ts` | ~200 | BaseCommand | `find_symbol("BaseCommand", relative_path="src/cli")` |
| `console.ts` | ~150 | Console utilities | `get_symbols_overview("src/cli/console.ts")` |
| `errors.ts` | ~100 | CLI errors | `get_symbols_overview("src/cli/errors.ts")` |
| `progress.ts` | ~100 | Progress indicators | `get_symbols_overview("src/cli/progress.ts")` |

**Navigation Tip:** Small files, can read directly or use overview

---

## Commands Layer (src/commands/)

**Purpose:** Individual CLI command implementations

| Command | File | Lines | Handler | Serena Command |
|---------|------|-------|---------|----------------|
| Deploy | `deploy.ts` | 421 | DeployCommandHandler | `find_symbol("DeployCommandHandler", relative_path="src/commands")` |
| Diff | `diff.ts` | ~300 | DiffCommandHandler | `find_symbol("DiffCommandHandler", relative_path="src/commands")` |
| Introspect | `introspect.ts` | 454 | IntrospectCommandHandler | `find_symbol("IntrospectCommandHandler", relative_path="src/commands")` |
| Start | `start.ts` | ~350 | StartCommandHandler | `find_symbol("StartCommandHandler", relative_path="src/commands")` |

**Structure Pattern:** Each command has:
- `{Command}CommandHandler` class
- `{command}Handler` function as entry point
- Zod schema for validation

**Navigation Tip:** Medium-sized files, use symbol overview first

---

## Core Layer (src/core/)

### Core Root Files

| File | Lines | Purpose | Key Symbols |
|------|-------|---------|-------------|
| `configurator.ts` | ~400 | Main orchestrator | Configurator |
| `factory.ts` | ~300 | Service factory | ServiceFactory |
| `service-container.ts` | ~200 | DI container | ServiceContainer |

### Core/Diff (Diff Engine)

**Purpose:** Compare local vs remote configurations

| Component | Files | Total Lines | Key Pattern |
|-----------|-------|-------------|-------------|
| Service | `service.ts` | 554 | DiffService (17 methods) |
| Comparators | 15 files | ~5,000 | {Entity}Comparator pattern |
| Formatters | 6 files | ~2,000 | {Type}Formatter pattern |

#### Comparators (src/core/diff/comparators/)

| Comparator | File | Lines | Serena Command |
|------------|------|-------|----------------|
| AttributeComparator | `attribute-comparator.ts` | ~300 | `find_symbol("AttributeComparator", relative_path="src/core/diff/comparators")` |
| CategoryComparator | `category-comparator.ts` | ~350 | `find_symbol("CategoryComparator", relative_path="src/core/diff/comparators")` |
| ChannelComparator | `channel-comparator.ts` | ~400 | `find_symbol("ChannelComparator", relative_path="src/core/diff/comparators")` |
| CollectionComparator | `collection-comparator.ts` | ~300 | `find_symbol("CollectionComparator", relative_path="src/core/diff/comparators")` |
| MenuComparator | `menu-comparator.ts` | ~300 | `find_symbol("MenuComparator", relative_path="src/core/diff/comparators")` |
| ModelComparator | `model-comparator.ts` | ~300 | `find_symbol("ModelComparator", relative_path="src/core/diff/comparators")` |
| PageTypeComparator | `page-type-comparator.ts` | ~300 | `find_symbol("PageTypeComparator", relative_path="src/core/diff/comparators")` |
| ProductComparator | `product-comparator.ts` | 445 | `find_symbol("ProductComparator", relative_path="src/core/diff/comparators")` |
| ProductTypeComparator | `product-type-comparator.ts` | ~350 | `find_symbol("ProductTypeComparator", relative_path="src/core/diff/comparators")` |
| ShippingZoneComparator | `shipping-zone-comparator.ts` | ~400 | `find_symbol("ShippingZoneComparator", relative_path="src/core/diff/comparators")` |
| TaxClassComparator | `tax-class-comparator.ts` | ~300 | `find_symbol("TaxClassComparator", relative_path="src/core/diff/comparators")` |
| WarehouseComparator | `warehouse-comparator.ts` | ~300 | `find_symbol("WarehouseComparator", relative_path="src/core/diff/comparators")` |

**Quick Find All:** `find_symbol("Comparator", substring_matching=True, relative_path="src/core/diff/comparators")`

**Pattern:** All implement `EntityComparator` interface with `compare()` method

#### Formatters (src/core/diff/formatters/)

| Formatter | File | Purpose |
|-----------|------|---------|
| BaseFormatter | `base-formatter.ts` | Abstract base |
| DeployFormatter | `deploy-formatter.ts` | Format for deployment |
| DetailedFormatter | `detailed-formatter.ts` | Detailed diff output |
| IntrospectFormatter | `introspect-formatter.ts` | Format for introspection |
| JsonFormatter | `json-formatter.ts` | JSON output |
| SummaryFormatter | `summary-formatter.ts` | Summary output |

**Quick Find All:** `find_symbol("Formatter", substring_matching=True, relative_path="src/core/diff/formatters")`

### Core/Deployment (Deployment Pipeline)

**Purpose:** Execute deployment stages in order

| File | Lines | Symbols | Purpose |
|------|-------|---------|---------|
| `pipeline.ts` | ~400 | DeploymentPipeline | Orchestrates stages |
| `stages.ts` | 615 | 17 stage definitions | Stage configurations |
| `errors.ts` | 425 | Deployment errors | Error handling |
| `results.ts` | ~300 | Result tracking | Track outcomes |

**Navigation Tips:**
- `stages.ts`: Use `find_symbol("{entity}Stage")` or overview
- `pipeline.ts`: Use `find_symbol("DeploymentPipeline", depth=1)`

---

## Lib Layer (src/lib/)

### GraphQL (src/lib/graphql/)

| File | Purpose | Serena Command |
|------|---------|----------------|
| `client.ts` | URQL client setup | `get_symbols_overview("src/lib/graphql/client.ts")` |
| `types.ts` | GraphQL type utilities | `get_symbols_overview("src/lib/graphql/types.ts")` |

### Errors (src/lib/errors/)

| File | Purpose | Key Symbols |
|------|---------|-------------|
| `base-error.ts` | BaseError (abstract) | BaseError |
| `environment-variable-error.ts` | Env var errors | EnvironmentVariableError |
| `graphql-error.ts` | GraphQL errors | GraphQLError |
| `zod-validation-error.ts` | Validation errors | ZodValidationError |

**Quick Find All Errors:** `find_symbol("Error", substring_matching=True, relative_path="src/lib/errors")`

### Utils (src/lib/utils/)

| File | Purpose |
|------|---------|
| `async.ts` | Async utilities |
| `config.ts` | Config utilities |
| `logger.ts` | Logging |
| `retry.ts` | Retry logic |
| `validation.ts` | Validation helpers |

---

## Modules Layer (src/modules/)

### Module Classification

#### ⭐ Standard Modules (3 files each)

**Pattern:** service.ts + repository.ts + errors.ts

| Module | Service Lines | Repository Lines | Complexity |
|--------|---------------|------------------|------------|
| attribute | ~300 | ~400 | Low |
| category | ~300 | ~400 | Low |
| channel | ~300 | ~400 | Low |
| collection | ~300 | ~400 | Low |
| menu | ~300 | ~400 | Low |
| model | ~300 | ~400 | Low |
| page-type | ~300 | ~400 | Low |
| product-type | ~400 | ~500 | Medium |
| tax | ~300 | ~400 | Low |
| warehouse | ~300 | ~400 | Low |

**Navigation Strategy:**
```bash
find_symbol("{Module}Service", relative_path="src/modules/{module}")
find_symbol("{Module}Service", depth=1, relative_path="src/modules/{module}")
get_symbols_overview("src/modules/{module}/errors.ts")
```

#### ⚠️ Complex Modules (5+ files)

##### Product Module (Most Complex)

```
product/
├── product-service.ts          (790 lines, 26 methods) ⚠️
├── repository.ts               (1,284 lines) ⚠️ LARGEST FILE IN CODEBASE
├── attribute-resolver.ts       (393 lines)
├── media-metadata.ts           (~200 lines)
└── errors.ts                   (~100 lines)
```

**Key Symbols:**
- ProductService (26 methods)
- ProductRepository (24 methods)
- AttributeResolver
- MediaMetadataHandler

**Navigation Strategy:**
```bash
# Service - use depth first
find_symbol("ProductService", depth=1, include_body=False, relative_path="src/modules/product")

# Repository - ALWAYS use symbolic approach
get_symbols_overview("src/modules/product/repository.ts")
find_symbol("ProductRepository/{method}", include_body=True, relative_path="src/modules/product")

# Helper files - manageable
get_symbols_overview("src/modules/product/attribute-resolver.ts")
```

##### Config Module (Most Files)

```
config/
├── config-service.ts           (915 lines, 34 methods) ⚠️
├── repository.ts               (831 lines) ⚠️
├── yaml-manager.ts             (~300 lines)
├── errors.ts                   (~100 lines)
└── schema/
    ├── schema.ts               (956 lines, 72 schemas) ⚠️ MOST SYMBOLS
    ├── attribute.schema.ts     (~200 lines)
    ├── helpers.schema.ts       (~150 lines)
    └── [tests]
```

**Key Symbols:**
- ConfigurationService (34 methods)
- ConfigRepository
- YamlManager
- 72 Zod schemas in schema.ts

**Navigation Strategy:**
```bash
# Service - use depth
find_symbol("ConfigurationService", depth=1, include_body=False, relative_path="src/modules/config")

# Schema file - ALWAYS use substring matching
find_symbol("{entity}", substring_matching=True, relative_path="src/modules/config/schema")

# Examples:
find_symbol("category", substring_matching=True, relative_path="src/modules/config/schema")
find_symbol("product", substring_matching=True, relative_path="src/modules/config/schema")
```

##### Shipping Zone Module (Large Files)

```
shipping-zone/
├── shipping-zone-service.ts    (621 lines) ⚠️
├── repository.ts               (609 lines) ⚠️
└── errors.ts                   (~100 lines)
```

**Navigation Strategy:**
```bash
# Both files are large - use symbolic approach
get_symbols_overview("src/modules/shipping-zone/shipping-zone-service.ts")
find_symbol("ShippingZoneService", depth=1, relative_path="src/modules/shipping-zone")
```

##### Shop Module (Special)

```
shop/
├── shop-service.ts             (~300 lines)
├── repository.ts               (~400 lines)
└── errors.ts                   (~100 lines)
```

**Special:** Handles shop-wide settings

---

## File Size Distribution

### 🔴 Very Large Files (>900 lines) - USE SYMBOLIC TOOLS ONLY

| Rank | File | Lines | Symbols | Navigation Strategy |
|------|------|-------|---------|---------------------|
| 1 | `modules/product/repository.ts` | 1,284 | 40+ | `get_symbols_overview` then `find_symbol` for specific methods |
| 2 | `modules/config/schema/schema.ts` | 956 | 72 | **Always use** `substring_matching=True` |
| 3 | `modules/config/config-service.ts` | 915 | 35+ | Use `depth=1` to see methods |

### 🟠 Large Files (600-900 lines) - START WITH OVERVIEW

| File | Lines | Strategy |
|------|-------|----------|
| `modules/config/repository.ts` | 831 | Symbol overview first |
| `modules/product/product-service.ts` | 790 | Use depth=1 |
| `modules/shipping-zone/shipping-zone-service.ts` | 621 | Symbol overview first |
| `core/deployment/stages.ts` | 615 | Can read or use overview |
| `modules/shipping-zone/repository.ts` | 609 | Symbol overview first |
| `core/diff/service.ts` | 554 | Symbol overview first |

### 🟡 Medium Files (300-600 lines) - OVERVIEW RECOMMENDED

- ~20 files including:
  - Most comparators (300-450 lines)
  - `commands/deploy.ts` (421 lines)
  - `commands/introspect.ts` (454 lines)
  - `core/deployment/errors.ts` (425 lines)
  - `modules/product/attribute-resolver.ts` (393 lines)

### 🟢 Small Files (<300 lines) - CAN READ DIRECTLY

- ~99 files (77% of codebase)
- Includes:
  - Most error files
  - Most utility files
  - CLI utilities
  - Test helpers

---

## Symbol Density Analysis

| File | Lines | Symbols | Density | Rating |
|------|-------|---------|---------|--------|
| `config/schema/schema.ts` | 956 | 72 | 7.5 | ⚠️ Too dense |
| `product/repository.ts` | 1,284 | 40 | 3.1 | ⚠️ Cluttered |
| `product/product-service.ts` | 790 | 27 | 3.4 | OK |
| `category/category-service.ts` | ~300 | 2 | 0.7 | ⭐ Excellent |
| `diff/comparators/product-comparator.ts` | 445 | 2 | 0.4 | ⭐ Excellent |

**Recommendation:** Aim for 0.5-2.0 symbols per 100 lines for optimal Serena navigation

---

## Module Patterns

### Standard 3-File Pattern (11 modules)

```
{module}/
├── {module}-service.ts         # Service class
├── repository.ts               # Repository class + GraphQL
└── errors.ts                   # Error definitions
```

**Modules:** attribute, category, channel, collection, menu, model, page-type, product-type, tax, warehouse, shop

### Extended Pattern (Product Module - 5 files)

```
product/
├── product-service.ts          # Main service
├── repository.ts               # Repository + GraphQL
├── attribute-resolver.ts       # Helper: attribute resolution
├── media-metadata.ts           # Helper: media handling
└── errors.ts                   # Errors
```

### Special Pattern (Config Module - 5+ files)

```
config/
├── config-service.ts           # Main service
├── repository.ts               # Repository
├── yaml-manager.ts             # YAML handling
├── errors.ts                   # Errors
└── schema/                     # Subdirectory for schemas
    ├── schema.ts               # Main schemas (72 schemas!)
    ├── attribute.schema.ts
    └── helpers.schema.ts
```

---

## Key Architectural Patterns

### Pattern: Service Layer
**Location:** `src/modules/{module}/{module}-service.ts`
- Single class per file
- Business logic orchestration
- Depends on repository
- **Serena:** `find_symbol("{Module}Service", relative_path="src/modules/{module}")`

### Pattern: Repository Layer
**Location:** `src/modules/{module}/repository.ts`
- GraphQL queries/mutations as top-level constants
- Repository class with data access methods
- Type definitions for responses
- **Serena:** `get_symbols_overview("src/modules/{module}/repository.ts")`

### Pattern: Comparator
**Location:** `src/core/diff/comparators/{entity}-comparator.ts`
- Implements EntityComparator interface
- Single comparator class per file
- compare() method + helpers
- **Serena:** `find_symbol("{Entity}Comparator", relative_path="src/core/diff/comparators")`

### Pattern: Formatter
**Location:** `src/core/diff/formatters/{type}-formatter.ts`
- Extends BaseFormatter
- Formats diff output
- **Serena:** `find_symbol("{Type}Formatter", relative_path="src/core/diff/formatters")`

### Pattern: Command Handler
**Location:** `src/commands/{command}.ts`
- {Command}CommandHandler class
- {command}Handler function
- Zod schema for validation
- **Serena:** `find_symbol("{Command}CommandHandler", relative_path="src/commands")`

---

## Common Symbol Names

### Services (15 services)
```
AttributeService, CategoryService, ChannelService, CollectionService,
ConfigurationService, MenuService, ModelService, PageTypeService,
ProductService, ProductTypeService, ShippingZoneService, ShopService,
TaxService, WarehouseService
```

**Find All:** `find_symbol("Service", substring_matching=True, relative_path="src/modules")`

### Repositories (15 repositories)
```
AttributeRepository, CategoryRepository, ChannelRepository, CollectionRepository,
ConfigRepository, MenuRepository, ModelRepository, PageTypeRepository,
ProductRepository, ProductTypeRepository, ShippingZoneRepository, ShopRepository,
TaxRepository, WarehouseRepository
```

**Find All:** `find_symbol("Repository", substring_matching=True, relative_path="src/modules")`

### Comparators (12 comparators)
```
AttributeComparator, CategoryComparator, ChannelComparator, CollectionComparator,
MenuComparator, ModelComparator, PageTypeComparator, ProductComparator,
ProductTypeComparator, ShippingZoneComparator, TaxClassComparator, WarehouseComparator
```

**Find All:** `find_symbol("Comparator", substring_matching=True, relative_path="src/core/diff/comparators")`

### Formatters (6 formatters)
```
BaseFormatter, DeployFormatter, DetailedFormatter, IntrospectFormatter,
JsonFormatter, SummaryFormatter
```

**Find All:** `find_symbol("Formatter", substring_matching=True, relative_path="src/core/diff/formatters")`

---

## Quick Navigation Reference

### "I need to work with products"
```bash
# Service
find_symbol("ProductService", relative_path="src/modules/product")
find_symbol("ProductService", depth=1, relative_path="src/modules/product")

# Repository
get_symbols_overview("src/modules/product/repository.ts")

# Comparator
find_symbol("ProductComparator", relative_path="src/core/diff/comparators")
```

### "I need to find a schema"
```bash
# ⚠️ Always use substring matching for schemas
find_symbol("{entity}", substring_matching=True, relative_path="src/modules/config/schema")

# Examples:
find_symbol("product", substring_matching=True, relative_path="src/modules/config/schema")
find_symbol("category", substring_matching=True, relative_path="src/modules/config/schema")
```

### "I need to work with deployment"
```bash
# Stages
get_symbols_overview("src/core/deployment/stages.ts")
find_symbol("{entity}Stage", relative_path="src/core/deployment/stages.ts")

# Pipeline
find_symbol("DeploymentPipeline", relative_path="src/core/deployment/pipeline.ts")
```

### "I need to understand a command"
```bash
find_symbol("{Command}CommandHandler", relative_path="src/commands")
find_symbol("{Command}CommandHandler", depth=1, relative_path="src/commands")
```

### "I need to find an error"
```bash
# Module errors
get_symbols_overview("src/modules/{module}/errors.ts")

# Core errors
find_symbol("Error", substring_matching=True, relative_path="src/lib/errors")
```

---

## Testing Structure

### Test Files Location
Co-located with source files: `{file}.test.ts` or `{file}.integration.test.ts`

### Test Organization
- Unit tests: `*.test.ts`
- Integration tests: `*.integration.test.ts`
- Test helpers: `test-helpers/` directory

### Serena Tip
**Exclude tests in production code searches:**
```bash
find_symbol("ProductService", paths_exclude_glob="**/*.test.ts")
```

---

## Summary Stats by Layer

| Layer | Files | Avg Lines/File | Total Lines | Complexity |
|-------|-------|----------------|-------------|------------|
| CLI | 4 | ~150 | ~600 | Low |
| Commands | 6 | ~350 | ~2,100 | Medium |
| Core | 40+ | ~300 | ~12,000+ | High |
| Lib | 30+ | ~200 | ~6,000+ | Medium |
| Modules | 49 | ~400 | ~20,000+ | High |

---

## Architectural Deep Dives

For comprehensive understanding of specific architectural subsystems, refer to these detailed memories:

### 1. Diff Engine Architecture
**Memory:** `diff_engine_architecture`

**Covers:**
- Complete comparator pattern and strategy implementation
- BaseEntityComparator template method pattern
- Change detection algorithms (CREATE, UPDATE, DELETE)
- Deduplication logic for corrupted remote state
- Normalization strategies (order-insensitive arrays, field normalization)
- Complex entity handling (variants, subcategories, nested structures)
- DiffService integration and concurrent execution

**Key Files:**
- `src/core/diff/comparators/base-comparator.ts` - Abstract base class
- `src/core/diff/comparators/*-comparator.ts` - Entity-specific implementations
- `src/core/diff/service.ts` - DiffService orchestrator
- `src/core/diff/types.ts` - Type definitions

**Navigation Entry Points:**
```bash
# See all comparators
get_symbols_overview("src/core/diff/comparators/base-comparator.ts")

# Explore specific comparator
find_symbol("ProductComparator", depth=1, relative_path="src/core/diff/comparators")

# Find comparator registry
find_symbol("DiffService/createComparators", include_body=True, relative_path="src/core/diff")
```

### 2. Deployment Pipeline Architecture
**Memory:** `deployment_pipeline_architecture`

**Covers:**
- 17-stage sequential deployment pipeline
- Stage dependencies and execution order
- Skip logic and conditional execution
- Progress tracking with spinners
- Metrics collection (timing, entity counts)
- Result collection and reporting
- Deployment-specific error handling (StageAggregateError)

**Key Files:**
- `src/core/deployment/stages.ts` - 17 stage definitions
- `src/core/deployment/pipeline.ts` - Basic pipeline
- `src/core/deployment/enhanced-pipeline.ts` - Enhanced with result tracking
- `src/core/deployment/errors.ts` - Deployment errors
- `src/core/deployment/metrics.ts` - Metrics collection

**Critical Stage Order:**
1. Validation → 2. Shop Settings → 3. Tax Classes → 4. Attributes → 
5. Product Types → 6. Channels → 7. Page Types → 8. Model Types → 
9. Categories → 10. Collections → 11. Menus → 12. Models → 
13. Warehouses → 14. Shipping Zones → 15. Attribute Choices Preflight → 
16. Products

**Navigation Entry Points:**
```bash
# See all stages
get_symbols_overview("src/core/deployment/stages.ts")

# Read specific stage
find_symbol("productsStage", include_body=True, relative_path="src/core/deployment")

# Explore pipeline execution
find_symbol("DeploymentPipeline/execute", include_body=True, relative_path="src/core/deployment")
```

### 3. Error Handling Architecture
**Memory:** `error_handling_architecture`

**Covers:**
- Complete error hierarchy (BaseError → Module Errors → Specific Errors)
- Error codes and recovery suggestions
- GraphQL error detection and formatting
- Zod validation error formatting
- Deployment error types with exit codes
- Error propagation patterns (Repository → Service → Stage → CLI)
- ErrorRecoveryGuide pattern matching system

**Key Files:**
- `src/lib/errors/shared.ts` - BaseError foundation
- `src/lib/errors/graphql.ts` - GraphQL error handling
- `src/lib/errors/zod.ts` - Zod validation errors
- `src/lib/errors/recovery-guide.ts` - Pattern-based suggestions
- `src/core/deployment/errors.ts` - Deployment errors
- `src/modules/*/errors.ts` - Module-specific errors

**Error Hierarchy:**
```
BaseError
  ├── GraphQLError (URQL integration)
  ├── ZodValidationError (schema validation)
  ├── Module Errors (Product, Category, etc.)
  │   ├── {Module}NotFoundError
  │   ├── {Module}CreationError
  │   └── {Module}UpdateError
  └── DeploymentError
      ├── NetworkDeploymentError (exit code 3)
      ├── AuthenticationDeploymentError (exit code 2)
      ├── ValidationDeploymentError (exit code 4)
      └── StageAggregateError (exit code 5)
```

**Navigation Entry Points:**
```bash
# See base error
get_symbols_overview("src/lib/errors/shared.ts")

# Find all module errors
find_symbol("Error", substring_matching=True, relative_path="src/modules/product")

# Explore GraphQL error handling
find_symbol("GraphQLError", depth=1, relative_path="src/lib/errors")
```

---

## Critical Architectural Patterns

### 1. Repository Pattern
**Implementation:** Each module has a repository for GraphQL data access

**Structure:**
```typescript
// GraphQL queries/mutations as constants
const ENTITY_QUERY = graphql(`...`);

// Repository class
export class {Entity}Repository {
  constructor(private client: Client) {}
  
  async getEntity(id: string): Promise<Entity> {
    // 1. Execute GraphQL query
    // 2. Check URQL errors
    // 3. Check Saleor business errors
    // 4. Return data or throw
  }
}
```

**Dual Error Checking:**
1. URQL errors (`result.error`) - Transport/GraphQL syntax errors
2. Saleor business errors (`result.data.entityCreate.errors`) - Business logic errors

**Navigation:** `get_symbols_overview("src/modules/{module}/repository.ts")`

### 2. Service Layer Pattern
**Implementation:** Each module has a service for business logic orchestration

**Structure:**
```typescript
export class {Entity}Service {
  constructor(private repository: {Entity}Repository) {}
  
  async bootstrap{Entity}(input: {Entity}Input): Promise<void> {
    // 1. Check if entity exists
    // 2. Create or update as needed
    // 3. Handle errors with context
  }
}
```

**Navigation:** `find_symbol("{Entity}Service", depth=1, relative_path="src/modules/{module}")`

### 3. Comparator Strategy Pattern
**Implementation:** Entity-specific comparison logic

**Structure:**
```typescript
export class {Entity}Comparator extends BaseEntityComparator<
  readonly Entity[],
  readonly Entity[],
  Entity
> {
  protected readonly entityType: EntityType = "{Entity Type}";
  
  compare(local: readonly Entity[], remote: readonly Entity[]): DiffResult[] {
    // 1. Validate unique identifiers
    // 2. Create lookup maps
    // 3. Detect creates, updates, deletes
    // 4. Return diff results
  }
  
  protected compareEntityFields(local: Entity, remote: Entity): DiffChange[] {
    // Entity-specific field comparison
  }
}
```

**Navigation:** `find_symbol("{Entity}Comparator", depth=1, relative_path="src/core/diff/comparators")`

### 4. Command Handler Pattern
**Implementation:** CLI command execution

**Structure:**
```typescript
export class {Command}CommandHandler {
  async execute(args: {Command}CommandArgs): Promise<void> {
    // 1. Validate args with Zod
    // 2. Create configurator
    // 3. Execute command logic
    // 4. Handle errors
  }
}

export async function {command}Handler(args: {Command}CommandArgs): Promise<void> {
  const handler = new {Command}CommandHandler();
  await handler.execute(args);
}
```

**Navigation:** `find_symbol("{Command}CommandHandler", relative_path="src/commands")`

### 5. Dependency Injection Pattern
**Implementation:** ServiceContainer and ServiceComposer

**Structure:**
```typescript
// Service container interface
export interface ServiceContainer {
  readonly product: ProductService;
  readonly category: CategoryService;
  // ... all services
}

// Composer with two-phase construction
export class ServiceComposer {
  static compose(deps: Dependencies): ServiceContainer {
    // Phase 1: Create repositories
    // Phase 2: Create services with dependencies
    // Returns complete service container
  }
}
```

**Why Two-Phase:** Avoids circular dependencies between services

**Navigation:** `find_symbol("ServiceComposer", depth=1, relative_path="src/core")`

---

## Critical Component Reference

### Most Complex Files (Require Special Navigation)

#### 1. Product Repository (1,284 lines)
**Why Complex:** 40+ methods, 20+ GraphQL operations, variant handling

**Navigation Strategy:**
```bash
# NEVER read entire file
# Step 1: Get overview
get_symbols_overview("src/modules/product/repository.ts")

# Step 2: Read specific methods
find_symbol("ProductRepository/createProduct", include_body=True, relative_path="src/modules/product")
find_symbol("ProductRepository/updateProduct", include_body=True, relative_path="src/modules/product")
```

**Common Methods:**
- `createProduct()` - Create product with variants
- `updateProduct()` - Update product
- `createVariants()` - Create product variants
- `updateVariantChannelListings()` - Update channel listings
- `uploadProductMedia()` - Upload media

#### 2. Config Schema (956 lines, 72 schemas)
**Why Complex:** 72 Zod schemas, high symbol density

**Navigation Strategy:**
```bash
# ALWAYS use substring matching
find_symbol("product", substring_matching=True, relative_path="src/modules/config/schema")
find_symbol("category", substring_matching=True, relative_path="src/modules/config/schema")
```

**Common Schemas:**
- `productCreateSchema` - Product creation
- `productUpdateSchema` - Product updates
- `categorySchema` - Categories
- `channelSchema` - Channels
- `attributeSchema` - Attributes

#### 3. Config Service (915 lines, 34 methods)
**Why Complex:** 34 methods, orchestrates all modules

**Navigation Strategy:**
```bash
# Use depth to see all methods
find_symbol("ConfigurationService", depth=1, include_body=False, relative_path="src/modules/config")

# Read specific methods
find_symbol("ConfigurationService/load", include_body=True, relative_path="src/modules/config")
```

**Common Methods:**
- `load()` - Load and validate configuration
- `save()` - Save configuration to YAML
- `introspect()` - Introspect Saleor instance

#### 4. Deployment Stages (615 lines, 17 stages)
**Why Complex:** 17 stage definitions with skip logic

**Navigation Strategy:**
```bash
# Get overview of all stages
get_symbols_overview("src/core/deployment/stages.ts")

# Read specific stage
find_symbol("productsStage", include_body=True, relative_path="src/core/deployment")
```

**Critical Stages:**
- `validationStage` - Always runs first
- `productsStage` - Most complex, depends on everything
- `attributeChoicesPreflightStage` - Validates before products

#### 5. DiffService (554 lines, 17 methods)
**Why Complex:** Orchestrates all comparators, concurrent execution

**Navigation Strategy:**
```bash
# See all methods
find_symbol("DiffService", depth=1, include_body=False, relative_path="src/core/diff")

# Read key methods
find_symbol("DiffService/compare", include_body=True, relative_path="src/core/diff")
find_symbol("DiffService/performComparisons", include_body=True, relative_path="src/core/diff")
```

---

## Dependency Flow

### Module Dependencies
```
CLI Commands
  ↓
Configurator (orchestrator)
  ↓
Service Container
  ├→ Module Services (Product, Category, etc.)
  │    ↓
  │  Repositories (GraphQL access)
  │    ↓
  │  URQL Client
  │    ↓
  │  Saleor GraphQL API
  │
  ├→ DiffService
  │    ↓
  │  Comparators (change detection)
  │
  └→ DeploymentPipeline
       ↓
     Stages (sequential execution)
```

### Data Flow
```
User Input (CLI)
  ↓
Command Handler (validation with Zod)
  ↓
Configurator (orchestration)
  ↓
Service Layer (business logic)
  ↓
Repository Layer (GraphQL operations)
  ↓
URQL Client (HTTP transport)
  ↓
Saleor GraphQL API
```

### Error Propagation
```
GraphQL Error
  ↓
Repository (detects, wraps in GraphQLError)
  ↓
Service (catches, wraps with context in {Module}Error)
  ↓
Stage (catches, aggregates in StageAggregateError)
  ↓
Pipeline (catches, converts to DeploymentError)
  ↓
CLI (formats, displays to user with suggestions)
```

---

## Performance Considerations

### Concurrent Execution Points

1. **DiffService Comparisons**
   - All comparators run concurrently (configurable limit: default 5)
   - Location: `DiffService.executeConcurrently()`

2. **Stage Entity Deployment**
   - Entities within a stage deployed concurrently with `Promise.allSettled`
   - Example: All products in productsStage

3. **Repository Batch Operations**
   - Some repositories batch multiple operations
   - Example: `ProductRepository.createVariants()`

### Large File Impact on Navigation

| File Size | Read Time | Serena Recommendation |
|-----------|-----------|----------------------|
| <300 lines | <1s | Can read directly |
| 300-600 lines | 1-2s | Use overview first |
| 600-900 lines | 2-3s | Always use symbolic |
| 900+ lines | 3-5s+ | **Never read directly** |

**Token Usage:**
- Reading 1,000 lines ≈ 3,000-4,000 tokens
- Reading 956-line schema file ≈ 3,000 tokens
- Using symbolic navigation ≈ 200-500 tokens (85% savings)

---

## Module Interdependencies

### No Dependencies
- Shop, Tax Classes, Warehouses, Shipping Zones

### Light Dependencies
- Attributes (standalone)
- Channels (standalone)

### Medium Dependencies
- Product Types → Attributes
- Categories → (none, but referenced by Products)
- Collections → Products (optional references)
- Menus → Categories, Collections

### Heavy Dependencies (Products)
```
Products depend on:
  ├─ Product Types (required)
  ├─ Channels (required for channel listings)
  ├─ Categories (optional)
  ├─ Attributes (optional)
  ├─ Tax Classes (optional)
  └─ Collections (optional - products can be in collections)
```

**Why Products Deploy Last:** Must ensure all dependencies exist first

---

## Testing Strategy Reference

### Test File Patterns

1. **Unit Tests:** `{file}.test.ts`
   - Co-located with source
   - Mock dependencies
   - Test single units

2. **Integration Tests:** `{file}.integration.test.ts`
   - Test real GraphQL operations
   - Require live Saleor instance
   - Slower execution

3. **Test Helpers:** `test-helpers/`
   - Shared mocking utilities
   - Fixture data
   - Test builders

### Serena Tips for Tests

```bash
# Exclude tests from searches
find_symbol("ProductService", paths_exclude_glob="**/*.test.ts", relative_path="src/modules/product")

# Find tests for a specific class
find_symbol("ProductService", relative_path="src/modules/product/product-service.test.ts")

# Search test patterns
search_for_pattern("describe.*ProductService", relative_path="src/modules/product")
```

---

## Key Takeaways for Serena Navigation

1. **77% of files are <300 lines** - Most files are navigable
2. **3 files require special handling** - product/repository.ts, config/schema.ts, config/config-service.ts
3. **Naming patterns are consistent** - Service, Repository, Comparator suffixes
4. **11 of 15 modules follow standard pattern** - Easy to predict structure
5. **Large files are exceptions, not the rule** - Most code is well-organized
6. **Architectural memories provide deep dives** - Use them for comprehensive understanding
7. **Error handling is standardized** - BaseError with error codes and recovery suggestions
8. **Deployment is sequential with dependencies** - 17 stages in specific order
9. **Diff engine uses strategy pattern** - Entity-specific comparators
10. **All layers follow consistent patterns** - Repository → Service → Orchestrator

**Remember:** Check this map AND architectural memories before navigating unfamiliar areas!

1. **77% of files are <300 lines** - Most files are navigable
2. **3 files require special handling** - product/repository.ts, config/schema.ts, config/config-service.ts
3. **Naming patterns are consistent** - Service, Repository, Comparator suffixes
4. **11 of 15 modules follow standard pattern** - Easy to predict structure
5. **Large files are exceptions, not the rule** - Most code is well-organized

**Remember:** Check this map before navigating unfamiliar areas!