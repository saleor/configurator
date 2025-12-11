# Configurator Architecture Deep Dive

## Executive Summary

The Saleor Configurator is a CLI tool that implements "Commerce as code" by managing Saleor store configuration declaratively through YAML files. The architecture follows a layered approach: **CLI → Commands → Core → Services → Repositories → GraphQL → Saleor**.

**Key Architectural Principles:**
- **Dependency Injection**: All services injected via ServiceContainer
- **Repository Pattern**: GraphQL access exclusively through repositories
- **Service Layer**: Business logic, bootstrapping, and error handling
- **Factory Pattern**: Configurator creation via factory functions
- **Strategy Pattern**: Comparators for diff operations
- **Error Wrapping**: Consistent error handling across all layers

---

## 1. Application Startup Flow

### 1.1 Entry Point: bin/cli.mjs

**Location:** `bin/cli.mjs:1-10`

```javascript
#!/usr/bin/env node

async function main() {
  const { runCLI } = await import("../dist/main.js");
  await runCLI();
}

main().catch(console.error);
```

**Purpose:**
- ESM wrapper for npx compatibility
- Loads compiled CLI from dist/main.js
- Catches top-level errors

### 1.2 CLI Bootstrap: src/cli/main.ts

**Location:** `src/cli/main.ts:139-152`

**Flow:**
1. `runCLI()` → Creates CLI program
2. `createCLI()` → Configures Commander.js program
3. `registerCommands()` → Registers all command handlers
4. `program.parseAsync()` → Parses arguments and executes command

**Key Functions:**

```typescript
export async function runCLI(): Promise<void> {
  const program = createCLI();
  
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    await handleCliError(error);
  }
}
```

**Error Handling:**
- Global `uncaughtException` handler (line 110)
- Global `unhandledRejection` handler (line 121)
- Command-specific error handling in `handleCliError()`
- BaseError instances get user-friendly messages
- Development mode shows full stack traces

---

## 2. Command Registration & Execution

### 2.1 Command Creation Pattern

**Location:** `src/cli/command.ts:172-230`

**Pattern:**
```typescript
CommandConfig → createCommand() → Commander.js Command
```

**Key Steps:**
1. **Schema Generation**: Zod schema → Commander.js options
2. **Interactive Prompting**: Missing args prompted interactively
3. **Validation**: Zod validation before execution
4. **Handler Execution**: Validated args passed to handler

**Example Flow:**
```typescript
const diffCommandConfig: CommandConfig = {
  name: 'diff',
  description: 'Compare local config with remote Saleor instance',
  schema: diffCommandSchema,  // Zod schema
  handler: handleDiff,         // Command handler
  requiresInteractive: false,
  examples: [...]
};

// Registered via:
const command = createCommand(diffCommandConfig);
program.addCommand(command);
```

### 2.2 Command Handler Pattern

**Location:** `src/commands/diff.ts:16-73`

**Structure:**
```typescript
class DiffCommandHandler {
  async execute(args: DiffCommandArgs): Promise<void>
  private async performDiffOperation(args): Promise<void>
}

export async function handleDiff(args: DiffCommandArgs) {
  const handler = new DiffCommandHandler();
  await handler.execute(args);
}
```

**Pattern:**
1. Handler class with `execute()` method
2. Private methods for operation steps
3. Exported wrapper function for config
4. Console output management
5. Error handling and exit codes

**Typical Handler Flow:**
```
args → validate → createConfigurator() → perform operation → format output → exit
```

---

## 3. Configurator Orchestration

### 3.1 Factory Pattern: createConfigurator()

**Location:** `src/core/configurator.ts:183-189`

```typescript
export function createConfigurator(baseArgs: BaseCommandArgs) {
  const { url, token, config: configPath } = baseArgs;
  
  const client = createClient(token, url);
  const services = ServiceComposer.compose(client, configPath);
  return new SaleorConfigurator(services);
}
```

**Purpose:**
- Single entry point for creating configurator instances
- Handles URQL client creation
- Delegates service composition to ServiceComposer
- Returns fully-initialized SaleorConfigurator

**Alternative Factories:**
- `createConfiguratorWithOptions()`: Custom configurator options
- `createReadOnlyConfigurator()`: For introspection/diff only

### 3.2 SaleorConfigurator Class

**Location:** `src/core/configurator.ts:9-181`

**Public API:**
```typescript
class SaleorConfigurator {
  constructor(private services: ServiceContainer)
  
  // Main operations
  async push(): Promise<void>           // Deploy configuration
  async diff(): Promise<DiffResult>     // Compare local vs remote
  async introspect(): Promise<Config>   // Fetch remote config
  
  // Service access
  get serviceContainer(): ServiceContainer
}
```

**Key Methods:**

#### 3.2.1 push() - Deployment Orchestration

**Location:** `src/core/configurator.ts:20-147`

**Flow:**
```
1. Load config (YAML → Zod validated)
2. Shop settings (if configured)
3. Channels (before products - dependency)
4. Product types (with progress tracking)
5. Page types (with progress tracking)
6. Categories
7. Products (depends on channels, categories, product types)
```

**Pattern:**
```typescript
if (config.channels && config.channels.length > 0) {
  const progress = new BulkOperationProgress(
    config.channels.length,
    "Creating channels",
    cliConsole.progress
  );
  progress.start();
  
  try {
    await this.services.channel.bootstrapChannels(config.channels);
    progress.complete();
  } catch (error) {
    progress.complete();
    throw error;
  }
}
```

**Key Insights:**
- Sequential execution (no parallelization)
- Order enforces dependencies
- Progress tracking for bulk operations
- Individual item tracking for product types/page types
- Failures throw immediately (no partial commits)

#### 3.2.2 diff() - Configuration Comparison

**Location:** `src/core/configurator.ts:162-180`

**Flow:**
```
1. Load local config (YAML)
2. Load remote config (GraphQL queries)
3. Compare using DiffService
4. Format output
5. Return summary + formatted output
```

**Pattern:**
```typescript
async diff() {
  cliConsole.progress.start("Comparing local and remote configurations");
  try {
    const summary = await this.services.diffService.compare();
    cliConsole.progress.succeed("Configuration comparison completed");
    
    const output = formatDiff(summary);
    return { summary, output };
  } catch (error) {
    cliConsole.progress.fail("Failed to compare configurations");
    logger.error("Failed to diff configurations", { error });
    throw error;
  }
}
```

**Key Insight:** Uses shared `diffService` instance from ServiceContainer to ensure consistency across operations.

#### 3.2.3 introspect() - Remote Configuration Fetch

**Location:** `src/core/configurator.ts:149-160`

**Flow:**
```
1. Call diffService.compareForIntrospect()
2. Extract remote config from result
3. Return remote config
```

**Purpose:**
- Fetches current Saleor configuration
- Uses diff service to leverage existing remote fetch logic
- Returns structured Config object (not YAML)

---

## 4. Dependency Injection System

### 4.1 ServiceContainer Interface

**Location:** `src/core/service-container.ts:1-51`

**Structure:**
```typescript
interface ServiceContainer {
  // Core services
  attribute: AttributeService;
  channel: ChannelService;
  pageType: PageTypeService;
  productType: ProductTypeService;
  shop: ShopService;
  configuration: ConfigurationService;
  configStorage: YamlConfigurationManager;
  
  // Domain services
  category: CategoryService;
  product: ProductService;
  warehouse: WarehouseService;
  shippingZone: ShippingZoneService;
  tax: TaxService;
  collection: CollectionService;
  menu: MenuService;
  model: ModelService;
  
  // Orchestration
  diffService: DiffService;
}
```

**Key Insight:** Single container holds ALL services needed throughout the application lifecycle.

### 4.2 ServiceComposer.compose()

**Location:** `src/core/service-container.ts:54-127`

