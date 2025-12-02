# Saleor Configurator GitHub Action

Deploy, diff, and manage Saleor e-commerce configurations using GitOps workflows.

## Features

- **Diff**: Preview configuration changes before deployment
- **Deploy**: Apply configuration changes to your Saleor instance
- **Introspect**: Export current Saleor configuration to YAML
- **PR Comments**: Automatically post diff results as PR comments
- **Multi-environment**: Support for staging, production, and custom environments
- **Policy Enforcement**: Block deployments with deletions or breaking changes

## Quick Start

### Basic Diff on Pull Request

```yaml
name: Configuration Diff

on:
  pull_request:
    paths: ['config.yml', 'config/**']

jobs:
  diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: saleor/configurator/action@v1
        with:
          command: diff
          saleor-url: ${{ secrets.SALEOR_URL }}
          saleor-token: ${{ secrets.SALEOR_TOKEN }}
          post-pr-comment: true
```

### Deploy on Merge to Main

```yaml
name: Deploy Configuration

on:
  push:
    branches: [main]
    paths: ['config.yml']

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: saleor/configurator/action@v1
        with:
          command: deploy
          saleor-url: ${{ secrets.SALEOR_URL }}
          saleor-token: ${{ secrets.SALEOR_TOKEN }}
          fail-on-delete: true
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `command` | Yes | - | Command to run: `diff`, `deploy`, or `introspect` |
| `saleor-url` | Yes | - | Saleor GraphQL endpoint URL |
| `saleor-token` | Yes | - | Saleor API token (use GitHub secrets) |
| `config-path` | No | `config.yml` | Path to configuration file |
| `working-directory` | No | `.` | Working directory for the command |
| `node-version` | No | `20` | Node.js version to use |
| `report-path` | No | - | Path to save deployment report |
| `verbose` | No | `false` | Enable verbose output |
| `post-pr-comment` | No | `false` | Post diff results as PR comment |
| `github-token` | No | `${{ github.token }}` | GitHub token for PR comments |
| `fail-on-diff` | No | `false` | Exit with error if changes detected |
| `fail-on-delete` | No | `false` | Exit with error if deletions detected |
| `fail-on-breaking` | No | `false` | Exit with error if breaking changes |
| `ci-mode` | No | `true` | Enable CI mode (skip prompts) |
| `json-output` | No | `false` | Output results in JSON format |
| `plan-only` | No | `false` | Show deployment plan without executing |

## Outputs

| Output | Description |
|--------|-------------|
| `exit-code` | Exit code from the command |
| `has-changes` | Whether changes were detected |
| `changes-count` | Total number of changes |
| `creates-count` | Number of entities to create |
| `updates-count` | Number of entities to update |
| `deletes-count` | Number of entities to delete |
| `report-path` | Path to the deployment report file |
| `diff-output` | Diff output in markdown format |
| `summary` | Human-readable summary |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success (or no changes for diff) |
| 1 | Changes detected (diff only) |
| 2 | Authentication error |
| 3 | Network error |
| 4 | Validation error |
| 5 | Partial failure |
| 6 | Blocked by --fail-on-delete |
| 7 | Blocked by --fail-on-breaking |

## Examples

### Multi-Environment Pipeline

```yaml
name: Deploy Pipeline

on:
  push:
    branches: [main]
    paths: ['config.yml']

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - uses: saleor/configurator/action@v1
        with:
          command: deploy
          saleor-url: ${{ secrets.STAGING_SALEOR_URL }}
          saleor-token: ${{ secrets.STAGING_SALEOR_TOKEN }}

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: saleor/configurator/action@v1
        with:
          command: deploy
          saleor-url: ${{ secrets.PROD_SALEOR_URL }}
          saleor-token: ${{ secrets.PROD_SALEOR_TOKEN }}
          fail-on-delete: true
```

### Drift Detection

```yaml
name: Drift Detection

on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC

jobs:
  detect-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: saleor/configurator/action@v1
        id: drift
        with:
          command: diff
          saleor-url: ${{ secrets.SALEOR_URL }}
          saleor-token: ${{ secrets.SALEOR_TOKEN }}
          fail-on-diff: true

      - name: Create Issue on Drift
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Configuration Drift Detected',
              body: `Configuration drift was detected in the production environment.\n\n${{ steps.drift.outputs.summary }}`,
              labels: ['drift', 'configuration']
            });
```

### Dry Run Deployment

```yaml
- uses: saleor/configurator/action@v1
  with:
    command: deploy
    saleor-url: ${{ secrets.SALEOR_URL }}
    saleor-token: ${{ secrets.SALEOR_TOKEN }}
    plan-only: true  # Preview without applying changes
```

### JSON Output for Custom Processing

```yaml
- uses: saleor/configurator/action@v1
  id: diff
  with:
    command: diff
    saleor-url: ${{ secrets.SALEOR_URL }}
    saleor-token: ${{ secrets.SALEOR_TOKEN }}
    json-output: true

- name: Process Results
  run: |
    echo "Total changes: ${{ steps.diff.outputs.changes-count }}"
    echo "Creates: ${{ steps.diff.outputs.creates-count }}"
    echo "Updates: ${{ steps.diff.outputs.updates-count }}"
    echo "Deletes: ${{ steps.diff.outputs.deletes-count }}"
```

## Repository Secrets Setup

1. Go to your repository **Settings** > **Secrets and variables** > **Actions**
2. Add the following secrets:
   - `SALEOR_URL`: Your Saleor GraphQL endpoint (e.g., `https://my-shop.saleor.cloud/graphql/`)
   - `SALEOR_TOKEN`: Your Saleor API token

For multi-environment setups, use environment-specific secrets:
- `STAGING_SALEOR_URL` / `STAGING_SALEOR_TOKEN`
- `PROD_SALEOR_URL` / `PROD_SALEOR_TOKEN`

## License

BSD-3-Clause - see [LICENSE](../LICENSE) for details.
