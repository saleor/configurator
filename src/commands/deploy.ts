import { z } from "zod";
import type { CommandConfig } from "../cli/command";
import { baseCommandArgsSchema, confirmAction } from "../cli/command";
import { cliConsole } from "../cli/console";
import { createConfigurator } from "../core/configurator";
import type { DiffSummary } from "../core/diff";
import { DeployDiffFormatter } from "../core/diff/formatters";
import { ConfigurationValidationError, ConfigurationLoadError } from "../core/diff/errors";
import { logger } from "../lib/logger";
import { DeploymentPipeline, DeploymentSummaryReport, DeploymentReportGenerator, getAllStages } from "../core/deployment";
import type { DeploymentContext, DeploymentMetrics } from "../core/deployment";

export const deployCommandSchema = baseCommandArgsSchema.extend({
  ci: z.boolean().default(false).describe("CI mode - skip all confirmations for automated environments"),
  reportPath: z.string().optional().describe("Path to save deployment report (defaults to deployment-report-YYYY-MM-DD_HH-MM-SS.json)"),
});

export type DeployCommandArgs = z.infer<typeof deployCommandSchema>;

function generateDefaultReportPath(): string {
  const timestamp = new Date().toISOString()
    .replace(/:/g, '-')  // Replace colons for Windows compatibility
    .replace(/\..+/, '') // Remove milliseconds
    .replace('T', '_');  // Replace T with underscore for readability
  return `deployment-report-${timestamp}.json`;
}

async function validateLocalConfiguration(args: DeployCommandArgs): Promise<void> {
  const configurator = createConfigurator(args);
  
  try {
    // Try to load the configuration to validate it
    await configurator.services.configStorage.load();
  } catch (error) {
    // Re-throw with proper error type
    if (error instanceof Error) {
      throw new ConfigurationLoadError(
        `Failed to load local configuration: ${error.message}`
      );
    }
    throw error;
  }
}

async function analyzeDifferences(args: DeployCommandArgs): Promise<{
  summary: DiffSummary;
  output: string;
  hasDestructiveOperations: boolean;
}> {
  const configurator = createConfigurator(args);
  
  const { summary, output } = await configurator.diff();
  
  return {
    summary,
    output,
    hasDestructiveOperations: summary.deletes > 0
  };
}

