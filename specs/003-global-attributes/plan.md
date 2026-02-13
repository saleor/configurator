# Implementation Plan: Global Attributes Section

**Branch**: `003-global-attributes` | **Date**: 2026-02-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-global-attributes/spec.md`

## Summary

Add separate `productAttributes` and `contentAttributes` top-level YAML sections to replace the current unified `attributes` section. This resolves attribute reference resolution failures during parallel chunk processing by ensuring all global attributes are created before any entity that references them. The solution implements hard migration (no backward compatibility with inline definitions) with clear validation error messages guiding users to the new format.

## Technical Context

**Language/Version**: TypeScript 5.5.4 (Node.js >=20.0.0)
**Primary Dependencies**: Commander.js 14, Zod 4, urql, gql.tada, chalk, ora, yaml
**Storage**: YAML configuration files
**Testing**: Vitest, MSW for GraphQL mocks
**Target Platform**: Node.js CLI
**Project Type**: Single project (monorepo-ready)
**Performance Goals**: Deploy 100+ attributes across 50+ product types without resolution errors
**Constraints**: Deployment must complete in single pass; no retry loops for attribute resolution
**CLI Output**: All user-facing messages via cliConsole (warn/error/hint/box); no console.log
**Scale/Scope**: Typical configs have 10-50 attributes, 5-20 product types

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. TDD | ✅ Pass | Test files will be created for all new modules |
| II. Small Functions | ✅ Pass | Functions will be 10-50 lines; orchestration max 100 |
| III. Skill-First | ✅ Pass | Will invoke `designing-zod-schemas`, `reviewing-typescript-code`, `writing-graphql-operations` |
| IV. Serena Memory | ✅ Pass | Consulted `deployment_pipeline_architecture`, `saleor_api_patterns`, `project-architecture` |
| V. Template-Driven | ✅ Pass | Using speckit templates |
| VI. E2E Validation | ✅ Pass | Will test introspect→deploy→diff cycle |
| VII. Type-Safe Schema-First | ✅ Pass | Zod schemas define all types |
| VIII. Functional Patterns | ✅ Pass | Will use map/filter/flatMap |
| IX. Post-Implementation Review | ✅ Pass | Will run all pr-review-toolkit agents |

## Project Structure

### Documentation (this feature)

```text
specs/003-global-attributes/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── modules/
│   ├── attribute/
│   │   ├── attribute-cache.ts            # NEW: In-memory attribute cache for deployment
│   │   ├── attribute-cache.test.ts       # NEW
│   │   ├── attribute-service.ts          # MODIFY: Add cache population methods
│   │   ├── repository.ts                 # EXISTING (no changes needed)
│   │   └── errors.ts                     # MODIFY: Add validation errors
│   ├── config/
│   │   ├── schema/
│   │   │   ├── attribute.schema.ts       # MODIFY: Add productAttributes/contentAttributes schemas
│   │   │   ├── schema.ts                 # MODIFY: Update configSchema with new sections
│   │   │   └── global-attributes.schema.ts # NEW: Dedicated schema for global attribute sections
│   │   ├── config-service.ts             # MODIFY: Map to new structure during introspection
│   │   └── validation/
│   │       └── inline-attribute-validator.ts # NEW: Detect inline definitions, provide migration guidance
│   ├── product-type/
│   │   └── product-type-service.ts       # MODIFY: Use attribute cache for resolution
│   └── page-type/
│       └── page-type-service.ts          # MODIFY: Use attribute cache for content attribute resolution
├── core/
│   ├── deployment/
│   │   ├── stages.ts                     # MODIFY: Split attributesStage into two, add caching
│   │   ├── attribute-cache-context.ts    # NEW: Context for passing cache between stages
│   │   └── types.ts                      # MODIFY: Add cache to DeploymentContext
│   ├── diff/
│   │   └── comparators/
│   │       └── attribute-comparator.ts   # MODIFY: Handle two sections in diff output
│   └── validation/
│       └── preflight.ts                  # MODIFY: Add inline attribute detection
└── lib/
    └── errors/
        └── validation-errors.ts          # MODIFY: Add InlineAttributeError

tests/
├── unit/
│   ├── attribute-cache.test.ts
│   ├── global-attributes-schema.test.ts
│   └── inline-validator.test.ts
└── integration/
    ├── global-attributes-deploy.test.ts
    └── introspect-global-attributes.test.ts
```

**Structure Decision**: Single project structure, extending existing module pattern. New files follow established conventions (repository.ts, service.ts, *.test.ts).

## Complexity Tracking

No complexity violations. The design:
- Adds 2 new YAML sections (simple extension)
- Reuses existing attribute repository (no new API operations)
- Uses existing deployment stage pattern
- No new external dependencies
