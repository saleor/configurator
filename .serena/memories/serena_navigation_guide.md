# Serena Navigation Guide for Saleor Configurator

## Quick Symbol Reference by Type

### Services
- **Pattern:** `{Module}Service` in `src/modules/{module}/{module}-service.ts`
- **Example:** `find_symbol("ProductService", relative_path="src/modules/product")`
- **Standard modules:** CategoryService, WarehouseService, TaxService, ChannelService, ShippingZoneService
- **Complex modules:** ProductService (790 lines, 26 methods), ConfigurationService (915 lines, 34 methods)

**Quick Commands:**
```
# Find specific service
find_symbol("ProductService", relative_path="src/modules/product")

# See all methods without reading bodies
find_symbol("ProductService", depth=1, include_body=False, relative_path="src/modules/product")

# Read specific method
find_symbol("ProductService/upsertProduct", include_body=True, relative_path="src/modules/product")
```

### Repositories
- **Pattern:** `{Module}Repository` in `src/modules/{module}/repository.ts`
- **Structure:** Top-level GraphQL definitions (queries/mutations) + Repository class
- **Note:** Repository files mix GraphQL constants with class, making symbol overview cluttered

**Quick Commands:**
```
# Find repository class
find_symbol("ProductRepository", relative_path="src/modules/product")

# See all repository methods
find_symbol("ProductRepository", depth=1, include_body=False, relative_path="src/modules/product")

# Find GraphQL queries/mutations
search_for_pattern("graphql\(`", relative_path="src/modules/product/repository.ts", output_mode="content")
```

### Comparators
- **Pattern:** `{Entity}Comparator` in `src/core/diff/comparators/{entity}-comparator.ts`
- **All comparators:** ProductComparator, CategoryComparator, ChannelComparator, CollectionComparator, MenuComparator, ModelComparator, PageTypeComparator, ProductTypeComparator, ShippingZoneComparator, TaxClassComparator, WarehouseComparator

**Quick Commands:**
```
# Find all comparators
find_symbol("Comparator", substring_matching=True, relative_path="src/core/diff/comparators")

# Find specific comparator
find_symbol("ProductComparator", relative_path="src/core/diff/comparators")

# See comparator methods
find_symbol("ProductComparator", depth=1, relative_path="src/core/diff/comparators")
```

### Formatters
- **Pattern:** `{Type}Formatter` in `src/core/diff/formatters/`
- **Types:** BaseFormatter, DeployFormatter, DetailedFormatter, IntrospectFormatter, JsonFormatter, SummaryFormatter

**Quick Commands:**
```
# Find all formatters
find_symbol("Formatter", substring_matching=True, relative_path="src/core/diff/formatters")
```

### Command Handlers
- **Pattern:** `{Command}CommandHandler` in `src/commands/{command}.ts`
- **Commands:** DeployCommandHandler, DiffCommandHandler, IntrospectCommandHandler, StartCommandHandler

**Quick Commands:**
```
# Find command handler
find_symbol("DeployCommandHandler", relative_path="src/commands")
```

### Schemas
- **Location:** `src/modules/config/schema/schema.ts` (⚠️ 956 lines, 72 symbols)
- **Pattern:** `{entity}Schema`, `{entity}CreateSchema`, `{entity}UpdateSchema`
- **⚠️ WARNING:** This file has overwhelming symbol density - use substring matching

**Quick Commands:**
```
# Find category-related schemas
find_symbol("category", substring_matching=True, relative_path="src/modules/config/schema")

# Find product-related schemas
find_symbol("product", substring_matching=True, relative_path="src/modules/config/schema")

# Get overview (will be long)
get_symbols_overview("src/modules/config/schema/schema.ts")
```

### Error Classes
- **Pattern:** `{Module}Error` or `{Specific}Error` in `src/modules/{module}/errors.ts`
- **Also:** Core errors in `src/lib/errors/` and `src/core/errors/`

**Quick Commands:**
```
# See all errors in a module
get_symbols_overview("src/modules/product/errors.ts")

