# Configurator verification rules

`verify-configurator` follows these rules on every run. Each rule lives in the helper command its **Enforced by** line names; a _judgement_ rule lives with the agent. Each **Why** is a verification that went wrong, or would have, without it.

When a rule proves wrong, fix it here.

## Target and environment

**V1. Run on the Cloud sandbox, and label results with their target.** The target is the Cloud sandbox in `~/.config/verify-saleor/config.json`, shared with the other `verify-*` skills. Run a local Saleor only when the user asks (`"target": "local"` with `local.saleorApiUrl`, or `up --target local`). Report Cloud-only paths (Cloud permission groups, Cloud Saleor versions) as `blocked on local`.
Enforced by: the config's `target`, `up --target`, `doctor`, `report`.
Why: CLI behaviour depends on the Saleor version and its schema; a local stack on another version proves a different API.

**V2. Act freely in the sandbox; touch nothing else.** The sandbox is disposable: without asking, deploy, create and delete data, and create apps and tokens there. The helper injects the sandbox URL and refuses `--url` and `--token`, so a run can never deploy to a client or production store. The machine is not the sandbox: ask before stopping processes this helper didn't start. Browse only in the helper's Chrome profile or the harness's built-in browser, never the user's main browser. Every announced scenario ends passed, failed, or blocked with a reason.
Enforced by: `cli` (URL and token injection), `scenario`, `report`.
Why: the configurator writes store-wide; one mistyped `--url` deploys into a real store.

**V3. Lock the whole host.** Deploys change shared store data (channels, product types, attributes), so one run holds the host: `~/.cache/verify-saleor/locks/<host>--store.json`. `up` refuses while any live lock on the host exists, including the app skills' `<host>--<app identifier>.json` locks.
Enforced by: `up`, `down`, `doctor`.
Why: a parallel app verification creates objects that show up in introspect and diff, and a configurator deploy can change data an app run depends on.

**V4. Run what users run.** Drive the built `bin/cli.mjs` from `pnpm build`, not `pnpm dev`. Any uncommitted change must exist before `up` builds; `doctor` fails when source changed after the build or HEAD moved.
Enforced by: `up` (builds), `doctor`.
Why: `tsx` resolves modules and assets differently from the bundled `dist/`; recipes and schema files are copied at build time.

## Stored data

**V5. Seed a run-prefixed store slice.** `up` deploys a small slice (channel, warehouse, attribute, product type, categories, product with media and variant, collection) through the served CLI. Every object starts with `vc-<run id>`. Features create their own objects with the same prefix (`verify-configurator` prints it), so `down` can remove them.
Enforced by: `up`, `down`.
Why: the configurator cannot delete; without a prefix there is no safe cleanup on a shared store.

**V6. Prove new code on what the previous release wrote.** A config file written by the previous release, and the state it left on the instance, must keep working. Run the upgrade check whenever the change touches the config schema, introspect mapping, config parsing, selective sections, or keys the CLI stores on the instance (such as `configurator.externalUrl` on product media):
- `up --from` serves the newest `@saleor/configurator` release from npm, resolved when the run starts, and seeds through it.
- `upgrade`: the release introspects; the checkout validates that file, diffs it clean, deploys it with no changes, and introspects again for a shape comparison.
- Drive the affected features on that saved data before creating new data.
Enforced by: `up --from`, `upgrade`, `doctor` (prints `upgrade check required` when the diff touches the storage paths).
Why: a schema change that drops or renames a field passes on files the new code wrote itself, and fails for every user's existing `config.yml`.

**V7. Never rely on the CLI agreeing with itself.** "Second deploy shows no changes" and "introspect then diff is clean" only show the CLI is consistent with itself. A field the parser silently drops passes both. They are secondary checks.
Enforced by: _judgement_, and each feature's `Proof` bullet naming a `gql` read.
Why: hand-added `metadata` on a category was stripped by the schema without an error; deploy, re-deploy and diff all looked clean while nothing reached Saleor.

## Driving and proof

