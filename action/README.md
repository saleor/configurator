# Saleor Configurator GitHub Action

A composite action that installs `@saleor/configurator` from npm and runs `diff`, `deploy` or `introspect` against a store. Its inputs and outputs are defined in [`action.yml`](action.yml). Reference it by a release tag, for example `saleor/configurator/action@v3.24.0`. Each tag installs the CLI version released with it, so upgrading the action upgrades the CLI.

Workflows that call the CLI directly, including pull request comments, deploys and drift checks, are in [docs/ci-cd/README.md](../docs/ci-cd/README.md).
