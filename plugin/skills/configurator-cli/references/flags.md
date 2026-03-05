# CLI Flags Reference

Complete reference for all Configurator CLI flags and options.

## Connection Flags

### --url

Saleor GraphQL API endpoint URL.

```bash
--url=https://your-store.saleor.cloud/graphql/
```

**Environment variable**: `SALEOR_URL`

**Format**: Must be a valid HTTPS URL ending in `/graphql/`

**Examples**:
- Saleor Cloud: `https://store-abc123.saleor.cloud/graphql/`
- Self-hosted: `https://api.yourstore.com/graphql/`

**Validation**: The CLI validates URLs must use HTTPS and end with `/graphql/`.

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

### --exclude

Comma-separated list of entity types to exclude.

```bash
--exclude=products,pages
```

**Note**: `--include` and `--exclude` are mutually exclusive.

### --entity-type

Filter diff results to a single entity type. Available on `diff` command.

```bash
--entity-type="Categories"
```

### --entity

Filter diff results to a specific entity by Type/name. Available on `diff` command.

```bash
--entity="Categories/electronics"
```

---

## Safety Flags

### --plan

Preview changes without executing them. Available on `deploy` command.

```bash
pnpm dlx @saleor/configurator deploy --plan
```

**Behavior**:
- Shows what would be created, updated, deleted
- No actual API mutations made
- Combine with `--json` for machine-readable plan

### --fail-on-delete

Exit with code 6 if any deletions detected. Available on `deploy` command.

```bash
pnpm dlx @saleor/configurator deploy --fail-on-delete
```

**Use cases**:
- CI/CD pipelines to prevent accidental deletions
- Production deployments
- Automated sync processes

### --fail-on-breaking

Exit with code 7 if breaking changes detected. Available on `deploy` command.

```bash
pnpm dlx @saleor/configurator deploy --fail-on-breaking
```

### --skip-media

Skip media file comparison and upload.

```bash
pnpm dlx @saleor/configurator deploy --skip-media
```

---

## Output Control Flags

### --json

Force JSON envelope output, even in a TTY terminal.

```bash
pnpm dlx @saleor/configurator deploy --json
```

**Note**: In non-TTY mode (pipes, CI), JSON envelope is the default output format.

### --text

Force human-readable output, even in non-TTY mode. Overrides `--json`.

```bash
pnpm dlx @saleor/configurator deploy --text
```

### --verbose

Enable detailed logging output.

```bash
pnpm dlx @saleor/configurator deploy --verbose
```

### --quiet

Suppress all non-error output.

```bash
pnpm dlx @saleor/configurator deploy --quiet
```

### --report-path

Custom file path for the deployment report. Available on `deploy` command.

```bash
pnpm dlx @saleor/configurator deploy --report-path=reports/my-deploy.json
```

**Default**: Auto-generated as `deployment-report-YYYY-MM-DD_HH-MM-SS.json` in the current working directory.

**Use cases**:
- CI/CD pipelines needing predictable report file location
- Archiving reports alongside deployment artifacts
- Custom report directories

---

## Input/Output Flags

### --config

Path to configuration file.

```bash
--config=staging-config.yml
```

**Default**: `config.yml`

---

## Flag Combinations

### Safe Production Deploy

```bash
pnpm dlx @saleor/configurator deploy \
  \
  --fail-on-delete \
  --exclude=products
```

### Machine-Readable Plan

```bash
pnpm dlx @saleor/configurator deploy \
  --plan --json
```

### Entity-Scoped Debugging

```bash
pnpm dlx @saleor/configurator diff \
  --entity "Categories/electronics" \
  --json
```

### Safe Production Deploy with Breaking Change Protection

```bash
pnpm dlx @saleor/configurator deploy \
  --fail-on-delete \
  --fail-on-breaking \
  --report-path=reports/deploy.json
```

### CI/CD Pipeline

```bash
pnpm dlx @saleor/configurator validate --json
pnpm dlx @saleor/configurator deploy --fail-on-delete --report-path=reports/deploy.json --json
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SALEOR_URL` | Default GraphQL endpoint |
| `SALEOR_TOKEN` | Default API token |
| `NO_COLOR` | Disable colored output |
| `LOG_LEVEL` | Log verbosity (debug, info, warn, error) |
| `GRAPHQL_GOVERNOR_ENABLED` | Enable/disable request governor |
| `GRAPHQL_MAX_CONCURRENCY` | Max concurrent GraphQL requests |
| `GRAPHQL_INTERVAL_CAP` | Max requests per interval |
| `GRAPHQL_INTERVAL_MS` | Interval window in ms |

Credentials can also be set in `.env.local` (auto-loaded by the CLI).

---

## Governor Tuning

The request governor prevents rate limiting by controlling GraphQL request flow. Tune via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `GRAPHQL_GOVERNOR_ENABLED` | `true` | Enable/disable the governor |
| `GRAPHQL_MAX_CONCURRENCY` | `4` | Max concurrent GraphQL requests |
| `GRAPHQL_INTERVAL_CAP` | `20` | Max requests per interval window |
| `GRAPHQL_INTERVAL_MS` | `1000` | Interval window in milliseconds |

### Recommended Profiles

**Conservative (rate-limited APIs or CI)**:
```bash
GRAPHQL_MAX_CONCURRENCY=2
GRAPHQL_INTERVAL_CAP=10
GRAPHQL_INTERVAL_MS=1000
```

**Default (most Saleor Cloud instances)**:
```bash
GRAPHQL_MAX_CONCURRENCY=4
GRAPHQL_INTERVAL_CAP=20
GRAPHQL_INTERVAL_MS=1000
```

**Aggressive (self-hosted, no rate limits)**:
```bash
GRAPHQL_GOVERNOR_ENABLED=false
```

### Diagnosing Rate Limits

If you see 429 errors or throttling in logs:
1. Set `LOG_LEVEL=debug` to see request timing
2. Lower `GRAPHQL_MAX_CONCURRENCY` (try `2`)
3. Lower `GRAPHQL_INTERVAL_CAP` (try `10`)
4. If persistent, increase `GRAPHQL_INTERVAL_MS` (try `2000`)
