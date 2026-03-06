# AI-Agent CLI DX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the configurator CLI more AI-agent-friendly by adding env var credential support, auto-TTY detection, a `validate` command, a `schema` command, richer validation errors, and structured `--plan --json` output.

**Architecture:** Layered defaults — always-on behaviours (env vars, TTY detection, richer errors) activate unconditionally; opt-in structured output (`validate`, `schema`, extended `--json`) requires explicit flags/commands. Human UX is unchanged throughout.

**Tech Stack:** TypeScript, Commander.js, Zod v4 (`z.toJSONSchema` built-in), Vitest, `src/cli/command.ts` (base schema), `src/commands/` (per-command handlers), `src/lib/errors/zod.ts` (error formatting)

**Design doc:** `docs/plans/2026-03-05-ai-agent-cli-dx-design.md`

---

## Task 1: Env Vars as First-Class Credentials

**Goal:** `SALEOR_URL`, `SALEOR_TOKEN`, and `SALEOR_CONFIG` env vars are read automatically. CLI flags override them. Agents never need to pass credentials as flags.

**Files:**
- Modify: `src/cli/command.ts` (the `createCommand` function, around line 196)
- Modify: `src/lib/env.ts` (add exported constants for env var names)
- Test: `src/cli/command.test.ts` (new file)

---

**Step 1: Write the failing test**

Create `src/cli/command.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// We'll test that env vars are read when flags are absent
// by directly testing the env-var injection logic we're about to add

describe("env var credential fallbacks", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore env after each test
    for (const key of ["SALEOR_URL", "SALEOR_TOKEN", "SALEOR_CONFIG"]) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  it("mergeEnvArgs: uses SALEOR_URL when --url flag is absent", () => {
    process.env.SALEOR_URL = "https://env.saleor.cloud/graphql/";
    const args = { token: "tok123", config: "config.yml", quiet: false };
    const merged = mergeEnvArgs(args);
    expect(merged.url).toBe("https://env.saleor.cloud/graphql/");
  });

  it("mergeEnvArgs: CLI flag --url overrides SALEOR_URL", () => {
    process.env.SALEOR_URL = "https://env.saleor.cloud/graphql/";
    const args = { url: "https://flag.saleor.cloud/graphql/", token: "tok", config: "config.yml", quiet: false };
    const merged = mergeEnvArgs(args);
    expect(merged.url).toBe("https://flag.saleor.cloud/graphql/");
  });

  it("mergeEnvArgs: uses SALEOR_TOKEN when --token flag is absent", () => {
    process.env.SALEOR_TOKEN = "env-token-xyz";
    const args = { url: "https://x.saleor.cloud/graphql/", config: "config.yml", quiet: false };
    const merged = mergeEnvArgs(args);
    expect(merged.token).toBe("env-token-xyz");
  });

  it("mergeEnvArgs: uses SALEOR_CONFIG when --config flag is default", () => {
    process.env.SALEOR_CONFIG = "custom.yml";
    // When no --config flag, Commander passes the schema default "config.yml"
    // Our merge should prefer the env var over the schema default
    const args = { url: "https://x.saleor.cloud/graphql/", token: "t" };
    const merged = mergeEnvArgs(args);
    expect(merged.config).toBe("custom.yml");
  });
});
```

> **Note:** `mergeEnvArgs` is the function you'll add to `src/cli/command.ts` and export for testing.

**Step 2: Run test to verify it fails**

```bash
pnpm test src/cli/command.test.ts
```
Expected: FAIL — `mergeEnvArgs` is not defined.

**Step 3: Add `mergeEnvArgs` to `src/cli/command.ts`**

Add after the `baseCommandArgsSchema` constant (around line 43):

```typescript
/**
 * Merges environment variable credentials into CLI args.
 * CLI flags always take precedence over env vars.
 * Env vars take precedence over schema defaults (undefined values).
 */
export function mergeEnvArgs<T extends Record<string, unknown>>(args: T): T {
  return {
    ...(process.env.SALEOR_URL !== undefined && !("url" in args) && { url: process.env.SALEOR_URL }),
    ...(process.env.SALEOR_TOKEN !== undefined && !("token" in args) && { token: process.env.SALEOR_TOKEN }),
    ...(process.env.SALEOR_CONFIG !== undefined && !("config" in args) && { config: process.env.SALEOR_CONFIG }),
    ...args,
  } as T;
}
```

