# MCP Tools Cheat Sheet *(Temporarily Archived)*

> **Note:** MCP integrations are currently paused. Keep this reference for historical context only and prefer the navigation workflow described in `../AGENTS.md` and `docs/CLAUDE.md`.

Quick reference for using Serena and Context7 MCP tools with Saleor Configurator when the tooling resumes.

## Serena - Semantic Code Analysis

### Essential Commands

```bash
# Find service implementations
mcp__serena__search_for_pattern(
  substring_pattern: "class.*Service",
  restrict_search_to_code_files: true
)

# Get file structure overview
mcp__serena__get_symbols_overview(
  relative_path: "src/modules/category"
)

# Find specific symbol with body
mcp__serena__find_symbol(
  name_path: "CategoryService/validateCategories",
  include_body: true
)

# Find references to a symbol
mcp__serena__find_referencing_symbols(
  name_path: "CategoryService",
  relative_path: "src/modules/category/category-service.ts"
)

# Replace entire symbol body
mcp__serena__replace_symbol_body(
  name_path: "CategoryService/validateCategories",
  relative_path: "src/modules/category/category-service.ts",
  body: "new implementation here"
)
```

### Quick Patterns

| Task | Command |
|------|---------|
| Find all services | `search_for_pattern("class.*Service")` |
| Find bootstrap methods | `search_for_pattern("bootstrap[A-Z]")` |
| Find GraphQL queries | `search_for_pattern("graphql\\(")` |
| Find Zod schemas | `search_for_pattern("z\\.object")` |
| Find test files | `find_file("*.test.ts", ".")` |

## Context7 - Library Documentation

### Essential Commands

```bash
# Resolve library ID first
mcp__context7__resolve-library-id(
  libraryName: "zod"
)

# Then get documentation
mcp__context7__get-library-docs(
  context7CompatibleLibraryID: "/colinhacks/zod",
  tokens: 5000,
  topic: "validation"
)
```

### Common Libraries

| Library | Context7 ID |
|---------|-------------|
| Zod | `/colinhacks/zod` |
| Commander.js | `/tj/commander.js` |
| URQL | `/urql-graphql/urql` |
| Vitest | `/vitest-dev/vitest` |

## Best Practices

1. **Use Serena instead of Read/Grep when:**
   - Exploring unfamiliar code
   - Finding symbol relationships
   - Making precise edits to methods/classes

2. **Use traditional tools when:**
   - You know exact file paths
   - Simple text replacements
   - Reading configuration files

3. **Efficient exploration pattern:**
   ```
   list_dir → get_symbols_overview → find_symbol → find_referencing_symbols
   ```

## See Also

- [DEVELOPMENT_WORKFLOWS.md](DEVELOPMENT_WORKFLOWS.md) - Using MCP in development
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - MCP tool issues
