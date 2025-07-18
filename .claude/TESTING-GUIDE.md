# Saleor Configurator - Testing Guide

This comprehensive guide covers all aspects of testing the Saleor Configurator, including test scenarios, best practices, and strategies for ensuring application reliability.

## Table of Contents
- [Test Scenario Planning](#test-scenario-planning)
- [Vitest Configuration & Best Practices](#vitest-configuration--best-practices)
- [Factory Patterns & Test Data](#factory-patterns--test-data)
- [CLI Testing Strategies](#cli-testing-strategies)
- [Mock Strategies](#mock-strategies)
- [Test Organization](#test-organization)
- [Coverage Requirements](#coverage-requirements)

## Test Scenario Planning

### Comprehensive Test Scenarios Table

For each feature or function, ensure you cover these test scenarios:

| Scenario Type | Description | Input | Expected Output | Validation Focus |
|--------------|-------------|--------|-----------------|------------------|
| **Happy Path** | Normal successful operation | Valid, complete data | Success result with expected data | - Correct data transformation<br>- Proper state changes<br>- Expected side effects occur |
| **Validation Errors** | Invalid input data | Missing required fields, wrong types, invalid formats | Validation error with specific field errors | - All validation rules enforced<br>- Clear error messages<br>- No partial operations |
| **Business Rule Violations** | Valid format but breaks business rules | Duplicate slugs, exceeding limits, invalid references | Business error with explanation | - Business logic correctly applied<br>- Appropriate error codes<br>- Data integrity maintained |
| **External Service Failures** | GraphQL/API errors | Valid input but service fails | Service error with retry info | - Graceful degradation<br>- Error context preserved<br>- Retry logic works |
| **Edge Cases** | Boundary conditions | Empty arrays, null values, max length strings | Appropriate handling | - No crashes<br>- Predictable behavior<br>- Performance acceptable |
| **Concurrent Operations** | Multiple simultaneous requests | Same operation triggered multiple times | Idempotent results | - No race conditions<br>- Consistent state<br>- Proper locking/queuing |
| **Performance Scenarios** | Large data sets | 1000+ items, deeply nested data | Completes within timeout | - Memory usage reasonable<br>- Batch processing works<br>- Progress reporting accurate |

### Example Test Scenario: Product Creation

```typescript
describe('ProductService.create', () => {
  // Test Scenario Documentation
  const testScenarios = {
    happyPath: {
      description: 'Creates product with all valid fields',
      input: {
        name: 'Test Product',
        slug: 'test-product',
        description: 'A test product description',
        productType: 'simple-product'
      },
      expectedOutput: {
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          name: 'Test Product',
          slug: 'test-product'
        })
      },
      validates: [
        'Product is created in database',
        'Slug is properly formatted',
        'Product type association is correct',
        'Audit fields (created/updated) are set'
      ]
    },
    
    validationError: {
      description: 'Rejects product with missing required fields',
      input: {
        name: '', // Empty name
        slug: 'test product', // Invalid slug format
        // Missing productType
      },
      expectedOutput: {
        success: false,
        error: expect.objectContaining({
          type: 'ValidationError',
          errors: [
            { field: 'name', message: 'Name is required' },
            { field: 'slug', message: 'Slug must be lowercase with hyphens' },
            { field: 'productType', message: 'Product type is required' }
          ]
        })
      },
      validates: [
        'No database operations occur',
        'All validation errors are returned',
        'Error messages are user-friendly'
      ]
    },
    
    duplicateSlug: {
      description: 'Prevents duplicate product slugs',
      setup: 'Create product with slug "existing-product"',
      input: {
        name: 'Another Product',
        slug: 'existing-product', // Duplicate
        productType: 'simple-product'
      },
      expectedOutput: {
        success: false,
        error: expect.objectContaining({
          type: 'ConflictError',
          message: 'Product with slug "existing-product" already exists'
        })
      },
      validates: [
        'Uniqueness constraint enforced',
        'Existing product unchanged',
        'Clear conflict message'
      ]
    },
    
    graphqlError: {
      description: 'Handles GraphQL mutation failures gracefully',
      setup: 'Mock GraphQL client to return network error',
      input: { /* valid input */ },
      expectedOutput: {
        success: false,
        error: expect.objectContaining({
          type: 'ServiceError',
          message: 'Failed to create product in Saleor',
          retryable: true
        })
      },
      validates: [
        'Original error is wrapped with context',
        'Retry information provided',
        'No partial state changes'
      ]
    }
  };

  // Implementation of test scenarios
  Object.entries(testScenarios).forEach(([scenario, config]) => {
    it(`${scenario}: ${config.description}`, async () => {
      // Setup
      if (config.setup) {
        await setupTestConditions(config.setup);
      }

      // Act
      const result = await productService.create(config.input);

      // Assert
      expect(result).toMatchObject(config.expectedOutput);
      
      // Additional validations
      for (const validation of config.validates) {
        await validateCondition(validation, result);
      }
    });
  });
});
```

## Vitest Configuration & Best Practices

### 1. **Vitest Configuration (vitest.config.ts)**

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Environment
    environment: 'node', // Use 'jsdom' for browser-like environment
    
    // Global setup
    globalSetup: './src/test/global-setup.ts',
    setupFiles: ['./src/test/setup.ts'],
    
    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts'
      ],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80
    },
    
    // Test isolation
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true // Prevents race conditions
      }
    },
    
    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Reporter
    reporters: ['verbose'],
    
    // Watch mode exclusions
    watchExclude: ['**/node_modules/**', '**/dist/**'],
    
    // TypeScript
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.test.json'
    }
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@test': resolve(__dirname, './src/test')
    }
  }
});
```

### 2. **Test Setup Files**

```typescript
// src/test/setup.ts
import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { cleanup } from '@test/utils';

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';
  
  // Setup global mocks
  vi.mock('@/lib/logger', () => ({
    createLogger: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn()
    })
  }));
});

