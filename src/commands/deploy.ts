import { 
  parseCliArgs, 
  commandSchemas,
  validateSaleorUrl,
  setupLogger,
  displayConfig,
  handleCommandError,
  confirmPrompt,
  deploymentConfirmationPrompt,
  displayDeploymentSummary
} from "../cli";
import { createConfigurator } from "../core/factory";
import { fileExists } from "../lib/utils/file";

const argsSchema = commandSchemas.deploy;

/**
 * Represents a deployment plan with resource operations
 */
interface DeploymentPlan {
  readonly totalChanges: number;
  readonly creates: number;
  readonly updates: number;
  readonly deletes: number;
  readonly hasDestructiveChanges: boolean;
  readonly affectedResources: string[];
  readonly diffResults: readonly any[]; // DiffResult array from the diff service
}

/**
 * Configuration for deployment execution
 */
interface DeploymentConfig {
  readonly showDiff: boolean;
  readonly autoApprove: boolean;
  readonly dryRun: boolean;
  readonly target?: string[];
  readonly continueOnError: boolean;
  readonly parallelism: number;
  readonly refreshOnly: boolean;
}

async function runDeploy() {
  try {
    console.log("🚀 Saleor Configuration Deploy\n");
    
    const args = parseCliArgs(argsSchema, "deploy");
    const { 
      url, 
      token, 
      config: configPath, 
      quiet, 
      verbose, 
      dryRun, 
      force,
      plan,
      autoApprove,
      target,
      diff: showDiff,
      continueOnError,
      parallelism,
      refreshOnly
    } = args;

        const validatedUrl = validateSaleorUrl(url, quiet);
  
  // Validate configuration file exists
  if (!fileExists(configPath)) {
    console.error(`❌ Configuration file not found: ${configPath}`);
    console.error("💡 Run 'npm run introspect' first to create a configuration file");
    process.exit(1);
  }

  const deploymentConfig: DeploymentConfig = {
    showDiff: showDiff && !plan, // Don't show detailed diff in plan mode
    autoApprove: autoApprove || force, // force flag implies auto-approve for backward compatibility
    dryRun: dryRun || plan, // plan flag implies dry-run
    target: target?.split(",").map(t => t.trim()),
    continueOnError,
    parallelism,
    refreshOnly
  };

  // Suppress logs in plan mode unless verbose is explicitly requested
  const shouldQuietLogs = quiet || (plan && !verbose);
  setupLogger(verbose, shouldQuietLogs);
  
  // Show simplified config in plan mode
  if (plan && !verbose) {
    if (!quiet) {
      console.log("📋 Configuration:");
      console.log(`   URL: ${validatedUrl}`);
      console.log(`   Config: ${configPath}`);
      if (deploymentConfig.target) {
        console.log(`   Target: ${deploymentConfig.target.join(", ")}`);
      }
      console.log("");
    }
  } else {
    displayConfig({ ...args, url: validatedUrl }, quiet);
  }

    if (refreshOnly && !quiet) {
      console.log("🔄 Refresh-only mode: Only checking current state\n");
    } else if (deploymentConfig.dryRun && !quiet) {
      console.log("📋 Plan mode: Showing deployment plan without applying changes\n");
    }

    if (deploymentConfig.autoApprove && !quiet) {
      console.log("⚡ Auto-approve enabled: Changes will be applied automatically\n");
    }

    if (!quiet) {
      console.log("⚙️  Initializing deployment...");
    }

    const configurator = createConfigurator(token, validatedUrl, configPath);

    // Step 1: Generate deployment plan
    const deploymentPlan = await generateDeploymentPlan(
      configurator, 
      deploymentConfig, 
      quiet
    );

    if (deploymentPlan.totalChanges === 0) {
      if (!quiet) {
        console.log("✅ No changes detected - configuration is already in sync");
      }
      process.exit(0);
    }

    // Step 2: Display deployment plan
    await displayDeploymentPlan(deploymentPlan, deploymentConfig, quiet);

    // Step 3: Handle dry-run/plan mode
    if (deploymentConfig.dryRun) {
      if (!quiet) {
        console.log("\n📋 Deployment plan complete. Remove --plan or --dry-run to apply changes.");
      }
      process.exit(0);
    }

    // Step 4: Get approval for deployment
    const shouldProceed = await getDeploymentApproval(
      deploymentPlan, 
      deploymentConfig, 
      quiet
    );

    if (!shouldProceed) {
      console.log("❌ Deployment cancelled by user");
      process.exit(0);
    }

    // Step 5: Execute deployment
    const startTime = Date.now();
    let deploymentSuccessful = false;
    const deploymentErrors: string[] = [];

    try {
      await executeDeployment(configurator, deploymentConfig, quiet);
      deploymentSuccessful = true;
    } catch (error) {
      deploymentErrors.push(error instanceof Error ? error.message : String(error));
    }

    const duration = Date.now() - startTime;

    // Step 6: Display deployment summary
    if (!quiet) {
      displayDeploymentSummary({
        totalChanges: deploymentPlan.totalChanges,
        creates: deploymentPlan.creates,
        updates: deploymentPlan.updates,
        deletes: deploymentPlan.deletes,
        duration,
        successful: deploymentSuccessful,
        errors: deploymentErrors
      });

      if (deploymentSuccessful) {
        console.log("🔍 Run 'npm run diff' to verify the deployment");
      }
    }
    
    process.exit(deploymentSuccessful ? 0 : 1);

  } catch (error) {
    handleCommandError(error, "Deploy");
  }
}