# Find all error classes
find_symbol("Error", substring_matching=True, exclude_kinds=[13])  # Exclude variables

# Find where error is thrown
search_for_pattern("throw new ProductNotFoundError", relative_path="src")
```

---

## File Size Reference (Know Before You Navigate)

### ⚠️ LARGE FILES - Use Symbolic Tools Only

| File | Lines | Symbols | Strategy |
|------|-------|---------|----------|
| `modules/product/repository.ts` | 1,284 | 40+ | Start with `get_symbols_overview`, then use `find_symbol` for specific symbols |
| `modules/config/schema/schema.ts` | 956 | 72 | Use `substring_matching=True` to find schemas by domain |
| `modules/config/config-service.ts` | 915 | 35+ | Use `depth=1` to see method hierarchy |
| `modules/config/repository.ts` | 831 | 30+ | Start with symbol overview |
| `modules/product/product-service.ts` | 790 | 27 | Use `depth=1` to see all 26 methods |
| `modules/shipping-zone/shipping-zone-service.ts` | 621 | 20+ | Symbol overview recommended |
| `core/deployment/stages.ts` | 615 | 17 | Can read or use overview - manageable |
| `modules/shipping-zone/repository.ts` | 609 | 20+ | Start with overview |
| `core/diff/service.ts` | 554 | 18 | Start with overview |

### ✅ MODERATE FILES - Symbol Overview Recommended (300-500 lines)

- `commands/deploy.ts` (421 lines)
- `commands/introspect.ts` (454 lines)
- `core/deployment/errors.ts` (425 lines)
- Most comparator files (300-450 lines)

### ✅ SMALL FILES - Can Read Directly (<300 lines)

- 77% of codebase (99 files)
- Most error files
- Most test utilities
- CLI utilities

---

## Efficient Search Strategies

### Strategy 1: Always Start with Symbol Overview (Large Files)

**❌ DON'T DO THIS:**
```
read_file("src/modules/product/repository.ts")  # Reads 1,284 lines!
```

**✅ DO THIS INSTEAD:**
```
# Step 1: Get overview
get_symbols_overview("src/modules/product/repository.ts")

# Step 2: Identify what you need
# (You see: ProductRepository class + 10 GraphQL definitions)

# Step 3: Read only what you need
find_symbol("ProductRepository/createProduct", include_body=True, relative_path="src/modules/product")
```

**Token Savings:** 80-90% reduction in tokens consumed

### Strategy 2: Use relative_path to Speed Up Searches

**❌ SLOW:**
```
find_symbol("ProductService")  # Searches entire codebase
```

**✅ FAST:**
```
find_symbol("ProductService", relative_path="src/modules/product")  # Searches one directory
```

**Speed Improvement:** 5-10x faster for targeted searches

### Strategy 3: Exclude Test Files in Global Searches

**❌ CLUTTERED RESULTS:**
```
find_symbol("Product")  # Returns test files too
```

**✅ CLEAN RESULTS:**
```
find_symbol("Product", paths_exclude_glob="**/*.test.ts")
```

### Strategy 4: Use depth=1 to See Method Hierarchies

**❌ OVERWHELMING:**
```
find_symbol("ProductService", include_body=True)  # Reads entire 790-line file
```

**✅ EFFICIENT:**
```
# First see what's available
find_symbol("ProductService", depth=1, include_body=False)  # See all 26 methods

# Then read only what you need
find_symbol("ProductService/upsertProduct", include_body=True)
```

### Strategy 5: Substring Matching for Discovery

**Use when you don't know exact names:**
```
# Find all comparators
find_symbol("Comparator", substring_matching=True, relative_path="src/core/diff/comparators")

# Find all services
find_symbol("Service", substring_matching=True, relative_path="src/modules")

# Find category-related schemas
find_symbol("category", substring_matching=True, relative_path="src/modules/config/schema")
```

### Strategy 6: Pattern Search for Non-Symbol Content

**Use for finding:**
- Comments with TODO/FIXME
- GraphQL query strings
- Error throw statements
- Import statements

```
# Find all GraphQL mutations in product module
search_for_pattern("Mutation.*=.*graphql", relative_path="src/modules/product")

