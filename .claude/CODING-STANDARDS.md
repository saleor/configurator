# Saleor Configurator - Coding Standards

This document outlines the coding standards, best practices, and conventions for the Saleor Configurator project. Following these guidelines ensures **high-quality, clean, concise code** and proper use of industry-standard tools.

## 🚨 CORE RULE: Research First, Build Second

**NEVER create custom implementations without first researching existing solutions.**

Before writing ANY new functionality:
1. **Check our existing stack** - We already have tools for most needs
2. **Research npm ecosystem** - Use established, well-maintained libraries
3. **Verify TypeScript support** - First-class TS support required
4. **Check maintenance status** - Active development, recent updates
5. **Consider bundle size** - Use bundlephobia.com to compare options

### Examples - Use These, Don't Recreate:

| Need | ✅ Use This | ❌ Don't Create |
|------|-------------|-----------------|
| **HTTP Clients** | `@urql/core`, `fetch` | Custom HTTP wrappers |
| **Validation** | `zod` | Custom validators |
| **Logging** | `tslog` | Custom loggers |
| **CLI Framework** | `commander` | Manual argv parsing |
| **Date/Time** | Native `Date`, `date-fns` | Custom date utilities |
| **Error Classes** | Extend `Error` | Custom error systems |
| **Testing** | `vitest` ecosystem | Custom test runners |
| **Code Quality** | `@biomejs/biome` | Custom linters |
| **File Operations** | `fs/promises` | Custom file handlers |
| **Path Operations** | `node:path` | Custom path utils |
| **Environment Variables** | `process.env`, `dotenv` | Custom config loaders |
| **Process Management** | `node:child_process` | Custom process spawners |