/**
 * Generates a deployment plan by analyzing differences
 */
async function generateDeploymentPlan(
  configurator: ReturnType<typeof createConfigurator>,
  config: DeploymentConfig,
  quiet: boolean
): Promise<DeploymentPlan> {
  if (!quiet) {
    console.log("📊 Analyzing current state and generating deployment plan...");
  }

  try {
    const diffSummary = await configurator.diff({ 
      format: "json", // Use JSON format to get full diff results
      filter: config.target,
      quiet: true 
    });

    const hasDestructiveChanges = diffSummary.deletes > 0 || 
      diffSummary.updates > 0; // Updates can be destructive

    const affectedResources = extractAffectedResources(diffSummary);

    return {
      totalChanges: diffSummary.totalChanges,
      creates: diffSummary.creates,
      updates: diffSummary.updates,
      deletes: diffSummary.deletes,
      hasDestructiveChanges,
      affectedResources,
      diffResults: diffSummary.results // Add the detailed results
    };
  } catch (error) {
    if (!quiet) {
      console.error("❌ Failed to generate deployment plan");
    }
    throw error;
  }
}

/**
 * Displays the deployment plan to the user with focus on decision-making
 */
async function displayDeploymentPlan(
  plan: DeploymentPlan,
  config: DeploymentConfig,
  quiet: boolean
): Promise<void> {
  if (quiet) return;

  console.log(`\n${"═".repeat(70)}`);
  console.log("🚀 DEPLOYMENT PLAN SUMMARY");
  console.log("═".repeat(70));

  // Impact Analysis Table
  displayImpactAnalysis(plan);

  // Execution Time Estimate
  displayExecutionEstimate(plan);

  console.log("\n📋 DETAILED CHANGES");
  console.log("─".repeat(70));

  // Group changes by risk level
  const { safeChanges, destructiveChanges } = groupChangesByRisk(plan.diffResults);

  // Display safe changes first
  if (safeChanges.length > 0) {
    console.log(`\n🟢 SAFE CHANGES (${safeChanges.length} operations)`);
    console.log("These changes are low-risk and won't remove existing data:\n");
    
    const safeGrouped = groupResultsByEntityType(safeChanges);
    for (const [entityType, results] of safeGrouped) {
      displayEntityChanges(entityType, results, true);
    }
  }

  // Display destructive changes with warnings
  if (destructiveChanges.length > 0) {
    console.log(`\n🔴 DESTRUCTIVE CHANGES (${destructiveChanges.length} operations)`);
    console.log("⚠️  These changes will permanently remove data from Saleor:\n");
    
    const destructiveGrouped = groupResultsByEntityType(destructiveChanges);
    for (const [entityType, results] of destructiveGrouped) {
      displayEntityChanges(entityType, results, false);
    }
  }

  // Enhanced summary with recommendations
  displayEnhancedSummary(plan, config);
}

