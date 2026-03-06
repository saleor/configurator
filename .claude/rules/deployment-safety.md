---
alwaysApply: true
---

# Deployment Safety

Quality gates and validation checkpoints that apply everywhere.

## Before You Start

Before committing or pushing, invoke the `validating-pre-commit` skill for the full validation workflow.

## Pre-Commit Checklist

Run in order before every commit:

```bash
# 1. Fix lint and formatting
pnpm check:fix

# 2. Verify compilation
pnpm build

# 3. Run tests
pnpm test

# 4. Strict type check
npx tsc --noEmit

# 5. CI validation
pnpm check:ci
```

## Changesets

For any user-facing change:

```bash
pnpm changeset
```

Select version bump:
- **patch**: Bug fixes, documentation
- **minor**: New features (backward compatible)
- **major**: Breaking changes

## E2E Testing

Before pushing core changes. Non-interactive mode is auto-detected in non-TTY environments.

```bash
# Credentials from .env.local (see .env.example for template)
# source .env.local

# Full validation (non-interactive auto-detected in non-TTY)
rm -rf config.yml
pnpm dev introspect --url=$SALEOR_URL --token=$SALEOR_TOKEN
# Make test changes
pnpm dev deploy --url=$SALEOR_URL --token=$SALEOR_TOKEN
pnpm dev deploy --url=$SALEOR_URL --token=$SALEOR_TOKEN  # Should show no changes (idempotent)
rm config.yml
pnpm dev introspect --url=$SALEOR_URL --token=$SALEOR_TOKEN
pnpm dev diff --url=$SALEOR_URL --token=$SALEOR_TOKEN    # Should show no diff
```

**Checking results after deploy:**
- Deployment report auto-saved as `deployment-report-*.json` in CWD
- Console shows deployment summary with resilience stats
- Use `LOG_LEVEL=debug` for verbose request/retry logging

## CI Expectations

GitHub Actions runs on every PR:
- Lint check (no auto-fix)
- TypeScript compilation
- Full test suite
- Coverage reporting

## Safety Checklist

Before pushing:
- [ ] All 5 pre-commit steps pass
- [ ] Changeset added (if user-facing)
- [ ] E2E tested (if core changes)
- [ ] No console.log statements
- [ ] No hardcoded credentials

## Common Issues

### Lint Failures

```bash
# Auto-fix most issues
pnpm check:fix

# Manual fixes needed for:
# - Complexity warnings
# - Unused variables
# - Type errors
```

### Type Errors

```bash
# Check types
npx tsc --noEmit

# Common fixes:
# - Add proper type annotations
# - Remove `any` types
# - Fix import/export mismatches
```

### Test Failures

```bash
# Run specific test
pnpm test src/modules/category

# Debug with verbose
pnpm test -- --reporter=verbose
```

**Required Skills**: `validating-pre-commit`, `managing-github-ci` (invoke before committing)
