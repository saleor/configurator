# Tasks: Media Handling for Cross-Environment Product Sync

**Input**: Design documents from `/specs/001-media-handling/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: Required per Constitution Principle I (TDD). Test tasks precede implementation tasks in each phase. Red-Green-Refactor cycle enforced.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Type definitions and schema extensions needed by all user stories

- [X] T001 [P] Add `DiffOptions` interface with `skipMedia` field in src/core/diff/types.ts
- [X] T002 [P] Add `ComparatorOptions` interface with `skipMedia` field in src/core/diff/comparators/types.ts (or inline)
- [X] T003 [P] Extend `DeploymentContext` interface with optional `skipMedia` field in src/core/deployment/types.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Command schema extensions and flag propagation that MUST be complete before user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Add `skipMedia` boolean field to `deployCommandSchema` in src/commands/deploy.ts
- [X] T005 [P] Add `skipMedia` boolean field to `diffCommandSchema` in src/commands/diff.ts
- [X] T006 Add `--skip-media` Commander.js option to deploy command in src/commands/deploy.ts
- [X] T007 Add `--skip-media` Commander.js option to diff command in src/commands/diff.ts
- [X] T008 Update `DiffService.compare()` method signature to accept optional `DiffOptions` parameter in src/core/diff/service.ts
- [X] T009 Pass `skipMedia` option from diff command to `DiffService.compare()` in src/commands/diff.ts
- [X] T010 Pass `skipMedia` option from deploy command through configurator to `DiffService` in src/commands/deploy.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Skip Media During Deployment (Priority: P1) 🎯 MVP

**Goal**: Enable users to skip media handling entirely during deployment so product data can sync without media URL failures

**Independent Test**: Run `pnpm dev deploy --skip-media` with a config containing product media URLs and verify media fields are ignored while other product data syncs correctly

### Tests for User Story 1 (TDD - Write FIRST, ensure they FAIL)

- [ ] T011a [P] [US1] Write failing test: ProductComparator skips media fields when skipMedia=true in tests/unit/core/diff/comparators/product-comparator.test.ts
- [ ] T011b [P] [US1] Write failing test: ProductComparator includes media fields when skipMedia=false (default) in tests/unit/core/diff/comparators/product-comparator.test.ts
- [ ] T012a [P] [US1] Write failing test: CategoryComparator skips backgroundImage when skipMedia=true in tests/unit/core/diff/comparators/category-comparator.test.ts
- [ ] T013a [P] [US1] Write failing test: CollectionComparator skips backgroundImage when skipMedia=true in tests/unit/core/diff/comparators/collection-comparator.test.ts
- [ ] T015a [P] [US1] Write failing test: bootstrapProduct does not call syncProductMedia when context.skipMedia=true in tests/unit/modules/product/product-service.test.ts
- [ ] T016a [P] [US1] Write failing test: bootstrapCategory does not sync backgroundImage when context.skipMedia=true in tests/unit/modules/category/category-service.test.ts
- [ ] T017a [P] [US1] Write failing test: bootstrapCollection does not sync backgroundImage when context.skipMedia=true in tests/unit/modules/collection/collection-service.test.ts

> **TDD Checkpoint**: All tests above MUST fail before proceeding to implementation tasks below

### Implementation for User Story 1

- [X] T011 [P] [US1] Update `ProductComparator.compare()` to accept `ComparatorOptions` parameter and skip media comparison when `skipMedia=true` in src/core/diff/comparators/product-comparator.ts
- [ ] T012 [P] [US1] Update `CategoryComparator.compare()` to accept `ComparatorOptions` parameter and skip media comparison when `skipMedia=true` in src/core/diff/comparators/category-comparator.ts
- [ ] T013 [P] [US1] Update `CollectionComparator.compare()` to accept `ComparatorOptions` parameter and skip media comparison when `skipMedia=true` in src/core/diff/comparators/collection-comparator.ts
- [X] T014 [US1] Pass `skipMedia` option from `DiffService` to all comparators (product, category, collection) in src/core/diff/service.ts
- [X] T015 [P] [US1] Update `bootstrapProduct()` to skip `syncProductMedia()` when `context.skipMedia=true` in src/modules/product/product-service.ts
- [ ] T016 [P] [US1] Update `bootstrapCategory()` to skip media sync when `context.skipMedia=true` in src/modules/category/category-service.ts
- [ ] T017 [P] [US1] Update `bootstrapCollection()` to skip media sync when `context.skipMedia=true` in src/modules/collection/collection-service.ts
- [X] T018 [US1] Populate `skipMedia` in `DeploymentContext` from command args in src/commands/deploy.ts
- [X] T019 [US1] Pass `DeploymentContext.skipMedia` to entity service bootstrap methods in src/core/deployment/

**Checkpoint**: At this point, `--skip-media` flag should prevent media comparison and media sync for all entity types (products, categories, collections)

---

## Phase 4: User Story 2 - Preserve Existing Media on Target (Priority: P2)

**Goal**: Ensure that when skip-media is enabled, existing media on target environment is preserved (not overwritten or cleared)

**Independent Test**: Deploy product config to an environment where the product already exists with different media, verify target's media remains unchanged

### Implementation for User Story 2

> **Note**: US2 is satisfied by US1 implementation - when media sync is skipped, no media mutations are sent. The tasks below are verification-only to confirm expected behavior.

- [ ] T020 [US2] Verify bootstrap methods do not modify existing entity media when skipping (no media mutation sent) - code review of T015-T017
- [ ] T021 [US2] Verify new entities created with skip-media have empty/omitted media fields (not source media) - code review of T015-T017

**Checkpoint**: Target environment media is never modified when `--skip-media` is used

---

## Phase 5: User Story 3 - Clear Media Handling Feedback (Priority: P3)

**Goal**: Provide clear CLI output about how media was handled during the operation

**Independent Test**: Run deploy with media-containing configs and verify output includes media handling information

### Tests for User Story 3 (TDD - Write FIRST, ensure they FAIL)

- [ ] T022a [P] [US3] Write failing test: deploy command outputs "Media handling: Skipped" when --skip-media is used in tests/unit/commands/deploy.test.ts
- [ ] T024a [P] [US3] Write failing test: deploy summary includes "Media skipped for N entities" in tests/unit/commands/deploy.test.ts
- [ ] T025a [P] [US3] Write failing test: JSON output includes mediaSkipped field when --json --skip-media used in tests/unit/commands/deploy.test.ts

> **TDD Checkpoint**: All tests above MUST fail before proceeding to implementation tasks below

### Implementation for User Story 3

- [X] T022 [P] [US3] Add "🎬 Media handling: Skipped (--skip-media enabled)" status message when flag is active in src/commands/deploy.ts
- [X] T023 [P] [US3] Add "🎬 Media handling: Skipped (--skip-media enabled)" status message when flag is active in src/commands/diff.ts
- [ ] T024 [US3] Add summary message "ℹ️  Media skipped for N entities" at end of deployment in src/commands/deploy.ts
- [ ] T025 [P] [US3] Add `mediaSkipped` field to JSON output when `--json --skip-media` is used in src/commands/deploy.ts
- [ ] T026 [P] [US3] Add `options.skipMedia` field to JSON output when `--json --skip-media` is used in src/commands/diff.ts

**Checkpoint**: Users can clearly see media was skipped and how many entities were affected

---

## Phase 6: Edge Cases & Cross-Environment Warning

**Purpose**: Handle edge cases and add the cross-environment detection warning (FR-009)

### Tests for Edge Cases (TDD - Write FIRST, ensure they FAIL)

- [ ] T027a [P] Write failing test: detectCrossEnvironmentMedia returns true when media URL host differs from target host in tests/unit/core/deployment/media-warning.test.ts
- [ ] T027b [P] Write failing test: detectCrossEnvironmentMedia returns false when media URL host matches target host in tests/unit/core/deployment/media-warning.test.ts
- [ ] T030a [P] Write failing test: DiffService reports "no changes" when only media differs and skipMedia=true in tests/unit/core/diff/service.test.ts

> **TDD Checkpoint**: All tests above MUST fail before proceeding to implementation tasks below

### Implementation for Edge Cases

- [ ] T027 Create `detectCrossEnvironmentMedia()` utility function in src/core/deployment/media-warning.ts (new file)
- [ ] T028 Implement URL host comparison logic to detect Saleor media from different environments in src/core/deployment/media-warning.ts
- [ ] T029 Add cross-environment warning in deploy command when `--skip-media` is NOT used and cross-env media detected in src/commands/deploy.ts
- [ ] T030 Ensure "no changes" is reported when config contains only media differences and `--skip-media` is used in src/core/diff/service.ts

---

## Phase 7: Polish & Validation

**Purpose**: Final validation and documentation

- [X] T031 Run `pnpm check:fix` to fix lint and formatting
- [X] T032 Run `pnpm build` to verify TypeScript compilation
- [X] T033 Run `pnpm test` to verify existing tests pass
- [X] T034 Run `npx tsc --noEmit` for strict type check
- [X] T035 Run `pnpm check:ci` for CI validation
- [ ] T036 Manual E2E test: `pnpm dev diff --skip-media` with test credentials
- [ ] T037 Manual E2E test: `pnpm dev deploy --skip-media --plan` with test credentials
- [ ] T038 Manual E2E test: Verify idempotent behavior (deploy twice, second shows no changes)

---

## Phase 7b: Post-Implementation Review (Constitution Principle IX)

**Purpose**: Mandatory multi-agent code review before PR creation

**⚠️ CRITICAL**: All agents MUST be launched in parallel (single message with multiple Task tool calls)

### Step 1: Build Verification (Sequential)

- [ ] T039 Verify `pnpm build` succeeds
- [ ] T040 Verify `pnpm test` passes (all tests green)
- [ ] T041 Verify `pnpm check:ci` passes

### Step 2: Parallel Agent Review (Launch ALL in single message)

- [ ] T042 [P] Run `pr-review-toolkit:code-reviewer` on all changed files
- [ ] T043 [P] Run `pr-review-toolkit:code-simplifier` on all changed files
- [ ] T044 [P] Run `pr-review-toolkit:pr-test-analyzer` on test files
- [ ] T045 [P] Run `code-quality-reviewer` for project standards adherence
- [ ] T046 [P] Run `pr-review-toolkit:silent-failure-hunter` (error handling modified)
- [ ] T047 [P] Run `pr-review-toolkit:type-design-analyzer` (new types: DiffOptions, ComparatorOptions)

### Step 3: Findings Consolidation

- [ ] T048 Consolidate all agent findings into Review Findings Checklist
- [ ] T049 Address all CRITICAL findings (must be 0 remaining)
- [ ] T050 Address all HIGH findings (must be 0 remaining or justified)
- [ ] T051 Include findings checklist in PR description

**Checkpoint**: Implementation is NOT complete until all review steps pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on User Story 1 (verification of US1 implementation)
- **User Story 3 (Phase 5)**: Depends on Foundational completion (independent of US1/US2 implementation)
- **Edge Cases (Phase 6)**: Depends on User Story 1 (cross-env warning relates to media handling)
- **Polish (Phase 7)**: Depends on all implementation phases
- **Post-Implementation Review (Phase 7b)**: Depends on Phase 7 completion - REQUIRED before PR

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Core implementation for all entity types
- **User Story 2 (P2)**: Depends on US1 - Verification only (no new implementation)
- **User Story 3 (P3)**: Can start after Foundational - Only adds CLI output, independent of US1/US2 internals

### Within Each User Story

- Command args must be defined before they can be used
- Types must exist before being referenced
- Service methods updated before command integration
- Core implementation before CLI output

### Parallel Opportunities

**Phase 1 (Setup)**: T001, T002, T003 can all run in parallel (different files)

**Phase 2 (Foundational)**: T004, T005 can run in parallel (different command files)

**Phase 3 (US1)**: T011, T012, T013 can run in parallel (different comparator files); T015, T016, T017 can run in parallel (different service files)

**Phase 5 (US3)**: T022, T023 can run in parallel (different command files); T025, T026 can run in parallel (different JSON outputs)

---

## Parallel Example: Phase 1 Setup

```bash
# Launch all type definitions together:
Task: "Add DiffOptions interface in src/core/diff/types.ts"
Task: "Add ComparatorOptions interface in src/core/diff/comparators/types.ts"
Task: "Extend DeploymentContext in src/core/deployment/types.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types)
2. Complete Phase 2: Foundational (schemas, flag propagation)
3. Complete Phase 3: User Story 1 (skip comparison + skip sync)
4. **STOP and VALIDATE**: Run `pnpm dev diff --skip-media` and verify media differences not shown
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready (flag exists, does nothing yet)
2. Add User Story 1 → Test `--skip-media` actually skips → MVP!
3. Add User Story 2 → Verify preservation behavior → Safer deployments
4. Add User Story 3 → Clear user feedback → Better UX
5. Add Edge Cases → Cross-env warning → Proactive guidance

