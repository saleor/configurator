---
name: managing-github-ci
description: "Configures GitHub Actions workflows and CI/CD pipelines. Use when creating workflows, managing releases, troubleshooting CI failures, or configuring Husky hooks."
allowed-tools: "Read, Grep, Glob, Write, Edit, Bash(gh:*)"
---

# GitHub CI Automation

## Overview

Guide the configuration and management of GitHub Actions workflows, release automation, and CI/CD pipelines for the Saleor Configurator project.

## When to Use

- Creating or modifying GitHub Actions workflows
- Setting up automated releases via Changesets
- Troubleshooting CI failures
- Configuring pre-commit/pre-push hooks (Husky)

## Quick Reference

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `test-on-pr.yml` | PR to main | Typecheck, lint, test, build |
| `release.yml` | Push to main | Changesets publish to npm |
| `changeset-bot.yml` | PR opened/synced | Comment on missing changesets |

## Project CI Architecture

```
.github/
├── workflows/
│   ├── test-on-pr.yml      # PR validation
│   ├── release.yml         # Automated releases
│   └── changeset-bot.yml   # Changeset automation

.husky/
├── pre-push               # Schema docs generation

.changeset/
├── config.json            # Changeset configuration
└── *.md                   # Pending changesets
```

## Workflows

### test-on-pr.yml

Validates PRs before merge. Runs: typecheck, lint, test, build. Uses pnpm 9 + Node 20.

See [references/workflow-templates.md](references/workflow-templates.md) for full YAML.

### Required Checks

| Check | Command | Purpose |
|-------|---------|---------|
| Type check | `pnpm typecheck` | TypeScript validation |
| Lint | `pnpm lint` | Biome linting |
| Test | `pnpm test` | Vitest test suite |
| Build | `pnpm build` | Compilation check |

### release.yml

Automated npm releases via Changesets. Triggers on push to main with concurrency control.

Uses `changesets/action@v1` with `pnpm publish:ci-prod`. Requires `GITHUB_TOKEN` and `NPM_TOKEN`.

### Release Flow

```
1. Developer creates changeset -> pnpm changeset
2. PR merged to main
3. Changesets action runs:
   a. If changesets exist -> Creates "Version Packages" PR
   b. If version PR merged -> Publishes to npm
```

### changeset-bot.yml

Comments on PRs about missing changesets. Uses `changesets/bot@v1`.

## Pre-Push Hooks (Husky)

Located in `.husky/pre-push`:
- Runs `pnpm generate-schema-docs` before every push
- Auto-commits schema documentation updates
- Ensures docs stay in sync with schema changes

## Changesets Configuration

Located in `.changeset/config.json`. Key settings: `access: "public"`, `baseBranch: "main"`.

| Type | When to Use |
|------|-------------|
| `patch` | Bug fixes, documentation, refactoring |
| `minor` | New features, non-breaking enhancements |
| `major` | Breaking changes, API modifications |

## GitHub CLI

Use `gh` for workflow management: `gh run list`, `gh run view <id>`, `gh run watch <id>`, `gh run rerun <id>`, `gh pr checks <number>`.

## Troubleshooting CI Failures

### Reproduce Locally

| Failure | Command |
|---------|---------|
| Type check | `pnpm typecheck` or `npx tsc --noEmit` |
| Lint | `pnpm lint` then `pnpm check:fix` |
| Tests | `pnpm test -- --filter=<file>` |
| Build | `pnpm build` |

### Debugging Steps

1. Check workflow logs in GitHub Actions UI
2. Reproduce failure locally with commands above
3. Fix the issue
4. Push fix to PR
5. Re-run failed jobs: `gh run rerun <run-id>`

### npm Publish Rate Limiting

If npm publish fails: wait and retry. Check status at https://status.npmjs.org/

## Secrets Management

| Secret | Purpose | Where Set |
|--------|---------|-----------|
| `GITHUB_TOKEN` | Auto-provided | GitHub |
| `NPM_TOKEN` | npm publishing | Repository Settings > Secrets > Actions |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Missing `--frozen-lockfile` | Always use in CI installs |
| Using `@latest` action versions | Pin to specific versions (`@v4`) |
| No `concurrency` setting | Add to prevent duplicate runs |
| Forgetting to add changeset | Run `pnpm changeset` before PR |

## References

### Skill Reference Files
- **[Workflow Templates](references/workflow-templates.md)** - Full YAML workflow definitions and reusable patterns
- **[Troubleshooting Guide](references/troubleshooting.md)** - Detailed debugging patterns

### Project Resources
- `.github/workflows/` - Workflow files
- `.husky/` - Git hooks
- `.changeset/` - Changeset configuration

## Related Skills

- **Creating releases**: See `creating-changesets` for changeset creation
- **Local validation**: See `validating-pre-commit` for reproducing CI checks locally
