import { createClient } from "../lib/graphql/client";
import { ServiceComposer } from "../core/service-container";
import { SaleorConfigurator } from "../core/configurator";
import { parseCliArgs, commandSchemas } from "../cli/index.js";
import { logger } from "../lib/logger";

const argsSchema = commandSchemas.diff;

async function runDiff() {
  try {
    console.log("🔍 Saleor Configuration Diff\n");
    
    const args = parseCliArgs(argsSchema, "diff");
    const { url, token, config: configPath, format, filter, quiet, verbose } = args;

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

    if (!quiet) {
      console.log("⚙️  Initializing...");
    }

    const client = createClient(token, url);

    const services = ServiceComposer.compose(client, configPath);

    const configurator = new SaleorConfigurator(services);

    if (!quiet) {
      console.log("🔄 Running diff analysis...");
    }

    const summary = await configurator.diff({ 
      format, 
      filter: filter?.split(","), 
      quiet 
    });

    if (summary.totalChanges > 0) {
      if (!quiet) {
        console.log(`\n⚠️  Found ${summary.totalChanges} difference${summary.totalChanges !== 1 ? 's' : ''} that would be applied by 'push'`);
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
    logger.error("Diff command failed", { error });
    
    if (error instanceof Error) {
      console.error(`\n❌ Error: ${error.message}`);
      
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