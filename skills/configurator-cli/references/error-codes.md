# CLI Error Codes Reference

Complete reference for Configurator CLI exit codes and error handling.

## Exit Codes

| Code | Name | Description |
|------|------|-------------|
| 0 | SUCCESS | Operation completed successfully |
| 1 | UNEXPECTED | Unspecified error occurred |
| 2 | AUTHENTICATION | Invalid or expired credentials |
| 3 | NETWORK | Connection or network failure |
| 4 | VALIDATION | Configuration file has errors |
| 5 | PARTIAL_FAILURE | Some operations succeeded, others failed |
| 6 | DELETION_BLOCKED | `--fail-on-delete` flag triggered |
| 7 | BREAKING_BLOCKED | `--fail-on-breaking` flag triggered |

---

## Code 0: SUCCESS

Operation completed without errors.

**When returned**:
- All entities deployed successfully
- Introspection completed
- Diff showed no errors
- Deployment plan validation passed
- Config validation passed

**No action needed**.

---

## Code 1: UNEXPECTED

An unspecified or unexpected error occurred.

**Common causes**:
- GraphQL mutation errors
- Server-side validation failures
- Unexpected response format
- Internal CLI errors

**Troubleshooting**:

1. **Check the JSON envelope** for error details:
   ```bash
   pnpm dlx @saleor/configurator deploy --json 2>/dev/null | jq '.errors'
   ```

2. **Check logs** in the envelope:
   ```bash
   pnpm dlx @saleor/configurator deploy --json 2>/dev/null | jq '.logs'
   ```

3. **Check reports** for detailed deployment results:
   ```bash
   cat .configurator/reports/deploy/*.json | jq '.'
   ```

---

## Code 2: AUTHENTICATION

Invalid, expired, or insufficient credentials.

**When returned**:
- Invalid API token
- Expired token
- Missing token
- Insufficient permissions

**Troubleshooting**:

1. **Verify credentials are set**:
   ```bash
   echo $SALEOR_URL   # Should be https://...saleor.cloud/graphql/
   echo $SALEOR_TOKEN  # Should be non-empty
   ```

2. **Test token**:
   ```bash
   curl -X POST $SALEOR_URL \
     -H "Authorization: Bearer $SALEOR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"query": "{ shop { name } }"}'
   ```

3. **Check token permissions** in Saleor Dashboard

**Required permissions for full access**:
- `MANAGE_PRODUCTS`
- `MANAGE_CHANNELS`
- `MANAGE_SHIPPING`
- `MANAGE_SETTINGS`
- `MANAGE_TAXES`
- `MANAGE_MENUS`
- `MANAGE_PAGES`

---

## Code 3: NETWORK

Connection or network-related failure.

**When returned**:
- DNS resolution failure
- Connection timeout
- SSL/TLS errors
- Server unreachable

**Troubleshooting**:

1. **Verify URL is reachable**:
   ```bash
   curl -I $SALEOR_URL
   ```

2. **Check DNS and connectivity**:
   ```bash
   ping $(echo $SALEOR_URL | awk -F/ '{print $3}')
   ```

---

## Code 4: VALIDATION

The `config.yml` file has syntax or schema errors.

**When returned**:
- Invalid YAML syntax
- Missing required fields
- Invalid field values
- Schema constraint violations

**Troubleshooting**:

1. **Run validate for details**:
   ```bash
   pnpm dlx @saleor/configurator validate --json 2>/dev/null | jq '.result.errors[]'
   ```

2. **Common YAML issues**:
   - Incorrect indentation (use 2 spaces)
   - Missing quotes around special characters
   - Tabs instead of spaces

---

## Code 5: PARTIAL_FAILURE

Some operations succeeded, others failed. The deployment completed but not all entities were applied.

**When returned**:
- GraphQL errors on specific entities
- Server rejected some mutations
- Rate limiting caused failures

**Troubleshooting**:

1. **Parse failed entities from envelope**:
   ```bash
   pnpm dlx @saleor/configurator deploy --json 2>/dev/null | jq '.errors[] | "\(.entity): \(.message)"'
   ```

2. **Drill into specific failures**:
   ```bash
   pnpm dlx @saleor/configurator diff --entity "Categories/electronics" --json 2>/dev/null
   ```

3. **Fix and redeploy** -- only the failed entities will be retried.

---

## Code 6: DELETION_BLOCKED

The `--fail-on-delete` flag was set and deletions were detected.

**When returned**:
- Entities exist in remote but not in local config
- `--fail-on-delete` flag is active

**Resolution**:
- Review the deletions in `diff` output
- Either add the entities to config or remove `--fail-on-delete`

---

## Code 7: BREAKING_BLOCKED

The `--fail-on-breaking` flag was set and breaking changes were detected.

**When returned**:
- Breaking changes detected in deployment plan
- `--fail-on-breaking` flag is active

**Resolution**:
- Review the breaking changes
- Either adjust config or remove `--fail-on-breaking`

---

## Exit Code Decision Tree

```
exitCode == 0 --> Success
exitCode == 1 --> Check .errors and .logs in envelope
exitCode == 2 --> Regenerate token, verify URL
exitCode == 3 --> Check network, DNS, firewall
exitCode == 4 --> Run validate --json, fix config
exitCode == 5 --> Parse .errors for failed entities, drill down with --entity
exitCode == 6 --> Review deletions, decide to keep or remove --fail-on-delete
exitCode == 7 --> Review breaking changes, decide to accept or block
```

---

## Best Practices

### 1. Always parse JSON envelopes in automation

```bash
OUTPUT=$(pnpm dlx @saleor/configurator deploy --json 2>/dev/null)
EXIT_CODE=$(echo "$OUTPUT" | jq -r '.exitCode')

case $EXIT_CODE in
  0) echo "Success" ;;
  2) echo "Check credentials" ;;
  3) echo "Check network" ;;
  4) echo "Fix config.yml errors" ;;
  5) echo "Partial failure - check errors" ;;
  6) echo "Deletions blocked" ;;
  7) echo "Breaking changes blocked" ;;
  *) echo "Unexpected error" ;;
esac
```

### 2. Use validate before deploy

```bash
pnpm dlx @saleor/configurator validate --json
if [ $? -eq 0 ]; then
  pnpm dlx @saleor/configurator deploy
fi
```

### 3. Drill down on partial failures

```bash
# Get failed entities
pnpm dlx @saleor/configurator deploy --json 2>/dev/null | \
  jq -r '.errors[].entity' | while read entity; do
    pnpm dlx @saleor/configurator diff --entity "$entity" --json 2>/dev/null
  done
```
