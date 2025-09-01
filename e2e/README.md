# E2E Testing Framework for Saleor Configurator

This directory contains the end-to-end (E2E) testing framework for the Saleor Configurator CLI. The tests run against a real Saleor instance using Docker containers to ensure the CLI works correctly in production-like scenarios.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ and pnpm installed
- At least 4GB of free memory for Docker

### Running Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run only smoke tests (faster)
pnpm test:smoke

# Watch mode for development
pnpm test:e2e:watch

# Interactive UI mode
pnpm test:e2e:ui

# Run with verbose output
VERBOSE=true pnpm test:e2e
```

## 📁 Directory Structure

```
e2e/
├── docker/                    # Docker configurations
│   ├── docker-compose.test.yml  # Saleor test environment
│   └── seed/                    # Database seed data
├── fixtures/                  # Test data
│   ├── configs/              # YAML configuration fixtures
│   └── expected/             # Expected outputs
├── tests/                    # Test suites
│   ├── commands/             # Individual command tests
│   ├── scenarios/            # Complex multi-step scenarios
│   └── smoke/                # Quick smoke tests
├── utils/                    # Testing utilities
│   ├── cli-runner.ts         # CLI execution wrapper
│   ├── saleor-container.ts   # Docker container management
│   ├── test-helpers.ts       # Common test utilities
│   └── assertions.ts         # Custom test assertions
└── vitest.config.e2e.ts      # Vitest configuration
```

## 🧪 Test Architecture

### 1. **Testcontainers Integration**

We use [Testcontainers](https://testcontainers.com/) to manage Docker containers programmatically:

- Automatic container lifecycle management
- Dynamic port allocation
- Health checks and wait strategies
- Cleanup after test completion

### 2. **Real Saleor Instance**

Tests run against a real Saleor instance (v3.20) with:
- PostgreSQL database
- Redis cache
- Celery workers
- Full GraphQL API

### 3. **CLI Runner**

The `CliRunner` class uses `execa` to spawn actual CLI processes:
- Real process execution
- Timeout handling
- stdin/stdout/stderr capture
- Exit code validation

## 📝 Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SaleorTestContainer } from "../../utils/saleor-container.js";
import { CliRunner } from "../../utils/cli-runner.js";

describe("My E2E Test", () => {
  let container: SaleorTestContainer;
  let cli: CliRunner;
  let apiUrl: string;
  let token: string;

  beforeAll(async () => {
    // Start Saleor container
    container = new SaleorTestContainer();
    await container.start();
    
    apiUrl = container.getApiUrl();
    token = container.getAdminToken();
    
    // Initialize CLI runner
    cli = new CliRunner();
  }, 180000); // 3 minutes timeout

  afterAll(async () => {
    await container?.stop();
  });

  it("should test something", async () => {
    const result = await cli.introspect(apiUrl, token);
    expect(result).toHaveSucceeded();
  });
});
```

### Custom Assertions

The framework provides custom assertions for CLI testing:

```typescript
// Basic assertions
expect(result).toHaveSucceeded();
expect(result).toHaveFailed();
expect(result).toHaveExitCode(0);

// Output assertions
expect(result).toContainInOutput("text");
expect(result).toContainInStdout("text");
expect(result).toContainInStderr("error");
expect(result).toMatchPattern(/pattern/);

// High-level assertions
assertDeploymentSuccess(result);
assertIntrospectionSuccess(result);
assertNoChanges(result);
```

### Test Helpers

```typescript
// File operations
const tempDir = await createTempDir();
const config = await readYaml(configPath);
await writeYaml(configPath, config);

// Test data
const minimalConfig = createMinimalConfig();
const complexConfig = createComplexConfig();

// Async utilities
await waitFor(() => condition, { timeout: 5000 });
await retry(() => operation, { maxAttempts: 3 });
```

## 🔄 Test Scenarios

### 1. **Smoke Tests** (`tests/smoke/`)
Quick validation of basic functionality:
- CLI help and version
- Basic introspect → deploy cycle
- Error handling

