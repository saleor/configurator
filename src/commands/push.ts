import { z } from 'zod';
import chalk from 'chalk';
import { 
  baseCommandArgsSchemaWithValidation, 
  confirmAction 
} from '../cli/command';
import type { CommandConfig } from '../cli/command';
import { cliConsole } from '../cli/console';
import { createConfigurator } from '../core/configurator';

export const pushCommandSchema = baseCommandArgsSchemaWithValidation.extend({
  force: z.boolean().default(false).describe("Force push without confirmation"),
  dryRun: z.boolean().default(false).describe("Show what would be changed without applying"),
});

export type PushCommandArgs = z.infer<typeof pushCommandSchema>;

async function handleDryRunMode(): Promise<boolean> {
  cliConsole.info(chalk.blue('🧪 Running in dry-run mode...\n'));
  // TODO: Implement dry-run logic
  cliConsole.warn('Dry-run mode will be implemented in the next iteration');
  return false; // Don't proceed with actual push
}

async function requestUserConfirmation(): Promise<boolean> {
  const userConfirmed = await confirmAction(
    'Are you sure you want to push changes to the remote Saleor instance?',
    'This will modify your production environment. Make sure you have a backup.'
  );
  
  if (!userConfirmed) {
    cliConsole.cancelled('Push cancelled by user');
    return false;
  }
  
  return true;
}

async function shouldProceedWithPush(args: PushCommandArgs): Promise<boolean> {
  const { force, dryRun } = args;
  
  if (dryRun) {
    return await handleDryRunMode();
  }
  
  if (force) {
    return true;
  }
  
  return await requestUserConfirmation();
}

async function executePush(args: PushCommandArgs): Promise<void> {
  const configurator = createConfigurator(args);
  cliConsole.header("🚀 Saleor Configuration Push\n");
  
  await configurator.push();
  cliConsole.success("✅ Configuration pushed to Saleor instance");
}

export async function pushHandler(args: PushCommandArgs): Promise<void> {
  cliConsole.setOptions({ quiet: args.quiet });
  
  const shouldProceed = await shouldProceedWithPush(args);
  if (!shouldProceed) {
    return;
  }
  
  await executePush(args);
}

export const pushCommandConfig: CommandConfig<typeof pushCommandSchema> = {
  name: 'push',
  description: 'Updates the remote Saleor instance according to the local configuration',
  schema: pushCommandSchema,
  handler: pushHandler,
  requiresInteractive: true,
  examples: [
    'configurator push -u https://my-shop.saleor.cloud/graphql/ -t <token>',
    'configurator push --config custom-config.yml --force',
    'configurator push --dry-run',
    'configurator push --quiet'
  ]
};

export const pushCommandOptions = [
  { flags: '-f, --force', description: 'Force push without confirmation', defaultValue: false },
  { flags: '--dry-run', description: 'Show what would be changed without applying', defaultValue: false }
]; 