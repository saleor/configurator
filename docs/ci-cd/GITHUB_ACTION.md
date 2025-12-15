# GitHub Action Reference

Complete reference for the Saleor Configurator GitHub Action.

## Installation

```yaml
- uses: saleor/configurator/action@v1
  with:
    command: diff
    saleor-url: ${{ secrets.SALEOR_URL }}
    saleor-token: ${{ secrets.SALEOR_TOKEN }}
```

## Inputs

### Required Inputs

| Input | Type | Description |
|-------|------|-------------|
| `command` | string | Command to run: `diff`, `deploy`, or `introspect` |
| `saleor-url` | string | Saleor GraphQL endpoint URL |
| `saleor-token` | string | Saleor API token (use secrets) |

### Optional Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `config-path` | string | `config.yml` | Path to configuration file |
| `working-directory` | string | `.` | Working directory |
| `node-version` | string | `20` | Node.js version |
| `report-path` | string | - | Path to save deployment report |
| `verbose` | boolean | `false` | Enable verbose output |
| `post-pr-comment` | boolean | `false` | Post diff as PR comment |
| `github-token` | string | `${{ github.token }}` | Token for PR comments |
| `fail-on-diff` | boolean | `false` | Fail if changes detected |
| `fail-on-delete` | boolean | `false` | Fail if deletions detected |
| `fail-on-breaking` | boolean | `false` | Fail if breaking changes |
| `ci-mode` | boolean | `true` | Skip interactive prompts |
| `json-output` | boolean | `false` | Output in JSON format |
| `plan-only` | boolean | `false` | Preview without applying |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| `exit-code` | number | Exit code from command |
| `has-changes` | boolean | Whether changes were detected |
| `changes-count` | number | Total number of changes |
| `creates-count` | number | Entities to create |
| `updates-count` | number | Entities to update |
| `deletes-count` | number | Entities to delete |
| `report-path` | string | Path to deployment report |
| `diff-output` | string | Diff in markdown format |
| `summary` | string | Human-readable summary |

## Exit Codes

| Code | Name | Description |
|------|------|-------------|
| 0 | SUCCESS | Operation completed |
| 1 | CHANGES | Changes detected (diff) |
| 2 | AUTH_ERROR | Authentication failed |
| 3 | NETWORK_ERROR | Connection failed |
| 4 | VALIDATION_ERROR | Invalid configuration |
| 5 | PARTIAL_FAILURE | Some operations failed |
| 6 | DELETION_BLOCKED | `--fail-on-delete` |
| 7 | BREAKING_BLOCKED | `--fail-on-breaking` |

## Command-Specific Options

### diff Command

```yaml
- uses: saleor/configurator/action@v1
  with:
    command: diff
    saleor-url: ${{ secrets.SALEOR_URL }}
    saleor-token: ${{ secrets.SALEOR_TOKEN }}
    # Diff-specific options
    post-pr-comment: true       # Post as PR comment
    fail-on-delete: true        # Block if deletions
    fail-on-breaking: true      # Block if breaking changes
    fail-on-diff: true          # Block if any changes
    json-output: true           # JSON output for parsing
```

### deploy Command

```yaml
- uses: saleor/configurator/action@v1
  with:
    command: deploy
    saleor-url: ${{ secrets.SALEOR_URL }}
    saleor-token: ${{ secrets.SALEOR_TOKEN }}
    # Deploy-specific options
    plan-only: true             # Dry-run mode
    fail-on-delete: true        # Block if deletions
    report-path: report.json    # Save report
    json-output: true           # JSON output
```

### introspect Command

```yaml
- uses: saleor/configurator/action@v1
  with:
    command: introspect
    saleor-url: ${{ secrets.SALEOR_URL }}
    saleor-token: ${{ secrets.SALEOR_TOKEN }}
    config-path: exported-config.yml  # Output file
```

## Examples

### Basic Diff

```yaml
- uses: saleor/configurator/action@v1
  with:
    command: diff
    saleor-url: ${{ secrets.SALEOR_URL }}
    saleor-token: ${{ secrets.SALEOR_TOKEN }}
```

### Diff with PR Comment

```yaml
- uses: saleor/configurator/action@v1
  with:
    command: diff
    saleor-url: ${{ secrets.SALEOR_URL }}
    saleor-token: ${{ secrets.SALEOR_TOKEN }}
    post-pr-comment: true
```

### Deploy with Report

```yaml
- uses: saleor/configurator/action@v1
  id: deploy
  with:
    command: deploy
    saleor-url: ${{ secrets.SALEOR_URL }}
    saleor-token: ${{ secrets.SALEOR_TOKEN }}
    report-path: deployment-report.json

- uses: actions/upload-artifact@v4
  with:
    name: deployment-report
    path: ${{ steps.deploy.outputs.report-path }}
```

### Conditional on Changes

```yaml
- uses: saleor/configurator/action@v1
  id: diff
  with:
    command: diff
    json-output: true

- name: Deploy if changes
  if: steps.diff.outputs.has-changes == 'true'
  uses: saleor/configurator/action@v1
  with:
    command: deploy
```

### Using Outputs

```yaml
- uses: saleor/configurator/action@v1
  id: action

- name: Report Results
  run: |
    echo "Exit code: ${{ steps.action.outputs.exit-code }}"
    echo "Changes: ${{ steps.action.outputs.changes-count }}"
    echo "Summary: ${{ steps.action.outputs.summary }}"
```

## Permissions

The action requires these permissions:

```yaml
permissions:
  contents: read           # Required to checkout code
  pull-requests: write     # Required for PR comments
```

## Caching

The action automatically caches npm dependencies:

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ inputs.node-version }}-npm
```

## Environment Variables

You can pass additional environment variables:

```yaml
- uses: saleor/configurator/action@v1
  env:
    LOG_LEVEL: debug       # Enable debug logging
    NODE_OPTIONS: --max-old-space-size=4096
```

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.
