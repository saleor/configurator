# Architecture Guide

Comprehensive architecture guide covering service patterns, design decisions, and system design principles for the Saleor Configurator project. This guide provides deep technical insights into the codebase structure and architectural choices.

## System Architecture Overview

### High-Level Architecture

The Saleor Configurator follows a **layered service-oriented architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────┐
│                 CLI Layer                   │  
│  (Commander.js, User Interaction, Prompts) │
├─────────────────────────────────────────────┤
│               Command Layer                 │
│    (Deploy, Introspect, Diff, Start)      │
├─────────────────────────────────────────────┤
│               Core Layer                    │
│  (Orchestration, Pipeline, Validation)    │
├─────────────────────────────────────────────┤
│               Service Layer                 │
│   (Entity Services, Business Logic)       │
├─────────────────────────────────────────────┤
│             Repository Layer                │
│    (GraphQL Operations, Data Access)      │
├─────────────────────────────────────────────┤
│              Infrastructure                 │
│  (GraphQL Client, Logging, Utilities)     │
└─────────────────────────────────────────────┘
```

### Directory Structure and Responsibility

```
src/
├── cli/               # CLI framework and user interaction
│   ├── prompts/       # Interactive prompts and confirmations
│   ├── output/        # Output formatting and display
│   └── validation/    # CLI argument validation
├── commands/          # Individual CLI command implementations
│   ├── deploy.ts      # Deployment command
│   ├── introspect.ts  # Introspection command
│   ├── diff.ts        # Diff comparison command
│   └── start.ts       # Interactive wizard
├── core/              # Core business logic and orchestration
│   ├── deployment/    # Deployment pipeline
│   ├── diff/          # Configuration comparison
│   ├── introspection/ # Remote data introspection
│   └── validation/    # Business rule validation
├── modules/           # Domain-specific modules
│   ├── category/      # Category entity management
│   ├── product/       # Product entity management
│   ├── collection/    # Collection entity management
│   └── [entity]/      # Entity-specific services and repositories
├── lib/               # Shared utilities and infrastructure
│   ├── graphql/       # GraphQL client and operations
│   ├── container/     # Dependency injection
│   ├── error/         # Error handling system
│   └── utils/         # Utility functions
└── types/             # TypeScript type definitions
```

## Service Layer Architecture

### Service Pattern Implementation

**Service Structure**: Each entity type has a dedicated service class following a standard pattern:

```typescript
interface EntityService<TInput, TEntity> {
  // Bootstrap operations (deployment)
  bootstrapEntities(entities: TInput[]): Promise<void>;
  
  // Validation operations
  validateEntityInput(entity: TInput): Promise<void>;
  
  // Business logic operations  
  processEntityCreation(entity: TInput): Promise<TEntity>;
  processEntityUpdate(existing: TEntity, input: TInput): Promise<TEntity>;
  
  // Utility operations
  transformRemoteEntity(remote: RemoteEntity): TEntity;
  generateEntitySlug(name: string): string;
}
```

**Example Service Implementation**:
```typescript
export class CategoryService implements EntityService<CategoryInput, Category> {
  constructor(
    private repository: CategoryRepository,
    private logger: Logger,
    private validator: CategoryValidator
  ) {}
  
  async bootstrapCategories(categories: CategoryInput[]): Promise<void> {
    // 1. Validation phase
    await this.validateCategories(categories);
    
    // 2. Processing phase  
    for (const categoryInput of categories) {
      const existing = await this.repository.getBySlug(categoryInput.slug);
      
      if (existing) {
        await this.updateCategory(existing, categoryInput);
      } else {
        await this.createCategory(categoryInput);
      }
    }
  }
  
  private async validateCategories(categories: CategoryInput[]): Promise<void> {
    // Validate unique identifiers
    this.validateUniqueIdentifiers(categories);
    
    // Validate business rules
    await Promise.all(
      categories.map(category => this.validator.validate(category))
    );
  }
}
```

### Service Composition Pattern

**Composition Root**: Uses a factory-based composition pattern via `ServiceComposer`:

```typescript
// ServiceContainer interface defines all available services
export interface ServiceContainer {
  readonly attribute: AttributeService;
  readonly channel: ChannelService;
  readonly category: CategoryService;
  readonly product: ProductService;
  readonly collection: CollectionService;
  // ... all 14 domain services
  readonly diffService: DiffService;
}

