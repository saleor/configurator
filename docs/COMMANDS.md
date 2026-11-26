# Commands

Run any command with `--help` for its full option list. Examples use `pnpm dlx @saleor/configurator`; inside this repository, `pnpm dev` runs the same CLI from source.

| Command | What it does | Talks to Saleor |
|---|---|---|
| `start` | Interactive setup wizard | Yes |
| `introspect` | Writes the store's configuration to `config.yml` | Yes |
| `validate` | Checks `config.yml` against the schema | No |
| `diff` | Shows what `deploy` would change | Yes |
| `deploy` | Applies `config.yml` to the store | Yes |
| `schema` | Prints the JSON Schema for `config.yml` | No |
| `recipe list \| show \| apply \| export` | Bundled starter configurations, see [recipes](../recipes/README.md) | `apply` only |

## Connection and config file

| Option | Environment variable | Default |
|---|---|---|
| `--url` | `SALEOR_URL` | None. Must be the GraphQL endpoint, ending in `/graphql/` |
| `--token` | `SALEOR_TOKEN` | None |
| `--config` | `SALEOR_CONFIG` | `config.yml` |

The CLI reads `.env` and `.env.local` from the current directory. Options win over environment variables. `LOG_LEVEL` (`debug`, `info`, `warn`, `error`) sets log verbosity.

## Choosing sections

`introspect`, `diff` and `deploy` accept `--include` and `--exclude` with a comma-separated list of top-level sections:

`shop`, `channels`, `warehouses`, `shippingZones`, `taxClasses`, `productAttributes`, `contentAttributes`, `customerAttributes`, `productTypes`, `pageTypes`, `modelTypes`, `customerTypes`, `categories`, `collections`, `products`, `models`, `menus`

`diff` can also narrow its output with `--entity-type Categories` or `--entity Categories/electronics`.

## Output

When stdin or stdout is not a terminal (CI, pipes, scripts), prompts are skipped and commands print a JSON envelope. `--text` forces human-readable output; `validate`, `diff` and `deploy` also accept `--json` to force JSON in a terminal. `introspect`, `validate`, `diff` and `deploy` accept `--json-file <path>`, which writes the same envelope to a file in any output mode, so a CI step can show readable output and still read the result.

`diff --github-comment --text` prints Markdown for a pull request comment; without `--text`, a non-interactive run prints JSON instead. `--summary` prints counts only, and `--output-file` writes the output to a file.

## introspect

Compares the store with the existing `config.yml`, shows the changes and asks before overwriting. `--dry-run` shows the changes without writing. A backup of the old file is kept unless you pass `--no-backup`. `--drift-check` exits with code 1 when the store and the file differ, without writing.

## deploy

Creates and updates entities. Entities that are in the store but missing from a section of the file are reported as deletions by `diff` and `--plan`, but `deploy` does not delete them. Sections absent from the file are left alone. `--plan` shows the plan without changing anything. `--fail-on-delete` stops before any change when the plan reports deletions. `--skip-media` leaves images and other media in the store untouched.

Each run saves a report to `.configurator/reports/deploy/<store>_<timestamp>.json`; the five newest are kept. `--report-path` writes it elsewhere.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success. `diff` also returns 0 when it finds changes |
| 1 | Unexpected error, or drift found by `introspect --drift-check` |
| 2 | `deploy`: authentication failed |
| 3 | `deploy`: network error |
| 4 | `deploy`, `diff`: `config.yml` failed validation |
| 5 | `deploy`: some operations failed |
| 6 | `deploy`, `diff`: deletions found with `--fail-on-delete` |
| 7 | `diff`: breaking changes found with `--fail-on-breaking` |

`validate` exits 0 when the file is valid, 2 when it is not, and 1 when the YAML cannot be parsed.
