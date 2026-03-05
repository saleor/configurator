---
"@saleor/configurator": minor
---

### AI & CI/CD Integration

- **Environment variable credentials**: Read `SALEOR_URL`, `SALEOR_TOKEN`, and `SALEOR_CONFIG` from environment variables or `.env.local`, so you no longer need to pass `--url` and `--token` on every command.
- **Auto-detect non-interactive mode**: Confirmations are automatically skipped in CI pipelines, piped commands, and other non-TTY environments — no special flag needed.
- **Structured JSON output**: All commands now support `--json` for machine-readable output wrapped in a consistent envelope with `command`, `version`, `exitCode`, `result`, `logs`, and `errors` fields.
- **`--text` flag**: Force human-readable output even when running in non-TTY mode.

### New Commands

- **`validate`**: Offline validation of your `config.yml` against the schema — catch errors before deploying.
- **`schema`**: Output the full JSON Schema for `config.yml`, useful for editor autocompletion and external tooling.

### Diff & Deploy Improvements

- **Entity filtering**: Use `--entity-type` and `--entity` flags on `diff` and `deploy` to scope operations to specific entity types or individual entities (e.g., `--entity Categories/electronics`).
- **Deploy `--plan --json`**: Get a structured plan of what would change without actually deploying.
- **Smarter report paths**: Deployment reports now include the command name and Saleor instance in the filename for easier identification.
- **Improved validation errors**: Union type validation errors now include hints about which branches failed, making schema errors easier to diagnose.

### Log Collection

- **JSON log collector**: When using `--json`, log messages (info, warn, error, debug) are captured and included in the JSON envelope instead of being printed to stderr, giving you a single parseable output.

### Claude Code Plugin

- **AGENTS.md**: New integration guide for AI agents — JSON envelope schemas, workflow sequences, exit code decision trees, and parsing examples for both bash and Node.js.
- **New agent: configurator-expert**: Dedicated agent for store configuration analysis and troubleshooting.
- **New skill: agent-output-parsing**: Teaches agents how to parse and act on structured JSON output from the CLI.
- **New skill reference: ci-cd**: Guide for using Configurator in CI/CD pipelines with drift detection and safe deployment patterns.
- **Pre-deploy safety hook**: Automatic validation gate that runs before deployments.
- **Improved skills**: Updated configurator-cli, configurator-recipes, configurator-schema, saleor-domain, and product-modeling skills with new flags, examples, and Phase 2 capabilities.
- **Updated agents**: Refreshed troubleshoot, config-review, store-analyzer, csv-importer, and shopify-importer agents with JSON output awareness and improved workflows.
