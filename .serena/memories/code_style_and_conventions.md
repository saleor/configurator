# Code Style and Conventions

## Code Quality Standards
- **Biome Configuration**: Strict linting and formatting rules
- **TypeScript**: Strict type checking with no unused locals/parameters
- **NEVER use `as any`** in production code - only allowed in test files for mocking
- Use proper type guards, union types, or generic constraints instead

## Formatting Rules (Biome)
- **Line Width**: 100 characters
- **Indentation**: 2 spaces
- **Quotes**: Double quotes for strings and JSX
- **Semicolons**: Always required
- **Trailing Commas**: ES5 compatibility
- **Arrow Parentheses**: Always use parentheses
- **Bracket Spacing**: Enabled

## Error Handling System
Comprehensive error hierarchy extending BaseError:
```typescript
BaseError (abstract)
├── EnvironmentVariableError
├── ZodValidationError  
├── GraphQLError
├── CliError
└── Domain-specific errors
```

**Error Handling Conventions**:
1. Always extend BaseError for custom errors
2. Use GraphQLError.fromCombinedError() for GraphQL errors
3. Use ZodValidationError.fromZodError() for validation errors
4. Domain-specific errors co-located in modules

## Naming Conventions
- **Files**: kebab-case (e.g., `tax-service.ts`, `tax-class-comparator.ts`)
- **Classes**: PascalCase (e.g., `TaxService`, `TaxClassComparator`)
- **Methods/Variables**: camelCase
- **Constants**: SCREAMING_SNAKE_CASE
- **Types/Interfaces**: PascalCase

## Design Patterns
- **Dependency Injection**: ServiceContainer pattern
- **Repository Pattern**: Data access abstraction with GraphQL
- **Command Pattern**: CLI commands as discrete handlers
- **Strategy Pattern**: Multiple comparators for diff operations
- **Factory Pattern**: Service composition

---

## Serena-Optimized Code Organization

### File Size Guidelines for Serena Efficiency

**Target Ranges:**
- **Optimal:** < 500 lines per file
- **Acceptable:** 500-600 lines (start requiring symbolic navigation)
- **Warning:** 600-900 lines (must use symbolic tools)
- **Critical:** > 900 lines (refactoring recommended for better Serena navigation)

**Rationale:**
- Smaller files = Faster symbol overview
- Better code comprehension
- Easier to navigate with Serena
- Lower token consumption

**Current Large Files Requiring Special Handling:**
- `modules/product/repository.ts` (1,284 lines) - Always use symbolic approach
- `modules/config/schema/schema.ts` (956 lines) - Always use substring matching
- `modules/config/config-service.ts` (915 lines) - Use depth=1 for method overview

### Symbol Density Guidelines

**Definition:** Number of top-level symbols per 100 lines of code

**Optimal Ranges:**
- **Excellent:** 0.4-1.0 symbols per 100 lines (single focused class)
- **Good:** 1.0-2.0 symbols per 100 lines (class + a few helpers)
- **Acceptable:** 2.0-3.0 symbols per 100 lines
- **Problematic:** > 3.0 symbols per 100 lines (symbol overview becomes cluttered)

**Examples from Codebase:**
- ⭐ `diff/comparators/product-comparator.ts`: 0.4 (Excellent - single focused class)
- ⭐ `category/category-service.ts`: 0.7 (Excellent - service + helpers)
- ✅ `product/product-service.ts`: 3.4 (Acceptable but high)
- ⚠️ `config/schema/schema.ts`: 7.5 (Too dense - 72 schemas in one file)

**Recommendation:** When adding new code, aim for 0.5-2.0 symbols per 100 lines

### Naming Conventions for Serena Discovery

These naming patterns enable efficient symbol discovery using Serena's tools:

#### 1. Services
**Pattern:** `{Module}Service`
**Example:** `ProductService`, `CategoryService`, `TaxService`
**Serena Benefit:** `find_symbol("Service", substring_matching=True)` finds all services
**Find Specific:** `find_symbol("ProductService", relative_path="src/modules/product")`

