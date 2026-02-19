import { z } from "zod";
import type { CommandConfig, CommandHandler } from "../cli/command";
import { baseCommandArgsSchema, confirmAction } from "../cli/command";
import { Console } from "../cli/console";
import { printDuplicateIssues } from "../cli/reporters/duplicates";
import { createConfigurator } from "../core/configurator";
import type { DeploymentContext, DeploymentMetrics } from "../core/deployment";
import {
  DeploymentReportGenerator,
  DeploymentSummaryReport,
  getAllStages,
} from "../core/deployment";
import { analyzeDeploymentCleanup } from "../core/deployment/cleanup-advisor";
import { executeEnhancedDeployment } from "../core/deployment/enhanced-pipeline";
import {
  EXIT_CODES,
  toDeploymentError,
  ValidationDeploymentError,
} from "../core/deployment/errors";
import {
  getReportsDirectory,
  isInManagedDirectory,
  pruneOldReports,
  resolveReportPath,
} from "../core/deployment/report-storage";
import { DeploymentResultFormatter } from "../core/deployment/results";
import type { DiffSummary } from "../core/diff";
import { createJsonFormatter, DeployDiffFormatter } from "../core/diff/formatters";
import {
  ConfigurationLoadError,
  ConfigurationValidationError,
} from "../core/errors/configuration-errors";
import type { DuplicateIssue } from "../core/validation/preflight";
import { validateNoDuplicateIdentifiers } from "../core/validation/preflight";
import { logger } from "../lib/logger";
import { COMMAND_NAME } from "../meta";

const VALID_ENTITY_SECTIONS = new Set<string>([
  "channels",
  "warehouses",
  "shippingZones",
  "productTypes",
  "pageTypes",
  "categories",
  "products",
  "collections",
  "menus",
  "models",
  "taxClasses",
]);

export const deployCommandSchema = baseCommandArgsSchema.extend({
  ci: z
    .boolean()
    .default(false)
    .describe("CI mode - skip all confirmations for automated environments"),
  reportPath: z
    .string()
    .optional()
    .describe(
      "Path to save deployment report (defaults to .configurator/reports/deployment-report-YYYY-MM-DD_HH-MM-SS.json)"
    ),
  verbose: z.boolean().optional().default(false).describe("Show detailed error information"),
  json: z.boolean().default(false).describe("Output deployment results in JSON format"),
  plan: z.boolean().default(false).describe("Show deployment plan without executing"),
  failOnDelete: z.boolean().default(false).describe("Exit with error if deletions detected"),
  skipMedia: z
    .boolean()
    .default(false)
    .describe("Skip media fields during deployment (preserves target media)"),
});

export type DeployCommandArgs = z.infer<typeof deployCommandSchema>;

function isEntitySection(value: string): value is DuplicateIssue["section"] {
  return VALID_ENTITY_SECTIONS.has(value);
}

class DeployCommandHandler implements CommandHandler<DeployCommandArgs, void> {
  console = new Console();

  private parseDuplicateIssues(error: ConfigurationValidationError): DuplicateIssue[] {
    const duplicateRegex = /Duplicate\s+(.+?)\s+'(.+?)'\s+found\s+(\d+)\s+times/i;

    return error.validationErrors
      .map((v) => {
        const match = v.message.match(duplicateRegex);
        if (!match) return null;
        if (!isEntitySection(v.path)) return null;
        return {
          section: v.path,
          label: match[1],
          identifier: match[2],
          count: Number(match[3]),
        };
      })
      .filter((issue): issue is DuplicateIssue => issue !== null);
  }

  private handleDeploymentError(error: unknown, args: DeployCommandArgs): never {
    logger.error("Deployment failed", { error });

    if (error instanceof ConfigurationValidationError) {
      const dupes = this.parseDuplicateIssues(error);

      if (dupes.length > 0) {
        printDuplicateIssues(dupes, this.console, args.config);
        this.console.cancelled("\nDeployment blocked until duplicates are resolved.");
        process.exit(EXIT_CODES.VALIDATION);
      }

      const validationErrors = error.validationErrors.map((err) => `${err.path}: ${err.message}`);
      const deploymentError = new ValidationDeploymentError(
        "Configuration validation failed",
        validationErrors,
        {
          file: error.filePath,
          errorCount: error.validationErrors.length,
        },
        error
      );
      this.console.error(deploymentError.getUserMessage(args.verbose ?? false));
      process.exit(deploymentError.getExitCode());
    }

    const deploymentError = toDeploymentError(error, "deployment");
    this.console.error(deploymentError.getUserMessage(args.verbose ?? false));
    process.exit(deploymentError.getExitCode());
  }

