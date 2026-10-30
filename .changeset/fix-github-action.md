---
"@saleor/configurator": patch
---

Fix the GitHub Action (`action/`): pass only CLI flags the configurator accepts (camelCase, no `--ci`), preserve the CLI exit code, read change counts and `has-changes` from the real JSON envelope, make `fail-on-diff` work, stop interpolating diff output into the PR comment script (script injection), redact the token from logs, post the PR comment when a policy check fails, and add an optional `configurator-version` input (defaults to `latest`). `ci-mode` is now a documented no-op.
