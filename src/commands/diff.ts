import { createClient } from "../lib/graphql/client";
import { ServiceComposer } from "../core/service-container";
import { SaleorConfigurator } from "../core/configurator";
import { z } from "zod";
import { parseCliArgs } from "../lib/utils/cli-args";
import { logger } from "../lib/logger";

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
    
    // Parse CLI arguments with better error handling
    const args = parseCliArgs(argsSchema, "diff");
    const { url, token, config: configPath, format, filter, quiet, verbose } = args;

    // Set logger level based on flags
    if (verbose) {
      process.env.LOG_LEVEL = "debug";
    } else if (quiet) {
      process.env.LOG_LEVEL = "error";
    }

    if (!quiet) {
      console.log("📋 Configuration:");
      console.log(`   URL: ${url}`);
      console.log(`   Config: ${configPath}`);
      console.log(`   Format: ${format}`);
      if (filter) console.log(`   Filter: ${filter}`);
      console.log("");
    }

    // Progress indicator
    if (!quiet) {
      console.log("⚙️  Initializing...");
    }

    // Create a new client with the provided configuration
    const client = createClient(token, url);

    // Create new services with the client, passing the config path
    const services = ServiceComposer.compose(client, configPath);

    // Create a new configurator with the services
    const configurator = new SaleorConfigurator(services);

    // Run diff with progress indicators
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
    logger.error("Diff command failed", { error });
    
    if (error instanceof Error) {
      console.error(`\n❌ Error: ${error.message}`);
      
      // Provide helpful hints for common errors
      if (error.message.includes("ENOENT") && error.message.includes("config")) {
        console.error("💡 Make sure your config file exists and is readable");
      } else if (error.message.includes("fetch") || error.message.includes("network")) {
        console.error("💡 Check your Saleor URL and network connection");
      } else if (error.message.includes("Unauthorized") || error.message.includes("401")) {
        console.error("💡 Check your authentication token");
      }
    } else {
      console.error("\n❌ An unexpected error occurred");
    }
    
    process.exit(1);
  }
}

// Run the diff command
runDiff().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
}); 