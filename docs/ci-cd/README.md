# CI/CD

In CI the CLI skips prompts and prints a JSON envelope. Store the URL and token as secrets and pass them as `SALEOR_URL` and `SALEOR_TOKEN`. Exit codes are listed in [COMMANDS.md](../COMMANDS.md#exit-codes); `diff` exits 0 whether or not it finds changes.

## Preview changes on a pull request

```yaml
name: Configurator diff
on:
  pull_request:
    paths: [config.yml]
permissions:
  contents: read
  pull-requests: write
jobs:
  diff:
    runs-on: ubuntu-latest
    env:
      SALEOR_URL: ${{ secrets.SALEOR_URL }}
      SALEOR_TOKEN: ${{ secrets.SALEOR_TOKEN }}
      GH_TOKEN: ${{ github.token }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx @saleor/configurator diff --github-comment --text --output-file diff.md
      - run: gh pr comment ${{ github.event.pull_request.number }} --body-file diff.md --edit-last --create-if-none
      - run: npx @saleor/configurator diff --fail-on-delete --text
```

`--text` is needed for Markdown; without it the comment would contain the JSON envelope. The last step fails the job with exit code 6 when the file would leave entities in the store that it no longer lists.

## Deploy on merge

```yaml
name: Configurator deploy
on:
  push:
    branches: [main]
    paths: [config.yml]
concurrency: configurator-deploy
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      SALEOR_URL: ${{ secrets.SALEOR_URL }}
      SALEOR_TOKEN: ${{ secrets.SALEOR_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx @saleor/configurator deploy --fail-on-delete
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: deploy-report
          path: .configurator/reports/deploy/
```

`concurrency` keeps two deploys from running against the store at once. For several environments, run the same job per environment with that environment's secrets and config file (`--config`).

## Detect changes made in the Dashboard

```yaml
name: Configurator drift
on:
  schedule:
    - cron: "0 6 * * *"
jobs:
  drift:
    runs-on: ubuntu-latest
    env:
      SALEOR_URL: ${{ secrets.SALEOR_URL }}
      SALEOR_TOKEN: ${{ secrets.SALEOR_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx @saleor/configurator introspect --drift-check
```

`introspect --drift-check` exits 1 when the store differs from `config.yml` and does not write the file.

## Reading results in scripts

```bash
npx @saleor/configurator diff > diff.json
jq '.result.summary.totalChanges' diff.json
jq -r '.result.operations[] | "\(.action) \(.entity) \(.name)"' diff.json
```

Every command's envelope has `command`, `version`, `exitCode`, `result`, `logs` and `errors`.