  private async confirmSafeOperations(summary: DiffSummary): Promise<boolean> {
    const changeText = summary.totalChanges === 1 ? "change" : "changes";

    return await confirmAction(
      `Deploy ${summary.totalChanges} ${changeText} to your Saleor instance?`,
      "This will modify your production environment.",
      true
    );
  }

  private formatDestructiveOperationsWarning(summary: DiffSummary): string {
    const attributeValueRemovals = summary.results.filter(
      (r) =>
        r.operation === "UPDATE" &&
        r.changes?.some((c) => c.field.includes("values") && c.currentValue && !c.desiredValue)
    );

    if (attributeValueRemovals.length === 0) {
      return "";
    }

    const lines: string[] = [];

    if (attributeValueRemovals.length > 0) {
      lines.push("\nAttribute values will be removed (if not in use):");
      for (const result of attributeValueRemovals) {
        if (!result.changes) continue;
        const removals = result.changes.filter(
          (c) => c.field.includes("values") && c.currentValue && !c.desiredValue
        );
        if (removals.length > 0) {
          lines.push(`• ${result.entityName}: ${removals.map((r) => r.currentValue).join(", ")}`);
        }
      }
    }

    return lines.join("\n");
  }

  private async confirmDeployment(
    summary: DiffSummary,
    hasDestructiveOperations: boolean,
    args: DeployCommandArgs
  ): Promise<boolean> {
    if (args.ci) return true;

    if (hasDestructiveOperations) {
      const warningMessage = this.formatDestructiveOperationsWarning(summary);
      this.console.warn(warningMessage);

      return await confirmAction(
        "Are you sure you want to continue? This action cannot be undone."
      );
    }

    return this.confirmSafeOperations(summary);
  }

  private formatDeploymentPreview(summary: DiffSummary): string {
    if (summary.totalChanges === 0) {
      return "✅ No changes detected - configuration is already in sync";
    }

    const lines = [
      "📊 Deployment Preview:",
      "╭─────────────────────────────────────────────────────────╮",
      `│ 🔄 ${summary.totalChanges} changes will be applied to your Saleor instance │`,
      "├─────────────────────────────────────────────────────────┤",
    ];

    if (summary.creates > 0) {
      lines.push(`│ ✅ ${summary.creates} items to create                           │`);
    }

    if (summary.updates > 0) {
      lines.push(`│ 📝 ${summary.updates} items to update                           │`);
    }

    if (summary.deletes > 0) {
      lines.push(`│ ⚠️  ${summary.deletes} items to delete                           │`);
    }

    lines.push("╰─────────────────────────────────────────────────────────╯");

    return lines.join("\n");
  }

  private displayDeploymentResult(
    result: { overallStatus: "success" | "partial" | "failed" },
    formattedResult: string
  ): void {
    switch (result.overallStatus) {
      case "success":
        this.console.success(formattedResult);
        break;
      case "partial":
        this.console.warn(formattedResult);
        break;
      case "failed":
        this.console.error(formattedResult);
        break;
    }
  }

  private async displayCleanupSuggestions(
    context: DeploymentContext,
    summary: DiffSummary
  ): Promise<void> {
    try {
      const cfg = await context.configurator.services.configStorage.load();
      const suggestions = analyzeDeploymentCleanup(cfg, summary);
      if (suggestions.length > 0) {
        this.console.warn("🔎 Post-deploy cleanup suggestions:");
        for (const s of suggestions) {
          this.console.warn(`  • ${s.message}`);
        }
        this.console.text("");
      }
    } catch {
      // Best-effort: ignore if config load fails after deploy
    }
  }

