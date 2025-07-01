import {
  parseCliArgs,
  commandSchemas,
  validateSaleorUrl,
  setupLogger,
  displayConfig,
  handleCommandError,
} from "../cli";
import { createConfigurator } from "../core/factory";
import { ConsoleOutput } from "./cli-console";

const argsSchema = commandSchemas.push;

async function runPush() {
  try {
    const args = parseCliArgs(argsSchema, "push");
    const {
      url,
      token,
      config: configPath,
      quiet,
      verbose,
      dryRun,
      skipValidation,
    } = args;

    const cliConsole = new ConsoleOutput({ quiet });
    cliConsole.status("🚀 Saleor Configuration Push\n");

    const validatedUrl = validateSaleorUrl(url, quiet);
    setupLogger(verbose, quiet);
    displayConfig({ ...args, url: validatedUrl }, quiet);

    if (dryRun) {
      cliConsole.info("🔍 Dry-run mode: No changes will be made\n");
    }

    if (skipValidation) {
      cliConsole.info(
        "⚠️  Validation skipped - proceeding without config validation\n"
      );
    }

    const configurator = createConfigurator(token, validatedUrl, configPath);

    if (dryRun) {
      cliConsole.status("🔍 Dry-run complete.");
      process.exit(0);
    }

    cliConsole.info("📤 Applying configuration to Saleor...");

    // Note: force flag is available for future use (e.g., confirmation prompts)
    await configurator.push();

    cliConsole.status("\n✅ Configuration successfully applied to Saleor");
    process.exit(0);
  } catch (error) {
    console.error(error);
    handleCommandError(error);
  }
}

runPush();
