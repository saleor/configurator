import { z } from "zod";
import type { CommandConfig } from "../cli/command";
import { baseCommandArgsSchema, confirmAction } from "../cli/command";
import { cliConsole } from "../cli/console";
import { createConfigurator } from "../core/configurator";
import type { DiffSummary } from "../core/diff";
import { DiffFormatter } from "../core/diff/formatter";
import { ConfigurationValidationError } from "../core/diff/errors";
import { logger } from "../lib/logger";
import { DeploymentPipeline, DeploymentSummaryReport, getAllStages } from "../core/deployment";
import type { DeploymentContext } from "../core/deployment";

export const deployCommandSchema = baseCommandArgsSchema.extend({
  ci: z.boolean().default(false).describe("CI mode - skip confirmations for automated environments"),
  force: z.boolean().default(false).describe("Force mode - skip all confirmations (use with extreme caution)"),
  skipDiff: z.boolean().default(false).describe("Skip diff preview (not recommended)"),
});

export type DeployCommandArgs = z.infer<typeof deployCommandSchema>;

async function analyzeDifferences(args: DeployCommandArgs): Promise<{
  summary: DiffSummary;
  output: string;
  hasDestructiveOperations: boolean;
}> {
  const configurator = createConfigurator(args);
  
  // Validate local configuration first before making any network calls
  await configurator.validateLocalConfiguration();
  
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
  
  if (deleteResults.length === 0) {
    return "";
  }

  const lines = [
    "\n⚠️  DESTRUCTIVE OPERATIONS DETECTED!",
    "The following items will be PERMANENTLY DELETED:"
  ];

  for (const result of deleteResults) {
    lines.push(`• ${result.entityType}: "${result.entityName}"`);
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
  if (args.force) return true;
  if (args.ci) return true;

  if (hasDestructiveOperations) {
    return await confirmDestructiveOperations(summary);
  }

  return await confirmSafeOperations(summary);
}

async function executeDeployment(args: DeployCommandArgs, summary: DiffSummary): Promise<void> {
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
  
  // Display deployment summary
  const summaryReport = new DeploymentSummaryReport(metrics, summary);
  summaryReport.display();
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
    if (args.skipDiff) {
      cliConsole.warn("⚠️  Skipping diff preview as requested");
      diffAnalysis = {
        summary: { totalChanges: 0, creates: 0, updates: 0, deletes: 0, results: [] },
        output: "",
        hasDestructiveOperations: false
      };
    } else {
      cliConsole.processing("⏳ Analyzing configuration differences...");
      diffAnalysis = await analyzeDifferences(args);
      
      if (diffAnalysis.summary.totalChanges === 0) {
        cliConsole.status("✅ No changes detected - configuration is already in sync");
        process.exit(0);
      }

      cliConsole.status(`\n${formatDeploymentPreview(diffAnalysis.summary)}`);
      cliConsole.status(`\n${DiffFormatter.format(diffAnalysis.summary)}`);
    }

    const shouldDeploy = await confirmDeployment(
      diffAnalysis.summary,
      diffAnalysis.hasDestructiveOperations,
      args
    );

    if (!shouldDeploy) {
      cliConsole.cancelled("Deployment cancelled by user");
      process.exit(0);
    }

    await executeDeployment(args, diffAnalysis.summary);
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
    
    if (error.message.includes("Network")) {
      cliConsole.warn("💡 Check your internet connection and Saleor instance URL");
    } else if (error.message.includes("Authentication") || error.message.includes("Unauthorized")) {
      cliConsole.warn("💡 Verify your API token has the required permissions");
    } else if (error.message.includes("Configuration")) {
      cliConsole.warn("💡 Check your configuration file for syntax errors");
    } else {
      cliConsole.warn("💡 Run with --verbose for more details");
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
  cliConsole.title(`${cliConsole.icon('error')} Configuration Validation Failed`);
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
    "configurator deploy --force",
    "configurator deploy --skip-diff --quiet",
  ],
}; 