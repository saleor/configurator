# Serena Best Practices for Saleor Configurator

## Golden Rules

### Rule #1: Never Read Large Files Completely
**Files over 500 lines should ALWAYS be explored with symbolic tools first.**

❌ **WRONG:**
```
read_file("src/modules/product/repository.ts")  # 1,284 lines!
```

✅ **RIGHT:**
```
get_symbols_overview("src/modules/product/repository.ts")  # See structure
find_symbol("ProductRepository/createProduct", include_body=True)  # Read only what you need
```

**Impact:** 80-90% reduction in token usage

### Rule #2: Always Use relative_path When You Know the Location
**Global searches are slow and return too many results.**

❌ **SLOW:**
```
find_symbol("ProductService")  # Searches entire codebase, including tests
```

✅ **FAST:**
```
find_symbol("ProductService", relative_path="src/modules/product")  # 5-10x faster
```

### Rule #3: Start with Symbol Overview for Unfamiliar Files
**Understand structure before diving into code.**

❌ **INEFFICIENT:**
```
# Reading methods one by one without knowing what's available
find_symbol("ProductService/method1", include_body=True)
find_symbol("ProductService/method2", include_body=True)
# ... guessing method names
```

✅ **EFFICIENT:**
```
# First see what's available
get_symbols_overview("src/modules/product/product-service.ts")

# Or see method hierarchy
find_symbol("ProductService", depth=1, include_body=False)

# THEN read specific methods
find_symbol("ProductService/upsertProduct", include_body=True)
```

### Rule #4: Exclude Test Files in Production Code Searches
**Test files clutter search results.**

❌ **CLUTTERED:**
```
find_symbol("Product")  # Returns ProductService, ProductTest, ProductMock, etc.
```

✅ **CLEAN:**
```
find_symbol("Product", paths_exclude_glob="**/*.test.ts")  # Only production code
```

### Rule #5: Use depth=1 to See Method Hierarchies
**See what's available without reading implementations.**

❌ **WASTEFUL:**
```
find_symbol("ProductService", include_body=True)  # Reads entire 790-line file
```

✅ **SMART:**
```
find_symbol("ProductService", depth=1, include_body=False)  # See all 26 methods
# Then read only what you need
find_symbol("ProductService/upsertProduct", include_body=True)
```

---

## DO's and DON'Ts by Category

### File Reading

#### ✅ DO

- **Start with symbol overview** for files >300 lines
- **Use symbolic tools** for TypeScript/JavaScript code
- **Read selectively** - only the methods/classes you need
- **Check file sizes** before reading (see serena_navigation_guide)
- **Use pattern search** for non-code content (comments, strings, etc.)

```bash
# Good practices
get_symbols_overview("src/modules/product/product-service.ts")
find_symbol("ProductService/upsertProduct", include_body=True)
search_for_pattern("TODO:", relative_path="src")
```

#### ❌ DON'T

- **Never read large files completely** (>500 lines) without exploring first
- **Don't read entire classes** when you only need one method
- **Don't use read_file** for TypeScript code files
- **Don't read test files** when looking for implementation

```bash
# Bad practices
read_file("src/modules/product/repository.ts")  # 1,284 lines!
find_symbol("ProductService", include_body=True)  # 790 lines!
read_file("src/modules/config/schema/schema.ts")  # 956 lines!
```

### Symbol Discovery

#### ✅ DO

- **Use naming patterns** to find symbols (Service, Repository, Comparator)
- **Use substring matching** when you don't know exact names
- **Use relative_path** to narrow search scope
- **Use include_kinds/exclude_kinds** to filter symbol types
- **Leverage depth parameter** to see hierarchies

```bash
# Good practices
find_symbol("ProductService", relative_path="src/modules/product")
find_symbol("Comparator", substring_matching=True, relative_path="src/core/diff/comparators")
find_symbol("Error", substring_matching=True, exclude_kinds=[13])  # Exclude variables
find_symbol("ProductService", depth=1, include_body=False)
```

#### ❌ DON'T

- **Don't use vague search terms** without filters
- **Don't search globally** when you know the module
- **Don't forget to exclude tests** in production code searches
- **Don't assume symbol names** - verify with overview first

```bash
# Bad practices
find_symbol("product")  # Too vague, many results
find_symbol("ProductService")  # No relative_path, slow
find_symbol("Product")  # Includes tests
# Assuming names without checking:
find_symbol("createProduct")  # Actual name might be "createProductMutation"
```

