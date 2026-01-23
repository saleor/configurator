<!--
SYNC IMPACT REPORT
==================
Version change: 1.1.0 → 1.2.0 (MINOR: Expanded Principle IX with parallel agent execution)

Modified principles:
- IX. Post-Implementation Review: Added parallel agent execution requirement and findings checklist

Added sections:
- Review Findings Checklist Template (within Principle IX)

Removed sections: None

Templates requiring updates:
- .specify/templates/plan-template.md: ✅ Already aligned (Constitution Check section exists)
- .specify/templates/spec-template.md: ✅ Already aligned (FR/SC patterns compatible)
- .specify/templates/tasks-template.md: ✅ Already aligned (test phases present)

Follow-up TODOs: None
==================
-->

# Saleor Configurator Constitution

Foundational principles governing all development on the Saleor Configurator project.
These principles are NON-NEGOTIABLE and supersede convenience or speed.

## Core Principles

### I. Test-Driven Development (TDD)

All non-trivial code changes MUST follow the Red-Green-Refactor cycle:

1. **Write failing tests FIRST** - Tests define the expected behavior before implementation
2. **Implement minimum code to pass** - No gold-plating; satisfy the test, nothing more
3. **Refactor while green** - Improve structure only with passing tests

**Rationale**: TDD catches defects early, documents intent, and produces naturally modular code.
Tests written after implementation tend to verify implementation rather than requirements.

**Enforcement**:
- PRs without corresponding tests for new logic MUST be rejected
- Test coverage MUST NOT decrease with new features
- Use the `analyzing-test-coverage` skill before submitting

### II. Small Functions & Legibility

Functions MUST be small, focused, and self-documenting:

- **Ideal size**: 10-50 lines
- **Maximum**: ~100 lines for genuinely complex orchestration
- **Single responsibility**: One function does one thing
- **Meaningful names**: Function name describes what it does, not how

**Rationale**: Small functions are easier to test, review, understand, and reuse.
Large functions indicate missing abstractions.

**Enforcement**:
- Functions exceeding 100 lines MUST be split or justified
- Nested conditionals beyond 3 levels MUST be refactored
- Use `map`/`filter`/`flatMap` over imperative loops
- Use the `reviewing-typescript-code` skill for quality checks

### III. Skill-First Development

Before implementing ANY non-trivial feature, Claude Code skills MUST be invoked:

| Domain | Required Skill |
|--------|----------------|
| TypeScript code | `reviewing-typescript-code` |
| GraphQL operations | `writing-graphql-operations` |
| Test creation | `analyzing-test-coverage` |
| Zod schemas | `designing-zod-schemas` |
| CLI patterns | `implementing-cli-patterns` |
| New entities | `adding-entity-types` |
| Domain questions | `understanding-saleor-domain` |
| Pre-commit | `validating-pre-commit` |
| Releases | `creating-changesets` |
| CI/CD | `managing-github-ci` |

**Rationale**: Skills encode project-specific patterns and best practices.
Skipping skills leads to inconsistent code and repeated mistakes.

**Enforcement**:
- Skills MUST be invoked BEFORE writing code in their domain
- Code reviews MUST verify appropriate skills were used
- Unknown patterns trigger skill consultation, not guesswork

### IV. Serena Memory Integration

Serena project memories MUST be consulted for context-specific guidance:

**Available Memories**:
- `project_overview` - High-level project understanding
- `project-architecture` - Architectural patterns
- `development-patterns` - Zod-first, repository patterns
- `testing-patterns` - Vitest, MSW, builder patterns
- `code_style_and_conventions` - Naming, formatting, Serena optimization
- `diff_engine_architecture` - Comparator and formatter patterns
- `error_handling_architecture` - BaseError hierarchy
- `graphql_integration_guide` - gql.tada, urql patterns
- `deployment_pipeline_architecture` - Deploy flow
- `saleor_api_patterns` - Saleor-specific API knowledge

**Rationale**: Memories preserve institutional knowledge and prevent re-learning.
They capture nuances that generic instructions miss.

**Enforcement**:
- Read relevant memory BEFORE starting work in that area
- Update memories when discovering new patterns
- Reference memories in commit messages when applicable

