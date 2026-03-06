import yaml from "yaml";
import { z } from "zod";
import type { CommandConfig, CommandHandler } from "../cli/command";
import { baseCommandArgsSchema, confirmAction, shouldOutputJson } from "../cli/command";
import { Console } from "../cli/console";
import { createConfigurator, type SaleorConfigurator } from "../core/configurator";
import { DiffService } from "../core/diff";
import type { DiffSummary, IntrospectDiffResult, ParsedSelectiveOptions } from "../core/diff/types";
import { isNonInteractiveEnvironment } from "../lib/ci-mode";
import { buildEnvelope, outputEnvelope } from "../lib/json-envelope";
import { globalLogCollector } from "../lib/json-log-collector";
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
  driftCheck: z
    .boolean()
    .default(false)
    .describe("Exit with code 1 if remote differs from local (for CI drift detection)"),
  include: z
    .string()
    .optional()
    .describe("Comma-separated list of sections to include (e.g., 'channels,shop')"),
  exclude: z.string().optional().describe("Comma-separated list of sections to exclude"),
  verbose: z.boolean().default(false).describe("Show detailed changes for all items"),
  text: z.boolean().default(false).describe("Force human-readable output even in non-TTY mode"),
});

export type IntrospectCommandArgs = z.infer<typeof introspectCommandSchema>;

// Context object to avoid passing multiple parameters
export interface IntrospectContext {
  args: IntrospectCommandArgs;
  isQuiet: boolean;
  configurator: SaleorConfigurator;
  startTime: number;
  selectiveOptions: ParsedSelectiveOptions;
}

