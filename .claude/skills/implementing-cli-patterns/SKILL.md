---
name: implementing-cli-patterns
description: "Implements CLI UX with output formatting, progress indicators, and prompts. Use when working on CLI output, chalk styling, ora spinners, inquirer prompts, progress bars, reporters, error formatting, or exit codes."
allowed-tools: "Read, Grep, Glob, Write, Edit"
metadata:
  author: Ollie Shop
  version: 1.0.0
compatibility: "Claude Code with Node.js >=20, pnpm, TypeScript 5.5+"
---

# CLI User Experience Patterns

## Overview

Implement consistent, user-friendly CLI interactions using the project's console module, progress tracking, and reporter patterns. All CLI output should go through `src/cli/console.ts` rather than raw `console.log`.

## When to Use

- Implementing command output formatting
- Adding progress indicators for operations
- Creating interactive user prompts
- Formatting error messages for the terminal
- Designing reporter output for deploy/diff results
- **Not for**: Business logic, GraphQL operations, or service layer code

## CLI Stack

| Tool | Purpose | Location |
|------|---------|----------|
| **chalk** | Colored terminal output | Via `src/cli/console.ts` |
| **ora** | Spinner/progress indicators | `src/cli/progress.ts` |
| **@inquirer/prompts** | Interactive user prompts | Commands layer |
| **tslog** | Structured logging | Internal logging |

## Console Module

Located in `src/cli/console.ts`. Always use this instead of raw `console.log`:

### Output Methods (respect quiet mode)

| Method | Color | Use For |
|--------|-------|---------|
| `hint(msg)` | Gray | Actionable suggestions |
| `info(msg)` | White | Informational messages |
| `warn(msg)` | Yellow | Warnings, degraded results |
| `success(msg)` | Green | Success confirmations |
| `header(msg)` | Bold white | Section headers |
| `subtitle(msg)` | Bold (no color) | Subsection headers |
| `text(msg)` | Plain (no color) | Unformatted output |
| `muted(msg)` | Gray | Less important info |
| `cancelled(msg)` | Red | Cancelled operations |
| `code(msg)` | Cyan | Code/command snippets |
| `important(msg)` | Bold | Key information |
| `field(name, val)` | Bold label + normal value | Key-value display |
| `separator(char?, len?)` | Gray | Decorative line (default `─` × 50) |
| `box(lines[], title?)` | Gray borders | Boxed content with optional title |

### Always-Output Methods (ignore quiet mode)

| Method | Color | Use For |
|--------|-------|---------|
| `error(error)` | Red | Error messages (accepts `Error \| string`) |
| `status(msg)` | Plain (no color) | Status messages that must always display |

### Inline Formatters (return string, don't log)

| Method | Color | Use For |
|--------|-------|---------|
| `path(p)` | Yellow | File/URL paths |
| `value(v)` | Cyan | Highlighted values |
| `type(t)` | White | Type names |
| `icon(name)` | Emoji | Icons: `error`, `warning`, `info`, `success`, `fix` |
| `prompt(msg)` | Cyan → stdout | Interactive prompt text (writes to stdout) |

Import: `import { cliConsole } from '@/cli/console';`

## Output Layers: When to Use What

The codebase has two output systems. Using the wrong one is a common mistake.

| Layer | Tool | Purpose | Visibility |
|-------|------|---------|------------|
| **User output** | `cliConsole.*` | Messages the user needs to see | Always (terminal) |
| **Internal logging** | `logger.*` | Debug/diagnostic info for developers | Only with `LOG_LEVEL=debug` |
| **Progress** | `cliConsole.progress.*` | Spinners and bulk operation tracking | Terminal only (suppressed in CI) |

### Decision Guide

| Scenario | Use | Why |
|----------|-----|-----|
| Operation succeeded | `cliConsole.success()` | User needs confirmation |
| Operation failed (user can fix) | `cliConsole.error()` | User needs to take action |
| Unexpected error (debugging) | `logger.error()` + `cliConsole.error()` | User sees friendly msg, logs get details |
| Config validation failed | `cliConsole.warn()` or `cliConsole.error()` | User needs to fix config |
| Operation started/completed | `logger.debug()` | Internal metrics, not user-relevant |
| Rate limit hit, retrying | `logger.info()` | Internal; retry exchange handles automatically |
| GraphQL response received | `logger.debug()` | Too noisy for users |
| Deployment stage starting | `logger.info()` | Internal tracking |
| Deployment stage result | `cliConsole.success/warn` via reporter | User sees summary |

### Anti-Patterns

| Anti-Pattern | Fix |
|-------------|-----|
| `console.log()` anywhere | Use `cliConsole` methods |
| `cliConsole.info()` for debug details | Use `logger.debug()` |
| `logger.error()` without `cliConsole.error()` | User doesn't see the error |
| `cliConsole.success()` for every small step | Noisy; use spinner updates instead |

### CI Mode

`isCiOutputMode()` from `src/lib/ci-mode.ts` returns `true` for `--json`, `--github-comment`, `--githubComment` flags.

When CI mode is active:
- Progress reporters become `SilentProgressReporter` (all methods are no-ops)
- Logger is suppressed to `fatal` level
- `cliConsole.error()` and `cliConsole.status()` always output (ignore quiet mode)
- All other `cliConsole` methods respect quiet mode setting

## Progress Indicators

- **Single operations**: Use `cliConsole.progress` (`ProgressReporter` interface) with `.start()`, `.update()`, `.succeed()`, `.fail()`, `.info()`, `.warn()`
- **Bulk operations**: Use `BulkOperationProgress` from `src/cli/progress.ts`

### BulkOperationProgress API

