# Tasks: Variant Selector Attribute Configuration

**Input**: Design documents from `/specs/001-variant-selector-attr/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/graphql.md ✓

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted per guidelines.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Project type**: Single CLI application (paths at repository root)
- **Source**: `src/`
- **Tests**: `tests/` (omitted - not explicitly requested)

---

## Phase 1: Setup (Schema Layer)

**Purpose**: Extend the config schema to support the `variantSelection` property

- [X] T001 [P] Add `variantSelection` boolean property to attribute schema in `src/modules/config/schema/attribute.schema.ts`
- [X] T002 [P] Add `VARIANT_SELECTION_SUPPORTED_TYPES` constant (`DROPDOWN`, `BOOLEAN`, `SWATCH`, `NUMERIC`) in `src/modules/config/schema/attribute.schema.ts`

---

## Phase 2: Foundational (GraphQL Layer)

**Purpose**: Update GraphQL queries and mutations to include `variantSelection` field

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete

- [X] T003 Add `variantSelection` field to `assignedVariantAttributes` selection in GetConfig query in `src/modules/config/repository.ts`
- [X] T004 Run `pnpm fetch-schema` to regenerate gql.tada types after query modification

**Checkpoint**: GraphQL layer ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Configure Variant Selection Attributes (Priority: P1) 🎯 MVP

**Goal**: Enable users to specify which variant attributes should be used for variant selection in storefronts via YAML config and deploy

**Independent Test**: Create a config.yml with a product type that has variant attributes marked with `variantSelection: true`, deploy it, and verify the attribute assignment has `variantSelection: true` in the Saleor instance

### Implementation for User Story 1

- [X] T005 [US1] Add validation for `variantSelection` on unsupported input types in `src/modules/product-type/product-type-service.ts`
- [X] T006 [US1] Update attribute assignment mapping to include `variantSelection` in assign mutation input in `src/modules/product-type/repository.ts`
- [X] T007 [US1] Add `productAttributeAssignmentUpdate` mutation for updating existing attribute assignments in `src/modules/product-type/repository.ts`
- [X] T008 [US1] Implement logic to detect when `variantSelection` changes on existing assignments and call update mutation in `src/modules/product-type/product-type-service.ts`
- [X] T009 [US1] Handle referenced attributes (by slug) with `variantSelection` property in `src/modules/product-type/product-type-service.ts`

**Checkpoint**: User Story 1 complete - users can configure and deploy variant selection attributes

---

## Phase 4: User Story 2 - Introspect Variant Selection Configuration (Priority: P2)

**Goal**: Enable users to see which variant attributes are currently configured for variant selection when running `introspect`

**Independent Test**: Manually configure variant selection in Saleor Dashboard, run `introspect`, verify output YAML includes `variantSelection: true` for appropriate attributes

### Implementation for User Story 2

- [X] T010 [US2] Update `mapProductTypes()` to extract `variantSelection` from `assignedVariantAttributes` and merge into attribute objects in `src/modules/config/config-service.ts`
- [X] T011 [US2] Implement conditional output of `variantSelection` (only when `true`, omit when `false`) in `src/modules/config/config-service.ts`

**Checkpoint**: User Story 2 complete - introspect now shows variant selection configuration

---

## Phase 5: User Story 3 - Diff Variant Selection Changes (Priority: P2)

**Goal**: Show variant selection changes in `diff` output when comparing local vs remote configurations

**Independent Test**: Create a local config that differs from remote in `variantSelection` values, run `diff`, verify output shows the changes

### Implementation for User Story 3

- [X] T012 [US3] Extend `compareAttributes()` to detect `variantSelection` property changes in `src/core/diff/comparators/product-type-comparator.ts`
- [X] T013 [US3] Add diff output formatting for variant selection changes (show field change with current/desired values) in `src/core/diff/comparators/product-type-comparator.ts`

**Checkpoint**: User Story 3 complete - diff shows variant selection changes

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and edge case handling

- [X] T014 [P] Add handling to silently ignore `variantSelection` on product-level attributes in `src/modules/product-type/product-type-service.ts`
- [X] T015 Run quickstart.md validation scenarios
- [X] T016 Run E2E test workflow: `introspect → deploy → deploy (idempotent) → introspect → diff (no changes)`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion, can run in parallel with US1
- **User Story 3 (Phase 5)**: Depends on Foundational phase completion, can run in parallel with US1/US2
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependencies on US1
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - No dependencies on US1/US2

### Within Each User Story

- Schema changes before service logic
- Repository changes before service integration
- Core implementation before edge case handling

### Parallel Opportunities

**Phase 1 (all [P] marked):**
```bash
# Both schema tasks can run in parallel:
Task: T001 - Add variantSelection property to schema
Task: T002 - Add VARIANT_SELECTION_SUPPORTED_TYPES constant
```

**After Foundational (Phase 2) completes:**
```bash
# All three user stories can start in parallel:
# Developer A: User Story 1 (T005-T009)
# Developer B: User Story 2 (T010-T011)
# Developer C: User Story 3 (T012-T013)
```

**Phase 6 (Polish):**
```bash
# T014 can run in parallel with T015:
Task: T014 - Add handling for variantSelection on product-level attributes
Task: T015 - Run quickstart.md validation scenarios
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (schema layer)
2. Complete Phase 2: Foundational (GraphQL layer)
3. Complete Phase 3: User Story 1 (deploy capability)
4. **STOP and VALIDATE**: Test deploy with `variantSelection: true` on supported input types
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Schema and GraphQL ready
2. Add User Story 1 → Test deploy capability → **MVP Complete!**
3. Add User Story 2 → Test introspect capability → Now have full round-trip
4. Add User Story 3 → Test diff capability → Complete feature
5. Polish phase → Edge cases and validation

### Suggested MVP Scope

**MVP = Phase 1 + Phase 2 + Phase 3 (User Story 1)**

This delivers the core value: users can configure variant selection attributes in YAML and deploy them to Saleor. Introspect and diff can be added incrementally.

---

## Files Modified Summary

| File | Tasks | Purpose |
|------|-------|---------|
| `src/modules/config/schema/attribute.schema.ts` | T001, T002 | Schema extension |
| `src/modules/config/repository.ts` | T003 | GraphQL query update |
| `src/modules/config/config-service.ts` | T010, T011 | Introspect mapping |
| `src/modules/product-type/repository.ts` | T006, T007 | Mutation updates |
| `src/modules/product-type/product-type-service.ts` | T005, T008, T009, T014 | Service logic |
| `src/core/diff/comparators/product-type-comparator.ts` | T012, T013 | Diff detection |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Tests not included per specification (can be added via separate request)
