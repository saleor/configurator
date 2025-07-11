# Deployment Command Enhancement Implementation Plan

## Overview

This document outlines the implementation plan for enhancing the deployment functionality of Saleor Configurator. The improvements focus on better user feedback, cleaner code architecture, and enhanced developer experience.

## Implementation Phases

### Phase 1: Core Infrastructure (High Priority)

#### 1.1 Extract Deployment Pipeline Module

**File**: `src/core/deployment/pipeline.ts`

**Tasks**:
- [ ] Create deployment pipeline abstraction
- [ ] Define stage interface with progress callbacks
- [ ] Implement stage orchestration with error handling
- [ ] Add metrics collection throughout pipeline

**Code Structure**:
```typescript
interface DeploymentStage {
  name: string;
  execute: (context: DeploymentContext) => Promise<void>;
  onProgress?: (progress: number, message: string) => void;
  canSkip?: (context: DeploymentContext) => boolean;
}

interface DeploymentContext {
  configurator: SaleorConfigurator;
  summary: DiffSummary;
  metrics: DeploymentMetrics;
  args: DeployCommandArgs;
}

class DeploymentPipeline {
  private stages: DeploymentStage[] = [];
  private metrics: DeploymentMetrics;
  
  addStage(stage: DeploymentStage): this;
  async execute(context: DeploymentContext): Promise<DeploymentMetrics>;
  private handleStageError(stage: DeploymentStage, error: Error): void;
}
```

#### 1.2 Create Progress Indicator System

**File**: `src/cli/progress.ts`

**Tasks**:
- [ ] Implement spinner with customizable messages
- [ ] Create progress bar for determinate operations
- [ ] Add concurrent progress tracking for parallel operations
- [ ] Ensure proper cleanup on exit/error

**Code Structure**:
```typescript
export class ProgressIndicator {
  private currentSpinner?: NodeJS.Timer;
  
  startSpinner(message: string): () => void;
  updateSpinner(message: string): void;
  
  showProgress(options: {
    current: number;
    total: number;
    message: string;
    width?: number;
  }): void;
  
  showConcurrentProgress(tasks: ProgressTask[]): void;
  
  clear(): void;
}

interface ProgressTask {
  name: string;
  current: number;
  total: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}
```

#### 1.3 Implement Deployment Metrics

**File**: `src/core/deployment/metrics.ts`

**Tasks**:
- [ ] Create metrics collection system
- [ ] Track timing for each operation
- [ ] Count entities by type and operation
- [ ] Calculate and format duration displays

**Code Structure**:
```typescript
export class DeploymentMetrics {
  private startTime: Date;
  private endTime?: Date;
  private stageDurations: Map<string, number> = new Map();
  private entityCounts: Map<string, EntityCount> = new Map();
  
  startStage(name: string): void;
  endStage(name: string): void;
  
  recordEntity(type: string, operation: 'create' | 'update' | 'delete'): void;
  
  complete(): void;
  getSummary(): MetricsSummary;
}

interface EntityCount {
  created: number;
  updated: number;
  deleted: number;
}
```

### Phase 2: Enhanced User Experience (Medium Priority)

#### 2.1 Implement Dry-Run Mode

**Files**: 
- `src/commands/deploy.ts` (update schema)
- `src/core/deployment/dry-run.ts` (new)

**Tasks**:
- [ ] Add --dry-run flag to command schema
- [ ] Create dry-run execution path
- [ ] Show detailed preview without applying changes
- [ ] Add clear "DRY RUN" indicators throughout output

**Implementation**:
```typescript
// In deploy.ts schema
dryRun: z.boolean()
  .default(false)
  .describe("Preview all changes without applying them (simulation mode)")

// In deployment pipeline
if (args.dryRun) {
  return await this.executeDryRun(context);
}
```

#### 2.2 Create Deployment Summary Report

**File**: `src/cli/reports/deployment-summary.ts`

**Tasks**:
- [ ] Design summary report layout
- [ ] Include timing metrics
- [ ] Show entity change breakdown
- [ ] Add helpful next steps or warnings

**Code Structure**:
```typescript
export class DeploymentSummaryReport {
  constructor(
    private metrics: DeploymentMetrics,
    private summary: DiffSummary
  ) {}
  
  display(): void {
    this.showHeader();
    this.showTimingInfo();
    this.showChangesSummary();
    this.showEntityBreakdown();
    this.showNextSteps();
  }
  
  private formatDuration(ms: number): string;
  private groupChangesByEntity(): Map<string, EntityChanges>;
}
```

#### 2.3 Refactor Confirmation Flow

**File**: `src/cli/confirmations.ts`

**Tasks**:
- [ ] Extract confirmation logic into reusable class
- [ ] Support different confirmation types
- [ ] Handle CI/force mode centrally
- [ ] Add confirmation templates for common scenarios

**Code Structure**:
```typescript
export class ConfirmationFlow {
  static async confirm(options: ConfirmationOptions): Promise<boolean>;
  static async confirmDestructive(details: DestructiveOperation[]): Promise<boolean>;
  static async confirmDeployment(summary: DiffSummary): Promise<boolean>;
  
  private static shouldSkipConfirmation(args: DeployCommandArgs): boolean;
  private static formatConfirmationPrompt(options: ConfirmationOptions): string;
}

interface ConfirmationOptions {
  title: string;
  message: string;
  details?: string[];
  severity: 'info' | 'warning' | 'danger';
  defaultAnswer?: boolean;
}
```

### Phase 3: Code Quality & Polish (Low Priority)

#### 3.1 Fix Console Output Issues

