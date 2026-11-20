# Troubleshooting

Set `LOG_LEVEL=debug` to log every step of a command. Exit codes are listed in [COMMANDS.md](COMMANDS.md#exit-codes).

## The URL is rejected

`--url` must be the GraphQL endpoint: `https://<store>.saleor.cloud/graphql/`. It must use HTTPS (HTTP is accepted only for `localhost`) and must not contain a query string or fragment.

## Authentication failed

The token is invalid, expired, or lacks a permission the operation needs. Create a new app token in the Saleor Dashboard with permissions for every section you introspect or deploy.

## `config.yml` fails validation

Run `validate`. Each error names the path of the failing field, for example `channels.0.currencyCode`. Field definitions are in [SCHEMA.md](../SCHEMA.md).

`validate`, `diff` and `deploy` also warn about keys the schema does not define. Those keys are ignored, so a typo in a field name produces a warning rather than a change.

## A reference points to an entity that does not exist

Entities refer to each other by slug or name: products to categories by slug, product types to attributes by name, shipping zones to warehouses by slug. The referenced entity must be in the same file or already in the store.

## `diff` reports deletions

`diff` and `deploy --plan` list entities that are in the store but missing from a section of `config.yml`. `deploy` does not delete them; remove them in the Dashboard if they should go. Sections absent from the file are left alone and never reported.

Saleor creates `default-channel` in new stores, so it shows as a deletion until you add it to `channels`.

## Deploy finished with failures (exit code 5)

The summary lists each failed entity and the Saleor error. Successful changes are kept. Fix the reported entities and run `deploy` again; entities that already match the store are skipped. `diff --entity Categories/electronics` shows the remaining differences for one entity.

## Commands are slow or hit rate limits

Requests are queued to stay under the Saleor Cloud sandbox limit of 120 requests per minute, and rate-limited requests are retried. A command fails if rate limiting keeps the queue paused for more than 10 minutes. Production and self-hosted stores can raise the pace; the settings are in [LIMITS.md](LIMITS.md).

## `introspect` shows changes you did not make

`introspect` compares the store with your existing `config.yml` and asks before overwriting it. A backup of the old file is kept unless you pass `--no-backup`. Run `introspect --dry-run` to see the changes without writing.
