import { z } from "zod";
import { parseCliArgs } from "../lib/utils/cli-args";
import { 
  validateSaleorUrl, 
  setupLogger, 
  displayConfig, 
  createConfigurator, 
  handleCommandError 
} from "../lib/utils/command-utils";

const argsSchema = z.object({
  url: z.string({ required_error: "Saleor GraphQL URL is required" }),
  token: z.string({ required_error: "Saleor authentication token is required" }),
  config: z.string().default("config.yml"),
  quiet: z.boolean().default(false),
  verbose: z.boolean().default(false),
});

async function runPush() {
  try {
    console.log("🚀 Saleor Configuration Push\n");
    
    const args = parseCliArgs(argsSchema, "push");
    const { url, token, config: configPath, quiet, verbose } = args;

    const validatedUrl = validateSaleorUrl(url, quiet);
    setupLogger(verbose, quiet);
    displayConfig({ ...args, url: validatedUrl }, quiet);

    if (!quiet) {
      console.log("⚙️  Initializing...");
    }

    const configurator = createConfigurator(token, validatedUrl, configPath);

    if (!quiet) {
      console.log("📤 Applying configuration to Saleor...");
    }

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
