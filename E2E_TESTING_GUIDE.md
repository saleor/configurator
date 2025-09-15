# Comprehensive E2E Testing Guide for Saleor Configurator

This guide provides everything you need to know about running, maintaining, and extending the end-to-end (E2E) test suite for the Saleor Configurator CLI.

## 🎯 Overview

The E2E test suite validates the complete functionality of the Saleor Configurator CLI against real Saleor sandbox instances. It ensures that:

- All CLI commands work correctly in real-world scenarios
- The complete workflow (introspect → modify → diff → deploy) is robust and idempotent
- Error scenarios are handled gracefully
- Performance remains within acceptable bounds

## 🏗️ Architecture

### Test Structure

```
tests/e2e/
├── commands/              # Individual command tests
│   ├── introspect.test.ts    # Introspect command E2E tests
│   ├── diff.test.ts          # Diff command E2E tests
│   ├── deploy.test.ts        # Deploy command E2E tests
│   ├── workflows.test.ts     # Complete workflow tests
│   └── error-scenarios.test.ts # Error handling tests
├── fixtures/              # Test data and configurations
│   ├── configurations/       # Sample YAML configurations
│   ├── entities/            # Test entities (products, categories)
│   └── environments.ts      # Environment configurations
├── helpers/               # Test utilities and helpers
│   ├── cli-runner.ts         # CLI execution with execa
│   ├── sandbox-manager.ts    # Saleor sandbox interactions
│   └── test-utils.ts         # General test utilities
└── setup/                 # Test setup and teardown
    └── global-setup.ts       # Global test configuration
```

### Key Components

1. **CLI Runner**: Executes CLI commands using execa with proper error handling
2. **Sandbox Manager**: Manages interactions with Saleor sandbox instances
3. **Test Utilities**: Provides data generation, file operations, and assertions
4. **Environment Management**: Handles different test environments and configurations

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+**: Modern ES modules support
- **pnpm 9+**: Package manager for dependencies
- **Saleor Sandbox Access**: Valid URL and token

### Installation

```bash
# Install dependencies
pnpm install

# Build the CLI
pnpm build

# Verify E2E test setup
pnpm test:e2e --run tests/e2e/setup/global-setup.ts
```

### Environment Setup

Create a `.env.test` file:

```bash
# Required: Saleor sandbox configuration
E2E_SALEOR_URL=https://sandbox-a.staging.saleor.cloud
E2E_SALEOR_TOKEN=your-sandbox-token

# Optional: Test behavior
E2E_ENVIRONMENT=sandbox_a
E2E_CLEANUP=true
E2E_RETAIN_ON_FAILURE=false
```

### Running Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run specific test suite
pnpm test:e2e --run tests/e2e/commands/introspect.test.ts

# Run with custom environment
E2E_ENVIRONMENT=sandbox_b pnpm test:e2e

# Run in CI mode (no watch)
pnpm test:e2e:ci
```

## 🧪 Test Categories

### 1. Command Tests

Each CLI command has dedicated tests covering:

#### Introspect Command (`introspect.test.ts`)
- ✅ Basic configuration download
- ✅ Output validation and structure
- ✅ Error handling (invalid URLs, tokens)
- ✅ Performance benchmarks
- ✅ Idempotency verification

#### Diff Command (`diff.test.ts`)
- ✅ No-change scenarios
- ✅ Change detection
- ✅ Output parsing and analysis
- ✅ Error scenarios
- ✅ Large configuration handling

#### Deploy Command (`deploy.test.ts`)
- ✅ Simple configuration deployment
- ✅ Validation and safety checks
- ✅ Conflict resolution
- ✅ Idempotency testing
- ✅ Performance monitoring

### 2. Workflow Tests (`workflows.test.ts`)

Complete end-to-end scenarios:

```
introspect → modify → diff → deploy → deploy (idempotency)
```

- ✅ Full workflow execution
- ✅ Error recovery
- ✅ Performance with larger datasets
- ✅ Concurrent operation safety

### 3. Error Scenario Tests (`error-scenarios.test.ts`)

Comprehensive error handling:

- ✅ Network and connection errors
- ✅ Authentication failures
- ✅ File system permission issues
- ✅ Configuration validation errors
- ✅ Resource exhaustion scenarios

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `E2E_SALEOR_URL` | - | **Required**: Saleor sandbox URL |
| `E2E_SALEOR_TOKEN` | - | **Required**: Saleor authentication token |
| `E2E_ENVIRONMENT` | `sandbox_a` | Test environment selection |
| `E2E_CLEANUP` | `true` | Clean up test data after tests |
| `E2E_RETAIN_ON_FAILURE` | `false` | Keep test data when tests fail |

### Vitest Configuration

The E2E tests use a separate Vitest configuration (`vitest.e2e.config.ts`):

```typescript
{
  include: ["tests/e2e/**/*.test.ts"],
  testTimeout: 60000,
  hookTimeout: 30000,
  retry: 2,
  maxWorkers: 1, // Sequential execution for safety
}
```

### Test Environments

Available environments:

- **sandbox_a**: Primary sandbox (default)
- **sandbox_b**: Secondary sandbox for fallback
- **local**: Local development environment

## 🏃‍♂️ Running Tests Locally

### Development Workflow

1. **Setup Environment**
   ```bash
   cp .env.example .env.test
   # Edit .env.test with your sandbox credentials
   ```

2. **Build and Test**
   ```bash
   pnpm build
   pnpm test:e2e
   ```

3. **Debug Specific Tests**
   ```bash
   # Run single test with verbose output
   pnpm test:e2e --run tests/e2e/commands/introspect.test.ts --reporter=verbose

   # Run with debug logging
   DEBUG=true pnpm test:e2e
   ```

### Common Development Tasks

```bash
# Test specific functionality
pnpm test:e2e --grep "should successfully introspect"