// Cleanup after each test
afterEach(async () => {
  // Clear all mocks
  vi.clearAllMocks();
  
  // Clean up test data
  await cleanup();
});

// Global teardown
afterAll(() => {
  // Restore all mocks
  vi.restoreAllMocks();
});

// Extend Vitest matchers
expect.extend({
  toBeValidResult(received) {
    const pass = received && 
      typeof received === 'object' && 
      'success' in received &&
      (received.success ? 'data' in received : 'error' in received);
    
    return {
      pass,
      message: () => 
        pass 
          ? 'Expected value not to be a valid Result type'
          : 'Expected value to be a valid Result type'
    };
  }
});
```

### 3. **Vitest Best Practices (2025)**

#### Use vi.mock with Module Factories

```typescript
// ✅ GOOD: Type-safe mocking with module factories
vi.mock('@/modules/product/product-repository', () => {
  const ProductRepository = vi.fn();
  ProductRepository.prototype.create = vi.fn();
  ProductRepository.prototype.findBySlug = vi.fn();
  ProductRepository.prototype.update = vi.fn();
  
  return { ProductRepository };
});

// Import after mock for proper typing
import { ProductRepository } from '@/modules/product/product-repository';
import type { MockedClass } from 'vitest';

describe('ProductService', () => {
  let repository: MockedClass<ProductRepository>;
  
  beforeEach(() => {
    repository = new ProductRepository() as MockedClass<ProductRepository>;
  });
});
```

#### Use vi.spyOn for Partial Mocks

```typescript
// ✅ GOOD: Spy on specific methods while keeping others
import * as utils from '@/lib/utils';

const formatSlugSpy = vi.spyOn(utils, 'formatSlug');
formatSlugSpy.mockReturnValue('mocked-slug');

// Original implementation still available
const original = formatSlugSpy.getMockImplementation();
```

#### Test Async Code Properly

```typescript
// ✅ GOOD: Multiple ways to test async code

// Using async/await
it('should handle async operations', async () => {
  const result = await asyncOperation();
  expect(result).toBe('success');
});

// Using resolves/rejects matchers
it('should resolve with data', () => {
  return expect(asyncOperation()).resolves.toBe('success');
});

it('should reject with error', () => {
  return expect(failingOperation()).rejects.toThrow('Failed');
});

// Testing specific error types
it('should throw ValidationError', async () => {
  await expect(async () => {
    await service.create(invalidInput);
  }).rejects.toThrow(ValidationError);
});
```

## Factory Patterns & Test Data

### 1. **Type-Safe Factory Pattern**

```typescript
// src/test/factories/base-factory.ts
export abstract class Factory<T> {
  protected abstract getDefaults(): T;
  