function formatDeploymentPreview(summary: DiffSummary): string {
  if (summary.totalChanges === 0) {
    return "✅ No changes detected - configuration is already in sync";
  }

  const lines = [
    "📊 Deployment Preview:",
    "╭─────────────────────────────────────────────────────────╮",
    `│ 🔄 ${summary.totalChanges} changes will be applied to your Saleor instance │`,
    "├─────────────────────────────────────────────────────────┤"
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

function formatDestructiveOperationsWarning(summary: DiffSummary): string {
  const deleteResults = summary.results.filter(result => result.operation === "DELETE");
  const attributeValueRemovals = summary.results.filter(r => 
    r.operation === "UPDATE" && 
    r.changes?.some(c => c.field.includes("values") && c.currentValue && !c.desiredValue)
  );
  
  if (deleteResults.length === 0 && attributeValueRemovals.length === 0) {
    return "";
  }

  const lines = [
    "\n⚠️  DESTRUCTIVE OPERATIONS DETECTED!",
  ];

  if (deleteResults.length > 0) {
    lines.push("The following items will be PERMANENTLY DELETED:");
    for (const result of deleteResults) {
      lines.push(`• ${result.entityType}: "${result.entityName}"`);
    }
  }

  if (attributeValueRemovals.length > 0) {
    lines.push("\nAttribute values will be removed (if not in use):");
    for (const result of attributeValueRemovals) {
      const removals = result.changes?.filter(c => 
        c.field.includes("values") && c.currentValue && !c.desiredValue
      ) || [];
      if (removals.length > 0) {
        lines.push(`• ${result.entityName}: ${removals.map(r => r.currentValue).join(", ")}`);
      }
    }
  }

  return lines.join("\n");
}

async function confirmDestructiveOperations(summary: DiffSummary): Promise<boolean> {
  const warningMessage = formatDestructiveOperationsWarning(summary);
  cliConsole.warn(warningMessage);

  return await confirmAction(
    "Are you sure you want to continue? This action cannot be undone.",
    "These items will be permanently deleted from your Saleor instance.",
    false
  );
}

async function confirmSafeOperations(summary: DiffSummary): Promise<boolean> {
  const changeText = summary.totalChanges === 1 ? "change" : "changes";
  
  return await confirmAction(
    `Deploy ${summary.totalChanges} ${changeText} to your Saleor instance?`,
    "This will modify your production environment.",
    true
  );
}

async function confirmDeployment(
  summary: DiffSummary,
  hasDestructiveOperations: boolean,
  args: DeployCommandArgs
): Promise<boolean> {
  if (args.ci) return true;

  if (hasDestructiveOperations) {
    return await confirmDestructiveOperations(summary);
  }

  return await confirmSafeOperations(summary);
}

async function executeDeployment(args: DeployCommandArgs, summary: DiffSummary): Promise<DeploymentMetrics> {
  const configurator = createConfigurator(args);
  const startTime = new Date();
  
  cliConsole.processing("🚀 Deploying configuration to Saleor...");
  cliConsole.text(""); // Add spacing for progress indicators
  
  const context: DeploymentContext = {
    configurator,
    args,
    summary,
    startTime,
  };
  
  const pipeline = new DeploymentPipeline();
  getAllStages().forEach(stage => pipeline.addStage(stage));
  
  const metrics = await pipeline.execute(context);
  
  cliConsole.text(""); // Add spacing before summary
  cliConsole.success("✅ Configuration deployed successfully!");
  cliConsole.text("");
  
  // Check if there are items that should have been deleted
  const pendingDeletes = summary.results.filter(r => r.operation === "DELETE");
  if (pendingDeletes.length > 0) {
    cliConsole.warn("\n⚠️  Note: Some items marked for deletion may not have been removed:");
    cliConsole.warn("  • Attribute values cannot be deleted if they're used by products");
    cliConsole.warn("  • Product types cannot be deleted if they have associated products");
    cliConsole.warn("\n  Running deploy again will show remaining differences.");
    cliConsole.text("");
  }
  
  // Display deployment summary
  const summaryReport = new DeploymentSummaryReport(metrics, summary);
  summaryReport.display();
  
  // Generate and save report (always save with default filename if not specified)
  try {
    const reportGenerator = new DeploymentReportGenerator(metrics, summary);
    const reportPath = args.reportPath || generateDefaultReportPath();
    await reportGenerator.saveToFile(reportPath);
    cliConsole.text("");
    cliConsole.success(`📄 Deployment report saved to: ${reportPath}`);
  } catch (error) {
    cliConsole.warn(`⚠️  Failed to save deployment report: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return metrics;
}

function logDeploymentCompletion(summary: DiffSummary): void {
  logger.info("Deployment completed successfully", {
    totalChanges: summary.totalChanges,
    creates: summary.creates,
    updates: summary.updates,
    deletes: summary.deletes,
  });
}

async function performDeploymentFlow(args: DeployCommandArgs): Promise<void> {
  let diffAnalysis: Awaited<ReturnType<typeof analyzeDifferences>>;

  try {
    // Validate local configuration first before making any network requests
    await validateLocalConfiguration(args);
    
    cliConsole.processing("⏳ Analyzing configuration differences...");
    diffAnalysis = await analyzeDifferences(args);
    
    if (diffAnalysis.summary.totalChanges === 0) {
      cliConsole.status("✅ No changes detected - configuration is already in sync");
      return; // Exit gracefully without changes
    }

    cliConsole.status(`\n${formatDeploymentPreview(diffAnalysis.summary)}`);
    
    // TEMPORARY FEATURE FLAG: Remove after A/B testing
    // Use SALEOR_COMPACT_ARRAYS=false to show individual array changes
    const compactArrays = process.env.SALEOR_COMPACT_ARRAYS !== "false";
    const deployFormatter = new DeployDiffFormatter(compactArrays);
    cliConsole.status(`\n${deployFormatter.format(diffAnalysis.summary)}`);

    const shouldDeploy = await confirmDeployment(
      diffAnalysis.summary,
      diffAnalysis.hasDestructiveOperations,
      args
    );

    if (!shouldDeploy) {
      cliConsole.cancelled("Deployment cancelled by user");
      return; // Exit gracefully when cancelled
    }

    const _metrics = await executeDeployment(args, diffAnalysis.summary);
    logDeploymentCompletion(diffAnalysis.summary);
  } catch (error) {
    handleDeploymentError(error);
  }
}

function handleDeploymentError(error: unknown): never {
  if (error instanceof ConfigurationValidationError) {
    handleValidationError(error);
    process.exit(1);
  }
  
  logger.error("Deployment failed", { error });
  
  if (error instanceof Error) {
    cliConsole.error(`❌ Deployment failed: ${error.message}`);
    
    // Provide helpful context based on error content
    if (error.message.includes("Network")) {
      cliConsole.warn("💡 Check your internet connection and Saleor instance URL");
    } else if (error.message.includes("Authentication") || error.message.includes("Unauthorized")) {
      cliConsole.warn("💡 Verify your API token has the required permissions");
    } else if (error.message.includes("Configuration")) {
      cliConsole.warn("💡 Check your configuration file for syntax errors");
    } else if (error.message.includes("product type") && error.message.includes("'Sweatshirt'")) {
      // Specific help for product type deletion failures
      cliConsole.warn("\n💡 Product type deletion failed. Common reasons:");
      cliConsole.warn("  • The product type has products associated with it");
      cliConsole.warn("  • You need to delete all products using this type first");
      cliConsole.warn("  • Or remove the product type from your local config to keep it");
    } else if (error.message.includes("Failed to manage") && error.message.includes("product type")) {
      // Generic product type management error
      cliConsole.warn("\n💡 Product type management failed. Check:");
      cliConsole.warn("  • Attribute value changes (they can't be renamed, only added/removed)");
      cliConsole.warn("  • Product types with associated products can't be deleted");
      cliConsole.warn("  • Ensure all referenced attributes exist");
    }
    
    throw error;
  } else {
    cliConsole.error("❌ An unexpected error occurred during deployment");
    throw new Error("An unexpected error occurred during deployment");
  }
}

function handleValidationError(error: ConfigurationValidationError): void {
  // Clear visual separation
  cliConsole.text("");
  
  // Main error header - clean and professional
  cliConsole.header(`${cliConsole.icon('error')} Configuration Validation Failed`);
  cliConsole.separator("═", 60);
  
  // File context with clean formatting
  cliConsole.text("");
  cliConsole.field("File", cliConsole.path(error.filePath));
  cliConsole.field("Errors found", cliConsole.value(error.validationErrors.length.toString()));
  cliConsole.text("");

  // Display first few errors with clean formatting
  const displayErrors = error.validationErrors.slice(0, 5);
  
  displayErrors.forEach((err, index) => {
    const pathDisplay = `${cliConsole.type('Config')}.${err.path}`;
    cliConsole.text(`  ${index + 1}. ${pathDisplay}`);
    cliConsole.text(`     ● ${err.message}`);
    cliConsole.text("");
  });

  if (error.validationErrors.length > 5) {
    cliConsole.muted(`     ... and ${error.validationErrors.length - 5} more errors`);
    cliConsole.text("");
  }

  // Action items section with clean styling
  cliConsole.separator("═", 60);
  cliConsole.subtitle("🔧 How to Fix These Issues");
  cliConsole.text("");
  
  cliConsole.text("  1. Fix the validation errors shown above");
  cliConsole.text("  2. Check SCHEMA.md for correct field formats");
  cliConsole.text("  3. Ensure all required fields are present");
  cliConsole.text("  4. Verify data types match schema requirements");
  
  cliConsole.text("");
}

export async function deployHandler(args: DeployCommandArgs): Promise<void> {
  cliConsole.setOptions({ quiet: args.quiet });
  cliConsole.header("🚀 Saleor Configuration Deploy\n");

  await performDeploymentFlow(args);
}

export const deployCommandConfig: CommandConfig<typeof deployCommandSchema> = {
  name: "deploy",
  description: "Deploys the local configuration to the remote Saleor instance",
  schema: deployCommandSchema,
  handler: deployHandler,
  requiresInteractive: true,
  examples: [
    "configurator deploy -u https://my-shop.saleor.cloud/graphql/ -t <token>",
    "configurator deploy --config custom-config.yml --ci",
    "configurator deploy --report-path custom-report.json",
    "configurator deploy --quiet",
    "configurator deploy # Saves report as deployment-report-YYYY-MM-DD_HH-MM-SS.json",
  ],
}; 