// ServiceComposer creates all services with their dependencies
export class ServiceComposer {
  static compose(client: Client, configPath?: string): ServiceContainer {
    // Create all repositories (data access layer)
    const repositories = {
      attribute: new AttributeRepository(client),
      channel: new ChannelRepository(client),
      category: new CategoryRepository(client),
      // ... all repositories
    } as const;

    // Create services with explicit dependencies
    const channelService = new ChannelService(repositories.channel);
    const categoryService = new CategoryService(repositories.category);
    const productService = new ProductService(repositories.product, {
      getChannelIdBySlug: (slug) => channelService.getChannelIdBySlugCached(slug),
    });

    // Return composed container
    return {
      channel: channelService,
      category: categoryService,
      product: productService,
      // ... all services
    };
  }
}
```

**Design Rationale**:

- **Explicit Dependencies**: Each service declares its dependencies through constructor parameters
- **Typed Interface**: `ServiceContainer` provides compile-time guarantees for service availability
- **Eager Instantiation**: All services are created upfront, enabling cross-service caching
- **No String Keys**: Direct property access instead of string-based resolution

**Usage in Commands**:

```typescript
// In command handlers
const services = ServiceComposer.compose(graphqlClient, configPath);
await services.category.bootstrapCategories(config.categories);
await services.product.bootstrapProducts(config.products);
```

**Cross-Service Dependencies**:

Some services require callbacks to other services for features like caching:

```typescript
const productService = new ProductService(repositories.product, {
  // ProductService can resolve channels via ChannelService's cache
  getChannelIdBySlug: async (slug: string) => {
    return await channelService.getChannelIdBySlugCached(slug);
  },
});
```

### Service Error Wrapper Pattern

**Error Handling**: Consistent error handling across all services:

```typescript
export class ServiceErrorWrapper<T> {
  constructor(
    private service: T,
    private entityName: string,
    private logger: Logger
  ) {}
  
  async wrapOperation<R>(
    operation: keyof T,
    operationName: string,
    ...args: any[]
  ): Promise<R> {
    try {
      this.logger.debug(`Starting ${operationName} for ${this.entityName}`);
      
      const result = await (this.service[operation] as Function)(...args);
      
      this.logger.debug(`Completed ${operationName} for ${this.entityName}`);
      return result;
      
    } catch (error) {
      this.logger.error(
        `Failed ${operationName} for ${this.entityName}:`, 
        error
      );
      
      throw this.transformError(error, operationName);
    }
  }
  
  private transformError(error: unknown, operation: string): BaseError {
    if (error instanceof GraphQLError) {
      return new EntityOperationError(
        `${this.entityName} ${operation} failed: ${error.message}`,
        this.entityName
      );
    }
    
    if (error instanceof ZodError) {
      return new EntityValidationError(
        `${this.entityName} validation failed`,
        this.entityName
      );
    }
    
    return new UnknownError(`Unknown error in ${this.entityName} ${operation}`);
  }
}
```

## Repository Layer Architecture

### Repository Pattern Implementation

**Repository Interface**: Standard interface for data access operations:

```typescript
interface EntityRepository<TEntity, TInput> {
  // Read operations
  getAll(): Promise<TEntity[]>;
  getById(id: string): Promise<TEntity | null>;
  getByIdentifier(identifier: string): Promise<TEntity | null>;
  
  // Write operations
  create(input: TInput): Promise<TEntity>;
  update(id: string, input: Partial<TInput>): Promise<TEntity>;
  delete(id: string): Promise<void>;
  
  // Batch operations
  createMany(inputs: TInput[]): Promise<TEntity[]>;
  updateMany(updates: Array<{id: string; input: Partial<TInput>}>): Promise<TEntity[]>;
}
```

**GraphQL Repository Implementation**:
```typescript
export class CategoryRepository implements EntityRepository<Category, CategoryInput> {
  constructor(
    private client: Client,
    private logger: Logger
  ) {}
  
  async getAll(): Promise<Category[]> {
    const query = graphql(`
      query GetCategories {
        categories(first: 100) {
          edges {
            node {
              id
              name
              slug
              description
              parent {
                id
                slug
              }
            }
          }
        }
      }
    `);
    
    try {
      const result = await this.client.query(query, {});
      
      if (result.error) {
        throw GraphQLError.fromCombinedError(result.error);
      }
      
      return result.data?.categories.edges.map(edge => 
        this.transformRemoteCategory(edge.node)
      ) || [];
      
    } catch (error) {
      this.logger.error('Failed to fetch categories', error);
      throw new CategoryRepositoryError('Failed to fetch categories', error);
    }
  }
  
