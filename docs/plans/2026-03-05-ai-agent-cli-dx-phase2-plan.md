# AI Agent CLI DX — Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Configurator CLI fully machine-consumable with auto-JSON envelopes, hardened inputs, entity-scoped queries, and comprehensive agent documentation.

**Architecture:** A `JsonEnvelope` wraps all command output in non-TTY mode. A `JsonLogCollector` intercepts logger calls to embed logs in the envelope. Zod safe primitives validate inputs at schema boundaries. Report storage is restructured by command with readable naming.

**Tech Stack:** TypeScript, Zod v4, tslog, Vitest, Commander.js

---

## Task 1: Zod Safe Primitives

**Files:**
- Create: `src/lib/validation/safe-primitives.ts`
- Create: `src/lib/validation/safe-primitives.test.ts`
- Create: `src/lib/validation/index.ts`

**Step 1: Write failing tests**

```typescript
// src/lib/validation/safe-primitives.test.ts
import { describe, expect, it } from "vitest";
import { safePath, saleorUrl, safeString, safeIdentifier, safeToken } from "./safe-primitives";

describe("safePath", () => {
  it("normalizes paths", () => {
    expect(safePath().parse("./config.yml")).toBe("config.yml");
  });

  it("rejects path traversal", () => {
    expect(() => safePath().parse("../../etc/passwd")).toThrow();
  });

  it("rejects absolute paths outside CWD", () => {
    expect(() => safePath().parse("/etc/passwd")).toThrow();
  });

  it("allows paths within CWD", () => {
    expect(() => safePath().parse("configs/staging.yml")).not.toThrow();
  });
});

describe("saleorUrl", () => {
  it("accepts valid Saleor URLs", () => {
    expect(saleorUrl().parse("https://store.saleor.cloud/graphql/")).toBe(
      "https://store.saleor.cloud/graphql/"
    );
  });

  it("appends trailing slash if missing", () => {
    expect(saleorUrl().parse("https://store.saleor.cloud/graphql")).toBe(
      "https://store.saleor.cloud/graphql/"
    );
  });

  it("rejects non-HTTPS URLs", () => {
    expect(() => saleorUrl().parse("http://store.saleor.cloud/graphql/")).toThrow();
  });

  it("rejects URLs without /graphql endpoint", () => {
    expect(() => saleorUrl().parse("https://store.saleor.cloud/")).toThrow();
  });

  it("rejects URLs with query parameters", () => {
    expect(() => saleorUrl().parse("https://store.saleor.cloud/graphql/?admin=true")).toThrow();
  });
});

describe("safeString", () => {
  it("strips control characters", () => {
    expect(safeString().parse("hello\x00world\x1f")).toBe("helloworld");
  });

  it("preserves normal strings", () => {
    expect(safeString().parse("normal string")).toBe("normal string");
  });
});

describe("safeIdentifier", () => {
  it("rejects ? in identifiers", () => {
    expect(() => safeIdentifier().parse("slug?param=1")).toThrow();
  });

  it("rejects # in identifiers", () => {
    expect(() => safeIdentifier().parse("slug#fragment")).toThrow();
  });

  it("rejects % in identifiers", () => {
    expect(() => safeIdentifier().parse("slug%20encoded")).toThrow();
  });

  it("accepts valid slugs", () => {
    expect(safeIdentifier().parse("my-product-slug")).toBe("my-product-slug");
  });
});

describe("safeToken", () => {
  it("rejects empty tokens", () => {
    expect(() => safeToken().parse("")).toThrow();
  });

  it("rejects tokens with whitespace", () => {
    expect(() => safeToken().parse("token with spaces")).toThrow();
  });

  it("strips control characters from tokens", () => {
    expect(safeToken().parse("validtoken\n")).toBe("validtoken");
  });

  it("accepts valid tokens", () => {
    expect(safeToken().parse("YbE8g7ZNl0xyz")).toBe("YbE8g7ZNl0xyz");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test src/lib/validation/safe-primitives.test.ts`
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
// src/lib/validation/safe-primitives.ts
import path from "node:path";
import { z } from "zod/v4";

export function safePath() {
  return z
    .string()
    .transform((p) => path.normalize(p))
    .refine((p) => !p.includes(".."), "Path traversal not allowed")
    .refine(
      (p) => !path.isAbsolute(p) || p.startsWith(process.cwd()),
      "Path must be within working directory"
    );
}

