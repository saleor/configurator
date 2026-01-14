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
# Test environment
--url=https://store-rzalldyg.saleor.cloud/graphql/
--token=YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs

# Validation workflow
rm -rf config.yml
pnpm dev introspect [credentials]
# Make test changes to config.yml
pnpm dev deploy [credentials]
pnpm dev deploy [credentials]  # Should show no changes (idempotent)
rm config.yml
pnpm dev introspect [credentials]
pnpm dev diff [credentials]    # Should show no diff
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
