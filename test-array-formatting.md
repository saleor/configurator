# Testing Array Change Formatting

This is a TEMPORARY feature flag for A/B testing array change display formats.

## How to Test

### 1. Compact Array Format (Default)
Shows array changes in a single line with additions and removals clearly marked:

```bash
pnpm dev deploy \
  --url https://store-rzalldyg.saleor.cloud/graphql/ \
  --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs
```

Expected output:
```
🔄 Update: "Audiobook"
  │ attributes.Medium.values: [-Vinyl, +VinylChanged, +MP4]
```

### 2. Individual Line Format (Legacy)
Shows each array change as a separate line:

```bash
SALEOR_COMPACT_ARRAYS=false pnpm dev deploy \
  --url https://store-rzalldyg.saleor.cloud/graphql/ \
  --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs
```

Expected output:
```
🔄 Update: "Audiobook"
  │ attributes.Medium.values: (not set) → "VinylChanged"
  │ attributes.Medium.values: (not set) → "MP4"
  │ attributes.Medium.values: "Vinyl" → (not set)
```

## Implementation Details

The feature flag is implemented as:
- Environment variable: `SALEOR_COMPACT_ARRAYS`
- Default: `true` (compact format)
- Set to `false` to use individual line format

## Cleanup Instructions

Once we decide which format to keep, remove:
1. The `compactArrays` parameter from `DeployDiffFormatter` constructor
2. The environment variable check in `deploy.ts` (lines 200-202)
3. The conditional logic in `DeployDiffFormatter.addResultDetails()`
4. The `groupArrayChanges()` and `formatArrayChange()` methods if choosing individual format
5. This test file

The code is clearly marked with `// TEMPORARY FEATURE FLAG` comment for easy removal.