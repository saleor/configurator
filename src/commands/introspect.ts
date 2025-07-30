import { z } from "zod";
import type { CommandConfig, CommandHandler } from "../cli/command";
import { baseCommandArgsSchema, confirmAction } from "../cli/command";
import { Console } from "../cli/console";
import { createConfigurator, type SaleorConfigurator } from "../core/configurator";
import { DiffService } from "../core/diff";
import type { DiffSummary, IntrospectDiffResult } from "../core/diff/types";
import { logger } from "../lib/logger";
import { createBackup, fileExists } from "../lib/utils/file";
import { getSelectiveOptionsSummary, parseSelectiveOptions } from "../lib/utils/selective-options";
import { COMMAND_NAME } from "../meta";

// CLI Command result types
export const commandResultSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("success"),
    exitCode: z.literal(0),
  }),
  z.object({
    type: z.literal("info"),
    message: z.string(),
    exitCode: z.literal(0),
  }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
    exitCode: z.number().int().min(1).max(255),
  }),
  z.object({
    type: z.literal("cancelled"),
    exitCode: z.literal(0),
  }),
]);

type CommandResult = z.infer<typeof commandResultSchema>;

// Helper functions to create results
const CommandResult = {
  success: (): CommandResult => ({ type: "success", exitCode: 0 }),
  info: (message: string): CommandResult => ({
    type: "info",
    message,
    exitCode: 0,
  }),
  error: (message: string, exitCode = 1): CommandResult => ({
    type: "error",
    message,
    exitCode,
  }),
  cancelled: (): CommandResult => ({ type: "cancelled", exitCode: 0 }),
};

// Constants for magic strings
export const INTROSPECT_MESSAGES = {
  HEADER: "🔍 Saleor Configuration Introspect\n",
  DRY_RUN_NO_CHANGES: "✅ DRY RUN: No changes would be made to local configuration",
  DRY_RUN_CHANGES: (count: number) => `\n🔍 DRY RUN: ${count} changes would be made`,
  DRY_RUN_HINT: "Run without --dry-run to apply these changes",
  NO_CHANGES: "✅ Local configuration is already up to date!",
  OPERATION_CANCELLED: "Operation cancelled.",
  WARNING_OVERWRITE: "⚠️  Introspecting will overwrite your local configuration file.",
  CONFIRM_PROMPT: "Do you want to continue and update the local file?",
  CONFIRM_DESCRIPTION:
    "This will overwrite your current local configuration with the remote state.",
  PROCESSING_BACKUP: "💾 Creating backup...",
  SUCCESS_BACKUP: (path: string) => `✅ Backup created: ${path}`,
  PROCESSING_FETCH: "🌐 Fetching configuration from Saleor...",
  SUCCESS_SAVE: (path: string) => `✅ Configuration successfully saved to ${path}\n`,
  PROCESSING_DIFF: "🔍 Analyzing differences between remote and local configuration...\n",
  TOTAL_TIME: (time: string) => `\n⏱️  Total time: ${time}s`,
  TIP_VERBOSE: "💡 Tip: Use --verbose to see detailed changes for all items\n",
  CHANGES_TO_APPLY: "\nChanges to be applied:",
  FILE_EXISTS: (path: string) => `Local configuration file "${path}" already exists.\n`,
  // First-time user messages
  FIRST_TIME_WELCOME: "🎉 Welcome! No local configuration found.",
  FIRST_TIME_FETCH:
    "Configurator will download the current configuration from the remote Saleor instance.",
  FIRST_TIME_SUCCESS: "✨ Your configuration has been initialized successfully!",
  NEXT_STEPS: (configPath: string) => `
💡 Next steps:
   • Review your configuration in ${configPath}
   • Make any necessary adjustments
   • Use 'configurator deploy' to apply changes back to Saleor`,
} as const;

export const ERROR_ADVICE = {
  ECONNREFUSED: "Check that the Saleor URL is correct and the server is running",
  UNAUTHORIZED: "Check that your authentication token is valid",
  ENOENT: "Check that the configuration file path is correct",
  TIMEOUT: "The operation timed out. Try again or check your network connection",
} as const;

