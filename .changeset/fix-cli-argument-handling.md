---
"@saleor/configurator": patch
---

Fixed several CLI argument-handling bugs:

- Documented kebab-case flags (`--fail-on-delete`, `--skip-media`, `--report-path`, `--github-comment`, `--output-file`, `--entity-type`, `--dry-run`, `--drift-check`, ...) are now accepted. The camelCase spellings (`--failOnDelete`, ...) keep working.
- `deploy --verbose` is a plain flag again; before, it expected a value and swallowed the next argument.
- The main help banner no longer prints on every command run, and command examples no longer appear twice in `--help`.
- `SALEOR_CONFIG` is now applied when `--config` is not passed. Precedence: `--config` > `SALEOR_CONFIG` > `config.yml`.
- Flags such as `--plan`, `--include` and `--skip-media` are no longer dropped when the URL or token is entered interactively.
- `http://` Saleor URLs are now accepted for local instances (`localhost`, `127.0.0.1`, `::1`). All other hosts still require HTTPS.
- Config paths such as `my..config.yml` are now accepted. Absolute paths in sibling directories (for example `/proj2` when the working directory is `/proj`) are now correctly rejected.
- `deploy --json` now always prints a JSON envelope: on failures, after a completed deployment, and when cancelled. Nothing else is written to stdout in JSON mode. Exit codes are unchanged.
- `validate --json` now reports unparseable YAML in the JSON envelope instead of crashing.
- Error messages and recovery suggestions now name the real command (`pnpm dlx @saleor/configurator`) instead of a non-existent `saleor-configurator` binary, and no longer suggest the unsupported `diff --verbose`.
