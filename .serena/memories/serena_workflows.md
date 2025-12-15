# Serena Workflows for Saleor Configurator

## Overview

This memory documents common development workflows optimized for Serena's symbolic capabilities. Each workflow is designed to maximize efficiency and minimize token usage.

---

## Workflow 1: Adding a New Feature to Existing Service

### Scenario
You need to add a new method or modify existing functionality in a domain service.

### Steps

**1. Locate the Service**
```bash
find_symbol("{Module}Service", relative_path="src/modules/{module}")
```

**2. Review Existing Methods (Without Reading Bodies)**
```bash
# See all methods in the service
find_symbol("{Module}Service", depth=1, include_body=False, relative_path="src/modules/{module}")

# This shows you:
# - Method names
# - Method signatures
# - Class structure
# - Without consuming tokens on implementation
```

**3. Read Relevant Method Bodies for Context**
```bash
# Only read methods related to your feature
find_symbol("{Module}Service/similarMethod", include_body=True, relative_path="src/modules/{module}")
find_symbol("{Module}Service/anotherRelevantMethod", include_body=True, relative_path="src/modules/{module}")
```

**4. Check Repository Methods**
```bash
# See what repository methods are available
get_symbols_overview("src/modules/{module}/repository.ts")

# Read specific repository method
find_symbol("{Module}Repository/relevantMethod", include_body=True, relative_path="src/modules/{module}")
```

**5. Check for References Before Modifying**
```bash
# If modifying existing method, find all callers
find_referencing_symbols("{Module}Service/methodToModify", "src/modules/{module}/{module}-service.ts")
```

**6. Make Changes Using Symbol Editing**
```bash
# Use replace_symbol_body for method modifications
replace_symbol_body("{Module}Service/methodName", "src/modules/{module}/{module}-service.ts", new_body)

# Or insert new methods
insert_after_symbol("{Module}Service/lastMethod", "src/modules/{module}/{module}-service.ts", new_method_code)
```

**Token Savings:** 70-80% compared to reading entire files

---

## Workflow 2: Understanding and Fixing Errors

### Scenario
An error is being thrown and you need to understand the error flow.

### Steps

**1. Find Error Definition**
```bash
# Get overview of error file
get_symbols_overview("src/modules/{module}/errors.ts")

# Or find specific error
find_symbol("{Specific}Error", relative_path="src/modules/{module}/errors.ts")
```

**2. Find Where Error is Thrown**
```bash
# Search for throw statements
search_for_pattern("throw new {Specific}Error", relative_path="src/modules/{module}")

# Or search across codebase
search_for_pattern("throw new {Specific}Error", relative_path="src")
```

**3. Find Error Handlers**
```bash
# Find references to the error class
find_referencing_symbols("{Specific}Error", "src/modules/{module}/errors.ts")

# Search for catch blocks
search_for_pattern("catch.*{Specific}Error", relative_path="src")
```

**4. Trace Error Context**
```bash
# Read the method that throws the error
find_symbol("{Module}Service/methodThatThrows", include_body=True, relative_path="src/modules/{module}")

# Find what calls that method
find_referencing_symbols("{Module}Service/methodThatThrows", "src/modules/{module}/{module}-service.ts")
```

**5. Understand Error Hierarchy**
```bash
# Check if error extends BaseError
read_memory("code_style_and_conventions")  # See error hierarchy

# Find all errors in module
find_symbol("Error", substring_matching=True, relative_path="src/modules/{module}/errors.ts")
```

---

## Workflow 3: Debugging GraphQL Integration

### Scenario
You need to understand or fix GraphQL query/mutation integration.

### Steps

**1. Locate GraphQL Definitions**
```bash
# Find GraphQL queries/mutations in repository
search_for_pattern("graphql\(`", relative_path="src/modules/{module}/repository.ts", output_mode="content")

# Or get repository overview
get_symbols_overview("src/modules/{module}/repository.ts")
# Look for symbols ending in "Query" or "Mutation"
```

**2. Find Specific Query/Mutation**
```bash
# If you know the name
find_symbol("createProductMutation", relative_path="src/modules/{module}/repository.ts")

# If you're searching
find_symbol("product", substring_matching=True, relative_path="src/modules/{module}/repository.ts")
```

**3. Find Repository Method Using Query**
```bash
# See all repository methods
find_symbol("{Module}Repository", depth=1, relative_path="src/modules/{module}")