/**
 * Gets user approval for deployment
 */
async function getDeploymentApproval(
  plan: DeploymentPlan,
  config: DeploymentConfig,
  quiet: boolean
): Promise<boolean> {
  // Auto-approve if configured
  if (config.autoApprove) {
    if (!quiet) {
      console.log("⚡ Auto-approving deployment...");
    }
    return true;
  }

  // Skip approval for non-destructive changes in non-interactive environments
  if (!plan.hasDestructiveChanges && process.env.CI) {
    return true;
  }

  // Use enhanced deployment confirmation prompt
  const decision = await deploymentConfirmationPrompt({
    totalChanges: plan.totalChanges,
    creates: plan.creates,
    updates: plan.updates,
    deletes: plan.deletes,
    hasDestructiveChanges: plan.hasDestructiveChanges,
    affectedResources: plan.affectedResources,
  });

  switch (decision) {
    case 'proceed':
      return true;
    case 'plan':
      // Show detailed plan and ask again
      if (!quiet) {
        console.log("\n📋 Showing detailed deployment plan...");
        // Here we could show more detailed diff information
        console.log("💡 Run 'npm run diff' for detailed changes before deploying");
      }
      return await confirmPrompt("Proceed with deployment after reviewing the plan?", false);
    case 'cancel':
    default:
      return false;
  }
}

/**
 * Executes the actual deployment
 */
async function executeDeployment(
  configurator: ReturnType<typeof createConfigurator>,
  config: DeploymentConfig,
  quiet: boolean
): Promise<void> {
  if (!quiet) {
    console.log("🚀 Executing deployment...");
    if (config.parallelism > 1) {
      console.log(`   Using ${config.parallelism} parallel operations`);
    }
    console.log("");
  }

  try {
    if (config.refreshOnly) {
      // In refresh-only mode, we would just update our understanding of remote state
      // For now, this is handled by the diff operation above
      if (!quiet) {
        console.log("🔄 State refreshed successfully");
      }
      return;
    }

    // Execute the actual deployment
    await configurator.push();

    if (!quiet) {
      console.log("📤 Configuration changes applied successfully");
    }

  } catch (error) {
    if (config.continueOnError) {
      console.error("❌ Some operations failed, but continuing due to --continue-on-error");
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    } else {
      throw error;
    }
  }
}

/**
 * Extracts affected resource names from diff summary
 */
function extractAffectedResources(diffSummary: any): string[] {
  if (!diffSummary.results) return [];
  
  return diffSummary.results.map((result: any) => 
    `${result.entityType}: ${result.entityName}`
  );
}

/**
 * Groups diff results by entity type for organized display
 */
function groupResultsByEntityType(results: readonly any[]): Map<string, any[]> {
  const grouped = new Map<string, any[]>();
  
  for (const result of results) {
    const entityType = result.entityType;
    if (!grouped.has(entityType)) {
      grouped.set(entityType, []);
    }
    grouped.get(entityType)!.push(result);
  }
  
  return grouped;
}

/**
 * Displays changes for a specific entity type in a user-friendly format
 */
function displayEntityChanges(entityType: string, results: any[], isSafe: boolean = true): void {
  const entityIcon = getEntityIcon(entityType);
  const riskIndicator = isSafe ? "" : " 🔥";
  console.log(`${entityIcon} ${entityType}${riskIndicator}`);
  
  for (const result of results) {
    const operationIcon = getOperationIcon(result.operation);
    const operationText = getOperationText(result.operation);
    const complexity = getChangeComplexity(result);
    
    console.log(`  ${operationIcon} ${operationText}: "${result.entityName}" ${complexity}`);
    
    // Show specific change details
    if (result.operation === "UPDATE" && result.changes) {
      for (const change of result.changes) {
        if (change.description) {
          console.log(`    - ${change.description}`);
        } else {
          console.log(`    - ${change.field}: "${change.currentValue}" → "${change.desiredValue}"`);
        }
      }
    } else if (result.operation === "CREATE" && result.desired) {
      // Show key properties for created resources
      showCreationDetails(result.desired);
    } else if (result.operation === "DELETE") {
      // Show what will be lost
      showDeletionImpact(result, entityType);
    }
  }
  console.log("");
}

