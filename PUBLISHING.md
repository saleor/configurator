# Publishing

`@saleor/configurator` is published to npm from `main` by `.github/workflows/release.yml` with [Changesets](https://github.com/changesets/changesets).

1. Each pull request adds a changeset (`pnpm changeset`). The Changesets workflow fails a pull request without one, unless it has the `skip changeset` label and changes nothing under `src/`, `dist/` or `bin/`, nor `schema.json`, `SCHEMA.md`, the lockfile, or the version or dependencies in `package.json`.
2. When changesets reach `main`, the release workflow opens or updates a `chore: release package` pull request that bumps the version and updates `CHANGELOG.md`.
3. Merging that pull request publishes to npm with provenance through npm trusted publishing (OIDC), tags the release, and creates a GitHub release. Before publishing, the workflow runs `schema:check`, `test:ci` and `lint`.

Version numbers follow the supported Saleor minor: fixes are patch changesets, and moving to the next Saleor minor updates `package.json#saleor.schemaVersion` with a minor changeset.

`pnpm publish:ci-dev` publishes a snapshot under the `dev` npm tag. No workflow runs it.

To check what a release would contain, run `pnpm build && npm pack --dry-run`. The published files are listed in `package.json#files`.
