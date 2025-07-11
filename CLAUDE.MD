# Saleor Configurator - AI Assistant Guide

This is the main entry point for AI assistants working with the Saleor Configurator project. This file provides core project understanding and imports detailed guidelines.

## 📚 Additional Documentation

@.claude/CODING-STANDARDS.md
@.claude/TESTING-GUIDE.md
@.claude/GRAPHQL-GUIDE.md

## 🚀 Quick Start

1. **New to project?** Read this file first, then check imported guides
2. **Writing code?** See CODING-STANDARDS.md (imported above)
3. **Writing tests?** See TESTING-GUIDE.md (imported above)
4. **GraphQL work?** See GRAPHQL-GUIDE.md (imported above)

## Project Overview
Saleor Configurator is a "commerce as code" tool that implements Infrastructure-as-Code principles for e-commerce configuration. It enables teams to:
- Define Saleor instance configurations declaratively in YAML
- Version control e-commerce configurations
- Deploy configurations through CI/CD pipelines
- Preview changes before applying them
- Manage multiple environments (dev, staging, production)

### Key Features

#### 1. **Declarative Configuration Management**
- YAML-based configuration files
- Type-safe schema validation using Zod
- Automatic YAML to GraphQL mutation translation
- Idempotent operations (safe to run multiple times)

#### 2. **Advanced Diffing Engine**
- Entity-specific diff calculations
- Visual diff output with color coding
- Change preview before deployment
- Support for create, update, and delete operations

#### 3. **Multi-Environment Support**
- Environment-specific configuration files
- Token management per environment
- Safe deployment workflows

#### 4. **GraphQL Type Safety**
- Auto-generated types from Saleor schema (v3.20)
- Type-safe queries and mutations using gql.tada
- Compile-time verification of GraphQL operations

### Package Dependencies & Their Purposes

#### Core Dependencies
```json
{
  "@urql/core": "^5.0.8",        // GraphQL client for API communication
  "gql.tada": "^1.8.10",         // Type-safe GraphQL with TypeScript
  "commander": "^12.1.0",        // CLI framework for command parsing
  "@inquirer/prompts": "^7.2.0", // Interactive CLI prompts
  "zod": "^3.24.1",              // Runtime validation & type inference
  "yaml": "^2.6.1",              // YAML parsing and serialization
  "chalk": "^5.3.0",             // Terminal output styling
  "ora": "^8.1.1",               // Terminal spinners for progress
  "tslog": "^4.9.3",             // TypeScript-first logging
  "dotenv": "^16.4.7"            // Environment variable management
}
```

#### Development Dependencies
```json
{
  "vitest": "^2.1.8",                  // Modern test runner
  "@biomejs/biome": "1.9.4",           // Fast linter & formatter
  "tsx": "^4.19.2",                    // TypeScript execution
  "@changesets/cli": "^2.27.10",       // Version management
  "@types/node": "^22.10.3",           // Node.js type definitions
  "typescript": "5.7.2"                // TypeScript compiler
}
```

### Module Behavior & Interactions

#### Core Flow
1. **CLI Entry** → Parses commands and arguments
2. **Command Handler** → Validates input and orchestrates
3. **Configurator** → Coordinates module operations
4. **Services** → Execute business logic
5. **Repositories** → Perform GraphQL operations
6. **GraphQL Client** → Communicates with Saleor API

#### Module Structure
```
src/modules/[entity]/
├── [entity]-service.ts         # Business logic
├── [entity]-repository.ts      # GraphQL operations
├── [entity]-service.test.ts    # Unit tests
└── index.ts                    # Module exports
```

#### Entity Processing Order
The configurator processes entities in a specific order to handle dependencies:
1. Shop settings
2. Channels
3. Attributes
4. Product types
5. Page types
6. Categories
7. Products


## Architecture Analysis

### 1. **Layered Architecture**

```
┌─────────────────────────────────────────────┐
│                CLI Layer                    │
│  (Command parsing, User interaction)        │
├─────────────────────────────────────────────┤
│              Command Layer                  │
│  (Business workflows, Orchestration)        │
├─────────────────────────────────────────────┤
│               Core Layer                    │
│  (Configurator, DI Container, Diff Engine) │
├─────────────────────────────────────────────┤
│              Service Layer                  │
│  (Business logic, Validation)              │
├─────────────────────────────────────────────┤
│            Repository Layer                 │
│  (GraphQL operations, Data access)         │
├─────────────────────────────────────────────┤
│              GraphQL Client                 │
│  (Network communication, Type safety)       │
└─────────────────────────────────────────────┘
```

### 2. **Module Boundaries**

Each module is self-contained with clear responsibilities:

