---
name: verify-configurator
description: "Verify a configurator CLI change end to end against the shared Saleor Cloud sandbox: build the checkout, seed a run-prefixed store slice, drive introspect, deploy, diff, validate, schema, recipe and the interactive start the way a user does, prove every result with an independent GraphQL read, and check that config files and store state from the previous npm release still work. Use to prove a change works before a PR, to reproduce a bug red then green, or when asked to verify, E2E test or demo the CLI."
---

# verify-configurator

```bash
H=.claude/skills/verify-configurator/scripts/verify-configurator
$H login --check || $H login     # once per sandbox; the user signs in in the helper's Chrome
$H up [--from]                   # lock the host, build, seed; --from serves the newest npm release
$H doctor
$H cli -- deploy --config=seed.yml --plan
$H gql '{ product(slug: "<prefix>-tee") { name } }' --feature deploy
$H record --name diff --feature diff -- diff --config=seed.yml
$H scenario deploy-update passed --feature deploy --evidence <transcript>,<read>
$H report
$H down
```

Follow [`references/verification-rules.md`](references/verification-rules.md) on every run. The feature map is in [`features/`](features/README.md).

## Configuration

- **Target: the Cloud sandbox** in `~/.config/verify-saleor/config.json`, shared with the other `verify-*` skills. When the file is missing, the helper stops; ask the user for the sandbox's GraphQL URL and write the file it prints. For a local Saleor, add `"local": { "saleorApiUrl": "http://localhost:8000/graphql/" }` and pass `up --target local` or set `"target": "local"`.
- **The sandbox is disposable (V2).** Deploy, create and delete data, and create apps there without asking. Nothing else: the helper injects the sandbox URL and token and refuses `--url` and `--token`.
- **Credentials.** `login` captures the signed-in staff user's token from the Dashboard and creates a sandbox app named `verify-configurator` with every permission that user can grant. Its token lives in `~/.config/verify-configurator/credentials.json` (mode 600), keyed by host. The CLI authenticates as that app, as users with an app token do.

## What the run is

| Piece | Where | Owner |
| --- | --- | --- |
| Shared sandbox config | `~/.config/verify-saleor/config.json` | user |
| App token | `~/.config/verify-configurator/credentials.json` | helper (`login`) |
| Browser profile, Playwright runtime | `~/.cache/verify-configurator/` | helper; drives system Google Chrome |
| Store lock | `~/.cache/verify-saleor/locks/<host>--store.json` | helper (`up`, `down`) |
| Run dir: state, `work/` (CLI cwd), `evidence/`, `scenarios.json` | `/tmp/verify-configurator/<run id>/` | helper |
| Checkout CLI | `bin/cli.mjs` + `dist/` from `pnpm build` | `up` |
| Previous release | `<run dir>/release-<version>/` from npm | `up --from` |
| Base ref for red/green | a detached git worktree in the run dir | `up --from <ref>` |
| Seed slice | objects named `vc-<run id>…` on the sandbox | `up`, `down` |

## Launch

1. `login --check`. If it exits 2, run `login` in the background and ask the user for that one step: sign in to the sandbox Dashboard in the helper's Chrome window.
2. `up` builds the checkout, records identity (app permissions, Saleor version, the targeted schema), and deploys the seed (`work/seed.yml`) through the served CLI. Make code changes before `up`; `doctor` fails on a stale build.
3. `up --from` when `doctor` says the upgrade check is required (V6), or `up --from <base ref>` to show a bug red first (V12). With `--from`, the seed is deployed by the old CLI, so the store holds what that release writes. Such a run serves two builds, so `cli` and `record` need `--as checkout` or `--as from`.

## Doctor

Read-only. Checks the token, the build against HEAD and source changes (V4), the served CLI's version, other live runs on the host (V3), leftovers from other runs, and whether the diff touches the storage paths (V6). Fix every `FAIL` before driving.

## Drive

- **Non-interactive:** `cli -- <command> [flags]` runs in `work/` with `CI=true`, like a pipe or GitHub Action. In this mode the CLI prints one JSON envelope (`command`, `version`, `exitCode`, `result`, `logs`): a clean diff is `result.summary.totalChanges: 0`, an idempotent deploy is `result.status: "no-changes"`, and warnings live in `logs`. The JSON lists changed field names only; `record` the same command to see values. Every run saves a transcript under `evidence/`, token masked, and exits with the CLI's exit code. Helper flags go before the command; `--` before the command is optional.
- **Interactive:** `record --name <n> -- <command> [flags]` types the command into a real terminal with vhs, with `--keys "Sleep 3s,y,Enter,{url},Enter,{token},Enter"` for prompts or `--tape <file>` for longer scripts. `--line '<shell line>'` types a line as is instead, e.g. `--line 'configurator diff --text | grep -v Unchanged'`. The CLI reads the URL and token from the terminal's environment. It saves a gif and a png (the last frame). The token appears only as `$SALEOR_TOKEN` or a masked prompt.
- **Own objects:** name everything a feature creates with the run prefix (printed by `up`, in `state.json`), so `down` removes it.
- **Upgrade:** after `up --from`, `upgrade` runs V6's sequence and records `upgrade-*` scenarios. Then drive the affected features on that data before creating new data.
- **Reads:** `gql '<query>' [--vars json] --feature <id>` reads with the app token and saves the result as evidence. It never writes what a failed CLI step should have written (V9).

