# Implementation Plan: Media Handling for Cross-Environment Product Sync

**Branch**: `001-media-handling` | **Date**: 2026-01-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-media-handling/spec.md`

## Summary

Implement a `--skip-media` flag for the `deploy` and `diff` commands that prevents media-related fields from being processed during cross-environment synchronization. This enables users to safely sync product configurations between staging and production environments without media URLs causing failures or pointing to wrong environments.

**Technical Approach**: Add an opt-in `--skip-media` flag that:
1. Excludes media fields from diff comparison in comparators
2. Skips media sync operations in the product service bootstrap
3. Displays clear CLI output indicating media handling was skipped
4. Warns users when cross-environment media URLs are detected (without `--skip-media`)

## Technical Context

**Language/Version**: TypeScript 5.5.4 (Node.js ≥20.0.0)
**Primary Dependencies**: Commander.js 14, Zod 4, urql, gql.tada, chalk, ora
**Storage**: YAML config file (local), Saleor GraphQL API (remote)
**Testing**: Vitest, MSW for GraphQL mocking
**Target Platform**: CLI tool (cross-platform Node.js)
**Project Type**: Single CLI project
**Performance Goals**: No significant overhead vs. deployment without media
**Constraints**: Maintain idempotent behavior, backward compatible (opt-in flag)
**Scale/Scope**: Affects products, categories, and collections entity types (all entities with media references)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Per `.specify/memory/constitution.md` v1.2.0:

| Principle | Status | Compliance Notes |
|-----------|--------|------------------|
| I. TDD | ✅ PASS | Test tasks precede implementation in each phase |
| II. Small Functions | ✅ PASS | Changes are small, focused additions (10-50 lines) |
| III. Skill-First | ✅ PASS | Will invoke `reviewing-typescript-code`, `designing-zod-schemas`, `implementing-cli-patterns` |
| IV. Serena Memory | ✅ PASS | Will consult `diff_engine_architecture`, `deployment_pipeline_architecture` |
| V. Template-Driven | ✅ PASS | spec.md, plan.md, tasks.md all complete |
| VI. E2E Validation | ✅ PASS | E2E tasks T036-T038 validate introspect→deploy→diff cycle |
| VII. Schema-First | ✅ PASS | Zod schemas for DiffOptions, ComparatorOptions before type inference |
| VIII. Functional Patterns | ✅ PASS | Will use map/filter for media field exclusion |
| IX. Post-Implementation Review | ✅ PASS | Phase 7b: Parallel agent review (T039-T046) + findings checklist |

## Project Structure

### Documentation (this feature)

```text
specs/001-media-handling/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (CLI interface contract)
└── tasks.md             # Phase 2 output (not created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── cli/
│   └── command.ts           # baseCommandArgsSchema - add skipMedia flag
├── commands/
│   ├── deploy.ts            # deployCommandSchema - add skipMedia flag, pass to context
│   └── diff.ts              # diffCommandSchema - add skipMedia flag, pass to configurator
├── core/
│   ├── configurator.ts      # Pass skipMedia through diff options
│   ├── deployment/
│   │   └── types.ts         # DeploymentContext - add skipMedia field
│   └── diff/
│       ├── service.ts       # DiffService - pass skipMedia to comparators
│       ├── types.ts         # DiffOptions - add skipMedia field
│       └── comparators/
│           ├── product-comparator.ts     # Skip media comparison when flag set
│           ├── category-comparator.ts    # Skip media comparison when flag set
│           └── collection-comparator.ts  # Skip media comparison when flag set
└── modules/
    ├── product/
    │   └── product-service.ts    # Skip media sync in bootstrap when flag set
    ├── category/
    │   └── category-service.ts   # Skip media sync in bootstrap when flag set
    └── collection/
        └── collection-service.ts # Skip media sync in bootstrap when flag set

tests/
├── unit/
│   └── core/diff/comparators/
│       └── product-comparator.test.ts  # Test skipMedia flag behavior
└── integration/
    └── commands/
        ├── deploy-skip-media.test.ts   # E2E test for deploy --skip-media
        └── diff-skip-media.test.ts     # E2E test for diff --skip-media
```

**Structure Decision**: Single project structure maintained. Changes are surgical additions to existing files following established patterns.

## Complexity Tracking

No violations detected. All changes are:
- Small, focused additions to existing modules
- Following existing patterns (command schema extension, service flag passing)
- Backward compatible (opt-in behavior)

