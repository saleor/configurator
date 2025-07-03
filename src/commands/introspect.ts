import type { z } from "zod";
import type { CommandConfig } from "../cli/command";
import { baseCommandArgsSchema, confirmAction } from "../cli/command";
import { cliConsole } from "../cli/console";
import { createConfigurator } from "../core/configurator";
import { createBackup, fileExists } from "../lib/utils/file";

export const introspectCommandSchema = baseCommandArgsSchema;

export type IntrospectCommandArgs = z.infer<typeof introspectCommandSchema>;

async function analyzeConfigurationDifferences(
  args: IntrospectCommandArgs
): Promise<boolean> {
  if (!fileExists(args.config)) {
    cliConsole.warn(
      "📊 No local configuration found. A new configuration will be created."
    );
    return true;
  }

  cliConsole.info(
    "📊 Analyzing differences between remote and local configuration..."
  );

  try {
    const configurator = createConfigurator(args);
    const diffSummary = await configurator.diffForIntrospect({
      format: "table",
      quiet: true,
    });

    if (diffSummary.totalChanges === 0) {
      cliConsole.success("✅ Local configuration is already up to date!");
      return false; // No need to proceed
    }

    // Display the diff summary
    await configurator.diffForIntrospect({
      format: "table",
      quiet: false,
    });

    return await confirmIntrospection();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Invalid configuration file")
    ) {
      cliConsole.warn("⚠️  Local configuration file has validation issues:");
      cliConsole.warn(`   ${error.message}`);
      cliConsole.warn("");
      cliConsole.warn("📋 This usually means:");
      cliConsole.warn("   • Your local config uses unsupported values");
      cliConsole.warn("   • The config format has changed since it was created");
      cliConsole.warn("");
      cliConsole.warn("🔧 Introspecting will fetch the latest valid configuration from Saleor.");

      const confirmed = await confirmAction(
        "Do you want to proceed and replace the invalid local file?",
        "This will overwrite your current local configuration with the remote state.",
        true
      );

      if (!confirmed) {
        cliConsole.cancelled("Operation cancelled by user");
        cliConsole.info("💡 You can fix the local file manually or use different options");
        return false;
      }
      return true;
    } else {
      cliConsole.warn("⚠️  Could not compute diff, proceeding with introspect...");
      return true;
    }
  }
}

async function confirmIntrospection(): Promise<boolean> {
  cliConsole.warn(
    "⚠️  Introspecting will overwrite your local configuration file."
  );

  const userConfirmed = await confirmAction(
    "Do you want to continue and update the local file?",
    "This will overwrite your current local configuration with the remote state.",
    false
  );

  if (!userConfirmed) {
    cliConsole.cancelled("Operation cancelled by user");
    return false;
  }

  return true;
}

async function createConfigurationBackup(configPath: string): Promise<void> {
  cliConsole.info("💾 Creating backup of existing configuration...");

  const backupPath = await createBackup(configPath);
  if (backupPath) {
    cliConsole.info(`   Backup saved to: ${backupPath}`);
  }
}

async function executeIntrospection(
  args: IntrospectCommandArgs
): Promise<void> {
  const configurator = createConfigurator(args);
  cliConsole.processing("🌐 Introspecting configuration from Saleor...");

  await configurator.introspect();

  const configPath = cliConsole.important(args.config);
  cliConsole.success(`\n✅ Configuration successfully saved to ${configPath}`);
}

export async function introspectHandler(
  args: IntrospectCommandArgs
): Promise<void> {
  cliConsole.setOptions({ quiet: args.quiet });
  cliConsole.header("🔍 Saleor Configuration Introspect\n");

  const hasExistingFile = fileExists(args.config);

  if (hasExistingFile) {
    cliConsole.info(
      `Local configuration file "${args.config}" already exists.`
    );
  }

  const shouldProceed = await analyzeConfigurationDifferences(args);

  if (!shouldProceed) {
    process.exit(0);
    return; // This return is necessary for testing when process.exit is mocked
  }

  // Only create backup if file actually exists
  if (hasExistingFile) {
    await createConfigurationBackup(args.config);
  }

  await executeIntrospection(args);
  process.exit(0);
}

export const introspectCommandConfig: CommandConfig<
  typeof introspectCommandSchema
> = {
  name: "introspect",
  description:
    "Downloads the current configuration from the remote Saleor instance",
  schema: introspectCommandSchema,
  handler: introspectHandler,
  requiresInteractive: true,
  examples: [
    "configurator introspect -u https://my-shop.saleor.cloud/graphql/ -t <token>",
    "configurator introspect --config output.yml",
    "configurator introspect --quiet",
  ],
};
