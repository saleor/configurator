# CLI Error Codes Reference

Complete reference for Configurator CLI exit codes and error handling.

## Exit Codes

| Code | Name | Description |
|------|------|-------------|
| 0 | SUCCESS | Operation completed successfully |
| 1 | GENERAL_ERROR | Unspecified error occurred |
| 2 | VALIDATION_ERROR | Configuration file has errors |
| 3 | AUTHENTICATION_ERROR | Invalid or expired credentials |
| 4 | NETWORK_ERROR | Connection or network failure |

---

## Code 0: SUCCESS

Operation completed without errors.

**When returned**:
- All entities deployed successfully
- Introspection completed
- Diff showed no errors
- Dry run validation passed

**No action needed**.

---

## Code 1: GENERAL_ERROR

An unspecified or unexpected error occurred.

**Common causes**:
- GraphQL mutation errors
- Server-side validation failures
- Unexpected response format
- Internal CLI errors

**Troubleshooting**:

1. **Check the error message** for specific details:
   ```
   Error: ProductCreate mutation failed
   Field: slug
   Message: Product with this slug already exists
   ```

2. **Run with --verbose** for more context:
   ```bash
   npx configurator deploy --verbose
   ```

3. **Check Saleor logs** if you have access to the instance

**Common fixes**:
- Duplicate slug/name: Change the identifier
- Invalid reference: Ensure referenced entities exist
- Permission denied: Verify token permissions

---

## Code 2: VALIDATION_ERROR

The `config.yml` file has syntax or schema errors.

**When returned**:
- Invalid YAML syntax
- Missing required fields
- Invalid field values
- Schema constraint violations

**Error output format**:
```
Validation Error in config.yml:

  Line 15: Missing required field 'currencyCode' in channel
  Line 23: Invalid attribute type 'INVALID_TYPE'
  Line 45: Product references unknown productType 'Nonexistent'
```

**Troubleshooting**:

1. **Check YAML syntax**:
   ```bash
   # Validate YAML
   python -c "import yaml; yaml.safe_load(open('config.yml'))"
   ```

2. **Review line numbers** in error message

3. **Common YAML issues**:
   - Incorrect indentation (use 2 spaces)
   - Missing quotes around special characters
   - Tabs instead of spaces

**Common fixes**:

| Error | Fix |
|-------|-----|
| Missing required field | Add the field with valid value |
| Invalid type | Check allowed values in schema |
| Unknown reference | Create the referenced entity first |
| Duplicate identifier | Make slugs/names unique |

---

## Code 3: AUTHENTICATION_ERROR

Invalid, expired, or insufficient credentials.

**When returned**:
- Invalid API token
- Expired token
- Missing token
- Insufficient permissions

**Error output format**:
```
Authentication Error:
  Unable to authenticate with provided credentials.

  Verify:
  - Token is valid and not expired
  - URL points to correct Saleor instance
  - Token has required permissions
```

**Troubleshooting**:

1. **Verify the URL**:
   ```bash
   # Check if URL is accessible
   curl -I https://your-store.saleor.cloud/graphql/
   ```

2. **Test token**:
   ```bash
   curl -X POST https://your-store.saleor.cloud/graphql/ \
     -H "Authorization: Bearer $SALEOR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"query": "{ shop { name } }"}'
   ```

3. **Check token permissions** in Saleor Dashboard

**Common fixes**:

| Issue | Fix |
|-------|-----|
| Token expired | Generate new token in Dashboard |
| Wrong instance | Verify `--url` matches your store |
| Missing permissions | Add required permissions to token |
| Typo in token | Copy token again carefully |

**Required permissions for full access**:
- `MANAGE_PRODUCTS`
- `MANAGE_CHANNELS`
- `MANAGE_SHIPPING`
- `MANAGE_SETTINGS`
- `MANAGE_TAXES`
- `MANAGE_MENUS`
- `MANAGE_PAGES`

---

## Code 4: NETWORK_ERROR

Connection or network-related failure.

**When returned**:
- DNS resolution failure
- Connection timeout
- SSL/TLS errors
- Server unreachable

**Error output format**:
```
Network Error:
  Unable to connect to https://store.saleor.cloud/graphql/

  Error: ECONNREFUSED

  Verify:
  - URL is correct
  - Internet connection is working
  - Server is running
  - Firewall allows connection
```

**Troubleshooting**:

1. **Check connectivity**:
   ```bash
   # Ping the domain
   ping store.saleor.cloud

   # Check if port is open
   nc -zv store.saleor.cloud 443
   ```

2. **Check DNS**:
   ```bash
   nslookup store.saleor.cloud
   ```

3. **Check SSL**:
   ```bash
   openssl s_client -connect store.saleor.cloud:443
   ```

**Common fixes**:

| Issue | Fix |
|-------|-----|
| Server down | Wait and retry, check status page |
| Firewall blocking | Whitelist Saleor domain |
| VPN issues | Connect/disconnect VPN |
| DNS failure | Try different DNS server |
| SSL error | Check system certificates |

---

## Error Messages

### GraphQL Errors

```
GraphQL Error:
  Operation: ProductCreate
  Field: variants.0.sku
  Message: This field is required.
```

**Fix**: Add the missing required field to your config.

### Rate Limiting

```
Rate Limit Error:
  Too many requests. Please wait before retrying.
  Retry-After: 60 seconds
```

**Fix**: Wait the specified time and retry.

### Conflict Errors

```
Conflict Error:
  Entity: Product "my-product"
  Message: Entity was modified since last fetch.
```

**Fix**: Run `introspect` to get latest state, reapply changes.

---

## Best Practices

### 1. Always check exit codes in scripts

```bash
npx configurator deploy
if [ $? -eq 2 ]; then
  echo "Config validation failed"
  exit 1
fi
```

### 2. Use --dry-run before deploy

```bash
npx configurator deploy --dry-run
if [ $? -eq 0 ]; then
  npx configurator deploy
fi
```

### 3. Handle errors gracefully

```bash
npx configurator deploy 2>&1 | tee deploy.log
EXIT_CODE=${PIPESTATUS[0]}

case $EXIT_CODE in
  0) echo "Success" ;;
  2) echo "Fix config.yml errors" ;;
  3) echo "Check credentials" ;;
  4) echo "Check network" ;;
  *) echo "Unexpected error" ;;
esac
```

### 4. Capture verbose output for debugging

```bash
npx configurator deploy --verbose 2>&1 > debug.log
```