/**
 * Shows creation details for new resources
 */
function showCreationDetails(entity: any): void {
  if (entity.currencyCode) {
    console.log(`    - Currency: ${entity.currencyCode}`);
  }
  if (entity.defaultCountry) {
    console.log(`    - Country: ${entity.defaultCountry}`);
  }
  if (entity.slug) {
    console.log(`    - Slug: ${entity.slug}`);
  }
}

/**
 * Gets the appropriate icon for an entity type
 */
function getEntityIcon(entityType: string): string {
  const icons: Record<string, string> = {
    "Product Types": "📦",
    "Channels": "🌐", 
    "Page Types": "📄",
    "Categories": "📂",
    "Shop Settings": "⚙️"
  };
  return icons[entityType] || "📋";
}

/**
 * Gets the appropriate icon for an operation
 */
function getOperationIcon(operation: string): string {
  const icons: Record<string, string> = {
    "CREATE": "➕",
    "UPDATE": "🔄",
    "DELETE": "➖"
  };
  return icons[operation] || "❓";
}

/**
 * Gets the human-readable text for an operation
 */
function getOperationText(operation: string): string {
  const texts: Record<string, string> = {
    "CREATE": "Create",
    "UPDATE": "Update", 
    "DELETE": "Delete"
  };
  return texts[operation] || operation;
}

/**
 * Displays impact analysis table
 */
function displayImpactAnalysis(plan: DeploymentPlan): void {
  console.log("\n📊 IMPACT ANALYSIS");
  console.log("┌─────────────────┬───────┬────────────────────────────────┐");
  console.log("│ Entity Type     │ Count │ Risk Level                     │");
  console.log("├─────────────────┼───────┼────────────────────────────────┤");
  
  const entityCounts = getEntityCounts(plan.diffResults);
  
  for (const [entityType, data] of entityCounts) {
    const riskLevel = getRiskLevel(data);
    const count = data.total.toString().padStart(3);
    const entityTypePadded = entityType.padEnd(15);
    console.log(`│ ${entityTypePadded} │  ${count}  │ ${riskLevel.padEnd(30)} │`);
  }
  
  console.log("└─────────────────┴───────┴────────────────────────────────┘");
}

/**
 * Displays execution time estimate
 */
function displayExecutionEstimate(plan: DeploymentPlan): void {
  const createTime = plan.creates * 1.5; // ~1.5s per create
  const updateTime = plan.updates * 2; // ~2s per update
  const deleteTime = plan.deletes * 1; // ~1s per delete
  const totalTime = Math.ceil(createTime + updateTime + deleteTime);
  
  console.log(`\n⏱️  ESTIMATED EXECUTION TIME: ~${totalTime} seconds`);
  if (plan.creates > 0) console.log(`  • Creates: ~${Math.ceil(createTime)}s (${plan.creates} operations)`);
  if (plan.updates > 0) console.log(`  • Updates: ~${Math.ceil(updateTime)}s (${plan.updates} operations)`);
  if (plan.deletes > 0) console.log(`  • Deletes: ~${Math.ceil(deleteTime)}s (${plan.deletes} operations)`);
}

/**
 * Groups changes by risk level
 */
function groupChangesByRisk(results: readonly any[]): { safeChanges: any[], destructiveChanges: any[] } {
  const safeChanges: any[] = [];
  const destructiveChanges: any[] = [];
  
  for (const result of results) {
    if (result.operation === "DELETE") {
      destructiveChanges.push(result);
    } else if (result.operation === "UPDATE" && hasDestructiveUpdates(result)) {
      destructiveChanges.push(result);
    } else {
      safeChanges.push(result);
    }
  }
  
  return { safeChanges, destructiveChanges };
}

/**
 * Displays enhanced summary with recommendations
 */
