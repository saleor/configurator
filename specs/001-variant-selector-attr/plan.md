# Implementation Plan: Variant Selector Attribute Configuration

**Branch**: `001-variant-selector-attr` | **Date**: 2026-01-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-variant-selector-attr/spec.md`

## Summary

Add support for configuring the `variantSelection` boolean property on variant attributes within product types. This enables users to specify which variant attributes should be used for variant selection in storefronts (e.g., Size, Color dropdowns). The implementation extends the existing ProductType module to support this property across introspect, diff, and deploy operations.

## Technical Context

**Language/Version**: TypeScript 5.5.4, Node.js 20+
**Primary Dependencies**: gql.tada (GraphQL), Zod 4.0 (validation), urql (GraphQL client), Commander (CLI)
**Storage**: N/A (Saleor API is the source of truth)
**Testing**: Vitest with MSW for GraphQL mocking
**Target Platform**: CLI tool (cross-platform Node.js)
**Project Type**: Single CLI application
**Performance Goals**: N/A (batch operations, not latency-sensitive)
**Constraints**: Must maintain round-trip integrity (introspect → deploy shows no diff)
**Scale/Scope**: Feature extension to existing ProductType module

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution is a template without specific principles defined. Based on the project's CLAUDE.md and existing patterns:

| Principle | Status | Notes |
|-----------|--------|-------|
| Follow existing patterns | ✅ PASS | Extending existing ProductType module patterns |
| Type safety (no `any`) | ✅ PASS | Will use proper Zod schemas and TypeScript types |
| Functional patterns | ✅ PASS | Using map/filter, immutable patterns |
| Test coverage | ✅ PASS | Will add unit and integration tests |
| Pre-commit validation | ⏳ PENDING | Will run `pnpm check:fix && pnpm build && pnpm test` |

## Project Structure

### Documentation (this feature)

```text
specs/001-variant-selector-attr/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── graphql.md       # GraphQL schema changes
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── modules/
│   ├── config/
│   │   └── schema/
│   │       └── attribute.schema.ts    # Add variantSelection to schema
│   ├── product-type/
│   │   ├── product-type-service.ts    # Update attribute handling
│   │   └── repository.ts              # Update GraphQL mutations
│   └── attribute/                     # May need validation updates
├── core/
│   └── diff/
│       └── comparators/
│           └── product-type-comparator.ts  # Detect variantSelection changes

tests/
├── integration/
│   └── product-type/                  # End-to-end tests
└── unit/
    └── modules/
        └── product-type/              # Unit tests for service/repository
```

**Structure Decision**: This is a feature extension within the existing single CLI project structure. No new modules needed, only extending existing ProductType module.

## Complexity Tracking

> No violations identified. Feature follows existing patterns without introducing unnecessary complexity.

## Files to Modify

### Config Schema Layer
- `src/modules/config/schema/attribute.schema.ts` - Add `variantSelection` property

### Config Service Layer
- `src/modules/config/config-service.ts` - Extract variantSelection during introspection mapping

### GraphQL Layer
- `src/modules/config/repository.ts` - Add variantSelection to GetConfig query
- `src/modules/product-type/repository.ts` - Include variantSelection in mutation

### Service Layer
- `src/modules/product-type/product-type-service.ts` - Handle variantSelection in attribute flow, add validation

### Diff Layer
- `src/core/diff/comparators/product-type-comparator.ts` - Detect variantSelection changes

### Tests
- `src/modules/product-type/product-type-service.test.ts` - Unit tests
- `src/core/diff/comparators/attributes-comparator.test.ts` - Diff tests
- `src/modules/config/config-service.test.ts` - Config mapping tests
