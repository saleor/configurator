# Tasks: Recipes Feature

**Input**: Design documents from `/specs/002-recipes-feature/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/cli-interface.md ✓, quickstart.md ✓

**Tests**: Included per Constitution Principle I (TDD). Test tasks follow each implementation phase.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Function Size**: Target 20-30 lines per function; maximum 50 lines for complex orchestration.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, build configuration, and recipe module structure

- [x] T001 Add `recipes` directory to `files` array in package.json
- [x] T002 Add `copy-recipes` script to package.json build process
- [x] T003 [P] Create src/recipes/ directory structure
- [x] T004 [P] Create src/modules/recipe/ directory structure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core recipe infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Zod Schemas (Schema-First Development)

- [x] T005 [P] Define recipeCategorySchema in src/modules/recipe/schema.ts
- [x] T006 [P] Define entitySummarySchema in src/modules/recipe/schema.ts
- [x] T007 Define recipeMetadataSchema in src/modules/recipe/schema.ts (depends on T005, T006)
- [x] T008 Define recipeManifestEntrySchema in src/modules/recipe/schema.ts (depends on T005, T006)
- [x] T009 Define recipeManifestSchema in src/modules/recipe/schema.ts (depends on T008)
- [x] T010 Define recipeSchema in src/modules/recipe/schema.ts (depends on T007)

### Error Classes

- [x] T011 Create RecipeNotFoundError class in src/modules/recipe/errors.ts
- [x] T012 [P] Create RecipeValidationError class in src/modules/recipe/errors.ts
- [x] T013 [P] Create RecipeLoadError class in src/modules/recipe/errors.ts
- [x] T014 [P] Create ManifestLoadError class in src/modules/recipe/errors.ts

### Core Infrastructure

- [x] T015 Implement getRecipesDir() function in src/modules/recipe/recipe-loader.ts (uses import.meta.url resolution)
- [x] T016 Implement loadManifest() function in src/modules/recipe/recipe-repository.ts (depends on T009, T015)
- [x] T017 Implement loadRecipe() function in src/modules/recipe/recipe-repository.ts (depends on T010, T015, parses multi-document YAML)
- [x] T017a Validate recipe config against configSchema in loadRecipe() (FR-006 explicit validation)
- [x] T018 Implement parseRecipeYaml() helper in src/modules/recipe/recipe-loader.ts (YAML multi-document parsing)

### Build Script

- [x] T019 Create scripts/generate-recipe-manifest.ts (reads src/recipes/*.yml, generates manifest.json)

**Checkpoint**: Foundation ready - recipe schemas, errors, loader, and repository are complete. User story implementation can now begin.

### Phase 2 Tests (TDD - Constitution Principle I)

- [x] T019a [P] Write unit tests for Zod schemas in src/modules/recipe/schema.test.ts
- [x] T019b [P] Write unit tests for error classes in src/modules/recipe/errors.test.ts
- [x] T019c Write unit tests for recipe-loader in src/modules/recipe/recipe-loader.test.ts
- [x] T019d Write unit tests for recipe-repository in src/modules/recipe/recipe-repository.test.ts

---

## Phase 3: User Story 1 - Browse Available Recipes (Priority: P1) 🎯 MVP

**Goal**: Allow users to discover available recipes via `configurator recipe list`

**Independent Test**: Run `configurator recipe list` and verify recipe names, descriptions, and categories display correctly. Filter by `--category` and verify filtering works. Use `--json` and verify structured output.

### Service Layer for User Story 1

- [x] T020 [US1] Implement listRecipes(options) in src/modules/recipe/recipe-service.ts (reads manifest, optional category filter)
- [x] T021 [US1] Implement formatRecipeList(recipes) in src/modules/recipe/recipe-service.ts (human-readable output grouped by category)

### CLI Implementation for User Story 1

- [x] T022 [US1] Define recipeListArgsSchema in src/commands/recipe.ts
- [x] T023 [US1] Implement listHandler(args) in src/commands/recipe.ts (calls service, formats output)
- [x] T024 [US1] Add --json output support to listHandler in src/commands/recipe.ts
- [x] T025 [US1] Add --category filter support to listHandler in src/commands/recipe.ts

### Command Registration for User Story 1

- [x] T026 [US1] Create recipeCommandConfig parent command in src/commands/recipe.ts
- [x] T027 [US1] Add subcommand support to CommandConfig interface in src/cli/command.ts (if needed) - N/A: Used simple command instead
- [x] T028 [US1] Register list subcommand in recipeCommandConfig in src/commands/recipe.ts - Integrated into main command
- [x] T029 [US1] Export recipeCommandConfig from src/commands/index.ts
- [x] T030 [US1] Register recipe command in src/cli/main.ts - Auto-registered via commands array

**Checkpoint**: User Story 1 complete. Users can run `configurator recipe list` to discover recipes.

### Phase 3 Tests (TDD - Constitution Principle I)

- [ ] T030a Write unit tests for listRecipes service in tests/unit/modules/recipe/recipe-service.test.ts
- [ ] T030b Write unit tests for formatRecipeList in tests/unit/modules/recipe/recipe-service.test.ts
- [ ] T030c Write integration tests for recipe list command in tests/integration/commands/recipe-list.test.ts

---

## Phase 4: User Story 2 - Preview Recipe Configuration (Priority: P1)

**Goal**: Allow users to preview a recipe's full configuration via `configurator recipe show <name>`

**Independent Test**: Run `configurator recipe show multi-region` and verify metadata, use case, prerequisites, entity summary, customization hints, and configuration preview display correctly. Test with `--json` flag.

### Service Layer for User Story 2

- [ ] T031 [US2] Implement getRecipe(name) in src/modules/recipe/recipe-service.ts (loads full recipe from YAML)
- [ ] T032 [US2] Implement formatRecipeDetails(recipe) in src/modules/recipe/recipe-service.ts (human-readable detailed output)
- [ ] T033 [US2] Implement formatConfigPreview(config) in src/modules/recipe/recipe-service.ts (YAML config preview with syntax highlighting)

### CLI Implementation for User Story 2

- [ ] T034 [US2] Define recipeShowArgsSchema in src/commands/recipe.ts
- [ ] T035 [US2] Implement showHandler(args) in src/commands/recipe.ts (calls service, formats output)
- [ ] T036 [US2] Add --json output support to showHandler in src/commands/recipe.ts
- [ ] T037 [US2] Implement recipe not found error with suggestions in showHandler

### Command Registration for User Story 2

- [ ] T038 [US2] Register show subcommand in recipeCommandConfig in src/commands/recipe.ts

**Checkpoint**: User Story 2 complete. Users can preview any recipe before applying.

### Phase 4 Tests (TDD - Constitution Principle I)

- [ ] T038a Write unit tests for getRecipe service in tests/unit/modules/recipe/recipe-service.test.ts
- [ ] T038b Write unit tests for formatRecipeDetails in tests/unit/modules/recipe/recipe-service.test.ts
- [ ] T038c Write unit tests for formatConfigPreview in tests/unit/modules/recipe/recipe-service.test.ts
- [ ] T038d Write integration tests for recipe show command in tests/integration/commands/recipe-show.test.ts

---

## Phase 5: User Story 3 - Apply Recipe to Saleor Instance (Priority: P1)

**Goal**: Allow users to apply a recipe via `configurator recipe apply <name> --url --token`

**Independent Test**: Apply a recipe to a test Saleor instance and verify all entities are created. Run apply twice and verify idempotency (second apply shows no changes).

### Service Layer for User Story 3

- [ ] T039 [US3] Implement resolveRecipeSource(name) in src/modules/recipe/recipe-service.ts (built-in name vs local file path)
- [ ] T040 [US3] Implement loadRecipeConfig(source) in src/modules/recipe/recipe-service.ts (returns config portion only)
- [ ] T041 [US3] Implement applyRecipe(args) in src/modules/recipe/recipe-service.ts (orchestrates loading, diffing, deploying)

### Deploy Integration for User Story 3

- [ ] T042 [US3] Add recipe deploy flow in src/modules/recipe/recipe-service.ts (reuses existing deploy infrastructure)
- [ ] T042a [US3] Implement validateSaleorVersion(recipe, instanceVersion) in src/modules/recipe/recipe-service.ts (version compatibility check)
- [ ] T043 [US3] Implement recipe diff preview in src/modules/recipe/recipe-service.ts (reuses existing diff infrastructure)
- [ ] T044 [US3] Add confirmation prompt before deployment in src/commands/recipe.ts (unless --ci)

### CLI Implementation for User Story 3

- [ ] T045 [US3] Define recipeApplyArgsSchema in src/commands/recipe.ts (extends baseCommandArgsSchema)
- [ ] T046 [US3] Implement applyHandler(args) in src/commands/recipe.ts (calls service, shows progress)
- [ ] T047 [US3] Add --plan mode support to applyHandler in src/commands/recipe.ts (show diff without applying)
- [ ] T048 [US3] Add --ci mode support to applyHandler in src/commands/recipe.ts (skip confirmations)
- [ ] T049 [US3] Add --json output support to applyHandler in src/commands/recipe.ts
- [ ] T050 [US3] Add progress spinner using ora in applyHandler

### Command Registration for User Story 3

- [ ] T051 [US3] Register apply subcommand in recipeCommandConfig in src/commands/recipe.ts

**Checkpoint**: User Story 3 complete. Users can apply built-in recipes to their Saleor instance. Core feature (P1 stories) complete!

### Phase 5 Tests (TDD - Constitution Principle I)

- [ ] T051a Write unit tests for resolveRecipeSource in tests/unit/modules/recipe/recipe-service.test.ts
- [ ] T051b Write unit tests for loadRecipeConfig in tests/unit/modules/recipe/recipe-service.test.ts
- [ ] T051c Write unit tests for applyRecipe in tests/unit/modules/recipe/recipe-service.test.ts
- [ ] T051d Write unit tests for validateSaleorVersion in tests/unit/modules/recipe/recipe-service.test.ts
- [ ] T051e Write integration tests for recipe apply command in tests/integration/commands/recipe-apply.test.ts
- [ ] T051f [E2E] Run E2E validation: recipe apply → verify entities → recipe apply again (idempotent) - Constitution Principle VI

---

## Phase 6: User Story 4 - Multi-Region Recipe (Priority: P2)

**Goal**: Provide a multi-region recipe with US, EU, UK channels, warehouses, and shipping zones

**Independent Test**: Apply multi-region recipe and verify 3 channels (US/EUR/GBP), 3 warehouses, 3 shipping zones are created with correct settings.

### Recipe Content for User Story 4

- [ ] T052 [US4] Create src/recipes/multi-region.yml with metadata frontmatter
- [ ] T053 [US4] Add 3 channels configuration to src/recipes/multi-region.yml (US, EU, UK with currencies)
- [ ] T054 [US4] Add 3 warehouses configuration to src/recipes/multi-region.yml (one per region)
- [ ] T055 [US4] Add 3 shipping zones configuration to src/recipes/multi-region.yml (regional coverage)
- [ ] T056 [US4] Add entity summary, prerequisites, and customization hints to multi-region.yml metadata

**Checkpoint**: Multi-region recipe complete. Users can set up global e-commerce with one command.

---

## Phase 7: User Story 5 - Digital Products Recipe (Priority: P2)

**Goal**: Provide a digital products recipe with product types that don't require shipping

**Independent Test**: Apply digital-products recipe and verify product types have isShippingRequired: false and digital-specific attributes are created.

### Recipe Content for User Story 5

- [ ] T057 [US5] Create src/recipes/digital-products.yml with metadata frontmatter
- [ ] T058 [US5] Add product types configuration to src/recipes/digital-products.yml (isShippingRequired: false)
- [ ] T059 [US5] Add digital-specific attributes to src/recipes/digital-products.yml (download URL, license key, etc.)
- [ ] T060 [US5] Add entity summary, prerequisites, and customization hints to digital-products.yml metadata

**Checkpoint**: Digital products recipe complete. Users can configure digital goods selling with one command.

---

## Phase 8: User Story 6 - Click and Collect Recipe (Priority: P2)

**Goal**: Provide a click-and-collect recipe configuring warehouses as pickup points

**Independent Test**: Apply click-and-collect recipe and verify warehouses have pickup enabled and shipping zone for local pickup is created.

### Recipe Content for User Story 6

- [ ] T061 [US6] Create src/recipes/click-and-collect.yml with metadata frontmatter
- [ ] T062 [US6] Add warehouses configuration to src/recipes/click-and-collect.yml (pickup enabled)
- [ ] T063 [US6] Add shipping zone configuration to src/recipes/click-and-collect.yml (local pickup)
- [ ] T064 [US6] Add entity summary, prerequisites, and customization hints to click-and-collect.yml metadata

**Checkpoint**: Click and collect recipe complete. Users can enable store pickup with one command.

---

## Phase 9: User Story 7 - Custom Shipping Recipe (Priority: P3)

**Goal**: Provide a custom shipping recipe with shipping zones, methods, and rate structures

**Independent Test**: Apply custom-shipping recipe and verify shipping zones and methods are created with example rates.

### Recipe Content for User Story 7

- [ ] T065 [US7] Create src/recipes/custom-shipping.yml with metadata frontmatter
- [ ] T066 [US7] Add shipping zones configuration to src/recipes/custom-shipping.yml (common geographic regions)
- [ ] T067 [US7] Add shipping methods with rate structures to src/recipes/custom-shipping.yml
- [ ] T068 [US7] Add entity summary, prerequisites, and customization hints to custom-shipping.yml metadata

**Checkpoint**: Custom shipping recipe complete. Users have a shipping configuration starting point.

---

## Phase 10: User Story 8 - Customize Recipe Before Applying (Priority: P3)

**Goal**: Allow users to export a recipe to a local file for customization via `configurator recipe export <name>`

**Independent Test**: Export a recipe, modify the file, apply the modified version, and verify customizations are reflected.

### Service Layer for User Story 8

- [ ] T069 [US8] Implement exportRecipe(name, outputPath) in src/modules/recipe/recipe-service.ts
- [ ] T070 [US8] Implement determineOutputPath(name, specifiedPath) helper in src/modules/recipe/recipe-service.ts

### CLI Implementation for User Story 8

- [ ] T071 [US8] Define recipeExportArgsSchema in src/commands/recipe.ts
- [ ] T072 [US8] Implement exportHandler(args) in src/commands/recipe.ts
- [ ] T073 [US8] Add next steps output to exportHandler (edit instructions, apply command)

### Command Registration for User Story 8

- [ ] T074 [US8] Register export subcommand in recipeCommandConfig in src/commands/recipe.ts

### Apply Local Files

- [ ] T075 [US8] Add local file path detection to resolveRecipeSource() in src/modules/recipe/recipe-service.ts
- [ ] T076 [US8] Add local file loading support to loadRecipeConfig() in src/modules/recipe/recipe-service.ts

**Checkpoint**: User Story 8 complete. Users can export, customize, and apply modified recipes.

### Phase 10 Tests (TDD - Constitution Principle I)

- [ ] T076a Write unit tests for exportRecipe in tests/unit/modules/recipe/recipe-service.test.ts
- [ ] T076b Write unit tests for determineOutputPath in tests/unit/modules/recipe/recipe-service.test.ts
- [ ] T076c Write unit tests for local file path detection in tests/unit/modules/recipe/recipe-service.test.ts
- [ ] T076d Write integration tests for recipe export command in tests/integration/commands/recipe-export.test.ts

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements, manifest generation, and merge functionality

### Manifest Generation

- [ ] T077 Update scripts/generate-recipe-manifest.ts to scan all src/recipes/*.yml files
- [ ] T078 Run generate-recipe-manifest and create src/recipes/manifest.json
- [ ] T079 Add manifest generation to build script in package.json

### Merge Support (mentioned in spec)

- [ ] T080 Implement mergeWithExistingConfig(recipeConfig, existingConfig) in src/modules/recipe/recipe-service.ts
- [ ] T081 Add --merge flag support to applyHandler in src/commands/recipe.ts

### Conflict Detection

- [ ] T082 Implement detectConflicts(recipeConfig, remoteState) in src/modules/recipe/recipe-service.ts
- [ ] T083 Add conflict resolution prompts to applyHandler in src/commands/recipe.ts

### Validation

- [ ] T084 Run quickstart.md validation (test all documented commands)
- [ ] T085 Validate all 4 recipes load correctly via manifest
- [ ] T086 Run pre-commit checklist: pnpm check:fix && pnpm build && pnpm test

---

## Phase 12: Post-Implementation Review (Constitution Principle IX)

**Purpose**: Mandatory review phase before PR creation

### Build Verification

- [ ] T087 Run `pnpm build` - TypeScript compilation MUST succeed
- [ ] T088 Run `pnpm test` - All tests MUST pass
- [ ] T089 Run `pnpm check:ci` - CI validation MUST pass

### Automated Code Review (Run ALL in parallel)

- [ ] T090 [P] Launch `pr-review-toolkit:code-reviewer` agent
- [ ] T091 [P] Launch `pr-review-toolkit:code-simplifier` agent
- [ ] T092 [P] Launch `pr-review-toolkit:pr-test-analyzer` agent
- [ ] T093 [P] Launch `code-quality-reviewer` agent
- [ ] T094 [P] Launch `pr-review-toolkit:silent-failure-hunter` agent (error handling was added)
- [ ] T095 [P] Launch `pr-review-toolkit:type-design-analyzer` agent (new types added)

### Findings Resolution

- [ ] T096 Consolidate all agent findings into checklist
- [ ] T097 Address all CRITICAL findings (0 remaining required)
- [ ] T098 Address all HIGH findings (0 remaining required)
- [ ] T099 Include findings checklist in PR description

**Checkpoint**: Post-implementation review complete. Ready for PR creation.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **Foundational Tests**: Run after Phase 2 implementation, before Phase 3
- **User Story 1-3 (Phase 3-5)**: P1 stories, depend on Foundational phase - implement in sequence
- **US Tests**: Run after each user story phase, before next phase
- **User Story 4-6 (Phase 6-8)**: P2 stories, depend on US1-3 - can run in parallel
- **User Story 7-8 (Phase 9-10)**: P3 stories, depend on US1-3 - can run in parallel
- **Polish (Phase 11)**: Depends on all user stories being complete
- **Post-Implementation Review (Phase 12)**: Depends on Phase 11 - REQUIRED before PR

### User Story Dependencies

| Story | Depends On | Can Parallelize With |
|-------|------------|---------------------|
| US1 (Browse) | Foundational | - |
| US2 (Preview) | US1 (needs list infrastructure) | - |
| US3 (Apply) | US2 (needs recipe loading) | - |
| US4 (Multi-Region) | US3 (needs apply working) | US5, US6 |
| US5 (Digital Products) | US3 | US4, US6 |
| US6 (Click & Collect) | US3 | US4, US5 |
| US7 (Custom Shipping) | US3 | US8 |
| US8 (Export/Customize) | US3 | US7 |

### Within Each User Story

- Schemas before services
- Services before CLI handlers
- CLI handlers before command registration
- Core implementation before integration

### Parallel Opportunities

**Within Phase 2 (Foundational):**
```
Parallel: T005, T006 (independent schemas)
Parallel: T011, T012, T013, T014 (independent error classes)
```

**Within Phase 6-8 (P2 Recipes):**
```
Parallel: US4 (multi-region), US5 (digital), US6 (click-and-collect)
All 3 recipes can be created simultaneously once US3 is complete
```

**Within Phase 9-10 (P3 Stories):**
```
Parallel: US7 (custom-shipping recipe), US8 (export feature)
```

---

## Parallel Example: Creating P2 Recipes

```bash
# After US3 (Apply) is complete, launch all P2 recipes in parallel:
Task: "Create src/recipes/multi-region.yml with metadata frontmatter" [US4]
Task: "Create src/recipes/digital-products.yml with metadata frontmatter" [US5]
Task: "Create src/recipes/click-and-collect.yml with metadata frontmatter" [US6]
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 - Browse (list command works)
4. Complete Phase 4: User Story 2 - Preview (show command works)
5. Complete Phase 5: User Story 3 - Apply (apply command works)
6. **STOP and VALIDATE**: Test with a minimal test recipe
7. Deploy/demo if ready - users can now list, preview, and apply recipes

