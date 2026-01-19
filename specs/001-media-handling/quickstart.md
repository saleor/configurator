# Quickstart: Implementing --skip-media

**Feature**: 001-media-handling
**Date**: 2026-01-16

## Overview

This guide provides step-by-step instructions for implementing the `--skip-media` feature.

---

## Prerequisites

```bash
# Ensure you're on the feature branch
git checkout 001-media-handling

# Install dependencies
pnpm install

# Verify build passes
pnpm build && pnpm test
```

---

## Implementation Steps

### Step 1: Add Flag to Command Schemas (15 min)

**File**: `src/commands/deploy.ts`

```typescript
export const deployCommandSchema = baseCommandArgsSchema.extend({
  // ... existing fields ...

  skipMedia: z
    .boolean()
    .default(false)
    .describe("Skip media fields during deployment (preserves target media)"),
});
```

**File**: `src/commands/diff.ts`

```typescript
export const diffCommandSchema = baseCommandArgsSchema.extend({
  // ... existing fields ...

  skipMedia: z
    .boolean()
    .default(false)
    .describe("Exclude media fields from diff comparison"),
});
```

**Verify**:
```bash
pnpm build
pnpm dev deploy --help  # Should show --skip-media
pnpm dev diff --help    # Should show --skip-media
```

---

### Step 2: Add DiffOptions Type (10 min)

**File**: `src/core/diff/types.ts` (or create if needed)

```typescript
export interface DiffOptions {
  skipMedia?: boolean;
}
```

**File**: `src/core/diff/service.ts`

Update the `compare` method signature to accept options:

```typescript
async compare(
  localConfig: Configuration,
  remoteConfig: RemoteConfiguration,
  options?: DiffOptions
): Promise<{ summary: DiffSummary; output: string }>
```

---

### Step 3: Update ProductComparator (20 min)

**File**: `src/core/diff/comparators/product-comparator.ts`

1. Add options parameter to compare method
2. Skip media comparison when `skipMedia` is true

```typescript
// Find the media comparison block (around line 272-279)
// Wrap it in a conditional:

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

**Verify**:
```bash
pnpm test src/core/diff/comparators/product-comparator
```

---

### Step 4: Update DeploymentContext (10 min)

**File**: `src/core/deployment/types.ts`

```typescript
export interface DeploymentContext {
  configurator: Configurator;
  args: DeployCommandArgs;
  summary: DiffSummary;
  startTime: Date;
  skipMedia?: boolean;  // NEW
}
```

**File**: `src/commands/deploy.ts`

Update context creation (around line 232):

```typescript
const context: DeploymentContext = {
  configurator,
  args,
  summary,
  startTime,
  skipMedia: args.skipMedia,  // NEW
};
```

---

### Step 5: Skip Media Sync in ProductService (20 min)

**File**: `src/modules/product/product-service.ts`

1. Update `bootstrapProduct` method (around line 717):

```typescript
// Step 2: Sync media (if provided in config and not skipped)
if (productInput.media !== undefined && !context?.skipMedia) {
  await this.syncProductMedia(product, productInput.media);
} else if (context?.skipMedia && productInput.media !== undefined) {
  logger.info(`Skipping media sync for product ${productInput.slug} (--skip-media enabled)`);
}
```

2. Update `bootstrapProductsBulk` method (around line 1260):

```typescript
// Step 7: Handle media for products (unless skipped)
if (!context?.skipMedia) {
  await Promise.all(
    allProductInputs.map(async (productInput) => {
      // ... existing media sync code ...
    })
  );
} else {
  const mediaCount = allProductInputs.filter(p => p.media !== undefined).length;
  if (mediaCount > 0) {
    logger.info(`Skipping media sync for ${mediaCount} products (--skip-media enabled)`);
  }
}
```

---

### Step 6: Add CLI Output (15 min)

**File**: `src/commands/deploy.ts`

Add status message in `performDeploymentFlow` (after analyzing differences):

```typescript
if (args.skipMedia) {
  this.console.muted("🎬 Media handling: Skipped (--skip-media enabled)");
}
```

Add summary at end of deployment (in `executeDeployment`):

```typescript
// After deployment completes
if (args.skipMedia) {
  const mediaCount = summary.results.filter(
    r => r.entityType === 'Product' && r.operation !== 'DELETE'
  ).length;
  if (mediaCount > 0) {
    this.console.muted(`ℹ️  Media skipped for ${mediaCount} products`);
  }
}
```

---

### Step 7: Add Cross-Environment Warning (20 min)

**File**: `src/core/deployment/media-warning.ts` (new file)

```typescript
export function detectCrossEnvironmentMedia(
  config: Configuration,
  targetUrl: string
): { detected: boolean; sourceHosts: string[] } {
  const targetHost = new URL(targetUrl).host;
  const sourceHosts = new Set<string>();

  for (const product of config.products ?? []) {
    for (const media of product.media ?? []) {
      try {
        const host = new URL(media.externalUrl).host;
        if (host !== targetHost && host.includes('saleor')) {
          sourceHosts.add(host);
        }
      } catch {
        // Invalid URL, skip
      }
    }
  }

  return {
    detected: sourceHosts.size > 0,
    sourceHosts: Array.from(sourceHosts),
  };
}
```

**File**: `src/commands/deploy.ts`

Add check in `performDeploymentFlow`:

```typescript
import { detectCrossEnvironmentMedia } from "../core/deployment/media-warning";