### Working with Large Files

#### ✅ DO

- **Check serena_navigation_guide** for file sizes first
- **Use get_symbols_overview** for files with 10+ symbols
- **Use substring matching** for schema.ts (72 symbols)
- **Read repository classes** separately from GraphQL definitions
- **Navigate method by method** for large services

```bash
# For config/schema/schema.ts (956 lines, 72 symbols)
find_symbol("category", substring_matching=True, relative_path="src/modules/config/schema")

# For product/repository.ts (1,284 lines)
get_symbols_overview("src/modules/product/repository.ts")
find_symbol("ProductRepository/createProduct", include_body=True)

# For product/product-service.ts (790 lines, 26 methods)
find_symbol("ProductService", depth=1, include_body=False)  # See all methods
find_symbol("ProductService/upsertProduct", include_body=True)  # Read one
```

#### ❌ DON'T

- **Don't try to read schema.ts completely** - 956 lines
- **Don't read product repository completely** - 1,284 lines
- **Don't read large services completely** - use depth=1 first
- **Don't use global searches** in large files

### Token Optimization

#### ✅ DO

- **Calculate token cost** before reading
  - 1 line ≈ 4-8 tokens
  - 500-line file ≈ 2,000-4,000 tokens
  - Symbol overview ≈ 100-300 tokens
- **Use most specific path possible**
- **Read incrementally** - overview → structure → specific symbols
- **Exclude irrelevant files** (tests, build outputs)
- **Use pattern search** for simple text matching

#### ❌ DON'T

- **Don't read speculatively** - know what you're looking for
- **Don't read entire files** to find one function
- **Don't read all methods** when you need one
- **Don't include test files** in production searches

### Symbol Editing

#### ✅ DO

- **Find references** before modifying symbols
- **Use replace_symbol_body** for method modifications
- **Use insert_after/before** for new methods
- **Use rename_symbol** for renaming
- **Verify changes** with find_referencing_symbols

```bash
# Safe modification workflow
find_referencing_symbols("ProductService/upsertProduct", "src/modules/product/product-service.ts")
replace_symbol_body("ProductService/upsertProduct", "src/modules/product/product-service.ts", new_code)
find_referencing_symbols("ProductService/upsertProduct", "src/modules/product/product-service.ts")  # Verify
```

#### ❌ DON'T

- **Don't modify** without checking references first
- **Don't change method signatures** without updating callers
- **Don't delete methods** without checking usage
- **Don't edit** without running tests after

### Reference Finding

#### ✅ DO

- **Find references** before refactoring
- **Check impact** of signature changes
- **Map dependencies** before modifications
- **Verify all callers** after changes

```bash
# Good reference workflow
find_referencing_symbols("ProductService/method", "src/modules/product/product-service.ts")
# Review each reference
# Make modifications
# Re-check references
find_referencing_symbols("ProductService/method", "src/modules/product/product-service.ts")
```

#### ❌ DON'T

- **Don't skip reference checking** before modifying
- **Don't assume no usage** without verification
- **Don't change public APIs** without impact analysis

---

## Patterns for Common Tasks

### Pattern: Finding a Class

```bash
# 1. Know the module
find_symbol("{Class}Name", relative_path="src/modules/{module}")

# 2. Don't know the module - use service pattern
find_symbol("{Entity}Service", relative_path="src/modules")

# 3. Find by role
find_symbol("Comparator", substring_matching=True, relative_path="src/core/diff/comparators")
```

### Pattern: Understanding a Class

```bash
# 1. Get overview
get_symbols_overview("src/path/to/file.ts")

# 2. See structure
find_symbol("ClassName", depth=1, include_body=False)

# 3. Read specific methods
find_symbol("ClassName/methodName", include_body=True)

# 4. Find usage
find_referencing_symbols("ClassName", "src/path/to/file.ts")
```

### Pattern: Modifying a Method

```bash
# 1. Find the method
find_symbol("ClassName/methodName", relative_path="src/path")

# 2. Read current implementation
find_symbol("ClassName/methodName", include_body=True, relative_path="src/path")

# 3. Check references
find_referencing_symbols("ClassName/methodName", "src/path/file.ts")

# 4. Modify
replace_symbol_body("ClassName/methodName", "src/path/file.ts", new_implementation)

# 5. Verify
find_referencing_symbols("ClassName/methodName", "src/path/file.ts")
```

### Pattern: Adding a New Feature