```typescript
// Module structure enforces boundaries
export interface Module<T> {
  service: Service<T>;
  repository: Repository<T>;
  schema: ZodSchema<T>;
}

// Modules communicate through well-defined interfaces
export interface Service<T> {
  create(input: CreateInput<T>): Promise<Result<T>>;
  update(id: string, input: UpdateInput<T>): Promise<Result<T>>;
  delete(id: string): Promise<Result<void>>;
  findBySlug(slug: string): Promise<Result<T>>;
}
```

### 3. **Dependency Injection Architecture**

```typescript
// Service container manages dependencies
export class ServiceContainer {
  private services = new Map<string, unknown>();

  register<T>(token: string, factory: () => T): void {
    this.services.set(token, factory());
  }

  resolve<T>(token: string): T {
    const service = this.services.get(token);
    if (!service) {
      throw new Error(`Service ${token} not registered`);
    }
    return service as T;
  }
}

// Composition root
export function createServiceContainer(config: Config): ServiceContainer {
  const container = new ServiceContainer();
  
  // Register GraphQL client
  container.register('graphqlClient', () => 
    createGraphQLClient(config.apiUrl, config.token)
  );
  
  // Register repositories
  container.register('productRepository', () => 
    new ProductRepository(container.resolve('graphqlClient'))
  );
  
  // Register services
  container.register('productService', () => 
    new ProductService(
      container.resolve('productRepository'),
      container.resolve('logger')
    )
  );
  
  return container;
}
```

### 4. **GraphQL Integration Pattern**

```typescript
// Type-safe GraphQL with gql.tada
import { graphql } from '../lib/graphql';

const CREATE_PRODUCT = graphql(`
  mutation CreateProduct($input: ProductCreateInput!) {
    productCreate(input: $input) {
      product {
        id
        name
        slug
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

// Repository handles GraphQL communication
export class ProductRepository {
  constructor(private client: GraphQLClient) {}

  async create(input: ProductCreateInput): Promise<Product> {
    const result = await this.client.request(CREATE_PRODUCT, { input });
    
    if (result.productCreate.errors.length > 0) {
      throw new GraphQLError('Product creation failed', result.productCreate.errors);
    }
    
    return result.productCreate.product;
  }
}
```

### 5. **Configuration Management**

```typescript
// Configuration flows through the system
interface ConfigFlow {
  // 1. YAML files loaded
  yaml: YAMLConfig;
  
  // 2. Validated against schema
  validated: ValidatedConfig;
  
  // 3. Transformed to domain models
  domain: DomainModels;
  
  // 4. Diffed against current state
  diff: ConfigurationDiff;
  
  // 5. Applied through GraphQL
  result: DeploymentResult;
}

// Each step is isolated and testable
export class ConfigurationPipeline {
  async process(yamlPath: string): Promise<DeploymentResult> {
    const yaml = await this.loadYAML(yamlPath);
    const validated = await this.validate(yaml);
    const domain = await this.transform(validated);
    const diff = await this.calculateDiff(domain);
    const result = await this.apply(diff);
    
    return result;
  }
}
```

### 6. **Error Handling Architecture**

```typescript
// Centralized error handling
export class ErrorHandler {
  private handlers = new Map<string, ErrorHandlerFn>();

  register(errorType: string, handler: ErrorHandlerFn): void {
    this.handlers.set(errorType, handler);
  }

  handle(error: Error): HandledError {
    const handler = this.handlers.get(error.constructor.name) 
      || this.defaultHandler;
    
    return handler(error);
  }

  private defaultHandler(error: Error): HandledError {
    return {
      message: 'An unexpected error occurred',
      details: error.message,
      code: 'UNKNOWN_ERROR',
    };
  }
}
```

### 7. **Performance Considerations**

```typescript
// Batch operations for efficiency
export class BatchProcessor<T> {
  constructor(
    private batchSize: number,
    private processor: (items: T[]) => Promise<void>
  ) {}

  async process(items: T[]): Promise<void> {
    const batches = chunk(items, this.batchSize);
    
    for (const batch of batches) {
      await this.processor(batch);
    }
  }
}

// Concurrent processing where possible
export async function processEntitiesConcurrently(
  entities: Entity[]
): Promise<Result[]> {
  const operations = entities.map(entity => 
    limit(() => processEntity(entity))
  );
  
  return Promise.all(operations);
}
```

## Quick Reference

### Command Structure
```bash
# Development
pnpm dev                 # Run in development mode
pnpm build              # Build for production
pnpm check              # Run linting and formatting
pnpm test               # Run all tests
pnpm test:watch         # Run tests in watch mode

# CLI Commands
saleor-config start     # Interactive setup
saleor-config diff      # Preview changes
saleor-config push      # Apply configuration
saleor-config introspect # Pull current state
```

### File Naming Conventions
- Services: `[entity]-service.ts`
- Repositories: `[entity]-repository.ts`
- Tests: `[entity]-service.test.ts` (unit), `[entity]-service.integration.test.ts`
- Types: Use inline types or `types.ts` within modules
- Constants: `constants.ts` or inline if module-specific

### Common Patterns
1. **Service Creation**: Constructor injection with repository and logger
2. **Error Handling**: Use Result type for expected failures, throw for unexpected
3. **GraphQL Operations**: Repository layer handles all GraphQL communication
4. **Testing**: Mock at service boundaries, use factories for test data
5. **CLI Output**: cliConsole for users, logger for debugging

## Key Patterns to Follow

### 1. **Module Structure**
Every entity module should follow this structure:
```
modules/[entity]/
├── [entity]-service.ts         # Business logic
├── [entity]-repository.ts      # GraphQL operations
├── [entity]-service.test.ts    # Unit tests
├── types.ts                    # Module-specific types (optional)
└── index.ts                    # Public exports
```

### 2. **Service Pattern**
```typescript
export class EntityService {
  constructor(
    private readonly repository: EntityRepository,
    private readonly logger = createLogger("EntityService")
  ) {}

  async create(input: CreateInput): Promise<Result<Entity>> {
    this.logger.debug("Creating entity", { input });
    try {
      const entity = await this.repository.create(input);
      return { success: true, data: entity };
    } catch (error) {
      this.logger.error("Failed to create entity", { error });
      return { success: false, error };
    }
  }
}
```

### 3. **Repository Pattern**
```typescript
export class EntityRepository {
  constructor(private readonly client: GraphQLClient) {}

  async create(input: CreateInput): Promise<Entity> {
    const result = await this.client.request(CREATE_ENTITY_MUTATION, { input });
    if (result.entityCreate.errors.length > 0) {
      throw new GraphQLError("Entity creation failed", result.entityCreate.errors);
    }
    return result.entityCreate.entity;
  }
}
```

### 4. **Test Pattern**
```typescript
describe("EntityService", () => {
  let service: EntityService;
  let mockRepository: MockedObject<EntityRepository>;

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      // ... other methods
    };
    service = new EntityService(mockRepository);
  });

  it("should create entity successfully", async () => {
    // Arrange
    const input = { name: "Test" };
    const expected = { id: "1", ...input };
    mockRepository.create.mockResolvedValue(expected);

    // Act
    const result = await service.create(input);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(expected);
  });
});
```

### 5. **Error Handling Flow**
```typescript
// Repository: Throw specific errors
throw new GraphQLError("Failed", errors);