# Test error scenarios only
pnpm test:e2e --run tests/e2e/commands/error-scenarios.test.ts

# Run workflow tests
pnpm test:e2e --run tests/e2e/commands/workflows.test.ts

# Test with different environment
E2E_ENVIRONMENT=sandbox_b pnpm test:e2e
```

## 🔄 CI/CD Integration

### GitHub Actions

The project includes two CI workflows:

#### 1. Pull Request Tests (`.github/workflows/e2e-tests.yml`)

Runs on every PR, executing tests in parallel:

```yaml
Strategy:
  - Introspect Command Tests (20min)
  - Diff Command Tests (20min)
  - Deploy Command Tests (25min)
  - Workflow Tests (30min)
  - Error Scenario Tests (25min)
```

#### 2. Scheduled Health Checks (`.github/workflows/e2e-scheduled.yml`)

Daily health monitoring:

- **Smoke Tests**: Basic connectivity (5min)
- **Full E2E**: Complete test suite (60min)
- **Health Monitoring**: Status reporting
- **Automated Alerts**: Issue creation on failures

### Required Secrets

Configure in GitHub repository settings:

```
E2E_SALEOR_URL=https://sandbox-a.staging.saleor.cloud
E2E_SALEOR_TOKEN=your-sandbox-token
E2E_SALEOR_URL_B=https://sandbox-b.staging.saleor.cloud  # Optional
E2E_SALEOR_TOKEN_B=your-sandbox-token-b                  # Optional
```

### Manual Workflow Triggers

```bash
# Trigger E2E tests manually
gh workflow run e2e-tests.yml

# Run with specific environment
gh workflow run e2e-scheduled.yml -f environment=sandbox_b

# Run comprehensive tests
gh workflow run e2e-scheduled.yml -f test_depth=comprehensive
```

## 🔍 Debugging and Troubleshooting

### Common Issues

#### 1. Connection Timeouts

```bash
# Test connection manually
curl -H "Authorization: Bearer $E2E_SALEOR_TOKEN" \
     $E2E_SALEOR_URL/graphql/ \
     -d '{"query": "{ shop { name } }"}'
```

#### 2. Permission Errors

```bash
# Check CLI binary
tsx src/cli/main.ts --help

# Test basic introspect
pnpm dev introspect --url $E2E_SALEOR_URL --token $E2E_SALEOR_TOKEN
```

#### 3. Test Isolation Issues

```bash
# Run tests with unique workspace
TEST_RUN_ID=$(date +%s) pnpm test:e2e
```

### Debug Mode

Enable verbose logging:

```bash
# Environment variable
DEBUG=true pnpm test:e2e

# Vitest debug
pnpm test:e2e --run --reporter=verbose