**Step 4: Wire `mergeEnvArgs` into `createCommand`**

In `createCommand` (around line 196-220), find the action handler where args are parsed:

```typescript
// Before:
const args = options as Partial<z.infer<T>>;

// After:
const args = mergeEnvArgs(options as Partial<z.infer<T>>);
```

Apply `mergeEnvArgs` on the line right after `const args = options as ...`, before any `safeParse` call.

**Step 5: Run test to verify it passes**

```bash
pnpm test src/cli/command.test.ts
```
Expected: PASS (all 4 tests)

**Step 6: Also update `promptForMissingArgs` (around line 46)**

The function currently prompts interactively when `url`/`token` are missing. Env vars should satisfy these fields so prompts don't fire. The `mergeEnvArgs` call in `createCommand` already handles this — `url`/`token` will be populated before the interactive check. No change needed here; verify with a manual smoke test.

**Step 7: Run full test suite and lint**

```bash
pnpm check:fix && pnpm test
```

**Step 8: Commit**

```bash
git add src/cli/command.ts src/cli/command.test.ts
git commit -m "feat: read SALEOR_URL, SALEOR_TOKEN, SALEOR_CONFIG from env vars"
```

---

## Task 2: Auto-TTY Detection (No `--ci` Needed)

**Goal:** When stdin is not a TTY (or `CI` env var is set), skip all confirmation prompts automatically. `--ci` remains for backward compat but is no longer required in agent contexts.

**Files:**
- Modify: `src/commands/deploy.ts` — `confirmDeployment` and `confirmSafeOperations` methods
- Modify: `src/commands/introspect.ts` — any confirmation prompts
- Test: `src/commands/deploy.test.ts` (add test cases to existing file)

---

**Step 1: Write the failing test**

Add to `src/commands/deploy.test.ts`, inside an appropriate `describe` block:

```typescript
describe("auto-TTY detection in confirmDeployment", () => {
  it("skips confirmation when process.stdin.isTTY is false", async () => {
    // Simulate non-TTY environment (CI, piped input)
    Object.defineProperty(process.stdin, "isTTY", { value: false, configurable: true });

    const handler = new DeployCommandHandler();
    // Access private method via casting for testing
    const result = await (handler as any).confirmDeployment(
      { totalChanges: 1, creates: 1, updates: 0, deletes: 0, results: [] },
      false, // not destructive
      { ci: false } // --ci NOT set
    );

    expect(result).toBe(true); // Should auto-confirm
    Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true });
  });

  it("skips confirmation when CI env var is set", async () => {
    const originalCI = process.env.CI;
    process.env.CI = "true";
    Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true });

    const handler = new DeployCommandHandler();
    const result = await (handler as any).confirmDeployment(
      { totalChanges: 1, creates: 0, updates: 1, deletes: 0, results: [] },
      false,
      { ci: false }
    );

    expect(result).toBe(true);
    process.env.CI = originalCI;
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test src/commands/deploy.test.ts -- --reporter=verbose 2>&1 | grep -A3 "auto-TTY"
```
Expected: FAIL — method returns `false` or prompts.

**Step 3: Add `isNonInteractiveEnvironment` utility**

Add to `src/lib/ci-mode.ts`:

```typescript
/**
 * Returns true when running in a non-interactive environment where prompts
 * should be skipped automatically. Covers:
 * - Non-TTY stdin (pipes, CI runners, agent contexts)
 * - CI environment variable set
 * - Explicit --ci flag (handled separately at call sites)
 */
export function isNonInteractiveEnvironment(): boolean {
  return !process.stdin.isTTY || Boolean(process.env.CI);
}
```

**Step 4: Update `confirmDeployment` in `src/commands/deploy.ts`**

Import the utility at the top of the file:
```typescript
import { isNonInteractiveEnvironment } from "../lib/ci-mode";
```

In `confirmDeployment` (line ~168), change:
```typescript
// Before:
if (args.ci) return true;

// After:
if (args.ci || isNonInteractiveEnvironment()) return true;
```

**Step 5: Check `confirmSafeOperations` for similar prompts**

```bash
grep -n "confirmAction\|confirm(" src/commands/deploy.ts
```

