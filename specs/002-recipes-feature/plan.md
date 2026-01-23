# Implementation Plan: Recipes Feature

**Branch**: `002-recipes-feature` | **Date**: 2026-01-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-recipes-feature/spec.md`

## Summary

The Recipes feature provides pre-built YAML configuration templates for common Saleor e-commerce patterns. Templates are bundled in the npm package and accessed via a new `recipe` subcommand (`list`, `show`, `apply`, `export`). The feature reuses existing deploy infrastructure for applying recipes and leverages the established command pattern with Zod validation.

## Technical Context

**Language/Version**: TypeScript 5.5.4 (Node.js >=20.0.0)
**Primary Dependencies**: Commander.js 14, Zod 4, urql, gql.tada, chalk, ora, yaml
**Storage**: YAML files bundled in `dist/recipes/` at build time, resolved via package path resolution
**Testing**: Vitest with MSW for GraphQL mocking
**Target Platform**: Node.js CLI (cross-platform)
**Project Type**: Single project CLI tool
**Performance Goals**: Recipe list <100ms, recipe show <200ms, recipe apply same as deploy
**Constraints**: No external network calls for recipe discovery (bundled), backward compatible CLI
**Scale/Scope**: 4 initial recipes, extensible to unlimited
**Function Size**: Target 20-30 lines per function; maximum 50 lines for complex orchestration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Verification

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Test-Driven Development | PLANNED | Will write tests before implementation |
| II. Small Functions & Legibility | PLANNED | Target 20-30 lines per function; max 50 lines |
| III. Skill-First Development | PENDING | Will invoke: `implementing-cli-patterns`, `designing-zod-schemas`, `analyzing-test-coverage` |
| IV. Serena Memory Integration | DONE | Read `project-architecture`, `codebase_architecture_map`, `development-patterns` |
| V. Template-Driven Enhancement | DONE | Using SpecKit workflow (spec.md, plan.md, research.md, tasks.md) |
| VI. End-to-End Validation | PLANNED | Will test recipe apply → deploy → diff cycle |
| VII. Type-Safe Schema-First Design | PLANNED | Define Zod schemas first, infer types |
| VIII. Functional Code Patterns | PLANNED | Use map/filter/flatMap patterns |
| IX. Post-Implementation Review | PLANNED | Will run PR review toolkit agents |

### Quality Gates

| Gate | Status |
|------|--------|
| Pre-Commit Checklist | Pending implementation |
| Pre-Push Checklist | Pending implementation |
| Post-Implementation Review | Pending implementation |

## Project Structure

### Documentation (this feature)

```text
specs/002-recipes-feature/
├── plan.md              # This file
├── research.md          # Phase 0 output - recipe format research
├── data-model.md        # Phase 1 output - Recipe entity model
├── quickstart.md        # Phase 1 output - Getting started guide
├── contracts/           # Phase 1 output
│   └── cli-interface.md # CLI command specifications
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── cli/
│   └── main.ts                     # Add recipe command registration
├── commands/
│   ├── index.ts                    # Export recipeCommandConfig
│   └── recipe.ts                   # NEW: Recipe command handler
├── modules/
│   └── recipe/                     # NEW: Recipe module
│       ├── recipe-service.ts       # Recipe business logic
│       ├── recipe-repository.ts    # Recipe file access
│       ├── recipe-loader.ts        # Package path resolution
│       ├── schema.ts               # Zod schemas for recipes
│       └── errors.ts               # Recipe-specific errors
└── recipes/                        # NEW: Recipe YAML files (bundled)
    ├── manifest.json               # Recipe metadata index
    ├── multi-region.yml            # Multi-region recipe
    ├── digital-products.yml        # Digital products recipe
    ├── click-and-collect.yml       # Click and collect recipe
    └── custom-shipping.yml         # Custom shipping recipe

tests/
├── unit/
│   └── modules/recipe/             # Unit tests
└── integration/
    └── commands/recipe.test.ts     # Integration tests
