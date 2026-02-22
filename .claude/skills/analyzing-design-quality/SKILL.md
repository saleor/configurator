---
name: analyzing-design-quality
description: >
  Analyzes code for design quality across 8 dimensions: Naming, Complexity,
  Coupling/Cohesion, Immutability, Domain Integrity, Type System, Simplicity,
  and Error Handling. Use this skill when reviewing code quality, after
  completing a feature, before PRs, or when asked to "review design",
  "analyze quality", or "check code health". Even for small changes, invoke
  this skill to catch design drift early.
---

# Design Quality Analysis

Evaluate code across 8 weighted dimensions calibrated for the Saleor Configurator project.

## Dimensions

| # | Dimension | Focus | Weight |
|---|-----------|-------|--------|
| 1 | **Naming** | Intention-revealing, domain-aligned names | 15% |
| 2 | **Complexity** | Function size ≤50, nesting ≤3, guard clauses, no forEach | 15% |
| 3 | **Coupling/Cohesion** | Low coupling between modules, high cohesion within | 15% |
| 4 | **Immutability** | Prefer const, no parameter reassignment, functional transforms | 10% |
| 5 | **Domain Integrity** | Business rules in domain layer, typed domain values | 15% |
| 6 | **Type System** | Zod SSOT, branded types, discriminated unions, no `any`/`as` | 10% |
| 7 | **Simplicity** | KISS, no over-engineering, minimal abstractions | 10% |
| 8 | **Error Handling** | BaseError hierarchy, ServiceErrorWrapper, actionable messages | 10% |

## Scoring

| Score | Meaning |
|-------|---------|
| 5 | Exemplary — best practices, no issues |
| 4 | Good — minor issues, easily fixable |
| 3 | Adequate — some issues, needs improvement |
| 2 | Poor — significant issues, refactoring needed |
| 1 | Critical — redesign required |

**Overall score** = weighted average of all 8 dimensions.

## Procedure

1. **Identify scope** — Which files/modules to analyze
2. **Read code** — Use symbolic tools to understand structure without reading entire files
3. **Score each dimension** — Apply criteria from `references/dimension-details.md`
4. **Identify patterns** — Check against `references/object-calisthenics.md`
5. **Generate report** — Use the output format below

## Output Format

```
## Design Quality Analysis

**Overall Score: X.X / 5.0**

| Dimension | Score | Key Finding |
|-----------|-------|-------------|
| Naming | 4 | Good domain terms, one vague `processItems` |
| Complexity | 3 | `deployEntities` at 68 lines, needs extraction |
| Coupling/Cohesion | 4 | Clean module boundaries |
| Immutability | 5 | All transforms functional |
| Domain Integrity | 3 | Some bare string IDs |
| Type System | 4 | One `as` assertion in non-test code |
| Simplicity | 5 | No over-engineering |
| Error Handling | 4 | One catch block missing context |

### Critical Issues (Score ≤ 2)
[Details with file:line and fix suggestions]

### Improvement Opportunities (Score 3)
[Details with file:line and fix suggestions]

### Strengths (Score ≥ 4)
[What's done well]
```

## When to Use

- After completing a feature
- Before creating a PR
- When asked to "review design", "analyze quality", or "check code health"
- Periodic health checks on modules
- After refactoring

## References

See `references/` for detailed criteria:
- `dimension-details.md` — Scoring criteria per dimension with configurator-specific examples
- `object-calisthenics.md` — Condensed rules with TypeScript/configurator examples
