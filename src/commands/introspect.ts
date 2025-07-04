import { z } from "zod";
import type { CommandConfig } from "../cli/command";
import { baseCommandArgsSchema, confirmAction } from "../cli/command";
import { cliConsole } from "../cli/console";
import { createConfigurator } from "../core/configurator";
import { createBackup, fileExists } from "../lib/utils/file";
import { 
  parseSelectiveOptions, 
  getSelectiveOptionsSummary 
} from "../lib/utils/selective-options";

export const introspectCommandSchema = baseCommandArgsSchema.extend({
  dryRun: z.boolean().default(false).describe("Preview changes without applying them"),
  noBackup: z.boolean().default(false).describe("Skip backup creation"),
  format: z.enum(["table", "json", "yaml"]).default("table").describe("Output format"),
  ci: z.boolean().default(false).describe("CI mode: non-interactive, exits with code 1 if changes detected"),
  only: z.string().optional().describe("Comma-separated list of sections to include (e.g., 'channels,shop')"),
  exclude: z.string().optional().describe("Comma-separated list of sections to exclude"),
});

export type IntrospectCommandArgs = z.infer<typeof introspectCommandSchema>;

const setupConsole = (args: IntrospectCommandArgs): void => {
  cliConsole.setOptions({ quiet: args.quiet || args.ci });
};

const displayHeader = (isQuiet: boolean, isCi: boolean): void => {
  if (!isQuiet && !isCi) {
    cliConsole.header("🔍 Saleor Configuration Introspect\n");
  }
};

const displayConfigurationInfo = (args: IntrospectCommandArgs): void => {
  if (args.quiet || args.ci) return;

  const hasExistingFile = fileExists(args.config);
  if (hasExistingFile) {
    cliConsole.info(`Local configuration file "${args.config}" already exists.`);
  }

  const { includeSections, excludeSections } = parseSelectiveOptions(args);
  const selectiveSummary = getSelectiveOptionsSummary({ includeSections, excludeSections });
  
  if (selectiveSummary.includeMessage) {
    cliConsole.info(selectiveSummary.includeMessage);
  }
  if (selectiveSummary.excludeMessage) {
    cliConsole.info(selectiveSummary.excludeMessage);
  }
};

const showProcessingMessage = (isQuiet: boolean, isCi: boolean): void => {
  if (!isQuiet && !isCi) {
    cliConsole.processing("🔍 Analyzing differences between remote and local configuration...");
  }
};

const getOutputFormat = (args: IntrospectCommandArgs): "table" | "json" | "yaml" => {
  return args.ci ? 'json' : args.format;
};

const displayDiffResult = async (diffResult: any, format: "table" | "json" | "yaml", configurator: any): Promise<void> => {
  if (format === 'json') {
    console.log(JSON.stringify(diffResult, null, 2));
  } else if (format === 'yaml') {
    const yaml = await import('yaml');
    console.log(yaml.stringify(diffResult));
  } else {
    await configurator.diffForIntrospect({ format: "table", quiet: false });
  }
};

const handleDryRunMode = (args: IntrospectCommandArgs, totalChanges: number): void => {
  if (!args.dryRun) return;

  if (totalChanges === 0) {
    if (!args.ci) cliConsole.success("✅ DRY RUN: No changes would be made to local configuration");
    process.exit(0);
  } else {
    if (!args.ci) {
      cliConsole.info(`\n🔍 DRY RUN: ${totalChanges} changes would be made`);
      cliConsole.info("Run without --dry-run to apply these changes");
    }
    process.exit(0);
  }
};

const handleCiMode = (isCi: boolean, totalChanges: number): void => {
  if (!isCi) return;

  process.exit(totalChanges > 0 ? 1 : 0);
};

const handleNoChanges = (totalChanges: number): void => {
  if (totalChanges === 0) {
    cliConsole.success("✅ Local configuration is already up to date!");
    process.exit(0);
  }
};

const requestConfirmation = async (): Promise<void> => {
  cliConsole.warn("⚠️  Introspecting will overwrite your local configuration file.");
  const confirmed = await confirmAction(
    "Do you want to continue and update the local file?",
    "This will overwrite your current local configuration with the remote state.",
    false
  );

  if (!confirmed) {
    cliConsole.info("Operation cancelled.");
    process.exit(0);
  }
};

const createConfigBackup = async (args: IntrospectCommandArgs): Promise<void> => {
  if (args.noBackup) return;

  if (!args.quiet) cliConsole.processing("💾 Creating backup...");
  const backupPath = await createBackup(args.config);
  if (!args.quiet) cliConsole.success(`✅ Backup created: ${backupPath}`);
};

const executeIntrospection = async (configurator: any, args: IntrospectCommandArgs): Promise<void> => {
  if (!args.quiet) cliConsole.processing("🌐 Fetching configuration from Saleor...");
  await configurator.introspect();
  
  const configPath = cliConsole.important(args.config);
  cliConsole.success(`✅ Configuration successfully saved to ${configPath}`);
};

const analyzeDifferences = async (configurator: any) => {
  return await configurator.diffForIntrospect({ 
    format: "table", 
    quiet: true 
  });
};

export async function introspectHandler(args: IntrospectCommandArgs): Promise<void> {
  try {
    setupConsole(args);
    displayHeader(args.quiet, args.ci);
    displayConfigurationInfo(args);

    const configurator = createConfigurator(args);
    
    showProcessingMessage(args.quiet, args.ci);
    const diffResult = await analyzeDifferences(configurator);

    const outputFormat = getOutputFormat(args);
    await displayDiffResult(diffResult, outputFormat, configurator);

    handleDryRunMode(args, diffResult.totalChanges);
    handleCiMode(args.ci, diffResult.totalChanges);
    handleNoChanges(diffResult.totalChanges);

    await requestConfirmation();
    await createConfigBackup(args);
    await executeIntrospection(configurator, args);

    process.exit(0);
  } catch (error) {
    cliConsole.error(`❌ Introspection failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

export const introspectCommandConfig: CommandConfig<typeof introspectCommandSchema> = {
  name: "introspect",
  description: "Downloads the current configuration from the remote Saleor instance",
  schema: introspectCommandSchema,
  handler: introspectHandler,
  requiresInteractive: false,
  examples: [
    "configurator introspect -u https://my-shop.saleor.cloud/graphql/ -t <token>",
    "configurator introspect --config output.yml",
    "configurator introspect --dry-run",
    "configurator introspect --ci",
    "configurator introspect --only channels,shop",
    "configurator introspect --exclude products",
    "configurator introspect --format json --quiet",
    "configurator introspect --no-backup",
  ],
};