# Read specific method
find_symbol("{Module}Repository/createMethod", include_body=True, relative_path="src/modules/{module}")
```

**4. Find Service Calling Repository**
```bash
# Find where repository method is called
find_referencing_symbols("{Module}Repository/method", "src/modules/{module}/repository.ts")

# Read service method
find_symbol("{Module}Service/methodCallingRepo", include_body=True, relative_path="src/modules/{module}")
```

**5. Check GraphQL Schema Integration**
```bash
# Find type definitions
search_for_pattern("type.*=.*ResultOf", relative_path="src/modules/{module}/repository.ts")
```

**6. Test Integration**
```bash
# Find related tests
find_symbol("{Module}Repository", relative_path="src/modules/{module}/repository.test.ts")
```

---

## Workflow 4: Working with Comparators

### Scenario
You need to modify or understand diff comparison logic.

### Steps

**1. Find the Comparator**
```bash
# Find specific comparator
find_symbol("{Entity}Comparator", relative_path="src/core/diff/comparators")

# Or find all comparators
find_symbol("Comparator", substring_matching=True, relative_path="src/core/diff/comparators")
```

**2. Review Comparator Structure**
```bash
# See all methods
find_symbol("{Entity}Comparator", depth=1, relative_path="src/core/diff/comparators")

# Typical methods: compare, compareEntityFields, normalizeData, etc.
```

**3. Read Comparison Logic**
```bash
# Read main compare method
find_symbol("{Entity}Comparator/compare", include_body=True, relative_path="src/core/diff/comparators")

# Read helper methods
find_symbol("{Entity}Comparator/compareEntityFields", include_body=True, relative_path="src/core/diff/comparators")
```

**4. Check Where Comparator is Used**
```bash
# Find references
find_referencing_symbols("{Entity}Comparator", "src/core/diff/comparators/{entity}-comparator.ts")

# Usually used in diff service
find_symbol("DiffService", relative_path="src/core/diff")
```

**5. Check Related Tests**
```bash
# Find comparator tests
find_symbol("{Entity}Comparator", relative_path="src/core/diff/comparators/{entity}-comparator.test.ts")
```

---

## Workflow 5: Finding and Working with Schemas

### Scenario
You need to find or modify Zod schemas for configuration validation.

### Steps

**1. Locate Schema File**
```bash
# ⚠️ Schema file has 72 symbols - ALWAYS use substring matching
find_symbol("{entity}", substring_matching=True, relative_path="src/modules/config/schema")
```

**2. Find Related Schemas**
```bash
# Find all category schemas
find_symbol("category", substring_matching=True, relative_path="src/modules/config/schema")
# Returns: categorySchema, categoryCreateSchema, categoryUpdateSchema, etc.

# Find all product schemas
find_symbol("product", substring_matching=True, relative_path="src/modules/config/schema")
```

**3. Read Specific Schema**
```bash
# Once you know the exact name
find_symbol("categoryCreateSchema", relative_path="src/modules/config/schema/schema.ts")
```

**4. Find Where Schema is Used**
```bash
# Find references to the schema
find_referencing_symbols("categoryCreateSchema", "src/modules/config/schema/schema.ts")
```

**5. Check Schema Helpers**
```bash
# Helper schemas are in the same file
find_symbol("helper", substring_matching=True, relative_path="src/modules/config/schema")
```

---

## Workflow 6: Modifying Deployment Pipeline

### Scenario
You need to add or modify deployment stages.

### Steps

**1. Review Stage Definitions**
```bash
# Get overview of stages file
get_symbols_overview("src/core/deployment/stages.ts")

# Find specific stage
find_symbol("{entity}Stage", relative_path="src/core/deployment/stages.ts")
```

**2. Understand Stage Structure**
```bash
# Read a stage definition
find_symbol("productsStage", relative_path="src/core/deployment/stages.ts")

# See getAllStages function
find_symbol("getAllStages", relative_path="src/core/deployment/stages.ts")
```

**3. Check Pipeline Integration**
```bash
# See how pipeline uses stages
find_symbol("DeploymentPipeline", relative_path="src/core/deployment/pipeline.ts")