Apply the same pattern to any other confirmation gate that currently only checks `args.ci`.

**Step 6: Check introspect for interactive prompts**

```bash
grep -n "confirm\|ci.*return" src/commands/introspect.ts
```

Apply `isNonInteractiveEnvironment()` to any confirmation check found.

**Step 7: Run tests**

```bash
pnpm test src/commands/deploy.test.ts src/commands/introspect.test.ts
```
Expected: PASS

**Step 8: Commit**

```bash
git add src/lib/ci-mode.ts src/commands/deploy.ts src/commands/introspect.ts
git commit -m "feat: auto-skip confirmations in non-TTY / CI environments"
```

---

## Task 3: Richer Inline Validation Errors

**Goal:** Zod `invalid_union` errors (the most common agent pain point) include what was received and what each union member expects, with a minimal example.

**Files:**
- Modify: `src/lib/errors/zod.ts` — enhance `formatZodIssue` and `ZodValidationError.fromZodError`
- Test: `src/lib/errors/zod.test.ts` (new file)

---

**Step 1: Understand the Zod v4 `invalid_union` issue shape**

A `ZodIssue` of code `invalid_union` has:
- `code: "invalid_union"`
- `unionErrors: ZodError[]` — one per union member that failed
- `path: (string | number)[]`

The goal: for each union error, extract a one-line "expected" description from the first issue of each member error.

**Step 2: Write the failing test**

Create `src/lib/errors/zod.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ZodValidationError } from "./zod";

describe("ZodValidationError.fromZodError", () => {
  it("formats a simple missing field error with path", () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const result = schema.safeParse({ name: "test" });
    expect(result.success).toBe(false);

    const error = ZodValidationError.fromZodError(result.error!, "Validation failed");
    expect(error.message).toContain("age");
    expect(error.message).toContain("Validation failed");
  });

  it("formats invalid_union error with expected format hints", () => {
    // This is the productAttributes scenario from AGENTIC_WORKFLOW_IMPROVEMENTS.md
    const inlineAttr = z.object({ name: z.string(), inputType: z.literal("DROPDOWN") });
    const refAttr = z.object({ attribute: z.string() });
    const schema = z.object({
      attr: z.union([inlineAttr, refAttr]),
    });

    const result = schema.safeParse({ attr: { name: "Brand" } }); // missing inputType AND attribute
    expect(result.success).toBe(false);

    const error = ZodValidationError.fromZodError(result.error!, "Config error");
    // Should mention the path
    expect(error.message).toContain("attr");
    // Should hint at union alternatives
    expect(error.message).toMatch(/expected one of|union|alternatives/i);
  });
});
```

**Step 3: Run test to verify it fails**

```bash
pnpm test src/lib/errors/zod.test.ts
```
Expected: Second test FAIL — no "expected one of" in message.

**Step 4: Enhance `formatZodIssue` in `src/lib/errors/zod.ts`**

Add a new case for `invalid_union` inside `formatZodIssue` (after the existing `if` blocks, before the final `return message`):

```typescript
if (issue.code === "invalid_union") {
  // Collect a short description from each union branch's first issue
  const branches = issue.unionErrors
    .map((unionErr, i) => {
      const firstIssue = unionErr.issues[0];
      if (!firstIssue) return `option ${i + 1}`;
      const branchPath = firstIssue.path.length > 0 ? ` (missing: ${firstIssue.path.join(".")})` : "";
      return `option ${i + 1}${branchPath}: ${firstIssue.message}`;
    })
    .join("; ");
  return `Value doesn't match any expected format. Expected one of: [${branches}]`;
}
```

**Step 5: Run test to verify it passes**

```bash
pnpm test src/lib/errors/zod.test.ts
```
Expected: PASS

**Step 6: Run full test suite to catch regressions**

```bash
pnpm test
```

**Step 7: Commit**

```bash
git add src/lib/errors/zod.ts src/lib/errors/zod.test.ts
git commit -m "feat: richer invalid_union validation error messages with branch hints"
```

---

## Task 4: `validate` Command

**Goal:** `configurator validate` checks `config.yml` against the Zod schema without network access. Returns structured JSON on `--json`. Exit code 0 = valid, 2 = errors.

**Files:**
- Create: `src/commands/validate.ts`
- Modify: `src/commands/index.ts` — register the command
- Test: `src/commands/validate.test.ts`

---

**Step 1: Write the failing test**

Create `src/commands/validate.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validateHandler } from "./validate";

