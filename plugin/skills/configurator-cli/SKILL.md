---
name: configurator-cli
version: 2.0.0
description: "CLI commands for deploying, diffing, and introspecting Saleor stores. Use when asking about deploy, introspect, diff, dry-run, CI/CD setup, or CLI flags."
allowed-tools: Bash, Read, Grep
---

# Configurator CLI

## Overview

The Saleor Configurator CLI syncs your YAML configuration with a live Saleor instance. You define your store in `config.yml`, then use CLI commands to preview and apply changes.

## When to Use

- "How do I deploy my config?"
- "How do I pull the current store configuration?"
- "How do I preview changes before deploying?"
- "What flags does deploy support?"
- "How do I set up CI/CD for my store?"
- "What do the exit codes mean?"
- When NOT modeling products or writing YAML -- use `product-modeling` or `configurator-schema` instead

## Core Commands

### introspect

Pulls the current configuration from a Saleor instance into `config.yml`.

```bash
npx configurator introspect --url=$SALEOR_API_URL --token=$SALEOR_TOKEN
```

**Use cases:** initial setup, backup before changes, restore from known-good state.

### deploy

Pushes local `config.yml` changes to a Saleor instance.

```bash
npx configurator deploy --url=$SALEOR_API_URL --token=$SALEOR_TOKEN
```

**Important flags:**
- `--dry-run` -- preview changes without applying
- `--fail-on-delete` -- abort if any deletions would occur
- `--include <types>` -- only deploy specific entity types
- `--exclude <types>` -- skip specific entity types
- `--skip-media` -- skip media file uploads

### diff

Compares local `config.yml` with the remote Saleor instance.

```bash
npx configurator diff --url=$SALEOR_API_URL --token=$SALEOR_TOKEN
```

**Output markers:** `+ CREATE` (new), `~ UPDATE` (modified), `- DELETE` (removed).

### start

Interactive setup wizard for new configurations.

```bash
npx configurator start
```

## Quick Reference

| Flag | Commands | Description |
|------|----------|-------------|
| `--url` | All | Saleor GraphQL endpoint URL |
| `--token` | All | Saleor API authentication token |
| `--include` | deploy, diff | Comma-separated entity types to include |
| `--exclude` | deploy, diff | Comma-separated entity types to exclude |
| `--fail-on-delete` | deploy | Exit with error if deletions detected |
| `--dry-run` | deploy | Show plan without executing changes |
| `--skip-media` | deploy, diff | Skip media file comparison/upload |

## Environment Variables

Instead of passing flags every time, set environment variables:

```bash
export SALEOR_API_URL="https://your-store.saleor.cloud/graphql/"
export SALEOR_TOKEN="your-api-token"

npx configurator deploy  # No flags needed
```

Or use a `.env` file in your project root.

## Exit Codes

| Code | Meaning | Action |
|------|---------|--------|
| 0 | Success | Operation completed |
| 1 | General error | Check error message |
| 2 | Validation error | Fix config.yml syntax/schema |
| 3 | Authentication error | Verify URL and token |
| 4 | Network error | Check connectivity |

## Common Workflows

### Initial Store Setup

```bash
npx configurator introspect --url=$URL --token=$TOKEN  # Pull current state
# Edit config.yml
npx configurator diff --url=$URL --token=$TOKEN         # Preview changes
npx configurator deploy --url=$URL --token=$TOKEN       # Apply changes
```

### Safe CI/CD Deployment

```bash
npx configurator deploy --url=$URL --token=$TOKEN --fail-on-delete
```

### Selective Deployment

```bash
# Deploy only channels and products
npx configurator deploy --url=$URL --token=$TOKEN --include channels,products

# Deploy everything except products
npx configurator deploy --url=$URL --token=$TOKEN --exclude products
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Deploying without previewing first | Always run `diff` (or `deploy --dry-run`) before `deploy` |
| Wrong URL format | URL must end with `/graphql/` (e.g., `https://store.saleor.cloud/graphql/`) |
| Expired or invalid token | Regenerate your API token in Saleor Dashboard under Settings > Service Accounts |
| Forgetting `--fail-on-delete` in CI | Always use `--fail-on-delete` in automated pipelines to prevent accidental deletions |
| Not backing up before major changes | Run `introspect` first to save current state to `config.yml` |

## See Also

- For complete command reference, see [reference/commands.md](reference/commands.md)
- For all flags and options, see [reference/flags.md](reference/flags.md)
- For error code details, see [reference/error-codes.md](reference/error-codes.md)

### Related Skills

- **`configurator-schema`** - Config.yml structure and validation rules
- **`saleor-domain`** - Entity relationships and Saleor concepts
