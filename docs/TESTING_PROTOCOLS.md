# Testing Protocols Guide

Comprehensive testing procedures, validation workflows, and quality gates for the Saleor Configurator project. This guide covers unit testing, integration testing, end-to-end validation, and performance testing protocols.

## Testing Architecture Overview

### Test Types and Scope

**Unit Tests**: Service layer, repository layer, utility functions
- **Location**: `src/**/*.test.ts`
- **Focus**: Individual component functionality
- **Dependencies**: Mocked external dependencies
- **Coverage Target**: >90% for service and utility layers

**Integration Tests**: Cross-module functionality, complete workflows
- **Location**: `src/**/*.integration.test.ts`
- **Focus**: Component interaction and data flow
- **Dependencies**: Real validation, mocked GraphQL
- **Coverage Target**: >80% for critical workflows

**End-to-End Tests**: Complete CLI workflows with real environment
- **Location**: Manual testing protocols
- **Focus**: Full system validation
- **Dependencies**: Test Saleor instance
- **Coverage Target**: All core CLI operations

## End-to-End CLI Testing Protocol

### Automated Sandbox Regression Suite (2025 refresh)

Run the production-like happy path directly from Vitest using the Saleor sandbox credentials that are distributed to the team. The suite lives in `tests/e2e/cli-introspect-deploy.e2e.test.ts` and exercises: `introspect → diff → deploy → re-introspect → deploy baseline`. It also keeps the remote sandbox clean by restoring the original configuration at the end.

```
# Required variables (store them as GitHub Action secrets for CI)
export CONFIGURATOR_E2E_SALEOR_TOKEN="<sandbox-token>"  # falls back to SALEOR_E2E_TOKEN or SALEOR_TOKEN if set

# Optional overrides
export CONFIGURATOR_E2E_SALEOR_URL="https://sandbox-a.staging.saleor.cloud/graphql/"  # falls back to SALEOR_E2E_URL or SALEOR_URL
export CONFIGURATOR_E2E_TIMEOUT=480000   # ms per command
export CONFIGURATOR_AUTO_CONFIRM=true     # auto-accept prompts during automation when needed

# Run locally
pnpm test:e2e

# Run in CI (same command is wired into .github/workflows/test-on-pr.yml)
pnpm test:e2e:ci
```

Under the hood we spawn the CLI with `execa@9` so we hit the same `pnpm dev` entry point that developers use. The runner disables ANSI colour, enforces a 20MB buffer cap, and executes tests sequentially to avoid race conditions against the shared sandbox. Command output is stripped from ANSI codes before assertions to make snapshots reliable.

### Mandatory Pre-Push Testing

⚠️ **CRITICAL**: This protocol is MANDATORY before pushing any core changes:

**Test Environment:**
```bash
# Standard test credentials (safe for development)
TEST_URL="https://store-rzalldyg.saleor.cloud/graphql/"
TEST_TOKEN="YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs"
```

**Complete Validation Workflow:**
```bash
# 1. Clean Slate Setup
rm -rf config.yml
rm -rf config-backup*.yml

# 2. Fresh Introspection
pnpm dev introspect --url=$TEST_URL --token=$TEST_TOKEN

# 3. Backup Original State
cp config.yml config-backup-original.yml

# 4. Apply Test Changes
# Edit config.yml with your test modifications
# Examples:
# - Add new collection
# - Modify product type attributes
# - Update channel settings
# - Add new category

# 5. Deploy Changes
pnpm dev deploy --url=$TEST_URL --token=$TEST_TOKEN

# 6. Idempotency Test (CRITICAL)
pnpm dev deploy --url=$TEST_URL --token=$TEST_TOKEN
# Should complete successfully with "no changes" message

# 7. Clean Re-introspection
rm config.yml
pnpm dev introspect --url=$TEST_URL --token=$TEST_TOKEN

# 8. Configuration Integrity Check
pnpm dev diff --url=$TEST_URL --token=$TEST_TOKEN
# Should show no differences

# 9. Rollback to Original State
cp config-backup-original.yml config.yml
pnpm dev deploy --url=$TEST_URL --token=$TEST_TOKEN

# 10. Final Verification
pnpm dev diff --url=$TEST_URL --token=$TEST_TOKEN
# Should show no differences from original state
```

