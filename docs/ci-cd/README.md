# CI/CD Integration Guide

Saleor Configurator provides comprehensive CI/CD support for automating configuration management in your development workflow.

## Overview

With Saleor Configurator CI/CD integration, you can:

- **Preview changes** on pull requests before merging
- **Auto-deploy** configuration when PRs are merged
- **Detect drift** between your repository and live Saleor instances
- **Enforce policies** like blocking deletions or breaking changes
- **Multi-environment** deployments (staging → production)

## Quick Links

- [5-Minute Quick Start](./QUICKSTART.md)
- [GitHub Action Reference](./GITHUB_ACTION.md)
- [Workflow Templates](./WORKFLOWS.md)
- [Common Patterns & Cookbook](./COOKBOOK.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Pull Request   │────▶│   GitHub        │────▶│   Saleor        │
│  (config.yml)   │     │   Action        │     │   Instance      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │  PR Comment     │
                        │  (diff preview) │
                        └─────────────────┘
```

## CLI Flags for CI/CD

### Diff Command

| Flag | Description |
|------|-------------|
| `--json` | Output in JSON format for machine parsing |
| `--github-comment` | Output as GitHub PR comment markdown |
| `--fail-on-delete` | Exit code 6 if deletions detected |
| `--fail-on-breaking` | Exit code 7 if breaking changes |
| `--output-file <path>` | Write output to file |
| `--summary` | Show only counts, no details |

### Deploy Command

| Flag | Description |
|------|-------------|
| `--json` | Output in JSON format |
| `--plan` | Preview changes without applying (dry-run) |
| `--fail-on-delete` | Exit code 6 if deletions detected |
| `--ci` | Skip interactive prompts |

## Exit Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| 0 | Success | All operations completed |
| 1 | Changes detected | Diff found differences (informational) |
| 2 | Auth error | Invalid or expired token |
| 3 | Network error | Connection issues |
| 4 | Validation error | Invalid configuration |
| 5 | Partial failure | Some operations failed |
| 6 | Deletion blocked | `--fail-on-delete` triggered |
| 7 | Breaking blocked | `--fail-on-breaking` triggered |

## Recommended Workflows

### Basic Setup (Single Environment)

1. **PR Preview**: Run diff on PRs, post as comment
2. **Deploy on Merge**: Auto-deploy when merged to main

### Advanced Setup (Multi-Environment)

1. **PR Preview against Staging**: Show what would change
2. **Deploy to Staging**: Auto-deploy on merge to main
3. **Deploy to Production**: Manual approval required
4. **Drift Detection**: Daily check for configuration drift

## Getting Started

See [QUICKSTART.md](./QUICKSTART.md) for a 5-minute setup guide.