#### 2. Repositories
**Pattern:** `{Module}Repository`
**Example:** `ProductRepository`, `CategoryRepository`, `TaxRepository`
**Serena Benefit:** `find_symbol("Repository", substring_matching=True)` finds all repositories
**Find Specific:** `find_symbol("ProductRepository", relative_path="src/modules/product")`

#### 3. Comparators
**Pattern:** `{Entity}Comparator`
**Example:** `ProductComparator`, `CategoryComparator`, `TaxClassComparator`
**Serena Benefit:** `find_symbol("Comparator", substring_matching=True)` finds all comparators
**Location:** Always in `src/core/diff/comparators/`

#### 4. Formatters
**Pattern:** `{Type}Formatter`
**Example:** `DeployFormatter`, `DetailedFormatter`, `SummaryFormatter`
**Serena Benefit:** `find_symbol("Formatter", substring_matching=True)` finds all formatters
**Location:** Always in `src/core/diff/formatters/`

#### 5. Command Handlers
**Pattern:** `{Command}CommandHandler`
**Example:** `DeployCommandHandler`, `DiffCommandHandler`, `IntrospectCommandHandler`
**Serena Benefit:** `find_symbol("CommandHandler", substring_matching=True)` finds all command handlers
**Location:** Always in `src/commands/`

#### 6. Error Classes
**Pattern:** `{Specific}Error` or `{Module}Error`
**Example:** `ProductNotFoundError`, `ValidationError`, `GraphQLError`
**Serena Benefit:** `find_symbol("Error", substring_matching=True)` finds all error classes
**Note:** Exclude variables with `exclude_kinds=[13]`

#### 7. GraphQL Queries
**Pattern:** `{entity}{Action}Query` or `get{Entity}Query`
**Example:** `getProductBySlugQuery`, `listCategoriesQuery`
**Consistency:** Prefer `get` prefix for single item, `list` for collections
**Serena Benefit:** Predictable names for easier finding

#### 8. GraphQL Mutations
**Pattern:** `{action}{Entity}Mutation`
**Example:** `createProductMutation`, `updateCategoryMutation`, `deleteWarehouseMutation`
**Consistency:** Action first (create, update, delete, upsert)
**Serena Benefit:** Predictable names for easier finding

#### 9. Schemas
**Pattern:** `{entity}Schema`, `{entity}CreateSchema`, `{entity}UpdateSchema`
**Example:** `categorySchema`, `categoryCreateSchema`, `categoryUpdateSchema`
**Serena Benefit:** `find_symbol("category", substring_matching=True)` finds all category-related schemas
**Special Handling:** Schema file has 72 schemas - always use substring matching

### Module Structure Standard

**Standard 3-File Pattern** (for most modules):
```
module-name/
├── index.ts                    # Public API exports (RECOMMENDED)
├── {module}-service.ts         # Main service (< 500 lines preferred)
├── repository.ts               # Repository class (+ GraphQL definitions)
└── errors.ts                   # Module-specific errors
```

**Extended Pattern** (for complex modules like product):
```
module-name/
├── index.ts                    # Public API exports
├── {module}-service.ts         # Main service
├── repository.ts               # Repository class
├── {specific}-helper.ts        # Specific helpers if needed
├── {another}-helper.ts         # Additional helpers
└── errors.ts                   # Module-specific errors
```

**Index File Template:**
```typescript
// Public API exports
export { ProductService } from './product-service'
export { ProductRepository } from './repository'
export * from './errors'

// Re-export key types
export type { ProductInput, ProductVariant } from './repository'
```

**Benefits:**
- Single entry point to discover module API
- Better for Serena: `get_symbols_overview("src/modules/product/index.ts")`
- Encourages thinking about public vs internal APIs
- Makes imports cleaner

### Repository File Organization

**Current Pattern** (Mixed - Less Optimal):
```typescript
// ❌ GraphQL definitions mixed with class
export const createProductMutation = graphql(`...`)
export const updateProductMutation = graphql(`...`)
export const getProductBySlugQuery = graphql(`...`)
// ... 10+ more definitions

export class ProductRepository {
  // 24 methods
}
```

