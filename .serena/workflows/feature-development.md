# Workflow: Feature Development

Use this workflow when adding a new feature to an existing service or module.

## Prerequisites

- [ ] Read `serena_navigation_guide` memory
- [ ] Identify target module
- [ ] Understand feature requirements

## Steps

### 1. Locate the Service

```bash
# Find the service
find_symbol("{Module}Service", relative_path="src/modules/{module}")
```

**Example:**
```bash
find_symbol("ProductService", relative_path="src/modules/product")
```

### 2. Review Existing Methods (Without Reading Bodies)

```bash
# See all methods in the service
find_symbol("{Module}Service", depth=1, include_body=False, relative_path="src/modules/{module}")
```

**Why:** Understand what already exists without consuming tokens on implementations

**Output:** List of 10-30 method signatures

### 3. Read Relevant Methods for Context

```bash
# Read methods similar to your feature
find_symbol("{Module}Service/similarMethod1", include_body=True, relative_path="src/modules/{module}")
find_symbol("{Module}Service/similarMethod2", include_body=True, relative_path="src/modules/{module}")
```

**Tip:** Read 2-3 methods that are conceptually similar to your feature

### 4. Check Repository Methods

```bash
# See repository structure
get_symbols_overview("src/modules/{module}/repository.ts")

# See all repository methods
find_symbol("{Module}Repository", depth=1, relative_path="src/modules/{module}")
```

**Why:** Understand available data access methods

### 5. Read Specific Repository Methods

```bash
# Read methods you'll need
find_symbol("{Module}Repository/relevantMethod", include_body=True, relative_path="src/modules/{module}")
```

### 6. Check for Existing Errors

```bash
# See what errors are available
get_symbols_overview("src/modules/{module}/errors.ts")
```

**Action:** Determine if you need new error classes

### 7. Design Your Feature

**Plan:**
- What method(s) to add?
- What repository methods to use/create?
- What errors to handle?
- What tests to write?

### 8. Implement the Feature

```bash
# Add new service method
insert_after_symbol("{Module}Service/lastMethod", "src/modules/{module}/{module}-service.ts", new_method_code)

# If needed, add repository method
insert_after_symbol("{Module}Repository/lastMethod", "src/modules/{module}/repository.ts", new_repo_method)

# If needed, add new error
insert_after_symbol("LastError", "src/modules/{module}/errors.ts", new_error_class)
```

### 9. Check References Before Testing

```bash
# Ensure your changes don't break anything
find_referencing_symbols("{Module}Service", "src/modules/{module}/{module}-service.ts")
```

### 10. Write Tests

```bash
# See existing tests for patterns
get_symbols_overview("src/modules/{module}/{module}-service.test.ts")

# Add your tests
insert_after_symbol("describe", "src/modules/{module}/{module}-service.test.ts", new_test_code)
```

### 11. Run Tests

```bash
# Run module tests
execute_shell_command("pnpm test src/modules/{module}")

# Or run all tests
execute_shell_command("CI=true pnpm test")
```

### 12. Verify Code Quality

```bash
# Lint and format
execute_shell_command("pnpm check:fix")

# Build
execute_shell_command("pnpm build")
```

## Token Optimization Tips

- **Step 2** saves 80% tokens vs reading entire file
- Read only 2-3 similar methods, not all
- Check repository overview before reading methods
- Read tests selectively

**Estimated Token Usage:**
- Efficient workflow: ~1,500-2,000 tokens
- Reading all files: ~10,000+ tokens
- **Savings: 80-85%**

## Checklist

- [ ] Found target service
- [ ] Reviewed existing methods (structure only)
- [ ] Read relevant methods for context
- [ ] Checked repository capabilities
- [ ] Designed feature approach
- [ ] Implemented service method
- [ ] Added repository method (if needed)
- [ ] Added error classes (if needed)
- [ ] Wrote tests
- [ ] All tests pass
- [ ] Code quality checks pass
- [ ] Verified no breaking changes

## Common Pitfalls

❌ **Don't:** Read entire service file
✅ **Do:** Use depth=1 to see structure

❌ **Don't:** Read all repository methods
✅ **Do:** Read only what you need

❌ **Don't:** Skip checking references
✅ **Do:** Always verify impact

❌ **Don't:** Forget to write tests
✅ **Do:** Test-driven development

## Example: Adding a Product Archive Feature

```bash
# 1. Find service
find_symbol("ProductService", relative_path="src/modules/product")

# 2. See methods
find_symbol("ProductService", depth=1, include_body=False, relative_path="src/modules/product")

# 3. Read similar methods
find_symbol("ProductService/deleteProduct", include_body=True, relative_path="src/modules/product")
find_symbol("ProductService/updateProduct", include_body=True, relative_path="src/modules/product")

# 4. Check repository
get_symbols_overview("src/modules/product/repository.ts")
find_symbol("ProductRepository/updateProduct", include_body=True, relative_path="src/modules/product")

# 5. Check errors
get_symbols_overview("src/modules/product/errors.ts")

# 6. Implement
# (Add archiveProduct method to ProductService)
# (Use existing updateProduct repository method)
# (Handle ProductNotFoundError)

# 7. Test
execute_shell_command("pnpm test src/modules/product")

# 8. Verify
execute_shell_command("pnpm check:fix")
execute_shell_command("pnpm build")
```

## Related Workflows

- `bug-investigation.md` - If something breaks
- `refactoring.md` - If code needs cleanup
- `testing.md` - For comprehensive testing

## Further Reading

- Read `serena_workflows` memory for more patterns
- Read `serena_best_practices` for DO/DON'T examples
