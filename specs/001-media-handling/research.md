# Research: Media Handling for Cross-Environment Product Sync

**Feature**: 001-media-handling
**Date**: 2026-01-16
**Status**: Complete

## Overview

This document consolidates research findings for implementing the `--skip-media` flag in the Saleor Configurator CLI.

---

## 1. Media Field Definitions in Codebase

### Research Task
Identify all media fields that need to be skipped across entity types.

### Findings

| Entity | Media Fields | Schema Location | Notes |
|--------|--------------|-----------------|-------|
| **Products** | `media[]` (externalUrl, alt) | `src/modules/config/schema/schema.ts:626-657` | Primary target |
| **Collections** | `backgroundImage` | Not exposed in config schema | Not currently synced |
| **Categories** | None | N/A | No media handling needed |

**Decision**: Focus on Products only. Collections and Categories don't have configurable media in the current schema.

**Rationale**: The config schema only exposes `media` for products. Collections have `backgroundImage` in GraphQL but it's not part of the configuration model.

**Alternatives Considered**:
- Extend to collections: Rejected - would require schema changes and is out of scope for Phase 1
- Add category media support: Rejected - categories don't have media in Saleor

---

## 2. Flag Propagation Patterns

### Research Task
Understand how existing flags (e.g., `--ci`, `--json`, `--fail-on-delete`) propagate through the system.

### Findings

**Pattern 1: Command Schema → Handler → Configurator**
```
deployCommandSchema.extend({ flag: z.boolean() })
    ↓
DeployCommandHandler.execute(args)
    ↓
createConfigurator(args)  // args passed to configurator factory
    ↓
configurator.diff()  // uses args internally
```

**Pattern 2: Context Object for Deployment**
```typescript
// src/core/deployment/types.ts
interface DeploymentContext {
  configurator: Configurator;
  args: DeployCommandArgs;  // Full args available
  summary: DiffSummary;
  startTime: Date;
}
```

**Pattern 3: DiffService Options**
```typescript
// Current pattern in configurator.diff()
const { summary, output } = await this.diffService.compare(localConfig, remoteConfig);
```

**Decision**: Add `skipMedia` to both:
1. `DeploymentContext` for bootstrap operations
2. `DiffOptions` (new type) for comparator operations

**Rationale**: Following existing patterns. The `args` object is already passed through context, but explicit `skipMedia` field improves clarity and type safety.

---

## 3. Comparator Skip Patterns

### Research Task
Understand how to conditionally skip field comparisons.

### Findings

**Current Comparator Pattern** (`product-comparator.ts:272-308`):
```typescript
// Compare media
const localMedia = this.normalizeMediaArray(local.media);
const remoteMedia = this.normalizeMediaArray(remote.media);

if (!this.equalsMedia(localMedia, remoteMedia)) {
  changes.push(
    this.createFieldChange("media", remoteMedia, localMedia, "Product media entries changed")
  );
}
```

**Skip Pattern** (proposed):
```typescript
// Compare media (unless skipMedia is enabled)
if (!options?.skipMedia) {
  const localMedia = this.normalizeMediaArray(local.media);
  const remoteMedia = this.normalizeMediaArray(remote.media);

  if (!this.equalsMedia(localMedia, remoteMedia)) {
    changes.push(
      this.createFieldChange("media", remoteMedia, localMedia, "Product media entries changed")
    );
  }
}
```

**Decision**: Add early return guard at the start of media comparison block.

**Rationale**: Minimal change, clear intent, no restructuring required.

---

## 4. Bootstrap Skip Patterns

### Research Task
Understand how to skip media sync during deployment.

### Findings

**Current Pattern** (`product-service.ts:717`):
```typescript
// Step 2: Sync media (if provided in config)
if (productInput.media !== undefined) {
  await this.syncProductMedia(product, productInput.media);
}
```

**Skip Pattern** (proposed):
```typescript
// Step 2: Sync media (if provided in config and not skipped)
if (productInput.media !== undefined && !context?.skipMedia) {
  await this.syncProductMedia(product, productInput.media);
}
```

