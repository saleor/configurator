import { z } from "zod";
import type { CommandConfig, CommandHandler } from "../cli/command";
import { baseCommandArgsSchema, confirmAction } from "../cli/command";
import { Console } from "../cli/console";
import { createConfigurator } from "../core/configurator";

export const pushCommandSchema = baseCommandArgsSchema.extend({
  force: z.boolean().default(false).describe("Force push without confirmation"),
  dryRun: z
    .boolean()
    .default(false)
    .describe("Show what would be changed without applying"),
});

export type PushCommandArgs = z.infer<typeof pushCommandSchema>;

class PushCommandHandler implements CommandHandler<PushCommandArgs, void> {
  console = new Console();

  private async handleDryRunMode(): Promise<boolean> {
    this.console.info("🧪 Running in dry-run mode...\n");
    // TODO: Implement dry-run logic
    this.console.warn("Dry-run mode will be implemented in the next iteration");
    return false; // Don't proceed with actual push
  }

  private async requestUserConfirmation(): Promise<boolean> {
    const userConfirmed = await confirmAction(
      "Are you sure you want to push changes to the remote Saleor instance?",
      "This will modify your production environment. Make sure you have a backup."
    );

    if (!userConfirmed) {
      this.console.cancelled("Push cancelled by user");
      return false;
    }

    return true;
  }

  private async shouldProceedWithPush(args: PushCommandArgs): Promise<boolean> {
    const { force, dryRun } = args;

    if (dryRun) {
      return await this.handleDryRunMode();
    }

    if (force) {
      return true;
    }

    return await this.requestUserConfirmation();
  }

  async execute(args: PushCommandArgs): Promise<void> {
    this.console.header("🚀 Saleor Configuration Push\n");
    this.console.info(
      `"push" will apply changes to the target Saleor instance according to the local configuration file under ${args.config} path.`
    );

    this.console.setOptions({ quiet: args.quiet });

    const shouldProceed = await this.shouldProceedWithPush(args);

    if (!shouldProceed) {
      process.exit(0);
    }

    const configurator = createConfigurator(args);

    await configurator.push();
    this.console.success("✅ Configuration pushed to Saleor instance");
  }
}

export async function handlePush(args: PushCommandArgs): Promise<void> {
  const handler = new PushCommandHandler();
  await handler.execute(args);
}

export const pushCommandConfig: CommandConfig<typeof pushCommandSchema> = {
  name: "push",
  description:
    "Updates the remote Saleor instance according to the local configuration",
  schema: pushCommandSchema,
  handler: handlePush,
  requiresInteractive: true,
  examples: [
    "configurator push --url https://my-shop.saleor.cloud/graphql/ --token token123",
    "configurator push --config custom-config.yml --force",
    "configurator push --dry-run",
    "configurator push --quiet",
  ],
};
