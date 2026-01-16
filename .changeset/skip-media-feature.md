---
"@saleor/configurator": minor
---

Add `--skip-media` flag to `diff` and `deploy` commands

This feature allows users to exclude media fields from comparison and deployment operations when syncing across environments with different media URLs.

### New Features:
- **`--skip-media` flag**: Available on both `diff` and `deploy` commands
- **Media comparison skipping**: When enabled, media differences are not reported in diff results
- **Media sync skipping**: When enabled, existing media on target environment is preserved during deployment
- **CLI feedback**: Clear status messages indicate when media handling is being skipped

### Usage:
```bash
# Show diff excluding media differences
saleor-configurator diff --skip-media

# Deploy without modifying target media
saleor-configurator deploy --skip-media
```

### Technical Improvements:
- Unified `ComparatorOptions` type using `Pick<DiffOptions, 'skipMedia'>`
- Removed duplicate `Products` entry from EntityType union
- Removed redundant `skipMedia` field from `DeploymentContext` (access via `args.skipMedia`)
- Updated all entity comparators with consistent options signature
- Added unit tests for skipMedia behavior in ProductComparator
