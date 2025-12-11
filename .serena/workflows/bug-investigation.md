# Workflow: Bug Investigation

Use this workflow when investigating and fixing bugs.

## Prerequisites

- [ ] Bug report or error description
- [ ] Steps to reproduce (if available)
- [ ] Expected vs actual behavior

## Steps

### 1. Identify Error Location

**If you have an error message:**
```bash
# Find error definition
get_symbols_overview("src/modules/{module}/errors.ts")

# Or search globally
find_symbol("{Error}Name", substring_matching=True, relative_path="src")
```

**If you have a stack trace:**
- Note the file and line number
- Use that as starting point

### 2. Find Where Error is Thrown

```bash
# Search for throw statements
search_for_pattern("throw new {Error}Name", relative_path="src/modules/{module}")

# Or search globally
search_for_pattern("throw new {Error}Name", relative_path="src")
```

### 3. Read the Method That Throws

```bash
# Read the buggy method
find_symbol("{Class}/{methodName}", include_body=True, relative_path="src/path")
```

**Analyze:**
- What conditions trigger the error?
- Are those conditions correct?
- Is the error message clear?

### 4. Find All Callers

```bash
# Find where method is called
find_referencing_symbols("{Class}/{methodName}", "src/path/file.ts")
```

**Check:**
- Are callers passing correct parameters?
- Are edge cases handled?
- Is error handling appropriate?

### 5. Trace Backwards Through Call Chain

```bash
# For each caller, read the calling method
find_symbol("{CallerClass}/{callerMethod}", include_body=True, relative_path="src/path")

# Find its callers
find_referencing_symbols("{CallerClass}/{callerMethod}", "src/path/file.ts")
```

**Continue** until you reach the entry point or find the root cause

### 6. Check Input Data

```bash
# If bug is data-related, check:
# - Repository methods
get_symbols_overview("src/modules/{module}/repository.ts")
find_symbol("{Module}Repository/{dataMethod}", include_body=True, relative_path="src/modules/{module}")

# - GraphQL queries/mutations
search_for_pattern("graphql\(`", relative_path="src/modules/{module}/repository.ts", output_mode="content")

# - Schema definitions
find_symbol("{entity}", substring_matching=True, relative_path="src/modules/config/schema")
```

### 7. Check Related Tests

```bash
# See if tests exist for buggy code
find_symbol("{Class}", relative_path="src/path/file.test.ts")

# Read relevant tests
find_symbol("describe.*{method}", substring_matching=True, relative_path="src/path/file.test.ts")
```

**Questions:**
- Do tests exist?
- Do tests cover the bug scenario?
- Are tests passing when they shouldn't?

### 8. Reproduce Locally

```bash
# Run specific test
execute_shell_command("pnpm test src/path/file.test.ts")

# Run with verbose output
execute_shell_command("pnpm test src/path/file.test.ts --verbose")
```

### 9. Implement Fix

**Approaches:**
- Fix logic error in method
- Add missing validation
- Handle edge case
- Fix data transformation
- Update error message

```bash
# Apply fix
replace_symbol_body("{Class}/{method}", "src/path/file.ts", fixed_code)
```

### 10. Verify Fix

```bash
# Re-check references (ensure no breaking changes)
find_referencing_symbols("{Class}/{method}", "src/path/file.ts")

# Run tests
execute_shell_command("pnpm test src/path")

# Run all tests
execute_shell_command("CI=true pnpm test")
```

### 11. Add Test for Bug

```bash
# Add regression test
insert_after_symbol("describe", "src/path/file.test.ts", regression_test)

# Verify test fails without fix
# Verify test passes with fix
```

### 12. Code Quality Check

```bash
execute_shell_command("pnpm check:fix")
execute_shell_command("pnpm build")
```

## Investigation Patterns

### Pattern: Error in Service Method

```bash
# 1. Find service
find_symbol("{Module}Service/{method}", include_body=True, relative_path="src/modules/{module}")