### 2. **Command Tests** (`tests/commands/`)
Detailed testing of each CLI command:
- `introspect.e2e.test.ts` - Configuration download
- `deploy.e2e.test.ts` - Configuration deployment
- `diff.e2e.test.ts` - Configuration comparison
- `start.e2e.test.ts` - Interactive setup

### 3. **Scenario Tests** (`tests/scenarios/`)
Complex multi-step workflows:
- Full cycle with idempotency verification
- Concurrent operations
- Error recovery
- Large configuration handling

## 🐳 Docker Environment

### Test Container Configuration

The test environment uses a minimal Saleor setup optimized for testing:

```yaml
# e2e/docker/docker-compose.test.yml
services:
  api:          # Saleor API (port 8000)
  db:           # PostgreSQL (port 5432)
  redis:        # Redis cache (port 6379)
  worker:       # Celery workers
```

### Container Management

```typescript
// Start container
const container = new SaleorTestContainer({
  projectName: "my-test",
  superuserEmail: "admin@example.com",
  superuserPassword: "admin123"
});
await container.start();

// Use container
const apiUrl = container.getApiUrl();
const token = container.getAdminToken();

// Execute GraphQL queries
const data = await container.graphql(query, variables);

// Reset database between tests
await container.reset();

// Stop container
await container.stop();
```

## 🚦 CI/CD Integration

### GitHub Actions Workflow

The E2E tests run automatically on:
- Pull requests (smoke tests only)
- Pushes to main branch (full suite)
- Manual workflow dispatch

```yaml
# .github/workflows/e2e-tests.yml
- Builds the CLI
- Pulls Docker images
- Runs tests
- Uploads results and logs
- Comments on PRs with results
```

### Running in CI

```bash
# CI environment is auto-detected
CI=true pnpm test:e2e

# With specific configuration
LOG_LEVEL=debug pnpm test:e2e
```

## 🔧 Troubleshooting

### Common Issues

1. **Docker not available**
   ```bash
   # Ensure Docker is running
   docker version
   ```

2. **Port conflicts**
   ```bash
   # Stop conflicting containers
   docker ps
   docker stop <container-id>
   ```

3. **Timeout errors**
   - Increase timeouts in test configuration
   - Check Docker resource limits
   - Use `VERBOSE=true` for debugging

4. **Container startup failures**
   ```bash
   # Check Docker logs
   docker-compose -f e2e/docker/docker-compose.test.yml logs
   ```

### Debug Mode

Run tests with verbose output:
```bash
VERBOSE=true LOG_LEVEL=debug pnpm test:e2e
```

View container logs:
```bash
docker-compose -f e2e/docker/docker-compose.test.yml logs -f
```

## 📊 Performance

- Smoke tests: ~2-3 minutes
- Full E2E suite: ~5-10 minutes
- Container startup: ~30-60 seconds
- Individual test: ~10-30 seconds

## 🔄 Best Practices

1. **Test Isolation**: Each test should be independent
2. **Cleanup**: Always clean up containers and temp files
3. **Timeouts**: Set appropriate timeouts for async operations
4. **Assertions**: Use custom assertions for clarity
5. **Fixtures**: Use predefined configurations for consistency
6. **Error Cases**: Test both success and failure paths
7. **Logging**: Use verbose mode when debugging

## 📚 Additional Resources

- [Testcontainers Documentation](https://testcontainers.com/)
- [Vitest Documentation](https://vitest.dev/)
- [Saleor API Documentation](https://docs.saleor.io/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## 🤝 Contributing

When adding new E2E tests:

1. Choose the appropriate test category (smoke/commands/scenarios)
2. Use existing utilities and helpers
3. Follow the established patterns
4. Ensure tests are deterministic
5. Add appropriate timeouts
6. Document complex test scenarios
7. Run tests locally before pushing

## 📝 License

Part of the Saleor Configurator project.