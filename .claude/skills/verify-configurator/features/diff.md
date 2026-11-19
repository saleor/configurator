# Diff

`diff` compares a config file with the store and prints what deploy would change. Users and CI (the GitHub Action posts it as a PR comment) rely on it being correct in both directions.

## Sub-features

- `diff-clean`: a file matching the store shows no differences.
- `diff-local-change`: a field changed in the file shows as an update with the right direction (file → store).
- `diff-remote-change`: a field changed in the store shows as a difference.
- `diff-unmanaged`: sections absent from the file are not reported.
- `diff-formats`: `--json` and the GitHub comment format carry the same changes as the text output.

## How to get to it (user POV)

`configurator diff --url … --token … [--config file] [--json]`.

## Driving it with verify-configurator

- Clean: `cli -- diff --config=seed.yml --include=categories,products` → `result.summary.totalChanges: 0` in the JSON transcript.
- Local change: copy the seed, change the tee's name, `cli -- diff --config=diff.yml --include=products` → one update, old value from the store, new from the file.
- Remote change: change the category's name with `gql` (seeding the outside change), `cli -- diff --config=seed.yml --include=categories` → one difference.
- Unmanaged: a file with only `categories:` → no channel, product or attribute changes reported.
- `record --name diff --feature diff -- diff --config=diff.yml --include=products` for the terminal screenshot.
- **Proof:** for each reported change, `gql` reads the store value and confirms it is what diff showed as the current value. Nothing in diff writes; read the object's `updatedAt` before and after.

## Gotchas

- Diff reading the wrong side (store vs file) once reported channel listings backwards; check direction on every update.
