---
name: configurator-workflow
description: "End-to-end deployment workflow for Saleor Configurator: validate, diff, plan, deploy. Use whenever deploying, syncing, or debugging store configuration, or when building automation that chains CLI commands."
license: MIT
metadata:
  author: saleor
  version: 1.0.0
  requires: "@saleor/configurator CLI"
---

# Configurator Workflow

## Overview

This skill defines the optimal workflow sequence for deploying Saleor configurations. It covers the validate-diff-plan-deploy pipeline, JSON envelope parsing at each step, failure recovery with entity-scoped drill-down, and report-based context gathering.

## When to Use

- "Deploy my config to the store"
- "What would change if I deploy?"
- "The last deploy failed, help me fix it"
- "Set up a deployment pipeline"
- Building CI/CD automation around the CLI
- When NOT looking for individual command flags -- use `configurator-cli` instead
- When NOT parsing JSON output structure -- use `agent-output-parsing` instead

## Core Workflow Sequence

Always follow this sequence for safe deployments:

### Step 1: Validate (No Network)

```bash
pnpm dlx @saleor/configurator validate --json 2>/dev/null
```

Parse the envelope:
- If `result.valid === false`: fix `config.yml` errors before proceeding
- If `result.valid === true`: continue to diff

### Step 2: Diff (Read-Only)

```bash
pnpm dlx @saleor/configurator diff --json 2>/dev/null
```

Parse the envelope:
- If `result.summary.totalChanges === 0`: config is in sync, no deployment needed
- If `result.hasDestructiveOperations === true`: warn about deletions
- Otherwise: show summary of changes

### Step 3: Plan (Preview)

```bash
pnpm dlx @saleor/configurator deploy --plan --json 2>/dev/null
```

Parse the envelope:
- Show creates, updates, deletes counts
- If `result.willDeleteEntities === true`: explicitly warn
- Ask for confirmation before proceeding

### Step 4: Deploy (Execute)

```bash
pnpm dlx @saleor/configurator deploy --json 2>/dev/null
```

Parse the envelope:
- If `exitCode === 0`: success
- If `exitCode === 5`: partial failure, drill down into errors
- Other exit codes: follow the exit code decision tree

## Workflow Diagram

```
validate --json
    |
    v
  valid? --no--> fix config.yml --> validate again
    |
   yes
    |
    v
diff --json
    |
    v
  changes? --no--> done (in sync)
    |
   yes
    |
    v
deploy --plan --json
    |
    v
  review plan
    |
    v
deploy --json
    |
    v
  exitCode 0? --no--> check errors, drill down
    |
   yes
    |
    v
  done
```

## Failure Recovery

When `exitCode === 5` (partial failure):

1. Parse `.errors` array for failed entities
2. For each failed entity, drill down:
   ```bash
   pnpm dlx @saleor/configurator diff --entity "Type/name" --json 2>/dev/null
   ```
3. Analyze field-level differences
4. Fix config.yml for the specific entities
5. Re-validate and redeploy

### Drill-Down Example

```bash
# 1. Deploy fails with partial errors
OUTPUT=$(pnpm dlx @saleor/configurator deploy --json 2>/dev/null)
echo "$OUTPUT" | jq -r '.errors[] | "\(.entity): \(.message)"'

# 2. Drill into the failing entity type
pnpm dlx @saleor/configurator diff --entity-type "Categories" --json 2>/dev/null | jq '.result'

# 3. Drill into the specific entity
pnpm dlx @saleor/configurator diff --entity "Categories/electronics" --json 2>/dev/null | jq '.result.operations[].changes'

# 4. Fix config.yml based on field-level diff

# 5. Validate fix
pnpm dlx @saleor/configurator validate --json 2>/dev/null

# 6. Redeploy
pnpm dlx @saleor/configurator deploy --json 2>/dev/null
```

## Using Reports for Context

Check previous deployment reports before starting a new workflow:

```bash
# List recent reports
ls -lt deployment-report-*.json 2>/dev/null | head -5

# Read latest report
ls -t deployment-report-*.json 2>/dev/null | head -1 | xargs cat | jq '.'

# Check for previous failures
ls -t deployment-report-*.json 2>/dev/null | head -1 | xargs cat | jq '.result.operations[] | select(.status == "failed")'
```

## Exit Code Handling

| Code | Action |
|------|--------|
| 0 | Success - report completion |
| 1 | Unexpected - check .errors and .logs |
| 2 | Auth - verify SALEOR_URL and SALEOR_TOKEN |
| 3 | Network - verify URL is reachable |
| 4 | Validation - run validate, fix errors |
| 5 | Partial - drill down with --entity, fix, redeploy |
| 6 | Deletions blocked - show deletions, confirm intent |
| 7 | Breaking blocked - show breaking changes, confirm intent |

## CI/CD Pipeline Pattern

```bash
#!/bin/bash
set -e

# Step 1: Validate
VALIDATE=$(pnpm dlx @saleor/configurator validate --json 2>/dev/null)
if [ "$(echo "$VALIDATE" | jq -r '.result.valid')" != "true" ]; then
  echo "Validation failed:"
  echo "$VALIDATE" | jq -r '.result.errors[] | "  \(.path): \(.message)"'
  exit 4
fi

# Step 2: Plan
PLAN=$(pnpm dlx @saleor/configurator deploy --plan --json 2>/dev/null)
echo "Plan: $(echo "$PLAN" | jq -r '.result.summary | "creates=\(.creates) updates=\(.updates) deletes=\(.deletes)"')"

# Step 3: Deploy with safety guards
pnpm dlx @saleor/configurator deploy --fail-on-delete --json 2>/dev/null
```

## Credentials

Credentials come from `.env.local` (auto-loaded) or environment variables:
- `SALEOR_URL` - Saleor GraphQL endpoint (must end with `/graphql/`)
- `SALEOR_TOKEN` - API authentication token

## Safety Rules

- Always validate before deploying
- Always show diff/plan before executing
- Warn explicitly about deletions
- Use `--fail-on-delete` in CI/CD pipelines
- Parse JSON envelopes rather than scraping text output
- Non-interactive mode is auto-detected in non-TTY environments

## Related Skills

- **`configurator-cli`** - Individual command reference and flags
- **`agent-output-parsing`** - JSON envelope structure and parsing patterns
- **`configurator-troubleshoot`** - Error diagnosis and fix guidance
