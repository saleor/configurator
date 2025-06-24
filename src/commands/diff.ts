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
  format: z.enum(["table", "json", "summary"]).default("table"),
  filter: z.string().optional(),
  quiet: z.boolean().default(false),
  verbose: z.boolean().default(false),
});

async function runDiff() {
  try {
    console.log("🔍 Saleor Configuration Diff\n");
    
    const args = parseCliArgs(argsSchema, "diff");
    const { url, token, config: configPath, format, filter, quiet, verbose } = args;

    const validatedUrl = validateSaleorUrl(url, quiet);
    setupLogger(verbose, quiet);
    displayConfig({ ...args, url: validatedUrl }, quiet);

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
      quiet 
    });

    // Set appropriate exit code
    if (summary.totalChanges > 0) {
      if (!quiet) {
        console.log(`\n⚠️  Found ${summary.totalChanges} difference${summary.totalChanges !== 1 ? 's' : ''} that would be applied by 'push'`);
      }
      process.exit(1); // Changes detected
    } else {
      if (!quiet) {
        console.log("\n✅ No differences found - configurations are in sync");
      }
      process.exit(0); // No changes
    }

  } catch (error) {
    handleCommandError(error, "Diff");
  }
}

runDiff().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
}); 