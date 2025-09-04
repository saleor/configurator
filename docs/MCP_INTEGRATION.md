# MCP Integration Guide

Comprehensive guide for effectively using Model Context Protocol (MCP) tools - Serena and Context7 - when working with the Saleor Configurator codebase. This guide provides patterns, best practices, and optimization strategies for maximum productivity.

## MCP Tools Overview

### Serena: Semantic Code Analysis Tool

**Primary Capabilities:**
- **Symbolic Code Analysis**: Navigate code through symbol relationships
- **Smart File Reading**: Read only necessary code sections
- **Context-Efficient Search**: Find specific patterns without reading entire files
- **Memory Management**: Store and recall project context

**Core Functions:**
- `find_symbol`: Locate symbols by name path
- `get_symbols_overview`: Get file structure overview
- `search_for_pattern`: Pattern-based code search
- `replace_symbol_body`: Edit symbols precisely
- `find_referencing_symbols`: Find code that references specific symbols

### Context7: Library Documentation Tool

**Primary Capabilities:**
- **Up-to-date Documentation**: Access latest library documentation
- **Intelligent Library Resolution**: Find correct library versions
- **Contextual Information**: Get relevant documentation sections

**Core Functions:**
- `resolve-library-id`: Find correct Context7 library identifier  
- `get-library-docs`: Retrieve focused documentation

## Serena Usage Patterns

### Pattern 1: Codebase Exploration

**Use Case**: Understanding project structure and finding relevant code

**Approach**: Start broad, then narrow down with symbolic tools

```bash
# 1. Get directory overview
mcp__serena__list_dir(relative_path: ".", recursive: true)

# 2. Explore key modules
mcp__serena__get_symbols_overview(relative_path: "src/modules/category")

# 3. Find specific symbols
mcp__serena__find_symbol(
  name_path: "CategoryService", 
  relative_path: "src/modules/category",
  depth: 1
)

# 4. Deep dive into specific methods
mcp__serena__find_symbol(
  name_path: "CategoryService/bootstrapCategories",
  include_body: true
)
```

**Benefits:**
- Avoid reading entire files unnecessarily
- Focus on relevant code sections
- Understand code structure efficiently

### Pattern 2: Feature Implementation Analysis

**Use Case**: Understanding how to implement a new feature based on existing patterns

**Approach**: Find similar implementations and analyze patterns

```bash
# 1. Find existing service implementations
mcp__serena__search_for_pattern(
  substring_pattern: "class.*Service",
  restrict_search_to_code_files: true,
  paths_include_glob: "src/modules/*/",
  context_lines_after: 5
)

# 2. Analyze specific service structure
mcp__serena__find_symbol(
  name_path: "ProductService",
  depth: 2,
  include_body: false
)

# 3. Study bootstrap pattern implementation
mcp__serena__find_symbol(
  name_path: "ProductService/bootstrapProducts",
  include_body: true
)

# 4. Find references to understand usage
mcp__serena__find_referencing_symbols(
  name_path: "ProductService/bootstrapProducts",
  relative_path: "src/modules/product/product-service.ts"
)
```

**Benefits:**
- Learn from existing patterns
- Ensure consistency with codebase
- Understand integration points

### Pattern 3: Error Investigation

**Use Case**: Debugging issues by tracing through code execution

**Approach**: Follow error path through symbol references

```bash
# 1. Find error class definition
mcp__serena__find_symbol(
  name_path: "CategoryValidationError",
  include_body: true
)

# 2. Find where error is thrown
mcp__serena__search_for_pattern(
  substring_pattern: "CategoryValidationError",
  restrict_search_to_code_files: true
)

# 3. Analyze error handling pattern
mcp__serena__find_referencing_symbols(
  name_path: "CategoryValidationError",
  relative_path: "src/modules/category/errors.ts"
)

# 4. Check error usage in services
mcp__serena__find_symbol(
  name_path: "CategoryService/validateCategoryInput",
  include_body: true
)
```

**Benefits:**
- Trace error flows efficiently
- Understand error context
- Fix issues at the root cause