### V. Template-Driven Enhancement

All new features MUST use SpecKit templates for specification and planning:

1. **Specification** (`/speckit.specify`) - Define user stories and requirements
2. **Planning** (`/speckit.plan`) - Design architecture and file structure
3. **Tasks** (`/speckit.tasks`) - Generate actionable implementation tasks
4. **Analysis** (`/speckit.analyze`) - Cross-artifact consistency check

**Rationale**: Templates ensure completeness, enable review before implementation,
and create documentation as a byproduct.

**Enforcement**:
- Features without spec.md and plan.md MUST NOT begin implementation
- Templates MUST be filled completely (no placeholder tokens)
- Use `/speckit.clarify` when requirements are ambiguous

### VI. End-to-End Validation

Changes to core configurator functionality MUST pass E2E validation:

**Required Workflow**:
```bash
# 1. Introspect current state
rm -rf config.yml
pnpm dev introspect --url=<URL> --token=<TOKEN>

# 2. Make test changes to config.yml

# 3. Deploy changes
pnpm dev deploy --url=<URL> --token=<TOKEN>

# 4. Verify idempotency (second deploy = no changes)
pnpm dev deploy --url=<URL> --token=<TOKEN>

# 5. Re-introspect and diff
rm config.yml
pnpm dev introspect --url=<URL> --token=<TOKEN>
pnpm dev diff --url=<URL> --token=<TOKEN>  # Should show no diff
```

**Rationale**: The introspect-deploy-diff cycle is the core value proposition.
Breaking any part breaks the product.