vi.mock("../modules/config/yaml-manager", () => ({
  YamlManager: vi.fn().mockImplementation(() => ({
    read: vi.fn(),
  })),
}));

vi.mock("../modules/config/schema/schema", () => ({
  configSchema: {
    safeParse: vi.fn(),
  },
}));

vi.mock("../cli/console", () => ({
  cliConsole: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    header: vi.fn(),
  },
}));

describe("validateHandler", () => {
  const mockProcessExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("exits with code 0 when config is valid", async () => {
    const { YamlManager } = await import("../modules/config/yaml-manager");
    const { configSchema } = await import("../modules/config/schema/schema");

    vi.mocked(YamlManager).mockImplementation(() => ({
      read: vi.fn().mockResolvedValue({ shop: { headerText: "Test" } }),
    }) as any);

    vi.mocked(configSchema.safeParse).mockReturnValue({ success: true, data: {} } as any);

    await validateHandler({ config: "config.yml", json: false });

    expect(mockProcessExit).toHaveBeenCalledWith(0);
  });

  it("exits with code 2 when config is invalid", async () => {
    const { configSchema } = await import("../modules/config/schema/schema");
    vi.mocked(configSchema.safeParse).mockReturnValue({
      success: false,
      error: { issues: [{ path: ["shop"], message: "Invalid" }] },
    } as any);

    await validateHandler({ config: "config.yml", json: false });

    expect(mockProcessExit).toHaveBeenCalledWith(2);
  });

  it("outputs JSON when --json flag is set and config is invalid", async () => {
    const { configSchema } = await import("../modules/config/schema/schema");
    vi.mocked(configSchema.safeParse).mockReturnValue({
      success: false,
      error: {
        issues: [{ path: ["channels", 0, "name"], message: "Required" }],
      },
    } as any);

    await validateHandler({ config: "config.yml", json: true });

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('"valid": false')
    );
    const output = JSON.parse(mockConsoleLog.mock.calls[0][0]);
    expect(output.errors[0].path).toBe("channels.0.name");
    expect(mockProcessExit).toHaveBeenCalledWith(2);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test src/commands/validate.test.ts
```
Expected: FAIL — module not found.

**Step 3: Create `src/commands/validate.ts`**

```typescript
import { writeFileSync } from "node:fs";
import { z } from "zod";
import { cliConsole } from "../cli/console";
import type { CommandConfig } from "../cli/command";
import { configSchema } from "../modules/config/schema/schema";
import { YamlManager } from "../modules/config/yaml-manager";
import { EXIT_CODES } from "./constants";

const validateCommandSchema = z.object({
  config: z.string().default("config.yml").describe("Configuration file path"),
  json: z.boolean().default(false).describe("Output validation results as JSON"),
});

type ValidateCommandArgs = z.infer<typeof validateCommandSchema>;

export async function validateHandler(args: ValidateCommandArgs): Promise<void> {
  const yaml = new YamlManager(args.config);

  let rawConfig: unknown;
  try {
    rawConfig = await yaml.read();
  } catch (err) {
    if (args.json) {
      console.log(
        JSON.stringify(
          {
            valid: false,
            errors: [{ path: "root", message: `Cannot read config file: ${args.config}` }],
          },
          null,
          2
        )
      );
    } else {
      cliConsole.error(`Cannot read config file: ${args.config}`);
    }
    process.exit(2);
  }

  const result = configSchema.safeParse(rawConfig);

  if (result.success) {
    if (args.json) {
      console.log(JSON.stringify({ valid: true, errors: [] }, null, 2));
    } else {
      cliConsole.success(`✅ Configuration is valid: ${args.config}`);
    }
    process.exit(0);
  }

  const errors = result.error.issues.map((issue) => ({
    path: issue.path.join(".") || "root",
    message: issue.message,
    received: "received" in issue ? issue.received : undefined,
  }));

  if (args.json) {
    console.log(JSON.stringify({ valid: false, errors }, null, 2));
  } else {
    cliConsole.error(`❌ Configuration has ${errors.length} validation error(s):`);
    for (const err of errors) {
      cliConsole.error(`  ${err.path}: ${err.message}`);
    }
  }

  process.exit(2);
}

export const validateCommandConfig: CommandConfig<typeof validateCommandSchema> = {
  name: "validate",
  description: "Validates the local configuration file without connecting to Saleor",
  schema: validateCommandSchema,
  handler: validateHandler,
  requiresInteractive: false,
  examples: [
    "configurator validate",
    "configurator validate --config custom.yml",
    "configurator validate --json",
  ],
};
```

**Step 4: Register in `src/commands/index.ts`**

Add to the imports and `commands` array:

```typescript
// Add import:
import { validateCommandConfig } from "./validate";
export { validateCommandConfig } from "./validate";

// Add to commands array:
export const commands = [
  deployCommandConfig,
  diffCommandConfig,
  introspectCommandConfig,
  startCommandConfig,
  validateCommandConfig,  // <-- add this
];
```

**Step 5: Run test to verify it passes**

```bash
pnpm test src/commands/validate.test.ts
```
Expected: PASS

**Step 6: Smoke test manually**

```bash
# Valid config
pnpm dev validate --config config.yml

# JSON output
pnpm dev validate --config config.yml --json

# Invalid config (create a temp bad config)
echo "channels:\n  - name: 123" > /tmp/bad.yml
pnpm dev validate --config /tmp/bad.yml --json
```

**Step 7: Commit**

```bash
git add src/commands/validate.ts src/commands/validate.test.ts src/commands/index.ts
git commit -m "feat: add validate command for offline config validation"
```

---

## Task 5: `schema` Command

**Goal:** `configurator schema` outputs the full JSON Schema for `config.yml`, derived from the Zod schema at runtime. Supports `--output file.json` to save to disk.

**Files:**
- Create: `src/commands/schema.ts`
- Modify: `src/commands/index.ts` — register the command
- Test: `src/commands/schema.test.ts`

---

**Step 1: Write the failing test**

Create `src/commands/schema.test.ts`:

```typescript
import { describe, expect, it, vi, afterEach } from "vitest";
import { schemaHandler } from "./schema";

vi.mock("node:fs", () => ({
  writeFileSync: vi.fn(),
}));

vi.mock("../cli/console", () => ({
  cliConsole: { success: vi.fn(), error: vi.fn() },
}));

describe("schemaHandler", () => {
  const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
  const mockProcessExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

  afterEach(() => vi.clearAllMocks());

  it("outputs valid JSON Schema to stdout when no --output flag", async () => {
    await schemaHandler({ output: undefined });

    expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    const output = JSON.parse(mockConsoleLog.mock.calls[0][0]);
    expect(output.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(output.properties).toBeDefined();
    // Should have top-level config keys
    expect(output.properties.channels).toBeDefined();
    expect(output.properties.shop).toBeDefined();
    expect(output.properties.productTypes).toBeDefined();
  });

  it("writes JSON Schema to file when --output is specified", async () => {
    const { writeFileSync } = await import("node:fs");
    await schemaHandler({ output: "schema.json" });

    expect(vi.mocked(writeFileSync)).toHaveBeenCalledWith(
      "schema.json",
      expect.stringContaining('"$schema"'),
      "utf8"
    );
    expect(mockConsoleLog).not.toHaveBeenCalled(); // no stdout output
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test src/commands/schema.test.ts
```
Expected: FAIL — module not found.

**Step 3: Create `src/commands/schema.ts`**

This is essentially a CLI wrapper around the existing `scripts/generate-json-schema.ts` logic:

```typescript
import { writeFileSync } from "node:fs";
import { z } from "zod";
import { cliConsole } from "../cli/console";
import type { CommandConfig } from "../cli/command";
import { configSchema } from "../modules/config/schema/schema";

const schemaCommandSchema = z.object({
  output: z.string().optional().describe("Write schema to file instead of stdout"),
});

type SchemaCommandArgs = z.infer<typeof schemaCommandSchema>;

export async function schemaHandler(args: SchemaCommandArgs): Promise<void> {
  const jsonSchema = {
    ...z.toJSONSchema(configSchema),
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "Saleor Configurator Configuration Schema",
    description:
      "Schema for Saleor Configurator YAML configuration files. Defines all available fields, types, and validation rules.",
  };

  const output = JSON.stringify(jsonSchema, null, 2);

  if (args.output) {
    writeFileSync(args.output, output, "utf8");
    cliConsole.success(`Schema written to ${args.output}`);
  } else {
    console.log(output);
  }
}

export const schemaCommandConfig: CommandConfig<typeof schemaCommandSchema> = {
  name: "schema",
  description: "Outputs the JSON Schema for config.yml (for IDE autocompletion and validation)",
  schema: schemaCommandSchema,
  handler: schemaHandler,
  requiresInteractive: false,
  examples: [
    "configurator schema",
    "configurator schema --output schema.json",
    "configurator schema > schema.json",
  ],
};
```

**Step 4: Register in `src/commands/index.ts`**

```typescript
// Add import:
import { schemaCommandConfig } from "./schema";
export { schemaCommandConfig } from "./schema";

// Add to commands array:
export const commands = [
  deployCommandConfig,
  diffCommandConfig,
  introspectCommandConfig,
  startCommandConfig,
  validateCommandConfig,
  schemaCommandConfig,  // <-- add this
];
```

**Step 5: Run test to verify it passes**

```bash
pnpm test src/commands/schema.test.ts
```
Expected: PASS

**Step 6: Smoke test**

```bash
pnpm dev schema | head -20
pnpm dev schema --output /tmp/schema.json && head -5 /tmp/schema.json
```

**Step 7: Commit**

```bash
git add src/commands/schema.ts src/commands/schema.test.ts src/commands/index.ts
git commit -m "feat: add schema command to output JSON Schema for config.yml"
```

---

## Task 6: Structured `--plan --json` Output

**Goal:** `configurator deploy --plan --json` outputs a machine-readable plan with `summary`, `operations` (per entity), `validationErrors`, and `willDeleteEntities`. Agents can inspect this before committing to a deploy.

**Files:**
- Modify: `src/commands/deploy.ts` — `handlePlanMode` method
- Test: `src/commands/deploy.test.ts` — add test for structured plan JSON

---

**Step 1: Understand current `handlePlanMode` and `DiffResult`**

- `handlePlanMode` (line ~409): calls `formatJsonOutput(diffAnalysis.summary, args)` in JSON mode — this outputs `DiffSummary` counts but not individual operations.
- `DiffSummary.results` is `readonly DiffResult[]` — each has `operation`, `entityType`, `entityName`, `changes`.
- `DiffOperation` comes from `src/core/diff/types.ts`.

**Step 2: Write the failing test**

Add to `src/commands/deploy.test.ts`:

```typescript
describe("deploy --plan --json structured output", () => {
  it("includes operations array in plan JSON output", async () => {
    const mockDiff = {
      summary: {
        totalChanges: 2,
        creates: 1,
        updates: 1,
        deletes: 0,
        results: [
          {
            operation: "CREATE",
            entityType: "channel",
            entityName: "default-channel",
            changes: undefined,
          },
          {
            operation: "UPDATE",
            entityType: "productType",
            entityName: "Tire",
            changes: [{ field: "name", from: "Old", to: "Tire" }],
          },
        ],
      },
      output: "",
      hasDestructiveOperations: false,
    };

    // Mock analyzeDifferences to return our diff
    const mockAnalyze = vi
      .spyOn(DeployCommandHandler.prototype as any, "analyzeDifferences")
      .mockResolvedValue(mockDiff);
    const mockValidate = vi
      .spyOn(DeployCommandHandler.prototype as any, "validateLocalConfiguration")
      .mockResolvedValue(undefined);

    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    const mockLog = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await deployHandler({
      url: "https://test.saleor.cloud/graphql/",
      token: "tok",
      config: "config.yml",
      quiet: false,
      json: true,
      plan: true,
      ci: true,
      verbose: false,
      failOnDelete: false,
      skipMedia: false,
      reportPath: undefined,
    });

    expect(mockLog).toHaveBeenCalled();
    const output = JSON.parse(mockLog.mock.calls[0][0]);
    expect(output.summary).toBeDefined();
    expect(output.operations).toBeDefined();
    expect(output.operations).toHaveLength(2);
    expect(output.operations[0]).toMatchObject({ entity: "channel", name: "default-channel", action: "create" });
    expect(output.willDeleteEntities).toBe(false);

    mockAnalyze.mockRestore();
    mockValidate.mockRestore();
    mockLog.mockRestore();
    mockExit.mockRestore();
  });
});
```

**Step 3: Run test to verify it fails**

```bash
pnpm test src/commands/deploy.test.ts -- -t "plan JSON"
```
Expected: FAIL — `output.operations` is undefined.

**Step 4: Add `formatPlanJsonOutput` method to `DeployCommandHandler`**

In `src/commands/deploy.ts`, add a new private method after `formatJsonOutput`:

```typescript
private formatPlanJsonOutput(
  diffAnalysis: { summary: DiffSummary; hasDestructiveOperations: boolean },
  args: DeployCommandArgs
): string {
  const { summary } = diffAnalysis;

  const operations = summary.results.map((result) => ({
    entity: result.entityType,
    name: result.entityName,
    action: result.operation.toLowerCase() as "create" | "update" | "delete" | "no_change",
    fields: result.changes?.map((c) => c.field) ?? [],
  }));

  const planOutput = {
    summary: {
      creates: summary.creates,
      updates: summary.updates,
      deletes: summary.deletes,
      noChange: summary.totalChanges === 0 ? 0 : summary.results.filter((r) => r.operation === "NO_CHANGE").length,
    },
    operations,
    validationErrors: [],
    willDeleteEntities: diffAnalysis.hasDestructiveOperations,
    configFile: args.config,
    saleorUrl: args.url,
  };

  return JSON.stringify(planOutput, null, 2);
}
```

**Step 5: Update `handlePlanMode` to use `formatPlanJsonOutput`**

Find `handlePlanMode` (line ~409) and update:

```typescript
private handlePlanMode(
  diffAnalysis: { summary: DiffSummary; hasDestructiveOperations: boolean },
  args: DeployCommandArgs
): never {
  if (args.json) {
    // Use structured plan output instead of the generic diff summary
    console.log(this.formatPlanJsonOutput(diffAnalysis, args));
  } else {
    this.displayDeploymentPreview(diffAnalysis.summary);
    this.console.muted("\n📋 Plan mode: No changes will be applied");
  }
  process.exit(diffAnalysis.summary.totalChanges > 0 ? 1 : EXIT_CODES.SUCCESS);
}
```

Note: Also update the `handlePlanMode` call site in `performDeploymentFlow` to pass `diffAnalysis` (it already has `hasDestructiveOperations`):
```typescript
// Before (line ~455):
if (args.plan) {
  this.handlePlanMode(diffAnalysis, args);
}
// diffAnalysis already has { summary, output, hasDestructiveOperations } — no change needed
```

**Step 6: Run test to verify it passes**

```bash
pnpm test src/commands/deploy.test.ts
```
Expected: PASS

**Step 7: Smoke test**

```bash
pnpm dev deploy --plan --json --url=$SALEOR_URL --token=$SALEOR_TOKEN 2>/dev/null | jq .
```
Expected: JSON with `summary`, `operations`, `willDeleteEntities` keys.

**Step 8: Run full suite and lint**

```bash
pnpm check:fix && pnpm build && pnpm test && pnpm check:ci
```

**Step 9: Commit**

```bash
git add src/commands/deploy.ts src/commands/deploy.test.ts
git commit -m "feat: structured JSON output for deploy --plan --json"
```

---

## Final Validation

After all tasks are complete, run the full quality gate:

```bash
pnpm check:fix && pnpm build && pnpm test && pnpm check:ci
```

Then create a changeset (this is a minor feature):

```bash
pnpm changeset
# Select: minor
# Summary: "Add AI-agent-friendly CLI improvements: env var credentials, auto-TTY detection, validate command, schema command, richer validation errors, structured plan output"
```

### Agent Smoke Test (end-to-end)

Verify the agent workflow works without any flags except `--json`:

```bash
export SALEOR_URL=https://your-store.saleor.cloud/graphql/
export SALEOR_TOKEN=your-token

# 1. Validate config (no network, no credentials needed)
pnpm dev validate --json

# 2. Get schema for reference
pnpm dev schema --output /tmp/saleor-schema.json

# 3. Inspect plan before deploying (no --ci needed, auto-detected)
pnpm dev deploy --plan --json

# 4. Deploy (no --ci needed)
pnpm dev deploy --json
```

All four commands should work without `--ci`, without `--url`/`--token` flags, and output clean JSON to stdout.
