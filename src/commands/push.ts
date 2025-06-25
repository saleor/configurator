import { createClient } from "../lib/graphql/client";
import { ServiceComposer } from "../core/service-container";
import { SaleorConfigurator } from "../core/configurator";
import { parseCliArgs, commandSchemas } from "../cli/index.js";
import { logger } from "../lib/logger";

const argsSchema = commandSchemas.push;

async function runPush() {
  try {
    console.log("🚀 Saleor Configuration Push\n");
    
    // Parse CLI arguments with better error handling
    const args = parseCliArgs(argsSchema, "push");
    const { url, token, config: configPath, quiet, verbose } = args;

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

    // Run push with progress indicators
    if (!quiet) {
      console.log("📤 Applying configuration to Saleor...");
    }

    await configurator.push();

    if (!quiet) {
      console.log("\n✅ Configuration successfully applied to Saleor");
    }
    
    process.exit(0);

  } catch (error) {
    logger.error("Push command failed", { error });
    
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

// Run the push command
runPush().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
