# CLI Command Reference

Complete reference for all Configurator CLI commands.

## introspect

Fetches configuration from a Saleor instance and writes to `config.yml`.

### Synopsis

```bash
npx configurator introspect [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--url <url>` | Saleor GraphQL endpoint | `$SALEOR_API_URL` |
| `--token <token>` | API authentication token | `$SALEOR_TOKEN` |
| `--output <file>` | Output file path | `config.yml` |
| `--include <types>` | Entity types to include | All types |
| `--exclude <types>` | Entity types to exclude | None |

### Examples

```bash
# Basic introspection
npx configurator introspect --url=https://store.saleor.cloud/graphql/ --token=abc123

# Using environment variables
export SALEOR_API_URL="https://store.saleor.cloud/graphql/"
export SALEOR_TOKEN="abc123"
npx configurator introspect

# Only fetch products and categories
npx configurator introspect --include=products,categories

# Fetch everything except products
npx configurator introspect --exclude=products

# Custom output file
npx configurator introspect --output=staging-config.yml
```

### Output

Creates or overwrites `config.yml` with the current remote state.

---

## deploy

Pushes local configuration to a Saleor instance.

### Synopsis

```bash
npx configurator deploy [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--url <url>` | Saleor GraphQL endpoint | `$SALEOR_API_URL` |
| `--token <token>` | API authentication token | `$SALEOR_TOKEN` |
| `--input <file>` | Input config file | `config.yml` |
| `--include <types>` | Entity types to deploy | All types |
| `--exclude <types>` | Entity types to skip | None |
| `--dry-run` | Preview without executing | `false` |
| `--fail-on-delete` | Exit if deletions detected | `false` |
| `--skip-media` | Skip media file uploads | `false` |

### Examples

```bash
# Basic deployment
npx configurator deploy --url=https://store.saleor.cloud/graphql/ --token=abc123

# Dry run - preview changes
npx configurator deploy --dry-run

# Safe deployment - fail if anything would be deleted
npx configurator deploy --fail-on-delete

# Deploy only specific entity types
npx configurator deploy --include=channels,productTypes

# Skip product deployment
npx configurator deploy --exclude=products

# Skip media uploads for faster deployment
npx configurator deploy --skip-media
```

### Output

Shows deployment progress with:
- `✓ CREATE` - Entity created
- `✓ UPDATE` - Entity updated
- `✓ DELETE` - Entity deleted
- `✗ ERROR` - Operation failed

### Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success - all operations completed |
| 1 | Error - one or more operations failed |
| 2 | Validation - config.yml has errors |
| 3 | Authentication - invalid credentials |
| 4 | Network - connection failed |

---

## diff

Compares local configuration with remote Saleor instance.

### Synopsis

```bash
npx configurator diff [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--url <url>` | Saleor GraphQL endpoint | `$SALEOR_API_URL` |
| `--token <token>` | API authentication token | `$SALEOR_TOKEN` |
| `--input <file>` | Input config file | `config.yml` |
| `--include <types>` | Entity types to compare | All types |
| `--exclude <types>` | Entity types to skip | None |
| `--skip-media` | Skip media file comparison | `false` |

### Examples

```bash
# Compare all entities
npx configurator diff

# Compare only products
npx configurator diff --include=products

# Compare everything except media
npx configurator diff --skip-media
```

### Output Format

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

### Symbols

| Symbol | Meaning |
|--------|---------|
| `+` | Will be created |
| `~` | Will be updated |
| `-` | Will be deleted |

---

## start

Interactive setup wizard for new configurations.

### Synopsis

```bash
npx configurator start [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--template <name>` | Start from template | None |
| `--output <file>` | Output file path | `config.yml` |

### Examples

```bash
# Interactive wizard
npx configurator start

# Start from fashion template
npx configurator start --template=fashion-store
```

### Wizard Steps

1. **Store Type**: Select business type (fashion, electronics, etc.)
2. **Channels**: Configure sales channels and currencies
3. **Product Types**: Define product structures
4. **Categories**: Set up category hierarchy
5. **Review**: Preview generated configuration

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
| `SALEOR_API_URL` | Default GraphQL endpoint |
| `SALEOR_TOKEN` | Default API token |
| `CONFIGURATOR_CONFIG` | Default config file path |
| `NO_COLOR` | Disable colored output |
