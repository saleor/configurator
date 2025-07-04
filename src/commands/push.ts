import { z } from "zod";
import type { CommandConfig } from "../cli/command";
import { baseCommandArgsSchema, confirmAction } from "../cli/command";
import { cliConsole } from "../cli/console";
import { createConfigurator } from "../core/configurator";

export const pushCommandSchema = baseCommandArgsSchema.extend({
  force: z.boolean().default(false).describe("Force push without confirmation"),
  dryRun: z
    .boolean()
    .default(false)
    .describe("Show what would be changed without applying"),
});

export type PushCommandArgs = z.infer<typeof pushCommandSchema>;

async function handleDryRunMode(): Promise<boolean> {
  cliConsole.info("🧪 Running in dry-run mode...\n");
  // TODO: Implement dry-run logic
  cliConsole.warn("Dry-run mode will be implemented in the next iteration");
  return false; // Don't proceed with actual push
}

async function requestUserConfirmation(): Promise<boolean> {
  const userConfirmed = await confirmAction(
    "Are you sure you want to push changes to the remote Saleor instance?",
    "This will modify your production environment. Make sure you have a backup."
  );

  if (!userConfirmed) {
    cliConsole.cancelled("Push cancelled by user");
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

export async function pushHandler(args: PushCommandArgs): Promise<void> {
  cliConsole.header("🚀 Saleor Configuration Push\n");
  cliConsole.info(
    `"push" will apply changes to the target Saleor instance according to the local configuration file under ${args.config} path.`
  );

  cliConsole.setOptions({ quiet: args.quiet });

  const shouldProceed = await shouldProceedWithPush(args);

  if (!shouldProceed) {
    process.exit(0);
  }

  const configurator = createConfigurator(args);

  await configurator.push();
  cliConsole.success("✅ Configuration pushed to Saleor instance");
}

export const pushCommandConfig: CommandConfig<typeof pushCommandSchema> = {
  name: "push",
  description:
    "Updates the remote Saleor instance according to the local configuration",
  schema: pushCommandSchema,
  handler: pushHandler,
  requiresInteractive: true,
  examples: [
    "configurator push -u https://my-shop.saleor.cloud/graphql/ -t <token>",
    "configurator push --config custom-config.yml --force",
    "configurator push --dry-run",
    "configurator push --quiet",
  ],
};
