# Workflow Templates Reference

Pre-built GitHub Actions workflow templates for common Saleor Configurator use cases.

## Available Templates

All templates are available in [`examples/github-workflows/`](../../examples/github-workflows/):

| Template | Trigger | Purpose |
|----------|---------|---------|
| `configurator-pr-diff.yml` | Pull Request | Preview changes as PR comment |
| `configurator-deploy-staging.yml` | Push to main | Auto-deploy to staging |
| `configurator-deploy-prod.yml` | Manual/workflow_run | Production deploy with approval |
| `configurator-drift-detect.yml` | Scheduled | Daily drift detection |
| `_reusable-configurator.yml` | workflow_call | Shared logic for DRY workflows |

---

## PR Diff Preview

**File:** `configurator-pr-diff.yml`

Shows configuration changes as a PR comment before merging.

### Features

- Automatic diff on config file changes
- Posts formatted comment to PR
- Fails if deletions detected (configurable)
- Adds summary to workflow run

### Usage

```yaml
# Copy to .github/workflows/configurator-pr-diff.yml
# Customize paths filter and environment
```

### Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `fail-on-delete` | `true` | Block PR if deletions |
| `post-pr-comment` | `true` | Post diff as comment |
| Environment | `staging` | Which secrets to use |

---

## Deploy to Staging

**File:** `configurator-deploy-staging.yml`

Automatically deploys when changes are merged to main.

### Features

- Triggered on push to main
- Generates deployment report
- Uploads report as artifact

### Usage

1. Create `staging` environment in repository settings
2. Add `SALEOR_URL` and `SALEOR_TOKEN` secrets to environment
3. Copy workflow to `.github/workflows/`

### Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `report-path` | `deployment-report.json` | Report file location |
| Concurrency | Non-cancelling | Won't cancel running deploys |

---

## Deploy to Production

**File:** `configurator-deploy-prod.yml`

Production deployment with manual approval and dry-run option.

### Features

- Manual trigger with dry-run option
- Auto-trigger after staging deployment
- Required reviewer approval
- Blocks on deletions
- 90-day report retention

### Usage

1. Create `production` environment in repository settings
2. Configure required reviewers for environment
3. Add `PROD_SALEOR_URL` and `PROD_SALEOR_TOKEN` secrets

### Triggering

**Manual:**
```bash
gh workflow run "Deploy to Production" -f dry-run=true
```

**Automatic:** Runs after successful staging deployment

---

## Drift Detection

**File:** `configurator-drift-detect.yml`

Scheduled checks for configuration drift.

### Features

- Daily scheduled run (6 AM UTC)
- Checks multiple environments
- Creates GitHub issues for drift
- Manual trigger option

### Usage

1. Add secrets for each environment to check
2. Customize schedule if needed
3. Create `drift` and `configuration` labels

### Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Schedule | `0 6 * * *` | Cron expression |
| Environments | staging, production | Which to check |

---

## Reusable Workflow

**File:** `_reusable-configurator.yml`

Shared workflow logic for consistent operations.

### Usage

Call from another workflow:

```yaml
jobs:
  deploy:
    uses: ./.github/workflows/_reusable-configurator.yml
    with:
      command: deploy
      environment: staging
    secrets: inherit
```

### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `command` | Yes | - | diff, deploy, introspect |
| `environment` | Yes | - | staging, production |
| `config-path` | No | config.yml | Config file path |
| `fail-on-delete` | No | false | Block on deletions |
| `fail-on-breaking` | No | false | Block on breaking changes |
| `plan-only` | No | false | Dry-run mode |
| `post-pr-comment` | No | false | Post PR comment |

### Outputs

| Output | Description |
|--------|-------------|
| `exit-code` | Command exit code |
| `has-changes` | Whether changes exist |
| `changes-count` | Total changes |
| `summary` | Human-readable summary |

---

## Customization

### Changing Trigger Paths

```yaml
on:
  pull_request:
    paths:
      - 'config.yml'           # Single file
      - 'saleor/**/*.yml'      # Directory
      - '!config/test.yml'     # Exclude pattern
```

### Adding Notifications

```yaml
- uses: saleor/configurator/action@v1
  id: action

- uses: slackapi/slack-github-action@v1
  if: failure()
  with:
    payload: '{"text": "Deploy failed: ${{ steps.action.outputs.summary }}"}'
```

### Custom Environments

```yaml
jobs:
  deploy:
    strategy:
      matrix:
        env: [dev, staging, prod]
    environment: ${{ matrix.env }}
    steps:
      - uses: saleor/configurator/action@v1
        with:
          saleor-url: ${{ secrets[format('{0}_URL', matrix.env)] }}
          saleor-token: ${{ secrets[format('{0}_TOKEN', matrix.env)] }}
```

---

## Best Practices

### Secret Management

- Use GitHub Environments for environment-specific secrets
- Never hardcode tokens in workflow files
- Use `secrets: inherit` with reusable workflows

### Concurrency

- Use `concurrency` to prevent parallel deployments
- Don't cancel in-progress deployments (`cancel-in-progress: false`)

### Error Handling

- Always use `if: always()` for cleanup steps
- Upload artifacts for debugging failed runs
- Add summaries for quick status checks

### Performance

- Use path filters to avoid unnecessary runs
- Cache npm dependencies (action does this automatically)
- Use matrix builds for parallel checks
