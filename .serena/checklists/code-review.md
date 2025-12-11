# Code Review Checklist with Serena

Use this checklist when reviewing code changes (your own or others') using Serena's efficient tools.

## 🎯 Pre-Review Preparation

### Understand the Changes

- [ ] Read PR description or change summary
- [ ] Note changed files list
- [ ] Understand the feature/bug being addressed
- [ ] Review requirements or issue description

### Check File Sizes

- [ ] Identify which changed files are large (>500 lines)
- [ ] Plan to use symbolic tools for large files
- [ ] Note which files can be read directly

**Quick Check:**
```
read_memory("codebase_architecture_map")
# Check file sizes section
```

## 📂 File-by-File Review

For each changed file:

### 1. Get Context (Before Looking at Changes)

```bash
# See file structure
get_symbols_overview("path/to/changed/file.ts")

# Or if you know the class
find_symbol("ClassName", depth=1, include_body=False, relative_path="path")
```

**Why:** Understand existing structure before reviewing changes

### 2. Review Changed Symbols

```bash
# If method was modified
find_symbol("ClassName/modifiedMethod", include_body=True, relative_path="path")

# If new method was added
find_symbol("ClassName/newMethod", include_body=True, relative_path="path")

# If entire class was added
find_symbol("NewClassName", depth=1, relative_path="path")
```

### 3. Check Impact

```bash
# Find all references to modified symbol
find_referencing_symbols("ClassName/modifiedMethod", "path/to/file.ts")

# Review each reference
find_symbol("CallerClass/callerMethod", include_body=True, relative_path="path/to/caller")
```

**Questions:**
- Are all callers still compatible?
- Did method signature change?
- Are breaking changes documented?

### 4. Verify Tests

```bash
# Check test file exists
find_symbol("ClassName", relative_path="path/to/file.test.ts")

# See test structure
get_symbols_overview("path/to/file.test.ts")

# Read new/modified tests
find_symbol("describe.*newMethod", substring_matching=True, relative_path="path/to/file.test.ts")
```

**Verify:**
- [ ] Tests exist for new code
- [ ] Tests cover edge cases
- [ ] Tests follow existing patterns
- [ ] Test names are descriptive

## 🔍 Code Quality Checks

### Naming Conventions

- [ ] Classes use PascalCase
- [ ] Methods/variables use camelCase
- [ ] Files use kebab-case
- [ ] Constants use SCREAMING_SNAKE_CASE
- [ ] Follows project patterns (Service, Repository, Comparator suffixes)

**Check:**
```
read_memory("code_style_and_conventions")
```

### Serena-Friendly Organization

- [ ] No new files > 600 lines (without good reason)
- [ ] Symbol density < 3.0 per 100 lines
- [ ] Consistent module structure followed
- [ ] Clear class hierarchies
- [ ] Appropriate use of relative paths

**Calculate Symbol Density:**
```
Lines in file: X
Top-level symbols: Y
Density: Y / X * 100

Optimal: < 3.0
```

### Error Handling

- [ ] Errors extend BaseError
- [ ] Error messages are descriptive
- [ ] Errors are properly caught and handled
- [ ] No bare `throw` statements
- [ ] GraphQL errors use GraphQLError.fromCombinedError()
- [ ] Validation errors use ZodValidationError.fromZodError()

**Check Error Patterns:**
```bash
# See errors in module
get_symbols_overview("src/modules/{module}/errors.ts")

# Find error usage
search_for_pattern("throw new", relative_path="path/to/changed/files")
```

### TypeScript Quality

- [ ] No `as any` in production code
- [ ] Proper type annotations
- [ ] Types imported from correct sources
- [ ] No unused imports
- [ ] No TypeScript errors

**Check:**
```bash
# Build to check types
pnpm build
```

## 🧪 Testing Verification

### Run Tests

```bash
# Run tests for changed modules
pnpm test src/modules/{module}

# Run all tests
CI=true pnpm test

# Check test coverage (if applicable)
pnpm test --coverage
```

### Test Quality Checks

- [ ] Tests are not flaky
- [ ] Tests are isolated (no shared state)
- [ ] Tests use appropriate mocking
- [ ] Tests follow AAA pattern (Arrange, Act, Assert)
- [ ] Test names describe behavior, not implementation

## 📊 Code Smell Detection

### Look for These Issues

#### Using Serena

```bash
# Find duplicate code
search_for_pattern("{repeated_logic}", relative_path="src")

# Find long methods (check method bodies)
find_symbol("ClassName", depth=1, include_body=True, relative_path="path")
# Look for methods > 50 lines

# Find complex conditionals
search_for_pattern("if.*&&.*\|\|", relative_path="path")

# Find TODO/FIXME comments
search_for_pattern("TODO:|FIXME:", relative_path="path/to/changed/files")
```

### Common Issues

- [ ] No overly long methods (> 50 lines)
- [ ] No deep nesting (> 3 levels)
- [ ] No duplicate code
- [ ] No magic numbers (use constants)
- [ ] No commented-out code
- [ ] No console.log statements

## 🔗 Integration Checks

### Service Integration

```bash
# If service was modified, check repository usage
find_referencing_symbols("{Module}Repository", "src/modules/{module}/repository.ts")

# Check if new repository methods are used correctly
find_symbol("{Module}Repository/newMethod", include_body=True, relative_path="src/modules/{module}")
```

### Comparator Integration

```bash
# If comparator was modified, check diff service
find_referencing_symbols("{Entity}Comparator", "src/core/diff/comparators/{entity}-comparator.ts")
```

### Schema Integration

```bash
# If schema was modified, find usage
find_referencing_symbols("{entity}Schema", "src/modules/config/schema/schema.ts")

# Verify validation still works
```

## 🚀 Performance Considerations

### Check for Issues

- [ ] No N+1 queries (multiple DB calls in loop)
- [ ] Proper use of async/await
- [ ] No blocking operations
- [ ] Appropriate caching
- [ ] Efficient data structures

### Using Serena

```bash
# Look for loops with async calls
search_for_pattern("for.*await", relative_path="path/to/changed/files")

# Check repository method efficiency
find_symbol("{Module}Repository/method", include_body=True, relative_path="src/modules/{module}")
```

## 📝 Documentation

- [ ] Complex logic has comments
- [ ] Public APIs have JSDoc comments
- [ ] README updated (if needed)
- [ ] CHANGELOG updated (if needed)
- [ ] Breaking changes documented

## 🎯 Final Checks

### Build and Quality

```bash
# Lint and format
pnpm check:fix

# Build
pnpm build

# Run all tests
CI=true pnpm test
```

### All Must Pass ✅

- [ ] Code quality checks pass
- [ ] All tests pass
- [ ] Build succeeds
- [ ] No TypeScript errors
- [ ] No linting errors

## 💬 Review Comments

### Provide Constructive Feedback

**Good Comment:**
> In `ProductService/createProduct` (line 42), consider extracting the validation logic into a separate method for better readability and reusability.

**Bad Comment:**
> This is wrong.

### Use Serena References

**Example:**
> Found 3 references to `ProductService/getProduct` using:
> ```
> find_referencing_symbols("ProductService/getProduct", "src/modules/product/product-service.ts")
> ```
> All callers need updating if you change the signature.

## ✅ Approval Checklist

Before approving:

- [ ] All code quality checks pass
- [ ] Tests exist and pass
- [ ] No breaking changes (or documented)
- [ ] Follows project patterns
- [ ] Serena-friendly organization maintained
- [ ] Performance considerations addressed
- [ ] Documentation updated
- [ ] Build succeeds

## 🚫 Common Rejection Reasons

### Automatic Reject If:

- [ ] New file > 900 lines (needs refactoring)
- [ ] Uses `as any` in production code
- [ ] No tests for new code
- [ ] Tests fail
- [ ] Build fails
- [ ] Breaking changes without migration path
- [ ] Violates project patterns

## 📊 Review Efficiency

### Token Optimization

**Efficient Review:**
- Symbol overview for context: ~200 tokens
- Read modified methods only: ~500-1,000 tokens
- Check references: ~300 tokens
- **Total: ~1,000-1,500 tokens**

**Inefficient Review:**
- Read entire changed files: ~5,000-10,000 tokens
- Read all references completely: ~2,000+ tokens
- **Total: ~7,000-12,000 tokens**

**Savings: 80-85%**

## 🎓 Review Patterns by Change Type

### New Feature

```bash
# 1. Context
find_symbol("{Module}Service", depth=1, relative_path="src/modules/{module}")

# 2. Read new methods
find_symbol("{Module}Service/newMethod", include_body=True, relative_path="src/modules/{module}")

# 3. Check tests
get_symbols_overview("src/modules/{module}/{module}-service.test.ts")

# 4. Verify integration
find_referencing_symbols("{Module}Service/newMethod", "src/modules/{module}/{module}-service.ts")
```

### Bug Fix

```bash
# 1. Read fixed method
find_symbol("{Class}/{method}", include_body=True, relative_path="path")

# 2. Check all callers still work
find_referencing_symbols("{Class}/{method}", "path/file.ts")

# 3. Verify regression test exists
find_symbol("describe.*{bug}", substring_matching=True, relative_path="path/file.test.ts")

# 4. Check no breaking changes
```

### Refactoring

```bash
# 1. Compare before/after
find_symbol("{Class}", depth=1, include_body=False, relative_path="path")

# 2. Verify all references updated
find_referencing_symbols("{Class}", "path/file.ts")

# 3. Ensure tests pass
pnpm test path/to/module

# 4. Check no functionality changed
```

---

**Remember:** A thorough review prevents bugs and maintains code quality! 🎯

**Estimated Review Time:**
- Small PR (1-3 files): 10-15 minutes
- Medium PR (4-10 files): 20-30 minutes
- Large PR (10+ files): 45-60 minutes

**Use Serena to make reviews faster and more thorough!**
