# Serena Usage Guide for Saleor Configurator

Welcome to the Serena-enhanced Saleor Configurator project! This guide will help you navigate and work with this codebase efficiently using Serena's semantic code understanding tools.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Most Common Operations](#most-common-operations)
3. [File Size Reference](#file-size-reference)
4. [Module Quick Reference](#module-quick-reference)
5. [Navigation Tips](#navigation-tips)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### First Time Using Serena?

Read these memories in order:
1. `serena_navigation_guide` - How to find code efficiently
2. `serena_best_practices` - DO/DON'T patterns
3. `serena_workflows` - Common task workflows
4. `codebase_architecture_map` - Project structure overview

**Read a memory:**
```
read_memory("serena_navigation_guide")
```

### Essential Serena Commands

```bash
# Find a service
find_symbol("ProductService", relative_path="src/modules/product")

# See all methods in a service (without reading bodies)
find_symbol("ProductService", depth=1, include_body=False, relative_path="src/modules/product")

# Read a specific method
find_symbol("ProductService/upsertProduct", include_body=True, relative_path="src/modules/product")

# Find all comparators
find_symbol("Comparator", substring_matching=True, relative_path="src/core/diff/comparators")

# Get file overview
get_symbols_overview("src/modules/product/product-service.ts")
```

---

## Most Common Operations

### Find a Service

**Pattern:** All services follow `{Module}Service` naming

```bash
# Know the module
find_symbol("ProductService", relative_path="src/modules/product")

# Don't know the module
find_symbol("ProductService", relative_path="src/modules")

# Find all services
find_symbol("Service", substring_matching=True, relative_path="src/modules")
```

**Available Services:**
AttributeService, CategoryService, ChannelService, CollectionService, ConfigurationService, MenuService, ModelService, PageTypeService, ProductService, ProductTypeService, ShippingZoneService, ShopService, TaxService, WarehouseService

### Find a Comparator

**Pattern:** All comparators follow `{Entity}Comparator` naming

```bash
# Find specific comparator
find_symbol("ProductComparator", relative_path="src/core/diff/comparators")

# Find all comparators
find_symbol("Comparator", substring_matching=True, relative_path="src/core/diff/comparators")

# See comparator methods
find_symbol("ProductComparator", depth=1, relative_path="src/core/diff/comparators")
```

### Find a Schema

**⚠️ IMPORTANT:** Schema file has 72 symbols - ALWAYS use substring matching!

```bash
# Find category-related schemas
find_symbol("category", substring_matching=True, relative_path="src/modules/config/schema")

# Find product-related schemas
find_symbol("product", substring_matching=True, relative_path="src/modules/config/schema")

# Find tax-related schemas
find_symbol("tax", substring_matching=True, relative_path="src/modules/config/schema")
```

### Find an Error

```bash
# Module-specific errors
get_symbols_overview("src/modules/product/errors.ts")

# All errors in a module
find_symbol("Error", substring_matching=True, relative_path="src/modules/product")

# Core errors
find_symbol("Error", substring_matching=True, relative_path="src/lib/errors")
```

### Find Where Something is Used

```bash
# Find all references to a method
find_referencing_symbols("ProductService/upsertProduct", "src/modules/product/product-service.ts")

# Find all references to a class
find_referencing_symbols("ProductService", "src/modules/product/product-service.ts")
```

---

## File Size Reference

### 🔴 LARGE FILES - Always Use Symbolic Tools

These files are too large to read directly. ALWAYS start with symbol overview or targeted searches.

| File | Lines | Strategy |
|------|-------|----------|
| `modules/product/repository.ts` | 1,284 | `get_symbols_overview` → `find_symbol` for specific methods |
| `modules/config/schema/schema.ts` | 956 | **Always use** `substring_matching=True` |
| `modules/config/config-service.ts` | 915 | Use `depth=1` to see methods |
| `modules/config/repository.ts` | 831 | Symbol overview first |
| `modules/product/product-service.ts` | 790 | Use `depth=1` to see all 26 methods |
| `modules/shipping-zone/shipping-zone-service.ts` | 621 | Symbol overview first |
| `modules/shipping-zone/repository.ts` | 609 | Symbol overview first |
| `core/diff/service.ts` | 554 | Symbol overview first |

### 🟢 SMALL FILES - Can Read or Use Overview

77% of files (99 files) are < 300 lines and can be read directly or with symbol overview.

---

## Module Quick Reference

### Standard Modules (Easy - 3 files each)

**Pattern:** `{module}-service.ts` + `repository.ts` + `errors.ts`

**Modules:** attribute, category, channel, collection, menu, model, page-type, product-type, shop, tax, warehouse

**Example Navigation:**
```bash
# Find service
find_symbol("CategoryService", relative_path="src/modules/category")

# See methods
find_symbol("CategoryService", depth=1, relative_path="src/modules/category")

# Read specific method
find_symbol("CategoryService/upsertCategory", include_body=True, relative_path="src/modules/category")
```

### Complex Modules (Require Special Handling)

#### Product Module (5 files)

```bash
# Service (790 lines, 26 methods)
find_symbol("ProductService", depth=1, include_body=False, relative_path="src/modules/product")

# Repository (1,284 lines - LARGEST FILE)
get_symbols_overview("src/modules/product/repository.ts")
find_symbol("ProductRepository/createProduct", include_body=True, relative_path="src/modules/product")

# Helper files
get_symbols_overview("src/modules/product/attribute-resolver.ts")
get_symbols_overview("src/modules/product/media-metadata.ts")
```

#### Config Module (Most complex)

```bash
# Service (915 lines, 34 methods)
find_symbol("ConfigurationService", depth=1, include_body=False, relative_path="src/modules/config")

# Schema (956 lines, 72 schemas - ALWAYS use substring matching)
find_symbol("category", substring_matching=True, relative_path="src/modules/config/schema")
find_symbol("product", substring_matching=True, relative_path="src/modules/config/schema")
```

#### Shipping Zone Module (Large files)

```bash
# Both service and repository are large
get_symbols_overview("src/modules/shipping-zone/shipping-zone-service.ts")
find_symbol("ShippingZoneService", depth=1, relative_path="src/modules/shipping-zone")
```

---

## Navigation Tips

### ✅ DO

- **Start with symbol overview** for unfamiliar files
- **Use relative_path** whenever you know the general location
- **Use depth=1** to see method hierarchies before reading
- **Exclude test files** when searching for production code: `paths_exclude_glob="**/*.test.ts"`
- **Use substring matching** for discovery: `find_symbol("Service", substring_matching=True)`
- **Check file sizes** in this guide before navigating

### ❌ DON'T

- **Never read large files directly** (>500 lines) without exploring symbols first
- **Don't search globally** when you know the module
- **Don't forget to exclude tests** in production code searches
- **Don't read entire classes** when you only need one method
- **Don't assume symbol names** - verify with overview first

### Performance Tips

1. **Most specific path wins:**
   - SLOW: `find_symbol("ProductService")`
   - FAST: `find_symbol("ProductService", relative_path="src/modules/product")`

2. **See structure before reading:**
   - Use `depth=1, include_body=False` first
   - Then read specific methods with `include_body=True`

3. **Token optimization:**
   - Symbol overview: ~200 tokens
   - Reading entire service: ~3,000+ tokens
   - Reading one method: ~100 tokens

---

## Navigation Patterns by Task

### Adding a Feature

```bash
# 1. Find the service
find_symbol("{Module}Service", relative_path="src/modules/{module}")

# 2. See what exists
find_symbol("{Module}Service", depth=1, include_body=False, relative_path="src/modules/{module}")

# 3. Read similar feature for context
find_symbol("{Module}Service/similarMethod", include_body=True, relative_path="src/modules/{module}")

# 4. Check repository
get_symbols_overview("src/modules/{module}/repository.ts")
```

### Fixing a Bug

```bash
# 1. Find the buggy code
find_symbol("{Class}/{method}", relative_path="src/path")

# 2. Read implementation
find_symbol("{Class}/{method}", include_body=True, relative_path="src/path")

# 3. Find callers
find_referencing_symbols("{Class}/{method}", "src/path/file.ts")

# 4. Fix and verify
replace_symbol_body("{Class}/{method}", "src/path/file.ts", fixed_code)
```

### Understanding Deployment

```bash
# 1. See all stages
get_symbols_overview("src/core/deployment/stages.ts")

# 2. Read specific stage
find_symbol("productsStage", relative_path="src/core/deployment/stages.ts")

# 3. Understand pipeline
find_symbol("DeploymentPipeline", relative_path="src/core/deployment/pipeline.ts")
find_symbol("DeploymentPipeline/execute", include_body=True, relative_path="src/core/deployment")
```

---

## Troubleshooting

### Problem: "Too many search results"

**Solutions:**
- Add `relative_path` to narrow scope
- Use `exclude_kinds` to filter symbol types
- Add `paths_exclude_glob="**/*.test.ts"` to exclude tests
- Be more specific with the name

### Problem: "Can't find a schema"

**Solution:**
```bash
# Schema file has 72 symbols - ALWAYS use substring matching
find_symbol("{entity_name}", substring_matching=True, relative_path="src/modules/config/schema")
```

### Problem: "Symbol overview is overwhelming"

**Solutions:**
- Use `include_kinds` to filter (e.g., only classes: `[5]`)
- Use substring matching with more specific names
- Read the specific symbol directly if you know its path

### Problem: "Don't know where to start"

**Solution:**
```bash
# 1. Read the architecture map
read_memory("codebase_architecture_map")

# 2. List directory to see what's there
list_dir("src/modules/{module}", recursive=False)

# 3. Get overview of main service file
get_symbols_overview("src/modules/{module}/{module}-service.ts")
```

---

## Quick Command Cheatsheet

```bash
# Discovery
find_symbol("ClassName", relative_path="src/path")
find_symbol("Service", substring_matching=True)
get_symbols_overview("src/path/file.ts")
list_dir("src/modules/product", recursive=False)

# Reading
find_symbol("ClassName", depth=1, include_body=False)  # Structure
find_symbol("ClassName/methodName", include_body=True)  # Specific method

# Searching
search_for_pattern("pattern", relative_path="src/path")  # Text search
find_referencing_symbols("ClassName/method", "src/path/file.ts")  # References

# Excluding tests
find_symbol("Product", paths_exclude_glob="**/*.test.ts")
```

---

## Learning Resources

### Memories to Read

1. **serena_navigation_guide** - Comprehensive navigation patterns
2. **serena_workflows** - Step-by-step workflows for common tasks
3. **serena_best_practices** - DO/DON'T patterns with examples
4. **codebase_architecture_map** - Full project structure reference
5. **code_style_and_conventions** - Coding standards + Serena patterns

### Slash Commands

- `/serena-help` - Quick reference guide
- `/find-code` - Guided code discovery

### Documentation

- `docs/SERENA_GUIDE.md` - Comprehensive team guide
- `.serena/workflows/` - Workflow templates
- `.serena/checklists/` - Pre-task checklists

---

## Getting Help

**Stuck on something?**

1. Check `serena_navigation_guide` for file-finding patterns
2. Check `serena_workflows` for task-specific workflows
3. Check `codebase_architecture_map` for project structure
4. Use `/serena-help` slash command for quick reference

**Remember:** Serena is about semantic understanding, not text reading. Use symbols, not files!

---

## Project-Specific Tips

### Working with Products
- Service has 26 methods - use `depth=1` first
- Repository is 1,284 lines - ALWAYS use symbolic approach
- Check `attribute-resolver.ts` for attribute handling
- Check `media-metadata.ts` for media URL logic

### Working with Schemas
- **NEVER** try to get overview of full schema.ts
- **ALWAYS** use substring matching: `find_symbol("category", substring_matching=True, ...)`
- Schema file has 72 exports - browsing is not practical

### Working with Comparators
- All follow same pattern - easy to navigate
- Use `find_symbol("Comparator", substring_matching=True)` to find all
- Read `compare()` method first to understand logic

### Working with Deployment
- See all stages: `get_symbols_overview("src/core/deployment/stages.ts")`
- Understand pipeline: `find_symbol("DeploymentPipeline", depth=1)`
- Check stage order in `getAllStages()` function

---

**Happy coding with Serena! 🚀**
