import { z } from "zod";
import type { CommandConfig, CommandHandler } from "../cli/command";
import { baseCommandArgsSchema, confirmAction } from "../cli/command";
import { Console } from "../cli/console";
import { createConfigurator } from "../core/configurator";
import type { DeploymentContext, DeploymentMetrics } from "../core/deployment";
import {
  DeploymentPipeline,
  DeploymentReportGenerator,
  DeploymentSummaryReport,
  getAllStages,
} from "../core/deployment";
import { toDeploymentError, ValidationDeploymentError } from "../core/deployment/errors";
import type { DiffSummary } from "../core/diff";
import { DeployDiffFormatter } from "../core/diff/formatters";
import {
  ConfigurationLoadError,
  ConfigurationValidationError,
} from "../core/errors/configuration-errors";
import { logger } from "../lib/logger";
import { COMMAND_NAME } from "../meta";

export const deployCommandSchema = baseCommandArgsSchema.extend({
  ci: z
    .boolean()
    .default(false)
    .describe("CI mode - skip all confirmations for automated environments"),
  reportPath: z
    .string()
    .optional()
    .describe(
      "Path to save deployment report (defaults to deployment-report-YYYY-MM-DD_HH-MM-SS.json)"
    ),
  verbose: z.boolean().optional().default(false).describe("Show detailed error information"),
});

export type DeployCommandArgs = z.infer<typeof deployCommandSchema>;

function generateDefaultReportPath(): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, "-") // Replace colons for Windows compatibility
    .replace(/\..+/, "") // Remove milliseconds
    .replace("T", "_"); // Replace T with underscore for readability
  return `deployment-report-${timestamp}.json`;
}

class DeployCommandHandler implements CommandHandler<DeployCommandArgs, void> {
  console = new Console();