## Table of Contents
- [Code Quality Philosophy](#code-quality-philosophy)
- [TypeScript Best Practices](#typescript-best-practices)
- [Clean Code Principles](#clean-code-principles)
- [Logger vs cliConsole Usage](#logger-vs-cliconsole-usage)
- [GraphQL as the Backbone](#graphql-as-the-backbone)
- [Code Quality Tools](#code-quality-tools)
- [Error Handling Standards](#error-handling-standards)
- [Performance Guidelines](#performance-guidelines)

## Code Quality Philosophy

### High-Quality Code Means:
- **Concise**: No unnecessary complexity or verbosity
- **Clean**: Easy to read, understand, and modify
- **Direct**: Solves the problem without over-engineering
- **Well-tooled**: Uses best-in-class libraries appropriately
- **Type-safe**: Leverages TypeScript's full potential
- **Tested**: Comprehensive test coverage

## TypeScript Best Practices

### 1. **Modern TypeScript (2025 Standards)**

#### ES Modules First
```typescript
// ✅ GOOD: Use ES modules (default in 2025)
import { ProductService } from './product-service';
export { ProductRepository };

// ❌ BAD: CommonJS (legacy)
const ProductService = require('./product-service');
module.exports = { ProductRepository };
```

#### Top-Level Await
```typescript
// ✅ GOOD: Simplified async initialization
const config = await loadConfig();
const client = createGraphQLClient(config);

// ❌ BAD: IIFE wrapper (no longer needed)
(async () => {
  const config = await loadConfig();
})();
```

### 2. **Strict Type Safety - Zero Tolerance for 'any'**

```typescript
// ❌ NEVER: Using 'any' removes all type safety
function processData(data: any): any {
  return data.value;
}

// ✅ GOOD: Use specific types
function processData<T extends { value: string }>(data: T): string {
  return data.value;
}

// ✅ GOOD: Use 'unknown' for truly dynamic data
function handleDynamicData(data: unknown): string {
  // Type narrowing with guards
  if (isValidData(data)) {
    return data.value;
  }
  throw new ValidationError('Invalid data structure');
}

// ✅ GOOD: Type guard for runtime safety
function isValidData(data: unknown): data is { value: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'value' in data &&
    typeof (data as any).value === 'string'
  );
}
```

### 3. **TypeScript Configuration**

Your `tsconfig.json` must include these strict settings:

```json
{
  "compilerOptions": {
    // Type Safety
    "strict": true,                       // Enable all strict type checks
    "noImplicitAny": true,               // Error on expressions with 'any'
    "strictNullChecks": true,            // Enable strict null checks
    "strictFunctionTypes": true,         // Strict checking of function types
    "strictBindCallApply": true,         // Strict 'bind', 'call', and 'apply'
    "strictPropertyInitialization": true, // Strict property initialization
    
    // Code Quality
    "noUnusedLocals": true,              // Report unused local variables
    "noUnusedParameters": true,          // Report unused parameters
    "noImplicitReturns": true,           // Ensure all paths return
    "noFallthroughCasesInSwitch": true, // Prevent switch case fallthrough
    "noUncheckedIndexedAccess": true,   // Add undefined to index signatures
    "exactOptionalPropertyTypes": true,  // Distinguish missing vs undefined
    
    // Module Resolution
    "module": "ESNext",                  // Use ES modules
    "moduleResolution": "bundler",       // Modern resolution
    "esModuleInterop": true,            // CommonJS interop
    "allowSyntheticDefaultImports": true,
    
    // Output
    "target": "ES2022",                  // Modern JavaScript features
    "lib": ["ES2022"],                   // Available libraries
    "skipLibCheck": true,                // Skip .d.ts file checking
    "forceConsistentCasingInFileNames": true
  }
}
```

### 4. **Advanced Type Patterns**

#### Branded Types for Domain Modeling
```typescript
// Create distinct types for IDs to prevent mixing
type ProductId = string & { readonly brand: unique symbol };
type ChannelId = string & { readonly brand: unique symbol };

// Helper functions to create branded types
export const ProductId = (id: string): ProductId => id as ProductId;
export const ChannelId = (id: string): ChannelId => id as ChannelId;

// Now TypeScript prevents mixing IDs
function assignProductToChannel(productId: ProductId, channelId: ChannelId) {
  // Type safe!
}

// This would cause a compile error:
// assignProductToChannel(channelId, productId); // Error!
```

#### Utility Types Library
```typescript
// Deep partial for nested updates
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

// Make specific properties required
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Async return type extractor
export type AsyncReturnType<T extends (...args: any) => Promise<any>> = 
  T extends (...args: any) => Promise<infer R> ? R : never;

// Nullable helper
export type Nullable<T> = T | null | undefined;

// Result type for error handling
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };
```

## Clean Code Principles

### 1. **Function Design - Small, Focused, and Meaningful**

```typescript
// ❌ BAD: Large function doing multiple things
async function handleProduct(data: any, options: any) {
  // Validate data
  if (!data.name || !data.slug) {
    throw new Error('Invalid');
  }
  
  // Transform data
  const transformed = {
    ...data,
    slug: data.slug.toLowerCase(),
    createdAt: new Date()
  };
  
  // Check if exists
  const existing = await db.findOne({ slug: transformed.slug });
  if (existing) {
    // Update logic...
  } else {
    // Create logic...
  }
  
  // Send notification
  await emailService.send(...);
  
  return result;
}

// ✅ GOOD: Small, focused functions with single responsibility
export async function validateProductInput(input: unknown): Promise<ProductInput> {
  const result = productSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid product data', result.error);
  }
  return result.data;
}

export function normalizeProductSlug(slug: string): string {
  return slug.toLowerCase().trim().replace(/\s+/g, '-');
}

export async function findProductBySlug(
  repository: ProductRepository, 
  slug: string
): Promise<Product | null> {
  return repository.findBySlug(slug);
}

export async function createOrUpdateProduct(
  repository: ProductRepository,
  input: ProductInput
): Promise<Product> {
  const existing = await findProductBySlug(repository, input.slug);
  
  if (existing) {
    return repository.update(existing.id, input);
  }
  
  return repository.create(input);
}
```

### 2. **Naming Conventions**

```typescript
// ✅ GOOD: Descriptive and consistent naming

// Classes: PascalCase, noun
export class ProductService { }
export class GraphQLClient { }

// Interfaces/Types: PascalCase, descriptive
export interface ProductCreateInput { }
export type ChannelUpdateResult = Result<Channel>;

// Functions: camelCase, verb + noun
export function createProduct() { }
export function validateChannelInput() { }
export async function fetchAttributesAsync() { }

// Constants: UPPER_SNAKE_CASE
export const MAX_RETRY_ATTEMPTS = 3;
export const DEFAULT_TIMEOUT_MS = 5000;

// Private members: underscore prefix
class Service {
  private _internalState: State;
  private _processInternal(): void { }
}

// Boolean functions: is/has/should prefix
export function isValidSlug(slug: string): boolean { }
export function hasPermission(user: User, action: string): boolean { }
export function shouldRetry(error: Error): boolean { }

// Event handlers: on prefix
function onProductCreated(event: ProductEvent): void { }
function onChannelDeleted(event: ChannelEvent): void { }
```

### 3. **Code Organization**

```typescript
// ✅ GOOD: Logical grouping and ordering

// 1. Imports (external → internal)
import { z } from 'zod';
import type { GraphQLClient } from '@urql/core';
import { createLogger } from '../lib/logger';
import type { Product, ProductInput } from './types';

// 2. Constants
const MAX_NAME_LENGTH = 255;
const SLUG_PATTERN = /^[a-z0-9-]+$/;

// 3. Types/Interfaces
interface ServiceOptions {
  retryAttempts?: number;
  timeout?: number;
}

// 4. Main class/function
export class ProductService {
  // 4a. Private fields
  private readonly logger = createLogger('ProductService');
  
  // 4b. Constructor
  constructor(
    private readonly repository: ProductRepository,
    private readonly options: ServiceOptions = {}
  ) {}
  
  // 4c. Public methods
  async create(input: ProductInput): Promise<Result<Product>> {
    // Implementation
  }
  
  // 4d. Private methods
  private validateInput(input: unknown): ProductInput {
    // Implementation
  }
}

// 5. Helper functions
function normalizeSlug(slug: string): string {
  return slug.toLowerCase().trim();
}

// 6. Exports
export { ProductService };
export type { ServiceOptions };
```

### 4. **SOLID Principles Applied**

#### Single Responsibility Principle
```typescript
// Each class has one reason to change

// ✅ GOOD: Separated concerns
export class ProductValidator {
  validate(input: unknown): ProductInput { }
}

export class ProductRepository {
  create(input: ProductInput): Promise<Product> { }
}

export class ProductNotifier {
  notifyCreation(product: Product): Promise<void> { }
}

// ❌ BAD: Multiple responsibilities
export class ProductManager {
  validate() { }
  save() { }
  sendEmail() { }
  generateReport() { }
}
```

#### Dependency Inversion Principle
```typescript
// ✅ GOOD: Depend on abstractions, not concretions

interface Logger {
  debug(message: string, context?: any): void;
  error(message: string, error?: any): void;
}

interface Repository<T> {
  create(input: Partial<T>): Promise<T>;
  findById(id: string): Promise<T | null>;
}

export class ProductService {
  constructor(
    private readonly repository: Repository<Product>,
    private readonly logger: Logger
  ) {}
  
  // Service doesn't know about specific implementations
}
```

## Logger vs cliConsole Usage

### When to Use Logger

The **logger** (tslog) is for internal debugging and diagnostic information:

```typescript
import { createLogger } from '../lib/logger';

const logger = createLogger('ModuleName');

// ✅ Use logger for:

// 1. Debug traces - understanding flow
logger.debug('Starting product creation', { 
  productName: input.name,
  timestamp: Date.now() 
});

// 2. Internal state tracking
logger.debug('Found existing product', {
  id: product.id,
  version: product.version,
  lastModified: product.updatedAt
});

// 3. Performance monitoring
const startTime = Date.now();
const result = await heavyOperation();
logger.debug('Operation completed', {
  duration: Date.now() - startTime,
  resultSize: result.length
});

// 4. Error details for debugging
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', {
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    } : error,
    context: { userId, operationType }
  });
  throw error; // Re-throw for proper handling
}

// 5. System events
logger.info('Service initialized', {
  version: process.env.npm_package_version,
  environment: process.env.NODE_ENV
});
```

### When to Use cliConsole

The **cliConsole** is for user-facing output in the CLI:

```typescript
import { cliConsole } from '../cli/console';

// ✅ Use cliConsole for:

// 1. Command feedback
cliConsole.header('🚀 Starting deployment');
cliConsole.info('Configuration file: config.yml');

// 2. Progress indicators
cliConsole.progress.start('Creating products');
for (const product of products) {
  await createProduct(product);
  cliConsole.progress.update(`Created ${product.name}`);
}
cliConsole.progress.succeed('All products created');

// 3. Success messages
cliConsole.success('✅ Deployment completed successfully');
cliConsole.success(`Created ${stats.created} items`);
cliConsole.success(`Updated ${stats.updated} items`);

// 4. User-friendly errors
try {
  await deployConfiguration();
} catch (error) {
  if (error instanceof ValidationError) {
    cliConsole.error('❌ Configuration Invalid');
    cliConsole.error('');
    error.details.forEach(detail => {
      cliConsole.error(`  • ${detail}`);
    });
    cliConsole.hint('💡 Run "saleor-config validate" to check your configuration');
  } else {
    cliConsole.error(`❌ Deployment failed: ${error.message}`);
    cliConsole.hint('💡 Run with --debug for more information');
  }
}

// 5. Interactive prompts
const proceed = await cliConsole.confirm('Continue with deployment?');
const environment = await cliConsole.select('Select environment:', ['dev', 'staging', 'prod']);
```

### Error Flow Pattern

```typescript
// Repository Layer: Log and throw
class ProductRepository {
  async create(input: ProductCreateInput): Promise<Product> {
    try {
      const result = await this.client.request(CREATE_PRODUCT, { input });
      return result.product;
    } catch (error) {
      logger.error('GraphQL mutation failed', {
        mutation: 'CREATE_PRODUCT',
        input,
        error
      });
      throw new GraphQLError('Failed to create product', { cause: error });
    }
  }
}

// Service Layer: Log context and return Result
class ProductService {
  async create(input: ProductInput): Promise<Result<Product>> {
    logger.debug('Creating product', { name: input.name });
    
    try {
      const product = await this.repository.create(input);
      logger.info('Product created successfully', { id: product.id });
      return { success: true, data: product };
    } catch (error) {
      logger.error('Product creation failed', {
        input,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { success: false, error };
    }
  }
}

// CLI Layer: Display user-friendly message
async function handleCommand() {
  const result = await productService.create(input);
  
  if (result.success) {
    cliConsole.success(`✅ Product "${result.data.name}" created`);
  } else {
    cliConsole.error('❌ Failed to create product');
    
    if (result.error instanceof ValidationError) {
      cliConsole.error('Invalid input:');
      result.error.issues.forEach(issue => {
        cliConsole.error(`  • ${issue.path}: ${issue.message}`);
      });
    } else {
      cliConsole.error(result.error.message);
    }
    
    // Logger has full details for debugging
    logger.error('Command failed', { command: 'create', error: result.error });
  }
}
```

## GraphQL as the Backbone

### 1. **Type-Safe GraphQL with gql.tada**

```typescript
import { graphql } from '../lib/graphql';

// ✅ GOOD: Type-safe queries with auto-completion
const GET_PRODUCT = graphql(`
  query GetProduct($slug: String!) {
    product(slug: $slug) {
      id
      name
      description
      attributes {
        attribute {
          slug
          name
        }
        values {
          name
          slug
        }
      }
    }
  }
`);

// TypeScript knows the exact shape of the response
const result = await client.request(GET_PRODUCT, { slug: 'my-product' });
// result.product.attributes[0].attribute.slug // Full type safety!
```

### 2. **Repository Pattern for GraphQL**

```typescript
// ✅ GOOD: All GraphQL operations in repository layer
export class ProductRepository {
  constructor(private readonly client: GraphQLClient) {}

  async create(input: ProductCreateInput): Promise<Product> {
    const result = await this.client.request(
      graphql(`
        mutation CreateProduct($input: ProductCreateInput!) {
          productCreate(input: $input) {
            product {
              id
              name
              slug
            }
            errors {
              field
              code
              message
            }
          }
        }
      `),
      { input }
    );

    if (result.productCreate.errors.length > 0) {
      throw new GraphQLMutationError(
        'Product creation failed',
        result.productCreate.errors
      );
    }

    return result.productCreate.product;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const result = await this.client.request(
      GET_PRODUCT,
      { slug, channel: 'default-channel' }
    );

    return result.product;
  }

  async bulkCreate(inputs: ProductCreateInput[]): Promise<Product[]> {
    // Batch operations for performance
    const operations = inputs.map(input => ({
      query: CREATE_PRODUCT_MUTATION,
      variables: { input }
    }));

    const results = await this.client.batchRequest(operations);
    return results.map(r => r.productCreate.product);
  }
}
```

### 3. **Error Handling for GraphQL**

```typescript
// Custom error class for GraphQL errors
export class GraphQLMutationError extends Error {
  constructor(
    message: string,
    public readonly errors: ReadonlyArray<{
      field: string | null;
      code: string;
      message: string | null;
    }>
  ) {
    super(message);
    this.name = 'GraphQLMutationError';
  }

  getFieldErrors(): Record<string, string[]> {
    const fieldErrors: Record<string, string[]> = {};
    
    for (const error of this.errors) {
      if (error.field) {
        if (!fieldErrors[error.field]) {
          fieldErrors[error.field] = [];
        }
        fieldErrors[error.field].push(error.message || error.code);
      }
    }
    
    return fieldErrors;
  }
}

// Repository error handling
async function executeGraphQLMutation<T>(
  client: GraphQLClient,
  mutation: TypedDocumentNode<T>,
  variables: any
): Promise<T> {
  try {
    return await client.request(mutation, variables);
  } catch (error) {
    // Network errors
    if (error instanceof NetworkError) {
      throw new ServiceUnavailableError(
        'Unable to connect to Saleor API',
        { cause: error }
      );
    }
    
    // GraphQL errors
    if (error instanceof GraphQLError) {
      logger.error('GraphQL error', {
        errors: error.response?.errors,
        query: error.request.query,
        variables: error.request.variables
      });
      
      throw new ApiError('GraphQL operation failed', { cause: error });
    }
    
    throw error;
  }
}
```

### 4. **GraphQL Best Practices**

```typescript
// 1. Use fragments for reusable selections
const PRODUCT_FRAGMENT = graphql(`
  fragment ProductFields on Product {
    id
    name
    slug
    created
    updated
  }
`);

// 2. Paginate large queries
const GET_ALL_PRODUCTS = graphql(`
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          ...ProductFields
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`, [PRODUCT_FRAGMENT]);

// 3. Use field aliases for multiple queries
const GET_MULTI_CHANNEL_PRODUCT = graphql(`
  query GetMultiChannelProduct($slug: String!) {
    defaultChannel: product(slug: $slug, channel: "default-channel") {
      ...ProductFields
      pricing { ... }
    }
    usChannel: product(slug: $slug, channel: "channel-us") {
      ...ProductFields
      pricing { ... }
    }
  }
`);

// 4. Implement retry logic for resilience
async function requestWithRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts || !isRetriableError(error)) {
        throw error;
      }
      
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await sleep(delay);
    }
  }
  
  throw new Error('Unreachable');
}
```

## Code Quality Tools

### 1. **Biome Configuration**

Biome is our all-in-one tool for linting and formatting (replacing ESLint + Prettier):

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExcessiveCognitiveComplexity": "error",
        "noForEach": "off",  // forEach is fine
        "useSimplifiedLogicExpression": "error"
      },
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error",
        "useExhaustiveDependencies": "error"
      },
      "style": {
        "noNonNullAssertion": "error",
        "noParameterAssign": "error",
        "useConst": "error",
        "useTemplate": "error"
      },
      "suspicious": {
        "noExplicitAny": "error",
        "noImplicitAnyLet": "error",
        "useAwait": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "jsxQuoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "all",
      "arrowParentheses": "always"
    }
  }
}
```

### 2. **Pre-commit Hooks**

Using Husky and lint-staged for automatic quality checks:

```json
// package.json
{
  "scripts": {
    "prepare": "husky || true",
    "lint": "biome check --write",
    "typecheck": "tsc --noEmit"
  },
  "lint-staged": {
    "**/*.{ts,tsx,js,jsx,json}": [
      "pnpm lint --no-errors-on-unmatched"
    ]
  }
}
```

```bash
# .husky/pre-commit
# Run lint-staged
pnpm lint-staged

# Run type checking
pnpm typecheck
```

### 3. **VSCode Integration**

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome",
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "biome.enabled": true,
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### 4. **Continuous Integration Checks**

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

## Error Handling Standards

### 1. **Error Class Hierarchy**

```typescript
// Base error class with context
export abstract class BaseError extends Error {
  abstract readonly code: string;
  readonly timestamp = new Date();
  
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

// Specific error types
export class ValidationError extends BaseError {
  readonly code = 'VALIDATION_ERROR';
  
  constructor(
    message: string,
    public readonly errors: Array<{ path: string; message: string }>,
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }
}

export class NotFoundError extends BaseError {
  readonly code = 'NOT_FOUND';
}

export class ConflictError extends BaseError {
  readonly code = 'CONFLICT';
}

export class ServiceUnavailableError extends BaseError {
  readonly code = 'SERVICE_UNAVAILABLE';
}
```

### 2. **Result Type Pattern**

```typescript
// Result type for expected failures
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Helper functions
export const ok = <T>(data: T): Result<T> => ({
  success: true,
  data
});

export const err = <E>(error: E): Result<never, E> => ({
  success: false,
  error
});

// Usage in services
export class ProductService {
  async create(input: ProductInput): Promise<Result<Product, ValidationError | ApiError>> {
    // Validation
    const validation = this.validate(input);
    if (!validation.success) {
      return err(validation.error);
    }

    try {
      const product = await this.repository.create(validation.data);
      return ok(product);
    } catch (error) {
      logger.error('Failed to create product', { error, input });
      
      if (error instanceof GraphQLMutationError) {
        return err(new ApiError('Product creation failed', { cause: error }));
      }
      
      throw error; // Unexpected errors bubble up
    }
  }
}

// Usage in CLI
const result = await productService.create(input);

if (result.success) {
  cliConsole.success(`Created product: ${result.data.name}`);
} else {
  handleError(result.error);
}
```

## Performance Guidelines

### 1. **Batch Operations**

```typescript
// ✅ GOOD: Batch similar operations
export class BulkProcessor<T, R> {
  constructor(
    private readonly batchSize: number,
    private readonly processor: (items: T[]) => Promise<R[]>
  ) {}

  async processAll(items: T[]): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      const batchResults = await this.processor(batch);
      results.push(...batchResults);
    }
    
    return results;
  }
}

// Usage
const processor = new BulkProcessor(50, async (products) => {
  return productRepository.bulkCreate(products);
});
```

### 2. **Concurrent Processing**

```typescript
// ✅ GOOD: Process independent operations concurrently
import pLimit from 'p-limit';

const limit = pLimit(5); // Max 5 concurrent operations

export async function processProductsConcurrently(
  products: Product[],
  operation: (product: Product) => Promise<void>
): Promise<void> {
  const operations = products.map(product => 
    limit(() => operation(product))
  );
  
  await Promise.all(operations);
}

// ✅ GOOD: Use Promise.allSettled for resilience
export async function processWithErrors<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>
): Promise<{ successes: R[]; failures: Array<{ item: T; error: unknown }> }> {
  const results = await Promise.allSettled(
    items.map(item => processor(item))
  );

  const successes: R[] = [];
  const failures: Array<{ item: T; error: unknown }> = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successes.push(result.value);
    } else {
      failures.push({ item: items[index], error: result.reason });
    }
  });

  return { successes, failures };
}
```

### 3. **Caching Strategies**

```typescript
// Simple in-memory cache with TTL
export class Cache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();

  set(key: string, value: T, ttlSeconds: number): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiry });
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) return undefined;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Usage in repository
export class CachedProductRepository extends ProductRepository {
  private cache = new Cache<Product>();

