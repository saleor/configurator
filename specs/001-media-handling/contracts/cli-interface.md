# CLI Interface Contract: --skip-media Flag

**Feature**: 001-media-handling
**Date**: 2026-01-16

## Overview

Defines the CLI interface contract for the `--skip-media` flag across `deploy` and `diff` commands.

---

## 1. Command Signatures

### 1.1 Deploy Command

```bash
configurator deploy [options]

Options:
  --url <url>              Saleor GraphQL endpoint URL
  --token <token>          Saleor API token
  --config <path>          Configuration file path (default: config.yml)
  --skip-media             Skip media fields during deployment (preserves target media)  # NEW
  --ci                     CI mode - skip all confirmations
  --plan                   Show deployment plan without executing (dry-run)
  --json                   Output deployment results in JSON format
  --fail-on-delete         Exit with error if deletions detected
  --report-path <path>     Path to save deployment report
  --verbose                Show detailed error information
  --quiet                  Suppress non-essential output
  --help                   Display help for command
```

### 1.2 Diff Command

```bash
configurator diff [options]

Options:
  --url <url>              Saleor GraphQL endpoint URL
  --token <token>          Saleor API token
  --config <path>          Configuration file path (default: config.yml)
  --skip-media             Exclude media fields from diff comparison  # NEW
  --json                   Output diff results in JSON format
  --github-comment         Output as GitHub PR comment markdown
  --fail-on-delete         Exit with error if deletions detected
  --fail-on-breaking       Exit with error if breaking changes detected
  --output-file <path>     Write output to file
  --summary                Show only summary counts
  --quiet                  Suppress non-essential output
  --help                   Display help for command
```

---

## 2. Flag Specification

### 2.1 --skip-media

| Attribute | Value |
|-----------|-------|
| Name | `--skip-media` |
| Type | Boolean flag |
| Default | `false` (opt-in) |
| Aliases | None |
| Required | No |
| Mutual exclusivity | None |

**Behavior**:
- When set: Media fields excluded from processing
- When not set: Default behavior (media fields processed normally)

---

## 3. Output Contract

### 3.1 Deploy with --skip-media

**Console Output** (non-JSON mode):

```
🚀 Saleor Configuration Deploy

⏳ Analyzing configuration differences...
🎬 Media handling: Skipped (--skip-media enabled)

📊 Deployment Preview:
╭─────────────────────────────────────────────────────────╮
│ 🔄 5 changes will be applied to your Saleor instance   │
├─────────────────────────────────────────────────────────┤
│ ✅ 2 items to create                                   │
│ 📝 3 items to update                                   │
╰─────────────────────────────────────────────────────────╯

[... diff details ...]

? Deploy 5 changes to your Saleor instance? (y/N)

🚀 Deploying configuration to Saleor...

[... deployment progress ...]

ℹ️  Media skipped for 3 products

✅ Deployment completed successfully
```

**JSON Output** (`--json --skip-media`):

```json
{
  "status": "success",
  "options": {
    "skipMedia": true
  },
  "summary": {
    "totalChanges": 5,
    "creates": 2,
    "updates": 3,
    "deletes": 0
  },
  "mediaSkipped": {
    "count": 3,
    "products": ["product-1", "product-2", "product-3"]
  }
}
```

### 3.2 Diff with --skip-media

**Console Output** (non-JSON mode):

```
🔍 Saleor Configuration Diff

⏳ Preparing a diff between the configuration and the Saleor instance...
🎬 Media handling: Skipped (--skip-media enabled)

[... diff output without media differences ...]

✅ No differences found - configurations are in sync
```

Or if there are non-media differences:

```
🔍 Saleor Configuration Diff

⏳ Preparing a diff between the configuration and the Saleor instance...
🎬 Media handling: Skipped (--skip-media enabled)

Products:
  ~ my-product
    - name: "Old Name" → "New Name"

⚠️  Found 1 difference that would be applied by 'deploy'
```

**JSON Output** (`--json --skip-media`):