### File Change Summary

| File | Changes |
|------|---------|
| `src/core/diff/types.ts` | Add `DiffOptions` interface |
| `src/core/diff/comparators/types.ts` | Add `ComparatorOptions` interface |
| `src/core/deployment/types.ts` | Extend `DeploymentContext` with `skipMedia` |
| `src/commands/deploy.ts` | Schema extension, flag, context, CLI output |
| `src/commands/diff.ts` | Schema extension, flag, CLI output |
| `src/core/diff/service.ts` | Accept options, pass to comparators |
| `src/core/diff/comparators/product-comparator.ts` | Skip media comparison conditionally |
| `src/core/diff/comparators/category-comparator.ts` | Skip media comparison conditionally |
| `src/core/diff/comparators/collection-comparator.ts` | Skip media comparison conditionally |
| `src/modules/product/product-service.ts` | Skip media sync conditionally |
| `src/modules/category/category-service.ts` | Skip media sync conditionally |
| `src/modules/collection/collection-service.ts` | Skip media sync conditionally |
| `src/core/deployment/media-warning.ts` | NEW: Cross-environment detection |

---

## Notes

- [P] tasks = different files, no dependencies (can run in parallel)
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Test credentials available in quickstart.md for E2E validation
- Total tasks: 64 (T001-T051 implementation/review + 13 test tasks: T011a-T017a, T022a-T025a, T027a-T030a)
- Test tasks use letter suffixes (e.g., T011a) to maintain traceability with implementation tasks
- Config file form for skipMedia deferred to future enhancement (FR-007)
