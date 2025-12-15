# Deployment Pipeline Architecture

**Deep dive into the 17-stage deployment system that orchestrates Saleor configuration**

## Table of Contents

1. [Overview](#overview)
2. [Pipeline Architecture](#pipeline-architecture)
3. [17-Stage Execution Order](#17-stage-execution-order)
4. [Stage Dependencies](#stage-dependencies)
5. [DeploymentStage Interface](#deploymentstage-interface)
6. [Stage Patterns](#stage-patterns)
7. [Pipeline Classes](#pipeline-classes)
8. [Progress Tracking](#progress-tracking)
9. [Metrics Collection](#metrics-collection)
10. [Result Collection](#result-collection)
11. [Error Handling](#error-handling)
12. [Stage Skipping Logic](#stage-skipping-logic)
13. [Execution Flow](#execution-flow)
14. [Serena Navigation](#serena-navigation)
15. [Best Practices](#best-practices)

---

## Overview

The **Deployment Pipeline** is a sequential execution system that deploys configuration changes to Saleor in a specific order respecting entity dependencies. It consists of **17 stages**, each responsible for deploying a specific entity type or performing a specific operation.

### Purpose

- **Sequential Deployment** - Execute stages in dependency order
- **Conditional Execution** - Skip stages when no changes detected
- **Progress Tracking** - Report progress to user with spinners
- **Error Handling** - Gracefully handle partial failures
- **Metrics Collection** - Track timing and entity counts
- **Result Reporting** - Provide detailed deployment summary

### Key Design Goals

1. **Correctness**: Deploy in correct dependency order
2. **Efficiency**: Skip unnecessary stages
3. **Resilience**: Continue on partial failures where possible
4. **Observability**: Track progress and metrics
5. **User Experience**: Clear progress indicators and error messages

### File Structure

```
src/core/deployment/
├── stages.ts                         # 17 deployment stages
├── types.ts                          # Type definitions
├── pipeline.ts                       # Basic pipeline
├── enhanced-pipeline.ts              # Enhanced pipeline with result collection
├── progress.ts                       # Progress indicators
├── metrics.ts                        # Metrics collection
├── results.ts                        # Result collection and reporting
├── errors.ts                         # Deployment-specific errors
├── report.ts                         # Deployment report generation
├── summary.ts                        # Summary formatting
└── cleanup-advisor.ts                # Cleanup recommendations
```

---

## Pipeline Architecture

### High-Level Flow

```
User runs: saleor-configurator deploy
           ↓
      Load configuration
           ↓
      Run diff (detect changes)
           ↓
      Create deployment context
           ↓
   ┌─────────────────────┐
   │ Deployment Pipeline │
   └─────────────────────┘
           ↓
   Execute 17 stages sequentially:
   1. Validation
   2. Shop Settings
   3. Tax Classes
   4. Attributes
   5. Product Types
   6. Channels
   7. Page Types
   8. Model Types
   9. Categories
   10. Collections
   11. Menus
   12. Models
   13. Warehouses
   14. Shipping Zones
   15. Attribute Choices Preflight
   16. Products
   17. (Future expansion)
           ↓
      Collect metrics
           ↓
      Generate report
           ↓
      Show results to user
```

### Key Concepts

**Stage**: A unit of deployment work (e.g., "Managing products")

**Context**: Shared deployment state passed to all stages

**Skip Logic**: Conditional execution based on diff results

**Metrics**: Timing and entity count tracking

**Results**: Success/failure tracking per entity

---

## 17-Stage Execution Order

**Location:** `src/core/deployment/stages.ts:595-614`

```typescript
export function getAllStages(): DeploymentStage[] {
  return [
    validationStage,              // 1. Validate configuration
    shopSettingsStage,            // 2. Update shop settings
    taxClassesStage,              // 3. Deploy tax classes early
    attributesStage,              // 4. Deploy attributes
    productTypesStage,            // 5. Deploy product types
    channelsStage,                // 6. Deploy channels
    pageTypesStage,               // 7. Deploy page types
    modelTypesStage,              // 8. Deploy model types
    categoriesStage,              // 9. Deploy categories
    collectionsStage,             // 10. Deploy collections
    menusStage,                   // 11. Deploy menus
    modelsStage,                  // 12. Deploy models
    warehousesStage,              // 13. Deploy warehouses
    shippingZonesStage,           // 14. Deploy shipping zones
    attributeChoicesPreflightStage, // 15. Preflight attribute choices
    productsStage,                // 16. Deploy products
  ];
}
```

### Stage Order Rationale

1. **validationStage** - Fail fast if configuration is invalid
2. **shopSettingsStage** - Set global shop settings
3. **taxClassesStage** - Tax classes referenced by other entities
4. **attributesStage** - Attributes referenced by product types
5. **productTypesStage** - Product types referenced by products
6. **channelsStage** - Channels referenced by products/channel listings
7. **pageTypesStage** - Page types referenced by models
8. **modelTypesStage** - Model types (alias for page types)
9. **categoriesStage** - Categories referenced by products
10. **collectionsStage** - Collections may reference products
11. **menusStage** - Menus may reference categories/collections
12. **modelsStage** - Models depend on model types
13. **warehousesStage** - Warehouses for inventory
14. **shippingZonesStage** - Shipping zones for fulfillment
15. **attributeChoicesPreflightStage** - Validate attribute choices before products
16. **productsStage** - Products depend on everything above

---

## Stage Dependencies

### Dependency Graph

```
validationStage (no dependencies)
  ↓
shopSettingsStage (no dependencies)
  ↓
taxClassesStage (no dependencies)
  ↓
attributesStage (no dependencies)
  ↓
productTypesStage → depends on: attributes
  ↓
channelsStage (no dependencies)
  ↓
pageTypesStage (no dependencies)
  ↓
modelTypesStage → same as pageTypesStage
  ↓
categoriesStage (no dependencies)
  ↓
collectionsStage → may depend on: products (circular, resolved via two-pass)
  ↓
menusStage → may depend on: categories, collections
  ↓
modelsStage → depends on: modelTypesStage
  ↓
warehousesStage (no dependencies)
  ↓
shippingZonesStage (no dependencies)
  ↓
attributeChoicesPreflightStage → validates: attributes
  ↓
productsStage → depends on: productTypes, channels, categories, attributes, taxClasses
```

### Critical Dependencies

**Products depend on:**
- Product Types (must exist before products)
- Channels (for channel listings)
- Categories (for product categorization)
- Attributes (for product attributes)
- Tax Classes (for tax calculation)

**Collections depend on:**
- Products (can reference products in rules)

**Menus depend on:**
- Categories (menu items can link to categories)
- Collections (menu items can link to collections)

**Models depend on:**
- Model Types (page type definitions)

---

## DeploymentStage Interface

**Location:** `src/core/deployment/types.ts:12-16`

```typescript
export interface DeploymentStage {
  readonly name: string;
  execute(context: DeploymentContext): Promise<void>;
  skip?(context: DeploymentContext): boolean;
}
```

### Properties

**name**: Human-readable stage name (e.g., "Managing products")

**execute()**: Async function that performs the deployment work

**skip()**: Optional function to conditionally skip the stage

### DeploymentContext

**Location:** `src/core/deployment/types.ts:5-10`

```typescript
export interface DeploymentContext {
  readonly configurator: SaleorConfigurator;
  readonly args: DeployCommandArgs;
  readonly summary: DiffSummary;
  readonly startTime: Date;
}
```

**Fields:**
- `configurator` - Access to services for deployment
- `args` - Command-line arguments (--include, --exclude, etc.)
- `summary` - Diff results (what entities changed)
- `startTime` - Pipeline start time

---

## Stage Patterns

### Pattern 1: Simple Entity Deployment

**Example:** Shop Settings Stage

**Location:** `src/core/deployment/stages.ts:30-50`

```typescript
export const shopSettingsStage: DeploymentStage = {
  name: "Updating shop settings",
  async execute(context) {
    try {
      const config = await context.configurator.services.configStorage.load();
      if (!config.shop) {
        logger.debug("No shop settings to update");
        return;
      }

      await context.configurator.services.shop.updateSettings(config.shop);
    } catch (error) {
      throw new Error(
        `Failed to update shop settings: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  skip(context) {
    return context.summary.results.every((r) => r.entityType !== "Shop Settings");
  },
};
```

**Pattern:**
1. Load configuration
2. Check if entity exists in config
3. Call service method to deploy
4. Wrap errors with context
5. Skip if no changes detected in diff

### Pattern 2: Batch Entity Deployment with Partial Failure Handling

**Example:** Product Types Stage

**Location:** `src/core/deployment/stages.ts:52-112`

```typescript
export const productTypesStage: DeploymentStage = {
  name: "Managing product types",
  async execute(context) {
    try {
      const config = await context.configurator.services.configStorage.load();
      if (!config.productTypes?.length) {
        logger.debug("No product types to manage");
        return;
      }

      const results = await Promise.allSettled(
        config.productTypes.map((productType) =>
          context.configurator.services.productType
            .bootstrapProductType(productType)
            .then(() => ({ name: productType.name, success: true }))
            .catch((error) => ({
              name: productType.name,
              success: false,
              error: error instanceof Error ? error : new Error(String(error)),
            }))
        )
      );

      const successes = results
        .filter(
          (r): r is PromiseFulfilledResult<{ name: string; success: true }> =>
            r.status === "fulfilled" && r.value.success === true
        )
        .map((r) => r.value.name);

      const failures = results
        .filter(
          (r): r is PromiseFulfilledResult<{ name: string; success: false; error: Error }> =>
            r.status === "fulfilled" && r.value.success === false
        )
        .map((r) => ({ entity: r.value.name, error: r.value.error }));

      if (failures.length > 0) {
        throw new StageAggregateError("Managing product types", failures, successes);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("Failed to manage product type")) {
        throw error;
      }
      throw new Error(
        `Failed to manage product types: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  skip(context) {
    // Run if product types changed OR products changed (dependency)
    const hasProductTypeChanges = context.summary.results.some(
      (r) => r.entityType === "Product Types"
    );
    const hasProductChanges = context.summary.results.some((r) => r.entityType === "Products");

    return !hasProductTypeChanges && !hasProductChanges;
  },
};
```

**Pattern:**
1. Load configuration
2. Check if entities exist in config
3. Deploy all entities with `Promise.allSettled` (parallel)
4. Separate successes and failures
5. Throw `StageAggregateError` if any failures
6. Skip based on dependency logic (run if self or dependents changed)

### Pattern 3: Dependency-Aware Skipping

**Example:** Categories Stage

**Location:** `src/core/deployment/stages.ts:369-395`

```typescript
export const categoriesStage: DeploymentStage = {
  name: "Managing categories",
  async execute(context) {
    try {
      const config = await context.configurator.services.configStorage.load();
      if (!config.categories?.length) {
        logger.debug("No categories to manage");
        return;
      }

      await context.configurator.services.category.bootstrapCategories(config.categories);
    } catch (error) {
      throw new Error(
        `Failed to manage categories: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  skip(context) {
    // Categories stage should run if:
    // 1. Categories have changes, OR
    // 2. Products have changes (since products depend on categories)
    const hasCategoryChanges = context.summary.results.some((r) => r.entityType === "Categories");
    const hasProductChanges = context.summary.results.some((r) => r.entityType === "Products");

    return !hasCategoryChanges && !hasProductChanges;
  },
};
```

**Pattern:**
1. Skip logic checks **both** self changes **and** dependent changes
2. Run stage if either self or any dependent has changes
3. Ensures dependencies are deployed even if unchanged

**Why This Matters:**
- If products changed, categories must be deployed (even if unchanged)
- Products reference categories, so categories must exist
- Prevents "category not found" errors during product deployment

### Pattern 4: Preflight Validation

**Example:** Attribute Choices Preflight Stage

**Location:** `src/core/deployment/stages.ts:522-565`

```typescript
export const attributeChoicesPreflightStage: DeploymentStage = {
  name: "Validating attribute choices",
  async execute(context) {
    const config = await context.configurator.services.configStorage.load();
    const products = config.products || [];

    // Collect all attribute values used in products
    const usedAttributeValues = new Map<string, Set<string>>();

    for (const product of products) {
      if (!product.attributes) continue;

      for (const [attributeName, value] of Object.entries(product.attributes)) {
        if (!usedAttributeValues.has(attributeName)) {
          usedAttributeValues.set(attributeName, new Set());
        }

        const values = Array.isArray(value) ? value : [value];
        for (const v of values) {
          usedAttributeValues.get(attributeName)!.add(String(v));
        }
      }
    }

    // Validate that all used attribute values exist
    const errors: string[] = [];

    for (const [attributeName, values] of usedAttributeValues.entries()) {
      const attribute = await context.configurator.services.attribute.repo.getAttributesByNames({
        names: [attributeName],
        type: "PRODUCT",
      });

      if (!attribute || attribute.length === 0) {
        errors.push(`Attribute "${attributeName}" not found`);
        continue;
      }

      const existingChoices = attribute[0].choices?.map((c) => c.name) || [];

      for (const value of values) {
        if (!existingChoices.includes(value)) {
          errors.push(`Attribute choice "${value}" not found in attribute "${attributeName}"`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Attribute validation failed:\n${errors.join("\n")}`);
    }
  },
  skip(context) {
    return context.summary.results.every((r) => r.entityType !== "Products");
  },
};
```

**Pattern:**
1. Validate before deployment (preflight)
2. Collect all used values
3. Check against existing entities
4. Fail with detailed error if validation fails
5. Prevents partial deployment failures

---

## Pipeline Classes

### DeploymentPipeline (Basic)

**Location:** `src/core/deployment/pipeline.ts:5-59`

```typescript
export class DeploymentPipeline {
  private readonly stages: DeploymentStage[] = [];
  private readonly progress = new ProgressIndicator();
  private readonly metrics = new MetricsCollector();

  addStage(stage: DeploymentStage): void {
    this.stages.push(stage);
  }

  async execute(context: DeploymentContext): Promise<DeploymentMetrics> {
    logger.info("Starting deployment pipeline", {
      stageCount: this.stages.length,
    });

    for (const stage of this.stages) {
      if (stage.skip?.(context)) {
        logger.debug(`Skipping stage: ${stage.name}`);
        continue;
      }

      await this.executeStage(stage, context);
    }

    return this.metrics.complete();
  }

  private async executeStage(stage: DeploymentStage, context: DeploymentContext): Promise<void> {
    logger.info(`Executing stage: ${stage.name}`);
    this.metrics.startStage(stage.name);

    const stopProgress = this.progress.startSpinner(stage.name);

    try {
      await stage.execute(context);
      this.progress.complete(stage.name);
    } catch (error) {
      stopProgress();
      this.progress.fail(stage.name);
      throw error;
    } finally {
      this.metrics.endStage(stage.name);
    }
  }
}
```

**Features:**
- Sequential stage execution
- Progress spinners for each stage
- Metrics collection (timing)
- Skip logic support
- Basic error handling

### EnhancedDeploymentPipeline

**Location:** `src/core/deployment/enhanced-pipeline.ts:13-132`

```typescript
export class EnhancedDeploymentPipeline {
  private readonly stages: DeploymentStage[] = [];
  private readonly progress = new ProgressIndicator();
  private readonly metrics = new MetricsCollector();
  private readonly resultCollector = new DeploymentResultCollector();

  addStage(stage: DeploymentStage): void {
    this.stages.push(stage);
  }

  async execute(
    context: DeploymentContext
  ): Promise<{ metrics: DeploymentMetrics; result: DeploymentResult }> {
    logger.info("Starting enhanced deployment pipeline", {
      stageCount: this.stages.length,
    });

    for (const stage of this.stages) {
      if (stage.skip?.(context)) {
        logger.debug(`Skipping stage: ${stage.name}`);
        this.handleSkippedStage(stage);
        continue;
      }

      await this.executeStageWithResultCollection(stage, context);
    }

    const metrics = this.metrics.complete();
    const result = this.resultCollector.getResult();

    return { metrics, result };
  }

  private handleSkippedStage(stage: DeploymentStage): void {
    const result = this.resultCollector.createStageResult(
      stage.name,
      "skipped",
      new Date(),
      new Date()
    );
    this.resultCollector.addStageResult(result);
  }

  private async executeStageWithResultCollection(
    stage: DeploymentStage,
    context: DeploymentContext
  ): Promise<void> {
    // Implementation tracks entity-level results
    // See enhanced-pipeline.ts for full implementation
  }
}
```

**Additional Features:**
- Entity-level result tracking
- Partial success/failure reporting
- Detailed error context
- Skipped stage tracking

---

## Progress Tracking

### ProgressIndicator

**Location:** `src/core/deployment/progress.ts:6-25`

```typescript
export class ProgressIndicator {
  private reporter = new OraProgressReporter();

  startSpinner(text: string): () => void {
    this.reporter.start(text);
    return () => this.reporter.succeed();
  }

  complete(text: string): void {
    this.reporter.succeed(text);
  }

  fail(text: string): void {
    this.reporter.fail(text);
  }

  warn(text: string): void {
    this.reporter.warn(text);
  }
}
```

**Usage:**
```typescript
const stopProgress = progress.startSpinner("Managing products");
try {
  await stage.execute(context);
  progress.complete("Managing products");
} catch (error) {
  stopProgress();
  progress.fail("Managing products");
  throw error;
}
```

**Output:**
```
⠋ Managing products...
✔ Managing products
```

Or on failure:
```
✖ Managing products
```

---

## Metrics Collection

### MetricsCollector

**Location:** `src/core/deployment/metrics.ts:3-63`

```typescript
export class MetricsCollector {
  private readonly startTime = new Date();
  private endTime?: Date;
  private readonly stageDurations = new Map<string, number>();
  private readonly stageStartTimes = new Map<string, number>();
  private readonly entityCounts = new Map<string, EntityCount>();

  startStage(name: string): void {
    this.stageStartTimes.set(name, Date.now());
  }

  endStage(name: string): void {
    const startTime = this.stageStartTimes.get(name);
    if (!startTime) return;

    const duration = Date.now() - startTime;
    this.stageDurations.set(name, duration);
    this.stageStartTimes.delete(name);
  }

  recordEntity(type: string, operation: "create" | "update" | "delete"): void {
    const current = this.entityCounts.get(type) ?? {
      created: 0,
      updated: 0,
      deleted: 0,
    };

    const propertyName =
      operation === "create" ? "created" : operation === "update" ? "updated" : "deleted";

    this.entityCounts.set(type, {
      ...current,
      [propertyName]: current[propertyName] + 1,
    });
  }

  complete(): DeploymentMetrics {
    this.endTime = new Date();

    return {
      duration: this.endTime.getTime() - this.startTime.getTime(),
      startTime: this.startTime,
      endTime: this.endTime,
      stageDurations: new Map(this.stageDurations),
      entityCounts: new Map(this.entityCounts),
    };
  }
}
```

### DeploymentMetrics

**Location:** `src/core/deployment/types.ts:18-24`

```typescript
export interface DeploymentMetrics {
  readonly duration: number;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly stageDurations: ReadonlyMap<string, number>;
  readonly entityCounts: ReadonlyMap<string, EntityCount>;
}
```

**Example Metrics:**
```typescript
{
  duration: 45300, // 45.3 seconds
  startTime: Date(2025-01-12T10:00:00),
  endTime: Date(2025-01-12T10:00:45),
  stageDurations: Map {
    "Validating configuration" => 150,
    "Managing channels" => 1200,
    "Managing products" => 42000,
    // ...
  },
  entityCounts: Map {
    "Products" => { created: 5, updated: 3, deleted: 0 },
    "Channels" => { created: 0, updated: 1, deleted: 0 },
    // ...
  }
}
```

---

## Result Collection

### DeploymentResultCollector

**Location:** `src/core/deployment/results.ts:45-120`

```typescript
export class DeploymentResultCollector {
  private stages: StageResult[] = [];
  private readonly startTime = new Date();

  addStageResult(result: StageResult): void {
    this.stages.push(result);
  }

  createStageResult(
    name: string,
    status: StageStatus,
    startTime: Date,
    endTime?: Date,
    entities?: readonly EntityResult[],
    error?: string
  ): StageResult {
    const successCount = entities?.filter((e) => e.success).length ?? 0;
    const failureCount = entities?.filter((e) => !e.success).length ?? 0;
    const totalCount = entities?.length ?? 0;

    return {
      name,
      status,
      startTime,
      endTime,
      duration: endTime ? endTime.getTime() - startTime.getTime() : undefined,
      entities,
      error,
      successCount,
      failureCount,
      totalCount,
    };
  }

  getResult(): DeploymentResult {
    const endTime = new Date();
    const totalDuration = endTime.getTime() - this.startTime.getTime();

    // Calculate summary
    const totalEntities = this.stages.reduce((sum, s) => sum + s.totalCount, 0);
    const successfulEntities = this.stages.reduce((sum, s) => sum + s.successCount, 0);
    const failedEntities = this.stages.reduce((sum, s) => sum + s.failureCount, 0);
    const skippedStages = this.stages.filter((s) => s.status === "skipped").length;
    const completedStages = this.stages.filter((s) => s.status === "success").length;
    const failedStages = this.stages.filter((s) => s.status === "failed").length;

    const overallStatus =
      failedStages > 0 ? "failed" :
      failedEntities > 0 ? "partial" :
      "success";

    return {
      overallStatus,
      startTime: this.startTime,
      endTime,
      totalDuration,
      stages: this.stages,
      summary: {
        totalEntities,
        successfulEntities,
        failedEntities,
        skippedStages,
        completedStages,
        failedStages,
      },
    };
  }
}
```

### EntityResult

**Location:** `src/core/deployment/results.ts:8-14`

```typescript
export interface EntityResult {
  readonly name: string;
  readonly operation: "create" | "update" | "delete";
  readonly success: boolean;
  readonly error?: string;
  readonly suggestions?: readonly string[];
}
```

### StageResult

**Location:** `src/core/deployment/results.ts:16-27`

```typescript
export interface StageResult {
  readonly name: string;
  readonly status: StageStatus; // "success" | "partial" | "failed" | "skipped"
  readonly startTime: Date;
  readonly endTime?: Date;
  readonly duration?: number;
  readonly entities?: readonly EntityResult[];
  readonly error?: string;
  readonly successCount: number;
  readonly failureCount: number;
  readonly totalCount: number;
}
```

---

## Error Handling

### Error Hierarchy

**Location:** `src/core/deployment/errors.ts`

```typescript
abstract class DeploymentError extends Error {
  constructor(
    message: string,
    public readonly suggestions: readonly string[],
    public readonly context?: Record<string, unknown>,
    public readonly originalError?: Error | unknown
  );
  
  abstract getExitCode(): number;
  abstract getUserMessage(verbose: boolean): string;
}
```

**Error Types:**
1. `NetworkDeploymentError` - Connection issues (exit code 3)
2. `AuthenticationDeploymentError` - Auth/permission issues (exit code 2)
3. `ValidationDeploymentError` - Config validation errors (exit code 4)
4. `StageAggregateError` - Partial stage failures (exit code 5)
5. `PartialDeploymentError` - Some operations failed (exit code 5)
6. `UnexpectedDeploymentError` - Unknown errors (exit code 1)

### StageAggregateError

**Location:** `src/core/deployment/errors.ts:160-244`

```typescript
export class StageAggregateError extends DeploymentError {
  constructor(
    stageName: string,
    public readonly failures: Array<{
      entity: string;
      error: Error;
    }>,
    public readonly successes: string[] = []
  ) {
    const summary = `${stageName} failed for ${failures.length} of ${failures.length + successes.length} entities`;

    const suggestions = [
      "Review the individual errors below",
      "Fix the issues and run deploy again",
      "Use --include flag to deploy only specific entities",
      "Run 'saleor-configurator diff' to check current state",
    ];

    super(summary, suggestions, {
      stageName,
      totalEntities: failures.length + successes.length,
      failedCount: failures.length,
      successCount: successes.length,
    });
  }

  getUserMessage(_verbose = false): string {
    const lines: string[] = [
      `❌ ${this.context?.stageName} - ${this.failures.length} of ${
        this.failures.length + this.successes.length
      } failed`,
      "",
    ];

    // Show successes if any
    if (this.successes.length > 0) {
      lines.push("✅ Successful:");
      this.successes.forEach((entity) => {
        lines.push(`  • ${entity}`);
      });
      lines.push("");
    }

    // Show failures with recovery suggestions
    if (this.failures.length > 0) {
      lines.push("❌ Failed:");
      this.failures.forEach(({ entity, error }) => {
        lines.push(`  • ${entity}`);
        lines.push(`    Error: ${error.message}`);

        // Get recovery suggestions for this specific error
        const suggestions = ErrorRecoveryGuide.getSuggestions(error.message);
        const formattedSuggestions = ErrorRecoveryGuide.formatSuggestions(suggestions);

        if (formattedSuggestions.length > 0) {
          formattedSuggestions.forEach((suggestion) => {
            lines.push(`    ${suggestion}`);
          });
        }

        lines.push("");
      });
    }

    return lines.join("\n");
  }
}
```

**Example Output:**
```
❌ Managing product types - 2 of 5 failed

✅ Successful:
  • T-Shirt
  • Mug
  • Poster

❌ Failed:
  • Book
    Error: Product type "Book" attribute "author" not found
    💡 Create attribute "author" first
    💡 Run: saleor-configurator deploy --include attributes

  • Digital Download
    Error: Product type "Digital Download" has invalid weight unit
    💡 Use valid weight unit: kg, lb, oz, g
    💡 Check your configuration file

General suggestions:
  1. Review the individual errors below
  2. Fix the issues and run deploy again
  3. Use --include flag to deploy only specific entities
  4. Run 'saleor-configurator diff' to check current state
```

### Error Conversion

**Location:** `src/core/deployment/errors.ts:345-425`

```typescript
export function toDeploymentError(error: unknown, operation = "deployment"): DeploymentError {
  // Already a DeploymentError
  if (error instanceof DeploymentError) {
    return error;
  }

  // GraphQL errors with specific handling
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    // Network errors
    if (
      errorMessage.includes("fetch failed") ||
      errorMessage.includes("econnrefused") ||
      errorMessage.includes("etimedout")
    ) {
      return new NetworkDeploymentError(
        "Unable to connect to Saleor instance",
        { operation },
        error
      );
    }

    // Authentication errors
    if (
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("forbidden")
    ) {
      return new AuthenticationDeploymentError("Authentication failed", { operation }, error);
    }

    // Validation errors
    if (
      errorMessage.includes("validation") ||
      errorMessage.includes("invalid")
    ) {
      return new ValidationDeploymentError(
        "Configuration validation failed",
        [error.message],
        { operation },
        error
      );
    }
  }

  // Fallback to unexpected error
  return new UnexpectedDeploymentError(`Unexpected error during ${operation}`, error);
}
```

---

## Stage Skipping Logic

### Skip Patterns

#### Pattern 1: Skip When No Changes

```typescript
skip(context) {
  return context.summary.results.every((r) => r.entityType !== "Shop Settings");
}
```

**Logic:** Skip if no diff results for this entity type.

#### Pattern 2: Skip Based on Dependencies

```typescript
skip(context) {
  // Run if product types changed OR products changed (dependency)
  const hasProductTypeChanges = context.summary.results.some(
    (r) => r.entityType === "Product Types"
  );
  const hasProductChanges = context.summary.results.some((r) => r.entityType === "Products");

  return !hasProductTypeChanges && !hasProductChanges;
}
```

**Logic:** Run if self or any dependent has changes.

#### Pattern 3: Never Skip (Critical Stages)

```typescript
skip(context) {
  // Validation stage always runs
  return false;
}
```

**Logic:** Always execute (e.g., validation, preflight checks).

### Skip Decision Table

| Stage | Skip Condition | Runs When |
|-------|---------------|-----------|
| Validation | Never | Always |
| Shop Settings | No shop changes | Shop changes |
| Tax Classes | No tax class changes | Tax class changes |
| Attributes | No attribute changes | Attribute changes |
| Product Types | No product type or product changes | Product type OR product changes |
| Channels | No channel or product changes | Channel OR product changes |
| Page Types | No page type changes | Page type changes |
| Model Types | No model type changes | Model type changes |
| Categories | No category or product changes | Category OR product changes |
| Collections | No collection changes | Collection changes |
| Menus | No menu changes | Menu changes |
| Models | No model changes | Model changes |
| Warehouses | No warehouse changes | Warehouse changes |
| Shipping Zones | No shipping zone changes | Shipping zone changes |
| Attribute Choices Preflight | No product changes | Product changes |
| Products | No product changes | Product changes |

---

## Execution Flow

### Full Deployment Flow

```
1. CLI receives deploy command
   ↓
2. Load configuration (validate YAML)
   ↓
3. Run diff (compare local vs remote)
   ↓
4. Create deployment context
   ↓
5. Create pipeline
   ↓
6. Add all 17 stages to pipeline
   ↓
7. Execute pipeline:
   ├─ For each stage:
   │  ├─ Check skip condition
   │  ├─ If skip: log and continue
   │  ├─ If not skip:
   │  │  ├─ Start metrics tracking
   │  │  ├─ Show progress spinner
   │  │  ├─ Execute stage
   │  │  ├─ Handle success/failure
   │  │  ├─ Stop progress spinner
   │  │  └─ End metrics tracking
   │  └─ Continue to next stage
   ↓
8. Collect final metrics
   ↓
9. Collect final results
   ↓
10. Generate deployment report
   ↓
11. Display results to user
   ↓
12. Exit with appropriate code
```

### Stage Execution Flow

```
Stage.execute() called
   ↓
Load configuration
   ↓
Check if entities exist in config
   ↓
If no entities: return early
   ↓
If entities exist:
   ├─ Simple deployment:
   │  └─ Call service method
   │     └─ Return
   │
   └─ Batch deployment:
      ├─ Create array of promises
      ├─ Execute with Promise.allSettled
      ├─ Separate successes and failures
      ├─ If failures:
      │  └─ Throw StageAggregateError
      └─ If all success:
         └─ Return
```

---

## Serena Navigation

### Finding Stages

**List all stages:**
```bash
get_symbols_overview("src/core/deployment/stages.ts")
```

**Result:**
```
- validationStage
- shopSettingsStage
- taxClassesStage
- attributesStage
- productTypesStage
- channelsStage
- pageTypesStage
- modelTypesStage
- categoriesStage
- collectionsStage
- menusStage
- modelsStage
- warehousesStage
- shippingZonesStage
- attributeChoicesPreflightStage
- productsStage
- getAllStages (function)
```

**Read specific stage:**
```bash
find_symbol("productTypesStage", include_body=True, relative_path="src/core/deployment")
```

**Find stage usage:**
```bash
find_referencing_symbols("getAllStages", "src/core/deployment/stages.ts")
```

### Finding Pipeline

**See pipeline structure:**
```bash
find_symbol("DeploymentPipeline", depth=1, include_body=False, relative_path="src/core/deployment")
```

**Read execution method:**
```bash
find_symbol("DeploymentPipeline/execute", include_body=True, relative_path="src/core/deployment")
```

### Finding Error Handling

**Search for error types:**
```bash
find_symbol("Error", substring_matching=True, relative_path="src/core/deployment/errors.ts")
```

**Find error usage:**
```bash
search_for_pattern("throw new.*Error", relative_path="src/core/deployment")
```

---

## Best Practices

### 1. Always Wrap Errors with Context

```typescript
// DON'T do this:
await service.method();

// DO this:
try {
  await service.method();
} catch (error) {
  throw new Error(
    `Failed to manage entity: ${error instanceof Error ? error.message : String(error)}`
  );
}
```

**Why:** Provides clear context in error messages.

### 2. Use Promise.allSettled for Batch Operations

```typescript
// DON'T do this:
for (const entity of entities) {
  await service.deploy(entity);  // Sequential, slow
}

// DO this:
const results = await Promise.allSettled(
  entities.map((entity) => service.deploy(entity))
);
```

**Why:** Parallel execution is faster and handles partial failures.

### 3. Implement Dependency-Aware Skipping

```typescript
skip(context) {
  // Run if self or dependents changed
  const hasSelfChanges = context.summary.results.some((r) => r.entityType === "Categories");
  const hasDependentChanges = context.summary.results.some((r) => r.entityType === "Products");

  return !hasSelfChanges && !hasDependentChanges;
}
```

**Why:** Ensures dependencies are deployed even if unchanged.

### 4. Return Early for Empty Config

```typescript
async execute(context) {
  const config = await context.configurator.services.configStorage.load();
  
  if (!config.products?.length) {
    logger.debug("No products to manage");
    return;  // Early return
  }

  // ... rest of logic
}
```

**Why:** Avoids unnecessary processing.

### 5. Use StageAggregateError for Partial Failures

```typescript
if (failures.length > 0) {
  throw new StageAggregateError("Managing products", failures, successes);
}
```

**Why:** Provides detailed error reporting with entity-level context.

### 6. Log Stage Execution

```typescript
async execute(context) {
  logger.info("Executing stage", { stage: this.name });
  // ... execution logic
  logger.info("Stage completed", { stage: this.name });
}
```

**Why:** Provides visibility into deployment progress.

### 7. Validate Before Deployment (Preflight)

```typescript
// Preflight validation stage
export const attributeChoicesPreflightStage: DeploymentStage = {
  name: "Validating attribute choices",
  async execute(context) {
    // Validate all attribute choices exist
    const errors = validateAttributeChoices(config);
    
    if (errors.length > 0) {
      throw new Error(`Validation failed:\n${errors.join("\n")}`);
    }
  },
};
```

**Why:** Fails fast before partial deployment.

### 8. Track Metrics

```typescript
this.metrics.startStage(stage.name);
try {
  await stage.execute(context);
} finally {
  this.metrics.endStage(stage.name);
}
```

**Why:** Provides performance insights.

### 9. Show Progress to User

```typescript
const stopProgress = this.progress.startSpinner(stage.name);
try {
  await stage.execute(context);
  this.progress.complete(stage.name);
} catch (error) {
  stopProgress();
  this.progress.fail(stage.name);
  throw error;
}
```

**Why:** Better user experience during long operations.

### 10. Document Stage Dependencies

```typescript
// Stage comments should document dependencies
export const productsStage: DeploymentStage = {
  name: "Managing products",
  // DEPENDS ON:
  // - Product Types (product.productType)
  // - Channels (product.channelListings)
  // - Categories (product.category)
  // - Attributes (product.attributes)
  // - Tax Classes (product.taxClass)
  async execute(context) {
    // ...
  },
};
```

**Why:** Makes dependencies explicit for maintainers.

---

## Summary

The Deployment Pipeline is a robust 17-stage system that:

1. **Executes sequentially** in dependency order
2. **Skips unnecessary stages** based on diff results
3. **Handles partial failures** gracefully
4. **Tracks metrics** (timing, entity counts)
5. **Reports progress** with spinners and status
6. **Provides detailed errors** with suggestions

**Key Components:**
- 17 deployment stages (validation → products)
- DeploymentPipeline and EnhancedDeploymentPipeline
- ProgressIndicator for user feedback
- MetricsCollector for performance tracking
- DeploymentResultCollector for result reporting
- Deployment-specific error hierarchy

**Critical Stages:**
1. Validation (always runs)
2. Attribute Choices Preflight (validates before products)
3. Products (depends on everything)

**For Serena Navigation:**
- Use `get_symbols_overview()` to see all stages
- Use `find_symbol()` to read specific stages
- Use `search_for_pattern()` to find error handling patterns
- Read selectively for specific stage implementation details

This architecture ensures correct, efficient, and resilient deployment of Saleor configuration.