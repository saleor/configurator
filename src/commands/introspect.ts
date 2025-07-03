import {
  parseCliArgs,
  commandSchemas,
  validateSaleorUrl,
  setupLogger,
  displayConfig,
  handleCommandError,
  confirmPrompt,
  displayIntrospectDiffSummary,
} from "../cli";
import { createConfigurator } from "../core/factory";
import { createBackup, fileExists } from "../lib/utils/file";

const argsSchema = commandSchemas.introspect;

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

    if (hasLocalFile && !force && !dryRun && !skipValidation) {
      if (!quiet) {
        console.log("📊 Analyzing differences between remote and local configuration...");
      }

      try {
        const diffSummary = await configurator.diffForIntrospect({
          format: "table",
          quiet: true,
        });

        displayIntrospectDiffSummary(diffSummary);

        if (diffSummary.totalChanges === 0) {
          if (!quiet) {
            console.log("✅ Local configuration is already up to date!");
          }
          process.exit(0);
        }

        if (!quiet) {
          console.log("⚠️  Introspecting will replace your local configuration file with the current state from Saleor.");
          const confirmed = await confirmPrompt(
            "Do you want to continue and overwrite the local file?",
            false
          );

          if (!confirmed) {
            console.log("❌ Operation cancelled by user");
            process.exit(0);
          }
        }
      } catch (diffError) {
        if (
          diffError instanceof Error &&
          diffError.message.includes("Invalid configuration file")
        ) {
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
              console.log(
                "💡 You can fix the local file manually or use --force to skip this check"
              );
              process.exit(0);
            }
          }
        } else {
          if (!quiet) {
            console.warn("⚠️  Could not compute diff, proceeding with introspect...");
            if (verbose) {
              console.warn(
                `   Diff error: ${diffError instanceof Error ? diffError.message : "Unknown error"}`
              );
            }
          }
        }
      }
    }

    if (dryRun) {
      if (!quiet) {
        console.log(
          "🔍 Dry-run complete. Use --force to skip confirmation or remove --dry-run to apply changes."
        );
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

    await configurator.introspect();

    if (!quiet) {
      console.log(`\n✅ Configuration successfully saved to ${configPath}`);

      if (hasLocalFile) {
        console.log("💡 You can restore the previous version from the backup if needed");
      }
    }

    process.exit(0);
  } catch (error) {
    handleCommandError(error);
  }
}

export { runIntrospect };