export class IntrospectCommandHandler
  implements CommandHandler<IntrospectCommandArgs, CommandResult>
{
  readonly console: Console = new Console();

  private setupConsole(isQuiet: boolean): void {
    this.console.setOptions({ quiet: isQuiet });
  }

  async execute(args: IntrospectCommandArgs): Promise<CommandResult> {
    const startTime = Date.now();
    const isQuiet = args.quiet || shouldOutputJson(args);

    const selectiveOptions = parseSelectiveOptions(args);

    try {
      // Initialize
      this.setupConsole(isQuiet);
      this.console.header(INTROSPECT_MESSAGES.HEADER);

      // Display configuration info
      this.displayConfigurationInfo(args, isQuiet, selectiveOptions);

      // Check if config file exists
      const configExists = fileExists(args.config);

      if (!configExists) {
        // Handle case where no config exists - just create it without diff analysis
        return await this.handleNoExistingConfig(args, startTime, selectiveOptions);
      }

      // Create context for existing config flow
      const configurator = createConfigurator(args);
      const context: IntrospectContext = {
        args,
        isQuiet,
        configurator,
        startTime,
        selectiveOptions,
      };

      // Execute main flow
      const diffResult = await this.analyzeDifferences(context);
      this.displayResults(diffResult, context);

      // Check exit conditions
      const earlyExitResult = this.checkEarlyExitConditions(diffResult.summary, context);
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

  private async handleNoExistingConfig(
    args: IntrospectCommandArgs,
    startTime: number,
    selectiveOptions: ParsedSelectiveOptions
  ): Promise<CommandResult> {
    // Create configurator
    const configurator = createConfigurator(args);

    try {
      // Fetch and save configuration directly - no diff, no confirmation needed
      this.console.muted(INTROSPECT_MESSAGES.PROCESSING_FETCH);

      await configurator.introspect(selectiveOptions);

      this.console.success(INTROSPECT_MESSAGES.SUCCESS_SAVE(args.config));

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      this.console.info(INTROSPECT_MESSAGES.TOTAL_TIME(totalTime));

      return CommandResult.success();
    } catch (error) {
      return this.handleError(error);
    }
  }

  private displayConfigurationInfo(
    args: IntrospectCommandArgs,
    isQuiet: boolean,
    selectiveOptions: ParsedSelectiveOptions
  ): void {
    if (isQuiet) return;

    // Show existing file info
    if (fileExists(args.config)) {
      this.console.muted(INTROSPECT_MESSAGES.FILE_EXISTS(args.config));
    } else {
      this.console.info(`Will create new configuration file: ${args.config}\n`);
    }

    // Show selective options
    const { includeSections, excludeSections } = selectiveOptions;
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
    const { includeSections, excludeSections } = context.selectiveOptions;

    // Create DiffService instance with the same service container
    const diffService = new DiffService(context.configurator.serviceContainer);

    return await diffService.diffForIntrospectWithFormatting({
      format: outputFormat === "yaml" ? "table" : outputFormat,
      quiet: true,
      includeSections,
      excludeSections,
    });
  }

  private displayResults(
    diffResult: IntrospectDiffResult,
    context: IntrospectContext
  ): void {
    if (context.isQuiet) return;

    const format = this.getOutputFormat(context.args);

    switch (format) {
      case "yaml": {
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

  private checkEarlyExitConditions(
    summary: DiffSummary,
    context: IntrospectContext
  ): CommandResult | null {
    // Check dry run
    if (context.args.dryRun) {
      return this.handleDryRun(summary.totalChanges, context);
    }

    // Check drift detection mode
    if (context.args.driftCheck) {
      return this.handleDriftCheck(summary.totalChanges);
    }

    // Check no changes
    if (summary.totalChanges === 0) {
      return this.handleNoChanges();
    }

    return null;
  }

  private handleDryRun(totalChanges: number, context: IntrospectContext): CommandResult {
    if (totalChanges === 0) {
      if (!context.isQuiet) {
        this.console.success(INTROSPECT_MESSAGES.DRY_RUN_NO_CHANGES);
      }
    } else {
      if (!context.isQuiet) {
        this.console.info(INTROSPECT_MESSAGES.DRY_RUN_CHANGES(totalChanges));
        this.console.info(INTROSPECT_MESSAGES.DRY_RUN_HINT);
      }
    }
    return CommandResult.success();
  }

  private handleDriftCheck(totalChanges: number): CommandResult {
    return totalChanges > 0
      ? CommandResult.error(`Configuration drift detected: ${totalChanges} change(s) found`, 1)
      : CommandResult.success();
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
    if (isNonInteractiveEnvironment()) {
      return null;
    }

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

    await context.configurator.introspect(context.selectiveOptions);

    const configPath = this.console.important(context.args.config);
    this.console.success(INTROSPECT_MESSAGES.SUCCESS_SAVE(configPath));
  }

  private displayExecutionTime(context: IntrospectContext): void {
    const totalTime = ((Date.now() - context.startTime) / 1000).toFixed(1);
    this.console.info(INTROSPECT_MESSAGES.TOTAL_TIME(totalTime));
  }

  private getOutputFormat(args: IntrospectCommandArgs): "table" | "json" | "yaml" {
    return shouldOutputJson(args) ? "json" : args.format;
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
  globalLogCollector.reset();
  const handler = new IntrospectCommandHandler();
  const result = await handler.execute(args);

  if (shouldOutputJson(args)) {
    const envelopeResult: Record<string, unknown> = {
      status: result.type,
      configPath: args.config,
    };
    if (result.type === "error" && result.message) {
      envelopeResult.message = result.message;
    }
    outputEnvelope(
      buildEnvelope({
        command: "introspect",
        exitCode: result.exitCode,
        result: envelopeResult,
      })
    );
  } else {
    if (result.type === "error" && result.message) {
      handler.console.error(`❌ ${result.message}`);
    }
  }

  process.exit(result.exitCode);
}

export const introspectCommandConfig: CommandConfig<typeof introspectCommandSchema> = {
  name: "introspect",
  description: "Downloads the current configuration from the remote Saleor instance",
  schema: introspectCommandSchema,
  handler: introspectHandler,
  requiresInteractive: true,
  examples: [
    `${COMMAND_NAME} introspect --url https://my-shop.saleor.cloud/graphql/ --token token123`,
    `${COMMAND_NAME} introspect --config output.yml`,
    `${COMMAND_NAME} introspect --dry-run`,
    `${COMMAND_NAME} introspect --drift-check # Exit 1 if remote differs from local`,
    `${COMMAND_NAME} introspect --include channels,shop`,
    `${COMMAND_NAME} introspect --exclude products`,
    `${COMMAND_NAME} introspect --format json --quiet`,
    `${COMMAND_NAME} introspect --backup=false`,
    `${COMMAND_NAME} introspect --verbose`,
  ],
};
