import { z } from "zod";
import { parseCliArgs } from "../lib/utils/cli-args";
import { 
  validateSaleorUrl, 
  setupLogger, 
  displayConfig, 
  createConfigurator, 
  handleCommandError,
  createBackup,
  fileExists,
  type BaseCommandArgs 
} from "../lib/utils/command-utils";
import { confirmPrompt, displayDiffSummary } from "../lib/utils/interactive";

const argsSchema = z.object({
  url: z.string({ required_error: "Saleor GraphQL URL is required" }),
  token: z.string({ required_error: "Saleor authentication token is required" }),
  config: z.string().default("config.yml"),
  quiet: z.boolean().default(false),
  verbose: z.boolean().default(false),
  force: z.boolean().default(false),
  dryRun: z.boolean().default(false),
  skipValidation: z.boolean().default(false),
});

async function runIntrospect() {
  try {
    console.log("🔍 Saleor Configuration Introspect\n");
    
    const args = parseCliArgs(argsSchema, "introspect");
    const { url, token, config: configPath, quiet, verbose, force, dryRun, skipValidation } = args;

    const validatedUrl = validateSaleorUrl(url, quiet);
    setupLogger(verbose, quiet);
    displayConfig({ ...args, url: validatedUrl }, quiet);

    if (dryRun && !quiet) {
      console.log("🔍 Dry-run mode: No changes will be made\n");
    }

    if (!quiet) {
      console.log("⚙️  Initializing...");
    }

    const configurator = createConfigurator(token, validatedUrl, configPath);

    const hasLocalFile = fileExists(configPath);
    let shouldProceed = true;

    if (hasLocalFile && !force && !dryRun && !skipValidation) {
      if (!quiet) {
        console.log("📊 Analyzing differences between remote and local configuration...");
      }

      try {
        const diffSummary = await configurator.diff({ 
          format: "table", 
          quiet: true  
        });

        displayDiffSummary(diffSummary);

        if (diffSummary.totalChanges === 0) {
          if (!quiet) {
            console.log("✅ Local configuration is already up to date!");
          }
          process.exit(0);
        }

        if (!quiet) {
          console.log("⚠️  Introspecting will overwrite your local configuration file.");
          const confirmed = await confirmPrompt(
            "Do you want to continue and update the local file?", 
            false
          );
          
          if (!confirmed) {
            console.log("❌ Operation cancelled by user");
            process.exit(0);
          }
        }
      } catch (diffError) {
        if (diffError instanceof Error && diffError.message.includes("Invalid configuration file")) {
          if (!quiet) {
            console.warn("⚠️  Local configuration file has validation issues:");
            console.warn(`   ${diffError.message}`);
            console.warn("");
            console.warn("📋 This usually means:");
            console.warn("   • Your local config uses unsupported values");
            console.warn("   • The config format has changed since it was created");
            console.warn("");
            console.warn("🔧 Introspecting will fetch the latest valid configuration from Saleor.");
            
            const confirmed = await confirmPrompt(
              "Do you want to proceed and replace the invalid local file?", 
              true
            );
            
            if (!confirmed) {
              console.log("❌ Operation cancelled by user");
              console.log("💡 You can fix the local file manually or use --force to skip this check");
              process.exit(0);
            }
          }
        } else {
          if (!quiet) {
            console.warn("⚠️  Could not compute diff, proceeding with introspect...");
            if (verbose) {
              console.warn(`   Diff error: ${diffError instanceof Error ? diffError.message : 'Unknown error'}`);
            }
          }
        }
      }
    }

    if (dryRun) {
      if (!quiet) {
        console.log("🔍 Dry-run complete. Use --force to skip confirmation or remove --dry-run to apply changes.");
      }
      process.exit(0);
    }

    if (hasLocalFile && !quiet) {
      console.log("💾 Creating backup of existing configuration...");
      const backupPath = await createBackup(configPath);
      if (backupPath) {
        console.log(`   Backup saved to: ${backupPath}`);
      }
    }

    if (!quiet) {
      console.log("🌐 Introspecting configuration from Saleor...");
    }

    const config = await configurator.introspect();

    if (!quiet) {
      console.log(`\n✅ Configuration successfully saved to ${configPath}`);
      
      if (hasLocalFile) {
        console.log("💡 You can restore the previous version from the backup if needed");
      }
    }
    
    process.exit(0);

  } catch (error) {
    handleCommandError(error, "Introspect");
  }
}

export { runIntrospect };

runIntrospect().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
}); 