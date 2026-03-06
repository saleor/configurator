---
name: configurator-troubleshoot
description: "Deployment failure diagnosis for Saleor Configurator. Use whenever any CLI command fails, when analyzing error messages, exit codes, or deployment reports, or when debugging partial failures."
license: MIT
metadata:
  author: saleor
  version: 1.0.0
  requires: "@saleor/configurator CLI"
---

# Configurator Troubleshooting

## Overview

This skill provides a systematic framework for diagnosing and fixing Configurator CLI failures. It covers error classification by exit code, drill-down patterns for partial failures, common error patterns with solutions, and a structured reporting format.

## When to Use

- Any CLI command fails with a non-zero exit code
- User reports error messages from configurator
- Deployment completed with partial failures
- Debugging GraphQL errors or reference issues
- When NOT looking for the deployment workflow -- use `configurator-workflow` instead
- When NOT looking for JSON envelope structure -- use `agent-output-parsing` instead

## Error Analysis Framework

### Step 1: Gather Context via JSON Envelope

The fastest way to diagnose is to parse the JSON envelope output:

```bash
# Validate config (no network needed)
pnpm dlx @saleor/configurator validate --json 2>/dev/null | jq '.'

# Get diff details for specific entity
pnpm dlx @saleor/configurator diff --entity "Type/name" --json 2>/dev/null | jq '.'

# Check last deployment report
ls -t deployment-report-*.json 2>/dev/null | head -1 | xargs cat | jq '.'
```

### Step 2: Classify by Exit Code

| Code | Name | Diagnosis |
|------|------|-----------|
| 0 | SUCCESS | No error (user may have questions about output) |
| 1 | UNEXPECTED | Check `.errors` and `.logs` in envelope |
| 2 | AUTHENTICATION | Invalid token, expired credentials, wrong URL |
| 3 | NETWORK | Connection refused, DNS failure, timeout |
| 4 | VALIDATION | YAML syntax, schema violations, missing fields |
| 5 | PARTIAL_FAILURE | Some entities failed - drill down with `--entity` |
| 6 | DELETION_BLOCKED | `--fail-on-delete` triggered |
| 7 | BREAKING_BLOCKED | `--fail-on-breaking` triggered |

### Step 3: Drill Down for Partial Failures (Exit Code 5)

```bash
# 1. Parse failed entities from envelope
OUTPUT=$(pnpm dlx @saleor/configurator deploy --json 2>/dev/null)
echo "$OUTPUT" | jq -r '.errors[] | "\(.entity): \(.message)"'

# 2. Drill into specific entity
pnpm dlx @saleor/configurator diff --entity "Categories/electronics" --json 2>/dev/null | jq '.result'

# 3. Check field-level differences
pnpm dlx @saleor/configurator diff --entity-type "Categories" --json 2>/dev/null | jq '.result.operations[]'
```

### Step 4: Apply Fix Based on Error Pattern

See the Common Error Patterns section below for specific solutions.

## Exit Code Decision Tree

```
exitCode == 0 --> Success, no action needed
exitCode == 1 --> Read error message, check logs array
exitCode == 2 --> Credentials issue:
                    - Regenerate token in Saleor Dashboard
                    - Verify URL ends with /graphql/
                    - Check HTTPS
exitCode == 3 --> Network issue:
                    - Verify URL is reachable
                    - Check DNS, firewall, VPN
exitCode == 4 --> Config validation failed:
                    - Run: validate --json
                    - Fix errors in config.yml
exitCode == 5 --> Partial failure:
                    - Parse errors array for failed entities
                    - Use --entity drill-down to inspect
                    - Fix and redeploy
exitCode == 6 --> Deletions blocked:
                    - Review deletions in diff output
                    - Remove entities from config or remove --fail-on-delete
exitCode == 7 --> Breaking changes blocked:
                    - Review breaking changes
                    - Remove --fail-on-breaking or accept changes
```

## Common Error Patterns

### Authentication (Exit Code 2)

**Diagnosis**: Token is invalid, expired, or has insufficient permissions.

**Fix**:
1. Verify `SALEOR_URL` ends with `/graphql/` and uses HTTPS
2. Regenerate token in Saleor Dashboard
3. Check token permissions (needs `MANAGE_*` permissions)

**Test authentication**:
```bash
curl -X POST $SALEOR_URL \
  -H "Authorization: Bearer $SALEOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ shop { name } }"}'
```

### Validation (Exit Code 4)

**Diagnosis**: Config file has schema errors.

**Fix**:
```bash
# Get exact errors
pnpm dlx @saleor/configurator validate --json 2>/dev/null | jq '.result.errors[] | "\(.path): \(.message)"'
```

### Duplicate Entity

```
Error: Product with slug "my-product" already exists
```

**Fix**:
1. Run `introspect` to pull current state
2. Modify existing entity instead of creating
3. Use a different slug

### Invalid Reference

```
Error: ProductType "NonExistent" not found
```

**Fix**:
1. Check exact spelling of the referenced type
2. Ensure the referenced entity is defined in config.yml
3. Entity types must be deployed before entities that reference them

### Rate Limiting

**Fix**: The CLI has built-in rate limiting. If still hitting limits:
1. Reduce `GRAPHQL_MAX_CONCURRENCY` (default: 4)
2. Deploy in smaller batches using `--include`

## Diagnostic Commands

```bash
# 1. Validate config locally (no network)
pnpm dlx @saleor/configurator validate --json 2>/dev/null

# 2. Drill into specific entity
pnpm dlx @saleor/configurator diff --entity "Type/name" --json 2>/dev/null

# 3. Check last deployment report
ls -la deployment-report-*.json

# 4. Full diff
pnpm dlx @saleor/configurator diff --json 2>/dev/null

# 5. Test authentication
curl -X POST $SALEOR_URL \
  -H "Authorization: Bearer $SALEOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ shop { name } }"}'
```

## Troubleshooting Report Format

When diagnosing issues, structure your findings as:

```
ERROR IDENTIFIED
Type: [Error Type] (Exit Code [N])
Message: [Error Message]

ROOT CAUSE
[Explanation of what caused the error]

SOLUTION
Step 1: [First action]
Step 2: [Second action]

VERIFICATION
[Command to verify the fix]

PREVENTION
- [Best practice 1]
- [Best practice 2]
```

## Related Skills

- **`configurator-workflow`** - Full deployment workflow sequence
- **`agent-output-parsing`** - JSON envelope structure and parsing
- **`configurator-cli`** - Complete command reference and flags
