# Dimension Details

Detailed scoring criteria for each design quality dimension, calibrated for the Saleor Configurator project.

## 1. Naming (15%)

**What to check:**
- Do names reveal intent? (`deployEntityChanges` > `process`)
- Are domain terms used consistently? (`slug`, `channel`, `attribute`)
- Do boolean names use `is`/`has`/`should`/`can` prefixes?
- Are abbreviations avoided? (`repository` > `repo`, `configuration` > `config` in public APIs)

**Score 5:** All names are intention-revealing and domain-aligned. No `data`, `info`, `item`, `thing` used generically.

**Score 3:** Most names are good, but some vague names like `processItems`, `handleData`, or `result` appear.

**Score 1:** Pervasive use of generic names. Functions named `doStuff`, variables named `x`, `temp`, `val`.

**Configurator examples:**
- `CategoryService` (good) vs `CatSvc` (bad)
- `EntitySlug` (good) vs `id: string` (bad)
- `isSlugBasedEntity` (good) vs `check` (bad)

## 2. Complexity (15%)

**What to check:**
- Function size: ≤30 ideal, ≤50 max
- Nesting depth: ≤3 levels
- Guard clauses used instead of nested if/else
- No `forEach` (use `map`/`filter`/`for...of`)
- Cyclomatic complexity reasonable

**Score 5:** All functions ≤30 lines, max 2 nesting levels, guard clauses throughout.

**Score 3:** Some functions 30-50 lines, occasional 3-level nesting, mix of guard clauses and if/else.

**Score 1:** Functions >100 lines, 4+ nesting levels, deeply nested conditionals.

**Configurator examples:**
- Comparator methods should be small, focused comparison functions
- Deployment stages should compose small steps, not monolithic functions
- Repository methods should be thin wrappers around GraphQL

## 3. Coupling/Cohesion (15%)

**What to check:**
- Modules depend on abstractions, not implementations
- Services receive repositories via constructor (DI)
- No circular dependencies between modules
- High cohesion: each module handles one entity/concern
- Shared code lives in appropriate shared modules

**Score 5:** Clean boundaries, all dependencies injected, no circular refs, each file has one clear purpose.

**Score 3:** Some tight coupling, a few files that import from too many modules, some mixed responsibilities.

**Score 1:** Spaghetti imports, circular dependencies, god files that know about everything.

**Configurator examples:**
- `CategoryService` depends on `CategoryRepository` interface (good)
- `DiffService` orchestrates comparators without knowing their internals (good)
- A service directly constructing its own repository (bad coupling)

## 4. Immutability (10%)

**What to check:**
- `const` over `let` everywhere possible
- No parameter reassignment
- Functional transforms (`map`/`filter`) over mutation (`push`/`splice`)
- No accumulating spread in reduce (use `Map` or pre-allocated arrays)
- Readonly types for data that shouldn't change

**Score 5:** All variables `const`, functional transforms everywhere, readonly types for configs.

**Score 3:** Mostly immutable, occasional `let` for accumulators, some mutation in loops.

**Score 1:** Rampant mutation, `let` everywhere, arrays built via push in loops.

## 5. Domain Integrity (15%)

**What to check:**
- Business rules live in domain layer (schemas, types, domain functions)
- Entity identification uses branded types (`EntitySlug`)
- Config structure validated by Zod schemas
- Domain concepts have dedicated types (not bare primitives)
- Validation happens at boundaries, not scattered throughout

**Score 5:** All business rules in domain layer, branded types for all IDs, Zod validates at boundaries.

**Score 3:** Most rules in domain layer, some inline business logic, mix of branded and bare types.

**Score 1:** Business logic scattered across services/CLI/repositories, bare strings for entity IDs.

**Configurator examples:**
- Entity slug validation in Zod schema (good)
- Channel currency as branded type (good)
- Inline `if (entity.type === 'product')` in CLI code (bad — belongs in domain)

## 6. Type System (10%)

**What to check:**
- Types derived from Zod schemas (`z.infer<typeof Schema>`)
- No `any` except in test mocks
- No `as Type` assertions (except `as const` and test mocks)
- Discriminated unions for variant types
- No `@ts-ignore` or `@ts-expect-error`

**Score 5:** All types from Zod, zero `any`/`as`, discriminated unions for all variants.

**Score 3:** Most types from Zod, occasional `as` assertion with justification, some optional bags.

**Score 1:** Standalone interfaces everywhere, `any` types, `as unknown as T` patterns.

## 7. Simplicity (10%)

**What to check:**
- No premature abstractions (no interface for a single implementation)
- No over-engineered patterns (factory for one type, strategy for one strategy)
- Direct code preferred over layers of indirection
- Three similar lines better than a premature abstraction
- No feature flags for code that will only run one way

**Score 5:** Minimal abstractions, direct and clear, easy to follow.

**Score 3:** Some unnecessary indirection, a factory or two that could be a function.

**Score 1:** Layers of abstraction for simple operations, AbstractFactoryBuilder patterns.

## 8. Error Handling (10%)

**What to check:**
- Custom errors extend `BaseError`
- `ServiceErrorWrapper` used for operation error handling
- Error messages are actionable (include what went wrong and how to fix)
- No silent catch blocks
- `unknown` catch variables handled properly
- GraphQL errors use `GraphQLError.fromCombinedError`
- Zod errors use `ZodValidationError.fromZodError`

**Score 5:** All errors typed, actionable messages, proper hierarchy, no silent catches.

**Score 3:** Most errors handled, some generic messages, occasional missing context.

**Score 1:** Silent catches, `console.log(error)` without rethrow, no error hierarchy.
