# Saleor Configurator

## Running the CLI

`pnpm dev <command>` runs the CLI from source and reads `SALEOR_URL` and `SALEOR_TOKEN` from `.env.local`. Without a TTY (agent shells, pipes, CI) it skips prompts and prints a JSON envelope; pass `--text` for human-readable output.

Requests are paced to the Saleor Cloud sandbox limit of 120 per minute, so large deploys are slow by design (`docs/LIMITS.md`).

`deploy` never deletes top-level entities; entities missing from `config.yml` are only reported as deletions by `diff` and `deploy --plan`.

## Before pushing

```bash
pnpm schema:check   # after config schema changes, run `pnpm schema:sync`
pnpm check:ci
pnpm knip           # unused exports fail CI
pnpm test:ci        # `pnpm test` starts watch mode
pnpm typecheck      # not in CI
```

The `pre-push` hook regenerates `SCHEMA.md`; commit it when it changes. Every PR needs a changeset, or the `skip changeset` label if it touches nothing under `src/`, the schema files, the lockfile or dependencies.

## Checking against a real store

For changes to introspect, diff or deploy:

```bash
rm -f config.yml && pnpm dev introspect
# edit config.yml
pnpm dev deploy
pnpm dev deploy   # must report no changes
rm config.yml && pnpm dev introspect
pnpm dev diff     # must report no differences
```

## Saleor versions

One Saleor minor is supported at a time (`package.json#saleor.schemaVersion`), with no per-version schemas or operations. When Saleor removes a config field, mark it `removedInSaleor("<version>")` so validation tells users to delete it, and drop the marker after the migration window.
