# Configurator Code Review Rules

Semantic code review rules for the Saleor Configurator project. These rules catch issues that linters and type checkers cannot.

---

## Rule 1: No Code Comments

Code should be self-documenting through clear naming and structure.

❌ **Forbidden:**
- `// explanation` (inline comments)
- `/* block comments */`
- Comments explaining what code does

✅ **Exceptions:**
- Configuration files (`.eslintignore`, `.gitignore`)
- Package manifests (`package.json` descriptions)
- Documentation files (`.md`)

**Why:** Comments become outdated and lie. Names never lie.

---

## Rule 2: Maximum Type Safety

No escape hatches. Push for precise types that make illegal states unrepresentable.

❌ **Forbidden:**
- `any` type
- `as Type` (type assertions)
- `@ts-ignore` or `@ts-expect-error`
- `!` non-null assertions (`value!.property`)
- `eslint-disable` comments
- Types with many optional properties when a union would be more precise

✅ **Required:**
- Explicit types for all public APIs
- Discriminated unions over optional bags
- Dedicated types for domain concepts

**Example — optional bags → discriminated union:**

❌ Weak:
```typescript
interface GraphNode {
  id: string
  type: 'person' | 'company' | 'document'
  firstName?: string
  lastName?: string
  birthDate?: Date
  companyName?: string
  taxId?: string
  incorporationDate?: Date
  title?: string
  content?: string
  authorId?: string
}
```

✅ Strong:
```typescript
type GraphNode =
  | { type: 'person'; id: string; firstName: string; lastName: string; birthDate: Date }
  | { type: 'company'; id: string; companyName: string; taxId: string; incorporationDate: Date }
  | { type: 'document'; id: string; title: string; content: string; authorId: string }
```

**Why:** Type safety catches bugs at compile time. Precise types prevent invalid states.

---

## Rule 3: No Dangerous Fallback Values

Defaults hide bugs. Required values should fail fast.

❌ **Forbidden:**
- `value ?? 'default'` (without clear reason)
- `value || 'fallback'` (same)
- Guessing at defaults when value should be required

✅ **Allowed:**
- Optional parameters with documented defaults
- Configuration with explicit optional semantics
- Test data with placeholder values

**Why:** If a value is required, make it required. Don't hide missing data.

---

## Rule 4: Domain Modeling

Business logic belongs in domain objects, not scattered across code.

❌ **Forbidden:**
- Logic outside domain objects:
  ```typescript
  const canProcess = order.status === 'pending'
  ```

- Bare primitives for domain concepts:
  ```typescript
  function findUser(id: string)
  function calculatePrice(amount: number)
  ```

✅ **Required:**
- Domain objects make decisions:
  ```typescript
  const canProcess = order.canProcess()
  ```

- Typed domain values:
  ```typescript
  function findUser(id: UserId)
  function calculatePrice(amount: Money)
  ```

**Why:** Domain-driven design prevents logic sprawl and makes intent explicit.

---

## Rule 5: No Generic Category Names

Names express domain purpose, not code organization.

❌ **Forbidden:**
- Files: `utils.ts`, `helpers.ts`, `types.ts`, `services.ts`, `handlers.ts`
- Classes: `NodeHelper`, `Utils`, `ServiceBase`
- Functions: `formatHelper()`, `nodeUtils()`
- Folders: `/utils`, `/helpers`, `/common`, `/core`, `/shared`

✅ **Required:**
- Purpose-driven names:
  - `calculateNodeRadius.ts`
  - `NodePositioning.ts`
  - `EdgeRenderingStrategy.ts`

**Framework conventions:** Standard framework folders like `hooks/` or `components/` are acceptable.

**Why:** Generic names are mental dumping grounds. Specific names reveal intent.

---

## Rule 6: Function Size Limits

Functions MUST be concise and focused.

❌ **Forbidden:**
- Functions exceeding 50 lines (excluding comments and blank lines)
- Functions that require scrolling to understand

✅ **Required:**
- Ideal: 10-30 lines per function
- Maximum: 50 lines for justified complexity
- Extract logical sections into named functions

**Why:** Long functions hide multiple responsibilities and are hard to test.

---

## Rule 7: Nesting Depth

Code must remain flat and readable.

❌ **Forbidden:**
- More than 3 levels of nesting
- `if (a) { if (b) { if (c) { if (d) {} } } }`
- Deeply nested callbacks or conditionals