  build(overrides: Partial<T> = {}): T {
    return {
      ...this.getDefaults(),
      ...overrides
    };
  }
  
  buildMany(count: number, overrides: Partial<T> = {}): T[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }
  
  async create(overrides: Partial<T> = {}): Promise<T> {
    const entity = this.build(overrides);
    return this.persist(entity);
  }
  
  protected abstract persist(entity: T): Promise<T>;
}
```

### 2. **Entity Factories**

```typescript
// src/test/factories/product-factory.ts
import { Factory } from './base-factory';
import type { Product, ProductInput } from '@/modules/product/types';
import { faker } from '@faker-js/faker';

export class ProductFactory extends Factory<ProductInput> {
  protected getDefaults(): ProductInput {
    return {
      name: faker.commerce.productName(),
      slug: faker.helpers.slugify(faker.commerce.productName()).toLowerCase(),
      description: faker.commerce.productDescription(),
      productType: 'simple-product',
      category: faker.commerce.department(),
      attributes: [],
      isPublished: true,
      metadata: {}
    };
  }
  
  // Specific builders for common scenarios
  withAttributes(attributes: Array<{ key: string; value: string }>): this {
    this.defaults.attributes = attributes;
    return this;
  }
  
  unpublished(): this {
    this.defaults.isPublished = false;
    return this;
  }
  
  withLongName(): this {
    this.defaults.name = faker.string.alpha(300); // Max length test
    return this;
  }
  
  protected async persist(entity: ProductInput): Promise<Product> {
    // In tests, this might save to a test database or return a mock
    return {
      id: faker.string.uuid(),
      ...entity,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
  }
}

// Usage in tests
const productFactory = new ProductFactory();

it('should handle product with max name length', async () => {
  const product = productFactory.withLongName().build();
  const result = await service.create(product);
  expect(result.success).toBe(false);
  expect(result.error.message).toContain('exceeds maximum length');
});
```

### 3. **GraphQL Response Factories**

```typescript
// src/test/factories/graphql-factory.ts
export class GraphQLResponseFactory {
  static success<T>(data: T) {
    return {
      data,
      errors: []
    };
  }
  
  static error(errors: Array<{ message: string; field?: string; code?: string }>) {
    return {
      data: null,
      errors: errors.map(e => ({
        message: e.message,
        extensions: {
          code: e.code || 'INTERNAL_ERROR',
          field: e.field
        }
      }))
    };
  }
  
  static productCreateSuccess(product: Partial<Product> = {}) {
    return this.success({
      productCreate: {
        product: {
          id: faker.string.uuid(),
          name: 'Test Product',
          slug: 'test-product',
          ...product
        },
        errors: []
      }
    });
  }
  
  static validationError(field: string, message: string) {
    return {
      productCreate: {
        product: null,
        errors: [{
          field,
          message,
          code: 'INVALID'
        }]
      }
    };
  }
}
```

### 4. **Test Data Builders**

```typescript
// src/test/builders/test-data-builder.ts
export class TestDataBuilder {
  private readonly factories = {
    product: new ProductFactory(),
    channel: new ChannelFactory(),
    attribute: new AttributeFactory()
  };
  
  async setupEcommerceScenario() {
    // Create a complete e-commerce setup
    const channel = await this.factories.channel.create({
      name: 'Default Channel',
      slug: 'default-channel'
    });
    
    const attributes = await Promise.all([
      this.factories.attribute.create({ name: 'Color', slug: 'color' }),
      this.factories.attribute.create({ name: 'Size', slug: 'size' })
    ]);
    
    const products = await Promise.all([
      this.factories.product
        .withAttributes(attributes.map(a => ({ key: a.slug, value: 'Red' })))
        .create({ name: 'T-Shirt' }),
      this.factories.product
        .withAttributes(attributes.map(a => ({ key: a.slug, value: 'Blue' })))
        .create({ name: 'Jeans' })
    ]);
    
    return { channel, attributes, products };
  }
  
  async cleanup() {
    // Clean up test data in reverse order
    await this.cleanupProducts();
    await this.cleanupAttributes();
    await this.cleanupChannels();
  }
}
```

## CLI Testing Strategies

### 1. **Integration Testing for CLI Commands**

```typescript
// src/test/cli/cli-test-runner.ts
import { spawn, ChildProcess } from 'child_process';
import { Readable, Writable } from 'stream';

export class CLITestRunner {
  private process: ChildProcess | null = null;
  private stdout: string = '';
  private stderr: string = '';
  
