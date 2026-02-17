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

| Method | Color | Prefix | Use For |
|--------|-------|--------|---------|
| `error()` | Red | x | Error messages |
| `success()` | Green | check | Success confirmations |
| `warning()` | Yellow | warn | Warnings, degraded results |
| `hint()` | Cyan | bulb | Actionable suggestions |
| `important()` | Bold | - | Key information |
| `info()` | Blue | i | Informational messages |
| `code()` | Gray bg | - | Code/command snippets |

Import: `import { console } from '@/cli/console';`

## Progress Indicators

- **Single operations**: Use `ora` spinner with `.start()`, `.succeed()`, `.fail()`
- **Bulk operations**: Use `BulkOperationProgress` from `src/cli/progress.ts` for progress bars with success/failure tracking

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

- `{baseDir}/src/cli/console.ts` - Console module
- `{baseDir}/src/cli/progress.ts` - Progress tracking
- `{baseDir}/src/cli/reporters/` - Reporter implementations
- [references/reporter-patterns.md](references/reporter-patterns.md) - Full reporter code
- [references/prompt-patterns.md](references/prompt-patterns.md) - Full prompt examples

## Related Skills

- **Complete entity workflow**: See `adding-entity-types` for CLI integration patterns
- **Error handling**: See `reviewing-typescript-code` for error message standards

## Quick Reference Rule

For a condensed quick reference, see `.claude/rules/cli-development.md` (automatically loaded when editing `src/cli/**/*.ts` and `src/commands/**/*.ts` files).