**Pattern:**
```typescript
static compose(client: Client, configPath?: string): ServiceContainer {
  // 1. Create repositories (all at once)
  const repositories = {
    attribute: new AttributeRepository(client),
    channel: new ChannelRepository(client),
    // ... 14 total repositories
  };
  
  // 2. Create cache-enabled services first
  const channelService = new ChannelService(repositories.channel);
  const productService = new ProductService(repositories.product, {
    getPageBySlug: async (slug: string) => { /* ... */ },
    getChannelIdBySlug: async (slug: string) => {
      return await channelService.getChannelIdBySlugCached(slug);
    },
  });
  
  // 3. Create service container (without diffService to avoid circular dependency)
  const services = {
    attribute: new AttributeService(repositories.attribute),
    channel: channelService,
    product: productService,
    // ... all other services
  } as Omit<ServiceContainer, "diffService">;
  
  // 4. Create diff service with services container
  const diffService = new DiffService(services as ServiceContainer);
  
  return { ...services, diffService };
}
```

**Key Patterns:**

#### 4.2.1 Two-Phase Construction

**Why:** Prevents circular dependencies between DiffService and other services.

**Pattern:**
1. Create services without diffService
2. Create diffService with reference to services
3. Merge both

#### 4.2.2 Dependency Injection via Constructor

**Examples:**
```typescript
// Simple: Service → Repository
new AttributeService(repositories.attribute)

// Complex: Service → Repository + Dependencies
new ProductTypeService(repositories.productType, attributeService)

// With Resolvers: Service → Repository + Resolver Functions
new ProductService(repositories.product, {
  getPageBySlug: async (slug) => { /* ... */ },
  getChannelIdBySlug: async (slug) => await channelService.getChannelIdBySlugCached(slug)
})
```

#### 4.2.3 Shared Cache Pattern

**Example:** ProductService uses ChannelService's cached resolver:
```typescript
const channelService = new ChannelService(repositories.channel);
const productService = new ProductService(repositories.product, {
  getChannelIdBySlug: async (slug: string) => {
    return await channelService.getChannelIdBySlugCached(slug);
  },
});
```

**Benefit:** Multiple services can share the same cached data without separate cache management.

---

## 5. Service Layer Patterns

### 5.1 Service Structure

**Typical Service:**
```typescript
class {Module}Service {
  constructor(private repository: {Module}Repository) {}
  
  // Bootstrap methods (for initial deployment)
  async bootstrap{Entities}(inputs: Input[]): Promise<Result[]>
  
  // CRUD operations
  async get{Entity}(id: string): Promise<Entity>
  async create{Entity}(input: Input): Promise<Entity>
  async update{Entity}(id: string, input: Input): Promise<Entity>
  
  // Business logic
  async getOrCreate(input: Input): Promise<Entity>
  async resolve{Reference}(ref: Reference): Promise<string>
}
```

### 5.2 Bootstrap Pattern

**Location Example:** `src/modules/channel/channel-service.ts:165-193`

**Pattern:**
```typescript
async bootstrapChannels(inputs: ChannelInput[]) {
  logger.debug("Bootstrapping channels", { count: inputs.length });
  
  const results = await ServiceErrorWrapper.wrapBatch(
    inputs,
    "Bootstrap channels",
    (channel) => channel.slug,  // Identifier function
    (input) => this.getOrCreate(input)  // Operation function
  );
  
  if (results.failures.length > 0) {
    const errorMessage = `Failed to bootstrap ${results.failures.length} of ${inputs.length} channels`;
    logger.error(errorMessage, {
      failures: results.failures.map((f) => ({
        channel: f.item.slug,
        error: f.error.message,
      })),
    });
    throw new ChannelError(
      errorMessage,
      results.failures.map((f) => `${f.item.slug}: ${f.error.message}`)
    );
  }
  
  logger.debug("Successfully bootstrapped all channels", {
    count: results.successes.length,
  });
  return results.successes.map((s) => s.result);
}
```

**Key Components:**

#### 5.2.1 ServiceErrorWrapper.wrapBatch()

**Purpose:**
- Executes batch operations with error collection
- Continues processing after individual failures
- Collects successes and failures separately

**Returns:**
```typescript
{
  successes: Array<{ item: Input, result: Result }>,
  failures: Array<{ item: Input, error: Error }>
}
```

#### 5.2.2 Error Aggregation

**Pattern:**
- Collect all failures
- Log detailed failure information
- Throw single aggregate error
- Include all individual error messages

### 5.3 GetOrCreate Pattern

**Purpose:** Idempotent operations - create if doesn't exist, return existing if does.

**Typical Implementation:**
```typescript
async getOrCreate(input: EntityInput): Promise<Entity> {
  // 1. Try to find existing
  const existing = await this.repository.get{Entity}BySlug(input.slug);
  
  if (existing) {
    logger.debug("Entity exists, updating if needed", { slug: input.slug });
    return await this.update{Entity}(existing.id, input);
  }
  
  // 2. Create new
  logger.debug("Entity does not exist, creating", { slug: input.slug });
  return await this.repository.create{Entity}(input);
}
```

**Key Insight:** Most bootstrap operations use getOrCreate to enable re-running deployment without duplication.

### 5.4 Reference Resolution Pattern

**Purpose:** Convert user-friendly identifiers (slugs, names) to Saleor IDs.

**Examples:**

**Channel Resolution:**
```typescript
async getChannelIdBySlug(slug: string): Promise<string>
async getChannelIdBySlugCached(slug: string): Promise<string>  // Cached version
```

**Category Resolution:**
```typescript
async resolveCategoryReferences(category: CategoryInput): Promise<CategoryReferences>
```

**Pattern:**
1. Accept user-friendly identifier (slug, name)
2. Query repository for entity
3. Return Saleor ID
4. Cache when appropriate
5. Throw descriptive error if not found

---

## 6. Repository Layer Patterns

### 6.1 Repository Structure

**Location Example:** `src/modules/channel/repository.ts:61-116`

```typescript
class {Module}Repository {
  constructor(private client: Client) {}
  
  // Query operations
  async get{Entities}(): Promise<Entity[]>
  async get{Entity}BySlug(slug: string): Promise<Entity | null>
  async get{Entity}ById(id: string): Promise<Entity | null>
  
  // Mutation operations
  async create{Entity}(input: Input): Promise<Entity>
  async update{Entity}(id: string, input: Input): Promise<Entity>
  async delete{Entity}(id: string): Promise<boolean>
}
```

### 6.2 GraphQL Query Pattern

**Example:** `src/modules/channel/repository.ts:88-92`

```typescript
async getChannelBySlug(slug: string) {
  const result = await this.client.query(getChannelBySlugQuery, { slug });
  return result.data?.channel ?? null;
}
```

**Pattern:**
1. Call `client.query()` or `client.mutation()`
2. Pass GraphQL query/mutation (from gql.tada)
3. Pass variables
4. Extract data from result
5. Return null or throw on error

### 6.3 GraphQL Mutation Pattern

**Example:** `src/modules/channel/repository.ts:64-81`

```typescript
async createChannel(input: ChannelCreateInput) {
  const result = await this.client.mutation(createChannelMutation, {
    input,
  });
  
  if (!result.data?.channelCreate?.channel) {
    throw GraphQLError.fromGraphQLErrors(
      result.error?.graphQLErrors ?? [],
      `Failed to create channel ${input.name}`
    );
  }
  
  const channel = result.data.channelCreate.channel;
  
  logger.info("Channel created", { channel });
  
  return channel;
}
```

**Key Pattern: Dual Error Checking**

**Two error sources:**
1. **result.error**: URQL-level errors (network, GraphQL syntax)
2. **result.data.{mutation}.errors**: Saleor business logic errors