### Pattern 4: Testing Coverage Analysis

**Use Case**: Understanding test coverage and patterns for new tests

**Approach**: Analyze existing tests and find coverage gaps

```bash
# 1. Find test files for a module
mcp__serena__find_file(
  file_mask: "*.test.ts",
  relative_path: "src/modules/category"
)

# 2. Analyze test structure
mcp__serena__get_symbols_overview(
  relative_path: "src/modules/category/category-service.test.ts"
)

# 3. Study specific test patterns
mcp__serena__find_symbol(
  name_path: "describe/should create categories successfully",
  relative_path: "src/modules/category/category-service.test.ts",
  include_body: true
)

# 4. Find mock patterns
mcp__serena__search_for_pattern(
  substring_pattern: "mock.*Repository",
  relative_path: "src/modules/category"
)
```

**Benefits:**
- Understand testing patterns
- Maintain test consistency
- Identify missing coverage

## Context7 Usage Patterns

### Pattern 1: Library Documentation Lookup

**Use Case**: Getting up-to-date documentation for dependencies

**Approach**: Resolve library ID then fetch relevant documentation

```bash
# 1. Find library identifier
mcp__context7__resolve-library-id(libraryName: "urql")

# 2. Get specific documentation
mcp__context7__get-library-docs(
  context7CompatibleLibraryID: "/urql/urql",
  topic: "client configuration",
  tokens: 3000
)

# For GraphQL-specific queries
mcp__context7__resolve-library-id(libraryName: "gql.tada")
mcp__context7__get-library-docs(
  context7CompatibleLibraryID: "/gql.tada/gql.tada", 
  topic: "typescript integration"
)
```

**Benefits:**
- Get current documentation
- Focus on relevant topics
- Avoid outdated information

### Pattern 2: Framework Best Practices

**Use Case**: Learning framework-specific patterns and best practices

**Approach**: Get focused documentation on specific topics

```bash
# Commander.js CLI patterns
mcp__context7__resolve-library-id(libraryName: "commander")
mcp__context7__get-library-docs(
  context7CompatibleLibraryID: "/tj/commander.js",
  topic: "typescript usage options validation",
  tokens: 2000
)

# Zod validation patterns
mcp__context7__resolve-library-id(libraryName: "zod")
mcp__context7__get-library-docs(
  context7CompatibleLibraryID: "/colinhacks/zod",
  topic: "schema validation error handling",
  tokens: 2000
)
```

**Benefits:**
- Learn current best practices  
- Understand proper API usage
- Avoid deprecated patterns

### Pattern 3: Integration Patterns

**Use Case**: Understanding how to integrate multiple libraries effectively

**Approach**: Get documentation on integration approaches

```bash
# URQL with TypeScript/gql.tada integration
mcp__context7__get-library-docs(
  context7CompatibleLibraryID: "/urql/urql",
  topic: "typescript integration gql.tada",
  tokens: 3000
)

# Vitest testing with TypeScript
mcp__context7__resolve-library-id(libraryName: "vitest")
mcp__context7__get-library-docs(
  context7CompatibleLibraryID: "/vitest-dev/vitest",
  topic: "typescript mocking testing",
  tokens: 2000
)
```

**Benefits:**
- Get integration-specific guidance
- Avoid compatibility issues
- Follow recommended patterns

## Combined Usage Strategies

### Strategy 1: Feature Development Workflow

**Scenario**: Implementing a new entity type with full service layer

**Combined Approach**:

```bash
# Phase 1: Research existing patterns (Serena)
mcp__serena__find_symbol(name_path: "CategoryService", depth: 2)
mcp__serena__find_symbol(name_path: "ProductService", depth: 2) 

# Phase 2: Understand dependencies (Context7)
mcp__context7__get-library-docs(
  context7CompatibleLibraryID: "/colinhacks/zod",
  topic: "schema definition validation"
)

# Phase 3: Study service implementation (Serena)
mcp__serena__find_symbol(
  name_path: "CategoryService/bootstrapCategories", 
  include_body: true
)

# Phase 4: Understand GraphQL patterns (Context7 + Serena)
mcp__context7__get-library-docs(
  context7CompatibleLibraryID: "/urql/urql",
  topic: "mutation error handling"
)
mcp__serena__find_symbol(
  name_path: "CategoryRepository/create",
  include_body: true
)

# Phase 5: Study testing patterns (Serena)
mcp__serena__get_symbols_overview(
  relative_path: "src/modules/category/category-service.test.ts"
)
```

