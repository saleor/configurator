import type { z } from "zod";
import type { CommandConfig, CommandHandler } from "../cli/command";
import { baseCommandArgsSchema } from "../cli/command";
import { Console } from "../cli/console";
import { createConfigurator } from "../core/configurator";
import type { DiffSummary } from "../core/diff";
import { logger } from "../lib/logger";
import { COMMAND_NAME } from "../meta";

export const diffCommandSchema = baseCommandArgsSchema;

export type DiffCommandArgs = z.infer<typeof diffCommandSchema>;

class DiffCommandHandler implements CommandHandler<DiffCommandArgs, void> {
  console = new Console();

  private formatDiffSummaryMessage(totalChanges: number): string {
    if (totalChanges === 0) {
      return "\n✅ No differences found - configurations are in sync";
    }

    const changeText = totalChanges === 1 ? "difference" : "differences";
    return `\n⚠️  Found ${totalChanges} ${changeText} that would be applied by 'deploy'`;
  }

  private logDiffCompletion(summary: DiffSummary): void {
    logger.info("Diff process completed successfully", {
      totalChanges: summary.totalChanges,
      creates: summary.creates,
      updates: summary.updates,
      deletes: summary.deletes,
    });
  }

  private async performDiffOperation(args: DiffCommandArgs): Promise<void> {
    const configurator = createConfigurator(args);

    this.console.muted("⏳ Preparing a diff between the configuration and the Saleor instance...");

    const { summary, output } = await configurator.diff();

    this.console.status(output);
    this.logDiffCompletion(summary);

    const summaryMessage = this.formatDiffSummaryMessage(summary.totalChanges);
    this.console.status(summaryMessage);

    process.exit(0);
  }

  async execute(args: DiffCommandArgs): Promise<void> {
    this.console.setOptions({ quiet: args.quiet });
    this.console.header("🔍 Saleor Configuration Diff\n");

    await this.performDiffOperation(args);
  }
}

export async function handleDiff(args: DiffCommandArgs): Promise<void> {
  const handler = new DiffCommandHandler();
  await handler.execute(args);
}

export const diffCommandConfig: CommandConfig<typeof diffCommandSchema> = {
  name: "diff",
  description: "Shows the differences between local and remote Saleor configurations",
  schema: diffCommandSchema,
  handler: handleDiff,
  requiresInteractive: true,
  examples: [
    `${COMMAND_NAME} diff --url https://my-shop.saleor.cloud/graphql/ --token token123`,
    `${COMMAND_NAME} diff --config custom-config.yml`,
    `${COMMAND_NAME} diff --quiet`,
  ],
};