```

**Structure Decision**: Follows the existing single-project CLI pattern with a new `recipe` module in `src/modules/` and recipe YAML files in `src/recipes/` that get bundled to `dist/recipes/` at build time.

## Complexity Tracking

No constitution violations anticipated. The feature:
- Uses existing command pattern (no new abstractions)
- Reuses deploy infrastructure (no new deployment logic)
- Adds one new module with standard 4-file structure
- No external dependencies beyond what's already used

## Architecture Decisions

### Recipe Storage Strategy

Recipes are stored as YAML files in `src/recipes/` and bundled into the npm package at `dist/recipes/`. At runtime, the recipe loader resolves the path using `import.meta.url` to find the package root.

```typescript
// Recipe loader pattern
const getRecipesDir = (): string => {
  const packageRoot = fileURLToPath(new URL('..', import.meta.url));
  return path.join(packageRoot, 'recipes');
};
```

### Recipe YAML Format

Recipes use the same YAML schema as `config.yml` but are partial configurations. A recipe includes:
1. YAML frontmatter with metadata
2. Subset of config.yml entity sections

```yaml
# Recipe metadata (parsed as YAML document separator)
---
name: multi-region
description: Configure channels for US, EU, and UK markets
category: multi-region
version: "1.0.0"
saleorVersion: ">=3.15"
docsUrl: https://docs.saleor.io/docs/channels
useCase: |
  Set up a global e-commerce presence with separate channels
  for different regions, each with appropriate currency and locale.
prerequisites:
  - Saleor instance with multi-channel license
  - Tax configuration for target regions
customizationHints:
  - Modify currency codes for your target markets
  - Adjust country codes as needed
entitySummary:
  channels: 3
  warehouses: 3
  shippingZones: 3
---
# Configuration content
channels:
  - name: United States
    slug: us-channel
    currencyCode: USD
    defaultCountry: US
    # ... rest of channel config
```

### Subcommand Pattern

The `recipe` command uses Commander.js subcommand pattern:

```
configurator recipe list [--category <cat>] [--json]
configurator recipe show <name> [--json]
configurator recipe apply <name> --url <url> --token <token> [--config <path>]
configurator recipe export <name> [--output <path>]
```

### Reusing Deploy Infrastructure

Recipe `apply` reuses the existing deployment pipeline:
1. Load recipe YAML
2. Merge with existing config (if present) or use as-is
3. Call existing deploy handler

This ensures recipes follow the same validation, ordering, and error handling as regular deployments.

## Phase 0: Research Items

Based on Technical Context analysis:

| Unknown | Research Task |
|---------|---------------|
| Package bundling | How to bundle YAML files in npm package and resolve at runtime |
| Recipe format | Best practices for recipe metadata + partial config format |
| Subcommand pattern | Commander.js subcommand implementation patterns |
| Conflict resolution | Strategy for recipe vs existing config conflicts |

## Phase 1: Design Deliverables

| Artifact | Description | Status |
|----------|-------------|--------|
| `research.md` | Package bundling and recipe format research findings | COMPLETE |
| `data-model.md` | Recipe, RecipeMetadata, RecipeCategory entities | COMPLETE |
| `contracts/cli-interface.md` | CLI command specifications with examples | COMPLETE |
| `quickstart.md` | Getting started guide for recipe users | COMPLETE |

## Post-Design Constitution Check

*Re-evaluated after Phase 1 design completion.*

### Post-Phase 1 Verification

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Test-Driven Development | READY | Test patterns defined in data-model.md; will write tests first |
| II. Small Functions & Legibility | VERIFIED | Target 20-30 lines per function; max 50 lines |
| III. Skill-First Development | READY | Skills identified: `implementing-cli-patterns`, `designing-zod-schemas`, `analyzing-test-coverage` |
| IV. Serena Memory Integration | DONE | Consulted `project-architecture`, `codebase_architecture_map`, `development-patterns` |
| V. Template-Driven Enhancement | DONE | All Phase 0/1 artifacts complete |
| VI. End-to-End Validation | READY | E2E test plan: recipe apply → verify entities created → recipe apply again (idempotent) |
| VII. Type-Safe Schema-First Design | VERIFIED | All types defined in data-model.md use Zod schemas with `z.infer` |
| VIII. Functional Code Patterns | VERIFIED | Design uses map/filter for recipe listing and entity processing |
| IX. Post-Implementation Review | READY | Will run PR review toolkit agents after implementation |

### Design Quality Assessment

| Criterion | Assessment |
|-----------|------------|
| Complexity | LOW - Reuses existing patterns (command, service, repository) |
| New Dependencies | NONE - Uses existing yaml, zod, commander, chalk, ora |
| Breaking Changes | NONE - Adds new command, doesn't modify existing behavior |
| Test Strategy | CLEAR - Unit tests for service/repository, integration for CLI |
| Documentation | COMPLETE - Quickstart, CLI contract, data model all defined |

### Gate Status: PASS

All constitution principles are addressed. The design:
1. Uses established codebase patterns
2. Has complete type definitions via Zod schemas
3. Has clear test strategy
4. Has comprehensive CLI contract
5. Introduces no new complexity or dependencies

**Ready for Phase 2: Task Generation** (`/speckit.tasks`)
