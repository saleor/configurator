# Saleor Configurator - Claude Code Guide

Declarative "commerce as code" CLI for Saleor e-commerce. Define your store configuration in YAML, sync with your Saleor instance.

## Quick Reference

### Essential Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev <cmd>` | Run CLI in development (introspect, deploy, diff, start) |
| `pnpm build` | Compile TypeScript |
| `pnpm test` | Run test suite |
| `pnpm check:fix` | Auto-fix lint and formatting |
| `pnpm check:ci` | CI validation mode |

### Running CLI Commands (Important)

**Always use `--ci` when running deploy, introspect, or recipe commands.** These commands use interactive prompts (confirmations) that block non-interactive execution. `--ci` skips all prompts.

```bash
# Credentials come from .env.local (see .env.example for template)
# source .env.local or set SALEOR_URL and SALEOR_TOKEN

# Deploy (always --ci)
pnpm dev deploy --url=$SALEOR_URL --token=$SALEOR_TOKEN --ci

# Introspect (always --ci)
pnpm dev introspect --url=$SALEOR_URL --token=$SALEOR_TOKEN --ci

# Diff (no --ci needed, read-only with no prompts)
pnpm dev diff --url=$SALEOR_URL --token=$SALEOR_TOKEN
```

**Outputs to check after deploy:**
- **Console**: Deployment summary box with timing, changes, and resilience stats
- **Report**: Auto-saved as `deployment-report-YYYY-MM-DD_HH-MM-SS.json` in CWD (or `--report-path=custom.json`)
- **Logs**: Set `LOG_LEVEL=debug` for verbose logging (default: `info`)

**Governor tuning (env vars):**
- `GRAPHQL_GOVERNOR_ENABLED=true|false` — enable/disable request governor
- `GRAPHQL_MAX_CONCURRENCY=4` — max concurrent GraphQL requests
- `GRAPHQL_INTERVAL_CAP=20` — max requests per interval
- `GRAPHQL_INTERVAL_MS=1000` — interval window in ms

### Entity Identification

| Entity Type | Identifier | Examples |
|-------------|------------|----------|
| Slug-based | `slug` | Categories, Products, Channels, Collections, Menus, Warehouses |
| Name-based | `name` | ProductTypes, PageTypes, Attributes, TaxClasses, ShippingZones |
| Singleton | N/A | Shop settings |

## Skills

Skills provide domain-specific guidance. When your task matches a skill's domain, invoke it for comprehensive patterns.

| Domain | Skill | Invoke When |
|--------|-------|-------------|
| Code Quality | `reviewing-typescript-code` | Writing/modifying TypeScript code |
| Testing | `analyzing-test-coverage` | Writing tests, Vitest, MSW mocks |
| GraphQL | `writing-graphql-operations` | Creating GraphQL queries/mutations |
| CLI | `implementing-cli-patterns` | Working on CLI output, spinners, prompts |
| Entities | `adding-entity-types` | Implementing new Saleor entity support |
| Domain | `understanding-saleor-domain` | Working with entity rules, config schema |
| Schemas | `designing-zod-schemas` | Creating validation schemas |
| Validation | `validating-pre-commit` | Preparing to commit or push |
| Releases | `creating-changesets` | Preparing version bumps, changelogs |
| CI/CD | `managing-github-ci` | Working on GitHub Actions workflows |

## Code Quality Standards

### Function Design
- Ideal: 10-50 lines
- Maximum: ~100 lines for complex logic
- Single responsibility per function

### Type Safety
- No `any` except in test mocks (Biome enforced)
- Use branded types for domain values
- Prefer discriminated unions over inheritance

### Style
- Functional patterns: `map`/`filter`/`flatMap` over loops
- Extend `BaseError` for custom errors
- Use `ServiceErrorWrapper` for error handling

## Pre-Commit Checklist

Run in order before pushing:

```bash
pnpm check:fix && pnpm build && pnpm test && pnpm check:ci
```

## E2E Testing (Core Changes)

```bash
# Credentials from .env.local (see .env.example for template)
# source .env.local

# Validation workflow (always use --ci to skip interactive prompts)
rm -rf config.yml
pnpm dev introspect --url=$SALEOR_URL --token=$SALEOR_TOKEN --ci
# Make test changes to config.yml
pnpm dev deploy --url=$SALEOR_URL --token=$SALEOR_TOKEN --ci
pnpm dev deploy --url=$SALEOR_URL --token=$SALEOR_TOKEN --ci  # Should show no changes (idempotent)
rm config.yml
pnpm dev introspect --url=$SALEOR_URL --token=$SALEOR_TOKEN --ci
pnpm dev diff --url=$SALEOR_URL --token=$SALEOR_TOKEN    # Should show no diff
```

## Documentation

| Need | Location |
|------|----------|
| Architecture | `docs/ARCHITECTURE.md` |
| Code Quality | `docs/CODE_QUALITY.md` |
| Testing | `docs/TESTING_PROTOCOLS.md` |
| Commands | `docs/COMMANDS.md` |
| Entities | `docs/ENTITY_REFERENCE.md` |
| Troubleshooting | `docs/TROUBLESHOOTING.md` |

## Rules

Path-targeted rules in `.claude/rules/` provide contextual guidance when editing specific file types:

| Rule | Applies To |
|------|------------|
| `code-quality.md` | `src/**/*.ts` |
| `graphql-patterns.md` | GraphQL operations, repositories |
| `testing-standards.md` | `*.test.ts` files |
| `entity-development.md` | Entity modules |
| `cli-development.md` | CLI and command files |
| `config-schema.md` | Config and schema files |
| `diff-engine.md` | Diff comparators and formatters |
| `deployment-safety.md` | Always (quality gates) |

## Principles

1. **Read before writing** - Explore with skills and rules before implementing
2. **Small iterations** - Small functions, frequent validation
3. **Lint always** - Run `pnpm check:fix` after changes
4. **Skills first** - Invoke relevant skill before starting work
5. **Test early** - Write tests alongside implementation
