---
"@anthropic/saleor-configurator": minor
---

feat: Add comprehensive CI/CD integration support

- Add new CLI flags for CI environments:
  - `--json`: Output diff/deploy results in JSON format
  - `--github-comment`: Output diff as GitHub PR comment markdown
  - `--summary`: Show only counts without details
  - `--output-file`: Write output to a file
  - `--plan`: Dry-run mode for deploy command
  - `--fail-on-delete`: Exit with code 6 if deletions detected
  - `--fail-on-breaking`: Exit with code 7 if breaking changes detected

- Add GitHub Action (`action/`) for marketplace publishing:
  - Composite action with all CLI commands
  - PR comment posting support
  - Structured outputs for workflow integration

- Add reusable workflow templates (`examples/github-workflows/`):
  - PR diff preview with comments
  - Auto-deploy to staging on merge
  - Production deploy with approval gates
  - Scheduled drift detection

- Add comprehensive CI/CD documentation (`docs/ci-cd/`)