### Incremental Delivery

1. MVP (US1-3) → Core recipe functionality works
2. Add US4 (multi-region) → First real recipe available
3. Add US5-6 (digital, click-collect) → More recipe variety
4. Add US7-8 (custom shipping, export) → Full feature set
5. Polish → Merge support, conflict detection, validation

### Suggested MVP Scope

For a minimal deployable feature, complete:
- **Phase 1**: Setup (T001-T004)
- **Phase 2**: Foundational (T005-T019)
- **Phase 3**: US1 - Browse (T020-T030)
- **Phase 4**: US2 - Preview (T031-T038)
- **Phase 5**: US3 - Apply (T039-T051)
- **Phase 6**: US4 - Multi-Region (T052-T056) - at least one recipe to test with

This gives users: `recipe list`, `recipe show`, `recipe apply`, and one real recipe.

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 113 |
| **Setup Phase** | 4 tasks |
| **Foundational Phase** | 16 tasks (includes T017a) |
| **Foundational Tests** | 4 tasks |
| **US1 (Browse)** | 11 tasks |
| **US1 Tests** | 3 tasks |
| **US2 (Preview)** | 8 tasks |
| **US2 Tests** | 4 tasks |
| **US3 (Apply)** | 14 tasks (includes T042a) |
| **US3 Tests + E2E** | 6 tasks |
| **US4 (Multi-Region)** | 5 tasks |
| **US5 (Digital Products)** | 4 tasks |
| **US6 (Click & Collect)** | 4 tasks |
| **US7 (Custom Shipping)** | 4 tasks |
| **US8 (Export)** | 8 tasks |
| **US8 Tests** | 4 tasks |
| **Polish Phase** | 10 tasks |
| **Post-Implementation Review** | 13 tasks |
| **Parallel Opportunities** | ~30 tasks marked [P] |
| **MVP Scope** | Phases 1-6 + tests (72 tasks) |

---

## Notes

- [P] tasks = different files, no dependencies within their phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Test tasks included per Constitution Principle I (TDD) - write tests before or alongside implementation
- Function size target: 20-30 lines per function; maximum 50 lines for complex orchestration
- Use `analyzing-test-coverage` skill before writing tests
