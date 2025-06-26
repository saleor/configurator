import { 
  parseCliArgs, 
  commandSchemas,
  validateSaleorUrl,
  setupLogger,
  displayConfig,
  handleCommandError
} from "../cli";
import { createConfigurator } from "../core/factory";

const argsSchema = commandSchemas.push;

async function runPush() {
  try {
    console.log("🚀 Saleor Configuration Push\n");
    
    const args = parseCliArgs(argsSchema, "push");
    const { url, token, config: configPath, quiet, verbose, dryRun, skipValidation } = args;

    const validatedUrl = validateSaleorUrl(url, quiet);
    setupLogger(verbose, quiet);
    displayConfig({ ...args, url: validatedUrl }, quiet);

    if (dryRun && !quiet) {
      console.log("🔍 Dry-run mode: No changes will be made\n");
    }

    if (skipValidation && !quiet) {
      console.log("⚠️  Validation skipped - proceeding without config validation\n");
    }

    if (!quiet) {
      console.log("⚙️  Initializing...");
    }

    const configurator = createConfigurator(token, validatedUrl, configPath);

    if (dryRun) {
      if (!quiet) {
        console.log("🔍 Dry-run complete. Use --force to skip confirmation or remove --dry-run to apply changes.");
      }
      process.exit(0);
    }

    if (!quiet) {
      console.log("📤 Applying configuration to Saleor...");
    }

    // Note: force flag is available for future use (e.g., confirmation prompts)
    await configurator.push();

    if (!quiet) {
      console.log("\n✅ Configuration successfully applied to Saleor");
    }
    
    process.exit(0);

  } catch (error) {
    handleCommandError(error, "Push");
  }
}

runPush().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