### Extended CLI Testing Scenarios

**Selective Operation Testing:**
```bash
# Test selective introspection
pnpm dev introspect --url=$TEST_URL --token=$TEST_TOKEN --include=shop,channels
pnpm dev introspect --url=$TEST_URL --token=$TEST_TOKEN --exclude=products,categories

# Test selective deployment  
pnpm dev deploy --url=$TEST_URL --token=$TEST_TOKEN --include=collections --dry-run
pnpm dev deploy --url=$TEST_URL --token=$TEST_TOKEN --exclude=products --dry-run

# Test selective diff
pnpm dev diff --url=$TEST_URL --token=$TEST_TOKEN --include=productTypes
pnpm dev diff --url=$TEST_URL --token=$TEST_TOKEN --exclude=variants
```

**Error Handling Testing:**
```bash
# Test invalid configuration
echo "invalid: yaml: content: here" > config-invalid.yml
pnpm dev deploy --url=$TEST_URL --token=$TEST_TOKEN --config=config-invalid.yml

# Test network timeout handling
timeout 5s pnpm dev introspect --url=$TEST_URL --token=$TEST_TOKEN

# Test permission errors (use invalid token)
pnpm dev introspect --url=$TEST_URL --token="invalid-token"
```

**Performance Testing:**
```bash
# Large configuration testing
pnpm dev introspect --url=$TEST_URL --token=$TEST_TOKEN
# Measure introspection time and memory usage

# Batch operation testing
# Create config with 50+ entities and test deployment performance
time pnpm dev deploy --url=$TEST_URL --token=$TEST_TOKEN
```

## GraphQL Contract Safeguards

### Schema Evolution Checklist
- Run `pnpm fetch-schema` and review the resulting `schema.json` diff whenever remote capabilities change (e.g., external media URL support) before adjusting code.
- Update generated JSON schema and markdown docs via `pnpm generate-json-schema` and `pnpm generate-schema-docs` so configuration validators stay current.
- Refresh fixtures under `src/lib/graphql/__mocks__` and integration mocks before executing the test suite.

### Regression Testing Patterns
- Add focused Vitest suites that assert new GraphQL fields are surfaced end-to-end (mock urql responses, verify CLI output).
- Execute `pnpm dev diff` against the sandbox store after regeneration to confirm no unintended deletions.
- Capture failing cases in `docs/TROUBLESHOOTING.md` when new schema fields require special handling so future contributors can bypass rediscovery.

## Unit Testing Protocols

### Test Structure and Organization

**Test File Naming:**
```
src/modules/category/category-service.test.ts        # Unit tests
src/modules/category/category-service.integration.test.ts  # Integration tests
src/core/diff/comparators/category-comparator.test.ts     # Comparator tests
```

**Test Structure Template:**
```typescript
import { describe, expect, test, beforeEach, vi } from 'vitest';
import { CategoryService } from './category-service.js';

describe('CategoryService', () => {
  let categoryService: CategoryService;
  let mockRepository: MockedCategoryRepository;

  beforeEach(() => {
    mockRepository = createMockCategoryRepository();
    categoryService = new CategoryService(mockRepository);
  });

  describe('bootstrapCategories', () => {
    test('should create categories successfully', async () => {
      // Arrange
      const categories = [createValidCategory()];
      
      // Act
      await categoryService.bootstrapCategories(categories);
      
      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith(categories[0]);
    });

    test('should handle validation errors', async () => {
      // Arrange
      const invalidCategory = createInvalidCategory();
      
      // Act & Assert
      await expect(
        categoryService.bootstrapCategories([invalidCategory])
      ).rejects.toThrow(EntityValidationError);
    });
  });
});
```

### Mocking Standards

**Service Container Mocking:**
```typescript
// Mock external dependencies, use real internal logic
const mockGraphQLClient = vi.mocked(createUrqlClient());
const mockServiceContainer = new ServiceContainer()
  .register('graphqlClient', () => mockGraphQLClient)
  .register('logger', () => createTestLogger());
```