**Enforcement**:
- Changes to modules/*, core/*, or commands/* MUST pass E2E validation
- Use test environment: `https://store-rzalldyg.saleor.cloud/graphql/`
- Document E2E test results in PR description

### VII. Type-Safe Schema-First Design

Zod schemas are the source of truth for data shapes:

```typescript
// CORRECT: Schema first, type inferred
const CategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
});
type Category = z.infer<typeof CategorySchema>;

// WRONG: Manual type definition
interface Category { name: string; slug: string; }
```

**Rationale**: Schema-first ensures runtime validation matches compile-time types.
Manual types can diverge from actual data shapes.

**Enforcement**:
- NEVER define types manually that should be inferred from schemas
- Use branded types for domain values (slugs, IDs)
- GraphQL operations MUST use gql.tada for type inference
- Use the `designing-zod-schemas` skill for complex schemas

### VIII. Functional Code Patterns

Prefer functional transformations over imperative loops:

| Avoid | Prefer |
|-------|--------|
| `for` loops with push | `map()` |
| `forEach` with accumulation | `flatMap()` |
| Nested loops | `map()` + `flatMap()` |
| Mutable state | Immutable transformations |
| `if-else` chains | Registry pattern or `find()` |

**Rationale**: Functional patterns are declarative, composable, and less error-prone.
They express intent rather than mechanism.

**Enforcement**:
- Biome linting enforces functional patterns
- Code reviews MUST flag imperative patterns where functional alternatives exist
- Exceptions require explicit justification in PR description

### IX. Post-Implementation Review

After completing implementation, a mandatory review phase MUST be executed:

**Required Steps** (in order):

1. **Build Verification**
   ```bash
   pnpm build        # TypeScript compilation MUST succeed
   pnpm test         # All tests MUST pass
   pnpm check:ci     # CI validation MUST pass
   ```

2. **Automated Code Review via PR Review Toolkit (RUN IN PARALLEL)**

   Launch ALL agents simultaneously using parallel Task tool invocations:

   | Agent | Purpose | When Required |
   |-------|---------|---------------|
   | `pr-review-toolkit:code-reviewer` | Bugs, logic errors, quality issues | Always |
   | `pr-review-toolkit:code-simplifier` | Unnecessary complexity, refactoring opportunities | Always |
   | `pr-review-toolkit:silent-failure-hunter` | Inadequate error handling, silent failures | If error handling modified |
   | `pr-review-toolkit:comment-analyzer` | Comment accuracy and maintainability | If comments added/modified |
   | `pr-review-toolkit:type-design-analyzer` | Type design quality and invariants | If new types introduced |
   | `pr-review-toolkit:pr-test-analyzer` | Test coverage quality and completeness | Always |
   | `code-quality-reviewer` | Project standards adherence | Always |

   **Parallel Execution**: Invoke multiple agents in a SINGLE message with multiple Task tool calls.

3. **Collect and Create Findings Checklist**

   After all agents complete, consolidate findings into a checklist:

   ```markdown
   ## Review Findings Checklist

   ### From code-reviewer
   - [ ] [SEVERITY] Finding description (file:line)
   - [ ] [SEVERITY] Finding description (file:line)

   ### From code-simplifier
   - [ ] [SEVERITY] Finding description (file:line)

   ### From silent-failure-hunter
   - [ ] [SEVERITY] Finding description (file:line)

   ### From pr-test-analyzer
   - [ ] [SEVERITY] Finding description (file:line)

   ### From code-quality-reviewer
   - [ ] [SEVERITY] Finding description (file:line)

   ---
   **Summary**: X CRITICAL, Y HIGH, Z MEDIUM, W LOW
   **Action Required**: Address all CRITICAL and HIGH before PR
   ```

4. **Address Findings**
   - CRITICAL and HIGH findings MUST be resolved before PR creation
   - MEDIUM findings SHOULD be addressed or justified in PR description
   - LOW findings MAY be deferred with explanation

**Rationale**: Multi-layer review catches issues that single-pass development misses.
Parallel execution maximizes efficiency. Checklist ensures nothing is forgotten.

**Enforcement**:
- Implementation is NOT complete until all review steps pass
- Agent findings rated HIGH or CRITICAL MUST be addressed before PR
- Findings checklist MUST be included in PR description
- Use `/review-pr` skill for comprehensive PR review workflow

## Quality Gates

### Pre-Commit Checklist

Run in order before EVERY commit:

```bash
pnpm check:fix    # Fix lint and formatting
pnpm build        # Verify compilation
pnpm test         # Run test suite
npx tsc --noEmit  # Strict type check
pnpm check:ci     # CI validation
```

**All gates MUST pass.** No exceptions.

### Pre-Push Checklist

Additional checks before pushing:

- [ ] Changeset added (if user-facing change)
- [ ] E2E tested (if core change)
- [ ] No console.log statements
- [ ] No hardcoded credentials
- [ ] Relevant skills invoked
- [ ] Relevant memories consulted

### Post-Implementation Checklist

Required after completing feature implementation:

**Step 1: Build Verification**
- [ ] `pnpm build` succeeds
- [ ] `pnpm test` passes (all tests green)
- [ ] `pnpm check:ci` passes

**Step 2: Parallel Agent Review** (launch ALL in single message)
- [ ] `pr-review-toolkit:code-reviewer` invoked
- [ ] `pr-review-toolkit:code-simplifier` invoked
- [ ] `pr-review-toolkit:pr-test-analyzer` invoked
- [ ] `code-quality-reviewer` invoked
- [ ] `pr-review-toolkit:silent-failure-hunter` invoked (if error handling modified)
- [ ] `pr-review-toolkit:comment-analyzer` invoked (if comments added)
- [ ] `pr-review-toolkit:type-design-analyzer` invoked (if new types added)

**Step 3: Findings Checklist**
- [ ] All agent findings consolidated into checklist
- [ ] CRITICAL findings: 0 remaining
- [ ] HIGH findings: 0 remaining (or justified)
- [ ] Checklist included in PR description

## Governance

### Amendment Process

1. Propose amendment via PR to this file
2. Include rationale and impact assessment
3. Update dependent templates as needed
4. Require explicit approval before merge

### Version Policy

- **MAJOR**: Principle removed, redefined, or backward-incompatible
- **MINOR**: New principle added or existing expanded
- **PATCH**: Clarification, typo fix, or non-semantic refinement

### Compliance

- This constitution supersedes all other conventions
- All PRs MUST verify compliance with relevant principles
- Complexity deviations MUST be justified in PR description
- Use `.claude/rules/deployment-safety.md` for runtime validation guidance

**Version**: 1.2.0 | **Ratified**: 2026-01-16 | **Last Amended**: 2026-01-16
