import { logger } from "../lib/logger";
import { CommandHandler } from "./lib/handler";
import { DiffFormatter } from "../core/diff";

export class SaleorConfiguratorDiff extends CommandHandler {
  async execute() {
    this.cliConsole.info(
      "⏳ Preparing a diff between the configuration and the Saleor instance..."
    );

    const summary = await this.configurator.diff();

    // Format and display output
    const formattedOutput = DiffFormatter.format(summary);

    this.cliConsole.info(formattedOutput);

    logger.info("Diff process completed successfully", {
      totalChanges: summary.totalChanges,
      creates: summary.creates,
      updates: summary.updates,
      deletes: summary.deletes,
    });

    if (summary.totalChanges > 0) {
      this.cliConsole.status(
        `\n⚠️  Found ${summary.totalChanges} difference${
          summary.totalChanges !== 1 ? "s" : ""
        } that would be applied by 'push'`
      );
    } else {
      this.cliConsole.status(
        "\n✅ No differences found - configurations are in sync"
      );
    }
  }
}