**Benefits:**
- Combines research with practical implementation
- Ensures consistency with existing patterns
- Gets up-to-date best practices

### Strategy 2: Debugging Complex Issues

**Scenario**: Investigating deployment failures across multiple services

**Combined Approach**:

```bash
# Phase 1: Understand error structure (Serena)
mcp__serena__search_for_pattern(
  substring_pattern: "DeploymentError",
  restrict_search_to_code_files: true
)

# Phase 2: Research error handling patterns (Context7)
mcp__context7__get-library-docs(
  context7CompatibleLibraryID: "/urql/urql",
  topic: "error handling GraphQL mutations"
)

# Phase 3: Trace error flow (Serena)
mcp__serena__find_referencing_symbols(
  name_path: "DeploymentError",
  relative_path: "src/core/deployment/errors.ts"  
)

# Phase 4: Understand transaction patterns (Serena)
mcp__serena__find_symbol(
  name_path: "DeploymentService/executeDeployment",
  include_body: true
)
```

**Benefits:**
- Systematic investigation approach
- Combines theoretical and practical knowledge
- Identifies root causes efficiently

### Strategy 3: Performance Optimization

**Scenario**: Optimizing GraphQL operations and batch processing

**Combined Approach**:

```bash
# Phase 1: Analyze current implementation (Serena)
mcp__serena__find_symbol(
  name_path: "BatchProcessor",
  depth: 2,
  include_body: false
)

# Phase 2: Research optimization patterns (Context7)
mcp__context7__get-library-docs(
  context7CompatibleLibraryID: "/urql/urql",
  topic: "batching optimization performance"
)

# Phase 3: Study batching implementation (Serena)
mcp__serena__find_symbol(
  name_path: "BatchProcessor/processBatch",
  include_body: true
)

# Phase 4: Find usage patterns (Serena)
mcp__serena__find_referencing_symbols(
  name_path: "BatchProcessor",
  relative_path: "src/core/batch/batch-processor.ts"
)
```

**Benefits:**
- Identifies optimization opportunities
- Applies best practices from documentation
- Maintains code consistency

## Performance Optimization Patterns

### Context Window Management

**Principle**: Minimize context usage by reading only necessary information

**Pattern**: Use overview → symbol → body progression

```bash
# ❌ Inefficient: Reading entire file
Read(file_path: "src/modules/category/category-service.ts")

# ✅ Efficient: Progressive information gathering
mcp__serena__get_symbols_overview(relative_path: "src/modules/category/category-service.ts")
# → Only if needed: get specific symbols
mcp__serena__find_symbol(name_path: "CategoryService/methodName", include_body: true)
```

**Benefits:**
- Reduces context window usage by 80%
- Faster information retrieval
- More focused analysis

### Batching Operations

**Principle**: Combine multiple MCP operations in single messages

**Pattern**: Batch related queries together

```bash
# ✅ Efficient: Batch multiple Serena operations
# Message 1: Multiple find_symbol calls for related services
mcp__serena__find_symbol(name_path: "CategoryService")
mcp__serena__find_symbol(name_path: "ProductService") 
mcp__serena__find_symbol(name_path: "CollectionService")

# Message 2: Get documentation for related libraries  
mcp__context7__get-library-docs(context7CompatibleLibraryID: "/urql/urql")
mcp__context7__get-library-docs(context7CompatibleLibraryID: "/colinhacks/zod")
```

**Benefits:**
- Parallel execution of MCP calls
- Reduced message overhead
- Faster overall processing

### Search Optimization

**Principle**: Use specific patterns and constraints to reduce search scope