**File**: `src/cli/console.ts`

**Tasks**:
- [ ] Make box width dynamic based on content
- [ ] Add terminal width detection
- [ ] Improve text wrapping for long lines
- [ ] Add table formatting utility

**Updates**:
```typescript
// Add to Console class
getTerminalWidth(): number {
  return process.stdout.columns || 80;
}

formatTable(rows: string[][], options?: TableOptions): string;

wrapText(text: string, maxWidth: number): string[];
```

#### 3.2 Consolidate Command Flags

**File**: `src/commands/deploy.ts`

**Tasks**:
- [ ] Replace --ci and --force with --confirmation-mode
- [ ] Add clear documentation for each mode
- [ ] Update examples and help text
- [ ] Ensure backward compatibility warnings

**New Schema**:
```typescript
confirmationMode: z.enum(['interactive', 'auto', 'skip'])
  .default('interactive')
  .describe("How to handle confirmations (interactive: normal, auto: CI mode, skip: force)")
  .refine((mode) => {
    if (mode === 'skip') {
      cliConsole.warn("⚠️  Skip mode bypasses all safety checks - use with extreme caution");
    }
    return true;
  })
```

#### 3.3 Add Deployment Stage Hooks

**File**: `src/core/deployment/hooks.ts`

**Tasks**:
- [ ] Create hook system for deployment stages
- [ ] Allow custom validation before deployment
- [ ] Support post-deployment actions
- [ ] Add logging/notification hooks

**Code Structure**:
```typescript
export interface DeploymentHooks {
  beforeDeploy?: (context: DeploymentContext) => Promise<void>;
  afterStage?: (stage: string, context: DeploymentContext) => Promise<void>;
  afterDeploy?: (metrics: DeploymentMetrics) => Promise<void>;
  onError?: (error: Error, stage: string) => Promise<void>;
}
```

## Testing Strategy

### Unit Tests

1. **Pipeline Tests** (`src/core/deployment/__tests__/pipeline.test.ts`)
   - Stage execution order
   - Error handling and recovery
   - Progress callback invocation
   - Metrics collection

2. **Progress Indicator Tests** (`src/cli/__tests__/progress.test.ts`)
   - Spinner lifecycle
   - Progress bar calculations
   - Terminal output formatting
   - Cleanup on interruption

3. **Metrics Tests** (`src/core/deployment/__tests__/metrics.test.ts`)
   - Duration calculations
   - Entity counting
   - Summary generation

### Integration Tests

1. **Dry Run Tests** (`src/commands/__tests__/deploy.dry-run.test.ts`)
   - Ensure no mutations are executed
   - Verify preview accuracy
   - Test all entity types

2. **Full Deployment Tests** (`src/commands/__tests__/deploy.integration.test.ts`)
   - End-to-end deployment flow
   - Progress indicators
   - Summary report generation

## File Structure

```
src/
├── cli/
│   ├── confirmations.ts      # Unified confirmation flow
│   ├── progress.ts           # Progress indicators
│   └── reports/
│       └── deployment-summary.ts
├── core/
│   └── deployment/
│       ├── pipeline.ts       # Deployment orchestration
│       ├── metrics.ts        # Metrics collection
│       ├── dry-run.ts        # Dry run handler
│       ├── hooks.ts          # Lifecycle hooks
│       └── stages/           # Individual deployment stages
│           ├── validation.ts
│           ├── preparation.ts
│           └── execution.ts
└── commands/
    └── deploy.ts             # Updated command handler
```

## Migration Guide

### For Existing Users

1. **Flag Changes**:
   ```bash
   # Old
   configurator deploy --ci
   configurator deploy --force
   
   # New
   configurator deploy --confirmation-mode=auto    # replaces --ci
   configurator deploy --confirmation-mode=skip    # replaces --force
   ```

2. **New Features**:
   ```bash
   # Dry run mode
   configurator deploy --dry-run
   
   # Progress indicators are automatic
   # Rich summaries are automatic
   ```

### For Developers

1. **Import Updates**:
   ```typescript
   // Old
   import { confirmAction } from '../cli/command';
   
   // New
   import { ConfirmationFlow } from '../cli/confirmations';
   ```

2. **Pipeline Usage**:
   ```typescript
   // Create pipeline
   const pipeline = new DeploymentPipeline()
     .addStage(validationStage)
     .addStage(preparationStage)
     .addStage(executionStage);
   
   // Execute with progress
   const metrics = await pipeline.execute(context);
   ```

## Success Criteria

1. **User Experience**:
   - [ ] Clear progress feedback during all operations
   - [ ] Informative deployment summaries
   - [ ] Intuitive confirmation flows
   - [ ] Helpful error messages

2. **Code Quality**:
   - [ ] Reduced complexity in deploy.ts (< 150 lines)
   - [ ] Reusable components for other commands
   - [ ] Comprehensive test coverage (> 90%)
   - [ ] Clear separation of concerns

3. **Performance**:
   - [ ] Progress updates don't slow operations
   - [ ] Metrics collection < 1% overhead
   - [ ] Smooth animations without flicker

## Timeline Estimate

- **Phase 1**: 2-3 days (Core Infrastructure)
- **Phase 2**: 2-3 days (Enhanced UX)
- **Phase 3**: 1-2 days (Polish)
- **Testing**: 1-2 days
- **Documentation**: 1 day

**Total**: 7-11 days

## Next Steps

1. Create feature branch: `feat/enhanced-deployment`
2. Start with Phase 1.1 (Pipeline extraction)
3. Implement incrementally with tests
4. Update documentation as features are added
5. Create PR with comprehensive changelog