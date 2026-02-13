---
name: configurator-cli
version: 1.0.0
description: Provides comprehensive guidance for Saleor Configurator CLI commands and usage patterns. This skill should be invoked when the user asks about deploying configurations, introspecting stores, running diffs, or executing any CLI operations against a Saleor instance. Covers deploy, introspect, diff, and start commands with all flags and environment variables.
allowed-tools: Bash, Read, Grep
---

# Configurator CLI

The Saleor Configurator CLI is a declarative "commerce as code" tool that syncs YAML configuration files with Saleor e-commerce instances.

## Core Commands

### introspect

Fetches the current configuration from a Saleor instance and writes it to `config.yml`.

```bash
npx configurator introspect --url=$SALEOR_API_URL --token=$SALEOR_TOKEN
```

**Use cases:**
- Initial setup: Pull existing store configuration
- Backup: Snapshot current state before changes
- Recovery: Restore from known-good state

### deploy

Pushes local `config.yml` changes to a Saleor instance.

```bash
npx configurator deploy --url=$SALEOR_API_URL --token=$SALEOR_TOKEN
```

**Important flags:**
- `--dry-run`: Preview changes without applying
- `--fail-on-delete`: Abort if any deletions would occur
- `--include <types>`: Only deploy specific entity types
- `--exclude <types>`: Skip specific entity types
- `--skip-media`: Skip media file uploads

**Safety notes:**
- Always run `diff` before `deploy` to preview changes
- Use `--fail-on-delete` in CI/CD pipelines
- Back up with `introspect` before major changes

### diff

Compares local `config.yml` with remote Saleor instance.

```bash
npx configurator diff --url=$SALEOR_API_URL --token=$SALEOR_TOKEN
```

**Output shows:**
- `+ CREATE`: New entities to be created
- `~ UPDATE`: Entities with modifications
- `- DELETE`: Entities that will be removed

### start

Interactive setup wizard for new configurations.

```bash
npx configurator start
```

## Common Flags

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

Instead of passing flags, set environment variables:

```bash
export SALEOR_API_URL="https://your-store.saleor.cloud/graphql/"
export SALEOR_TOKEN="your-api-token"

# Then run without flags:
npx configurator deploy
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

## Development Mode

When developing the Configurator itself:

```bash
# Run from source
pnpm dev introspect --url=$URL --token=$TOKEN
pnpm dev deploy --url=$URL --token=$TOKEN
pnpm dev diff --url=$URL --token=$TOKEN
```

## Common Workflows

### Initial Store Setup

```bash
# 1. Create config from existing store
npx configurator introspect --url=$URL --token=$TOKEN

# 2. Edit config.yml to make changes

# 3. Preview changes
npx configurator diff --url=$URL --token=$TOKEN

# 4. Deploy changes
npx configurator deploy --url=$URL --token=$TOKEN
```

### Safe CI/CD Deployment

```bash
# Fail if any entities would be deleted
npx configurator deploy \
  --url=$URL \
  --token=$TOKEN \
  --fail-on-delete
```

### Selective Deployment

```bash
# Deploy only channels and products
npx configurator deploy \
  --url=$URL \
  --token=$TOKEN \
  --include channels,products

# Deploy everything except products
npx configurator deploy \
  --url=$URL \
  --token=$TOKEN \
  --exclude products
```

## See Also

- For complete command reference, see [reference/commands.md](reference/commands.md)
- For all flags and options, see [reference/flags.md](reference/flags.md)
- For error code details, see [reference/error-codes.md](reference/error-codes.md)

### Related Skills

- **`configurator-schema`** - Config.yml structure and validation rules
- **`saleor-domain`** - Entity relationships and Saleor concepts