  async findBySlug(slug: string): Promise<Product | null> {
    const cached = this.cache.get(slug);
    if (cached) return cached;

    const product = await super.findBySlug(slug);
    
    if (product) {
      this.cache.set(slug, product, 300); // 5 minute TTL
    }
    
    return product;
  }
}
```

## TypeScript Development Checklist

### ✅ Before Writing Code
- [ ] **RESEARCH FIRST** - Check if solution already exists in our stack or npm
- [ ] **Use existing tools** - Never recreate what we already have
- [ ] **Verify tool quality** - Check maintenance status, TypeScript support, bundle size
- [ ] Understand the existing pattern (Repository → Service → Configurator)
- [ ] Review similar modules for consistency
- [ ] Plan types first (Zod schemas, GraphQL types, interfaces)
- [ ] **Keep it concise** - Simple, direct solutions only

### ✅ Type Safety Checklist
- [ ] **No `any` types** - Use specific types, generics, or `unknown` with type guards
- [ ] **Explicit return types** on all functions
- [ ] **Handle nullable values** with optional chaining and nullish coalescing
- [ ] **Use type guards** for runtime type checking
- [ ] **Leverage utility types** (Result, DeepPartial, RequireFields)

### ✅ Function Design Checklist
- [ ] **Single responsibility** - One function, one purpose
- [ ] **Small functions** - Under 20 lines ideally
- [ ] **Descriptive names** - `createProduct`, not `create` or `proc`
- [ ] **Parameter objects** for 3+ parameters
- [ ] **Result pattern** for operations that can fail

### ✅ Error Handling Checklist
- [ ] **Custom error classes** with error codes and context
- [ ] **Rich error information** for debugging
- [ ] **User-friendly messages** in cliConsole
- [ ] **Detailed logging** with logger
- [ ] **Handle all error paths** (network, validation, business logic)

### ✅ GraphQL Integration Checklist
- [ ] **Extract types** using `ResultOf` and `VariablesOf`
- [ ] **Handle nullable responses** with NonNullable
- [ ] **Check mutation errors** array before using data
- [ ] **Wrap GraphQL errors** with context
- [ ] **Provide retry information** for transient failures

### ✅ Code Organization Checklist
- [ ] **Follow module structure** (repository, service, errors, types)
- [ ] **Order imports** (built-ins → external → internal → relative)
- [ ] **Export only public API** through index.ts
- [ ] **Document complex logic** with JSDoc
- [ ] **Keep related code together**

### ✅ Final Review Checklist
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] Passes Biome linting and formatting (`pnpm check`)
- [ ] Fix any Biome issues (`pnpm check:fix`)
- [ ] Builds successfully (`pnpm build`)
- [ ] No unused imports or variables (Biome will catch these)
- [ ] Follows existing patterns
- [ ] Complex types are documented
- [ ] Error handling is comprehensive

**Always run before committing:**
```bash
# 1. Run Biome for linting and formatting (auto-fixes issues)
pnpm lint

# 2. Verify TypeScript compilation
pnpm typecheck  

# 3. Ensure project builds
pnpm build      

# 4. Run all tests
pnpm test       
```

**Biome catches:**
- Formatting issues (replaces Prettier)
- Linting issues (replaces ESLint)
- Unused imports and variables
- Code complexity issues
- Suspicious patterns (like `any` usage)

## Summary

Following these coding standards ensures:

1. **Type Safety**: No runtime type errors through strict TypeScript usage
2. **Maintainability**: Clean, organized, and predictable code structure
3. **Debuggability**: Clear separation between user output and debug logs
4. **Performance**: Efficient batch and concurrent operations
5. **Quality**: Automated tools catch issues before they reach production

Remember: **Code is written once but read many times**. Optimize for readability and maintainability.