export function saleorUrl() {
  return z
    .string()
    .url("Must be a valid URL")
    .refine((u) => u.startsWith("https://"), "Must use HTTPS")
    .refine(
      (u) => {
        const withoutQuery = u.split("?")[0].split("#")[0];
        return withoutQuery.endsWith("/graphql/") || withoutQuery.endsWith("/graphql");
      },
      "Must point to Saleor GraphQL endpoint"
    )
    .refine((u) => !u.includes("?") && !u.includes("#"), "URL must not contain query parameters or fragments")
    .transform((u) => (u.endsWith("/") ? u : u + "/"));
}

export function safeString() {
  return z.string().transform((s) => s.replace(/[\x00-\x1f\x7f]/g, ""));
}

export function safeIdentifier() {
  return z
    .string()
    .refine((s) => !/[?#%]/.test(s), "Identifier must not contain ?, #, or %")
    .pipe(safeString());
}

export function safeToken() {
  return z
    .string()
    .min(1, "Token is required")
    .refine((s) => !/\s/.test(s), "Token must not contain whitespace")
    .pipe(safeString());
}
```

```typescript
// src/lib/validation/index.ts
export { safePath, saleorUrl, safeString, safeIdentifier, safeToken } from "./safe-primitives";
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test src/lib/validation/safe-primitives.test.ts`
Expected: All PASS

**Step 5: Wire into baseCommandArgsSchema**

Modify: `src/cli/command.ts`
- Replace the `url` field's inline `validateSaleorUrl` transform with `saleorUrl()`
- Replace the `token` field with `safeToken()`
- Replace the `config` field with `safePath().default("config.yml")`
- Remove the now-unused `validateSaleorUrl` function

**Step 6: Run full test suite**

Run: `pnpm test`
Expected: All pass (some tests may need URL format adjustments if they use HTTP urls in tests)

**Step 7: Commit**

```bash
git add src/lib/validation/ src/cli/command.ts
git commit -m "feat: add Zod safe primitives for input hardening"
```

---

## Task 2: Report Naming & Directory Structure

**Files:**
- Modify: `src/core/deployment/report-storage.ts`
- Modify: `src/core/deployment/report-storage.test.ts` (or create if doesn't exist)

**Step 1: Write failing tests**

```typescript
// Tests for new naming functions
import { describe, expect, it } from "vitest";
import { extractStoreIdentifier, generateReportPath } from "./report-storage";

describe("extractStoreIdentifier", () => {
  it("extracts store ID from standard Saleor URL", () => {
    expect(extractStoreIdentifier("https://store-rzalldyg.saleor.cloud/graphql/")).toBe(
      "store-rzalldyg"
    );
  });

  it("extracts hostname for custom domains", () => {
    expect(extractStoreIdentifier("https://api.myshop.com/graphql/")).toBe("api.myshop.com");
  });

  it("returns 'unknown' for invalid URLs", () => {
    expect(extractStoreIdentifier("not-a-url")).toBe("unknown");
  });
});

describe("generateReportPath", () => {
  it("creates path with command subdirectory", () => {
    const result = generateReportPath("deploy", "https://store-rzalldyg.saleor.cloud/graphql/");
    expect(result).toMatch(/\.configurator\/reports\/deploy\/store-rzalldyg_\d{4}-\d{2}-\d{2}_\d{2}h\d{2}m\d{2}s\.json$/);
  });

  it("creates path for diff command", () => {
    const result = generateReportPath("diff", "https://store-rzalldyg.saleor.cloud/graphql/");
    expect(result).toContain("/reports/diff/");
  });

  it("uses readable time format", () => {
    const result = generateReportPath("deploy", "https://store-rzalldyg.saleor.cloud/graphql/");
    // Should contain HHhMMmSSs format, not HH-MM-SS
    expect(result).toMatch(/\d{2}h\d{2}m\d{2}s/);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test src/core/deployment/report-storage.test.ts`

**Step 3: Implement new naming functions**

Modify `src/core/deployment/report-storage.ts`:
- Add `extractStoreIdentifier(url: string): string` — parses hostname from URL
- Add `formatReadableTimestamp(): string` — returns `YYYY-MM-DD_HHhMMmSSs`
- Modify `generateReportFilename()` to accept command name and URL
- Update `resolveReportPath()` to use command-specific subdirectories
- Update `getReportsDirectory()` to accept optional command subdirectory
- Update `pruneOldReports()` to work per-subdirectory

**Step 4: Run tests**

Run: `pnpm test src/core/deployment/report-storage`
Expected: All PASS

**Step 5: Update callers**

Modify `src/commands/deploy.ts`: pass command name "deploy" and URL to report path generation.

**Step 6: Run full test suite**

Run: `pnpm test`
Expected: All pass

**Step 7: Commit**

```bash
git add src/core/deployment/report-storage.ts src/core/deployment/report-storage.test.ts src/commands/deploy.ts
git commit -m "feat: restructure report naming with store ID and command subdirs"
```

---

## Task 3: JSON Log Collector

**Files:**
- Create: `src/lib/json-log-collector.ts`
- Create: `src/lib/json-log-collector.test.ts`

**Step 1: Write failing tests**

```typescript
// src/lib/json-log-collector.test.ts
import { describe, expect, it } from "vitest";
import { JsonLogCollector, type LogEntry } from "./json-log-collector";

describe("JsonLogCollector", () => {
  it("collects log entries", () => {
    const collector = new JsonLogCollector();
    collector.add("info", "Starting deployment");
    collector.add("warn", "Rate limited");

    const logs = collector.getLogs();
    expect(logs).toHaveLength(2);
    expect(logs[0].level).toBe("info");
    expect(logs[0].message).toBe("Starting deployment");
    expect(logs[1].level).toBe("warn");
  });

  it("includes ISO timestamps", () => {
    const collector = new JsonLogCollector();
    collector.add("info", "test");

    const logs = collector.getLogs();
    expect(logs[0].ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns immutable copy", () => {
    const collector = new JsonLogCollector();
    collector.add("info", "first");

    const logs1 = collector.getLogs();
    collector.add("info", "second");
    const logs2 = collector.getLogs();

    expect(logs1).toHaveLength(1);
    expect(logs2).toHaveLength(2);
  });

  it("resets collected logs", () => {
    const collector = new JsonLogCollector();
    collector.add("info", "test");
    collector.reset();

    expect(collector.getLogs()).toHaveLength(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test src/lib/json-log-collector.test.ts`

**Step 3: Implement**

```typescript
// src/lib/json-log-collector.ts
export interface LogEntry {
  readonly level: "info" | "warn" | "error" | "debug";
  readonly ts: string;
  readonly message: string;
}

export class JsonLogCollector {
  private logs: LogEntry[] = [];

  add(level: LogEntry["level"], message: string): void {
    this.logs.push({
      level,
      ts: new Date().toISOString(),
      message,
    });
  }

  getLogs(): readonly LogEntry[] {
    return [...this.logs];
  }

  reset(): void {
    this.logs = [];
  }
}

export const globalLogCollector = new JsonLogCollector();
```

**Step 4: Run tests**

Run: `pnpm test src/lib/json-log-collector.test.ts`
Expected: All PASS

**Step 5: Hook into logger**

Modify `src/lib/logger.ts`:
- Import `globalLogCollector`
- Add a tslog transport or override that calls `globalLogCollector.add()` for each log event
- Only collect when `isNonInteractiveEnvironment()` is true (avoid memory use in TTY mode)

**Step 6: Run full test suite**

Run: `pnpm test`

**Step 7: Commit**

```bash
git add src/lib/json-log-collector.ts src/lib/json-log-collector.test.ts src/lib/logger.ts
git commit -m "feat: add JsonLogCollector for embedding logs in JSON envelope"
```

---

## Task 4: JSON Envelope Types & Builder

**Files:**
- Create: `src/lib/json-envelope.ts`
- Create: `src/lib/json-envelope.test.ts`

**Step 1: Write failing tests**

```typescript
// src/lib/json-envelope.test.ts
import { describe, expect, it } from "vitest";
import { buildEnvelope, type JsonEnvelope } from "./json-envelope";

describe("buildEnvelope", () => {
  it("builds envelope with all required fields", () => {
    const envelope = buildEnvelope({
      command: "deploy",
      exitCode: 0,
      result: { status: "success" },
    });

    expect(envelope.command).toBe("deploy");
    expect(envelope.exitCode).toBe(0);
    expect(envelope.result).toEqual({ status: "success" });
    expect(envelope.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(envelope.logs).toEqual([]);
    expect(envelope.errors).toEqual([]);
  });

  it("includes provided errors", () => {
    const envelope = buildEnvelope({
      command: "deploy",
      exitCode: 5,
      result: {},
      errors: [{ entity: "Categories/electronics", stage: "update", message: "Not found" }],
    });

    expect(envelope.errors).toHaveLength(1);
    expect(envelope.errors[0].entity).toBe("Categories/electronics");
  });

  it("collects logs from global collector", () => {
    // This test verifies integration with JsonLogCollector
    const envelope = buildEnvelope({
      command: "diff",
      exitCode: 0,
      result: {},
      logs: [{ level: "info", ts: "2026-03-05T09:30:00Z", message: "test" }],
    });

    expect(envelope.logs).toHaveLength(1);
  });
});

describe("JsonEnvelope type", () => {
  it("serializes to valid JSON", () => {
    const envelope = buildEnvelope({
      command: "validate",
      exitCode: 0,
      result: { valid: true, errors: [] },
    });

    const json = JSON.stringify(envelope, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed.command).toBe("validate");
  });
});
```

**Step 2: Run tests to verify they fail**

**Step 3: Implement**

```typescript
// src/lib/json-envelope.ts
import packageJson from "../../package.json";
import { globalLogCollector, type LogEntry } from "./json-log-collector";

export interface EnvelopeError {
  readonly entity?: string;
  readonly stage?: string;
  readonly message: string;
}

export interface JsonEnvelope<T = unknown> {
  readonly command: string;
  readonly version: string;
  readonly exitCode: number;
  readonly result: T;
  readonly logs: readonly LogEntry[];
  readonly errors: readonly EnvelopeError[];
}

export function buildEnvelope<T>(options: {
  command: string;
  exitCode: number;
  result: T;
  logs?: readonly LogEntry[];
  errors?: readonly EnvelopeError[];
}): JsonEnvelope<T> {
  return {
    command: options.command,
    version: packageJson.version,
    exitCode: options.exitCode,
    result: options.result,
    logs: options.logs ?? globalLogCollector.getLogs(),
    errors: options.errors ?? [],
  };
}

export function outputEnvelope<T>(envelope: JsonEnvelope<T>): void {
  console.log(JSON.stringify(envelope, null, 2));
}
```

**Step 4: Run tests**

Run: `pnpm test src/lib/json-envelope.test.ts`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/lib/json-envelope.ts src/lib/json-envelope.test.ts
git commit -m "feat: add JSON envelope builder for structured CLI output"
```

---

## Task 5: Auto-JSON Detection

**Files:**
- Modify: `src/cli/command.ts`
- Modify: `src/cli/command.test.ts`

**Step 1: Write failing tests**

Add to `src/cli/command.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { shouldOutputJson } from "./command";

describe("shouldOutputJson", () => {
  it("returns true when --json flag is set", () => {
    expect(shouldOutputJson({ json: true })).toBe(true);
  });

  it("returns false when --text flag is set even in non-TTY", () => {
    expect(shouldOutputJson({ text: true })).toBe(false);
  });

  it("returns true in non-TTY when no explicit flag", () => {
    // Test environment is non-TTY, so this should be true
    expect(shouldOutputJson({})).toBe(true);
  });
});
```

**Step 2: Run tests to verify they fail**

**Step 3: Implement**

Add to `src/cli/command.ts`:

```typescript
import { isNonInteractiveEnvironment } from "../lib/ci-mode";

export function shouldOutputJson(args: { json?: boolean; text?: boolean }): boolean {
  if (args.text === true) return false;
  if (args.json === true) return true;
  return isNonInteractiveEnvironment();
}
```

Add `text` flag to `baseCommandArgsSchema`:

```typescript
text: z.boolean().default(false).describe("Force human-readable output even in non-TTY mode"),
```

**Step 4: Run tests**

Run: `pnpm test src/cli/command.test.ts`

**Step 5: Commit**

```bash
git add src/cli/command.ts src/cli/command.test.ts
git commit -m "feat: add auto-JSON detection with --text escape hatch"
```

---

## Task 6: Diff Command — Envelope + Entity Scoping

**Files:**
- Modify: `src/commands/diff.ts`
- Modify: `src/commands/diff.test.ts` (or the existing test file)
- Create: `src/core/diff/entity-filter.ts`
- Create: `src/core/diff/entity-filter.test.ts`

**Step 1: Write entity filter tests**

```typescript
// src/core/diff/entity-filter.test.ts
import { describe, expect, it } from "vitest";
import { filterDiffResults } from "./entity-filter";
import type { DiffSummary } from "./types";

const mockSummary: DiffSummary = {
  totalChanges: 3,
  creates: 1,
  updates: 1,
  deletes: 1,
  results: [
    { operation: "CREATE", entityType: "Categories", entityName: "electronics", changes: [] },
    { operation: "UPDATE", entityType: "Product Types", entityName: "T-Shirt", changes: [{ field: "name", currentValue: "Old", desiredValue: "New" }] },
    { operation: "DELETE", entityType: "Categories", entityName: "old-stuff", changes: [] },
  ],
};

describe("filterDiffResults", () => {
  it("filters by entity type", () => {
    const filtered = filterDiffResults(mockSummary, { entityType: "Categories" });
    expect(filtered.results).toHaveLength(2);
    expect(filtered.totalChanges).toBe(2);
    expect(filtered.creates).toBe(1);
    expect(filtered.deletes).toBe(1);
    expect(filtered.updates).toBe(0);
  });

  it("filters by specific entity (Type/name)", () => {
    const filtered = filterDiffResults(mockSummary, { entity: "Categories/electronics" });
    expect(filtered.results).toHaveLength(1);
    expect(filtered.results[0].entityName).toBe("electronics");
  });

  it("returns full summary when no filter", () => {
    const filtered = filterDiffResults(mockSummary, {});
    expect(filtered.totalChanges).toBe(3);
  });

  it("returns empty summary for non-matching filter", () => {
    const filtered = filterDiffResults(mockSummary, { entityType: "Warehouses" });
    expect(filtered.totalChanges).toBe(0);
    expect(filtered.results).toHaveLength(0);
  });
});
```

**Step 2: Run tests to verify they fail**

**Step 3: Implement entity filter**

```typescript
// src/core/diff/entity-filter.ts
import type { DiffResult, DiffSummary } from "./types";

export interface EntityFilterOptions {
  entityType?: string;
  entity?: string;
}

export function filterDiffResults(
  summary: DiffSummary,
  options: EntityFilterOptions
): DiffSummary {
  if (!options.entityType && !options.entity) return summary;

  let filtered: DiffResult[];

  if (options.entity) {
    const [type, ...nameParts] = options.entity.split("/");
    const name = nameParts.join("/");
    filtered = summary.results.filter(
      (r) => r.entityType === type && r.entityName === name
    );
  } else {
    filtered = summary.results.filter((r) => r.entityType === options.entityType);
  }

  return {
    totalChanges: filtered.length,
    creates: filtered.filter((r) => r.operation === "CREATE").length,
    updates: filtered.filter((r) => r.operation === "UPDATE").length,
    deletes: filtered.filter((r) => r.operation === "DELETE").length,
    results: filtered,
  };
}
```

**Step 4: Run entity filter tests**

Run: `pnpm test src/core/diff/entity-filter.test.ts`

**Step 5: Add schema flags and envelope to diff command**

Modify `src/commands/diff.ts`:
- Add `entityType: z.string().optional()` and `entity: z.string().optional()` to schema
- Add `text: z.boolean().default(false)` to schema
- Import `shouldOutputJson` from command.ts
- Import `buildEnvelope`, `outputEnvelope` from json-envelope
- Import `filterDiffResults` from entity-filter
- In the handler, after computing diff:
  1. Apply entity filter if flags present
  2. If `shouldOutputJson(args)`, build and output envelope instead of formatted text
  3. Else use existing formatOutput flow

**Step 6: Write diff envelope tests**

Add tests to diff test file verifying:
- JSON envelope output when `json: true`
- Entity type filtering works end-to-end
- Entity scoping works end-to-end
- Envelope contains correct command name, exit code

**Step 7: Run full test suite**

Run: `pnpm test`

**Step 8: Commit**

```bash
git add src/core/diff/entity-filter.ts src/core/diff/entity-filter.test.ts src/commands/diff.ts src/commands/diff.test.ts
git commit -m "feat: add entity-scoped queries and JSON envelope to diff command"
```

---

## Task 7: Deploy Command — Envelope Integration

**Files:**
- Modify: `src/commands/deploy.ts`
- Modify: `src/commands/deploy.test.ts`

**Step 1: Write failing tests**

Add to deploy test file:

```typescript
describe("deploy JSON envelope", () => {
  it("outputs envelope in non-TTY JSON mode", async () => {
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Mock shouldOutputJson to return true
    // Run deploy with plan mode to avoid actual deployment
    await expect(
      deployHandler(createDefaultArgs({ plan: true, json: true }))
    ).rejects.toThrow("process.exit");

    const output = consoleLogSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);

    expect(parsed.command).toBe("deploy");
    expect(parsed.version).toBeDefined();
    expect(parsed.exitCode).toBeDefined();
    expect(parsed.result).toBeDefined();
    expect(parsed.logs).toBeInstanceOf(Array);
    expect(parsed.errors).toBeInstanceOf(Array);

    consoleLogSpy.mockRestore();
  });
});
```

**Step 2: Run tests to verify they fail**

**Step 3: Implement**

Modify `src/commands/deploy.ts`:
- Import `buildEnvelope`, `outputEnvelope`, `shouldOutputJson`
- Import `globalLogCollector`
- In plan mode JSON output: wrap existing plan data in envelope
- In deployment complete: wrap report data in envelope
- In error handlers: include errors in envelope
- Reset `globalLogCollector` at start of handler
- Save report file AND output envelope (both happen)

Key changes to `formatPlanJsonOutput`:
```typescript
private formatPlanJsonOutput(diffAnalysis, args): void {
  const result = {
    status: "plan" as const,
    summary: { creates, updates, deletes, noChange: 0 },
    operations,
    willDeleteEntities: diffAnalysis.hasDestructiveOperations,
    configFile: args.config,
    saleorUrl: args.url,
  };

  outputEnvelope(buildEnvelope({
    command: "deploy",
    exitCode: diffAnalysis.summary.totalChanges > 0 ? 1 : 0,
    result,
  }));
}
```

**Step 4: Run tests**

Run: `pnpm test src/commands/deploy.test.ts`

**Step 5: Run full suite**

Run: `pnpm test`

**Step 6: Commit**

```bash
git add src/commands/deploy.ts src/commands/deploy.test.ts
git commit -m "feat: add JSON envelope output to deploy command"
```

---

## Task 8: Introspect Command — Envelope Integration

**Files:**
- Modify: `src/commands/introspect.ts`
- Modify or create: `src/commands/introspect.test.ts`

**Step 1: Write failing tests**

```typescript
describe("introspect JSON envelope", () => {
  it("outputs envelope with summary and configPath", async () => {
    // Mock configurator and diff service
    // Run introspect with json flag
    // Parse console.log output
    // Verify envelope shape: { command: "introspect", result: { summary, operations, configPath } }
  });
});
```

**Step 2: Implement**

Modify `src/commands/introspect.ts`:
- Import `shouldOutputJson`, `buildEnvelope`, `outputEnvelope`
- Add `text: z.boolean().default(false)` to schema
- In the output flow, when `shouldOutputJson(args)`:
  - Build envelope with `command: "introspect"`
  - `result.summary` = diff summary counts
  - `result.operations` = diff results mapped to operation format
  - `result.configPath` = the config file path that was written
  - Output envelope instead of formatted diff

**Step 3: Run tests**

Run: `pnpm test src/commands/introspect`

**Step 4: Add report saving for introspect**

Wire `generateReportPath("introspect", args.url)` to save introspect reports alongside deploy reports.

**Step 5: Run full suite and commit**

```bash
git add src/commands/introspect.ts src/commands/introspect.test.ts
git commit -m "feat: add JSON envelope output to introspect command"
```

---

## Task 9: Validate Command — Envelope Integration

**Files:**
- Modify: `src/commands/validate.ts`
- Modify: `src/commands/validate.test.ts`

**Step 1: Write failing tests**

```typescript
describe("validate JSON envelope", () => {
  it("outputs envelope for valid config", async () => {
    // Write valid config, run validate with json
    // Verify: { command: "validate", exitCode: 0, result: { valid: true, errors: [] } }
  });

  it("outputs envelope for invalid config", async () => {
    // Write invalid config, run validate with json
    // Verify: { command: "validate", exitCode: 2, result: { valid: false, errors: [...] } }
  });
});
```

**Step 2: Implement**

Modify `src/commands/validate.ts`:
- Import `shouldOutputJson`, `buildEnvelope`, `outputEnvelope`
- Add `text: z.boolean().default(false)` to schema
- Wrap existing JSON output in envelope format
- The `result` shape stays the same: `{ valid, errors }`

**Step 3: Run tests and commit**

```bash
git add src/commands/validate.ts src/commands/validate.test.ts
git commit -m "feat: add JSON envelope output to validate command"
```

---

## Task 10: AGENTS.md

**Files:**
- Create: `AGENTS.md`

**Step 1: Write AGENTS.md**

Create `AGENTS.md` at package root with:
- Quick reference (commands, exit codes, safety rules)
- JSON envelope format documentation with parsing examples
- Credentials setup (.env.local)
- Optimal workflow sequence
- Entity-scoped drill-down for debugging
- Exit code decision tree

Reference the design doc Section 5 for exact content.

**Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs: add AGENTS.md for AI agent integration guide"
```

---

## Task 11: Plugin Overhaul

**Files:**
- Modify: `plugin/skills/configurator-cli/SKILL.md`
- Modify: `plugin/skills/configurator-cli/references/error-codes.md`
- Modify: `plugin/skills/configurator-cli/references/commands.md`
- Modify: `plugin/skills/configurator-cli/references/flags.md`
- Modify: `plugin/agents/troubleshoot.md`
- Create: `plugin/skills/agent-output-parsing/SKILL.md`
- Create: `plugin/agents/configurator-expert.md`
- Create: `plugin/hooks/pre-deploy-safety.sh` (or `.md` depending on plugin hook format)

**Step 1: Fix configurator-cli skill**

Update `plugin/skills/configurator-cli/SKILL.md`:
- Fix exit codes: 2=auth, 3=network, 4=validation, 5=partial, 6=deletion-blocked, 7=breaking-blocked
- Change `SALEOR_API_URL` → `SALEOR_URL`
- Add `validate` and `schema` commands
- Replace `--dry-run` → `--plan` / `--plan --json`
- Add JSON envelope documentation
- Add auto-JSON behavior in non-TTY
- Add entity-scoped queries (`--entity`, `--entity-type`)
- Add `.env.local` auto-loading
- Replace `npx configurator` with `pnpm dlx @saleor/configurator` (or whichever is canonical)

**Step 2: Fix error-codes.md reference**

Update exit codes table to match actual values.

**Step 3: Fix commands.md and flags.md references**

Add new commands and flags.

**Step 4: Update troubleshoot agent**

Replace python/curl diagnostic commands with:
```bash
pnpm dev validate --json    # Parse envelope for config errors
pnpm dev diff --entity "Type/name" --json  # Drill into specific failure
# Read .configurator/reports/deploy/ for last deployment report
```

Add envelope parsing to the diagnostic framework.

**Step 5: Create agent-output-parsing skill**

Create `plugin/skills/agent-output-parsing/SKILL.md`:
- Envelope structure documentation
- Exit code decision tree
- Drill-down pattern with entity-scoped queries
- Examples for each command's result shape

**Step 6: Create configurator-expert agent**

Create `plugin/agents/configurator-expert.md`:
- Knows optimal sequence: validate → diff → plan → deploy
- Parses JSON envelopes natively
- Handles failures by drilling down with --entity
- Uses report files for context

**Step 7: Create pre-deploy-safety hook**

Hook that detects deploy commands and warns if no diff was run in the session.

**Step 8: Commit**

```bash
git add plugin/
git commit -m "feat: overhaul plugin with corrected facts and new agent capabilities"
```

---

## Validation Checklist

After all tasks complete:

```bash
pnpm check:fix
pnpm build
pnpm test
npx tsc --noEmit
pnpm check:ci
```

## E2E Smoke Test

```bash
# Credentials from .env.local (auto-loaded)

# 1. Validate config (should output envelope to stdout since non-TTY)
pnpm dev validate

# 2. Introspect (should output envelope)
rm -f config.yml
pnpm dev introspect

# 3. Validate fresh config
pnpm dev validate

# 4. Diff with entity scoping
pnpm dev diff --entity-type Categories

# 5. Deploy plan
pnpm dev deploy --plan

# 6. Check reports directory
ls -la .configurator/reports/
```
