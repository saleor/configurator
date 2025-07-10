import type { z } from "zod";
import type { CommandConfig } from "../cli/command";
import { baseCommandArgsSchema, confirmAction } from "../cli/command";
import { cliConsole } from "../cli/console";
import { CliFileNotFoundError } from "../cli/errors";
import { createConfigurator } from "../core/configurator";
import { createBackup, fileExists } from "../lib/utils/file";

export const introspectCommandSchema = baseCommandArgsSchema;

export type IntrospectCommandArgs = z.infer<typeof introspectCommandSchema>;

async function checkFileExists(configPath: string): Promise<boolean> {
  try {
    const fs = await import("fs/promises");
    await fs.access(configPath);
    return true;
  } catch {
    return false;
  }
}

async function analyzeConfigurationDifferences(
  args: IntrospectCommandArgs
): Promise<boolean> {
  if (!fileExists(args.config)) {
    throw new CliFileNotFoundError("Local configuration file not found");
  }

  cliConsole.warn(
    "📊 Analyzing differences between remote and local configuration..."
  );

  const configurator = createConfigurator(args);
  const { summary, output } = await configurator.diff();

  cliConsole.info(output);

  if (summary.totalChanges === 0) {
    cliConsole.success("✅ Local configuration is already up to date!");
    return false; // No need to proceed
  }

  return await confirmIntrospection();
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
  process.exit(0);
}

export async function introspectHandler(
  args: IntrospectCommandArgs
): Promise<void> {
  cliConsole.setOptions({ quiet: args.quiet });
  cliConsole.header("🔍 Saleor Configuration Introspect\n");

  const fileExists = await checkFileExists(args.config);

  if (fileExists) {
    cliConsole.warn(
      `Local configuration file "${args.config}" already exists.`
    );
  }

  const shouldProceed = await analyzeConfigurationDifferences(args);

  if (!shouldProceed) {
    process.exit(0);
  }

  await createConfigurationBackup(args.config);
  await executeIntrospection(args);
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