  private displayPendingDeletionWarnings(summary: DiffSummary): void {
    const pendingDeletes = summary.results.filter((r) => r.operation === "DELETE");
    if (pendingDeletes.length > 0) {
      this.console.warn("\n⚠️  Note: Some items marked for deletion may not have been removed:");
      this.console.warn("  • Attribute values cannot be deleted if they're used by products");
      this.console.warn("  • Product types cannot be deleted if they have associated products");
      this.console.warn("\n  Running deploy again will show remaining differences.");
      this.console.text("");
    }
  }

  private async saveAndPruneReport(
    args: DeployCommandArgs,
    metrics: DeploymentMetrics,
    summary: DiffSummary
  ): Promise<void> {
    try {
      const reportGenerator = new DeploymentReportGenerator(metrics, summary);
      const reportPath = await resolveReportPath(args.reportPath);
      await reportGenerator.saveToFile(reportPath);
      this.console.text("");
      this.console.success(`Deployment report saved to: ${reportPath}`);

      if (isInManagedDirectory(reportPath)) {
        try {
          const pruned = await pruneOldReports(getReportsDirectory());
          if (pruned.length > 0) {
            this.console.muted(`Pruned ${pruned.length} old report(s)`);
          }
        } catch {
          // Best-effort pruning
        }
      }
    } catch (error) {
      this.console.warn(
        `Failed to save deployment report: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async executeDeployment(
    args: DeployCommandArgs,
    summary: DiffSummary
  ): Promise<{ metrics: DeploymentMetrics; exitCode: number; hasPartialSuccess: boolean }> {
    const configurator = createConfigurator(args);
    const startTime = new Date();

    this.console.muted("🚀 Deploying configuration to Saleor...");
    this.console.text("");

    const context: DeploymentContext = {
      configurator,
      args,
      summary,
      startTime,
    };

    const { metrics, result, exitCode } = await executeEnhancedDeployment(getAllStages(), context);

    this.console.text("");

    const formatter = new DeploymentResultFormatter();
    const formattedResult = formatter.format(result);
    this.displayDeploymentResult(result, formattedResult);

    this.console.text("");

    await this.displayCleanupSuggestions(context, summary);
    this.displayPendingDeletionWarnings(summary);

    const summaryReport = new DeploymentSummaryReport(metrics, summary);
    summaryReport.display();

    await this.saveAndPruneReport(args, metrics, summary);

    return {
      metrics,
      exitCode,
      hasPartialSuccess: result.overallStatus === "partial",
    };
  }

  private async validateLocalConfiguration(args: DeployCommandArgs): Promise<void> {
    const configurator = createConfigurator(args);

    try {
      const cfg = await configurator.services.configStorage.load();
      validateNoDuplicateIdentifiers(cfg, args.config);
    } catch (error) {
      if (error instanceof ConfigurationValidationError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new ConfigurationLoadError(`Failed to load local configuration: ${error.message}`);
      }
      throw error;
    }
  }

  private async analyzeDifferences(args: DeployCommandArgs): Promise<{
    summary: DiffSummary;
    output: string;
    hasDestructiveOperations: boolean;
  }> {
    const configurator = createConfigurator(args);

    const { summary, output } = await configurator.diff({
      skipMedia: args.skipMedia,
    });

    return {
      summary,
      output,
      hasDestructiveOperations: summary.deletes > 0,
    };
  }

  private formatJsonOutput(summary: DiffSummary, args: DeployCommandArgs): string {
    const formatter = createJsonFormatter({
      saleorUrl: args.url,
      configFile: args.config,
      prettyPrint: true,
    });
    return formatter.format(summary);
  }

  private checkDeletionPolicy(summary: DiffSummary, args: DeployCommandArgs): void {
    if (args.failOnDelete && summary.deletes > 0) {
      const message = `❌ Deployment blocked: ${summary.deletes} deletion(s) detected (--fail-on-delete is enabled)`;
      if (args.json) {
        console.log(
          JSON.stringify({
            status: "blocked",
            reason: "deletions_detected",
            deletions: summary.deletes,
            message,
          })
        );
      } else {
        this.console.error(message);
      }
      process.exit(EXIT_CODES.DELETION_BLOCKED);
    }
  }

  private handleNoChanges(summary: DiffSummary, args: DeployCommandArgs): never {
    if (args.json) {
      console.log(this.formatJsonOutput(summary, args));
    } else {
      this.console.status("✅ No changes detected - configuration is already in sync");
    }
    process.exit(EXIT_CODES.SUCCESS);
  }

  private handlePlanMode(diffAnalysis: { summary: DiffSummary }, args: DeployCommandArgs): never {
    if (args.json) {
      console.log(this.formatJsonOutput(diffAnalysis.summary, args));
    } else {
      this.displayDeploymentPreview(diffAnalysis.summary);
      this.console.muted("\n📋 Plan mode: No changes will be applied");
    }
    process.exit(diffAnalysis.summary.totalChanges > 0 ? 1 : EXIT_CODES.SUCCESS);
  }

  private displayDeploymentPreview(summary: DiffSummary): void {
    this.console.status(`\n${this.formatDeploymentPreview(summary)}`);
    const deployFormatter = new DeployDiffFormatter();
    this.console.status(`\n${deployFormatter.format(summary)}`);
  }

  private logDeploymentCompletion(
    summary: DiffSummary,
    result: { exitCode: number; hasPartialSuccess: boolean }
  ): void {
    logger.info("Deployment completed", {
      totalChanges: summary.totalChanges,
      creates: summary.creates,
      updates: summary.updates,
      deletes: summary.deletes,
      exitCode: result.exitCode,
      hasPartialSuccess: result.hasPartialSuccess,
    });
  }

  private async performDeploymentFlow(args: DeployCommandArgs): Promise<void> {
    try {
      await this.validateLocalConfiguration(args);

      if (!args.json) {
        this.console.muted("⏳ Analyzing configuration differences...");
      }

      const diffAnalysis = await this.analyzeDifferences(args);

      if (diffAnalysis.summary.totalChanges === 0) {
        this.handleNoChanges(diffAnalysis.summary, args);
      }

      this.checkDeletionPolicy(diffAnalysis.summary, args);

      if (args.plan) {
        this.handlePlanMode(diffAnalysis, args);
      }

      if (!args.json) {
        this.displayDeploymentPreview(diffAnalysis.summary);
      }

      const shouldDeploy = await this.confirmDeployment(
        diffAnalysis.summary,
        diffAnalysis.hasDestructiveOperations,
        args
      );

      if (!shouldDeploy) {
        this.console.cancelled("Deployment cancelled by user");
        process.exit(0);
      }

      const deploymentResult = await this.executeDeployment(args, diffAnalysis.summary);
      this.logDeploymentCompletion(diffAnalysis.summary, deploymentResult);
      process.exit(deploymentResult.exitCode);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("process.exit(")) {
        throw error;
      }
      this.handleDeploymentError(error, args);
    }
  }

  async execute(args: DeployCommandArgs): Promise<void> {
    this.console.setOptions({ quiet: args.quiet || args.json });

    if (!args.json) {
      this.console.header("🚀 Saleor Configuration Deploy\n");
      if (args.skipMedia) {
        this.console.muted(
          "📷 Media handling: Skipped (--skip-media flag) - existing media will be preserved"
        );
      } else {
        this.console.muted(
          "💡 Tip: Use --skip-media when deploying across environments to preserve target media"
        );
      }
    }

    await this.performDeploymentFlow(args);
  }
}

export async function deployHandler(args: DeployCommandArgs): Promise<void> {
  const handler = new DeployCommandHandler();
  await handler.execute(args);
}

export const deployCommandConfig: CommandConfig<typeof deployCommandSchema> = {
  name: "deploy",
  description: "Deploys the local configuration to the remote Saleor instance",
  schema: deployCommandSchema,
  handler: deployHandler,
  requiresInteractive: true,
  examples: [
    `${COMMAND_NAME} deploy --url https://my-shop.saleor.cloud/graphql/ --token token123`,
    `${COMMAND_NAME} deploy --config custom-config.yml --ci`,
    `${COMMAND_NAME} deploy --report-path custom-report.json`,
    `${COMMAND_NAME} deploy --quiet`,
    `${COMMAND_NAME} deploy # Saves report to .configurator/reports/`,
    `${COMMAND_NAME} deploy --plan # Dry-run: show what would be deployed`,
    `${COMMAND_NAME} deploy --json # Output deployment results as JSON`,
    `${COMMAND_NAME} deploy --fail-on-delete --ci # Block deployment if deletions detected`,
    `${COMMAND_NAME} deploy --skip-media # Deploy without modifying existing media`,
  ],
};
