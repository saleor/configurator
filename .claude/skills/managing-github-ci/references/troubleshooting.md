# CI Troubleshooting Guide

This reference provides detailed debugging patterns for common CI failures.

## Quick Diagnosis Flowchart

```
CI Failed
    │
    ├── Check which step failed in GitHub Actions UI
    │
    ├── Is it reproducible locally?
    │   ├── Yes → Fix locally, push
    │   └── No → Check environment differences
    │
    └── Is it flaky (sometimes passes)?
        ├── Yes → Check for race conditions, timeouts
        └── No → Debug systematically
```

## Reproducing CI Locally

### Run All CI Checks

```bash
# Reproduce exact CI sequence
pnpm check:ci
```

### Individual Check Commands

| CI Step | Local Command |
|---------|---------------|
| Type check | `pnpm typecheck` or `npx tsc --noEmit` |
| Lint | `pnpm lint` |
| Tests | `pnpm test` or `CI=true pnpm test` |
| Build | `pnpm build` |
| All checks | `pnpm check:fix && pnpm test && pnpm build` |

### Environment Differences

CI uses `CI=true` environment variable. Some differences:

| Aspect | Local | CI |
|--------|-------|-----|
| Interactive tests | Allowed | Disabled |
| Colors | Enabled | May vary |
| stdin | Available | Not available |
| Working directory | Your machine | Fresh checkout |

## Type Check Failures

### Symptom: TypeScript errors in CI but not locally

**Causes:**
1. Different TypeScript versions
2. Missing generated types
3. Cached build artifacts

**Solutions:**

```bash
# Clear caches
rm -rf node_modules/.cache
rm -rf dist

# Reinstall and check
pnpm install --frozen-lockfile
pnpm typecheck
```

### Common TypeScript Errors

**"Cannot find module"**
```bash
# Regenerate path mappings
pnpm build

# Check tsconfig paths
cat tsconfig.json | grep paths
```

**"Type X is not assignable to type Y"**
- Check for `as const` missing
- Verify Zod schema matches expected type
- Ensure GraphQL schema is up to date: `pnpm fetch-schema`

## Test Failures

### Symptom: Tests pass locally but fail in CI

**Causes:**
1. Test order dependency
2. Timing issues (race conditions)
3. Environment-dependent behavior
4. Missing mocks in CI

**Debug Steps:**

```bash
# Run tests in CI mode locally
CI=true pnpm test

# Run tests in isolation
pnpm test -- --sequence.shuffle

# Run with verbose output
pnpm test -- --reporter=verbose

# Run single test file
pnpm test src/modules/category/category-service.test.ts
```

### Flaky Tests

Symptoms of flaky tests:
- Sometimes pass, sometimes fail
- Pass in isolation, fail in suite
- Time-sensitive assertions

**Solutions:**

```typescript
// BAD - Timing dependent
await someAsyncOperation();
expect(state.value).toBe('complete');

// GOOD - Wait for condition
await vi.waitFor(() => {
  expect(state.value).toBe('complete');
});

// BAD - Order dependent
let sharedState = [];
it('test 1', () => { sharedState.push(1); });
it('test 2', () => { expect(sharedState).toHaveLength(1); });

// GOOD - Independent tests
beforeEach(() => { sharedState = []; });
it('test 1', () => { sharedState.push(1); expect(sharedState).toHaveLength(1); });
it('test 2', () => { sharedState.push(1); expect(sharedState).toHaveLength(1); });
```

### Mock Issues

```typescript
// Ensure mocks are reset between tests
beforeEach(() => {
  vi.clearAllMocks();
});

// Or use restoreAllMocks for deeper cleanup
afterEach(() => {
  vi.restoreAllMocks();
});
```

## Lint Failures

### Symptom: Lint passes locally, fails in CI

**Causes:**
1. Auto-fix applied locally but not committed
2. Editor auto-formatting conflicts

**Solution:**

```bash
# Run auto-fix and commit changes
pnpm check:fix
git add -A
git commit -m "fix: lint issues"
```

### Common Lint Errors

| Error | Solution |
|-------|----------|
| Unused import | Remove or use the import |
| Unused variable | Remove or prefix with `_` |
| Missing semicolon | Run `pnpm check:fix` |
| Import order | Run `pnpm check:fix` |

## Build Failures

### Symptom: Build fails in CI

**Common Causes:**

1. **Missing dependencies**
   ```bash
   # Check for missing peer dependencies
   pnpm install
   pnpm ls --depth=0
   ```

2. **Import errors**
   ```bash
   # Verify all imports resolve
   pnpm build 2>&1 | grep "Cannot find"
   ```

3. **Circular dependencies**
   ```bash
   # Check for circular imports
   npx madge --circular src/
   ```

## GitHub Actions Specific Issues

### Workflow Not Running

Check:
- Workflow file syntax (use [actionlint](https://github.com/rhysd/actionlint))
- Branch protection rules match
- Event triggers are correct

```yaml
# Common trigger issues
on:
  pull_request:
    branches: [main]  # PR must target main
  push:
    branches: [main]  # Only main branch pushes
```

### Permission Errors

```yaml
# Add explicit permissions
permissions:
  contents: write
  pull-requests: write
  id-token: write
```

### Cache Issues

```bash
# Force cache refresh by changing cache key
- uses: actions/setup-node@v4
  with:
    cache: 'pnpm'
    cache-dependency-path: 'pnpm-lock.yaml'  # Explicit path
```

### Timeout Issues

```yaml
jobs:
  test:
    timeout-minutes: 15  # Increase if needed
```

## NPM Publish Failures

### Rate Limiting

```
npm ERR! 429 Too Many Requests
```

**Solution:** Wait and retry. Check https://status.npmjs.org/

### Authentication

```
npm ERR! 403 Forbidden
```

**Check:**
- `NPM_TOKEN` secret is set correctly
- Token has publish permissions
- Package name is available

### Version Conflict

```
npm ERR! 403 cannot publish over existing version
```

**Solution:** Bump version using changesets:
```bash
pnpm changeset
# Select version bump
git add .changeset/
git commit -m "chore: add changeset"
```

## Debugging Tools

### GitHub CLI

```bash
# View failed run logs
gh run view <run-id> --log-failed

# Re-run failed jobs
gh run rerun <run-id> --failed

# Download artifacts
gh run download <run-id>
```

### Workflow Debugging

Add debug step to workflow:

```yaml
- name: Debug environment
  run: |
    echo "Node version: $(node --version)"
    echo "pnpm version: $(pnpm --version)"
    echo "Working directory: $(pwd)"
    ls -la
    cat package.json
```

### Enable Debug Logging

Set secret `ACTIONS_STEP_DEBUG` to `true` for verbose logs.

## Common Error Messages

| Error | Likely Cause | Fix |
|-------|--------------|-----|
| `ENOSPC: no space left` | Disk full | Clear workflow caches |
| `ENOMEM` | Out of memory | Reduce parallelism |
| `ETIMEDOUT` | Network timeout | Retry or increase timeout |
| `EACCES` | Permission denied | Check file permissions |
| `frozen lockfile` | Lockfile mismatch | Run `pnpm install` locally and commit |
