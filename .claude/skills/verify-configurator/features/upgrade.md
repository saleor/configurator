# Upgrade from the previous release

Users upgrade the CLI and keep their `config.yml`, and their store keeps what earlier releases wrote. This feature proves both still work with the checkout (V6). Run it whenever `doctor` prints `upgrade check required`.

## Sub-features

- `upgrade-release-introspect`: the previous release introspects the store it seeded.
- `upgrade-validate`: the checkout validates the file the release wrote.
- `upgrade-diff-clean`: the checkout diffs that file against the store with no differences.
- `upgrade-deploy-idempotent`: the checkout deploys that file and changes nothing.
- `upgrade-introspect-shape`: the checkout introspects the same sections; every difference from the release's file is intended.
- `upgrade-stored-state`: the checkout reads state the release stored on the instance (the `configurator.externalUrl` media key).

## How to get to it (user POV)

A user on the previous version runs `introspect`, upgrades with `npm i -g @saleor/configurator@latest` (or the GitHub Action bumps), and runs `diff`/`deploy` with the same file.

## Driving it with verify-configurator

- `up --from` → the newest npm release (looked up now, never hard-coded) seeds the store; `--from npm:<version>` pins another release, e.g. the last one before a format change.
- `upgrade` → runs the five steps and records `upgrade-release-introspect`, `upgrade-validate`, `upgrade-diff-clean`, `upgrade-deploy-idempotent`, `upgrade-introspect-shape`.
- Read `evidence/upgrade-shape-*.diff`: each difference must come from the change under test. Anything else is a failed `upgrade-introspect-shape`, whatever the helper recorded.
- Stored state: `gql '{ product(slug: "<prefix>-tee") { media { url metadata { key value } } } }'` → the `configurator.externalUrl` key the release wrote; the checkout's introspected file shows that URL as `externalUrl`. Record `upgrade-stored-state`.
- Then drive the features the change affects on this data before creating new objects.
- **Proof:** the reads above, plus each `upgrade-*` transcript. The diff and deploy steps are self-agreement checks (V7); the stored-state read and the shape diff are what prove compatibility.

## Gotchas

- `upgrade-stored-state` fails on a fresh seed today: bulk create stores no `configurator.externalUrl`. Run a second deploy that touches media before `upgrade` when the change under test is about that key.
- `upgrade` skips its deploy step when the diff isn't clean, because the file covers every object in those sections on the shared sandbox.

- A change that intentionally changes the file format makes `upgrade-diff-clean` fail; that's a breaking change and needs a migration note and a major changeset, not a passed scenario.
- The release from npm runs from `<run dir>/release-<version>/`; it doesn't see the checkout's recipes.
