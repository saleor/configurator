---
name: agent-output-parsing
description: "Parsing JSON envelope output from Configurator CLI commands. Use whenever processing exit codes, JSON envelopes, drill-down workflows, or building automation around the CLI."
license: MIT
metadata:
  author: saleor
  version: 1.0.0
  requires: "@saleor/configurator CLI"
---

# Agent Output Parsing

## Overview

The Configurator CLI outputs a JSON envelope in non-TTY mode. This skill documents the envelope structure, exit code semantics, and drill-down patterns for debugging failures.

## When to Use

- Parsing CLI output in automation scripts
- Understanding exit codes and what to do next
- Drilling into specific entity failures
- Building workflows that chain CLI commands

## JSON Envelope Structure

Every command outputs this envelope in non-TTY mode (or with `--json`):

```json
{
  "command": "deploy",
  "version": "1.3.0",
  "exitCode": 0,
  "result": { },
  "logs": [
    { "level": "info", "ts": "2026-03-05T09:30:00Z", "message": "Starting deployment" }
  ],
  "errors": [
    { "entity": "Categories/electronics", "stage": "update", "message": "Not found" }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `command` | string | Command name (validate, diff, deploy, introspect) |
| `version` | string | CLI version |
| `exitCode` | number | Exit code (0-7) |
| `result` | object | Command-specific result data |
| `logs` | array | Log entries collected during execution |
| `errors` | array | Structured error entries |

## Per-Command Result Shapes

### validate

```json
{ "valid": true, "errors": [] }
```

```json
{
  "valid": false,
  "errors": [
    { "path": "channels.0.currencyCode", "message": "Required" },
    { "path": "products.0.slug", "message": "String must contain at least 1 character(s)" }
  ]
}
```

### diff

```json
{
  "summary": { "totalChanges": 3, "creates": 1, "updates": 1, "deletes": 1 },
  "operations": [
    {
      "operation": "CREATE",
      "entityType": "Categories",
      "entityName": "electronics",
      "changes": []
    },
    {
      "operation": "UPDATE",
      "entityType": "Product Types",
      "entityName": "T-Shirt",
      "changes": [{ "field": "name", "currentValue": "Old", "desiredValue": "New" }]
    }
  ],
  "hasDestructiveOperations": true
}
```

### deploy --plan

```json
{
  "status": "plan",
  "summary": { "creates": 1, "updates": 0, "deletes": 0, "noChange": 5 },
  "operations": [],
  "willDeleteEntities": false,
  "configFile": "config.yml",
  "saleorUrl": "https://store.saleor.cloud/graphql/"
}
```

### deploy (executed)

```json
{
  "status": "completed",
  "summary": { "succeeded": 6, "failed": 0, "skipped": 0 },
  "operations": [],
  "duration": "12.3s",
  "reportPath": ".configurator/reports/deploy/store-abc_2026-03-05_09h30m00s.json"
}
```

### introspect

```json
{
  "status": "success",
  "configPath": "config.yml"
}
```

## Exit Code Decision Tree

```
Is exitCode 0?
  YES --> Success. Done.
  NO  --> Continue...

Is exitCode 2?
  YES --> Authentication issue.
          - Check SALEOR_URL ends with /graphql/
          - Check SALEOR_TOKEN is valid
          - Regenerate token in Dashboard

Is exitCode 3?
  YES --> Network issue.
          - Verify URL is reachable: curl -I $SALEOR_URL
          - Check DNS, firewall, VPN

Is exitCode 4?
  YES --> Validation error.
          - Run: validate --json
          - Parse .result.errors for specific issues
          - Fix config.yml

Is exitCode 5?
  YES --> Partial failure.
          - Parse .errors array for failed entities
          - Drill down: diff --entity "Type/name" --json
          - Fix specific entities and redeploy

Is exitCode 6?
  YES --> Deletions blocked.
          - Review deletions in diff output
          - Remove entities from config or remove --fail-on-delete

Is exitCode 7?
  YES --> Breaking changes blocked.
          - Review breaking changes
          - Remove --fail-on-breaking or accept changes

Otherwise (exitCode 1):
  --> Unexpected error.
      - Check .errors and .logs in envelope
      - Check report files in .configurator/reports/
```

## Drill-Down Pattern

When deployment fails partially (exit code 5):

```bash
# Step 1: Get overview of failures
OUTPUT=$(pnpm dlx @saleor/configurator deploy --json 2>/dev/null)
echo "$OUTPUT" | jq '.errors[]'

# Step 2: Filter by entity type
pnpm dlx @saleor/configurator diff --entity-type "Categories" --json 2>/dev/null | jq '.result'

# Step 3: Drill into specific entity
pnpm dlx @saleor/configurator diff --entity "Categories/electronics" --json 2>/dev/null | jq '.result.operations[].changes'

# Step 4: Fix config.yml based on field-level differences

# Step 5: Validate fix
pnpm dlx @saleor/configurator validate --json 2>/dev/null

# Step 6: Redeploy
pnpm dlx @saleor/configurator deploy --json 2>/dev/null
```

## Parsing Examples

### Bash

```bash
OUTPUT=$(pnpm dlx @saleor/configurator deploy --json 2>/dev/null)
EXIT_CODE=$(echo "$OUTPUT" | jq -r '.exitCode')

case $EXIT_CODE in
  0) echo "Success" ;;
  4) echo "$OUTPUT" | jq -r '.result.errors[] | "  \(.path): \(.message)"' ;;
  5) echo "$OUTPUT" | jq -r '.errors[] | "  \(.entity): \(.message)"' ;;
  *) echo "$OUTPUT" | jq -r '.errors[].message // "Unknown error"' ;;
esac
```

### JavaScript

```javascript
const { execSync } = require("child_process");

function runConfigurator(command) {
  try {
    const output = execSync(`pnpm dlx @saleor/configurator ${command} --json`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return JSON.parse(output);
  } catch (err) {
    // CLI exits non-zero but still outputs valid JSON to stdout
    if (err.stdout) return JSON.parse(err.stdout);
    throw err;
  }
}

const result = runConfigurator("validate");
if (!result.result.valid) {
  for (const error of result.result.errors) {
    console.error(`${error.path}: ${error.message}`);
  }
}
```

## Reports

Deployment reports are auto-saved after every `deploy` command.

**Default location**: `deployment-report-YYYY-MM-DD_HH-MM-SS.json` in the current working directory.

**Custom location**: Use `--report-path=custom/path.json` to control where the report is saved.

### Report Structure

```json
{
  "command": "deploy",
  "version": "1.3.0",
  "exitCode": 0,
  "result": {
    "status": "completed",
    "summary": {
      "succeeded": 6,
      "failed": 0,
      "skipped": 0
    },
    "operations": [
      {
        "entityType": "Categories",
        "entityName": "electronics",
        "operation": "CREATE",
        "status": "success",
        "duration": "0.8s"
      }
    ],
    "duration": "12.3s",
    "reportPath": "deployment-report-2026-03-05_09-30-00.json",
    "resilience": {
      "retries": 2,
      "rateLimitHits": 0
    }
  },
  "logs": [],
  "errors": []
}
```

### Reading Reports

```bash
# Read latest report
cat deployment-report-*.json | jq '.result.summary'

# Check for failures
cat deployment-report-*.json | jq '.result.operations[] | select(.status == "failed")'

# Get resilience stats
cat deployment-report-*.json | jq '.result.resilience'
```

## Related Skills

- **`configurator-cli`** - Full command reference and flags
- **`configurator-schema`** - Config.yml structure for fixing validation errors
