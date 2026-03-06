# CI/CD Integration Guide

Setting up Saleor Configurator in automated pipelines.

## GitHub Actions

### Basic Deploy Pipeline

```yaml
name: Deploy Saleor Config
on:
  push:
    branches: [main]
    paths: ['config.yml']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Validate config
        run: npx @saleor/configurator validate --json

      - name: Preview changes
        run: npx @saleor/configurator deploy --plan --json
        env:
          SALEOR_URL: ${{ secrets.SALEOR_URL }}
          SALEOR_TOKEN: ${{ secrets.SALEOR_TOKEN }}

      - name: Deploy
        run: npx @saleor/configurator deploy --fail-on-delete --report-path=deploy-report.json --json
        env:
          SALEOR_URL: ${{ secrets.SALEOR_URL }}
          SALEOR_TOKEN: ${{ secrets.SALEOR_TOKEN }}

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: deploy-report
          path: deploy-report.json
```

### PR Preview (Plan Only)

```yaml
name: Preview Config Changes
on:
  pull_request:
    paths: ['config.yml']

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate
        run: npx @saleor/configurator validate --json

      - name: Plan
        id: plan
        run: |
          OUTPUT=$(npx @saleor/configurator deploy --plan --json 2>/dev/null)
          echo "$OUTPUT" | jq '.result.summary'
        env:
          SALEOR_URL: ${{ secrets.SALEOR_URL }}
          SALEOR_TOKEN: ${{ secrets.SALEOR_TOKEN }}
```

### Drift Detection

```yaml
name: Config Drift Check
on:
  schedule:
    - cron: '0 8 * * *'  # Daily at 8am

jobs:
  drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check for drift
        run: npx @saleor/configurator introspect --drift-check --json
        env:
          SALEOR_URL: ${{ secrets.SALEOR_URL }}
          SALEOR_TOKEN: ${{ secrets.SALEOR_TOKEN }}
```

## Environment Setup

### Secrets

Store credentials as CI secrets, never in code:

| Secret | Value |
|--------|-------|
| `SALEOR_URL` | `https://your-store.saleor.cloud/graphql/` |
| `SALEOR_TOKEN` | API token with required permissions |

### Non-Interactive Mode

The CLI auto-detects non-TTY environments (CI runners, pipes). No special flags needed:
- Confirmation prompts are skipped automatically
- JSON envelope is the default output format
- Use `--json` explicitly for clarity in scripts

## Exit Code Handling

```bash
npx @saleor/configurator deploy --fail-on-delete --json
EXIT=$?

case $EXIT in
  0) echo "Success" ;;
  4) echo "Config validation failed" ;;
  5) echo "Partial failure — check report" ;;
  6) echo "Deletions blocked" ;;
  7) echo "Breaking changes blocked" ;;
  *) echo "Error: exit code $EXIT" ;;
esac
```

## Governor Tuning for CI

If hitting rate limits in CI, tune the request governor:

```yaml
env:
  GRAPHQL_GOVERNOR_ENABLED: 'true'
  GRAPHQL_MAX_CONCURRENCY: '4'
  GRAPHQL_INTERVAL_CAP: '20'
  GRAPHQL_INTERVAL_MS: '1000'
```

Lower `GRAPHQL_MAX_CONCURRENCY` (e.g., `2`) if you encounter 429 errors.
