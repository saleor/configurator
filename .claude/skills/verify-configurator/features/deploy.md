# Deploy

`deploy` applies a config file to the store: creates what's missing and updates what differs. It is the command that changes data, so it carries the most risk.

## Sub-features

- `deploy-create`: new objects in the file are created with every field.
- `deploy-update`: a changed field on an existing object is updated, and nothing else changes.
- `deploy-plan`: `--plan` shows the changes and writes nothing.
- `deploy-idempotent`: a second deploy reports no changes.
- `deploy-report`: the deployment report JSON is written (`--report-path`) and matches what happened.
- `deploy-fail-on-delete`: removing an object from the file with `--fail-on-delete` exits non-zero and deletes nothing.
- `deploy-scale` (V15, when bulk paths change): a large generated slice deploys within the governor limits.

## How to get to it (user POV)

`configurator deploy --url … --token … [--config file] [--plan] [--report-path file] [--fail-on-delete]`. In a terminal it asks for confirmation; in CI it doesn't.

## Driving it with verify-configurator

- Copy the seed and add an object: `cp work/seed.yml work/deploy.yml`, add a category `<prefix>-new` and change `<prefix>-tee`'s description.
- Plan first: `cli -- deploy --config=deploy.yml --plan` → lists one create and one update; then `gql '{ category(slug: "<prefix>-new") { id } }'` → `null`.
- Deploy: `cli -- deploy --config=deploy.yml --report-path=deploy-report.json` → exit 0, summary lists the changes; `work/deploy-report.json` exists.
- Remove `<prefix>-new` from the file and run `cli -- deploy --config=deploy.yml --fail-on-delete` → non-zero exit, and the category still exists.
- Scale (V15): generate 500 products with the prefix into `work/scale.yml` (a short script over the seed's product), deploy it, and record duration and retries from the report; `down` removes them.
- **Proof:** `gql '{ category(slug: "<prefix>-new") { name slug parent { slug } } product(slug: "<prefix>-tee") { description } }'` matches the file. Then `cli -- deploy --config=deploy.yml` → `result.status: "no-changes"`; `cli -- introspect --include=categories,products --config=rt.yml` and `cli -- diff --include=categories,products --config=rt.yml` → `result.summary.totalChanges: 0`.

## Gotchas

- A file derived from `seed.yml` can't pass `deploy-idempotent` today: the channel has no `settings` and the listings omit fields (known failure). To test idempotency of a change, start from an introspected file.
- Changing a category's `name` never reaches Saleor (known failure); change products or attributes to prove updates.

- Descriptions are EditorJS JSON in Saleor; compare the text inside the blocks.
- `--plan` output and the real deploy must list the same changes; a mismatch is a bug.
