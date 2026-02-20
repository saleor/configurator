# Reporter Patterns

Detailed implementations of CLI reporters used throughout the project.

## Deployment Result Reporter

Located in `src/cli/reporters/deployment-reporter.ts`:

```typescript
export interface DeploymentResult {
  entity: string;
  created: number;
  updated: number;
  deleted: number;
  failed: number;
  duration: number;
}

export const reportDeploymentResults = (results: DeploymentResult[]): void => {
  cliConsole.text('');
  console.important('Deployment Summary');
  cliConsole.text('-'.repeat(60));

  const headers = ['Entity', 'Created', 'Updated', 'Deleted', 'Failed', 'Time'];
  cliConsole.text(formatTableRow(headers));
  cliConsole.text('-'.repeat(60));

  for (const result of results) {
    const row = [
      result.entity,
      chalk.green(String(result.created)),
      chalk.blue(String(result.updated)),
      chalk.yellow(String(result.deleted)),
      result.failed > 0 ? chalk.red(String(result.failed)) : '0',
      `${result.duration}ms`,
    ];
    cliConsole.text(formatTableRow(row));
  }

  cliConsole.text('-'.repeat(60));

  const totals = results.reduce(
    (acc, r) => ({
      created: acc.created + r.created,
      updated: acc.updated + r.updated,
      deleted: acc.deleted + r.deleted,
      failed: acc.failed + r.failed,
    }),
    { created: 0, updated: 0, deleted: 0, failed: 0 }
  );

  if (totals.failed > 0) {
    console.warning(`Completed with ${totals.failed} failures`);
  } else {
    console.success('Deployment completed successfully');
  }
};
```

## Diff Reporter

```typescript
export const reportDiff = (diffs: DiffResult[]): void => {
  for (const diff of diffs) {
    switch (diff.action) {
      case 'create':
        cliConsole.text(chalk.green(`+ ${diff.entity}: ${diff.identifier}`));
        break;
      case 'update':
        cliConsole.text(chalk.blue(`~ ${diff.entity}: ${diff.identifier}`));
        for (const change of diff.changes) {
          cliConsole.text(chalk.gray(`  ${change.field}: ${change.from} -> ${change.to}`));
        }
        break;
      case 'delete':
        cliConsole.text(chalk.red(`- ${diff.entity}: ${diff.identifier}`));
        break;
    }
  }

  cliConsole.text('');
  console.info(`Total: ${diffs.filter(d => d.action === 'create').length} to create, ` +
    `${diffs.filter(d => d.action === 'update').length} to update, ` +
    `${diffs.filter(d => d.action === 'delete').length} to delete`);
};
```

## Duplicate Issue Reporter

```typescript
export const reportDuplicates = (duplicates: DuplicateIssue[]): void => {
  if (duplicates.length === 0) return;

  cliConsole.text('');
  console.warning('Duplicate identifiers detected:');
  cliConsole.text('');

  for (const dup of duplicates) {
    cliConsole.text(chalk.yellow(`  ${dup.entityType}: "${dup.identifier}"`));
    cliConsole.text(chalk.gray(`    Found at: ${dup.locations.join(', ')}`));
  }

  cliConsole.text('');
  console.hint('Fix duplicates before deploying to avoid conflicts');
};
```