**Repository Mocking:**
```typescript
// Use interface-based mocking
interface MockedCategoryRepository {
  getAll: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

function createMockCategoryRepository(): MockedCategoryRepository {
  return {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(), 
    delete: vi.fn(),
  };
}
```

**GraphQL Response Mocking:**
```typescript
// Mock GraphQL responses with proper typing
mockGraphQLClient.query.mockResolvedValue({
  data: {
    categories: [
      {
        id: 'cat-1',
        name: 'Test Category',
        slug: 'test-category',
        // ... other fields
      }
    ]
  },
  error: undefined
});
```

### Test Data Management

**Test Fixtures:**
```typescript
// src/lib/test-fixtures.ts
export function createValidCategory(): CategoryInput {
  return {
    name: 'Test Category',
    slug: 'test-category',
    description: 'A test category',
    parent: null,
  };
}

export function createInvalidCategory(): Partial<CategoryInput> {
  return {
    name: 'Test Category',
    // Missing required slug field
  };
}
```

**Test Builders:**
```typescript
// Fluent test data builders
export class CategoryBuilder {
  private category: CategoryInput = createValidCategory();

  withName(name: string): this {
    this.category.name = name;
    return this;
  }

  withSlug(slug: string): this {
    this.category.slug = slug;
    return this;
  }

  build(): CategoryInput {
    return this.category;
  }
}
```

## Integration Testing Protocols

### Cross-Module Testing

**Service Integration Tests:**
```typescript
describe('Category-Product Integration', () => {
  test('should link products to categories correctly', async () => {
    // Test category creation with product references
    // Verify cross-entity relationship validation
    // Check dependency resolution
  });
});
```

**Configuration Validation Tests:**
```typescript
describe('Configuration Integration', () => {
  test('should validate complete configuration', async () => {
    // Load full configuration
    // Validate all entity relationships
    // Check cross-entity references
  });

  test('should handle circular dependencies', async () => {
    // Test circular reference detection
    // Verify error handling
  });
});
```

### GraphQL Integration Testing

**Repository Integration:**
```typescript
describe('CategoryRepository Integration', () => {
  test('should handle GraphQL errors gracefully', async () => {
    // Mock GraphQL error responses
    // Verify error transformation
    // Check error message formatting
  });

  test('should batch operations efficiently', async () => {
    // Test batch create operations
    // Verify transaction handling
    // Check rollback behavior
  });
});
```

## Performance Testing Protocols

### Performance Benchmarks

**CLI Performance Targets:**
```bash
# Introspection performance (standard store)
pnpm dev introspect --url=$TEST_URL --token=$TEST_TOKEN
# Target: <30 seconds for complete introspection
# Memory: <500MB peak usage

# Deployment performance  
pnpm dev deploy --url=$TEST_URL --token=$TEST_TOKEN
# Target: <60 seconds for full deployment
# Success rate: 100% for valid configurations

# Diff performance
pnpm dev diff --url=$TEST_URL --token=$TEST_TOKEN
# Target: <10 seconds for complete diff
```

**Performance Testing Script:**
```bash
#!/bin/bash
# performance-test.sh

echo "Starting performance tests..."
start_time=$(date +%s)

# Test introspection performance
echo "Testing introspection..."
/usr/bin/time -l pnpm dev introspect --url=$TEST_URL --token=$TEST_TOKEN

# Test deployment performance
echo "Testing deployment..."
/usr/bin/time -l pnpm dev deploy --url=$TEST_URL --token=$TEST_TOKEN

# Test diff performance  
echo "Testing diff..."
/usr/bin/time -l pnpm dev diff --url=$TEST_URL --token=$TEST_TOKEN

end_time=$(date +%s)
total_time=$((end_time - start_time))
echo "Total test time: ${total_time} seconds"
```

### Memory Usage Testing

**Memory Profiling:**
```bash
# Profile memory usage during operations
node --max-old-space-size=1024 \
     --inspect \
     dist/main.js introspect --url=$TEST_URL --token=$TEST_TOKEN

# Monitor memory usage
ps aux | grep node | grep configurator
```