**Pattern:**
```typescript
// Check if data exists (catches both error types)
if (!result.data?.{mutation}.{entity}) {
  throw GraphQLError.fromGraphQLErrors(
    result.error?.graphQLErrors ?? [],
    "User-friendly message"
  );
}

// Extract entity
const entity = result.data.{mutation}.{entity};
```

**Why:** Saleor returns both GraphQL-level errors AND mutation-specific errors. The pattern catches both.

### 6.4 GraphQL Type Extraction

**Pattern:**
```typescript
import { type ResultOf, type VariablesOf } from "gql.tada";

// Extract result type
type ChannelData = ResultOf<typeof getChannelQuery>;

// Extract variables type
type ChannelVars = VariablesOf<typeof getChannelQuery>;

// Use in repository method
async getChannel(id: string): Promise<ChannelData["channel"]> {
  const result = await this.client.query(getChannelQuery, { id });
  return result.data?.channel ?? null;
}
```

**Benefits:**
- Compile-time type safety
- Automatic type updates when schema changes
- No manual type definitions needed

---

## 7. Data Flow Architecture

### 7.1 Complete Flow Diagram

```
User
 ↓
CLI (bin/cli.mjs)
 ↓
runCLI() (src/cli/main.ts)
 ↓
Commander.js Command (src/cli/command.ts)
 ↓
Command Handler (src/commands/*.ts)
 ↓
createConfigurator() (src/core/factory.ts)
 ↓
ServiceComposer.compose() (src/core/service-container.ts)
 ↓ ↓ ↓
┌─────────────┬──────────────┬─────────────┐
│ Repositories│   Services   │ DiffService │
└─────────────┴──────────────┴─────────────┘
       ↓              ↓              ↓
    URQL Client → GraphQL → Saleor API
```

### 7.2 Push Flow (Deployment)

```
config.yml
 ↓
YamlConfigurationManager.load()
 ↓
Zod Validation (schema.ts)
 ↓
Validated Config Object
 ↓
SaleorConfigurator.push()
 ↓
Sequential Service Bootstrap:
  1. ShopService.updateSettings()
  2. ChannelService.bootstrapChannels()
  3. ProductTypeService.bootstrapProductType() (loop)
  4. PageTypeService.bootstrapPageType() (loop)
  5. CategoryService.bootstrapCategories()
  6. ProductService.bootstrapProducts()
 ↓
Service → Repository → URQL → GraphQL → Saleor
 ↓
Progress Updates (BulkOperationProgress)
 ↓
Success or Error
```

**Key Insight:** Order enforces dependencies:
- Channels before products (products need channels)
- Product types before products (products need types)
- Categories before products (products may reference categories)

### 7.3 Diff Flow (Comparison)

```
Command Handler
 ↓
SaleorConfigurator.diff()
 ↓
DiffService.compare()
 ↓
┌─────────────────────────┐
│ Load Local Config       │ ← YamlConfigurationManager.load()
│ (YAML → Zod → Config)   │
└─────────────────────────┘
         +
┌─────────────────────────┐
│ Load Remote Config      │ ← Services → Repositories → GraphQL
│ (GraphQL → Config)      │
└─────────────────────────┘
         ↓
┌─────────────────────────┐
│ Comparators (Strategy)  │
│ - ChannelComparator     │
│ - ProductComparator     │
│ - CategoryComparator    │
│ - etc.                  │
└─────────────────────────┘
         ↓
Diff Summary (changes by entity type)
         ↓
Format Diff Output
         ↓
Display to User
```

**Comparator Pattern:**
```typescript
class {Entity}Comparator {
  compare(local: Entity[], remote: Entity[]): EntityDiff[] {
    // Normalize both sides
    const normalizedLocal = this.normalize(local);
    const normalizedRemote = this.normalize(remote);
    
    // Deep comparison
    return this.deepCompare(normalizedLocal, normalizedRemote);
  }
  
  private normalize(entities: Entity[]): Normalized[] { /* ... */ }
  private deepCompare(local: Normalized[], remote: Normalized[]): Diff[] { /* ... */ }
}
```

### 7.4 Introspect Flow (Remote Fetch)

```
Command Handler
 ↓
SaleorConfigurator.introspect()
 ↓
DiffService.compareForIntrospect()
 ↓
Load Remote Config Only
 ↓
┌─────────────────────────┐
│ Concurrent Fetches:     │
│ - Channels              │ ← ChannelService
│ - Product Types         │ ← ProductTypeService
│ - Products              │ ← ProductService
│ - Categories            │ ← CategoryService
│ - etc.                  │
└─────────────────────────┘
         ↓
Services → Repositories → URQL → GraphQL → Saleor
         ↓
Aggregate into Config Object
         ↓
Return to Command Handler
         ↓
Format as YAML (optional)
         ↓
Display or Save
```

**Key Insight:** Introspect uses concurrent fetches for performance, while push is sequential for dependency correctness.

---

## 8. Error Handling Architecture

### 8.1 Error Hierarchy

```
Error
 ↓
BaseError (src/lib/errors/shared/base-error.ts)
 ↓
├─ GraphQLError (src/lib/errors/graphql-error.ts)
├─ ZodValidationError (src/lib/errors/zod-validation-error.ts)
├─ ConfigurationError (src/modules/config/errors.ts)
├─ ChannelError (src/modules/channel/errors.ts)
├─ ProductError (src/modules/product/errors.ts)
└─ ... (module-specific errors)
```

### 8.2 BaseError Structure

**Location:** `src/lib/errors/shared/base-error.ts`

**Key Properties:**
```typescript
class BaseError extends Error {
  message: string;
  details?: string[];
  context?: Record<string, unknown>;
  
  // User-friendly formatting
  formatMessage(): string;
}
```

**Benefits:**
- Consistent error structure
- Optional details array for multiple errors
- Context for debugging
- User-friendly formatting

### 8.3 GraphQLError Pattern

**Location:** `src/lib/errors/graphql-error.ts`

**Factory Method:**
```typescript
GraphQLError.fromGraphQLErrors(
  errors: GraphQLError[],
  message: string
): GraphQLError
```

**Usage in Repository:**
```typescript
if (!result.data?.channelCreate?.channel) {
  throw GraphQLError.fromGraphQLErrors(
    result.error?.graphQLErrors ?? [],
    `Failed to create channel ${input.name}`
  );
}
```

**Key Insight:** Aggregates multiple GraphQL errors into single exception with user-friendly message.

### 8.4 ServiceErrorWrapper Pattern

**Location:** `src/lib/utils/error-wrapper.ts:164-167`

**Two Methods:**

#### 8.4.1 wrapServiceCall()

**Purpose:** Wrap single operation with error handling

**Pattern:**
```typescript
await ServiceErrorWrapper.wrapServiceCall(
  "Operation description",
  async () => await operation()
);
```

#### 8.4.2 wrapBatch()

**Purpose:** Wrap batch operations with error collection

**Pattern:**
```typescript
const results = await ServiceErrorWrapper.wrapBatch(
  items,
  "Operation description",
  (item) => item.id,          // Identifier function
  (item) => operation(item)   // Operation function
);

// Results structure:
{
  successes: Array<{ item, result }>,
  failures: Array<{ item, error }>
}
```

**Usage Example:**
```typescript
const results = await ServiceErrorWrapper.wrapBatch(
  channels,
  "Bootstrap channels",
  (channel) => channel.slug,
  (input) => this.getOrCreate(input)
);

if (results.failures.length > 0) {
  throw new ChannelError(
    `Failed to bootstrap ${results.failures.length} channels`,
    results.failures.map(f => `${f.item.slug}: ${f.error.message}`)
  );
}
```

**Key Benefit:** Collects ALL errors rather than failing fast, giving users complete picture.

### 8.5 Error Propagation Flow

```
Repository (GraphQLError)
 ↓
Service (Module-specific Error)
 ↓
Configurator (Re-throw with context)
 ↓
Command Handler (Catch and format)
 ↓
CLI Error Handler (User-friendly output)
 ↓
Exit with code
```

