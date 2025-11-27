# E2E Testing Suite

This comprehensive end-to-end testing suite provides robust testing for the Saleor Configurator CLI using modern testing practices and execa integration.

## Architecture

### CliTestRunner
The enhanced `CliTestRunner` class provides:
- **Comprehensive error handling** with `reject: false` for detailed error inspection
- **Real-time output streaming** using execa's iterable interface
- **Interactive testing** with input simulation
- **Signal handling** for testing process interruption scenarios
- **Concurrent execution** with controlled concurrency
- **Performance metrics** collection
- **Resource cleanup** for proper test isolation

### Test Structure

- `cli-start.e2e.test.ts` - Interactive mode testing
- `cli-error-handling.e2e.test.ts` - Comprehensive error scenarios
- `cli-streaming.e2e.test.ts` - Real-time output and progress indicators
- `cli-signals.e2e.test.ts` - Signal handling and graceful shutdown
- `cli-concurrent.e2e.test.ts` - Parallel execution and load testing
- `cli-performance.e2e.test.ts` - Benchmarks and performance monitoring
- `cli-introspect-deploy.e2e.test.ts` - Updated existing tests with new patterns

### Helper Modules

#### `helpers/cli-test-runner.ts`
Enhanced CLI test runner with execa best practices:
- Type-safe result handling
- Streaming output support
- Interactive input simulation
- Signal testing capabilities
- Concurrent execution management
- Metrics collection

#### `helpers/fixtures.ts`
Test data generators and utilities:
- Valid/invalid configuration fixtures
- Large configuration generators
- Test scenario builders
- Environment configuration helpers
- File system utilities

#### `helpers/assertions.ts`
Custom assertions and matchers:
- CLI-specific matchers (`toSucceed`, `toFail`, `toHaveStdout`, etc.)
- Common assertion patterns
- Test utilities (retry, wait, measure time)

## Features

### Advanced Error Testing
- Network failures and timeouts
- Authentication errors
- File system permission issues
- Configuration validation errors
- Graceful error recovery

### Real-time Output Testing
- Progress indicator verification
- Streaming log capture
- Interactive output testing
- Color output handling
- Performance monitoring

### Signal Handling
- SIGINT (Ctrl+C) testing
- SIGTERM graceful shutdown
- Resource cleanup verification
- Partial operation handling

### Concurrency & Performance
- Parallel command execution
- Load testing capabilities
- Performance benchmarking
- Memory usage monitoring
- Scaling verification

### Interactive Testing
- Simulated user input
- Menu navigation testing
- Error handling in interactive flows
- Environment variable integration

## Usage

### Running Tests

```bash
# All e2e tests (requires Saleor token)
pnpm test:e2e

# With token for full testing
CONFIGURATOR_E2E_SALEOR_TOKEN=your_token pnpm test:e2e

# Specific test file
pnpm test:e2e cli-streaming.e2e.test.ts
```

### Environment Variables

- `CONFIGURATOR_E2E_SALEOR_TOKEN` - Required for running tests
- `CONFIGURATOR_E2E_SALEOR_URL` - Saleor GraphQL URL (optional)
- `CONFIGURATOR_E2E_TIMEOUT` - Custom timeout in milliseconds

### Writing New Tests

```typescript
import { createCliTestRunner } from "./helpers/cli-test-runner";
import { fixtures, testEnv } from "./helpers/fixtures";
import { CliAssertions } from "./helpers/assertions";

describe("My Test Suite", () => {
  let runner: CliTestRunner;

  beforeAll(() => {
    runner = createCliTestRunner({ timeout: 60_000 });
  });

  afterAll(async () => {
    await runner.cleanup();
  });

  test("command succeeds", async () => {
    const result = await runner.runSafe(["introspect", "--help"]);
    expect(result).toSucceed();
    expect(result).toHaveStdout("Usage:");
  });
});
```

## Best Practices

1. **Use `runSafe()`** instead of `run()` for better error inspection
2. **Always cleanup** with `runner.cleanup()` in `afterAll`
3. **Use fixtures** for consistent test data
4. **Test error scenarios** explicitly with proper assertions
5. **Isolate tests** with unique temporary directories
6. **Monitor performance** with metrics collection
7. **Test concurrency** for scalability verification

## Test Coverage

The suite covers:
- ✅ All CLI commands (introspect, deploy, diff, start)
- ✅ Error handling and recovery
- ✅ Interactive flows and input simulation
- ✅ Real-time output and streaming
- ✅ Signal handling and graceful shutdown
- ✅ Concurrent execution and load testing
- ✅ Performance benchmarking
- ✅ File system operations
- ✅ Network error scenarios
- ✅ Configuration validation

This comprehensive testing approach ensures CLI reliability and prevents regressions across all usage scenarios.