  private handleDeploymentError(error: unknown, args: DeployCommandArgs): never {
    logger.error("Deployment failed", { error });

    // Handle ConfigurationValidationError specially for backwards compatibility
    if (error instanceof ConfigurationValidationError) {
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

    // Convert to DeploymentError for consistent handling
    const deploymentError = toDeploymentError(error, "deployment");

    // Display user-friendly error message
    this.console.error(deploymentError.getUserMessage(args.verbose ?? false));

    // Exit with appropriate code
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
    const deleteResults = summary.results.filter((result) => result.operation === "DELETE");
    const attributeValueRemovals = summary.results.filter(
      (r) =>
        r.operation === "UPDATE" &&
        r.changes?.some((c) => c.field.includes("values") && c.currentValue && !c.desiredValue)
    );

    if (deleteResults.length === 0 && attributeValueRemovals.length === 0) {
      return "";
    }

    // TODO: bring it back once we actually support destructive operations
    // const lines = ["\n⚠️  DESTRUCTIVE OPERATIONS DETECTED!"];
    // if (deleteResults.length > 0) {
    //   lines.push("The following items will be PERMANENTLY DELETED:");
    //   for (const result of deleteResults) {
    //     lines.push(`• ${result.entityType}: "${result.entityName}"`);
    //   }
    // }

    const lines = [];

    if (attributeValueRemovals.length > 0) {
      lines.push("\nAttribute values will be removed (if not in use):");
      for (const result of attributeValueRemovals) {
        const removals =
          result.changes?.filter(
            (c) => c.field.includes("values") && c.currentValue && !c.desiredValue
          ) || [];
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
        // "These items will be permanently deleted from your Saleor instance.",
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

  private async executeDeployment(
    args: DeployCommandArgs,
    summary: DiffSummary
  ): Promise<DeploymentMetrics> {
    const configurator = createConfigurator(args);
    const startTime = new Date();

    this.console.muted("🚀 Deploying configuration to Saleor...");
    this.console.text(""); // Add spacing for progress indicators

    const context: DeploymentContext = {
      configurator,
      args,
      summary,
      startTime,
    };

    const pipeline = new DeploymentPipeline();
    getAllStages().forEach((stage) => pipeline.addStage(stage));

    const metrics = await pipeline.execute(context);

    this.console.text(""); // Add spacing before summary
    this.console.success("✅ Configuration deployed successfully!");
    this.console.text("");

    // Check if there are items that should have been deleted
    const pendingDeletes = summary.results.filter((r) => r.operation === "DELETE");
    if (pendingDeletes.length > 0) {
      this.console.warn("\n⚠️  Note: Some items marked for deletion may not have been removed:");
      this.console.warn("  • Attribute values cannot be deleted if they're used by products");
      this.console.warn("  • Product types cannot be deleted if they have associated products");
      this.console.warn("\n  Running deploy again will show remaining differences.");
      this.console.text("");
    }

    // Display deployment summary
    const summaryReport = new DeploymentSummaryReport(metrics, summary);
    summaryReport.display();

    // Generate and save report (always save with default filename if not specified)
    try {
      const reportGenerator = new DeploymentReportGenerator(metrics, summary);
      const reportPath = args.reportPath || generateDefaultReportPath();
      await reportGenerator.saveToFile(reportPath);
      this.console.text("");
      this.console.success(`📄 Deployment report saved to: ${reportPath}`);
    } catch (error) {
      this.console.warn(
        `⚠️  Failed to save deployment report: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    return metrics;
  }

  private async validateLocalConfiguration(args: DeployCommandArgs): Promise<void> {
    const configurator = createConfigurator(args);

    try {
      // Try to load the configuration to validate it
      await configurator.services.configStorage.load();
    } catch (error) {
      // Re-throw with proper error type
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

    const { summary, output } = await configurator.diff();

    return {
      summary,
      output,
      hasDestructiveOperations: summary.deletes > 0,
    };
  }

  private async performDeploymentFlow(args: DeployCommandArgs): Promise<boolean> {
    let diffAnalysis: Awaited<ReturnType<typeof this.analyzeDifferences>>;

    try {
      // Validate local configuration first before making any network requests
      await this.validateLocalConfiguration(args);

      this.console.muted("⏳ Analyzing configuration differences...");
      diffAnalysis = await this.analyzeDifferences(args);

      if (diffAnalysis.summary.totalChanges === 0) {
        this.console.status("✅ No changes detected - configuration is already in sync");
        return false; // Exit gracefully without changes
      }

      this.console.status(`\n${this.formatDeploymentPreview(diffAnalysis.summary)}`);

      // TEMPORARY FEATURE FLAG: Remove after A/B testing
      // Use SALEOR_COMPACT_ARRAYS=false to show individual array changes
      const deployFormatter = new DeployDiffFormatter();
      this.console.status(`\n${deployFormatter.format(diffAnalysis.summary)}`);

      const shouldDeploy = await this.confirmDeployment(
        diffAnalysis.summary,
        diffAnalysis.hasDestructiveOperations,
        args
      );

      if (!shouldDeploy) {
        this.console.cancelled("Deployment cancelled by user");
        return false; // Exit gracefully when cancelled
      }

      await this.executeDeployment(args, diffAnalysis.summary);

      logger.info("Deployment completed successfully", {
        totalChanges: diffAnalysis.summary.totalChanges,
        creates: diffAnalysis.summary.creates,
        updates: diffAnalysis.summary.updates,
        deletes: diffAnalysis.summary.deletes,
      });

      return true; // Indicate successful deployment with changes
    } catch (error) {
      this.handleDeploymentError(error, args);
    }
  }

  async execute(args: DeployCommandArgs): Promise<void> {
    this.console.setOptions({ quiet: args.quiet });
    this.console.header("🚀 Saleor Configuration Deploy\n");

    const hasChanges = await this.performDeploymentFlow(args);

    // Exit with success code only after successful deployment with changes
    if (hasChanges) {
      process.exit(0);
    }
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
    "pnpm run deploy --config custom-config.yml --ci",
    "pnpm run deploy --report-path custom-report.json",
    "pnpm run deploy --quiet",
    "pnpm run deploy # Saves report as deployment-report-YYYY-MM-DD_HH-MM-SS.json",
  ],
};