  async create(input: CategoryInput): Promise<Category> {
    const mutation = graphql(`
      mutation CreateCategory($input: CategoryInput!) {
        categoryCreate(input: $input) {
          category {
            id
            name
            slug
            description
          }
          errors {
            field
            message
            code
          }
        }
      }
    `);
    
    const result = await this.client.mutation(mutation, { input });
    
    if (result.error) {
      throw GraphQLError.fromCombinedError(result.error);
    }
    
    if (result.data?.categoryCreate.errors.length > 0) {
      throw new CategoryValidationError(
        result.data.categoryCreate.errors[0].message
      );
    }
    
    return this.transformRemoteCategory(result.data!.categoryCreate.category);
  }
  
  private transformRemoteCategory(remote: RemoteCategoryNode): Category {
    return {
      id: remote.id,
      name: remote.name,
      slug: remote.slug,
      description: remote.description || '',
      parent: remote.parent?.slug || null
    };
  }
}
```

### GraphQL Client Architecture

**Client Configuration**: URQL client with authentication and error handling:

```typescript
export function createGraphQLClient(url: string, token: string): Client {
  return createClient({
    url,
    requestPolicy: 'network-only', // Disable caching for config management
    exchanges: [
      // Authentication exchange
      authExchange(async (utils) => {
        return {
          addAuthToOperation: (operation) => {
            return utils.appendHeaders(operation, {
              Authorization: `Bearer ${token}`,
            });
          },
          didAuthError: (error) => {
            return error.graphQLErrors.some(e => 
              e.extensions?.code === 'UNAUTHENTICATED'
            );
          },
          refreshAuth: async () => {
            // Token refresh logic if needed
          },
        };
      }),
      
      // Fetch exchange for HTTP requests
      fetchExchange,
    ],
  });
}
```

**Type Generation**: gql.tada integration for end-to-end type safety:

```typescript
// GraphQL operations are fully typed
const GET_CATEGORIES = graphql(`
  query GetCategories($first: Int!) {
    categories(first: $first) {
      edges {
        node {
          id
          name
          slug
        }
      }
    }
  }
`);

// TypeScript infers the exact return type
type CategoriesResult = ResultOf<typeof GET_CATEGORIES>;
type CategoryNode = CategoriesResult['categories']['edges'][0]['node'];
```

## Error Handling Architecture

### Error Hierarchy

**Base Error System**: Comprehensive error hierarchy for different failure types:

```typescript
export abstract class BaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  // Serialization for logging
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      stack: this.stack,
      cause: this.cause?.message
    };
  }
}
```

**Domain-Specific Errors**:
```typescript
// GraphQL related errors
export class GraphQLError extends BaseError {
  constructor(message: string, public graphqlErrors: any[]) {
    super(message, 'GRAPHQL_ERROR');
  }
  
  static fromCombinedError(error: CombinedError): GraphQLError {
    const isAuthError = error.graphQLErrors.some(e => 
      e.extensions?.code === 'UNAUTHENTICATED'
    );
    
    if (isAuthError) {
      return new GraphQLAuthenticationError('Authentication failed');
    }
    
    const isPermissionError = error.graphQLErrors.some(e =>
      e.extensions?.code === 'PERMISSION_DENIED'
    );
    
    if (isPermissionError) {
      return new GraphQLPermissionError('Insufficient permissions');
    }
    
    return new GraphQLError(
      error.message,
      error.graphQLErrors
    );
  }
}

// Validation related errors
export class ValidationError extends BaseError {
  constructor(
    message: string, 
    public field?: string,
    public validationIssues?: ZodIssue[]
  ) {
    super(message, 'VALIDATION_ERROR');
  }
  
  static fromZodError(error: ZodError): ValidationError {
    const issues = error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code
    }));
    
    return new ValidationError(
      'Configuration validation failed',
      undefined,
      issues
    );
  }
}

