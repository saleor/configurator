# Data Model: Media Handling for Cross-Environment Product Sync

**Feature**: 001-media-handling
**Date**: 2026-01-16

## Overview

This document defines the data structures and types needed for the `--skip-media` feature.

---

## 1. New Types

### 1.1 DiffOptions

**Location**: `src/core/diff/types.ts`

```typescript
/**
 * Options for controlling diff comparison behavior.
 */
export interface DiffOptions {
  /**
   * When true, excludes media fields from comparison.
   * Media differences will not be reported in diff results.
   */
  skipMedia?: boolean;
}
```

### 1.2 ComparatorOptions

**Location**: `src/core/diff/comparators/types.ts` (or inline in comparator)

```typescript
/**
 * Options passed to entity comparators.
 */
export interface ComparatorOptions {
  /**
   * When true, skip media field comparison.
   */
  skipMedia?: boolean;
}
```

### 1.3 MediaSkipContext

**Location**: `src/modules/product/types.ts`

```typescript
/**
 * Context for media handling operations.
 */
export interface MediaSkipContext {
  /**
   * When true, skip media synchronization.
   */
  skipMedia: boolean;
}
```

---

## 2. Modified Types

### 2.1 DeploymentContext Extension

**Location**: `src/core/deployment/types.ts`

```typescript
export interface DeploymentContext {
  configurator: Configurator;
  args: DeployCommandArgs;
  summary: DiffSummary;
  startTime: Date;

  // NEW: Media handling flag
  /**
   * When true, media synchronization is skipped for all entities.
   * Preserves existing media on target environment.
   */
  skipMedia?: boolean;
}
```

### 2.2 Command Args Extension

**Location**: `src/commands/deploy.ts`

```typescript
export const deployCommandSchema = baseCommandArgsSchema.extend({
  // ... existing fields ...

  /** Skip media handling during deployment */
  skipMedia: z
    .boolean()
    .default(false)
    .describe("Skip media fields during deployment (preserves target media)"),
});
```

**Location**: `src/commands/diff.ts`

```typescript
export const diffCommandSchema = baseCommandArgsSchema.extend({
  // ... existing fields ...

  /** Skip media fields in diff comparison */
  skipMedia: z
    .boolean()
    .default(false)
    .describe("Exclude media fields from diff comparison"),
});
```

---

## 3. Entity Field Mapping

### 3.1 Product Media Fields (Skipped)

| Field Path | Type | Skip Behavior |
|------------|------|---------------|
| `products[].media` | `Array<{externalUrl, alt}>` | Entire array excluded from comparison |
| `products[].media[].externalUrl` | `string` | Not compared when skipMedia=true |
| `products[].media[].alt` | `string \| undefined` | Not compared when skipMedia=true |

### 3.2 Unaffected Entity Types

| Entity | Media Fields | Notes |
|--------|--------------|-------|
| Categories | None | No changes needed |
| Collections | backgroundImage (not in schema) | Not exposed, no changes |
| Channels | None | No changes needed |
| Menus | None | No changes needed |
| ProductTypes | None | No changes needed |
| Attributes | None | No changes needed |

---

## 4. State Transitions

### 4.1 Media Sync State Machine

```
                    ┌─────────────────────────────┐
                    │    config.yml loaded        │
                    │  (with media[] field)       │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │      --skip-media flag?     │
                    └──────────────┬──────────────┘
                                   │
                  ┌────────────────┴────────────────┐
                  │                                 │
             [YES]│                                 │[NO]
                  ▼                                 ▼
    ┌─────────────────────────┐     ┌─────────────────────────┐
    │   SKIP: Media fields    │     │ PROCESS: Media fields   │
    │   - No diff reported    │     │ - Diff reported         │
    │   - No sync executed    │     │ - Sync executed         │
    │   - Target preserved    │     │ - Target updated        │
    └─────────────────────────┘     └─────────────────────────┘
```

### 4.2 Cross-Environment Warning State

```
                    ┌─────────────────────────────┐
                    │   Deployment initiated      │
                    │  (without --skip-media)     │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  Scan media URLs in config  │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  Compare hosts with target  │
                    └──────────────┬──────────────┘
                                   │
                  ┌────────────────┴────────────────┐
                  │                                 │
    [DIFFERENT]   │                                 │[SAME]
                  ▼                                 ▼
    ┌─────────────────────────┐     ┌─────────────────────────┐
    │   Display WARNING       │     │   No warning            │
    │   (non-blocking)        │     │   Proceed normally      │
    └──────────────┬──────────┘     └─────────────────────────┘
                   │
                   ▼
    ┌─────────────────────────┐
    │   Proceed with deploy   │
    │   (user informed)       │
    └─────────────────────────┘
```

---

## 5. Validation Rules

### 5.1 Flag Validation

| Rule | Validation | Error |
|------|------------|-------|
| `--skip-media` type | Must be boolean | Zod schema validation |
| Default value | false (opt-in) | N/A |
| Mutual exclusivity | None | Can combine with all other flags |

### 5.2 Cross-Environment Detection

| Pattern | Example | Action |
|---------|---------|--------|
| Saleor media host mismatch | Config has `staging.saleor.cloud`, target is `prod.saleor.cloud` | Warning |
| External media | Any non-Saleor URL | No warning (expected) |
| Same host | Config and target same | No warning |

---

## 6. Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI Command Layer                         │
│  ┌─────────────┐    ┌─────────────┐                             │
│  │   deploy    │    │    diff     │                             │
│  │ --skip-media│    │ --skip-media│                             │
│  └──────┬──────┘    └──────┬──────┘                             │
└─────────┼──────────────────┼────────────────────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Core Layer                                │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │  DeploymentContext  │    │        DiffService              │ │
│  │  { skipMedia: bool }│    │  compare(local, remote, opts)   │ │
│  └──────────┬──────────┘    └───────────────┬─────────────────┘ │
│             │                               │                   │
│             │         ┌─────────────────────┴──────┐            │
│             │         │    ProductComparator       │            │
│             │         │  compare(l, r, {skipMedia})│            │
│             │         └────────────────────────────┘            │
└─────────────┼───────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Module Layer                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    ProductService                           ││
│  │  ┌─────────────────────────────────────────────────────┐    ││
│  │  │ bootstrapProduct(input, context: {skipMedia})       │    ││
│  │  │   → if (!context.skipMedia) syncProductMedia()      │    ││
│  │  └─────────────────────────────────────────────────────┘    ││
│  │  ┌─────────────────────────────────────────────────────┐    ││
│  │  │ bootstrapProductsBulk(inputs, context: {skipMedia}) │    ││
│  │  │   → if (!context.skipMedia) syncProductMedia()      │    ││
│  │  └─────────────────────────────────────────────────────┘    ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Summary

| Component | Type Change | Purpose |
|-----------|-------------|---------|
| `DiffOptions` | New interface | Pass options to diff service |
| `ComparatorOptions` | New interface | Pass options to comparators |
| `DeploymentContext` | Extended | Add skipMedia field |
| `deployCommandSchema` | Extended | Add --skip-media flag |
| `diffCommandSchema` | Extended | Add --skip-media flag |

