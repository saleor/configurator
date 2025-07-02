import { z } from "zod";
import { baseCommandArgsSchema, isHelp } from "../cli/command";
import { cliConsole } from "../cli/console";
import { createConfigurator } from "../core/configurator";
import { createBackup, fileExists } from "../lib/utils/file";
import { IntrospectCommand } from "./registry";

export const introspectCommandSchema = baseCommandArgsSchema.and(z.object({}));

type IntrospectCommandArgs = z.infer<typeof introspectCommandSchema>;

export async function introspectHandler(args: IntrospectCommandArgs) {
  if (isHelp(args)) {
    cliConsole.info(IntrospectCommand.help());
    process.exit(0);
  }

  cliConsole.setOptions({ quiet: args.quiet });
  const configurator = createConfigurator(args);
  cliConsole.header("🔍 Saleor Configuration Introspect\n");
  const configPath = args.config;
  const hasLocalFile = fileExists(configPath);
  if (!hasLocalFile) {
    throw new Error("Local configuration file not found");
  }
  cliConsole.warn(
    "📊 Analyzing differences between remote and local configuration..."
  );
  const { summary, output } = await configurator.diff();
  cliConsole.info(output);
  if (summary.totalChanges === 0) {
    cliConsole.success("✅ Local configuration is already up to date!");
    process.exit(0);
  }
  cliConsole.warn(
    "⚠️  Introspecting will overwrite your local configuration file."
  );
  const confirmed = await cliConsole.confirm(
    "Do you want to continue and update the local file?"
  );
  if (!confirmed) {
    cliConsole.cancelled("❌ Operation cancelled by user");
    process.exit(0);
  }
  console.info("💾 Creating backup of existing configuration...");
  const backupPath = await createBackup(configPath);
  if (backupPath) {
    console.info(`   Backup saved to: ${backupPath}`);
  }
  cliConsole.processing("🌐 Introspecting configuration from Saleor...");
  await configurator.introspect();
  cliConsole.success(
    `\n✅ Configuration successfully saved to ${cliConsole.filePath(
      configPath
    )}`
  );
  process.exit(0);
}