```bash
# 1. Find similar features
find_symbol("ServiceClass", depth=1, relative_path="src/modules/{module}")

# 2. Read similar method
find_symbol("ServiceClass/similarMethod", include_body=True, relative_path="src/modules/{module}")

# 3. Check repository
get_symbols_overview("src/modules/{module}/repository.ts")

# 4. Add new method
insert_after_symbol("ServiceClass/lastMethod", "src/modules/{module}/service.ts", new_method)
```

### Pattern: Debugging an Error

```bash
# 1. Find error definition
get_symbols_overview("src/modules/{module}/errors.ts")

# 2. Find where thrown
search_for_pattern("throw new {Error}Name", relative_path="src/modules/{module}")

# 3. Find handlers
search_for_pattern("catch.*{Error}Name", relative_path="src")

# 4. Trace context
find_symbol("{Service}/methodThatThrows", include_body=True)
find_referencing_symbols("{Service}/methodThatThrows", "src/modules/{module}/service.ts")
```

### Pattern: Working with Schemas

```bash
# ⚠️ Schema file has 72 symbols - special handling required

# 1. Always use substring matching
find_symbol("{entity}", substring_matching=True, relative_path="src/modules/config/schema")

# 2. Never try to get full overview
# DON'T: get_symbols_overview("src/modules/config/schema/schema.ts")  # Too many symbols

# 3. Find related schemas
find_symbol("category", substring_matching=True, relative_path="src/modules/config/schema")
# Returns: categorySchema, categoryCreateSchema, categoryUpdateSchema

# 4. Read specific schema once found
find_symbol("categoryCreateSchema", relative_path="src/modules/config/schema/schema.ts")
```

---

## Project-Specific Best Practices

### For Product Module (Complex, 5 files)

```bash
# Service (790 lines, 26 methods)
find_symbol("ProductService", depth=1, include_body=False)  # See methods first
find_symbol("ProductService/{method}", include_body=True)  # Read selectively

# Repository (1,284 lines - LARGEST FILE)
get_symbols_overview("src/modules/product/repository.ts")  # ALWAYS overview first
find_symbol("ProductRepository/{method}", include_body=True)  # Read one method at a time

# Helper files (manageable)
# attribute-resolver.ts and media-metadata.ts can be read directly if needed
```

### For Config Module (Most Complex)

```bash
# Service (915 lines, 34 methods)
find_symbol("ConfigurationService", depth=1, include_body=False)

# Schema (956 lines, 72 symbols - MOST CHALLENGING)
# ALWAYS use substring matching
find_symbol("{entity}", substring_matching=True, relative_path="src/modules/config/schema")

# Repository (831 lines)
get_symbols_overview("src/modules/config/repository.ts")
```

### For Standard Modules (Simple, 3 files each)

```bash
# These are straightforward
find_symbol("{Module}Service", relative_path="src/modules/{module}")
find_symbol("{Module}Service", depth=1)  # See structure
find_symbol("{Module}Service/{method}", include_body=True)  # Read method
```

### For Comparators (Well-organized)

```bash
# All comparators follow same pattern
find_symbol("{Entity}Comparator", relative_path="src/core/diff/comparators")
find_symbol("{Entity}Comparator", depth=1)  # See compare methods
find_symbol("{Entity}Comparator/compare", include_body=True)
```

---

## Performance Optimization Tips

### Tip #1: Cache Knowledge
Once you find a file location, remember it. Don't search again.

### Tip #2: Use Most Specific Paths
```bash
# Slow
find_symbol("ProductService")

# Fast
find_symbol("ProductService", relative_path="src/modules/product")

# Fastest
find_symbol("ProductService", relative_path="src/modules/product/product-service.ts")
```

### Tip #3: Read Method Names Before Bodies
```bash
# See all 26 method names: ~200 tokens
find_symbol("ProductService", depth=1, include_body=False)

# vs Reading all method bodies: ~3,000+ tokens
find_symbol("ProductService", include_body=True)
```

### Tip #4: Exclude Unnecessary Files
```bash
# Exclude tests
find_symbol("Product", paths_exclude_glob="**/*.test.ts")

# Exclude build outputs
find_symbol("Product", paths_exclude_glob="**/dist/**")
```

### Tip #5: Use Pattern Search for Simple Text
```bash
# Finding TODO comments
search_for_pattern("TODO:", relative_path="src")  # Fast text search

# vs
find_symbol("TODO")  # Wrong tool for the job
```