export const ERROR_PATTERNS = [
  { pattern: "ECONNREFUSED", advice: ERROR_ADVICE.ECONNREFUSED },
  { pattern: "401", advice: ERROR_ADVICE.UNAUTHORIZED },
  { pattern: "Unauthorized", advice: ERROR_ADVICE.UNAUTHORIZED },
  { pattern: "ENOENT", advice: ERROR_ADVICE.ENOENT },
  { pattern: "timeout", advice: ERROR_ADVICE.TIMEOUT },
] as const;

export const introspectCommandSchema = baseCommandArgsSchema.extend({
  dryRun: z.boolean().default(false).describe("Preview changes without applying them"),
  backup: z.boolean().default(true).describe("Create a backup before making changes"),
  format: z.enum(["table", "json", "yaml"]).default("table").describe("Output format"),
  ci: z
    .boolean()
    .default(false)
    .describe("CI mode: non-interactive, exits with code 1 if changes detected"),
  include: z
    .string()
    .optional()
    .describe("Comma-separated list of sections to include (e.g., 'channels,shop')"),
  exclude: z.string().optional().describe("Comma-separated list of sections to exclude"),
  verbose: z.boolean().default(false).describe("Show detailed changes for all items"),
});

export type IntrospectCommandArgs = z.infer<typeof introspectCommandSchema>;

// Context object to avoid passing multiple parameters
export interface IntrospectContext {
  args: IntrospectCommandArgs;
  isQuiet: boolean;
  configurator: SaleorConfigurator;
  startTime: number;
}