  async run(args: string[], options: {
    timeout?: number;
    env?: Record<string, string>;
    input?: string[];
  } = {}): Promise<CLITestResult> {
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 10000;
      const env = { ...process.env, ...options.env };
      
      this.process = spawn('node', ['./dist/cli/main.js', ...args], {
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Capture output
      this.process.stdout?.on('data', (data) => {
        this.stdout += data.toString();
      });
      
      this.process.stderr?.on('data', (data) => {
        this.stderr += data.toString();
      });
      
      // Handle input
      if (options.input && this.process.stdin) {
        this.provideInput(this.process.stdin, options.input);
      }
      
      // Set timeout
      const timer = setTimeout(() => {
        this.process?.kill();
        reject(new Error('CLI command timed out'));
      }, timeout);
      
      this.process.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          exitCode: code || 0,
          stdout: this.stdout,
          stderr: this.stderr
        });
      });
    });
  }
  
  private async provideInput(stdin: Writable, inputs: string[]) {
    for (const input of inputs) {
      await this.waitForPrompt();
      stdin.write(input + '\n');
    }
    stdin.end();
  }
  
  private waitForPrompt(timeout = 1000): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.stdout.includes('?') || this.stdout.includes(':')) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, timeout);
    });
  }
}

// Usage
describe('CLI Integration Tests', () => {
  const runner = new CLITestRunner();
  
  it('should show help message', async () => {
    const result = await runner.run(['--help']);
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Usage: saleor-config [options] [command]');
    expect(result.stdout).toContain('Commands:');
    expect(result.stdout).toContain('start');
    expect(result.stdout).toContain('diff');
    expect(result.stdout).toContain('push');
  });
  
  it('should handle interactive setup', async () => {
    const result = await runner.run(['start'], {
      input: [
        'https://example.saleor.cloud/graphql/',
        'test-api-token',
        'y' // Confirm
      ]
    });
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Enter your Saleor GraphQL endpoint URL');
    expect(result.stdout).toContain('Enter your API token');
    expect(result.stdout).toContain('Configuration saved successfully');
  });
});
```

### 2. **Testing CLI Output Formatting**

```typescript
describe('CLI Output Tests', () => {
  it('should display diff with correct formatting', async () => {
    // Mock file system to provide config
    vi.mock('fs/promises', () => ({
      readFile: vi.fn().mockResolvedValue(testConfigYAML)
    }));
    
    const result = await runner.run(['diff']);
    
    // Verify ANSI color codes
    expect(result.stdout).toContain('\x1b[32m+ Create\x1b[0m'); // Green
    expect(result.stdout).toContain('\x1b[31m- Delete\x1b[0m'); // Red
    expect(result.stdout).toContain('\x1b[33m~ Update\x1b[0m'); // Yellow
    
    // Verify structure
    expect(result.stdout).toMatch(/Products:\s+\d+ to create/);
    expect(result.stdout).toMatch(/Channels:\s+\d+ to update/);
  });
  
  it('should display progress indicators', async () => {
    const result = await runner.run(['push', '--file', 'test.yml']);
    
    // Check for spinner/progress text
    expect(result.stdout).toContain('Creating products...');
    expect(result.stdout).toContain('✓ Created product "Test Product"');
    expect(result.stdout).toContain('✅ Configuration pushed successfully');
  });
});
```

### 3. **Mock stdin for Testing User Input**

```typescript
import { MockSTDIN, stdin } from 'mock-stdin';