## Evidence

Proof standard per scenario (V7, V10, V11):
1. the CLI transcript (or recording),
2. a `gql` read showing Saleor stored the exact values from the config file,
3. then idempotency: a second `deploy` reports no changes,
4. then the round trip: `introspect` to a new file, and `diff` reports no differences.

Record the outcome with `scenario <id> <passed|failed|blocked> --feature <f> --evidence <files> [--note]`. A passed scenario needs evidence; a failed or blocked one needs a note. `report` lists every scenario with its class, served CLI and evidence, flags stale evidence (V16), and lists features with no passed scenario (V13). Put screenshots from `record` inline in the reply (V14).

## Rules

Follow `.claude/skills/verify-configurator/references/verification-rules.md` on every run.

| Rule | Carried by |
| --- | --- |
| V1 target | shared config, `up --target`, `doctor`, `report` |
| V2 sandbox only | `cli` URL/token injection and refusal |
| V3 host lock | `up`, `down`, `doctor` |
| V4 built CLI | `up` (build), `doctor` (stale build) |
| V5 prefixed seed | `up`, `down` |
| V6 previous release | `up --from`, `upgrade`, `doctor`, `features/upgrade.md` |
| V7 no self-agreement | every feature's `Proof` bullet |
| V8 user paths | `cli`, `record`, `features/interactive.md` |
| V9 failed step fails | judgement, `scenario --note` |
| V10 independent read | `gql`, `scenario` evidence requirement |
| V11 idempotency, round trip | every feature's last driving bullets |
| V12 red then green | `up --from <ref>` |
| V13 entry points | feature map, `report` |
| V14 visible output | `record` |
| V15 scale | `features/deploy.md` `scale` |
| V16 fresh evidence | timestamped names, `report` |
| V17 harness vs product | `up` seed check, `login --check`, `poll()` |
| V18 evidence class | `scenario --class`, `report` |
| V19 cleanup, privacy | `up` sweep, `down`, redaction in `cli`, `gql`, `record` |

## Cleanup

`down` deletes every object with the run prefix (two passes, since Saleor refuses some deletes while children exist), removes a base-ref worktree, and releases the lock. Evidence stays in the run dir.

Manual fallback: list leftovers with `gql '{ products(first: 50, filter: {search: "vc-"}) { edges { node { id slug } } } }'` (and the same for categories, productTypes, attributes, warehouses, collections, channels), delete them in the Dashboard, then remove `~/.cache/verify-saleor/locks/<host>--store.json` and `/tmp/verify-configurator/current.json`.

## Gotchas

- The configurator can't delete. A feature that removes something from the config file proves only that the CLI leaves it alone (or reports it, with `--fail-on-delete`); `down` does the actual removal.
- The sandbox is shared, and `--include` filters sections, not objects: an introspected file holds every product on the sandbox. A deploy of a seed-shaped file plans deletes for everything else in its sections; deletes are not executed ("not yet supported"), so ignore them and read the non-delete operations.
- Read the `logs` in every transcript for `warn` entries: the CLI reports skipped work there while the result still says success (a collection's products skipped on a first deploy was found this way).
- Media from `externalUrl` downloads asynchronously; poll the product's `media` before asserting thumbnails.
- `deploy` in CI mode skips confirmations; interactive confirmations exist only under `record`.
- The app the helper creates has every permission the staff user had when `login` ran. A permission added to Saleor later needs a new `login` (delete the host's entry in `credentials.json` first).
- `pnpm build` copies recipes into `dist/`; a recipe change needs a fresh `up`.
- The host lock is one-way for now: the app skills (`verify-mcp`) only check their own `<host>--<app>.json` lock, not `<host>--store.json`, so one of them can start during a configurator run.
- Seed-shaped files list only run objects in their sections, so every other object in those sections shows as a delete. That is harmless only while the CLI doesn't execute deletes; revisit `seedConfig` and `upgrade` when deletion lands.
- Known product failures are listed in `features/README.md`; read them before calling a result a regression.