---

## Common Mistakes to Avoid

### Mistake #1: Reading Large Files Completely
```bash
❌ read_file("src/modules/product/repository.ts")  # 1,284 lines, ~5,000 tokens

✅ get_symbols_overview("src/modules/product/repository.ts")  # ~300 tokens
✅ find_symbol("ProductRepository/method", include_body=True)  # ~100 tokens
```

**Savings:** 95% reduction in tokens

### Mistake #2: Global Searches Without Filters
```bash
❌ find_symbol("ProductService")  # Slow, searches everywhere

✅ find_symbol("ProductService", relative_path="src/modules/product")  # 10x faster
```

### Mistake #3: Not Checking File Sizes
```bash
❌ # Trying to work with product/repository.ts without knowing it's 1,284 lines

✅ # Check serena_navigation_guide first to know file sizes
✅ # Use symbolic approach for files >500 lines
```

### Mistake #4: Forgetting to Exclude Tests
```bash
❌ find_symbol("Product")  # Returns ProductService, ProductTest, ProductMock, etc.

✅ find_symbol("Product", paths_exclude_glob="**/*.test.ts")  # Clean results
```

### Mistake #5: Reading Methods One by One Without Seeing Structure
```bash
❌ find_symbol("ProductService/method1", include_body=True)
❌ find_symbol("ProductService/method2", include_body=True)
❌ # ...guessing method names

✅ find_symbol("ProductService", depth=1, include_body=False)  # See all methods first
✅ # Then read specific ones
```

### Mistake #6: Modifying Without Checking References
```bash
❌ replace_symbol_body("ProductService/method", "src/...", new_code)  # Hope nothing breaks

✅ find_referencing_symbols("ProductService/method", "src/.../service.ts")  # Check impact first
✅ replace_symbol_body("ProductService/method", "src/...", new_code)
✅ find_referencing_symbols("ProductService/method", "src/.../service.ts")  # Verify
```

### Mistake #7: Not Using substring_matching for Discovery
```bash
❌ find_symbol("categorySchema")  # Need exact name

✅ find_symbol("category", substring_matching=True, relative_path="src/modules/config/schema")
# Finds: categorySchema, categoryCreateSchema, categoryUpdateSchema, etc.
```

---

## Checklists

### Before Reading Any File

- [ ] Check file size in serena_navigation_guide
- [ ] If >500 lines, use symbolic approach
- [ ] Start with get_symbols_overview
- [ ] Use relative_path if you know location
- [ ] Exclude test files if looking for implementation

### Before Modifying Any Symbol

- [ ] Read current implementation
- [ ] Find all references with find_referencing_symbols
- [ ] Understand impact on callers
- [ ] Make modification
- [ ] Re-check references to verify
- [ ] Run tests

### Before Searching

- [ ] Know what you're looking for
- [ ] Use most specific path possible
- [ ] Use naming patterns (Service, Repository, Comparator)
- [ ] Exclude irrelevant files
- [ ] Use appropriate tool (find_symbol vs search_for_pattern)

---

## Quick Reference: Tool Selection

| Task | Tool | Example |
|------|------|---------|
| Find class/function | `find_symbol` | `find_symbol("ProductService")` |
| See class structure | `find_symbol` with depth | `find_symbol("ProductService", depth=1)` |
| Find by pattern | `find_symbol` with substring | `find_symbol("Service", substring_matching=True)` |
| Get file overview | `get_symbols_overview` | `get_symbols_overview("file.ts")` |
| Find text pattern | `search_for_pattern` | `search_for_pattern("TODO:")` |
| Find references | `find_referencing_symbols` | `find_referencing_symbols("Class/method", "file.ts")` |
| Read small file | `read_file` | `read_file("config.json")` |
| List directory | `list_dir` | `list_dir("src/modules", recursive=False)` |

---

## Summary: The Serena Mindset

1. **Think Symbolically** - Code is made of symbols, not text
2. **Navigate Hierarchically** - Overview → Structure → Details
3. **Read Selectively** - Only what you need, when you need it
4. **Search Specifically** - Use paths, patterns, and filters
5. **Verify Impact** - Check references before and after changes
6. **Optimize Tokens** - Every token counts, use them wisely
7. **Know Your Codebase** - Large files need special handling

**Remember:** Serena is about semantic understanding through symbolic navigation, not reading files like a text editor. Use its capabilities to navigate efficiently!