function displayEnhancedSummary(plan: DeploymentPlan, config: DeploymentConfig): void {
  console.log(`\n${"═".repeat(70)}`);
  console.log("📋 SUMMARY & RECOMMENDATIONS");
  console.log("═".repeat(70));
  
  console.log(`\n📊 Total Operations: ${plan.totalChanges}`);
  console.log(`  🟢 Safe: ${plan.creates + (plan.updates - getDestructiveUpdateCount(plan.diffResults))}`);
  console.log(`  🔴 Destructive: ${plan.deletes + getDestructiveUpdateCount(plan.diffResults)}`);
  
  // Recommendations
  console.log("\n💡 RECOMMENDATIONS");
  
  if (plan.deletes > 10) {
    console.log("• ⚠️  Consider creating a backup before proceeding");
    console.log("• 🎯 Use '--target' to deploy only specific resource types first");
    console.log("• 📥 Run 'pnpm run introspect' to include existing resources in your config");
  }
  
  if (plan.deletes > 0) {
    console.log("• 🔍 Run 'pnpm run diff' to see detailed field-level changes");
    console.log("• 🧪 Test in a development environment first");
  }
  
  if (config.target) {
    console.log(`• 🎯 Currently targeting: ${config.target.join(", ")} (other resources ignored)`);
  } else {
    console.log("• 🎯 Consider using '--target=categories,shop' to deploy safe changes first");
  }
  
  console.log(`\n${"═".repeat(70)}`);
}

/**
 * Gets change complexity indicator
 */
function getChangeComplexity(result: any): string {
  if (result.operation === "DELETE") {
    const attributeCount = result.current?.attributes?.length || 0;
    if (attributeCount > 5) return "🔥 COMPLEX";
    if (attributeCount > 0) return "⚡ MODERATE";
    return "✨ SIMPLE";
  }
  
  if (result.operation === "CREATE") {
    const attributeCount = result.desired?.attributes?.length || 0;
    if (attributeCount > 3) return "🔥 COMPLEX";
    if (attributeCount > 0) return "⚡ MODERATE";
    return "✨ SIMPLE";
  }
  
  if (result.operation === "UPDATE") {
    const changeCount = result.changes?.length || 0;
    if (changeCount > 3) return "🔥 COMPLEX";
    if (changeCount > 1) return "⚡ MODERATE";
    return "✨ SIMPLE";
  }
  
  return "";
}

/**
 * Shows deletion impact details
 */
function showDeletionImpact(result: any, entityType: string): void {
  console.log(`    ⚠️  This ${entityType.toLowerCase().slice(0, -1)} exists on Saleor but is not defined in your local config.`);
  
  // Show what will be lost
  if (result.current?.attributes?.length > 0) {
    const attrCount = result.current.attributes.length;
    console.log(`    📊 ${attrCount} attribute${attrCount !== 1 ? 's' : ''} will be lost: ${result.current.attributes.map((a: any) => a.name).join(', ')}`);
  }
  
  if (result.current?.settings) {
    console.log(`    ⚙️  Custom settings will be lost`);
  }
}

/**
 * Helper functions for impact analysis
 */
function getEntityCounts(results: readonly any[]): Map<string, { total: number, creates: number, updates: number, deletes: number }> {
  const counts = new Map();
  
  for (const result of results) {
    const entityType = result.entityType;
    if (!counts.has(entityType)) {
      counts.set(entityType, { total: 0, creates: 0, updates: 0, deletes: 0 });
    }
    
    const data = counts.get(entityType);
    data.total++;
    data[`${result.operation.toLowerCase()}s`]++;
  }
  
  return counts;
}

function getRiskLevel(data: { creates: number, updates: number, deletes: number }): string {
  if (data.deletes > 5) return "🔴 High (removes many resources)";
  if (data.deletes > 0) return "🟡 Medium (removes data)";
  if (data.updates > 0) return "🟡 Low (field updates)";
  return "🟢 Safe (new resources)";
}

function hasDestructiveUpdates(result: any): boolean {
  if (!result.changes) return false;
  
  // Consider updates that remove attributes as destructive
  return result.changes.some((change: any) => 
    change.field === 'attributes' && change.currentValue && !change.desiredValue
  );
}

function getDestructiveUpdateCount(results: readonly any[]): number {
  return results.filter(result => 
    result.operation === "UPDATE" && hasDestructiveUpdates(result)
  ).length;
}

export { runDeploy };

runDeploy().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
}); 