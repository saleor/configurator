# Validate and schema

`validate` checks a config file offline; `schema` prints the JSON schema editors use for autocompletion. Both read the same config schema as deploy, so a schema change shows here first.

## Sub-features

- `validate-valid`: the seed file validates.
- `validate-invalid`: a wrong type or unknown value reports the path and message, exit non-zero, in text and `--json`.
- `validate-unknown-key`: a key the schema doesn't know is reported, not silently dropped (fails today for most sections; record the result).
- `schema-output`: `schema` prints JSON that matches the committed `schema.json`.

## How to get to it (user POV)

`configurator validate [--config file] [--json]`, `configurator schema`.

## Driving it with verify-configurator

- `cli -- validate --config=seed.yml` → exit 0.
- Copy the seed, set a warehouse `clickAndCollectOption: SOMETIMES`, `cli -- validate --config=bad.yml --json` → non-zero, the error names `warehouses.0.clickAndCollectOption`.
- Add `metadata: {k: v}` to a category, `cli -- validate --config=extra.yml` → record whether it is reported or accepted, and whether deploy then writes it.
- `cli -- schema --output=schema-out.json`, then compare its structure with the committed `schema.json` (ignore `description`/`examples`). Today the CLI's output also marks three shop fields removed in 3.23 with `not: {}`; the committed file omits them.
- **Proof:** for the unknown key, `gql` reads the category's `metadata` after a deploy of that file: empty means it was dropped.

## Gotchas

- These commands don't talk to Saleor, so they need no URL or token; the helper only injects them for remote commands.