**Pattern:**
1. **Repository**: Throw GraphQLError with API context
2. **Service**: Catch, wrap in domain error, add business context
3. **Configurator**: Let propagate or add orchestration context
4. **Command Handler**: Catch, format for CLI output
5. **CLI**: Handle globally, show user-friendly message, exit

---

## 9. Deployment Pipeline Architecture

### 9.1 Pipeline Stages

**Location:** `src/core/deployment/stages.ts`

**17 Total Stages:**
1. `validationStage` - Validate configuration
2. `attributeChoicesPreflightStage` - Preflight check for attributes
3. `shopSettingsStage` - Shop metadata/settings
4. `channelsStage` - Channels
5. `attributesStage` - Attributes
6. `productTypesStage` - Product types
7. `pageTypesStage` - Page types
8. `categoriesStage` - Categories
9. `productsStage` - Products
10. `warehousesStage` - Warehouses
11. `shippingZonesStage` - Shipping zones
12. `taxClassesStage` - Tax classes/configurations
13. `collectionsStage` - Collections
14. `menusStage` - Menus
15. `modelsStage` - Models (pages)
16. `modelTypesStage` - Model types (page types)
17. (Additional stages as needed)

### 9.2 Stage Structure

**Pattern:**
```typescript
const {entity}Stage: DeploymentStage = {
  name: "entity",
  displayName: "Entity Name",
  
  // Dependencies (must complete before this stage)
  dependencies: ["dependency1", "dependency2"],
  
  // Execution logic
  execute: async (services: ServiceContainer, config: Config) => {
    if (!config.entities || config.entities.length === 0) {
      return { skipped: true, reason: "No entities in config" };
    }
    
    await services.entity.bootstrapEntities(config.entities);
    
    return { 
      success: true, 
      count: config.entities.length 
    };
  }
};
```

**Key Components:**

#### 9.2.1 Dependencies

**Purpose:** Ensures stages execute in correct order

**Example:**
```typescript
const productsStage = {
  name: "products",
  dependencies: ["channels", "productTypes", "categories"],
  // ...
};
```

**Why:** Products need channels, types, and categories to exist first.

#### 9.2.2 Conditional Execution

**Pattern:**
```typescript
if (!config.entities || config.entities.length === 0) {
  return { skipped: true, reason: "No entities in config" };
}
```

**Benefit:** Skips stages when no relevant configuration exists.

### 9.3 Pipeline Execution

**Location:** `src/core/deployment/pipeline.ts`

**Flow:**
```typescript
class DeploymentPipeline {
  async execute(stages: DeploymentStage[]): Promise<PipelineResult> {
    // 1. Topological sort based on dependencies
    const sortedStages = this.sortByDependencies(stages);
    
    // 2. Execute each stage sequentially
    for (const stage of sortedStages) {
      const result = await stage.execute(services, config);
      
      if (result.skipped) {
        // Log skip and continue
        continue;
      }
      
      if (!result.success) {
        // Handle failure
        throw new DeploymentError(`Stage ${stage.name} failed`);
      }
      
      // Track progress
      this.recordStageResult(stage, result);
    }
    
    // 3. Return aggregate results
    return this.buildResult();
  }
}
```

**Key Insight:** Topological sort ensures dependencies are met even if stages defined in wrong order.

### 9.4 Progress Tracking

**Location:** `src/core/deployment/progress.ts`

**Two Patterns:**

#### 9.4.1 BulkOperationProgress

**For:** Stages with many items (products, categories)

```typescript
const progress = new BulkOperationProgress(
  items.length,
  "Creating products",
  cliConsole.progress
);

progress.start();

for (const item of items) {
  try {
    await operation(item);
    progress.increment(item.name);
  } catch (error) {
    progress.addFailure(item.name, error);
  }
}

progress.complete();
```

#### 9.4.2 Simple Progress

**For:** Single-operation stages

```typescript
cliConsole.progress.start("Updating shop settings");
try {
  await operation();
  cliConsole.progress.succeed("Shop settings updated");
} catch (error) {
  cliConsole.progress.fail("Failed to update shop settings");
  throw error;
}
```

### 9.5 Deployment Report

**Location:** `src/core/deployment/report.ts`

**Generated After Deployment:**
```typescript
{
  timestamp: "2025-01-12T10:30:00Z",
  status: "success" | "partial" | "failed",
  stages: [
    {
      name: "channels",
      status: "success",
      duration: 1234,  // ms
      itemsProcessed: 3,
      errors: []
    },
    // ...
  ],
  summary: {
    totalStages: 17,
    successful: 15,
    skipped: 2,
    failed: 0,
    totalDuration: 45678
  }
}
```

**Saved To:** `deployment-report-{timestamp}.json`

---

## 10. Diff Engine Architecture

### 10.1 DiffService Structure

**Location:** `src/core/diff/service.ts:59-553`

**Key Components:**
```typescript
class DiffService {
  constructor(
    private services: ServiceContainer,
    config?: DiffServiceConfig
  )
  
  private comparators: ComparatorRegistry;
  
  // Main operations
  async compare(): Promise<DiffSummary>
  async compareForIntrospect(): Promise<IntrospectResult>
  async diffForIntrospectWithFormatting(): Promise<FormattedDiff>
  
  // Internal operations
  private async loadLocalConfiguration(): Promise<Config>
  private async loadRemoteConfiguration(): Promise<Config>
  private async performComparisons(): Promise<ComparisonResults>
  private async executeConcurrently<T>(...): Promise<T[]>
}
```

### 10.2 Comparator Pattern

**Strategy Pattern Implementation:**

```typescript
interface Comparator<T> {
  compare(local: T[], remote: T[]): EntityDiff[];
  normalize?(entity: T): Normalized;
}
```

**Example Comparator:**
```typescript
class ChannelComparator implements Comparator<Channel> {
  compare(local: Channel[], remote: Channel[]): ChannelDiff[] {
    // 1. Normalize both sides (remove IDs, sort, etc.)
    const normalizedLocal = local.map(c => this.normalize(c));
    const normalizedRemote = remote.map(c => this.normalize(c));
    
    // 2. Find additions (in local, not in remote)
    const additions = this.findAdditions(normalizedLocal, normalizedRemote);
    
    // 3. Find deletions (in remote, not in local)
    const deletions = this.findDeletions(normalizedLocal, normalizedRemote);
    
    // 4. Find modifications (in both, but different)
    const modifications = this.findModifications(normalizedLocal, normalizedRemote);
    
    return { additions, deletions, modifications };
  }
  
  private normalize(channel: Channel): NormalizedChannel {
    return {
      slug: channel.slug,
      name: channel.name,
      currencyCode: channel.currencyCode,
      // Omit: id, timestamps, etc.
    };
  }
}
```

**Key Insight:** Normalization removes fields that shouldn't affect comparison (IDs, timestamps).

### 10.3 Comparator Registry

**Location:** `src/core/diff/service.ts:294-311`

**Pattern:**
```typescript
private createComparators(): ComparatorRegistry {
  return {
    channel: new ChannelComparator(),
    productType: new ProductTypeComparator(),
    product: new ProductComparator(),
    category: new CategoryComparator(),
    collection: new CollectionComparator(),
    menu: new MenuComparator(),
    shippingZone: new ShippingZoneComparator(),
    warehouse: new WarehouseComparator(),
    taxClass: new TaxClassComparator(),
    pageType: new PageTypeComparator(),
    model: new ModelComparator(),
  };
}
```

**Usage:**
```typescript
const channelDiff = this.comparators.channel.compare(
  localConfig.channels,
  remoteConfig.channels
);
```

### 10.4 Concurrent Comparison Execution

**Location:** `src/core/diff/service.ts:500-519`

