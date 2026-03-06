# CLI Command Reference

Complete reference for all Configurator CLI commands.

## validate

Validates `config.yml` against the schema locally. No network access required.

### Synopsis

```bash
pnpm dlx @saleor/configurator validate [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--config <file>` | Configuration file path | `config.yml` |
| `--json` | Force JSON envelope output | Auto in non-TTY |
| `--text` | Force human-readable output | `false` |

### Examples

```bash
# Validate default config
pnpm dlx @saleor/configurator validate

# Validate custom file
pnpm dlx @saleor/configurator validate --config staging-config.yml

# Machine-readable output
pnpm dlx @saleor/configurator validate --json
```

### Exit Codes

| Code | Description |
|------|-------------|
| 0 | Configuration is valid |
| 2 | Configuration has validation errors |

---

## introspect

Fetches configuration from a Saleor instance and writes to `config.yml`.

### Synopsis

```bash
pnpm dlx @saleor/configurator introspect [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--url <url>` | Saleor GraphQL endpoint | `$SALEOR_URL` |
| `--token <token>` | API authentication token | `$SALEOR_TOKEN` |
| `--config <file>` | Output file path | `config.yml` |
| `--include <types>` | Entity types to include | All types |
| `--exclude <types>` | Entity types to exclude | None |
| `--drift-check` | Exit code 1 if remote differs from local | `false` |
| `--json` | Force JSON envelope output | Auto in non-TTY |
| `--text` | Force human-readable output | `false` |

### Examples

```bash
# Basic introspection (interactive)
pnpm dlx @saleor/configurator introspect

# Using environment variables (from .env.local)
pnpm dlx @saleor/configurator introspect

# Only fetch products and categories
pnpm dlx @saleor/configurator introspect --include=products,categories

# Custom output file
pnpm dlx @saleor/configurator introspect --config=staging-config.yml
```

---

## deploy

Pushes local configuration to a Saleor instance.

### Synopsis

```bash
pnpm dlx @saleor/configurator deploy [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--url <url>` | Saleor GraphQL endpoint | `$SALEOR_URL` |
| `--token <token>` | API authentication token | `$SALEOR_TOKEN` |
| `--config <file>` | Input config file | `config.yml` |
| `--include <types>` | Entity types to deploy | All types |
| `--exclude <types>` | Entity types to skip | None |
| `--plan` | Preview without executing | `false` |
| `--fail-on-delete` | Exit code 6 if deletions detected | `false` |
| `--fail-on-breaking` | Exit code 7 if breaking changes | `false` |
| `--skip-media` | Skip media file uploads | `false` |
| `--report-path <file>` | Custom path for deployment report | Auto-generated |
| `--json` | Force JSON envelope output | Auto in non-TTY |
| `--text` | Force human-readable output | `false` |

### Examples

```bash
# Preview changes (plan mode)
pnpm dlx @saleor/configurator deploy --plan

# Machine-readable plan
pnpm dlx @saleor/configurator deploy --plan --json

# Execute deployment
pnpm dlx @saleor/configurator deploy

# Safe deployment - fail if anything would be deleted
pnpm dlx @saleor/configurator deploy --fail-on-delete

# Deploy only specific entity types
pnpm dlx @saleor/configurator deploy --include=channels,productTypes

# Skip media uploads for faster deployment
pnpm dlx @saleor/configurator deploy --skip-media

# Save report to custom path
pnpm dlx @saleor/configurator deploy --report-path=reports/deploy.json
```

### Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success - all operations completed |
| 1 | Unexpected error |
| 2 | Authentication - invalid credentials |
| 3 | Network - connection failed |
| 4 | Validation - config.yml has errors |
| 5 | Partial failure - some operations failed |
| 6 | Deletion blocked - `--fail-on-delete` triggered |
| 7 | Breaking blocked - `--fail-on-breaking` triggered |

---

## diff

Compares local configuration with remote Saleor instance.

### Synopsis

```bash
pnpm dlx @saleor/configurator diff [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--url <url>` | Saleor GraphQL endpoint | `$SALEOR_URL` |
| `--token <token>` | API authentication token | `$SALEOR_TOKEN` |
| `--config <file>` | Input config file | `config.yml` |
| `--include <types>` | Entity types to compare | All types |
| `--exclude <types>` | Entity types to skip | None |
| `--skip-media` | Skip media file comparison | `false` |
| `--entity-type <type>` | Filter to one entity type | None |
| `--entity <Type/name>` | Filter to one specific entity | None |
| `--json` | Force JSON envelope output | Auto in non-TTY |
| `--text` | Force human-readable output | `false` |

### Examples

```bash
# Compare all entities
pnpm dlx @saleor/configurator diff

# Machine-readable diff
pnpm dlx @saleor/configurator diff --json

# Compare only categories
pnpm dlx @saleor/configurator diff --include=categories

# Drill into specific entity type
pnpm dlx @saleor/configurator diff --entity-type "Categories" --json

# Drill into specific entity
pnpm dlx @saleor/configurator diff --entity "Categories/electronics" --json
```

### Output Format (Human-Readable)

```
channels:
  + CREATE "eu-store" (European Store)

productTypes:
  ~ UPDATE "T-Shirt"
    - productAttributes: ["Brand", "Material"]
    + productAttributes: ["Brand", "Material", "Care Instructions"]

products:
  - DELETE "old-product" (Discontinued Item)
```

---

## start

Interactive setup wizard for new configurations.

### Synopsis

```bash
pnpm dlx @saleor/configurator start [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--template <name>` | Start from template | None |
| `--config <file>` | Output file path | `config.yml` |

---

## Global Options

These options work with all commands:

| Option | Description |
|--------|-------------|
| `--help` | Show command help |
| `--version` | Show CLI version |
| `--verbose` | Enable detailed logging |
| `--quiet` | Suppress non-error output |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SALEOR_URL` | Default GraphQL endpoint |
| `SALEOR_TOKEN` | Default API token |
| `NO_COLOR` | Disable colored output |
| `LOG_LEVEL` | Log verbosity (debug, info, warn, error) |

Credentials can also be set in `.env.local` (auto-loaded by the CLI).
