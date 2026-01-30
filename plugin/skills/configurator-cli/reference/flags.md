# CLI Flags Reference

Complete reference for all Configurator CLI flags and options.

## Connection Flags

### --url

Saleor GraphQL API endpoint URL.

```bash
--url=https://your-store.saleor.cloud/graphql/
```

**Environment variable**: `SALEOR_API_URL`

**Format**: Must be a valid URL ending in `/graphql/`

**Examples**:
- Saleor Cloud: `https://store-abc123.saleor.cloud/graphql/`
- Self-hosted: `https://api.yourstore.com/graphql/`
- Local dev: `http://localhost:8000/graphql/`

### --token

Saleor API authentication token.

```bash
--token=your-api-token
```

**Environment variable**: `SALEOR_TOKEN`

**How to get a token**:
1. Go to Saleor Dashboard > Configuration > Tokens
2. Create a new token with appropriate permissions
3. Copy the token value (shown only once)

**Required permissions**:
- `MANAGE_PRODUCTS` - For product operations
- `MANAGE_CHANNELS` - For channel operations
- `MANAGE_SHIPPING` - For shipping zones
- `MANAGE_SETTINGS` - For shop settings
- Full access recommended for complete sync

---

## Filter Flags

### --include

Comma-separated list of entity types to include.

```bash
--include=channels,products,categories
```

**Valid entity types**:
- `shop`
- `channels`
- `productTypes`
- `pageTypes`
- `attributes`
- `categories`
- `collections`
- `products`
- `taxClasses`
- `shippingZones`
- `warehouses`
- `menus`
- `pages`

**Examples**:
```bash
# Only deploy products and their dependencies
npx configurator deploy --include=products,productTypes,categories

# Only diff channels
npx configurator diff --include=channels
```

### --exclude

Comma-separated list of entity types to exclude.

```bash
--exclude=products,pages
```

**Examples**:
```bash
# Deploy everything except products
npx configurator deploy --exclude=products

# Introspect without pages and menus
npx configurator introspect --exclude=pages,menus
```

**Note**: `--include` and `--exclude` are mutually exclusive.

---

## Safety Flags

### --dry-run

Preview changes without executing them.

```bash
npx configurator deploy --dry-run
```

**Behavior**:
- Shows what would be created, updated, deleted
- No actual API calls made
- Exit code indicates validation success/failure

**Best practice**: Always run `--dry-run` before deploying to production.

### --fail-on-delete

Exit with error code if any deletions detected.

```bash
npx configurator deploy --fail-on-delete
```

**Use cases**:
- CI/CD pipelines to prevent accidental deletions
- Production deployments
- Automated sync processes

**Exit code**: Returns 1 if deletions would occur.

### --skip-media

Skip media file comparison and upload.

```bash
npx configurator deploy --skip-media
npx configurator diff --skip-media
```

**Use cases**:
- Faster deployments when media unchanged
- Limited bandwidth environments
- Focus on configuration changes only

---

## Input/Output Flags

### --input

Path to configuration file (for deploy and diff).

```bash
--input=staging-config.yml
```

**Default**: `config.yml`

**Examples**:
```bash
# Deploy from custom file
npx configurator deploy --input=environments/production.yml

# Diff against specific config
npx configurator diff --input=backup/config-2024-01-15.yml
```

### --output

Path for output file (for introspect and start).

```bash
--output=my-config.yml
```

**Default**: `config.yml`

**Examples**:
```bash
# Introspect to custom file
npx configurator introspect --output=environments/staging.yml

# Create new config with custom name
npx configurator start --output=store-config.yml
```

---

## Output Control Flags

### --verbose

Enable detailed logging output.

```bash
npx configurator deploy --verbose
```

**Shows**:
- GraphQL queries being executed
- Response data
- Timing information
- Debug details

### --quiet

Suppress all non-error output.

```bash
npx configurator deploy --quiet
```

**Use cases**:
- CI/CD scripts parsing exit codes
- Automated processes
- Reducing log noise

### --no-color

Disable colored terminal output.

```bash
npx configurator deploy --no-color
```

**Environment variable**: `NO_COLOR=1`

**Use cases**:
- CI/CD environments
- Log files
- Piping to other commands

---

## Template Flags

### --template

Start from a predefined template (for start command).

```bash
npx configurator start --template=fashion-store
```

**Available templates**:
- `fashion-store` - Apparel with size/color variants
- `electronics-store` - Tech products with specs
- `subscription-service` - Recurring products
- `minimal` - Basic store structure

---

## Flag Combinations

### Safe Production Deploy

```bash
npx configurator deploy \
  --url=$PROD_URL \
  --token=$PROD_TOKEN \
  --fail-on-delete \
  --exclude=products
```

### Fast Configuration Sync

```bash
npx configurator deploy \
  --include=channels,productTypes,attributes \
  --skip-media
```

### CI/CD Pipeline

```bash
npx configurator diff --quiet || exit 0
npx configurator deploy --fail-on-delete --quiet
```

### Environment-Specific

```bash
# Staging
npx configurator deploy --input=environments/staging.yml

# Production
npx configurator deploy \
  --input=environments/production.yml \
  --fail-on-delete
```
