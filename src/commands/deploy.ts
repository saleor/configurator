import { z } from "zod";
import type { CommandConfig, CommandHandler } from "../cli/command";
import { baseCommandArgsSchema, confirmAction, shouldOutputJson } from "../cli/command";
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
import { DeployDiffFormatter } from "../core/diff/formatters";
import {
  ConfigurationLoadError,
  ConfigurationValidationError,
} from "../core/errors/configuration-errors";
import type { DuplicateIssue } from "../core/validation/preflight";
import { isEntitySection, runPreflightValidation } from "../core/validation/preflight";
import { isNonInteractiveEnvironment } from "../lib/ci-mode";
import { buildEnvelope, outputEnvelope } from "../lib/json-envelope";
import { globalLogCollector } from "../lib/json-log-collector";
import { logger } from "../lib/logger";
import { COMMAND_NAME } from "../meta";
import { AttributeCache } from "../modules/attribute/attribute-cache";

export const deployCommandSchema = baseCommandArgsSchema.extend({
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
  text: z.boolean().default(false).describe("Force human-readable output even in non-TTY mode"),
});

export type DeployCommandArgs = z.infer<typeof deployCommandSchema>;

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

      const suggestions = error.validationErrors
        .filter((err) => err.message.startsWith("Fix: "))
        .map((err) => err.message.slice(5));

      const nonSuggestionErrors = error.validationErrors.filter(
        (err) => !err.message.startsWith("Fix: ")
      );

      const validationErrors = nonSuggestionErrors.map((err) => `${err.path}: ${err.message}`);
      const deploymentError = new ValidationDeploymentError(
        "Configuration validation failed",
        validationErrors,
        {
          file: error.filePath,
          errorCount: nonSuggestionErrors.length,
        },
        error
      );
      this.console.error(deploymentError.getUserMessage(args.verbose));

      if (suggestions.length > 0) {
        this.console.text("");
        for (const suggestion of suggestions) {
          this.console.hint(`  💡 ${suggestion}`);
        }
      }

      process.exit(deploymentError.getExitCode());
    }

    const deploymentError = toDeploymentError(error, "deployment");
    this.console.error(deploymentError.getUserMessage(args.verbose));
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
    hasDestructiveOperations: boolean
  ): Promise<boolean> {
    if (isNonInteractiveEnvironment()) return true;

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
    } catch (error) {
      logger.warn("Failed to generate cleanup suggestions", { error });
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
      const reportPath = await resolveReportPath(args.reportPath, "deploy", args.url);
      await reportGenerator.saveToFile(reportPath);
      this.console.text("");
      this.console.success(`Deployment report saved to: ${reportPath}`);

      if (isInManagedDirectory(reportPath)) {
        try {
          const pruned = await pruneOldReports(getReportsDirectory());
          if (pruned.length > 0) {
            this.console.muted(`Pruned ${pruned.length} old report(s)`);
          }
        } catch (pruneError) {
          logger.debug("Failed to prune old reports", {
            error: pruneError instanceof Error ? pruneError.message : String(pruneError),
          });
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
    summary: DiffSummary,
    configurator: ReturnType<typeof createConfigurator>
  ): Promise<{ metrics: DeploymentMetrics; exitCode: number; hasPartialSuccess: boolean }> {
    const startTime = new Date();

    this.console.muted("🚀 Deploying configuration to Saleor...");
    this.console.text("");

    const context: DeploymentContext = {
      configurator,
      args,
      summary,
      startTime,
      attributeCache: new AttributeCache(),
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

  private async validateLocalConfiguration(
    args: DeployCommandArgs,
    configurator: ReturnType<typeof createConfigurator>
  ): Promise<void> {
    try {
      const cfg = await configurator.services.configStorage.load();
      runPreflightValidation(cfg, args.config);
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

  private async analyzeDifferences(
    args: DeployCommandArgs,
    configurator: ReturnType<typeof createConfigurator>
  ): Promise<{
    summary: DiffSummary;
    output: string;
    hasDestructiveOperations: boolean;
  }> {
    const { summary, output } = await configurator.diff({
      skipMedia: args.skipMedia,
    });

    return {
      summary,
      output,
      hasDestructiveOperations: summary.deletes > 0,
    };
  }

  private formatPlanResult(
    diffAnalysis: { summary: DiffSummary; hasDestructiveOperations: boolean },
    args: DeployCommandArgs
  ) {
    const { summary } = diffAnalysis;

    const operations = summary.results.map((result) => ({
      entity: result.entityType,
      name: result.entityName,
      action: result.operation.toLowerCase(),
      fields: result.changes?.map((c) => c.field) ?? [],
    }));

    return {
      status: "plan" as const,
      summary: {
        creates: summary.creates,
        updates: summary.updates,
        deletes: summary.deletes,
        noChange: 0,
      },
      operations,
      validationErrors: [] as string[],
      willDeleteEntities: diffAnalysis.hasDestructiveOperations,
      configFile: args.config,
      saleorUrl: args.url,
    };
  }

  private checkDeletionPolicy(summary: DiffSummary, args: DeployCommandArgs, useJson: boolean): void {
    if (args.failOnDelete && summary.deletes > 0) {
      const message = `Deployment blocked: ${summary.deletes} deletion(s) detected (--fail-on-delete is enabled)`;
      if (useJson) {
        outputEnvelope(
          buildEnvelope({
            command: "deploy",
            exitCode: EXIT_CODES.DELETION_BLOCKED,
            result: { status: "blocked", reason: "deletions_detected", deletions: summary.deletes },
            errors: [{ message }],
          })
        );
      } else {
        this.console.error(`❌ ${message}`);
      }
      process.exit(EXIT_CODES.DELETION_BLOCKED);
    }
  }

  private handleNoChanges(summary: DiffSummary, useJson: boolean): never {
    if (useJson) {
      outputEnvelope(
        buildEnvelope({
          command: "deploy",
          exitCode: EXIT_CODES.SUCCESS,
          result: { status: "no-changes" as const },
        })
      );
    } else {
      this.console.status("✅ No changes detected - configuration is already in sync");
    }
    process.exit(EXIT_CODES.SUCCESS);
  }

  private handlePlanMode(
    diffAnalysis: { summary: DiffSummary; hasDestructiveOperations: boolean },
    args: DeployCommandArgs,
    useJson: boolean
  ): never {
    const exitCode = diffAnalysis.summary.totalChanges > 0 ? 1 : EXIT_CODES.SUCCESS;
    if (useJson) {
      const result = this.formatPlanResult(diffAnalysis, args);
      outputEnvelope(buildEnvelope({ command: "deploy", exitCode, result }));
    } else {
      this.displayDeploymentPreview(diffAnalysis.summary);
      this.console.muted("\n📋 Plan mode: No changes will be applied");
    }
    process.exit(exitCode);
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
    const configurator = createConfigurator(args);
    const useJson = shouldOutputJson(args);

    try {
      await this.validateLocalConfiguration(args, configurator);

      if (!useJson) {
        this.console.muted("⏳ Analyzing configuration differences...");
      }

      const diffAnalysis = await this.analyzeDifferences(args, configurator);

      if (diffAnalysis.summary.totalChanges === 0) {
        return this.handleNoChanges(diffAnalysis.summary, useJson);
      }

      this.checkDeletionPolicy(diffAnalysis.summary, args, useJson);

      if (args.plan) {
        return this.handlePlanMode(diffAnalysis, args, useJson);
      }

      if (!useJson) {
        this.displayDeploymentPreview(diffAnalysis.summary);
      }

      const shouldDeploy = await this.confirmDeployment(
        diffAnalysis.summary,
        diffAnalysis.hasDestructiveOperations
      );

      if (!shouldDeploy) {
        this.console.cancelled("Deployment cancelled by user");
        process.exit(0);
      }

      const deploymentResult = await this.executeDeployment(args, diffAnalysis.summary, configurator);
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
    globalLogCollector.reset();
    const useJson = shouldOutputJson(args);
    this.console.setOptions({ quiet: args.quiet || useJson });

    if (!useJson) {
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
    `${COMMAND_NAME} deploy --config custom-config.yml`,
    `${COMMAND_NAME} deploy --report-path custom-report.json`,
    `${COMMAND_NAME} deploy --quiet`,
    `${COMMAND_NAME} deploy # Saves report to .configurator/reports/`,
    `${COMMAND_NAME} deploy --plan # Dry-run: show what would be deployed`,
    `${COMMAND_NAME} deploy --json # Output deployment results as JSON`,
    `${COMMAND_NAME} deploy --fail-on-delete # Block deployment if deletions detected`,
    `${COMMAND_NAME} deploy --skip-media # Deploy without modifying existing media`,
  ],
};