**Large Dataset Testing:**
```bash
# Test with large configurations (1000+ entities)
# Monitor memory usage and performance degradation
# Verify no memory leaks during operations
```

## Quality Gates and Validation

### Automated Quality Checks

**Pre-Commit Hooks:**
```bash
#!/bin/sh
# .git/hooks/pre-commit

set -e

echo "Running pre-commit quality checks..."

# 1. Linting and formatting
pnpm check:fix

# 2. Type checking
npx tsc --noEmit

# 3. Unit tests
pnpm test

# 4. Build verification
pnpm build

echo "All quality checks passed!"
```

**CI/CD Quality Gates:**
```yaml
# .github/workflows/quality.yml
quality_gates:
  - name: "Code Quality"
    command: "pnpm check:ci"
    required: true
    
  - name: "Type Safety"
    command: "npx tsc --noEmit"
    required: true
    
  - name: "Unit Tests"
    command: "CI=true pnpm test"
    required: true
    coverage_threshold: 90
    
  - name: "Integration Tests"
    command: "CI=true pnpm test --include='**/*.integration.test.ts'"
    required: true
    
  - name: "Build Verification"
    command: "pnpm build"
    required: true
```

### Test Environment Management

**Test Environment Setup:**
```bash
# Setup dedicated test environment
export NODE_ENV=test
export LOG_LEVEL=warn
export TEST_TIMEOUT=30000

# Disable external network calls in unit tests
export DISABLE_NETWORK=true

# Use test-specific GraphQL endpoint
export GRAPHQL_ENDPOINT=$TEST_URL
```

**Test Database Management:**
```bash
# For integration tests, use dedicated test instance
# Reset test environment before test runs
# Maintain test data consistency
```

### Continuous Testing

**Watch Mode Development:**
```bash
# Run tests in watch mode during development
pnpm test --watch

# Run specific test files
pnpm test src/modules/category/ --watch

# Run tests with coverage
pnpm test --coverage
```

**Regression Testing:**
```bash
# Full regression test suite
pnpm test:regression

# Performance regression tests
pnpm test:performance

# End-to-end regression validation
./scripts/e2e-regression-test.sh
```

## Test Reporting and Analysis

### Coverage Requirements

**Coverage Targets:**
- **Unit Tests**: >90% line coverage for service layer
- **Integration Tests**: >80% path coverage for workflows
- **Overall Project**: >85% combined coverage
- **Critical Paths**: 100% coverage for error handling

**Coverage Reporting:**
```bash
# Generate coverage report
pnpm test --coverage

# View detailed coverage
open coverage/index.html

# Check coverage thresholds
pnpm test --coverage --reporter=verbose
```

### Test Analysis

**Test Metrics:**
- Test execution time
- Test failure rates
- Code coverage trends
- Performance regression detection
- Memory usage patterns

**Regular Test Reviews:**
- Weekly test suite analysis
- Performance trend review
- Coverage gap identification
- Test maintenance planning

## Troubleshooting Test Issues

### Common Test Problems

**Flaky Tests:**
```bash
# Identify flaky tests
pnpm test --repeat=10

# Fix timing issues with proper async handling
# Remove test interdependencies
# Use deterministic test data
```

**Memory Issues:**
```bash
# Increase Node.js memory for tests
export NODE_OPTIONS="--max-old-space-size=4096"

# Profile memory usage in tests
node --inspect-brk node_modules/.bin/vitest run
```

**Mock Issues:**
```bash
# Clear mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

# Reset module registry
beforeEach(() => {
  vi.resetModules();
});
```

---

**Related Documentation:**
- [CODE_QUALITY.md](CODE_QUALITY.md) - Testing best practices and patterns
- [COMMANDS.md](COMMANDS.md) - CLI commands for testing procedures
- [DEVELOPMENT_WORKFLOWS.md](DEVELOPMENT_WORKFLOWS.md) - Development process integration
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Test failure resolution procedures
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture for testing
- [CLAUDE.md](CLAUDE.md) - Main navigation hub