# Read execute method
find_symbol("DeploymentPipeline/execute", include_body=True, relative_path="src/core/deployment")
```

**4. Check Stage Results**
```bash
# Review result tracking
get_symbols_overview("src/core/deployment/results.ts")
```

---

## Workflow 7: Code Review with Serena

### Scenario
Reviewing a PR or code changes.

### Steps

**1. Identify Changed Files**
```bash
# Use git diff or PR view
# Then for each changed file...
```

**2. Get Context (Before Reading Changes)**
```bash
# Get symbol overview of changed file
get_symbols_overview("path/to/changed/file.ts")

# Understand what symbols were modified
```

**3. Review Changes Symbolically**
```bash
# If method was modified, read just that method
find_symbol("ClassName/modifiedMethod", include_body=True, relative_path="path/to/file")

# Check if method signature changed
find_symbol("ClassName", depth=1, relative_path="path/to/file")
```

**4. Check Impact**
```bash
# Find all references to modified symbol
find_referencing_symbols("ClassName/modifiedMethod", "path/to/file.ts")

# Review each caller
find_symbol("CallerClass/callerMethod", include_body=True, relative_path="path/to/caller")
```

**5. Verify Tests**
```bash
# Find related tests
find_symbol("ClassName", relative_path="path/to/file.test.ts")

# Check if new tests were added
get_symbols_overview("path/to/file.test.ts")
```

---

## Workflow 8: Safe Refactoring

### Scenario
You want to refactor code without breaking references.

### Steps

**1. Identify Symbol to Refactor**
```bash
# Find the symbol
find_symbol("ClassName/methodToRefactor", relative_path="path/to/file")
```

**2. Map All References**
```bash
# Find every place it's used
find_referencing_symbols("ClassName/methodToRefactor", "path/to/file.ts")

# Save this list for later verification
```

**3. Check Dependencies**
```bash
# See what the method depends on
find_symbol("ClassName/methodToRefactor", include_body=True, relative_path="path/to/file")

# Look for other methods it calls
```

**4. Perform Refactoring**
```bash
# Option 1: Rename symbol (if just renaming)
rename_symbol("ClassName/methodToRefactor", "path/to/file.ts", "newName")

# Option 2: Replace body (if changing implementation)
replace_symbol_body("ClassName/methodToRefactor", "path/to/file.ts", new_implementation)
```

**5. Verify All References Still Work**
```bash
# Re-check references to ensure they work
find_referencing_symbols("ClassName/newName", "path/to/file.ts")

# Manually review each one if signature changed
```

**6. Run Tests**
```bash
# Execute test suite
execute_shell_command("pnpm test")
```

---

## Workflow 9: Adding Tests for Existing Code

### Scenario
You need to add tests for existing functionality.

### Steps

**1. Locate Code to Test**
```bash
# Find the symbol
find_symbol("ClassName/methodToTest", relative_path="src/path/to/file")
```

**2. Read Method Implementation**
```bash
# Understand what it does
find_symbol("ClassName/methodToTest", include_body=True, relative_path="src/path/to/file")

# Check dependencies
find_symbol("ClassName", depth=1, relative_path="src/path/to/file")
```

**3. Check Existing Tests**
```bash
# See if test file exists
list_dir("src/path/to", recursive=False)

# If exists, get overview
get_symbols_overview("src/path/to/file.test.ts")
```

**4. Find Similar Tests for Patterns**
```bash
# Find other tests in module
find_symbol("test", substring_matching=True, relative_path="src/modules/{module}")

# Read similar test for pattern
find_symbol("describe", substring_matching=True, relative_path="src/modules/{module}/similar.test.ts")
```

**5. Check Test Helpers**
```bash
# Find test utilities
list_dir("test-helpers", recursive=False)
get_symbols_overview("test-helpers/config-file-builder.ts")
```

**6. Add Tests**
```bash
# Insert new test cases
insert_after_symbol("describe", "src/path/to/file.test.ts", new_test_code)
```

---

## Workflow 10: Understanding Command Flow

### Scenario
You need to understand how a CLI command works end-to-end.

### Steps

**1. Find Command Handler**
```bash
# Locate command file
find_symbol("{Command}CommandHandler", relative_path="src/commands")
```

**2. Read Command Entry Point**
```bash
# Read the handler function
find_symbol("{command}Handler", relative_path="src/commands/{command}.ts")

# Or read the class
find_symbol("{Command}CommandHandler", depth=1, relative_path="src/commands")
```

**3. Trace Service Calls**
```bash
# Find what services it uses
# Read command handler body to see service calls
find_symbol("{Command}CommandHandler/execute", include_body=True, relative_path="src/commands")