```typescript
import { BulkOperationProgress } from '@/cli/progress';

const progress = new BulkOperationProgress(
  total,              // Total number of items
  'Creating products', // Operation label
  cliConsole.progress  // ProgressReporter instance
);

progress.start();                       // Shows "Creating products (0/50)"
progress.increment('iPhone 15');        // Shows "Creating products (1/50): iPhone 15"
progress.addFailure('Bad Item', error); // Records failure (doesn't stop)
progress.complete();                    // Shows success or failure summary
progress.hasFailures();                 // Check if any failures occurred
progress.getFailures();                 // Get failure details
```

## Interactive Prompts

Available prompt types from `@inquirer/prompts`:

| Prompt | Import | Use For |
|--------|--------|---------|
| `confirm` | `@inquirer/prompts` | Yes/no decisions, destructive action guards |
| `select` | `@inquirer/prompts` | Single choice from options |
| `checkbox` | `@inquirer/prompts` | Multi-select (e.g., entity selection) |
| `input` | `@inquirer/prompts` | Text input with validation |
| `password` | `@inquirer/prompts` | Masked input for tokens/secrets |

See [references/prompt-patterns.md](references/prompt-patterns.md) for full examples.

## Reporter Patterns

Three main reporters in `src/cli/reporters/`:

| Reporter | Purpose | Key Output |
|----------|---------|------------|
| `deployment-reporter` | Deploy results | Table with created/updated/deleted/failed counts |
| `diff reporter` | Diff results | `+` create (green), `~` update (blue), `-` delete (red) |
| `duplicate reporter` | Validation issues | Duplicate identifiers with locations |

See [references/reporter-patterns.md](references/reporter-patterns.md) for full implementations.

## Error Message Formatting

Two error formatters in the project:

- **`formatError(error: BaseError)`**: General errors with code, context, and suggestions
- **`formatGraphQLError(error: GraphQLError)`**: GraphQL-specific with operation name and path

Pattern: Show error message, then optional code/context in gray, then actionable suggestions via `console.hint()`.

## Exit Codes

```typescript
export const ExitCodes = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  VALIDATION_ERROR: 2,
  NETWORK_ERROR: 3,
  AUTH_ERROR: 4,
  CONFLICT_ERROR: 5,
} as const;
```

Always use named exit codes, never raw numbers.

## Command Development

Commands use `CommandConfig` from `src/cli/command.ts` with Zod schemas for automatic CLI option generation.

### CommandConfig Pattern

```typescript
import { createCommand, baseCommandArgsSchema } from '@/cli/command';

const myCommandSchema = baseCommandArgsSchema.extend({
  dryRun: z.boolean().default(false).describe('Preview changes without applying'),
  format: z.enum(['table', 'json']).default('table').describe('Output format'),
});

export const myCommand = createCommand({
  name: 'my-command',
  description: 'Does something useful',
  schema: myCommandSchema,
  requiresInteractive: true, // Prompts for --url/--token if missing
  examples: ['pnpm dev my-command --url https://... --token ...'],
  handler: async (args) => {
    // args is fully typed from z.infer<typeof myCommandSchema>
  },
});
```

**How it works**: `createCommand()` iterates the Zod schema shape and generates Commander.js `--options` automatically. Boolean fields become flags, strings become `--key <value>`. If `requiresInteractive: true` and `--url`/`--token` are missing, the user gets interactive prompts.

### Subcommand Pattern

For commands with subcommands (e.g., `config get`, `config set`), use Commander.js `Command` directly:

```typescript
const parentCommand = new Command().name('config').description('Manage configuration');
parentCommand.addCommand(createCommand({ ... }));
```

### Base Command Args

All commands extend `baseCommandArgsSchema` which provides: `--url` (Saleor URL, auto-appends `/graphql/`), `--token` (API token), `--config` (config file, default `config.yml`), `--quiet` (suppress output).

## Best Practices

- Use `src/cli/console.ts` for all output (never raw `console.log`)
- Provide progress feedback for any operation over ~1 second
- Include actionable suggestions with every error message
- Confirm destructive operations with `confirm` prompt
- Support non-interactive mode (skip prompts in CI/headless)
- Use consistent color semantics (green=success, red=error, yellow=warning)

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using raw `console.log` | Import and use `console` from `@/cli/console` |
| Missing progress feedback | Add `ora` spinner for any async operation |
| Raw exit codes (`process.exit(1)`) | Use `ExitCodes.GENERAL_ERROR` constants |
| Blocking prompts in CI | Check for `--yes` flag or `CI` env var to skip prompts |
| No suggestions on errors | Always add `console.hint()` with next steps |
| Debug output in production | Use `tslog` with appropriate log levels |

## References

- `src/cli/console.ts` - Console module (18 methods)
- `src/cli/progress.ts` - Progress tracking (ProgressReporter, BulkOperationProgress)
- `src/cli/command.ts` - Command creation with Zod schema auto-generation
- `src/cli/reporters/` - Reporter implementations
- `src/lib/ci-mode.ts` - CI output mode detection
- `src/lib/logger.ts` - Internal structured logging (tslog)
- [references/reporter-patterns.md](references/reporter-patterns.md) - Full reporter code
- [references/prompt-patterns.md](references/prompt-patterns.md) - Full prompt examples

## Related Skills

- **Complete entity workflow**: See `adding-entity-types` for CLI integration patterns
- **Error handling**: See `reviewing-typescript-code` for error message standards
- **Diff output formatting**: See `diff-engine-development` for diff formatters and output

## Quick Reference Rule

For a condensed quick reference, see `.claude/rules/cli-development.md` (automatically loaded when editing `src/cli/**/*.ts` and `src/commands/**/*.ts` files).