describe('Interactive CLI Tests', () => {
  let mockStdin: MockSTDIN;
  
  beforeEach(() => {
    mockStdin = stdin();
  });
  
  afterEach(() => {
    mockStdin.restore();
  });
  
  it('should handle user confirmation', async () => {
    const commandPromise = runner.run(['push', '--file', 'config.yml']);
    
    // Wait for confirmation prompt
    await waitFor(() => 
      expect(runner.stdout).toContain('Do you want to continue?')
    );
    
    // Send user input
    mockStdin.send('y\n');
    
    const result = await commandPromise;
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Proceeding with deployment');
  });
  
  it('should handle multi-select options', async () => {
    const commandPromise = runner.run(['configure']);
    
    // Navigate menu
    await waitFor(() => expect(runner.stdout).toContain('Select features:'));
    
    mockStdin.send('\x1B[B'); // Arrow down
    mockStdin.send(' ');      // Space to select
    mockStdin.send('\x1B[B'); // Arrow down
    mockStdin.send(' ');      // Space to select
    mockStdin.send('\n');     // Enter to confirm
    
    const result = await commandPromise;
    expect(result.stdout).toContain('Selected: Products, Channels');
  });
});
```

## Mock Strategies

### 1. **Module Mocking Best Practices**

```typescript
// ✅ GOOD: Mock at module boundaries
vi.mock('@/lib/graphql/client', () => ({
  createGraphQLClient: vi.fn(() => ({
    request: vi.fn(),
    batchRequest: vi.fn()
  }))
}));

// ✅ GOOD: Partial mocking for utilities
vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    generateSlug: vi.fn((name: string) => `mocked-${name.toLowerCase()}`)
  };
});

// ❌ BAD: Don't mock internal implementation
vi.mock('./internal-helper'); // Avoid this
```

### 2. **GraphQL Mocking Strategy**

```typescript
// src/test/mocks/graphql-mock.ts
import { vi } from 'vitest';
import type { GraphQLClient } from '@/lib/graphql/client';

export function createMockGraphQLClient(): GraphQLClient {
  const mockResponses = new Map<string, any>();
  
  return {
    request: vi.fn(async (query, variables) => {
      const queryName = extractQueryName(query);
      const mockResponse = mockResponses.get(queryName);
      
      if (mockResponse) {
        if (typeof mockResponse === 'function') {
          return mockResponse(variables);
        }
        return mockResponse;
      }
      
      throw new Error(`No mock response for query: ${queryName}`);
    }),
    
    setMockResponse(queryName: string, response: any) {
      mockResponses.set(queryName, response);
    },
    
    batchRequest: vi.fn(async (operations) => {
      return Promise.all(
        operations.map(op => this.request(op.query, op.variables))
      );
    })
  };
}

// Usage in tests
const mockClient = createMockGraphQLClient();

mockClient.setMockResponse('GetProduct', (variables) => {
  if (variables.slug === 'existing-product') {
    return { product: { id: '1', slug: 'existing-product' } };
  }
  return { product: null };
});

mockClient.setMockResponse('CreateProduct', 
  GraphQLResponseFactory.productCreateSuccess()
);
```

### 3. **Service Layer Mocking**

```typescript
// src/test/mocks/service-mocks.ts
export function createMockProductService(): MockedProductService {
  return {
    create: vi.fn().mockResolvedValue({ 
      success: true, 
      data: ProductFactory.build() 
    }),
    
    update: vi.fn().mockResolvedValue({ 
      success: true, 
      data: ProductFactory.build() 
    }),
    
    delete: vi.fn().mockResolvedValue({ 
      success: true 
    }),
    
    findBySlug: vi.fn().mockResolvedValue({ 
      success: true, 
      data: ProductFactory.build() 
    }),
    
    // Helper to simulate errors
    simulateError: function(method: string, error: Error) {
      this[method].mockResolvedValueOnce({ 
        success: false, 
        error 
      });
    }
  };
}
```

### 4. **Environment Mocking**

```typescript
// src/test/mocks/environment.ts
export function mockEnvironment(overrides: Record<string, string> = {}) {
  const original = { ...process.env };
  
  beforeEach(() => {
    process.env = {
      ...original,
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      ...overrides
    };
  });
  
  afterEach(() => {
    process.env = original;
  });
}