**Pattern:**
```typescript
private async executeConcurrently<T>(
  operations: Array<() => Promise<T>>
): Promise<T[]> {
  const maxConcurrent = this.config.maxConcurrentComparisons ?? 5;
  
  const results: T[] = [];
  
  for (let i = 0; i < operations.length; i += maxConcurrent) {
    const batch = operations.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(batch.map(op => op()));
    results.push(...batchResults);
  }
  
  return results;
}
```

**Usage:**
```typescript
const [localConfig, remoteConfig] = await this.executeConcurrently([
  () => this.loadLocalConfiguration(),
  () => this.loadRemoteConfiguration()
]);
```

**Key Insight:** Loads local and remote concurrently for performance, compares sequentially for simplicity.

### 10.5 Diff Output Formatting

**Location:** `src/core/diff/formatter.ts` (assumed)

**Pattern:**
```typescript
function formatDiff(summary: DiffSummary): string {
  const sections: string[] = [];
  
  // For each entity type
  for (const [entityType, diff] of Object.entries(summary.entities)) {
    if (diff.additions.length > 0) {
      sections.push(formatAdditions(entityType, diff.additions));
    }
    
    if (diff.deletions.length > 0) {
      sections.push(formatDeletions(entityType, diff.deletions));
    }
    
    if (diff.modifications.length > 0) {
      sections.push(formatModifications(entityType, diff.modifications));
    }
  }
  
  return sections.join("\n\n");
}
```

**Output Format:**
```
📦 Channels
  + Add: "new-channel"
  - Delete: "old-channel"
  ~ Modify: "existing-channel"
    • name: "Old Name" → "New Name"
    • currencyCode: "USD" → "EUR"

🛍️ Products
  + Add: 3 products
  ~ Modify: 2 products
```

---

## 11. Critical Architectural Patterns

### 11.1 Repository Pattern Benefits

**Why:**
- **Single Source**: All GraphQL access through repositories
- **Type Safety**: gql.tada ensures compile-time type checking
- **Error Handling**: Consistent dual error checking pattern
- **Testability**: Easy to mock repositories in tests
- **Caching**: Centralized cache management

**Example Benefit:**
```typescript
// ❌ BAD: Direct GraphQL in service
class ProductService {
  async getProduct(id: string) {
    const result = await this.client.query(getProductQuery, { id });
    // Duplicate error handling everywhere
  }
}

// ✅ GOOD: Repository pattern
class ProductService {
  async getProduct(id: string) {
    return await this.repository.getProductById(id);
    // Error handling in repository
  }
}
```

### 11.2 Factory Pattern Benefits

**Why:**
- **Encapsulation**: Hides complex initialization
- **Consistency**: Single way to create configurators
- **Flexibility**: Can add options without changing callers
- **Testing**: Easy to create test instances

**Example:**
```typescript
// ❌ BAD: Manual construction in every command
const client = createClient(token, url);
const services = ServiceComposer.compose(client, configPath);
const configurator = new SaleorConfigurator(services);

// ✅ GOOD: Factory pattern
const configurator = createConfigurator({ url, token, config });
```

### 11.3 Service Layer Benefits

**Why:**
- **Business Logic**: Separated from infrastructure (GraphQL)
- **Orchestration**: Bootstrap methods orchestrate multiple operations
- **Error Context**: Adds business context to errors
- **Reusability**: Same service methods for push, diff, introspect

**Example:**
```typescript
// Service provides business logic
class ChannelService {
  async bootstrapChannels(inputs: ChannelInput[]): Promise<Channel[]> {
    // Orchestrates: validate → getOrCreate → handle errors
    // Repository just does GraphQL
  }
  
  async getOrCreate(input: ChannelInput): Promise<Channel> {
    // Business logic: try find, update if exists, create if not
    // Repository just does GraphQL queries/mutations
  }
}
```

### 11.4 Dependency Injection Benefits

**Why:**
- **Loose Coupling**: Services don't create dependencies
- **Testability**: Easy to inject mocks
- **Shared Instances**: Cache-enabled services shared
- **Lifecycle Management**: Container manages all services

**Example:**
```typescript
// ❌ BAD: Tight coupling
class ProductService {
  private repository = new ProductRepository(/* need client here */);
  private channelService = new ChannelService(/* need repo here */);
}

// ✅ GOOD: Dependency injection
class ProductService {
  constructor(
    private repository: ProductRepository,
    resolvers: {
      getChannelIdBySlug: (slug: string) => Promise<string>
    }
  ) {}
}
```

### 11.5 Error Wrapping Benefits

**Why:**
- **Consistency**: All errors follow same structure
- **Context**: Each layer adds relevant context
- **User-Friendly**: BaseError formats for CLI output
- **Debugging**: Full error chain preserved in logs

**Example:**
```typescript
// Repository layer
throw GraphQLError.fromGraphQLErrors(
  result.error?.graphQLErrors ?? [],
  `Failed to create channel ${input.name}`
);

// Service layer catches and wraps
try {
  return await this.repository.createChannel(input);
} catch (error) {
  throw new ChannelError(
    `Bootstrap failed for channel ${input.slug}`,
    [error.message]
  );
}
```

---

## 12. Architecture Trade-offs

### 12.1 Sequential vs Parallel Execution

**Current: Sequential**

**Pros:**
- Enforces dependencies naturally
- Simpler error handling
- Predictable execution order
- Easier to debug

**Cons:**
- Slower for independent operations
- No parallelization benefits

**When to Use Parallel:**
- Introspect (fetching remote config)
- Comparisons (independent comparisons)
- Read-only operations

**When to Use Sequential:**
- Deployment (dependencies matter)
- Write operations (order matters)
- Error recovery important

### 12.2 GetOrCreate vs Strict Create

**Current: GetOrCreate (idempotent)**

**Pros:**
- Re-runnable deployments
- No duplicate errors
- Simpler for users

**Cons:**
- Slower (extra query)
- May mask issues
- Updates existing (could be unexpected)

**When to Use GetOrCreate:**
- Bootstrap operations
- Initial deployment
- Development environments

**When to Use Strict Create:**
- Production deployments (with strict mode)
- When duplicates indicate problems

### 12.3 Single vs Multiple Configurators

**Current: Single SaleorConfigurator**

**Pros:**
- Simple API
- Single entry point
- Shared service container

**Cons:**
- Large class (multiple responsibilities)
- Could be split

**Potential Split:**
```typescript
// Future consideration
class DeploymentConfigurator {
  async push(): Promise<void>
}

class DiffConfigurator {
  async diff(): Promise<DiffResult>
  async introspect(): Promise<Config>
}
```

### 12.4 Two-Phase Service Construction

**Current: Services first, then DiffService**

**Why:**
- Prevents circular dependency (DiffService needs services, some services might need DiffService in future)
- Clean separation of concerns
- Explicit dependency graph

**Alternative:**
- Lazy initialization (complex)
- Separate containers (more complex)

**Decision:** Current approach is cleanest for the scale of the project.

---

## 13. Development Workflows with Architecture

### 13.1 Adding a New Entity Type

**Steps:**

1. **Schema (Zod validation)**
   - Add to `src/modules/config/schema/schema.ts`
   - Define `{entity}Schema` and `{entity}CreateSchema`

2. **GraphQL Queries/Mutations**
   - Add to repository file
   - Use `graphql()` from gql.tada
   - Leverage schema.graphql for types

3. **Repository**
   - Create `{Entity}Repository` class
   - Implement CRUD methods
   - Use dual error checking pattern

4. **Service**
   - Create `{Entity}Service` class
   - Inject repository in constructor
   - Implement `bootstrap{Entities}()` method
   - Implement `getOrCreate()` pattern

5. **ServiceComposer**
   - Add repository to repositories object
   - Add service to services object
   - Handle dependencies in service construction

6. **Comparator**
   - Create `{Entity}Comparator` class
   - Implement `compare()` method
   - Implement `normalize()` method
   - Add to comparator registry