export class IntrospectCommandHandler
  implements CommandHandler<IntrospectCommandArgs, CommandResult>
{
  console: Console = new Console();

  private setupConsole(isQuiet: boolean): void {
    this.console.setOptions({ quiet: isQuiet });
  }

  async execute(args: IntrospectCommandArgs): Promise<CommandResult> {
    const startTime = Date.now();
    const isQuiet = args.quiet || args.ci;

    try {
      // Initialize
      this.setupConsole(isQuiet);
      this.console.header(INTROSPECT_MESSAGES.HEADER);

      // Check if this is a first-time user
      const isFirstTime = !fileExists(args.config);

      if (isFirstTime) {
        return await this.handleFirstTimeUser(args, startTime);
      }

      // Existing user flow
      this.displayConfigurationInfo(args, isQuiet);

      // Create context
      const configurator = createConfigurator(args);
      const context: IntrospectContext = {
        args,
        isQuiet,
        configurator,
        startTime,
      };

      // Execute main flow
      const diffResult = await this.analyzeDifferences(context);
      await this.displayResults(diffResult, context);

      // Check exit conditions
      const earlyExitResult = await this.checkEarlyExitConditions(diffResult.summary, context);
      if (earlyExitResult) return earlyExitResult;

      // Perform introspection
      const confirmResult = await this.confirmAndExecute(diffResult.summary, context);
      if (confirmResult) return confirmResult;

      // Show timing
      this.displayExecutionTime(context);

      return CommandResult.success();
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async handleFirstTimeUser(
    args: IntrospectCommandArgs,
    startTime: number
  ): Promise<CommandResult> {
    this.console.info(INTROSPECT_MESSAGES.FIRST_TIME_WELCOME);

    // Create configurator
    const configurator = createConfigurator(args);

    try {
      // Fetch and save configuration directly
      this.console.muted(INTROSPECT_MESSAGES.PROCESSING_FETCH);

      await configurator.introspect();

      this.console.success(INTROSPECT_MESSAGES.SUCCESS_SAVE(args.config));
      this.console.success(INTROSPECT_MESSAGES.FIRST_TIME_SUCCESS);
      this.console.info(INTROSPECT_MESSAGES.NEXT_STEPS(args.config));

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      this.console.info(INTROSPECT_MESSAGES.TOTAL_TIME(totalTime));

      return CommandResult.success();
    } catch (error) {
      return this.handleError(error);
    }
  }

  private displayConfigurationInfo(args: IntrospectCommandArgs, isQuiet: boolean): void {
    if (isQuiet) return;

    // Show existing file info
    if (fileExists(args.config)) {
      this.console.muted(INTROSPECT_MESSAGES.FILE_EXISTS(args.config));
    }

    // Show selective options
    const { includeSections, excludeSections } = parseSelectiveOptions(args);
    const selectiveSummary = getSelectiveOptionsSummary({
      includeSections,
      excludeSections,
    });

    [selectiveSummary.includeMessage, selectiveSummary.excludeMessage]
      .filter((message): message is string => Boolean(message))
      .forEach((message) => this.console.info(message));

    // Show tips
    if (!args.verbose && args.format === "table") {
      this.console.info(INTROSPECT_MESSAGES.TIP_VERBOSE);
    }
  }

  private async analyzeDifferences(context: IntrospectContext): Promise<IntrospectDiffResult> {
    this.console.muted(INTROSPECT_MESSAGES.PROCESSING_DIFF);

    const outputFormat = this.getOutputFormat(context.args);
    const { includeSections, excludeSections } = parseSelectiveOptions(context.args);

    // Create DiffService instance with the same service container
    const diffService = new DiffService(context.configurator.serviceContainer);

    return await diffService.diffForIntrospectWithFormatting({
      format: outputFormat === "yaml" ? "table" : outputFormat,
      quiet: true,
      includeSections,
      excludeSections,
    });
  }

  private async displayResults(
    diffResult: IntrospectDiffResult,
    context: IntrospectContext
  ): Promise<void> {
    if (context.isQuiet) return;

    const format = this.getOutputFormat(context.args);

    switch (format) {
      case "yaml": {
        const yaml = await import("yaml");
        this.console.info(yaml.stringify(diffResult.summary));
        break;
      }
      case "table":
      case "json":
        if (diffResult.formattedOutput) {
          this.console.info(diffResult.formattedOutput);
        }
        break;
    }
  }

  private async checkEarlyExitConditions(
    summary: DiffSummary,
    context: IntrospectContext
  ): Promise<CommandResult | null> {
    // Check dry run
    if (context.args.dryRun) {
      return this.handleDryRun(summary.totalChanges, context);
    }

    // Check CI mode
    if (context.args.ci) {
      return this.handleCiMode(summary.totalChanges);
    }

    // Check no changes
    if (summary.totalChanges === 0) {
      return this.handleNoChanges();
    }

    return null;
  }

  private handleDryRun(totalChanges: number, context: IntrospectContext): CommandResult {
    if (totalChanges === 0) {
      if (!context.args.ci) {
        this.console.success(INTROSPECT_MESSAGES.DRY_RUN_NO_CHANGES);
      }
    } else {
      if (!context.args.ci) {
        this.console.info(INTROSPECT_MESSAGES.DRY_RUN_CHANGES(totalChanges));
        this.console.info(INTROSPECT_MESSAGES.DRY_RUN_HINT);
      }
    }
    return CommandResult.success();
  }

  private handleCiMode(totalChanges: number): CommandResult {
    return totalChanges > 0 ? CommandResult.error("", 1) : CommandResult.success();
  }

  private handleNoChanges(): CommandResult {
    this.console.success(INTROSPECT_MESSAGES.NO_CHANGES);
    return CommandResult.success();
  }

  private async confirmAndExecute(
    summary: DiffSummary,
    context: IntrospectContext
  ): Promise<CommandResult | null> {
    // Request confirmation
    const confirmResult = await this.requestConfirmation(summary);
    if (confirmResult) return confirmResult;

    // Create backup
    await this.createBackup(context);

    // Execute introspection
    await this.executeIntrospection(context);

    return null;
  }

  private async requestConfirmation(summary: DiffSummary): Promise<CommandResult | null> {
    this.console.warn(INTROSPECT_MESSAGES.WARNING_OVERWRITE);

    if (summary.totalChanges > 0) {
      this.console.info(INTROSPECT_MESSAGES.CHANGES_TO_APPLY);
      this.console.info(this.formatDiffSummary(summary));
      this.console.info("");
    }

    const confirmed = await confirmAction(
      INTROSPECT_MESSAGES.CONFIRM_PROMPT,
      INTROSPECT_MESSAGES.CONFIRM_DESCRIPTION,
      false
    );

    if (!confirmed) {
      this.console.info(INTROSPECT_MESSAGES.OPERATION_CANCELLED);
      return CommandResult.cancelled();
    }

    return null;
  }

  private formatDiffSummary(summary: DiffSummary): string {
    if (summary.totalChanges === 0) {
      return "No changes detected";
    }

    const formatLine = (count: number, action: string) =>
      count > 0 ? `  ${count} ${count === 1 ? "item" : "items"} will be ${action}` : null;

    const lines = [
      formatLine(summary.creates, "added"),
      formatLine(summary.updates, "updated"),
      formatLine(summary.deletes, "removed"),
    ].filter(Boolean);

    return lines.join("\n");
  }

  private async createBackup(context: IntrospectContext): Promise<void> {
    if (!context.args.backup) return;

    this.console.muted(INTROSPECT_MESSAGES.PROCESSING_BACKUP);

    const backupPath = await createBackup(context.args.config);

    if (backupPath) {
      this.console.success(INTROSPECT_MESSAGES.SUCCESS_BACKUP(backupPath));
    }
  }

  private async executeIntrospection(context: IntrospectContext): Promise<void> {
    this.console.muted(INTROSPECT_MESSAGES.PROCESSING_FETCH);

    await context.configurator.introspect();

    const configPath = this.console.important(context.args.config);
    this.console.success(INTROSPECT_MESSAGES.SUCCESS_SAVE(configPath));
    this.console.info(INTROSPECT_MESSAGES.NEXT_STEPS(configPath));
  }

  private displayExecutionTime(context: IntrospectContext): void {
    const totalTime = ((Date.now() - context.startTime) / 1000).toFixed(1);
    this.console.info(INTROSPECT_MESSAGES.TOTAL_TIME(totalTime));
  }

  private getOutputFormat(args: IntrospectCommandArgs): "table" | "json" | "yaml" {
    return args.ci ? "json" : args.format;
  }

  private handleError(error: unknown): CommandResult {
    const errorMessage = error instanceof Error ? error.message : String(error);

    const matchedPattern = ERROR_PATTERNS.find(({ pattern }) => errorMessage.includes(pattern));
    const actionableAdvice = matchedPattern ? `\n💡 ${matchedPattern.advice}` : "";

    const finalMessage = `Introspection failed: ${errorMessage}${actionableAdvice}`;

    if (error instanceof Error && error.stack && errorMessage) {
      logger.error("Introspection error details", {
        error: errorMessage,
        stack: error.stack,
      });
    }

    return CommandResult.error(finalMessage);
  }
}

export async function introspectHandler(args: IntrospectCommandArgs): Promise<void> {
  const handler = new IntrospectCommandHandler();
  const result = await handler.execute(args);

  if (result.type === "error" && result.message) {
    handler.console.error(`❌ ${result.message}`);
  }

  process.exit(result.exitCode);
}

export const introspectCommandConfig: CommandConfig<typeof introspectCommandSchema> = {
  name: "introspect",
  description: "Downloads the current configuration from the remote Saleor instance",
  schema: introspectCommandSchema,
  handler: introspectHandler,
  requiresInteractive: false,
  examples: [
    `${COMMAND_NAME} introspect --url https://my-shop.saleor.cloud/graphql/ --token token123`,
    `${COMMAND_NAME} introspect --config output.yml`,
    `${COMMAND_NAME} introspect --dry-run`,
    `${COMMAND_NAME} introspect --ci`,
    `${COMMAND_NAME} introspect --include channels,shop`,
    `${COMMAND_NAME} introspect --exclude products`,
    `${COMMAND_NAME} introspect --format json --quiet`,
    `${COMMAND_NAME} introspect --backup=false`,
    `${COMMAND_NAME} introspect --verbose`,
  ],
};
