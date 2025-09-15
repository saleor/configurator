# End-to-End (E2E) Testing for Saleor Configurator

This directory contains comprehensive end-to-end tests for the Saleor Configurator CLI using modern Node.js testing practices with Vitest and execa.

## Overview

The E2E test suite validates the complete workflow of the Saleor Configurator CLI against a real Saleor sandbox instance, ensuring:

- **Command functionality**: All CLI commands work correctly
- **Idempotency**: Repeated operations produce consistent results
- **Error handling**: Proper error scenarios and recovery
- **Integration**: Full workflow testing (introspect → modify → diff → deploy)

## Test Structure

```
tests/e2e/
├── commands/           # Individual command tests
├── fixtures/           # Test data and configurations
│   ├── configurations/ # Sample YAML configurations
│   ├── entities/      # Test entities (products, categories)
│   └── environments.ts # Environment configurations
├── helpers/           # Test utilities and helpers
│   ├── cli-runner.ts      # CLI execution with execa
│   ├── sandbox-manager.ts # Saleor sandbox interactions
│   └── test-utils.ts      # General test utilities
└── setup/             # Test setup and teardown
    └── global-setup.ts    # Global test configuration
```

## Prerequisites

1. **Node.js 20+**: Required for modern ES modules and testing features
2. **pnpm**: Package manager for dependencies
3. **Saleor Sandbox Access**: Valid URL and token for testing

## Environment Setup

### Environment Variables

Create a `.env.test` file or set environment variables:

```bash
# Required: Saleor sandbox configuration
E2E_SALEOR_URL=https://sandbox-a.staging.saleor.cloud
E2E_SALEOR_TOKEN=your-sandbox-token

# Optional: Test environment selection
E2E_ENVIRONMENT=sandbox_a  # sandbox_a, sandbox_b, local

# Optional: Test behavior
E2E_CLEANUP=true          # Clean up test data after tests
E2E_RETAIN_ON_FAILURE=false # Keep test data when tests fail
```

### Available Environments

- **sandbox_a**: Primary sandbox environment (default)
- **sandbox_b**: Secondary sandbox environment
- **local**: Local development environment

## Running Tests

### Run All E2E Tests

```bash
# Run E2E tests in watch mode
pnpm test:e2e

# Run E2E tests once (CI mode)
pnpm test:e2e:ci
```

### Run Specific Test Suites

```bash
# Run only introspect command tests
pnpm test:e2e --run tests/e2e/commands/introspect.test.ts

# Run only workflow tests
pnpm test:e2e --run tests/e2e/commands/workflows.test.ts

# Run with specific environment
E2E_ENVIRONMENT=sandbox_b pnpm test:e2e
```

### Debug Mode

```bash
# Run with verbose logging
DEBUG=true pnpm test:e2e

# Run single test with full output
pnpm test:e2e --run --reporter=verbose tests/e2e/commands/introspect.test.ts
```

## Test Scenarios

### 1. Command Testing

Each CLI command is tested individually:

- **Introspect**: Download configuration from Saleor
- **Diff**: Compare local and remote configurations
- **Deploy**: Upload configuration to Saleor

### 2. Workflow Testing

Complete end-to-end workflows:

```
introspect → modify → diff → deploy → deploy (idempotency)
```

### 3. Error Scenarios

- Invalid credentials
- Network failures
- Malformed configurations
- Validation errors

### 4. Performance Testing

- Command execution timing
- Large configuration handling
- Concurrent operation safety

## Test Data Management

### Fixtures

Pre-defined test data in `fixtures/`:

- **configurations/**: Complete Saleor configurations
- **entities/**: Individual entity definitions (products, categories)

### Generated Data

Tests use `@faker-js/faker` for:

- Dynamic test product generation
- Random configuration variations
- Unique test identifiers

### Cleanup

Test data is automatically cleaned up:

- **Success**: Always cleaned up
- **Failure**: Retained for debugging (configurable)

## Key Features

### Modern Testing Stack

- **Vitest**: Fast, modern test runner
- **execa**: Reliable subprocess execution
- **TypeScript**: Full type safety
- **ESM**: Modern ES modules support

### CLI Integration

- Real CLI execution via subprocess
- Output parsing and validation
- Error scenario simulation
- Performance measurement

### Sandbox Safety

- Isolated test environments
- Automatic cleanup procedures
- State validation and comparison
- Safe concurrent execution

### CI/CD Ready

- Parallel-safe test execution
- Comprehensive error reporting
- Environment-agnostic configuration
- Timeout and retry handling

## Best Practices

### Writing Tests

1. **Use descriptive test names**: Clearly describe what's being tested
2. **Independent tests**: Each test should be self-contained
3. **Proper cleanup**: Always clean up test data
4. **Error validation**: Test both success and failure scenarios
5. **Performance awareness**: Monitor test execution times

### Test Organization

1. **Group related tests**: Use `describe` blocks for logical grouping
2. **Setup/teardown**: Use proper beforeAll/afterAll hooks
3. **Shared utilities**: Leverage helper functions
4. **Clear assertions**: Use meaningful assertion messages

### Debugging

1. **Verbose logging**: Enable debug mode for troubleshooting
2. **State inspection**: Check sandbox state before/after tests
3. **Output analysis**: Examine CLI stdout/stderr
4. **Test isolation**: Run single tests for focused debugging

## Troubleshooting

### Common Issues

1. **Connection timeouts**: Check sandbox availability
2. **Permission errors**: Verify token permissions
3. **Test conflicts**: Ensure proper test isolation
4. **Configuration errors**: Validate YAML syntax

### Debug Commands

```bash
# Test sandbox connection
curl -H "Authorization: Bearer $E2E_SALEOR_TOKEN" \
     $E2E_SALEOR_URL/graphql/ \
     -d '{"query": "{ shop { name } }"}'

# Check CLI binary
tsx src/cli/main.ts --help

# Validate test configuration
node -e "console.log(JSON.stringify(require('./tests/e2e/fixtures/environments.ts').getTestEnvironment(), null, 2))"
```

## Contributing

When adding new E2E tests:

1. Follow existing patterns and structure
2. Add comprehensive error scenario coverage
3. Include performance assertions
4. Update documentation
5. Ensure CI compatibility

## Monitoring

Tests include built-in monitoring for:

- Execution times and performance trends
- Success/failure rates
- Sandbox state changes
- Resource utilization

This helps maintain test quality and identify regressions early.