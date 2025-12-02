# Troubleshooting CI/CD Issues

Common issues and solutions for Saleor Configurator CI/CD integration.

## Quick Diagnostic

Run this command locally to test your configuration:

```bash
configurator diff --url $SALEOR_URL --token $SALEOR_TOKEN --config config.yml
```

If this works locally but fails in CI, the issue is likely with secrets or environment setup.

---

## Common Issues

### Workflow Not Triggering

**Symptoms:**
- Push or PR doesn't trigger the workflow
- No workflow run appears in Actions tab

**Solutions:**

1. **Check paths filter** - Ensure your config file path matches:
   ```yaml
   on:
     push:
       paths:
         - 'config.yml'      # Exact match
         - 'config/**'       # Directory match
         - '**/*.yml'        # All YAML files
   ```

2. **Verify workflow location** - File must be in `.github/workflows/`

3. **Check branch filter** - Ensure branch name matches:
   ```yaml
   on:
     push:
       branches: [main, master]  # Your default branch
   ```

4. **Validate YAML syntax** - Use a YAML validator or GitHub's workflow editor

---

### Authentication Errors (Exit Code 2)

**Symptoms:**
- Error: "Unauthorized" or "Authentication required"
- Exit code: 2

**Solutions:**

1. **Verify token is set correctly:**
   ```yaml
   # Correct
   saleor-token: ${{ secrets.SALEOR_TOKEN }}

   # Wrong - hardcoded token (security risk!)
   saleor-token: "sk_live_..."
   ```

2. **Check URL format:**
   ```
   # Correct
   https://your-shop.saleor.cloud/graphql/

   # Wrong - missing /graphql/
   https://your-shop.saleor.cloud/
   ```

3. **Verify secret exists:**
   - Go to Settings > Secrets > Actions
   - Ensure `SALEOR_TOKEN` is listed
   - Try re-creating the secret

4. **Check token permissions:**
   - Ensure token has required API permissions
   - Test token with curl:
     ```bash
     curl -X POST $SALEOR_URL \
       -H "Authorization: Bearer $SALEOR_TOKEN" \
       -H "Content-Type: application/json" \
       -d '{"query": "{ shop { name } }"}'
     ```

---

### Network Errors (Exit Code 3)

**Symptoms:**
- Error: "fetch failed" or "ECONNREFUSED"
- Exit code: 3

**Solutions:**

1. **Check URL accessibility** - Ensure URL is reachable from GitHub Actions:
   ```yaml
   - name: Test connectivity
     run: curl -v ${{ secrets.SALEOR_URL }}
   ```

2. **Firewall/allowlist issues:**
   - GitHub Actions uses shared IP ranges
   - If your Saleor instance has IP restrictions, allowlist GitHub's IPs
   - See: https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners#ip-addresses

3. **Timeout issues:**
   - For large configurations, operations may timeout
   - Check if rate limiting is applied

---

### Validation Errors (Exit Code 4)

**Symptoms:**
- Error: "Configuration validation failed"
- Exit code: 4

**Solutions:**

1. **Check config file syntax:**
   ```bash
   # Validate YAML
   python -c "import yaml; yaml.safe_load(open('config.yml'))"
   ```

2. **Check for duplicate identifiers:**
   - Each entity must have a unique identifier
   - Check for duplicate slugs, names, etc.

3. **Verify entity references:**
   - Ensure referenced entities exist (e.g., product type references)

4. **Run local validation:**
   ```bash
   configurator diff --url $URL --token $TOKEN --config config.yml
   ```

---

### PR Comment Not Appearing

**Symptoms:**
- Workflow completes but no comment on PR
- Comment permission errors

**Solutions:**

1. **Check permissions:**
   ```yaml
   permissions:
     pull-requests: write  # Required for posting comments
   ```

2. **Verify token has write access:**
   - Default `GITHUB_TOKEN` usually works
   - For cross-repo comments, use a PAT

3. **Check event type:**
   ```yaml
   # Comments only work on pull_request events
   on:
     pull_request:
       types: [opened, synchronize]
   ```

4. **Debug the comment step:**
   ```yaml
   - name: Debug
     run: |
       echo "Event: ${{ github.event_name }}"
       echo "PR: ${{ github.event.pull_request.number }}"
       echo "Diff output: ${{ steps.diff.outputs.diff-output }}"
   ```

---

### Exit Code 6 (Deletion Blocked)

**Symptoms:**
- Workflow fails with "deletions detected"
- Exit code: 6

**This is expected behavior** when `fail-on-delete: true` is set.

**Solutions:**

1. **If deletions are intentional:**
   - Remove `fail-on-delete: true` temporarily
   - Or use a separate workflow without the flag

2. **If deletions are unexpected:**
   - Review the diff to understand what's being deleted
   - Check if entities were renamed (shows as delete + create)

3. **Bypass for emergencies:**
   ```yaml
   - uses: saleor/configurator/action@v1
     with:
       fail-on-delete: ${{ github.event.inputs.allow-delete != 'true' }}
   ```

---

### Partial Failures (Exit Code 5)

**Symptoms:**
- Some operations succeed, others fail
- Exit code: 5

**Solutions:**

1. **Check deployment report:**
   ```yaml
   - uses: saleor/configurator/action@v1
     with:
       report-path: report.json

   - name: Show failures
     if: failure()
     run: cat report.json | jq '.errors'
   ```

2. **Common causes:**
   - Dependency ordering (creating products before product types)
   - Reference resolution failures
   - API rate limits

3. **Retry strategy:**
   ```yaml
   - uses: saleor/configurator/action@v1
     continue-on-error: true
     id: first-try

   - uses: saleor/configurator/action@v1
     if: steps.first-try.outcome == 'failure'
     id: retry
   ```

---

## Debug Mode

Enable verbose output for debugging:

```yaml
- uses: saleor/configurator/action@v1
  with:
    verbose: true
  env:
    LOG_LEVEL: debug
```

## Getting Help

1. **Check existing issues:** https://github.com/saleor/configurator/issues
2. **Search discussions:** https://github.com/saleor/configurator/discussions
3. **Open new issue** with:
   - Workflow file (sanitized of secrets)
   - Error message and exit code
   - Steps to reproduce