# 2. Find callers
find_referencing_symbols("{Module}Service/{method}", "src/modules/{module}/{module}-service.ts")

# 3. Check repository
find_symbol("{Module}Repository/{method}", include_body=True, relative_path="src/modules/{module}")

# 4. Fix and test
```

### Pattern: Error in Comparator

```bash
# 1. Find comparator
find_symbol("{Entity}Comparator", relative_path="src/core/diff/comparators")

# 2. Read compare method
find_symbol("{Entity}Comparator/compare", include_body=True, relative_path="src/core/diff/comparators")

# 3. Check normalization methods
find_symbol("{Entity}Comparator/normalize", substring_matching=True, relative_path="src/core/diff/comparators")

# 4. Fix and test
```

### Pattern: GraphQL Error

```bash
# 1. Find GraphQL definition
search_for_pattern("graphql\(`", relative_path="src/modules/{module}/repository.ts")

# 2. Find repository method using it
find_symbol("{Module}Repository", depth=1, relative_path="src/modules/{module}")

# 3. Check service calling repository
find_referencing_symbols("{Module}Repository/{method}", "src/modules/{module}/repository.ts")

# 4. Fix query/mutation and test
```

### Pattern: Schema Validation Error

```bash
# 1. Find schema
find_symbol("{entity}", substring_matching=True, relative_path="src/modules/config/schema")

# 2. Find where schema is used
find_referencing_symbols("{entity}Schema", "src/modules/config/schema/schema.ts")

# 3. Fix schema and test
```

## Checklist

- [ ] Identified error location
- [ ] Found where error is thrown
- [ ] Read buggy method
- [ ] Traced call chain
- [ ] Checked input data
- [ ] Reviewed related tests
- [ ] Reproduced bug locally
- [ ] Implemented fix
- [ ] Verified no breaking changes
- [ ] All tests pass
- [ ] Added regression test
- [ ] Code quality checks pass

## Token Optimization

- Use `search_for_pattern` to find error locations quickly
- Read only buggy method, not entire file
- Trace call chain selectively, not exhaustively
- Check tests overview before reading all tests

**Estimated Token Usage:**
- Efficient investigation: ~1,000-2,000 tokens
- Reading all related files: ~5,000-10,000 tokens
- **Savings: 70-80%**

## Common Pitfalls

❌ **Don't:** Read entire service to find bug
✅ **Do:** Use search to locate error

❌ **Don't:** Trace entire call chain unnecessarily
✅ **Do:** Stop when you find root cause

❌ **Don't:** Skip checking references
✅ **Do:** Ensure fix doesn't break callers

❌ **Don't:** Fix without adding test
✅ **Do:** Add regression test

## Example: Fixing ProductNotFoundError

```bash
# 1. Find error
get_symbols_overview("src/modules/product/errors.ts")

# 2. Find where thrown
search_for_pattern("throw new ProductNotFoundError", relative_path="src/modules/product")

# 3. Read method
find_symbol("ProductService/getProduct", include_body=True, relative_path="src/modules/product")

# 4. Find callers
find_referencing_symbols("ProductService/getProduct", "src/modules/product/product-service.ts")

# 5. Check repository
find_symbol("ProductRepository/getProduct", include_body=True, relative_path="src/modules/product")

# 6. Root cause: Repository returns null, service doesn't handle it
# 7. Fix: Add null check before throwing error
replace_symbol_body("ProductService/getProduct", "src/modules/product/product-service.ts", fixed_code)

# 8. Test
execute_shell_command("pnpm test src/modules/product")

# 9. Add regression test
# 10. Verify
execute_shell_command("CI=true pnpm test")
```

## Related Workflows

- `feature-development.md` - For adding related features
- `refactoring.md` - If code needs cleanup after fix
- `testing.md` - For comprehensive testing

## Further Reading

- Read `serena_workflows` memory for more patterns
- Read `serena_best_practices` for efficient debugging