**Bulk Operations** (`product-service.ts:1260`):
```typescript
// Current: Sync media for each product
if (productInput.media !== undefined) {
  await this.syncProductMedia(product, productInput.media);
}
```

**Decision**: Add `skipMedia` check to both `bootstrapProduct` and `bootstrapProductsBulk`.

**Rationale**: Consistent behavior whether using single or bulk operations.

---

## 5. Cross-Environment Detection

### Research Task
How to detect when media URLs point to a different environment.

### Findings

**Current URL Patterns**:
- Saleor media: `https://{environment}.saleor.cloud/media/...`
- External URLs: Any domain

**Detection Approach**:
```typescript
function detectCrossEnvironmentMedia(
  mediaUrls: string[],
  targetUrl: string
): { detected: boolean; sourceHosts: Set<string> } {
  const targetHost = new URL(targetUrl).host;
  const sourceHosts = new Set<string>();

  for (const url of mediaUrls) {
    try {
      const host = new URL(url).host;
      if (host !== targetHost && host.includes('saleor')) {
        sourceHosts.add(host);
      }
    } catch {
      // Invalid URL, skip
    }
  }

  return { detected: sourceHosts.size > 0, sourceHosts };
}
```

**Decision**: Implement warning in deploy command when:
1. `--skip-media` is NOT used
2. Config contains media URLs with Saleor hosts different from target

**Rationale**: Non-blocking warning helps users discover the flag without forcing behavior change.

---

## 6. CLI Output Patterns

### Research Task
Understand existing CLI output patterns for summary messages.

### Findings

**Existing Patterns** (`deploy.ts`):
```typescript
// Status messages
this.console.muted("⏳ Analyzing configuration differences...");
this.console.success("✅ No changes detected - configuration is already in sync");
this.console.warn("⚠️  DESTRUCTIVE OPERATIONS DETECTED!");
```

**Proposed Media Skip Output**:
```typescript
// When --skip-media is used
this.console.muted("🎬 Media handling: Skipped (--skip-media enabled)");

// When cross-env media detected without --skip-media
this.console.warn(
  "⚠️  Cross-environment media URLs detected (from staging.example.com).\n" +
  "   Consider using --skip-media for cross-environment deployments."
);

// Summary (at end of deployment)
this.console.muted(`ℹ️  Media skipped for ${count} products`);
```

**Decision**:
1. Add muted status when `--skip-media` is active
2. Add non-blocking warning when cross-env media detected
3. Add summary count at deployment completion

**Rationale**: Follows existing patterns, provides clear visibility without noise.

---

## 7. Test Patterns

### Research Task
Understand existing test patterns for command flags and comparators.

### Findings

**Comparator Test Pattern** (existing tests):
```typescript
describe("ProductComparator", () => {
  it("should detect media changes", () => {
    const local = createProductEntity({ media: [...] });
    const remote = createProductEntity({ media: [...] });
    const changes = comparator.compare(local, remote);
    expect(changes).toContainEqual(
      expect.objectContaining({ field: "media" })
    );
  });
});
```

**Command Integration Test Pattern**:
```typescript
describe("deploy --skip-media", () => {
  it("should not sync media when flag is set", async () => {
    // Setup mock server
    // Run command with --skip-media
    // Verify media mutations not called
  });
});
```

**Decision**: Add both unit tests (comparator) and integration tests (command flow).

**Rationale**: Ensures flag behavior at both component and system level.

---

## Summary of Decisions

| Area | Decision | Confidence |
|------|----------|------------|
| Scope | Products only | High |
| Flag propagation | Add to DeploymentContext and DiffOptions | High |
| Comparator skip | Early return guard | High |
| Bootstrap skip | Conditional check before syncProductMedia | High |
| Cross-env detection | Host comparison with Saleor pattern | High |
| CLI output | Muted status + warning + summary | High |
| Testing | Unit + integration tests | High |

---

## Open Questions (None)

All technical questions have been resolved through codebase exploration.