# Find all TODO comments
search_for_pattern("// TODO:", relative_path="src")

# Find error throwing
search_for_pattern("throw new.*Error", relative_path="src/modules/product")
```

---

## Module-Specific Navigation Tips

### Product Module (Complex - 5 files)

**Files:**
- `product-service.ts` (790 lines, 26 methods)
- `repository.ts` (1,284 lines - LARGEST FILE)
- `attribute-resolver.ts` (393 lines)
- `media-metadata.ts`
- `errors.ts`

**Navigation Strategy:**
```
# 1. Start with service overview
get_symbols_overview("src/modules/product/product-service.ts")

# 2. See all methods
find_symbol("ProductService", depth=1, include_body=False, relative_path="src/modules/product")

# 3. For repository, use symbolic approach
get_symbols_overview("src/modules/product/repository.ts")  # See what's there
find_symbol("ProductRepository/createProduct", include_body=True, relative_path="src/modules/product")

# 4. Helper files can be read directly
# attribute-resolver.ts and media-metadata.ts are manageable
```

### Config Module (Most Complex - 5+ files)

**Files:**
- `config-service.ts` (915 lines, 34 methods)
- `repository.ts` (831 lines)
- `schema/schema.ts` (956 lines, 72 schemas) ⚠️ CHALLENGING
- `yaml-manager.ts`
- `errors.ts`

**Navigation Strategy:**
```
# 1. Service - use depth to see methods
find_symbol("ConfigurationService", depth=1, include_body=False, relative_path="src/modules/config")

# 2. Schema file - ALWAYS use substring matching
find_symbol("category", substring_matching=True, relative_path="src/modules/config/schema")
find_symbol("product", substring_matching=True, relative_path="src/modules/config/schema")

# 3. Repository - symbolic approach
get_symbols_overview("src/modules/config/repository.ts")
```

### Standard Modules (Simple - 3 files each)

**Modules:** category, warehouse, tax, channel, menu, collection, model, page-type, attribute

**Standard Pattern:**
- `{module}-service.ts` - Main service
- `repository.ts` - Repository class
- `errors.ts` - Error definitions

**Navigation Strategy:**
```
# These are straightforward - use standard approach
find_symbol("{Module}Service", relative_path="src/modules/{module}")
find_symbol("{Module}Service", depth=1, relative_path="src/modules/{module}")
```

### Shipping Zone Module (Medium Complex - 3 files)

**Files:**
- `shipping-zone-service.ts` (621 lines)
- `repository.ts` (609 lines)
- `errors.ts`

**Navigation Strategy:**
```
# Both service and repository are large - use symbolic approach
get_symbols_overview("src/modules/shipping-zone/shipping-zone-service.ts")
find_symbol("ShippingZoneService", depth=1, relative_path="src/modules/shipping-zone")
```

---

## Common Navigation Scenarios

### Scenario 1: "I need to add a feature to product handling"

```bash
# 1. Find the service
find_symbol("ProductService", relative_path="src/modules/product")

# 2. See what methods exist
find_symbol("ProductService", depth=1, include_body=False, relative_path="src/modules/product")

# 3. Read relevant methods for context
find_symbol("ProductService/upsertProduct", include_body=True, relative_path="src/modules/product")

# 4. Check repository methods
get_symbols_overview("src/modules/product/repository.ts")
find_symbol("ProductRepository/createProduct", include_body=True, relative_path="src/modules/product")
```

### Scenario 2: "I need to understand how categories are compared"

```bash
# 1. Find the comparator
find_symbol("CategoryComparator", relative_path="src/core/diff/comparators")

# 2. See its methods
find_symbol("CategoryComparator", depth=1, relative_path="src/core/diff/comparators")

# 3. Read the compare method
find_symbol("CategoryComparator/compare", include_body=True, relative_path="src/core/diff/comparators")
```

### Scenario 3: "Where is the tax schema defined?"

```bash
# Schema file has 72 symbols - use substring matching
find_symbol("tax", substring_matching=True, relative_path="src/modules/config/schema")