**V8. Drive the CLI the way users do.** Use `cli` for non-interactive runs (CI mode, like pipes and GitHub Actions) and `record` for anything a person types into a terminal: `start`, prompts for missing arguments, confirmations, spinners, coloured output. Bash is never a TTY, so interactive paths only run under `record`.
Enforced by: `cli`, `record`.
Why: interactive and non-interactive modes take different code paths; a CI run never exercises a prompt.

**V9. A failed CLI step fails the scenario.** `gql` only seeds data and reads side effects. Never finish a failed deploy by writing the missing data through GraphQL; record the failure with its transcript and stop there.
Enforced by: _judgement_, `scenario` (a failed outcome needs a note).
Why: patching the store by hand hides the bug the run exists to catch.

**V10. Prove side effects with an independent read.** End every feature on a `gql` read of the exact fields the command should have changed, compared with the config file's values. When Saleor processes something asynchronously (media thumbnails, search index), poll with a timeout.
Enforced by: `gql`, `scenario` (a passed scenario needs evidence).
Why: a deploy summary reports what the CLI attempted, not what Saleor stored.

**V11. Prove idempotency and the round trip, after the read.** After the read passes: a second `deploy` reports no changes, and a fresh `introspect` followed by `diff` reports no differences.
Enforced by: each feature's driving steps.
Why: a deploy that updates the same field on every run hides a comparator bug and slows every user's deploy.

**V12. Show a bug fix red, then green.** Reproduce the bug with `up --from <base ref>`, then the fix on the checkout, on the same sandbox.
Enforced by: `up --from <ref>`. A fix needs `before-*` and `after-*` evidence.
Why: a proof on the branch alone can't show the run would have caught the bug.

**V13. Cover every entry point and reader.** Exercise each affected command (`introspect`, `deploy`, `diff`, `validate`, `schema`, `recipe`, `start`) and each affected flag (`--include`, `--exclude`, `--plan`, `--json`, `--fail-on-delete`, `--report-path`). A change to the schema touches every command that reads a config file.
Enforced by: the feature map, `report` (lists features with no passed scenario).
Why: a fix in deploy left diff on the old comparison path.

**V14. Show CLI output a user sees.** For a change to output, prompts or errors, `record` a terminal screenshot and gif, and put the screenshot in the reply.
Enforced by: `record`.
Why: text transcripts hide colour, layout and spinner problems.

**V15. Size matters.** When a change touches bulk paths (products, variants, attribute values, the GraphQL governor), also run against a large slice and record duration and retry counts from the deployment report.
Enforced by: _judgement_, the `deploy` feature's `scale` sub-feature.
Why: users deploy thousands of products; rate limiting and pagination bugs appear only at volume.

## Evidence and reporting

**V16. Keep evidence fresh, never overwritten.** Every artifact is named with a timestamp and short SHA, and `evidence/index.json` records the command, what was served, target and revision. `report` flags evidence older than the newest source change. Recapture after every code change.
Enforced by: `cli`, `gql`, `record`, `report`.
Why: reused file names served stale transcripts as proof.

**V17. Separate harness failures from product failures.** A failed build, a seed that didn't deploy, a vhs crash or an expired token is `harness blocked`, not a product result. Every wait has a timeout and prints progress. When a login is missing, ask for that one step and keep setting up.
Enforced by: `up` (seed failure stops as harness blocked), `login --check`, `poll()`.
Why: a rejected token reads like a deploy bug.

**V18. Report by evidence class.** Give every scenario an outcome (passed, failed, blocked) and a class (unit, sandbox-live, local-live). Unit tests, mocks and type checks never fill a live slot. Mark which parts of a diagnosis are proven and which are hypotheses.
Enforced by: `scenario`, `report`.
Why: changes were called safe from unit tests with mocked GraphQL.

**V19. Clean up, and keep evidence private.** `down` deletes every object with the run prefix and releases the lock; `up` sweeps leftovers of dead runs. Tokens are masked in every transcript, read and recording; recordings type `$SALEOR_TOKEN`, never its value.
Enforced by: `up`, `down`, `cli`, `record`.
Why: leftover objects pollute every later introspect on the shared sandbox, and transcripts end up in PRs.
