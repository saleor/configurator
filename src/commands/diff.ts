import { cliConsole } from "../cli/console";
import { createConfigurator } from "../core/configurator";
import { logger } from "../lib/logger";
import { DiffCommand } from "./registry";

try {
  const args = DiffCommand.parseArgs(process.argv.slice(2));

  cliConsole.setOptions({ quiet: args.quiet });
  const configurator = createConfigurator(args);

  cliConsole.info(
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
} catch (error) {
  cliConsole.error(error);
  process.exit(1);
}