# This will find: taxClassSchema, taxClassCreateSchema, taxRateSchema, etc.
```

### Scenario 4: "What errors can the warehouse service throw?"

```bash
# Get overview of error file
get_symbols_overview("src/modules/warehouse/errors.ts")

# Or find all errors
find_symbol("Error", substring_matching=True, relative_path="src/modules/warehouse")
```

### Scenario 5: "Where is ProductService.upsertProduct called?"

```bash
# Find references to the method
find_referencing_symbols("ProductService/upsertProduct", "src/modules/product/product-service.ts")

# This shows all places that call this method
```

### Scenario 6: "I need to find all GraphQL mutations for products"

```bash
# Pattern search in repository
search_for_pattern("Mutation.*=.*graphql", relative_path="src/modules/product/repository.ts", output_mode="content")

# Or use symbol overview and look for symbols ending in "Mutation"
get_symbols_overview("src/modules/product/repository.ts")
```

---

## Performance Tips

### Token Optimization

1. **Never read large files completely** - Always use symbolic tools first
2. **Use relative_path** whenever you know the general location
3. **Exclude test files** when searching for implementation code
4. **Read method bodies selectively** - Not entire classes
5. **Use depth=1** to see structure before reading bodies

### Time Optimization

1. **Start with get_symbols_overview** for unfamiliar files
2. **Use specific paths** instead of global searches
3. **Leverage naming patterns** - If you know it ends with "Service", use that
4. **Cache knowledge** - Remember file locations for repeat navigation

---

## Troubleshooting Common Issues

### Issue: "Too many results when searching"

**Solutions:**
- Add `relative_path` to narrow scope
- Use `exclude_kinds` to filter symbol types
- Add `paths_exclude_glob="**/*.test.ts"` to exclude tests
- Be more specific with the name

### Issue: "Can't find a specific schema"

**Solution:**
```
# Schema file has 72 symbols - always use substring matching
find_symbol("{entity_name}", substring_matching=True, relative_path="src/modules/config/schema")
```

### Issue: "Symbol overview is overwhelming"

**Problem:** File is too large or has too many symbols

**Solutions:**
- Use `include_kinds` to filter to only classes [5] or functions [12]
- Use substring matching with more specific names
- Read the symbol you need directly if you know its path

### Issue: "Don't know where to start"

**Solution:**
```
# 1. List directory to see what's there
list_dir("src/modules/{module}", recursive=False)

# 2. Get overview of main service file
get_symbols_overview("src/modules/{module}/{module}-service.ts")

# 3. Explore from there
```

---

## Quick Command Reference

### Discovery Commands
```bash
# Find by name
find_symbol("ClassName", relative_path="src/path")

# Find with substring
find_symbol("Service", substring_matching=True, relative_path="src/modules")

# Get file overview
get_symbols_overview("src/path/file.ts")

# List directory
list_dir("src/modules/product", recursive=False)
```

### Reading Commands
```bash
# Read with hierarchy
find_symbol("ClassName", depth=1, include_body=False)

# Read specific method
find_symbol("ClassName/methodName", include_body=True)

# Pattern search
search_for_pattern("pattern", relative_path="src/path")
```

### Reference Commands
```bash
# Find references
find_referencing_symbols("ClassName/method", "src/path/file.ts")

# Find where symbol is used
find_referencing_symbols("ClassName", "src/path/file.ts")
```

---

## Summary: The Serena Way

1. **Never read large files blindly** - Always explore with symbols first
2. **Use relative_path religiously** - Faster and more focused
3. **Start with overview** - See structure before diving in
4. **Read selectively** - Only the methods/classes you need
5. **Exclude tests** - Unless you're working on tests
6. **Know the patterns** - Services, Repositories, Comparators all follow naming conventions
7. **Master the large files** - product/repository.ts, config/schema.ts need special handling

**Remember:** Serena is about semantic understanding, not text reading. Use its symbolic capabilities to navigate efficiently!