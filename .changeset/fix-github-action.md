---
"@saleor/configurator": patch
---

Fix the GitHub Action (`action/`). It installs the CLI version released with the action's tag, passes the Saleor URL and token through the environment, runs each command once and reads its outputs from `--json-file`, keeps the CLI's exit code, makes `fail-on-diff` work, stops interpolating diff output into the PR comment script, and posts the PR comment when a policy check fails. `ci-mode` has no effect.