// Entity specific errors
export class EntityError extends BaseError {
  constructor(
    message: string,
    public entityType: string,
    code: string = 'ENTITY_ERROR'
  ) {
    super(message, code);
  }
}
```

### Error Recovery Patterns

**Graceful Error Handling**: Structured approach to error recovery:

```typescript
export class ErrorRecoveryService {
  async handleError(error: BaseError, context: ErrorContext): Promise<RecoveryAction> {
    if (error instanceof GraphQLAuthenticationError) {
      return {
        type: 'retry_with_new_token',
        message: 'Please verify your authentication token',
        recoverable: false
      };
    }
    
    if (error instanceof ValidationError) {
      return {
        type: 'fix_configuration',
        message: 'Please fix the configuration errors',
        suggestions: this.generateValidationSuggestions(error),
        recoverable: true
      };
    }
    
    if (error instanceof EntityError) {
      return {
        type: 'retry_operation',
        message: 'Entity operation failed, retrying...',
        recoverable: true,
        retryable: true
      };
    }
    
    return {
      type: 'manual_intervention',
      message: 'Manual intervention required',
      recoverable: false
    };
  }
}
```

## CLI Framework Architecture

### Command Pattern Implementation

**Command Interface**: Standardized command structure:

```typescript
interface CommandConfig<T extends z.ZodObject<Record<string, z.ZodTypeAny>>> {
  name: string;
  description: string;
  schema: T; // Zod schema for validation
  handler: (args: z.infer<T>) => Promise<void>;
  examples?: string[];
  requiresInteractive?: boolean;
}
```

**Command Registration**: Dynamic command registration with Commander.js:

```typescript
export function registerCommands(program: Command, container: ServiceContainer): void {
  const commands = [
    createDeployCommand(container),
    createIntrospectCommand(container), 
    createDiffCommand(container),
    createStartCommand(container)
  ];
  
  for (const commandConfig of commands) {
    const command = program
      .command(commandConfig.name)
      .description(commandConfig.description);
    
    // Add options from Zod schema
    addOptionsFromSchema(command, commandConfig.schema);
    
    // Add examples to help
    if (commandConfig.examples) {
      command.addHelpText('after', `
Examples:
${commandConfig.examples.map(ex => `  ${ex}`).join('\n')}
      `);
    }
    
    // Set action handler with validation
    command.action(async (options) => {
      try {
        // Validate arguments with Zod
        const validatedArgs = commandConfig.schema.parse(options);
        
        // Execute command
        await commandConfig.handler(validatedArgs);
        
      } catch (error) {
        if (error instanceof ZodError) {
          throw ValidationError.fromZodError(error);
        }
        throw error;
      }
    });
  }
}
```

### Interactive Prompt Architecture

**Prompt System**: Consistent interactive prompts:

```typescript
export class PromptService {
  async promptForMissingUrl(url?: string): Promise<string> {
    if (url) return url;
    
    return await this.prompt({
      type: 'input',
      name: 'url',
      message: 'Enter Saleor GraphQL URL:',
      validate: (input) => this.validateUrl(input)
    });
  }
  
  async promptForMissingToken(token?: string): Promise<string> {
    if (token) return token;
    
    return await this.prompt({
      type: 'password',
      name: 'token', 
      message: 'Enter Saleor API token:',
      validate: (input) => this.validateToken(input)
    });
  }
  
  async confirmDeployment(changes: DiffResult[]): Promise<boolean> {
    console.log('\n📋 Deployment Summary:');
    this.displayChanges(changes);
    
    return await this.prompt({
      type: 'confirm',
      name: 'proceed',
      message: 'Do you want to proceed with deployment?',
      default: false
    });
  }
}
```

## Configuration System Architecture

### Schema-Driven Configuration

**Zod Schema Integration**: Configuration validation with TypeScript inference:

```typescript
// Base configuration schema
const baseEntitySchema = z.object({
  name: z.string().min(1).describe('Entity name'),
  description: z.string().optional().describe('Entity description')
});

// Entity-specific schemas extend base
const categorySchema = baseEntitySchema.extend({
  slug: z.string().min(1).describe('Category.slug'),
  parent: z.string().optional().describe('Parent category slug')
});

const productSchema = baseEntitySchema.extend({
  slug: z.string().min(1).describe('Product.slug'),
  productType: z.string().describe('Product type reference'),
  category: z.string().optional().describe('Category reference')
});

// Full configuration schema
export const configurationSchema = z.object({
  shop: shopSchema.optional(),
  channels: z.array(channelSchema).optional(),
  categories: z.array(categorySchema).optional(),
  products: z.array(productSchema).optional(),
  collections: z.array(collectionSchema).optional(),
  // ... other entities
});