// After loading config, before displaying diff
if (!args.skipMedia) {
  const cfg = await configurator.services.configStorage.load();
  const crossEnv = detectCrossEnvironmentMedia(cfg, args.url);
  if (crossEnv.detected) {
    this.console.warn(
      `⚠️  Cross-environment media URLs detected:\n` +
      `   Media URLs from ${crossEnv.sourceHosts.join(", ")} found in config.\n` +
      `   Consider using --skip-media for cross-environment deployments.`
    );
  }
}
```

---

### Step 8: Write Tests (30 min)

**File**: `src/core/diff/comparators/product-comparator.test.ts`

```typescript
describe("ProductComparator with skipMedia", () => {
  it("should not report media changes when skipMedia is true", () => {
    const local = createProductEntity({ media: [{ externalUrl: "https://a.com/1.jpg" }] });
    const remote = createProductEntity({ media: [{ externalUrl: "https://b.com/2.jpg" }] });

    const changes = comparator.compare(local, remote, { skipMedia: true });

    expect(changes).not.toContainEqual(
      expect.objectContaining({ field: "media" })
    );
  });

  it("should report media changes when skipMedia is false", () => {
    const local = createProductEntity({ media: [{ externalUrl: "https://a.com/1.jpg" }] });
    const remote = createProductEntity({ media: [{ externalUrl: "https://b.com/2.jpg" }] });

    const changes = comparator.compare(local, remote, { skipMedia: false });

    expect(changes).toContainEqual(
      expect.objectContaining({ field: "media" })
    );
  });
});
```

---

## Verification Checklist

```bash
# Build
pnpm build

# Unit tests
pnpm test

# Type check
npx tsc --noEmit

# Lint
pnpm check:fix

# CI validation
pnpm check:ci
```

---

## E2E Testing

```bash
# Test environment
URL="https://store-rzalldyg.saleor.cloud/graphql/"
TOKEN="YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs"

# Test diff with skip-media
pnpm dev diff --url $URL --token $TOKEN --skip-media

# Test deploy with skip-media (dry-run)
pnpm dev deploy --url $URL --token $TOKEN --skip-media --plan
```

---

## Common Issues

### Issue: Media still appearing in diff

**Solution**: Ensure DiffOptions is passed through from DiffService to ProductComparator.

### Issue: Media still syncing during deploy

**Solution**: Verify `context.skipMedia` is populated in DeploymentContext.

### Issue: Cross-env warning not showing

**Solution**: Check URL parsing in `detectCrossEnvironmentMedia`.