# Full debug with logs
DEBUG=* LOG_LEVEL=debug pnpm test:e2e
```

### Log Analysis

Test logs include:

- **Command execution**: Full CLI command and arguments
- **Output parsing**: Parsed results and summaries
- **State changes**: Sandbox state before/after operations
- **Performance metrics**: Execution times and resource usage

## 📈 Performance Monitoring

### Metrics Collected

- **Command execution time**: Individual command performance
- **Workflow duration**: Complete end-to-end timing
- **Sandbox state changes**: Entity count deltas
- **Resource usage**: Memory and CPU utilization

### Performance Thresholds

Current expectations:

- **Introspect**: < 2 minutes
- **Diff**: < 1.5 minutes
- **Deploy**: < 5 minutes
- **Complete Workflow**: < 15 minutes

### Monitoring Dashboard

View performance trends in:

- GitHub Actions workflow summaries
- Test artifacts and logs
- Scheduled health check reports

## 🧹 Maintenance

### Regular Tasks

#### Weekly
- [ ] Review test results and performance trends
- [ ] Check sandbox health and connectivity
- [ ] Update test data and fixtures as needed

#### Monthly
- [ ] Review and update test timeouts
- [ ] Analyze failure patterns and improve error handling
- [ ] Update documentation with new learnings

#### Quarterly
- [ ] Audit test coverage and add missing scenarios
- [ ] Review and optimize test performance
- [ ] Update dependencies and tools

### Test Data Management

Tests automatically:

- ✅ Generate unique identifiers to avoid conflicts
- ✅ Clean up test data after successful runs
- ✅ Retain data on failures for debugging
- ✅ Isolate concurrent test executions

### Sandbox Maintenance

Monitor sandbox state:

```bash
# Check sandbox health
pnpm dev introspect --url $E2E_SALEOR_URL --token $E2E_SALEOR_TOKEN

# Monitor entity counts
# (tracked automatically in test logs)
```

## 🔧 Extending Tests

### Adding New Test Cases

1. **Choose the appropriate test file**:
   - Command-specific: `tests/e2e/commands/{command}.test.ts`
   - Cross-command: `tests/e2e/commands/workflows.test.ts`
   - Error scenarios: `tests/e2e/commands/error-scenarios.test.ts`

2. **Follow the existing patterns**:
   ```typescript
   it("should handle new scenario", async () => {
     // Setup
     const testData = TestDataGenerator.generateProduct();

     // Execute
     const result = await cliRunner.command(options);

     // Verify
     TestAssertions.assertCommandSuccess(result);
     expect(result.output).toContain("expected text");
   });
   ```

3. **Add appropriate cleanup**:
   ```typescript
   afterEach(async () => {
     await FileUtils.cleanupDirectory(testWorkspace);
   });
   ```

### Creating New Test Utilities

Add helper functions to appropriate files:

- **CLI operations**: `helpers/cli-runner.ts`
- **Sandbox interactions**: `helpers/sandbox-manager.ts`
- **Data generation**: `helpers/test-utils.ts`
- **Environment management**: `fixtures/environments.ts`

### Test Patterns

Follow these patterns for consistency:

#### 1. Test Structure
```typescript
describe("Feature Tests", () => {
  let cliRunner: CLIRunner;
  let testContext: TestContext;

  beforeAll(async () => {
    // Global setup
  });

  beforeEach(async () => {
    // Test-specific setup
  });

  it("should handle specific scenario", async () => {
    // Test implementation
  });

  afterEach(async () => {
    // Test cleanup
  });

  afterAll(async () => {
    // Global cleanup
  });
});
```

#### 2. Error Testing
```typescript
it("should handle error gracefully", async () => {
  const result = await cliRunner.command({
    ...options,
    expectFailure: true,
  });

  expect(result.success).toBe(false);
  expect(result.stderr).toContain("expected error");
});
```

#### 3. Performance Testing
```typescript
it("should complete within time limit", async () => {
  const startTime = Date.now();

  const result = await cliRunner.command(options);

  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(expectedLimit);
});
```

## 📚 References

### Documentation
- [Vitest Testing Framework](https://vitest.dev/)
- [Execa Process Execution](https://github.com/sindresorhus/execa)
- [Saleor GraphQL API](https://docs.saleor.io/docs/3.x/)

### Tools and Libraries
- **@faker-js/faker**: Test data generation
- **fs-extra**: Enhanced file system operations
- **fast-glob**: File pattern matching
- **tmp**: Temporary file/directory creation

### Best Practices
- **Test Isolation**: Each test runs independently
- **Unique Identifiers**: Avoid conflicts with timestamps/UUIDs
- **Proper Cleanup**: Always clean up test artifacts
- **Error Handling**: Test both success and failure paths
- **Performance Awareness**: Monitor execution times

## 🆘 Support

### Getting Help

1. **Check existing documentation**: This guide and README files
2. **Review test logs**: Detailed error messages and context
3. **Search GitHub issues**: Known problems and solutions
4. **Create new issue**: For bugs or enhancement requests

### Issue Templates

When reporting issues, include:

- Test command and environment
- Complete error messages and logs
- Sandbox configuration (without sensitive data)
- Steps to reproduce
- Expected vs actual behavior

### Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on:

- Code style and conventions
- Pull request process
- Testing requirements
- Documentation standards

---

**Happy Testing! 🧪✨**

The E2E test suite is designed to give you confidence in every change you make to the Saleor Configurator CLI. When tests pass, you know your code works in real-world scenarios.