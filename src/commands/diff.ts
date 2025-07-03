import type { z } from "zod";
import type { CommandConfig } from "../cli/command";
import { baseCommandArgsSchema } from "../cli/command";
import { cliConsole } from "../cli/console";
import { createConfigurator } from "../core/configurator";
import type { DiffSummary } from "../core/diff";
import { logger } from "../lib/logger";

export const diffCommandSchema = baseCommandArgsSchema;

export type DiffCommandArgs = z.infer<typeof diffCommandSchema>;

function formatDiffSummaryMessage(totalChanges: number): string {
  if (totalChanges === 0) {
    return "\n✅ No differences found - configurations are in sync";
  }

  const changeText = totalChanges === 1 ? "difference" : "differences";
  return `\n⚠️  Found ${totalChanges} ${changeText} that would be applied by 'push'`;
}

function logDiffCompletion(summary: DiffSummary): void {
  logger.info("Diff process completed successfully", {
    totalChanges: summary.totalChanges,
    creates: summary.creates,
    updates: summary.updates,
    deletes: summary.deletes,
  });
}

async function performDiffOperation(args: DiffCommandArgs): Promise<void> {
  const configurator = createConfigurator(args);

  cliConsole.processing(
    "⏳ Preparing a diff between the configuration and the Saleor instance..."
  );

  const { summary, output } = await configurator.diff();

  cliConsole.status(output);
  logDiffCompletion(summary);

  const summaryMessage = formatDiffSummaryMessage(summary.totalChanges);
  cliConsole.status(summaryMessage);

  process.exit(0);
}

export async function diffHandler(args: DiffCommandArgs): Promise<void> {
  cliConsole.setOptions({ quiet: args.quiet });
  cliConsole.header("🔍 Saleor Configuration Diff\n");

  await performDiffOperation(args);
}

export const diffCommandConfig: CommandConfig<typeof diffCommandSchema> = {
  name: "diff",
  description:
    "Shows the differences between local and remote Saleor configurations",
  schema: diffCommandSchema,
  handler: diffHandler,
  requiresInteractive: true,
  examples: [
    "configurator diff -u https://my-shop.saleor.cloud/graphql/ -t <token>",
    "configurator diff --config custom-config.yml",
    "configurator diff --quiet",
  ],
};