```json
{
  "saleorUrl": "https://store.saleor.cloud/graphql/",
  "configFile": "config.yml",
  "options": {
    "skipMedia": true
  },
  "summary": {
    "totalChanges": 1,
    "creates": 0,
    "updates": 1,
    "deletes": 0
  },
  "results": [
    {
      "entityType": "Product",
      "entityName": "my-product",
      "operation": "UPDATE",
      "changes": [
        {
          "field": "name",
          "currentValue": "Old Name",
          "desiredValue": "New Name"
        }
      ]
    }
  ]
}
```

### 3.3 Cross-Environment Warning (without --skip-media)

**Console Output**:

```
🚀 Saleor Configuration Deploy

⏳ Analyzing configuration differences...

⚠️  Cross-environment media URLs detected:
    Media URLs from staging.saleor.cloud found in config.
    Target environment is prod.saleor.cloud.
    Consider using --skip-media for cross-environment deployments.

📊 Deployment Preview:
[... continues normally ...]
```

---

## 4. Exit Codes

| Code | Meaning | When |
|------|---------|------|
| 0 | Success | Deployment/diff completed |
| 1 | Changes exist | Diff found differences (plan mode) |
| 2 | Validation error | Invalid config |
| 3 | Deployment error | Deployment failed |
| 10 | Deletion blocked | --fail-on-delete with deletions |
| 11 | Breaking blocked | --fail-on-breaking with breaking changes |

> Note: No new exit codes introduced for `--skip-media`.

---

## 5. Examples

### 5.1 Basic Usage

```bash
# Deploy without syncing media
configurator deploy --url https://prod.saleor.cloud/graphql/ --token $TOKEN --skip-media

# Check differences excluding media
configurator diff --url https://prod.saleor.cloud/graphql/ --token $TOKEN --skip-media
```

### 5.2 CI/CD Integration

```bash
# CI deployment with skip-media and automatic confirmation
configurator deploy --skip-media --ci

# CI diff check (machine-readable)
configurator diff --skip-media --json > diff-results.json
```

### 5.3 Combined with Other Flags

```bash
# Dry-run with skip-media
configurator deploy --skip-media --plan

# Diff with skip-media and fail on breaking changes
configurator diff --skip-media --fail-on-breaking

# Deploy with report generation
configurator deploy --skip-media --report-path ./deployment-report.json
```

---

## 6. Help Text

### 6.1 Deploy Help

```
$ configurator deploy --help

Usage: configurator deploy [options]

Deploys the local configuration to the remote Saleor instance

Options:
  --url <url>              Saleor GraphQL endpoint URL
  --token <token>          Saleor API token
  --config <path>          Configuration file path (default: "config.yml")
  --skip-media             Skip media fields during deployment (preserves target media)
  --ci                     CI mode - skip all confirmations (default: false)
  --plan                   Show deployment plan without executing (default: false)
  --json                   Output deployment results in JSON format (default: false)
  --fail-on-delete         Exit with error if deletions detected (default: false)
  --report-path <path>     Path to save deployment report
  --verbose                Show detailed error information (default: false)
  -q, --quiet              Suppress non-essential output (default: false)
  -h, --help               Display help for command

Examples:
  configurator deploy --url https://my-shop.saleor.cloud/graphql/ --token token123
  configurator deploy --skip-media --ci
  configurator deploy --plan
```

### 6.2 Diff Help

```
$ configurator diff --help

Usage: configurator diff [options]

Shows the differences between local and remote Saleor configurations

Options:
  --url <url>              Saleor GraphQL endpoint URL
  --token <token>          Saleor API token
  --config <path>          Configuration file path (default: "config.yml")
  --skip-media             Exclude media fields from diff comparison
  --json                   Output diff results in JSON format (default: false)
  --github-comment         Output as GitHub PR comment markdown (default: false)
  --fail-on-delete         Exit with error if deletions detected (default: false)
  --fail-on-breaking       Exit with error if breaking changes detected (default: false)
  --output-file <path>     Write output to file
  --summary                Show only summary counts (default: false)
  -q, --quiet              Suppress non-essential output (default: false)
  -h, --help               Display help for command

Examples:
  configurator diff --url https://my-shop.saleor.cloud/graphql/ --token token123
  configurator diff --skip-media
  configurator diff --json
```

