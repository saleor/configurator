# Test Commands Reference

Complete reference for running tests and analyzing coverage.

## Basic Commands

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test -- --filter=category-service

# Run tests matching pattern
pnpm test -- --grep="should create category"

# Watch mode
pnpm test -- --watch

# With coverage
pnpm test -- --coverage
```

## Coverage Analysis

```bash
# Generate coverage report
pnpm test -- --coverage
```

### Coverage Configuration

In `vitest.config.ts`:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  thresholds: {
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80,
  },
}
```

## Advanced Options

```bash
# Run tests in specific directory
pnpm test -- src/modules/category

# Run only unit tests (not integration)
pnpm test -- --exclude="**/*.integration.test.ts"

# Run with verbose output
pnpm test -- --reporter=verbose

# Run single test file with watch
pnpm test -- category-service.test.ts --watch

# Update snapshots
pnpm test -- --update
```

## Debugging Tests

```bash
# Run with node debugger
node --inspect-brk ./node_modules/vitest/vitest.mjs run

# Run specific test with more detail
pnpm test -- --reporter=verbose --filter=category
```