// Type inference from schema
export type Configuration = z.infer<typeof configurationSchema>;
```

**Configuration Validation Pipeline**:

```typescript
export class ConfigurationValidator {
  async validate(config: Configuration): Promise<ValidationResult> {
    const results = await Promise.all([
      this.validateSchema(config),
      this.validateBusinessRules(config),
      this.validateCrossReferences(config)
    ]);
    
    return {
      isValid: results.every(r => r.isValid),
      errors: results.flatMap(r => r.errors),
      warnings: results.flatMap(r => r.warnings)
    };
  }
  
  private validateSchema(config: Configuration): ValidationResult {
    try {
      configurationSchema.parse(config);
      return { isValid: true, errors: [], warnings: [] };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          isValid: false,
          errors: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code
          })),
          warnings: []
        };
      }
      throw error;
    }
  }
}
```

## Performance Architecture

### GraphQL Client Optimization

**Retry Logic**: The GraphQL client uses urql's `retryExchange` for resilient API calls:

```typescript
import { retryExchange } from "@urql/exchange-retry";

// Retry configuration for rate limiting and network errors
const retryOptions = {
  initialDelayMs: 1000,
  maxDelayMs: 15000,
  randomDelay: true,
  maxNumberAttempts: 3,
  retryIf: (error: CombinedError) => {
    // Retry on rate limiting (429)
    if (error.response?.status === 429) return true;
    // Retry on network errors
    if (error.networkError) return true;
    return false;
  },
};

const client = createClient({
  url,
  requestPolicy: "network-only",
  exchanges: [
    authExchange({ ... }),
    retryExchange(retryOptions),
    fetchExchange,
  ],
});
```

**Bulk Mutations**: Deployment uses bulk GraphQL mutations for performance (see ADR-001):

```typescript
// Instead of N sequential mutations:
for (const category of categories) {
  await createCategory(category);  // ❌ Slow: N round trips
}

// Use bulk mutation:
await bulkCategoryCreate(categories);  // ✅ Fast: 1 round trip
```

### Service-Level Caching

Services implement caching for frequently accessed data:

```typescript
class ChannelService {
  private channelCache = new Map<string, string>();  // slug → id

  async getChannelIdBySlugCached(slug: string): Promise<string | null> {
    if (this.channelCache.has(slug)) {
      return this.channelCache.get(slug)!;
    }
    const id = await this.repository.getChannelIdBySlug(slug);
    if (id) this.channelCache.set(slug, id);
    return id;
  }
}
```

### Concurrent Operations

The diff service runs comparisons concurrently with configurable limits:

```typescript
const diffOptions = {
  maxConcurrentComparisons: 5,  // Limit parallel entity comparisons
  skipMedia: false,              // Skip media field comparison
};

// Comparisons run in parallel, respecting concurrency limit
const results = await Promise.all(
  entityTypes.map(type => compareEntityType(type, diffOptions))
);
```

## Recipe System Architecture

The recipe system provides pre-built configuration templates for common e-commerce scenarios.

### Recipe Module Structure

```
src/
├── recipes/                    # Bundled recipe YAML files
│   ├── manifest.json          # Recipe metadata catalog
│   ├── multi-region.yml       # Regional e-commerce setup
│   ├── digital-products.yml   # Non-physical goods
│   ├── click-and-collect.yml  # Store pickup
│   └── custom-shipping.yml    # Shipping zones
├── modules/recipe/
│   ├── recipe-service.ts      # Recipe loading and formatting
│   └── repository.ts          # Recipe discovery and parsing
└── commands/recipe.ts         # CLI command handler
```

### Recipe Discovery

Recipes are bundled in the npm package and discovered via manifest:

```typescript
// Recipe manifest structure
interface RecipeManifest {
  generatedAt: string;
  recipes: RecipeMetadata[];
}