// Service: Catch and return Result
catch (error) {
  return { success: false, error };
}

// CLI: Handle Result and display to user
if (!result.success) {
  cliConsole.error(`Failed: ${result.error.message}`);
}
```

## Core Principles

1. **🚨 RESEARCH FIRST**: Never build what already exists - use best-in-class tools from TypeScript/Node.js ecosystem
2. **High-Quality Code**: Clean, concise, direct solutions only - no over-engineering
3. **Type Safety First**: Never use `any`, always provide proper types
4. **GraphQL Backbone**: All data operations go through GraphQL - no direct database access
5. **User Experience**: CLI output should be clear, helpful, and actionable
6. **Test Everything**: Comprehensive tests for all scenarios
7. **Follow Patterns**: Repository → Service → Configurator flow

### Examples - Use These Tools, Don't Recreate:
- **HTTP/GraphQL**: `@urql/core`, `fetch` ✅ | Custom wrappers ❌
- **Validation**: `zod` ✅ | Custom validators ❌  
- **Logging**: `tslog` ✅ | Custom loggers ❌
- **CLI**: `commander` ✅ | Manual argv parsing ❌
- **Testing**: `vitest` ✅ | Custom test runners ❌
- **Code Quality**: `@biomejs/biome` ✅ | Custom linters ❌

## Essential Commands

```bash
# Quality Checks (ALWAYS run before committing)
pnpm check      # Biome linting/formatting
pnpm check:fix  # Auto-fix issues
pnpm typecheck  # TypeScript validation
pnpm test       # Run all tests
pnpm build      # Ensure it builds

# Development
pnpm dev        # Run in development mode
pnpm test:watch # Watch mode for tests

# GraphQL
pnpm fetch-schema # Update Saleor schema
```

## Key Takeaways

- **Imported guides** contain detailed patterns and examples
- **Follow checklists** in CODING-STANDARDS.md and TESTING-GUIDE.md
- **GraphQL-first** - See GRAPHQL-GUIDE.md for adding entities
- **Quality matters** - Always run checks before committing

Remember: The imported documentation files contain comprehensive details. This file provides the essential context and quick reference.