✅ **Required:**
- Use guard clauses (early returns) to flatten logic
- Extract nested blocks into named functions
- Use `map`/`filter`/`flatMap` instead of nested loops

**Why:** Deep nesting creates cognitive load and hides bugs.

---

## Rule 8: Guard Clauses Over Else

Prefer early returns to reduce nesting.

❌ **Forbidden:**
```typescript
if (condition) {
  return X;
} else {
  return Y;
}
```

✅ **Required:**
```typescript
if (condition) {
  return X;
}
return Y;
```

**Why:** `else` after `return` increases nesting unnecessarily. Guard clauses fail fast and keep the happy path unindented.

---

## Rule 9: File Size Limits

Files must be focused on a single concern.

| File Type | Max Lines | Action |
|-----------|-----------|--------|
| Services | 400 | Split into focused modules |
| Repositories | 250 | Extract query builders |
| Test files | 500 | Split by test subject |
| Other | 300 | Plan split at 300, urgent at 400 |

**Why:** Large files accumulate responsibilities. Split into focused modules.

---

## Rule 10: Schema SSOT — Zod Types Only

Types for domain/config data MUST be derived from Zod schemas.

❌ **Forbidden:**
```typescript
interface ProductConfig {
  name: string;
  slug: string;
}
```
(when a Zod schema exists for the same data)

✅ **Required:**
```typescript
const ProductConfigSchema = z.object({
  name: z.string(),
  slug: z.string(),
});
type ProductConfig = z.infer<typeof ProductConfigSchema>;
```

✅ **Allowed standalone interfaces:**
- Service contracts (repository interfaces, function signatures)
- Utility types
- GraphQL result types

**Why:** Inline types drift from validation. Zod schemas are the single source of truth.

---

## Rule 11: No Type Assertions Without Validation

Type assertions bypass the type checker. Use proper narrowing instead.

❌ **Forbidden:**
```typescript
const data = response as ProductData;
const items = result as unknown as Item[];
```

✅ **Allowed:**
```typescript
const obj = { key: 'value' } as const;
const mock = vi.fn() as MockedObject<Repo>;  // test mocks only
```

✅ **Required alternatives:**
- Zod parsing: `ProductSchema.parse(response)`
- Type guards: `if (isProduct(data)) { ... }`
- Discriminated union narrowing: `if (result.ok) { result.data }`

**Why:** `as Type` assumes data is valid without verification. Bugs hide behind assertions.

---

## Rule 12: Focused Test Assertions

Each test should verify ONE behavior.

❌ **Forbidden:**
- More than 8 assertions in a single test
- Testing multiple unrelated behaviors in one test
- Assertions that don't relate to the test name

✅ **Required:**
- 1-5 meaningful assertions per test
- Each test verifies a single behavior
- Test name matches what is asserted

**Why:** Many assertions test multiple behaviors. When one fails, you can't identify which behavior broke.

---

## Rule 13: Single Responsibility per Function

One function should do ONE thing.

❌ **Forbidden:**
```typescript
async function processEntity(entity: Entity) {
  // validates
  // transforms
  // persists
  // logs
}
```

✅ **Required:**
```typescript
function validateEntity(entity: Entity): ValidatedEntity { ... }
function transformEntity(entity: ValidatedEntity): TransformedEntity { ... }
async function persistEntity(entity: TransformedEntity): Promise<void> { ... }
```

**Why:** Multi-responsibility functions are hard to test, name, and reuse. Compose small, focused functions.

---

## Rule 14: Error Handling Completeness

All error paths must be handled explicitly.

❌ **Forbidden:**
```typescript
catch (e) {}                    // silent catch
catch (e) { console.log(e) }   // log-only without rethrow
promise.catch(() => {})         // ignored rejection
```

✅ **Required:**
```typescript
catch (error: unknown) {
  if (error instanceof BaseError) {
    throw error;  // rethrow domain errors
  }
  throw new ServiceError('Operation failed', { cause: error });
}
```

- Log or rethrow with context
- Use `ServiceErrorWrapper` for operation error handling
- Never swallow errors silently

**Why:** Silent failures are the worst bugs. They corrupt state without alerting anyone.

---

## Review Procedure

For each file:
1. Read complete file
2. Check against ALL 14 rules
3. Report violations with file:line references

## Report Format

### If violations found:

```
❌ FAIL — N violations

1. [RULE_NAME] - file:line
   Issue: description
   Fix: suggestion
```

### If no violations:

```
✅ PASS — File meets all quality requirements.
```
