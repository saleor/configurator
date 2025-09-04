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

### Service Container Pattern

**Dependency Injection**: Uses a custom service container for loose coupling:

```typescript
export class ServiceContainer {
  private services = new Map<string, ServiceFactory<any>>();
  
  register<T>(name: string, factory: ServiceFactory<T>): ServiceContainer {
    this.services.set(name, factory);
    return this;
  }
  
  resolve<T>(name: string): T {
    const factory = this.services.get(name);
    if (!factory) {
      throw new ServiceNotFoundError(`Service '${name}' not found`);
    }
    
    return factory(this);
  }
  
  // Singleton registration
  registerSingleton<T>(name: string, factory: ServiceFactory<T>): ServiceContainer {
    let instance: T | null = null;
    
    return this.register(name, (container) => {
      if (!instance) {
        instance = factory(container);
      }
      return instance;
    });
  }
}
```

**Service Registration**:
```typescript
export function createServiceContainer(): ServiceContainer {
  return new ServiceContainer()
    // Infrastructure services
    .registerSingleton('logger', () => createLogger())
    .registerSingleton('graphqlClient', (c) => createGraphQLClient())
    
    // Repository layer
    .register('categoryRepository', (c) => 
      new CategoryRepository(c.resolve('graphqlClient'), c.resolve('logger'))
    )
    .register('productRepository', (c) => 
      new ProductRepository(c.resolve('graphqlClient'), c.resolve('logger'))
    )
    
    // Service layer
    .register('categoryService', (c) => 
      new CategoryService(c.resolve('categoryRepository'), c.resolve('logger'))
    )
    .register('productService', (c) => 
      new ProductService(c.resolve('productRepository'), c.resolve('logger'))
    );
}
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

### Optimization Strategies

**Lazy Loading**: Services and repositories are created on-demand:

```typescript
export class LazyServiceContainer extends ServiceContainer {
  private instances = new Map<string, any>();
  
  resolve<T>(name: string): T {
    // Return cached instance if available
    if (this.instances.has(name)) {
      return this.instances.get(name);
    }
    
    // Create and cache new instance
    const instance = super.resolve<T>(name);
    this.instances.set(name, instance);
    
    return instance;
  }
}
```

**Batch Processing**: Efficient GraphQL operations:

```typescript
export class BatchGraphQLExecutor {
  private batchQueue: Array<{
    operation: DocumentNode;
    variables: any;
    resolve: (result: any) => void;
    reject: (error: Error) => void;
  }> = [];
  
  async executeBatch<T>(
    operation: DocumentNode,
    variables: any
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({ operation, variables, resolve, reject });
      
      // Process batch on next tick
      process.nextTick(() => this.processBatch());
    });
  }
  
  private async processBatch(): void {
    if (this.batchQueue.length === 0) return;
    
    const batch = this.batchQueue.splice(0, 10); // Process 10 at a time
    
    try {
      const results = await Promise.all(
        batch.map(item => 
          this.client.query(item.operation, item.variables)
        )
      );
      
      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
      
    } catch (error) {
      batch.forEach(item => item.reject(error as Error));
    }
  }
}
```

### Memory Management

**Resource Cleanup**: Proper resource management:

```typescript
export class ResourceManager {
  private resources = new Set<Disposable>();
  
  register(resource: Disposable): void {
    this.resources.add(resource);
  }
  
  async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.resources).map(resource =>
      resource.dispose().catch(error => {
        console.error('Failed to dispose resource:', error);
      })
    );
    
    await Promise.all(cleanupPromises);
    this.resources.clear();
  }
}

interface Disposable {
  dispose(): Promise<void>;
}
```

## Testing Architecture

### Test Infrastructure

**Test Service Container**: Isolated testing environment:

```typescript
export function createTestServiceContainer(): ServiceContainer {
  return new ServiceContainer()
    .registerSingleton('logger', () => createTestLogger())
    .registerSingleton('graphqlClient', () => createMockGraphQLClient())
    .register('categoryRepository', (c) => 
      new CategoryRepository(c.resolve('graphqlClient'), c.resolve('logger'))
    );
}

function createTestLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(), 
    warn: vi.fn(),
    error: vi.fn()
  } as any;
}

function createMockGraphQLClient(): Client {
  return {
    query: vi.fn(),
    mutation: vi.fn(),
    subscription: vi.fn()
  } as any;
}
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
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Deployment pipeline implementation details
- [MCP_INTEGRATION.md](MCP_INTEGRATION.md) - MCP tool integration with this architecture
- [CLAUDE.md](CLAUDE.md) - Main navigation hub