7. **Deployment Stage**
   - Create `{entity}Stage` in `stages.ts`
   - Define dependencies
   - Implement execute logic
   - Add to `getAllStages()`

8. **Configurator.push()**
   - Add entity deployment logic
   - Place in correct order (dependencies)
   - Add progress tracking

9. **Tests**
   - Repository tests (GraphQL mocking)
   - Service tests (repository mocking)
   - Comparator tests (normalization)
   - Integration tests (full flow)

### 13.2 Adding a New Command

**Steps:**

1. **Schema**
   - Create `{Command}CommandArgs` type
   - Create `{command}CommandSchema` (Zod)
   - Extend `baseCommandArgsSchema` if needed

2. **Command Handler**
   - Create `src/commands/{command}.ts`
   - Implement `{Command}CommandHandler` class
   - Implement `execute()` method
   - Create wrapper `handle{Command}()` function

3. **Command Config**
   - Create `{command}CommandConfig`
   - Define name, description, schema, handler
   - Add examples

4. **Register Command**
   - Add to `src/commands/index.ts`
   - Export config

5. **Implementation**
   - Use `createConfigurator()` to get configurator
   - Call appropriate configurator method
   - Format output
   - Handle errors

6. **Tests**
   - Command handler tests
   - Integration tests with mocked configurator

### 13.3 Debugging a GraphQL Error

**Flow:**

1. **Identify Error Location**
   - Check error message (includes operation name)
   - Example: "Failed to create channel example-channel"

2. **Find Repository Method**
   ```bash
   find_symbol("{Module}Repository/create{Entity}", 
               relative_path="src/modules/{module}")
   ```

3. **Check GraphQL Query/Mutation**
   - Review the GraphQL operation
   - Check if schema has changed

4. **Check Dual Error Pattern**
   ```typescript
   if (!result.data?.{mutation}.{entity}) {
     throw GraphQLError.fromGraphQLErrors(
       result.error?.graphQLErrors ?? [],
       `Failed to ...`
     );
   }
   ```

5. **Check Saleor API Response**
   - Use LOG_LEVEL=debug
   - Check `result.error` (GraphQL errors)
   - Check `result.data.{mutation}.errors` (business errors)

6. **Fix Issue**
   - Update GraphQL query/mutation
   - Regenerate types: `pnpm introspect`
   - Fix error handling
   - Add test case

### 13.4 Adding Caching to a Service

**Example: Category name resolution**

**Pattern:**

1. **Add Cache Property**
   ```typescript
   class CategoryService {
     private categoryCache = new Map<string, string>();  // slug → id
   ```

2. **Add Cached Method**
   ```typescript
   async getCategoryIdBySlugCached(slug: string): Promise<string> {
     if (this.categoryCache.has(slug)) {
       return this.categoryCache.get(slug)!;
     }
     
     const id = await this.getCategoryIdBySlug(slug);
     this.categoryCache.set(slug, id);
     return id;
   }
   ```

3. **Use in Dependent Services**
   ```typescript
   // In ServiceComposer.compose()
   const categoryService = new CategoryService(repositories.category);
   
   const productService = new ProductService(repositories.product, {
     getCategoryIdBySlug: async (slug) => 
       await categoryService.getCategoryIdBySlugCached(slug)
   });
   ```

**Key Insight:** Cache lives for lifetime of service container (entire command execution).

---

## 14. Performance Characteristics

### 14.1 Deployment Performance

**Bottlenecks:**
1. **Sequential Execution**: No parallelization
2. **Network Latency**: Each GraphQL call waits for response
3. **Large Batch Operations**: Products with many variants

**Optimization Strategies:**
1. **Batch Mutations**: Use Saleor batch APIs where available
2. **Caching**: Resolve references once, cache result
3. **Selective Deployment**: Deploy only changed entities (future)

**Typical Timings:**
- Shop settings: ~100ms
- Create channel: ~200ms each
- Create product type: ~500ms each (with attributes)
- Create product: ~300ms each (simple), ~1s+ (with variants/media)
- Full deployment (100 products): ~2-5 minutes

### 14.2 Diff Performance

**Bottlenecks:**
1. **Remote Fetch**: Multiple GraphQL queries
2. **Large Product Lists**: Deep comparison expensive
3. **Normalization**: Complex objects take time

**Optimization Strategies:**
1. **Concurrent Fetching**: Load local and remote in parallel
2. **Selective Comparison**: Compare only specified sections
3. **Shallow Comparison**: Compare IDs first, deep-compare only changes

**Typical Timings:**
- Load local config: ~50ms
- Load remote config: ~2-5s (depends on data size)
- Comparison: ~100-500ms (depends on complexity)
- Total diff: ~3-6s

### 14.3 Introspect Performance

**Bottlenecks:**
1. **Concurrent Query Limit**: URQL client limits parallel queries
2. **Large Data Sets**: Products with hundreds of variants
3. **Pagination**: Large lists require multiple queries

**Optimization Strategies:**
1. **Concurrent Fetching**: Fetch different entity types in parallel
2. **Pagination Control**: Fetch only needed page size
3. **Field Selection**: Request only needed fields

**Typical Timings:**
- Fetch channels: ~200ms
- Fetch product types: ~500ms
- Fetch products: ~2-10s (depends on count)
- Total introspect: ~3-15s

---

## 15. Testing Strategy

### 15.1 Repository Tests

**Pattern:**
```typescript
describe("ChannelRepository", () => {
  let repository: ChannelRepository;
  let mockClient: MockedClient;
  
  beforeEach(() => {
    mockClient = createMockClient();
    repository = new ChannelRepository(mockClient);
  });
  
  it("should create channel successfully", async () => {
    // Arrange: Mock GraphQL response
    mockClient.mutation.mockResolvedValue({
      data: {
        channelCreate: {
          channel: { id: "1", slug: "test", name: "Test" },
          errors: []
        }
      }
    });
    
    // Act
    const result = await repository.createChannel(input);
    
    // Assert
    expect(result).toMatchObject({ slug: "test" });
    expect(mockClient.mutation).toHaveBeenCalledWith(
      createChannelMutation,
      { input }
    );
  });
  
  it("should handle GraphQL errors", async () => {
    // Arrange: Mock error response
    mockClient.mutation.mockResolvedValue({
      error: {
        graphQLErrors: [{ message: "Channel exists" }]
      }
    });
    
    // Act & Assert
    await expect(repository.createChannel(input))
      .rejects.toThrow(GraphQLError);
  });
});
```

### 15.2 Service Tests

**Pattern:**
```typescript
describe("ChannelService", () => {
  let service: ChannelService;
  let mockRepository: MockedRepository;
  
  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new ChannelService(mockRepository);
  });
  
  it("should bootstrap channels successfully", async () => {
    // Arrange
    mockRepository.getChannelBySlug.mockResolvedValue(null);
    mockRepository.createChannel.mockResolvedValue(channel);
    
    // Act
    const result = await service.bootstrapChannels([input]);
    
    // Assert
    expect(result).toHaveLength(1);
    expect(mockRepository.createChannel).toHaveBeenCalled();
  });
  
  it("should handle partial failures in batch", async () => {
    // Arrange: One succeeds, one fails
    mockRepository.createChannel
      .mockResolvedValueOnce(channel1)
      .mockRejectedValueOnce(new Error("Failed"));
    
    // Act & Assert
    await expect(service.bootstrapChannels([input1, input2]))
      .rejects.toThrow(ChannelError);
  });
});
```

### 15.3 Integration Tests

