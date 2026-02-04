# Tasks: Global Attributes Section

**Input**: Design documents from `/specs/003-global-attributes/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: Tests included per plan.md (TDD approach with Vitest, MSW).

**Organization**: Tasks organized by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, schema foundations, and error infrastructure

- [X] T001 [P] Create global-attributes.schema.ts with productAttributeSchema and contentAttributeSchema discriminated unions in src/modules/config/schema/global-attributes.schema.ts
- [X] T002 [P] Create AttributeCache class implementing IAttributeCache interface (per contracts/attribute-cache.ts) in src/modules/attribute/attribute-cache.ts
- [X] T003 [P] Add validation error types (InlineAttributeError, AttributeNotFoundError, WrongAttributeTypeError, DuplicateAttributeError) per contracts/validation-errors.ts in src/lib/errors/validation-errors.ts
- [X] T004 Add AttributeCache to DeploymentContext type in src/core/deployment/types.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 [P] Write unit tests for AttributeCache (populate, lookup, findAttributeInWrongSection, getStats, clear) in src/modules/attribute/attribute-cache.test.ts
- [X] T006 [P] Write unit tests for global-attributes.schema.ts (discriminated unions per inputType, validation rules for dropdown values) in src/modules/config/schema/global-attributes.schema.test.ts
- [X] T007 Update configSchema to add productAttributes and contentAttributes sections in src/modules/config/schema/schema.ts
- [X] T008 Create inline-attribute-validator.ts with isAttributeReference and isInlineAttributeDefinition type guards in src/modules/config/validation/inline-attribute-validator.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Deploy Configuration with Shared Product Attributes (Priority: P1) 🎯 MVP

**Goal**: Enable deployment of YAML configurations with global `productAttributes` section, creating all product attributes before productTypes are processed

**Independent Test**: Deploy a YAML config with `productAttributes` section and multiple product types referencing those attributes; verify all attributes are created before product type processing with AttributeCache

### Tests for User Story 1

- [ ] T009 [P] [US1] Write integration test for productAttributes deployment flow (create, cache, reference resolution) in tests/integration/global-attributes-deploy.test.ts

### Implementation for User Story 1

- [X] T010 [US1] Modify attributesStage to process productAttributes section (PRODUCT_TYPE) before productTypesStage in src/core/deployment/stages.ts
- [X] T011 [US1] Add cache population in attributesStage after productAttributes creation in src/core/deployment/stages.ts
- [X] T012 [US1] Modify ProductTypeService.getExistingAttributesToAssign() to use AttributeCache lookup instead of API query in src/modules/product-type/product-type-service.ts
- [X] T013 [US1] Add fallback to API query if attribute not in cache (for existing attributes not in config) in src/modules/product-type/product-type-service.ts

**Checkpoint**: User Story 1 complete - productAttributes deployment works independently

---

## Phase 4: User Story 2 - Deploy Configuration with Content Attributes for Models (Priority: P1)

**Goal**: Enable deployment of YAML configurations with global `contentAttributes` section for PAGE_TYPE attributes used by modelTypes

**Independent Test**: Deploy a YAML config with `contentAttributes` section and modelTypes referencing those attributes; verify content attributes created before model type processing

### Tests for User Story 2

- [ ] T014 [P] [US2] Add integration test for contentAttributes deployment flow (PAGE_TYPE) in tests/integration/global-attributes-deploy.test.ts

### Implementation for User Story 2

- [X] T015 [US2] Extend attributesStage to process contentAttributes section (PAGE_TYPE) after productAttributes in src/core/deployment/stages.ts
- [X] T016 [US2] Add cache population for contentAttributes in attributesStage in src/core/deployment/stages.ts
- [X] T017 [US2] Modify PageTypeService to use AttributeCache for content attribute resolution in src/modules/page-type/page-type-service.ts

**Checkpoint**: User Story 2 complete - contentAttributes deployment works independently

---

## Phase 5: User Story 3 - Introspect Existing Attributes to Separate Sections (Priority: P1)

**Goal**: Modify `introspect` command to extract PRODUCT_TYPE attributes into `productAttributes` and PAGE_TYPE attributes into `contentAttributes` sections

**Independent Test**: Run `introspect` on a Saleor instance with both PRODUCT_TYPE and PAGE_TYPE attributes; verify output YAML contains both sections correctly populated without `type` field

### Tests for User Story 3

- [ ] T018 [P] [US3] Write integration test for introspect producing separate attribute sections in tests/integration/introspect-global-attributes.test.ts

### Implementation for User Story 3

- [X] T019 [US3] Modify ConfigService.mapAllAttributes to split by type into productAttributes array in src/modules/config/config-service.ts
- [X] T020 [US3] Add contentAttributes array population in ConfigService.mapAllAttributes in src/modules/config/config-service.ts
- [X] T021 [US3] Remove `type` field from introspected attribute output (section implies PRODUCT_TYPE or PAGE_TYPE) in src/modules/config/config-service.ts
- [X] T022 [US3] Ensure dropdown/multiselect/swatch attribute values are preserved during introspection in src/modules/config/config-service.ts
- [X] T022a [US3] Implement attribute deduplication by name in ConfigService.mapAllAttributes (FR-011) in src/modules/config/config-service.ts

**Checkpoint**: User Story 3 complete - introspect generates correct global attribute structure

---

## Phase 6: User Story 6 - Migration from Inline to Global Format (Priority: P1)

**Goal**: Reject inline attribute definitions in productTypes/modelTypes with clear migration instructions

**Independent Test**: Run deploy on a YAML with inline attribute definitions; verify validation fails with actionable error message including migration instructions

### Tests for User Story 6

- [X] T023 [P] [US6] Write unit tests for inline attribute detection (isAttributeReference, isInlineAttributeDefinition) in tests/unit/inline-validator.test.ts

### Implementation for User Story 6

- [X] T024 [US6] Implement validateNoInlineDefinitions function in inline-attribute-validator.ts in src/modules/config/validation/inline-attribute-validator.ts
- [X] T025 [US6] Integrate inline validation into preflight.ts early in deployment pipeline in src/core/validation/preflight.ts
- [X] T026 [US6] Ensure InlineAttributeError.getSuggestions() returns migration guidance (introspect command, move to sections, use references) in src/lib/errors/validation-errors.ts
- [X] T026a [US6] Display validation errors using cliConsole.error() with suggestions via cliConsole.hint() and migration box via cliConsole.box() in src/core/validation/preflight.ts

**Checkpoint**: User Story 6 complete - inline definitions fail fast with helpful guidance

---

## Phase 7: User Story 4 - Validate Attribute References (Priority: P2)

**Goal**: Provide clear validation errors when YAML references non-existent attributes or wrong-type attributes

**Independent Test**: Create YAML configs with invalid attribute references (typos, wrong type); verify error messages are actionable with "did you mean" suggestions

### Tests for User Story 4

- [X] T027 [P] [US4] Write unit tests for attribute reference validation errors (not found, wrong type, similar names) in tests/unit/attribute-reference-validation.test.ts

### Implementation for User Story 4

- [X] T028 [US4] Implement validateAttributeReference helper using AttributeCache with detailed error reporting in src/modules/attribute/attribute-service.ts
- [X] T029 [US4] Add Levenshtein distance calculation for similar name suggestions in src/lib/errors/validation-errors.ts
- [X] T030 [US4] Wire up WrongAttributeTypeError when attribute found in wrong section (contentAttributes vs productAttributes) in src/modules/product-type/product-type-service.ts
- [X] T031 [US4] Wire up AttributeNotFoundError with similar name suggestions when attribute not in cache or API in src/modules/product-type/product-type-service.ts
- [X] T031a [US4] Display attribute validation errors using cliConsole.warn() for warnings and cliConsole.error() with cliConsole.hint() for suggestions in src/modules/attribute/attribute-service.ts
- [X] T032 [US4] Apply same validation to PageTypeService for content attribute references in src/modules/page-type/page-type-service.ts

**Checkpoint**: User Story 4 complete - clear, actionable validation errors for all reference issues

---

## Phase 8: User Story 5 - Diff Shows Attribute Changes (Priority: P2)

**Goal**: Display attribute changes in `diff` output, grouped by "Product Attributes" and "Content Attributes"

**Independent Test**: Modify global attributes sections in YAML; run `diff` and verify changes display under correct headers

### Tests for User Story 5

- [X] T033 [P] [US5] Write unit test for diff output with productAttributes and contentAttributes sections in tests/unit/attribute-comparator.test.ts

### Implementation for User Story 5

- [X] T034 [US5] Add "Product Attributes" entity type to attribute-comparator.ts for productAttributes comparison in src/core/diff/comparators/attribute-comparator.ts
- [X] T035 [US5] Add "Content Attributes" entity type to attribute-comparator.ts for contentAttributes comparison in src/core/diff/comparators/attribute-comparator.ts
- [X] T036 [US5] Update diff formatter to display both sections with proper headers in src/core/diff/diff-formatter.ts

**Checkpoint**: User Story 5 complete - diff shows attribute changes grouped by type

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, cleanup, and final validation

- [X] T037 Add deprecation warning for unified `attributes` section in src/core/deployment/stages.ts (kept for backward compatibility)
- [X] T038 [P] Update any existing tests that reference old `attributes` section pattern (verified: no tests reference deprecated config.attributes)
- [ ] T039 [P] Run full E2E validation: rm config.yml → introspect → deploy → deploy (idempotent) → introspect → diff (no changes) (manual verification required)
- [X] T040 Update YAML examples in codebase to use new global attribute format (verified: recipes already don't use deprecated attributes section)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1, US2, US3, US6 are all P1 and can proceed in parallel
  - US4, US5 are P2 and can proceed after P1 stories or in parallel
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Deploy Product Attributes - No dependencies on other stories
- **User Story 2 (P1)**: Deploy Content Attributes - Builds on US1 patterns but independently testable
- **User Story 3 (P1)**: Introspect - No dependencies, can start after Foundational
- **User Story 6 (P1)**: Migration Validation - No dependencies, can start after Foundational
- **User Story 4 (P2)**: Reference Validation - Benefits from US1/US2 cache work but independently testable
- **User Story 5 (P2)**: Diff Display - No dependencies, can start after Foundational

### Within Each User Story

- Tests written first to understand expected behavior (TDD)
- Schema/type work before service work
- Service modifications before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Setup Phase (T001-T004):**
- T001, T002, T003 can run in parallel (different files)
- T004 can run in parallel with T001-T003

**Foundational Phase (T005-T008):**
- T005, T006 can run in parallel (different test files)
- T007, T008 can run after schemas exist

**User Stories (after Foundational):**
- US1, US2, US3, US6 can all be worked on in parallel by different developers
- US4, US5 can run in parallel after P1 stories

---

## Parallel Example: Setup Phase

```bash
# Launch all Setup tasks in parallel (different files):
Task: "T001 Create global-attributes.schema.ts in src/modules/config/schema/"
Task: "T002 Create AttributeCache class in src/modules/attribute/"
Task: "T003 Add validation error types in src/lib/errors/"
Task: "T004 Add AttributeCache to DeploymentContext in src/core/deployment/types.ts"
```

## Parallel Example: P1 User Stories

```bash
# After Foundational phase, launch all P1 stories in parallel:
Task: "US1 - T010-T013 attributesStage + ProductTypeService"
Task: "US2 - T015-T017 contentAttributes + PageTypeService"
Task: "US3 - T019-T022 introspect ConfigService"
Task: "US6 - T024-T026 inline validation"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T008)
3. Complete Phase 3: User Story 1 (T009-T013)
4. **STOP and VALIDATE**: Test productAttributes deployment independently
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. User Story 1 → Test → **MVP: Product attributes work!**
3. User Story 2 → Test → Content attributes work
4. User Story 3 → Test → Introspect generates correct format
5. User Story 6 → Test → Migration errors guide users
6. User Story 4 → Test → Clear validation errors
7. User Story 5 → Test → Diff shows attribute changes
8. Polish → Final E2E validation

### Parallel Team Strategy (4 developers)

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Deploy Product Attributes)
   - Developer B: User Story 2 (Deploy Content Attributes)
   - Developer C: User Story 3 (Introspect)
   - Developer D: User Story 6 (Migration Validation)
3. After P1 stories complete:
   - Developer A: User Story 4 (Reference Validation)
   - Developer B: User Story 5 (Diff Display)
   - Developer C+D: Polish phase

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests use Vitest + MSW per plan.md
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- E2E test: `--url=https://store-rzalldyg.saleor.cloud/graphql/ --token=YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs`
