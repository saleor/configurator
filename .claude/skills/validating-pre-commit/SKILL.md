---
name: validating-pre-commit
description: "Runs quality gate checks before commit or push. Use when preparing to commit, reproducing CI failures locally, or validating changes pass all checks."
allowed-tools: "Read, Bash(pnpm:*), Bash(npx:*), Bash(rm:*)"
---

# Pre-Commit Quality Gate

## Overview

Ensure all code quality standards are met before committing or pushing changes. Runs the mandatory quality checklist and reports failures with actionable fixes.

## When to Use

- Before creating a commit or pushing to remote
- After making significant changes
- When CI is failing and you need to reproduce locally

## Quick Reference

| Check | Command | Purpose |
|-------|---------|---------|
| Auto-fix | `pnpm check:fix` | Fix lint/format issues |
| Build | `pnpm build` | Compile TypeScript |
| Test | `pnpm test` | Run all tests |
| Type check | `npx tsc --noEmit` | Strict TS validation |
| CI check | `pnpm check:ci` | Full CI validation |
| Lint only | `pnpm lint` | Check linting |
| Format only | `pnpm format` | Check formatting |
| **All at once** | `pnpm check:fix && pnpm build && pnpm test && pnpm check:ci` | Full pipeline |

## Mandatory Quality Checklist

Execute these steps **in order**. All must pass before committing.

### Step 1: Auto-Fix Linting and Formatting

```bash
pnpm check:fix
```

Auto-fixes Biome issues (imports, commas, quotes, indentation). If issues remain, manually fix complexity warnings, unused variables, or type errors.

### Step 2: Verify TypeScript Compilation

```bash
pnpm build
```

Ensures the project compiles. Check recent changes for type mismatches, missing exports, or import resolution errors.

### Step 3: Run All Tests

```bash
pnpm test
```

If tests fail: read the failure message, check if expectations match new behavior, update test or fix implementation, re-run with `pnpm test -- --filter=<test-file>`.

### Step 4: Strict TypeScript Check

```bash
npx tsc --noEmit
```

Catches more than build: implicit `any`, unused imports/variables, stricter null checking.

### Step 5: Final CI Validation

```bash
pnpm check:ci
```

Runs the same checks CI will run (linting without auto-fix, format checking, TypeScript compilation).

## E2E CLI Testing Protocol

**When to Run**: Before pushing changes that affect core CLI functionality (commands, services, repositories).

```bash
# Test credentials
--url=https://store-rzalldyg.saleor.cloud/graphql/
--token=YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs

# 1. Clean slate
rm -rf config.yml

# 2. Fresh introspection
pnpm dev introspect --url=<URL> --token=<TOKEN>

# 3. Deploy changes
pnpm dev deploy --url=<URL> --token=<TOKEN>

# 4. Test idempotency (deploy again - should have no changes)
pnpm dev deploy --url=<URL> --token=<TOKEN>

# 5. Clean and re-introspect
rm config.yml
pnpm dev introspect --url=<URL> --token=<TOKEN>

# 6. Verify no drift
pnpm dev diff --url=<URL> --token=<TOKEN>
```

**Success Criteria**: Step 4 shows no changes (idempotency). Step 6 shows no diff (round-trip consistency).

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `any` type in production code | Use proper type or `unknown` + type guard |
| Unused import left behind | Remove it or use it (Biome auto-fix handles this) |
| Object possibly undefined | Use optional chaining (`?.`) or early return guard |
| Type not assignable | Check type definitions and ensure compatibility |
| Mock not returning expected value | `vi.mocked(service.method).mockResolvedValue(expected)` |
| Skipping `check:ci` after `check:fix` | Always run both; `check:ci` catches non-auto-fixable issues |
| Forgetting E2E test for core changes | Run full E2E protocol above for any CLI command changes |

## Automated Checks

The project has Husky pre-push hooks (`.husky/pre-push`) that auto-generate schema documentation. These run automatically.

## References

- `scripts/validate-all.sh` - One-command validation script
- `docs/TESTING_PROTOCOLS.md` - E2E testing details
- `biome.json` - Linting configuration

## Related Skills

- **Code standards**: See `reviewing-typescript-code` for quality criteria
- **CI integration**: See `managing-github-ci` for workflow troubleshooting
- **Test failures**: See `analyzing-test-coverage` for test debugging

## Quick Reference Rule

For a condensed quick reference, see `.claude/rules/deployment-safety.md` (always loaded - applies to all files).