**Pattern:**
```typescript
describe("Full Deployment Flow", () => {
  let configurator: SaleorConfigurator;
  
  beforeEach(async () => {
    // Use test Saleor instance or mocked client
    configurator = createConfigurator({
      url: TEST_URL,
      token: TEST_TOKEN,
      config: TEST_CONFIG_PATH
    });
  });
  
  it("should deploy full configuration", async () => {
    // Arrange: Test config with all entity types
    
    // Act
    await configurator.push();
    
    // Assert: Verify entities created in Saleor
    const channels = await fetchChannelsFromSaleor();
    expect(channels).toHaveLength(2);
  });
  
  it("should handle missing dependencies gracefully", async () => {
    // Arrange: Config with product but no product type
    
    // Act & Assert
    await expect(configurator.push())
      .rejects.toThrow(/product type.*not found/i);
  });
});
```

### 15.4 Comparator Tests

**Pattern:**
```typescript
describe("ChannelComparator", () => {
  let comparator: ChannelComparator;
  
  beforeEach(() => {
    comparator = new ChannelComparator();
  });
  
  it("should detect additions", () => {
    const local = [channel1, channel2];
    const remote = [channel1];
    
    const diff = comparator.compare(local, remote);
    
    expect(diff.additions).toHaveLength(1);
    expect(diff.additions[0].slug).toBe(channel2.slug);
  });
  
  it("should detect modifications", () => {
    const local = [{ ...channel1, name: "New Name" }];
    const remote = [channel1];
    
    const diff = comparator.compare(local, remote);
    
    expect(diff.modifications).toHaveLength(1);
    expect(diff.modifications[0].changes).toContainEqual({
      field: "name",
      oldValue: channel1.name,
      newValue: "New Name"
    });
  });
  
  it("should normalize before comparing", () => {
    const local = [{ ...channel1, id: "different-id" }];
    const remote = [channel1];
    
    const diff = comparator.compare(local, remote);
    
    // Should not detect difference (IDs ignored)
    expect(diff.modifications).toHaveLength(0);
  });
});
```

---

## 16. Common Pitfalls & Solutions

### 16.1 Circular Dependencies

**Problem:**
```typescript
// DiffService needs services
class DiffService {
  constructor(services: ServiceContainer) {}
}

// ServiceContainer needs DiffService
interface ServiceContainer {
  diffService: DiffService;
  // ...
}
```

**Solution:** Two-phase construction
```typescript
// 1. Create services without diffService
const services = { /* all services */ } as Omit<ServiceContainer, "diffService">;

// 2. Create diffService with services
const diffService = new DiffService(services as ServiceContainer);

// 3. Merge
return { ...services, diffService };
```

### 16.2 Missing Error Handling

**Problem:**
```typescript
// ❌ Only checks result.error
if (result.error) {
  throw new Error(result.error.message);
}
```

**Solution:** Dual error checking
```typescript
// ✅ Checks both result.error AND data
if (!result.data?.mutation.entity) {
  throw GraphQLError.fromGraphQLErrors(
    result.error?.graphQLErrors ?? [],
    "User-friendly message"
  );
}
```

### 16.3 Forgetting Dependencies

**Problem:**
```typescript
// Products deployed before product types exist
await productService.bootstrapProducts(config.products);  // ❌ Fails!
```

**Solution:** Correct order in push()
```typescript
// 1. Product types first
if (config.productTypes) {
  await productTypeService.bootstrapProductTypes(config.productTypes);
}

// 2. Then products
if (config.products) {
  await productService.bootstrapProducts(config.products);
}
```

### 16.4 Cache Invalidation

**Problem:**
```typescript
// Cache never invalidated, stale data used
private cache = new Map<string, string>();
```

**Solution:** Cache lives for command execution only
```typescript
// Cache is instance property of service
// Service is created per command in ServiceComposer.compose()
// When command ends, service is garbage collected
// Next command gets fresh service with empty cache
```

**Key Insight:** No manual cache invalidation needed, lifecycle handles it.

### 16.5 Not Using Factory Pattern

**Problem:**
```typescript
// ❌ Manual construction everywhere
const client = createClient(token, url);
const services = ServiceComposer.compose(client, configPath);
const configurator = new SaleorConfigurator(services);
```

**Solution:** Use factory
```typescript
// ✅ Factory pattern
const configurator = createConfigurator({ url, token, config });
```

---

## 17. Future Architecture Considerations

### 17.1 Parallelization Opportunities

**Current:** Sequential deployment

**Future:** Parallel deployment of independent entities

**Example:**
```typescript
// Channels and warehouses are independent
await Promise.all([
  channelService.bootstrapChannels(config.channels),
  warehouseService.bootstrapWarehouses(config.warehouses)
]);
```

**Challenges:**
- Dependency tracking
- Error handling (one fails, what happens to others?)
- Progress tracking

### 17.2 Incremental Deployment

**Current:** Deploy all entities every time

**Future:** Deploy only changed entities

**Pattern:**
```typescript
async pushIncremental() {
  // 1. Run diff
  const diff = await this.diff();
  
  // 2. Deploy only additions and modifications
  for (const change of diff.summary.changes) {
    if (change.type === "addition" || change.type === "modification") {
      await this.deployEntity(change.entity, change.data);
    }
  }
  
  // 3. Handle deletions (if requested)
  if (options.allowDeletions) {
    for (const deletion of diff.summary.deletions) {
      await this.deleteEntity(deletion.entity, deletion.id);
    }
  }
}
```

**Benefits:**
- Faster deployments
- Less API load
- Clearer change tracking

**Challenges:**
- Dependency updates (entity changes dependencies)
- Deletion safety (accidental deletions)

### 17.3 Rollback Support

**Current:** No rollback mechanism

**Future:** Snapshot + rollback capability

**Pattern:**
```typescript
async pushWithRollback() {
  // 1. Create snapshot of current state
  const snapshot = await this.introspect();
  
  try {
    // 2. Deploy changes
    await this.push();
  } catch (error) {
    // 3. On failure, rollback to snapshot
    await this.rollbackToSnapshot(snapshot);
    throw error;
  }
}
```

