# Quick Start Guide

Get Saleor Configurator CI/CD running in 5 minutes.

## Prerequisites

- GitHub repository with your `config.yml` file
- Saleor instance URL and API token
- GitHub repository admin access (for secrets)

## Step 1: Add Repository Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add the following secrets:

| Secret Name | Value |
|-------------|-------|
| `SALEOR_URL` | `https://your-shop.saleor.cloud/graphql/` |
| `SALEOR_TOKEN` | Your Saleor API token |

## Step 2: Create Workflow File

Create `.github/workflows/saleor-config.yml`:

```yaml
name: Saleor Configuration

on:
  pull_request:
    paths: ['config.yml']
  push:
    branches: [main]
    paths: ['config.yml']

jobs:
  # Preview changes on PRs
  diff:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: saleor/configurator/action@v1
        with:
          command: diff
          saleor-url: ${{ secrets.SALEOR_URL }}
          saleor-token: ${{ secrets.SALEOR_TOKEN }}
          post-pr-comment: true

  # Deploy on merge to main
  deploy:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: saleor/configurator/action@v1
        with:
          command: deploy
          saleor-url: ${{ secrets.SALEOR_URL }}
          saleor-token: ${{ secrets.SALEOR_TOKEN }}
```

## Step 3: Test It

1. Create a branch with a config change:
   ```bash
   git checkout -b test/ci-cd-setup
   # Make a small change to config.yml
   git commit -am "Test CI/CD setup"
   git push -u origin test/ci-cd-setup
   ```

2. Open a Pull Request on GitHub

3. Check the PR for:
   - Workflow running in the Checks tab
   - Diff preview comment posted by the bot

## Step 4: Merge and Verify

1. Merge the PR to main
2. Check the Actions tab for the deploy workflow
3. Verify the changes in your Saleor dashboard

## Next Steps

- [Add Multi-Environment Support](./WORKFLOWS.md#multi-environment-deployment)
- [Set Up Drift Detection](./WORKFLOWS.md#drift-detection)
- [Configure Policy Enforcement](./COOKBOOK.md#policy-enforcement)

## Troubleshooting

### Workflow not running

- Check that the paths filter matches your config file location
- Verify workflow file is in `.github/workflows/` directory
- Ensure YAML syntax is valid

### Authentication errors

- Verify `SALEOR_URL` includes `/graphql/` suffix
- Check token hasn't expired
- Ensure token has required permissions

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more help.