# Then find those services
find_symbol("{Service}Service", relative_path="src/modules/{module}")
```

**4. Check Configurator Integration**
```bash
# See how configurator orchestrates
find_symbol("Configurator", relative_path="src/core/configurator.ts")
find_symbol("Configurator/{commandMethod}", include_body=True, relative_path="src/core")
```

**5. Trace Error Handling**
```bash
# Find error handling in command
search_for_pattern("catch", relative_path="src/commands/{command}.ts")

# Check CLI error handling
get_symbols_overview("src/cli/errors.ts")
```

---

## General Best Practices Across All Workflows

### 🎯 Always Start With
1. **Symbol overview** for unfamiliar files
2. **relative_path** to narrow search scope
3. **Check file size** in serena_navigation_guide memory

### 🚀 Speed Tips
1. Use **depth=1** to see structure before reading
2. **Exclude test files** unless working on tests
3. **Read selectively** - only the symbols you need
4. **Cache knowledge** - remember file locations

### 💡 Token Optimization
1. **Never read large files completely** (>500 lines)
2. **Use find_symbol instead of read_file** for code
3. **Use search_for_pattern** for non-symbol content
4. **Exclude unnecessary symbol kinds** with include_kinds/exclude_kinds

### ⚠️ Watch Out For
1. **config/schema/schema.ts** - 72 symbols, always use substring matching
2. **product/repository.ts** - 1,284 lines, always use symbolic approach
3. **Large service files** - Use depth=1 first
4. **Test files in results** - Exclude with paths_exclude_glob

---

## Quick Workflow Decision Tree

```
START: What do you need to do?

├─ Add feature to service
│  └─ Use Workflow 1: Adding a New Feature
│
├─ Fix an error
│  └─ Use Workflow 2: Understanding and Fixing Errors
│
├─ Debug GraphQL issue
│  └─ Use Workflow 3: Debugging GraphQL Integration
│
├─ Modify comparison logic
│  └─ Use Workflow 4: Working with Comparators
│
├─ Find/modify schema
│  └─ Use Workflow 5: Finding and Working with Schemas
│
├─ Change deployment
│  └─ Use Workflow 6: Modifying Deployment Pipeline
│
├─ Review code
│  └─ Use Workflow 7: Code Review with Serena
│
├─ Refactor code
│  └─ Use Workflow 8: Safe Refactoring
│
├─ Add tests
│  └─ Use Workflow 9: Adding Tests for Existing Code
│
└─ Understand command
   └─ Use Workflow 10: Understanding Command Flow
```

---

## Workflow Templates

### Template: New Module Feature
```bash
# 1. Context
find_symbol("{Module}Service", depth=1, relative_path="src/modules/{module}")

# 2. Read similar feature
find_symbol("{Module}Service/similarMethod", include_body=True, relative_path="src/modules/{module}")

# 3. Check repository
get_symbols_overview("src/modules/{module}/repository.ts")

# 4. Implement
# [Make changes]

# 5. Test
find_symbol("{Module}Service", relative_path="src/modules/{module}/{module}-service.test.ts")
```

### Template: Bug Fix
```bash
# 1. Locate bug
find_symbol("{Class}/{method}", relative_path="src/path")

# 2. Read implementation
find_symbol("{Class}/{method}", include_body=True, relative_path="src/path")

# 3. Find callers
find_referencing_symbols("{Class}/{method}", "src/path/file.ts")

# 4. Fix
replace_symbol_body("{Class}/{method}", "src/path/file.ts", fixed_code)

# 5. Verify
execute_shell_command("pnpm test src/path/file.test.ts")
```

### Template: Understanding Unknown Code
```bash
# 1. Overview
get_symbols_overview("src/path/to/file.ts")

# 2. Structure
find_symbol("MainClass", depth=1, relative_path="src/path")

# 3. Read selectively
find_symbol("MainClass/interestingMethod", include_body=True, relative_path="src/path")

# 4. Trace usage
find_referencing_symbols("MainClass", "src/path/file.ts")
```

---

## Summary

✅ **Key Takeaway:** Every workflow benefits from Serena's symbolic approach:
- **Start with overview** - Understand structure
- **Navigate symbolically** - Find what you need
- **Read selectively** - Only necessary code
- **Verify with references** - Check impact

This saves 70-80% of tokens and 50%+ of time compared to reading entire files!