**Recommended Pattern** (Separated - More Optimal):
```typescript
// ✅ Option 1: Separate file for GraphQL
// product-queries.ts
export const createProductMutation = graphql(`...`)
export const updateProductMutation = graphql(`...`)
// ...

// repository.ts
export class ProductRepository {
  // Only repository class
}
```

**Serena Benefits:**
- Clean symbol hierarchies
- Repository class methods immediately visible in overview
- GraphQL definitions easy to find
- Better separation of concerns

### When to Split Files

**Consider splitting a file when:**
1. File exceeds 600 lines
2. Symbol count exceeds 30
3. Symbol density > 3.0 per 100 lines
4. File has multiple concerns (e.g., GraphQL + Repository + Types)
5. Finding specific code requires multiple search attempts
6. Symbol overview becomes overwhelming

**How to Split:**
- Extract helpers into separate files
- Separate GraphQL definitions from classes
- Group related schemas by domain
- Create subdirectories for related files (e.g., `schema/`)

### Code Organization Principles for Serena

#### Principle 1: Single Responsibility per File
**Good:**
- One service class per file
- One repository class per file
- Related schemas grouped by domain

**Bad:**
- Multiple unrelated classes in one file
- All schemas in one 956-line file
- GraphQL definitions mixed with repository class

#### Principle 2: Predictable Structure
**Good:**
- Consistent module patterns
- Predictable file names
- Standard suffixes (Service, Repository, Comparator)

**Bad:**
- Inconsistent naming
- Files in unexpected locations
- Unclear file purposes

#### Principle 3: Hierarchical Organization
**Good:**
- Clear class hierarchies
- Methods grouped logically
- Depth=1 reveals structure

**Bad:**
- Flat exports with no hierarchy
- Many top-level functions
- No clear organization

### Serena Navigation Hints in Code

**Consider adding comments for large files:**
```typescript
/**
 * ProductRepository - Main data access layer for products
 * 
 * Serena Navigation:
 * - Use: get_symbols_overview("src/modules/product/repository.ts")
 * - Find method: find_symbol("ProductRepository/createProduct", include_body=True)
 * 
 * Methods: 24 methods for CRUD operations
 */
export class ProductRepository {
  // ...
}
```

### Pre-Commit Checks for Serena Compatibility

Before committing, verify:
- [ ] No files > 600 lines created (without good reason)
- [ ] Symbol density < 3.0 per 100 lines
- [ ] Consistent naming patterns followed (Service, Repository, etc.)
- [ ] Module structure matches standard pattern
- [ ] Complex modules (5+ files) have clear organization
- [ ] Index.ts exists for new modules
- [ ] GraphQL definitions follow naming conventions

### Refactoring Triggers

**Trigger refactoring when:**
- File exceeds 600 lines
- Symbol overview shows > 30 symbols
- Symbol density > 3.0 per 100 lines
- Team reports difficulty finding code
- Serena searches require multiple attempts
- File has multiple concerns

**Refactoring Approach:**
1. Check `serena_navigation_guide` for current patterns
2. Follow `serena_workflows` for safe refactoring
3. Use Serena's `find_referencing_symbols` to check impact
4. Split while maintaining naming conventions
5. Verify tests still pass

---

## Summary: Code Organization for Serena Success

### Key Principles
1. **Keep files focused** - < 500 lines preferred
2. **Maintain symbol density** - 0.5-2.0 per 100 lines
3. **Follow naming patterns** - Enable substring matching discovery
4. **Use standard structures** - Predictable module organization
5. **Separate concerns** - GraphQL ≠ Repository class
6. **Add index files** - Clear public APIs
7. **Think symbolically** - Organize for hierarchical navigation

### Quick Reference
- **Services:** `{Module}Service` pattern
- **Repositories:** `{Module}Repository` pattern  
- **Comparators:** `{Entity}Comparator` pattern
- **Errors:** `{Specific}Error` pattern
- **Queries:** `get{Entity}Query` or `{entity}{Action}Query`
- **Mutations:** `{action}{Entity}Mutation`
- **Schemas:** `{entity}Schema`, `{entity}CreateSchema`, etc.

**Remember:** Good code organization makes Serena 10x more effective!