**Challenges:**
- Partial deployment failures (which entities to rollback?)
- External references (can't delete if referenced)
- Saleor API limitations (some operations not reversible)

### 17.4 Multi-Environment Support

**Current:** One environment per command

**Future:** Sync across environments

**Pattern:**
```typescript
async syncEnvironments(source: Config, targets: Environment[]) {
  // 1. Introspect source environment
  const sourceConfig = await this.introspect(source);
  
  // 2. Deploy to each target
  for (const target of targets) {
    await this.deployToEnvironment(sourceConfig, target);
  }
}
```

**Use Cases:**
- Dev → Staging → Production promotion
- Multi-region deployments
- Tenant management

---

## 18. Key Takeaways

### 18.1 For New Developers

**Understand These First:**
1. **CLI Flow**: `bin/cli.mjs` → `main.ts` → `command.ts` → handler
2. **Factory Pattern**: Always use `createConfigurator()`, never manual construction
3. **Repository Pattern**: GraphQL access ONLY through repositories
4. **Dual Error Checking**: Check both `result.error` AND `result.data`
5. **Service Bootstrap**: Use `bootstrap{Entities}()` for deployment logic
6. **Dependency Order**: Channels before products, product types before products

**Where to Start:**
1. Read `src/commands/diff.ts` - Simplest command
2. Read `src/modules/channel/` - Simplest module
3. Read `src/core/configurator.ts` - Main orchestrator
4. Read `src/core/service-container.ts` - Dependency injection

### 18.2 For Adding Features

**Follow These Patterns:**
1. **Repository**: GraphQL operations with dual error checking
2. **Service**: Business logic with error wrapping
3. **Comparator**: Normalize → compare → report differences
4. **Stage**: Define dependencies, implement execute()
5. **Tests**: Repository → Service → Integration

**Check These Files:**
1. `src/modules/config/schema/schema.ts` - Add Zod schema
2. `src/core/service-container.ts` - Add to DI container
3. `src/core/configurator.ts` - Add to push() method
4. `src/core/deployment/stages.ts` - Add deployment stage
5. `src/core/diff/service.ts` - Add comparator

### 18.3 For Debugging

**Trace These Flows:**
1. **Error Path**: Repository → Service → Configurator → Handler → CLI
2. **Data Flow**: YAML → Zod → Service → Repository → GraphQL → Saleor
3. **Dependency Chain**: ServiceComposer → Services → Repositories → Client

**Use These Tools:**
1. `LOG_LEVEL=debug` for detailed logging
2. Serena: Find symbols by name path
3. `pnpm test {module}` for targeted testing
4. GraphQL playground for API testing

### 18.4 For Optimization

**Focus Areas:**
1. **Caching**: Add cached resolvers for frequently-accessed data
2. **Parallelization**: Use `Promise.all()` for independent operations
3. **Selective Operations**: Skip unchanged entities
4. **Batch Operations**: Use Saleor batch APIs where available

**Measure These:**
1. GraphQL query count (fewer is better)
2. Sequential vs parallel execution time
3. Memory usage (large config files)
4. Error recovery time

---

## 19. Architecture Diagrams

### 19.1 Complete System Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                                USER                                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   bin/cli.mjs   │
                    │  (Entry Point)  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ src/cli/main.ts │
                    │   runCLI()      │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                ▼                         ▼
       ┌─────────────────┐      ┌─────────────────┐
       │  Commander.js   │      │  Error Handler  │
       │    Program      │      │  (Global)       │
       └────────┬────────┘      └─────────────────┘
                │
                ▼
       ┌─────────────────┐
       │ Command Handler │
       │   (diff/push/   │
       │   introspect)   │
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │ createConfigurator()│
       │   (Factory)     │
       └────────┬────────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
┌──────────────┐ ┌─────────────┐
│ URQL Client  │ │ Service     │
│  Creation    │ │ Composer    │
└──────────────┘ └──────┬──────┘
                        │
            ┌───────────┼───────────┐
            │           │           │
            ▼           ▼           ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │Repository│ │ Services │ │   Diff   │
    │  Layer   │ │  Layer   │ │ Service  │
    └────┬─────┘ └────┬─────┘ └────┬─────┘
         │            │            │
         └────────────┼────────────┘
                      │
                      ▼
              ┌──────────────┐
              │ URQL Client  │
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │   GraphQL    │
              │    (HTTPS)   │
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │   SALEOR     │
              │   API        │
              └──────────────┘
```

### 19.2 Service Container Construction

```
ServiceComposer.compose()
        │
        ├─► 1. Create Repositories
        │   ├─ AttributeRepository(client)
        │   ├─ ChannelRepository(client)
        │   ├─ ProductRepository(client)
        │   └─ ... (14 total)
        │
        ├─► 2. Create Cache-Enabled Services
        │   ├─ ChannelService(repo)
        │   └─ ProductService(repo, resolvers)
        │
        ├─► 3. Create Services (without DiffService)
        │   ├─ AttributeService(repo)
        │   ├─ ProductTypeService(repo, attrService)
        │   ├─ CategoryService(repo)
        │   └─ ... (15 total)
        │
        ├─► 4. Create DiffService
        │   └─ DiffService(services)
        │
        └─► 5. Return ServiceContainer
            └─ { ...services, diffService }
```

### 19.3 Deployment Flow

```
SaleorConfigurator.push()
        │
        ├─► Load Config (YAML → Zod)
        │
        ├─► Shop Settings
        │   └─ ShopService.updateSettings()
        │
        ├─► Channels (Dependency: None)
        │   └─ ChannelService.bootstrapChannels()
        │
        ├─► Product Types (Dependency: None)
        │   └─ ProductTypeService.bootstrapProductType() × N
        │       ├─ Progress tracking
        │       └─ Individual error handling
        │
        ├─► Page Types (Dependency: None)
        │   └─ PageTypeService.bootstrapPageType() × N
        │
        ├─► Categories (Dependency: None)
        │   └─ CategoryService.bootstrapCategories()
        │
        └─► Products (Dependency: Channels, Types, Categories)
            └─ ProductService.bootstrapProducts()
                ├─ Resolve channel IDs (cached)
                ├─ Resolve product type IDs
                ├─ Resolve category IDs
                └─ Create products with variants
```

### 19.4 Diff Flow

```
SaleorConfigurator.diff()
        │
        └─► DiffService.compare()
                │
                ├─► Load Local
                │   ├─ YamlConfigurationManager.load()
                │   ├─ Zod Validation
                │   └─ Return Config
                │
                ├─► Load Remote (Concurrent)
                │   ├─ ChannelService.getChannels()
                │   ├─ ProductService.getProducts()
                │   ├─ CategoryService.getCategories()
                │   └─ ... (all entity types)
                │
                └─► Compare (Sequential)
                    ├─ ChannelComparator.compare()
                    ├─ ProductComparator.compare()
                    ├─ CategoryComparator.compare()
                    └─ ... (all entity types)
                        │
                        └─► For each comparator:
                            ├─ Normalize local
                            ├─ Normalize remote
                            ├─ Find additions
                            ├─ Find deletions
                            ├─ Find modifications
                            └─ Return diff
```

---

## 20. Quick Reference

### 20.1 Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `bin/cli.mjs` | CLI entry point | 10 |
| `src/cli/main.ts` | CLI bootstrap | 153 |
| `src/cli/command.ts` | Command creation | 230 |
| `src/core/configurator.ts` | Main orchestrator | 181 |
| `src/core/service-container.ts` | DI container | 128 |
| `src/core/factory.ts` | Factory functions | ~50 |
| `src/core/diff/service.ts` | Diff engine | 553 |
| `src/core/deployment/pipeline.ts` | Deployment orchestration | ~500 |
| `src/core/deployment/stages.ts` | Deployment stages | ~400 |

### 20.2 Key Classes

| Class | Purpose | Location |
|-------|---------|----------|
| `SaleorConfigurator` | Main orchestrator | `src/core/configurator.ts` |
| `ServiceComposer` | DI composition | `src/core/service-container.ts` |
| `DiffService` | Configuration comparison | `src/core/diff/service.ts` |
| `DeploymentPipeline` | Deployment orchestration | `src/core/deployment/pipeline.ts` |
| `{Module}Service` | Business logic | `src/modules/{module}/{module}-service.ts` |
| `{Module}Repository` | GraphQL access | `src/modules/{module}/repository.ts` |
| `{Entity}Comparator` | Diff logic | `src/core/diff/comparators/{entity}-comparator.ts` |

### 20.3 Key Functions

| Function | Purpose | Location |
|----------|---------|----------|
| `runCLI()` | CLI entry | `src/cli/main.ts:139` |
| `createCommand()` | Command factory | `src/cli/command.ts:172` |
| `createConfigurator()` | Configurator factory | `src/core/configurator.ts:183` |
| `ServiceComposer.compose()` | Service composition | `src/core/service-container.ts:54` |
| `bootstrap{Entities}()` | Deployment logic | Service classes |
| `getOrCreate()` | Idempotent creation | Service classes |

### 20.4 Key Patterns

| Pattern | Purpose | Where Used |
|---------|---------|------------|
| Repository | GraphQL access | All modules |
| Service Layer | Business logic | All modules |
| Factory | Object creation | `src/core/factory.ts` |
| Strategy | Comparators | `src/core/diff/` |
| Dependency Injection | Loose coupling | `ServiceContainer` |
| Error Wrapping | Consistent errors | All layers |
| Two-Phase Construction | Circular dependency | `ServiceComposer` |
| Bootstrap | Idempotent deployment | All services |

---

**Last Updated:** 2025-01-12
**Version:** 1.0
**Related Memories:** 
- `project_overview` - High-level project information
- `codebase_architecture_map` - File structure and module reference
- `code_style_and_conventions` - Coding standards and patterns
