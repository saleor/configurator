import {
  parseCliArgs,
  commandSchemas,
  validateSaleorUrl,
  setupLogger,
  displayConfig,
  handleCommandError,
} from "../cli";
import { createConfigurator } from "../core/factory";

const argsSchema = commandSchemas.diff;

async function runDiff() {
  try {
    console.log("🔍 Saleor Configuration Diff\n");

    const args = parseCliArgs(argsSchema, "diff");
    const { url, token, config: configPath, format, filter, quiet, verbose, dryRun } = args;

    const validatedUrl = validateSaleorUrl(url, quiet);
    setupLogger(verbose, quiet);
    displayConfig({ ...args, url: validatedUrl }, quiet);

    if (dryRun && !quiet) {
      console.log("🔍 Dry-run mode: Analysis only, no changes will be made\n");
    }

    if (!quiet) {
      console.log("⚙️  Initializing...");
    }

    const configurator = createConfigurator(token, validatedUrl, configPath);

    if (!quiet) {
      console.log("🔄 Running diff analysis...");
    }

    const summary = await configurator.diff({
      format,
      filter: filter?.split(","),
      quiet,
    });

    if (summary.totalChanges > 0) {
      if (!quiet) {
        console.log(
          `\n⚠️  Found ${summary.totalChanges} difference${
            summary.totalChanges !== 1 ? "s" : ""
          } that would be applied by 'push'`
        );
      }
    } else {
      if (!quiet) {
        console.log("\n✅ No differences found - configurations are in sync");
      }
    }

    // Exit with success code regardless of whether differences were found
    // Finding differences is expected behavior, not an error
    process.exit(0);
  } catch (error) {
    handleCommandError(error);
  }
}

runDiff().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