interface RecipeMetadata {
  name: string;           // e.g., "multi-region"
  description: string;    // User-facing description
  category: string;       // e.g., "fulfillment", "shipping"
  file: string;           // Relative path to YAML
  saleorVersion: string;  // e.g., ">=3.15"
  entitySummary: Record<string, number>;  // Entity counts
}
```

### Recipe Operations

| Operation | Description |
|-----------|-------------|
| `list` | Read manifest, display available recipes |
| `show` | Load and format recipe YAML for display |
| `apply` | Parse recipe, validate, deploy to Saleor |
| `export` | Copy recipe YAML to local filesystem |

## Deployment Pipeline Architecture

The deployment system supports two pipeline implementations for different use cases.

### Simple Pipeline

Sequential execution with fail-fast behavior:

```typescript
interface DeploymentStage {
  name: string;
  execute: (context: DeploymentContext) => Promise<void>;
  skip?: (context: DeploymentContext) => boolean;
}

// Stages execute in order, stop on first failure
const stages: DeploymentStage[] = [
  { name: 'validation', execute: validateConfiguration },
  { name: 'preflight', execute: preflightChecks },
  { name: 'diff', execute: computeDiff },
  { name: 'confirm', execute: getUserConfirmation, skip: (ctx) => ctx.ci },
  { name: 'execute', execute: applyChanges },
  { name: 'verify', execute: verifyDeployment },
];
```

### Enhanced Pipeline

Result collection with partial failure support:

```typescript
interface EnhancedPipelineResult {
  success: boolean;
  stages: StageResult[];
  metrics: DeploymentMetrics;
  report: DeploymentReport;
}

interface StageResult {
  stage: string;
  status: 'success' | 'failed' | 'skipped';
  duration: number;
  entityResults?: EntityResult[];
  error?: Error;
}

// Enhanced pipeline continues on partial failures
// Collects results instead of throwing
const result = await enhancedPipeline.execute(config, options);
if (!result.success) {
  console.log(`Partial failure: ${result.stages.filter(s => s.status === 'failed').length} stages failed`);
}
```

### Preflight Validation

Before contacting the Saleor API, the preflight validator checks:

```typescript
interface PreflightValidation {
  // Detect duplicate identifiers across all entity types
  validateUniqueIdentifiers(config: Configuration): ValidationResult;

  // Validate cross-entity references exist
  validateEntityReferences(config: Configuration): ValidationResult;

  // Check for circular dependencies in hierarchies
  validateHierarchies(config: Configuration): ValidationResult;
}
```

## Testing Architecture

### Test Infrastructure

**Mocking Pattern**: Tests mock repositories and external dependencies:

```typescript
import { vi, describe, it, expect, beforeEach } from "vitest";

describe("CategoryService", () => {
  let mockRepository: MockedCategoryRepository;
  let service: CategoryService;

  beforeEach(() => {
    // Create typed mocks for repository methods
    mockRepository = {
      getAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    service = new CategoryService(mockRepository);
  });

  it("should create categories", async () => {
    mockRepository.create.mockResolvedValue({ id: "cat-1", slug: "test" });
    await service.bootstrapCategories([{ name: "Test", slug: "test" }]);
    expect(mockRepository.create).toHaveBeenCalled();
  });
});
```

**MSW for GraphQL Mocking**: Integration tests use MSW (Mock Service Worker):

```typescript
import { graphql, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const handlers = [
  graphql.query("GetCategories", () => {
    return HttpResponse.json({
      data: { categories: { edges: [] } },
    });
  }),
];

const server = setupServer(...handlers);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Test Data Builders**: Consistent test data creation:

```typescript
export class CategoryTestBuilder {
  private category: CategoryInput = {
    name: 'Test Category',
    slug: 'test-category',
    description: 'A test category'
  };
  
  withName(name: string): this {
    this.category.name = name;
    this.category.slug = this.generateSlug(name);
    return this;
  }
  
  withParent(parentSlug: string): this {
    this.category.parent = parentSlug;
    return this;
  }
  
  build(): CategoryInput {
    return { ...this.category };
  }
  
  private generateSlug(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-');
  }
}
```

---

**Related Documentation:**
- [DEVELOPMENT_WORKFLOWS.md](DEVELOPMENT_WORKFLOWS.md) - Development processes using these patterns
- [TESTING_PROTOCOLS.md](TESTING_PROTOCOLS.md) - Testing strategies for this architecture
- [COMMANDS.md](COMMANDS.md) - CLI commands including recipe and CI/CD flags
- [ci-cd/README.md](ci-cd/README.md) - CI/CD integration guide
- [../recipes/README.md](../recipes/README.md) - Recipe system documentation
- [adr/001-bulk-mutations-optimization.md](adr/001-bulk-mutations-optimization.md) - Bulk mutation performance ADR