// Usage
describe('Configuration Loading', () => {
  mockEnvironment({
    SALEOR_API_URL: 'https://test.saleor.cloud/graphql/',
    SALEOR_API_TOKEN: 'test-token'
  });
  
  it('should load config from environment', () => {
    const config = loadConfiguration();
    expect(config.apiUrl).toBe('https://test.saleor.cloud/graphql/');
  });
});
```

## Test Organization

### 1. **Directory Structure**

```
src/
├── modules/
│   └── product/
│       ├── product-service.ts
│       ├── product-service.test.ts        # Unit tests
│       └── product-service.integration.test.ts
├── cli/
│   └── commands/
│       ├── push.ts
│       └── push.test.ts                   # Command unit tests
├── test/                                  # Shared test utilities
│   ├── setup.ts                          # Global test setup
│   ├── factories/                        # Test data factories
│   │   ├── base-factory.ts
│   │   ├── product-factory.ts
│   │   └── channel-factory.ts
│   ├── mocks/                           # Shared mocks
│   │   ├── graphql-mock.ts
│   │   └── service-mocks.ts
│   ├── fixtures/                        # Static test data
│   │   ├── valid-config.yml
│   │   └── invalid-config.yml
│   ├── utils/                          # Test utilities
│   │   ├── cli-runner.ts
│   │   └── assertions.ts
│   └── integration/                    # Integration test suites
│       ├── cli.integration.test.ts
│       └── api.integration.test.ts
```

### 2. **Test File Naming Conventions**

```typescript
// Unit tests - same directory as source
product-service.test.ts       // Unit tests for service
product-repository.test.ts    // Unit tests for repository

// Integration tests - .integration.test.ts suffix
product.integration.test.ts   // Integration tests
cli.integration.test.ts       // CLI integration tests

// E2E tests - separate directory
e2e/product-flow.e2e.test.ts  // Full end-to-end tests
```

### 3. **Test Suite Organization**

```typescript
describe('ProductService', () => {
  describe('create', () => {
    describe('with valid input', () => {
      it('should create product successfully');
      it('should emit product created event');
      it('should update cache');
    });
    
    describe('with invalid input', () => {
      it('should return validation error for missing name');
      it('should return validation error for invalid slug');
    });
    
    describe('when repository fails', () => {
      it('should return service error');
      it('should include retry information');
    });
  });
  
  describe('bulkCreate', () => {
    it('should process items in batches');
    it('should handle partial failures');
    it('should report progress');
  });
});
```

### 4. **Shared Test Utilities**

```typescript
// src/test/utils/assertions.ts
export const customMatchers = {
  toBeSuccessResult(received: any) {
    return {
      pass: received?.success === true && 'data' in received,
      message: () => `Expected ${received} to be a success result`
    };
  },
  
  toBeErrorResult(received: any, expectedError?: string) {
    const pass = received?.success === false && 'error' in received;
    const errorMatches = !expectedError || 
      received?.error?.message?.includes(expectedError);
    
    return {
      pass: pass && errorMatches,
      message: () => `Expected ${received} to be an error result`
    };
  }
};

// src/test/utils/wait-for.ts
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error('Timeout waiting for condition');
}
```

## Coverage Requirements

### 1. **Coverage Targets**

```json
{
  "coverage": {
    "lines": 80,       // Minimum 80% line coverage
    "functions": 80,   // Minimum 80% function coverage
    "branches": 80,    // Minimum 80% branch coverage
    "statements": 80,  // Minimum 80% statement coverage
    
    "thresholds": {
      // Strict requirements for critical paths
      "src/modules/*/service.ts": {
        "lines": 90,
        "functions": 90,
        "branches": 85
      },
      "src/core/**": {
        "lines": 95,
        "functions": 95,
        "branches": 90
      }
    }
  }
}
```

### 2. **What to Test**

#### Must Test (Critical Path)
- All service layer methods
- Error handling paths
- Business rule validations
- Data transformations
- CLI command handlers
- GraphQL error scenarios

#### Should Test (Important)
- Utility functions with logic
- Complex data structures
- Edge cases and boundaries
- Concurrent operations
- Performance-critical code

#### Can Skip (Low Value)
- Simple getters/setters
- Type definitions
- Constants
- Direct pass-through functions
- Generated code

### 3. **Coverage Reports**

```bash
# Generate coverage report
pnpm test:coverage

# View coverage in browser
pnpm test:coverage:ui

# Check coverage meets requirements
pnpm test:coverage:check
```

### 4. **Improving Coverage**

```typescript
// Use coverage comments to identify gaps
/* istanbul ignore next */ // Skip coverage for this line
/* istanbul ignore if */   // Skip coverage for this branch

// Example: Defensive code that shouldn't happen
if (!this.initialized) {
  /* istanbul ignore next - defensive check */
  throw new Error('Service not initialized');
}

// Better: Make untestable code testable
class Service {
  constructor(
    private readonly client = createDefaultClient() // Hard to test
  ) {}
}

