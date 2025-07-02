import { z } from "zod";
import { cliConsole } from "../cli/console";
import { createConfigurator } from "../core/configurator";
import { logger } from "../lib/logger";
import { baseCommandArgsSchema } from "../cli/command";

export const diffCommandSchema = baseCommandArgsSchema.extend({});

type DiffCommandArgs = z.infer<typeof diffCommandSchema>;

export async function diffHandler(args: DiffCommandArgs) {
  cliConsole.setOptions({ quiet: args.quiet });
  cliConsole.header("🔍 Saleor Configuration Diff\n");

  const configurator = createConfigurator(args);

  cliConsole.processing(
    "⏳ Preparing a diff between the configuration and the Saleor instance..."
  );

  const { summary, output } = await configurator.diff();
  cliConsole.info(output);

  logger.info("Diff process completed successfully", {
    totalChanges: summary.totalChanges,
    creates: summary.creates,
    updates: summary.updates,
    deletes: summary.deletes,
  });

  if (summary.totalChanges > 0) {
    cliConsole.status(
      `\n⚠️  Found ${summary.totalChanges} difference${
        summary.totalChanges !== 1 ? "s" : ""
      } that would be applied by 'push'`
    );
  } else {
    cliConsole.status("\n✅ No differences found - configurations are in sync");
  }
}