**Pattern**: Apply filters and constraints effectively

```bash
# ✅ Efficient: Constrained search
mcp__serena__search_for_pattern(
  substring_pattern: "class.*Service",
  restrict_search_to_code_files: true,
  relative_path: "src/modules/category",
  paths_include_glob: "*.ts",
  paths_exclude_glob: "*.test.ts"
)

# ❌ Inefficient: Broad search
mcp__serena__search_for_pattern(substring_pattern: "Service")
```

**Benefits:**
- Faster search execution
- More relevant results
- Reduced noise in results

## Error Handling Patterns

### MCP Tool Failure Recovery

**Serena Tool Failures:**
```bash
# If symbolic tools fail, fallback to pattern search
# Primary: find_symbol
mcp__serena__find_symbol(name_path: "CategoryService")
# Fallback: search_for_pattern  
mcp__serena__search_for_pattern(substring_pattern: "class CategoryService")

# If search fails, try different patterns
mcp__serena__search_for_pattern(substring_pattern: "CategoryService")
```

**Context7 Tool Failures:**
```bash
# If library resolution fails, try variations
mcp__context7__resolve-library-id(libraryName: "urql")
# Fallback: try common variations
mcp__context7__resolve-library-id(libraryName: "@urql/core")

# If documentation fetch fails, reduce token count
mcp__context7__get-library-docs(tokens: 5000) # fails
mcp__context7__get-library-docs(tokens: 2000) # retry with smaller context
```

### Graceful Degradation

**Pattern**: Provide alternative approaches when MCP tools fail

```bash
# If MCP tools unavailable, use traditional tools
# Primary: Serena symbolic analysis
mcp__serena__find_symbol(name_path: "CategoryService")

# Fallback: Direct file reading
Read(file_path: "src/modules/category/category-service.ts")

# Last resort: Grep search
Grep(pattern: "class CategoryService", glob: "**/*.ts")
```

## Best Practices Summary

### Serena Best Practices

1. **Start with Overview**: Use `get_symbols_overview` before deep dives
2. **Use Symbolic Tools**: Prefer `find_symbol` over reading entire files
3. **Apply Constraints**: Use `relative_path` and path filters to narrow searches
4. **Progressive Reading**: Read symbols without body first, then add body if needed
5. **Batch Operations**: Combine related symbol lookups in single messages

### Context7 Best Practices

1. **Resolve First**: Always use `resolve-library-id` before `get-library-docs`
2. **Be Specific**: Use focused topics rather than broad documentation requests
3. **Optimize Tokens**: Request appropriate token counts (2000-3000 typical)
4. **Version Awareness**: Prefer exact library versions when possible
5. **Topic Focus**: Include specific topics for targeted documentation

### Integration Best Practices

1. **Complementary Usage**: Use Serena for code analysis, Context7 for external docs
2. **Sequential Workflow**: Research patterns first, then implement
3. **Context Efficiency**: Minimize context usage through focused queries
4. **Error Recovery**: Have fallback strategies for tool failures
5. **Performance Focus**: Batch operations and apply constraints consistently

### Anti-Patterns to Avoid

1. **❌ Reading Entire Files**: Don't use `Read` when `find_symbol` suffices
2. **❌ Broad Searches**: Avoid unconstrained pattern searches
3. **❌ Redundant Queries**: Don't repeat the same MCP calls
4. **❌ Large Context Requests**: Don't request excessive documentation tokens
5. **❌ Sequential Dependencies**: Don't make MCP calls wait on each other unnecessarily

---

**Related Documentation:**
- [ARCHITECTURE.md](ARCHITECTURE.md) - Service architecture for MCP tool integration
- [DEVELOPMENT_WORKFLOWS.md](DEVELOPMENT_WORKFLOWS.md) - Development processes using MCP tools
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - MCP tool troubleshooting procedures
- [TESTING_PROTOCOLS.md](TESTING_PROTOCOLS.md) - Using MCP tools for test analysis
- [CLAUDE.md](CLAUDE.md) - Main navigation hub