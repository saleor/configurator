# CI/CD Cookbook

Common patterns and recipes for Saleor Configurator CI/CD workflows.

## Table of Contents

- [Policy Enforcement](#policy-enforcement)
- [Multi-Environment Deployment](#multi-environment-deployment)
- [Slack Notifications](#slack-notifications)
- [Conditional Deployments](#conditional-deployments)
- [Rollback Strategies](#rollback-strategies)
- [Branch-Based Environments](#branch-based-environments)

---

## Policy Enforcement

### Block Deployments with Deletions

```yaml
- uses: saleor/configurator/action@v1
  with:
    command: deploy
    saleor-url: ${{ secrets.SALEOR_URL }}
    saleor-token: ${{ secrets.SALEOR_TOKEN }}
    fail-on-delete: true
```

### Block Breaking Changes on PRs

```yaml
- uses: saleor/configurator/action@v1
  with:
    command: diff
    saleor-url: ${{ secrets.SALEOR_URL }}
    saleor-token: ${{ secrets.SALEOR_TOKEN }}
    fail-on-breaking: true
    post-pr-comment: true
```

### Required Review for Deletions

```yaml
jobs:
  check:
    runs-on: ubuntu-latest
    outputs:
      has-deletions: ${{ steps.diff.outputs.deletes-count > 0 }}
    steps:
      - uses: saleor/configurator/action@v1
        id: diff
        with:
          command: diff
          json-output: true

  deploy:
    needs: check
    # If deletions, require production environment (with required reviewers)
    environment: ${{ needs.check.outputs.has-deletions == 'true' && 'production' || 'staging' }}
```

---

## Multi-Environment Deployment

### Sequential Deployment (Staging → Production)

```yaml
jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: saleor/configurator/action@v1
        with:
          command: deploy
          saleor-url: ${{ secrets.STAGING_URL }}
          saleor-token: ${{ secrets.STAGING_TOKEN }}

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production  # Requires approval
    steps:
      - uses: saleor/configurator/action@v1
        with:
          command: deploy
          saleor-url: ${{ secrets.PROD_URL }}
          saleor-token: ${{ secrets.PROD_TOKEN }}
          fail-on-delete: true
```

### Parallel Preview for Multiple Environments

```yaml
jobs:
  preview:
    strategy:
      matrix:
        environment: [staging, production]
    runs-on: ubuntu-latest
    steps:
      - uses: saleor/configurator/action@v1
        with:
          command: diff
          saleor-url: ${{ secrets[format('{0}_URL', matrix.environment)] }}
          saleor-token: ${{ secrets[format('{0}_TOKEN', matrix.environment)] }}
```

---

## Slack Notifications

### Notify on Deployment

```yaml
- uses: saleor/configurator/action@v1
  id: deploy

- name: Notify Slack
  if: always()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "Saleor Deployment: ${{ steps.deploy.outputs.summary }}",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Saleor Configuration Deployed*\n${{ steps.deploy.outputs.summary }}"
            }
          },
          {
            "type": "section",
            "fields": [
              {"type": "mrkdwn", "text": "*Creates:* ${{ steps.deploy.outputs.creates-count }}"},
              {"type": "mrkdwn", "text": "*Updates:* ${{ steps.deploy.outputs.updates-count }}"},
              {"type": "mrkdwn", "text": "*Deletes:* ${{ steps.deploy.outputs.deletes-count }}"}
            ]
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Alert on Drift Detection

```yaml
- uses: saleor/configurator/action@v1
  id: drift
  with:
    command: diff
    fail-on-diff: true

- name: Alert on Drift
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": ":warning: Configuration Drift Detected!",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Configuration Drift Detected*\n${{ steps.drift.outputs.changes-count }} differences found"
            }
          }
        ]
      }
```

---

## Conditional Deployments

### Deploy Only When Changes Exist

```yaml
- uses: saleor/configurator/action@v1
  id: diff
  with:
    command: diff
    json-output: true

- uses: saleor/configurator/action@v1
  if: steps.diff.outputs.has-changes == 'true'
  with:
    command: deploy
```

### Skip CI with Commit Message

```yaml
jobs:
  deploy:
    if: "!contains(github.event.head_commit.message, '[skip-deploy]')"
```

---

## Rollback Strategies

### Git Revert Rollback

```yaml
name: Rollback Configuration

on:
  workflow_dispatch:
    inputs:
      commit-sha:
        description: 'Commit SHA to rollback to'
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.commit-sha }}

      - uses: saleor/configurator/action@v1
        with:
          command: deploy
          saleor-url: ${{ secrets.SALEOR_URL }}
          saleor-token: ${{ secrets.SALEOR_TOKEN }}
```

### Introspect Current State as Backup

```yaml
- name: Backup Current Configuration
  uses: saleor/configurator/action@v1
  with:
    command: introspect
    saleor-url: ${{ secrets.SALEOR_URL }}
    saleor-token: ${{ secrets.SALEOR_TOKEN }}

- name: Upload Backup
  uses: actions/upload-artifact@v4
  with:
    name: config-backup-${{ github.run_id }}
    path: config.yml
    retention-days: 30
```

---

## Branch-Based Environments

### Preview Branches

```yaml
name: Preview Environment

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Deploy to a preview-specific Saleor instance
      - uses: saleor/configurator/action@v1
        with:
          command: deploy
          saleor-url: ${{ format('https://preview-{0}.saleor.cloud/graphql/', github.event.pull_request.number) }}
          saleor-token: ${{ secrets.PREVIEW_TOKEN }}

      - name: Comment Preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `Preview deployed: https://preview-${{ github.event.pull_request.number }}.saleor.cloud`
            });
```

---

## Performance Optimization

### Cache npm Dependencies

The action automatically caches npm dependencies. For custom caching:

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}

- uses: saleor/configurator/action@v1
```

### Parallel Diff Checks

```yaml
jobs:
  diff:
    strategy:
      matrix:
        config: ['shop.yml', 'products.yml', 'channels.yml']
    runs-on: ubuntu-latest
    steps:
      - uses: saleor/configurator/action@v1
        with:
          command: diff
          config-path: ${{ matrix.config }}
```
