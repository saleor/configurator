---
paths:
  - src/cli/**/*.ts
  - src/commands/**/*.ts
alwaysApply: false
---

# CLI Development Patterns

## Before You Start

Before implementing CLI commands or output, invoke the `implementing-cli-patterns` skill for comprehensive patterns.

## Stack

- **Commander.js**: CLI framework
- **chalk**: Colored output
- **ora**: Spinners
- **@inquirer/prompts**: Interactive prompts

## Message Types

Use the console module for consistent output:

```typescript
import { console } from '@/cli/console';

console.success('Deployed 5 categories');
console.error('Failed to connect');
console.warning('Skipping duplicate');
console.hint('Run `configurator diff` to preview');
console.info('Processing batch 2 of 10');
```

## Progress Patterns

### Spinner for Single Operations

```typescript
import ora from 'ora';

const spinner = ora('Fetching categories...').start();
try {
  const categories = await fetch();
  spinner.succeed(`Fetched ${categories.length} categories`);
} catch (error) {
  spinner.fail('Failed to fetch categories');
  throw error;
}
```

### Progress for Bulk Operations

```typescript
const progress = new BulkProgress(items.length, 'Deploying');
for (const item of items) {
  try {
    await deploy(item);
    progress.tick(true);
  } catch {
    progress.tick(false);
  }
}
progress.finish();
```

## Prompts

### Confirmation

```typescript
import { confirm } from '@inquirer/prompts';

const proceed = await confirm({
  message: 'This will overwrite config. Continue?',
  default: false,
});
```

### Selection

```typescript
import { select } from '@inquirer/prompts';

const mode = await select({
  message: 'Deployment mode:',
  choices: [
    { name: 'Full', value: 'full' },
    { name: 'Incremental', value: 'incremental' },
  ],
});
```

## Exit Codes

```typescript
const ExitCodes = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  VALIDATION_ERROR: 2,
  NETWORK_ERROR: 3,
  AUTH_ERROR: 4,
} as const;
```

## Command Structure

```typescript
import { Command } from 'commander';

export const diffCommand = new Command('diff')
  .description('Compare local config with remote')
  .option('--json', 'Output as JSON')
  .option('--fail-on-delete', 'Exit with error if deletions detected')
  .action(async (options) => {
    // Implementation
  });
```

## CLI Checklist

- [ ] Consistent color coding (green=success, red=error, yellow=warning)
- [ ] Progress feedback for operations >1 second
- [ ] Confirm destructive operations
- [ ] Helpful error messages with suggestions
- [ ] Exit codes for CI/CD integration

**Required Skill**: `implementing-cli-patterns` (invoke before implementation)