// Refactor to:
class Service {
  constructor(
    private readonly client: Client // Easy to inject mock
  ) {}
}
```

## Test Development Checklist

### ✅ Pre-Test Planning
- [ ] **Create scenario table** before writing any test
- [ ] **Identify all test cases**: Happy path, errors, edge cases, boundaries
- [ ] **Document expected behavior** for each scenario
- [ ] **Plan test data** using factories or builders

### ✅ Test Scenario Planning Table
Before writing tests, fill out this table:

| Scenario | Description | Input | Expected Output | Validates |
|----------|-------------|-------|-----------------|-----------|
| Happy Path | Normal success case | Valid complete data | Success result | Core functionality |
| Missing Required | Required field absent | Input without required field | ValidationError | Validation rules |
| Invalid Format | Wrong data type/format | Invalid data | Type/Format error | Type validation |
| Duplicate Entry | Already exists | Existing identifier | Idempotent result | No duplicates |
| External Error | API/Network failure | Valid input + failed service | ServiceError | Error handling |
| Edge Case | Boundary condition | Empty/null/max values | Graceful handling | Robustness |

### ✅ Type-Safe Testing Checklist
- [ ] **No `any` in tests** - All mocks must use existing types
- [ ] **Type mock factories** properly using `MockedObject<T>`
- [ ] **Use existing interfaces** for mock definitions
- [ ] **Create reusable test data builders** with proper types
- [ ] **Mock only at boundaries** (repositories, external services)

### ✅ Test Structure Checklist
- [ ] **Use AAA pattern** - Arrange, Act, Assert clearly separated
- [ ] **Descriptive test names** that explain what and why
- [ ] **Nested describes** for logical grouping
- [ ] **Independent tests** - No shared state between tests
- [ ] **Fast unit tests** - Mock all I/O operations

### ✅ Test Implementation Checklist
- [ ] **Test behavior, not implementation**
- [ ] **Cover all error paths** explicitly
- [ ] **Test edge cases** (null, undefined, empty, max values)
- [ ] **Test async behavior** (timeouts, concurrency)
- [ ] **Use specific assertions** - Avoid toBeTruthy()
- [ ] **Document complex test scenarios** with comments

### ✅ Mock Best Practices Checklist
- [ ] **Create typed mock factories** for reuse
- [ ] **Reset mocks in beforeEach** for isolation
- [ ] **Mock GraphQL responses** with realistic data
- [ ] **Use vi.fn()** with proper types
- [ ] **Avoid mocking internal utilities**

### ✅ CLI Testing Checklist
- [ ] **Test actual CLI output** using CLITestRunner
- [ ] **Mock stdin** for interactive prompts
- [ ] **Verify exit codes** and error output
- [ ] **Test progress indicators** and formatting
- [ ] **Cover all command variations**

### ✅ Final Test Review Checklist
- [ ] All scenarios from planning table covered
- [ ] No `any` types anywhere in tests
- [ ] Tests can run in any order
- [ ] Clear test descriptions
- [ ] No magic numbers/strings
- [ ] Comprehensive error coverage
- [ ] Tests run fast (< 100ms for unit tests)
- [ ] Complex logic is documented
- [ ] All tests pass (`pnpm test`)
- [ ] Code builds without errors (`pnpm build`)
- [ ] No Biome linting/formatting issues (`pnpm check`)

**Always verify before committing tests:**
```bash
# 1. Run all tests
pnpm test       

# 2. Check code quality with Biome
pnpm check      # Check for linting/formatting issues
pnpm check:fix  # Auto-fix any issues

# 3. Verify TypeScript types
pnpm typecheck  

# 4. Ensure project builds
pnpm build      
```

**Note**: Biome will automatically check test files for:
- Proper formatting (indentation, semicolons, etc.)
- Unused imports in test files
- Suspicious patterns like `any` usage
- Consistent code style

## Summary

This testing guide ensures:

1. **Comprehensive Coverage**: All scenarios from happy path to edge cases
2. **Type Safety**: Leveraging TypeScript for reliable tests
3. **Maintainability**: Well-organized, DRY test code
4. **Real-World Testing**: CLI and integration tests that verify actual behavior
5. **Fast Feedback**: Efficient test execution and clear failure messages

Remember: **Tests are documentation**. They should clearly communicate what the system does and why.