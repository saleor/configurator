# Feature map

One file per user-facing feature of the configurator CLI. Each has an H1, one paragraph, and four sections: `Sub-features`, `How to get to it (user POV)`, `Driving it with verify-configurator`, `Gotchas`.

## Baseline

- A run is up (`verify-configurator up`), `doctor` has no `FAIL`, and the seed slice exists: `<prefix>-channel`, `<prefix>-warehouse`, `<prefix> Color`, `<prefix> Shirt`, `<prefix>-apparel` / `<prefix>-shirts`, `<prefix>-tee` with one variant and one media item, `<prefix>-featured`.
- `<prefix>` is `vc-<run id>`, printed by `up` and stored in `/tmp/verify-configurator/current.json` → `state.json`.
- Commands run in the run's `work/` directory, which holds `seed.yml`.

## Known failures (found 2026-11-19 on 3.23.3 and the checkout)

A later run that still sees these is not a regression; one that stops seeing them confirms a fix.

- **Collection products empty after the seed.** On a first deploy the collections stage runs before products, so `<prefix>-featured` gets no products (only a `warn` log). A second deploy assigns it.
- **No `configurator.externalUrl` on seeded media.** Bulk product create skips the metadata write that the per-product media update does. A second deploy that touches media writes it.
- **Hand-written files are not idempotent.** Channels without `settings` and product channel listings without every field show as updates on every deploy. An introspected file round-trips clean.
- **Category renames are never applied.** Diff and deploy report the update; Saleor keeps the old name.
- **Unknown keys are dropped.** `metadata` (and a category `description`) validate, deploy with success, and never reach Saleor.
- **Recipes fail in the built CLI.** `getRecipesDir()` resolves outside the package from the bundle; `recipe` works only under `pnpm dev`.

## Conventions

- Each driving bullet pairs a user action with an exact command and an observable result.
- Copy `work/seed.yml` to a new file before editing it, so the seed stays intact for other features.
- Name every object a feature creates with `<prefix>`.
- Scope introspect and diff with `--include` to the sections under test; the sandbox is shared.

## Proof and reporting

Every feature ends on its `Proof` bullet: a `gql` read of the exact fields, then idempotency and round trip (V7, V10, V11). Record each sub-feature with `scenario <feature>-<sub> <outcome> --feature <feature> --evidence …`. When a precondition is missing, the scenario is blocked with the reason, never weakened.

## Index

| Feature | File |
| --- | --- |
| Introspect a store into `config.yml` | [introspect.md](introspect.md) |
| Deploy a config file | [deploy.md](deploy.md) |
| Diff a config file against the store | [diff.md](diff.md) |
| `--include` / `--exclude` sections | [selective.md](selective.md) |
| `validate` and `schema` | [validate-schema.md](validate-schema.md) |
| Recipes | [recipe.md](recipe.md) |
| Interactive `start` and prompts | [interactive.md](interactive.md) |
| Upgrade from the previous release | [upgrade.md](upgrade.md) |
