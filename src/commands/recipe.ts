import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Command } from "@commander-js/extra-typings";
import ora from "ora";
import { stringify } from "yaml";
import { z } from "zod";
import { baseCommandArgsSchema, confirmAction } from "../cli/command";
import { Console, cliConsole } from "../cli/console";
import { createConfigurator } from "../core/configurator";
import { DeployDiffFormatter } from "../core/diff/formatters";
import type { DiffSummary } from "../core/diff/types";
import { ZodValidationError } from "../lib/errors/zod";
import { logger } from "../lib/logger";
import { COMMAND_NAME } from "../meta";
import { RecipeLoadError, RecipeNotFoundError } from "../modules/recipe/errors";
import { loadManifest } from "../modules/recipe/recipe-repository";
import {
  exportRecipe,
  formatRecipeDetails,
  formatRecipeDetailsJson,
  formatRecipeList,
  formatRecipeListJson,
  getRecipe,
  listRecipes,
  loadRecipeConfig,
} from "../modules/recipe/recipe-service";
import type { Recipe } from "../modules/recipe/schema";
import { recipeCategorySchema } from "../modules/recipe/schema";

// ============================================================================
// Shared helpers
// ============================================================================

/**
 * Extracts error message from unknown error
 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Outputs JSON to console with formatting
 */
function outputJson(data: Record<string, unknown>): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Creates change counts object from summary
 */
function createChangeCounts(summary: DiffSummary) {
  return {
    total: summary.totalChanges,
    creates: summary.creates,
    updates: summary.updates,
    deletes: summary.deletes,
  };
}

/**
 * Handles RecipeNotFoundError with available recipe suggestions
 */
function handleRecipeNotFound(error: RecipeNotFoundError, cliConsole: Console): never {
  cliConsole.error(error.message);

  try {
    const manifest = loadManifest();
    if (manifest.recipes.length > 0) {
      console.log("\nAvailable recipes:");
      for (const recipe of manifest.recipes) {
        console.log(`  - ${recipe.name}`);
      }
    }
  } catch (manifestError) {
    logger.warn("Failed to load manifest for suggestions", {
      error: getErrorMessage(manifestError),
    });
  }

  console.log("\nUse 'configurator recipe list' to see all recipes");
  process.exit(1);
}

// ============================================================================
// recipe list (or just 'recipe' with no args)
// ============================================================================

/**
 * Schema for 'recipe' command arguments (list functionality)
 */
export const recipeListArgsSchema = z.object({
  category: recipeCategorySchema.optional().describe("Filter recipes by category"),
  json: z.boolean().default(false).describe("Output as JSON for automation"),
});

export type RecipeListArgs = z.infer<typeof recipeListArgsSchema>;

/**
 * Handler for 'recipe' command (list)
 */
async function listHandler(args: RecipeListArgs): Promise<void> {
  const cliConsole = new Console();

  logger.info("Listing recipes", { category: args.category });

  const recipes = listRecipes({ category: args.category });

  if (args.json) {
    console.log(formatRecipeListJson(recipes));
  } else {
    cliConsole.header("🍳 Recipe Browser\n");
    console.log(formatRecipeList(recipes));
  }

  logger.info("Recipe list complete", { count: recipes.length });
}

// Note: Command configuration is now built via createRecipeCommand() at the bottom of the file

// ============================================================================
// recipe-show
// ============================================================================

/**
 * Schema for 'recipe-show' command arguments
 */
export const recipeShowArgsSchema = z.object({
  name: z.string().describe("Recipe name to preview"),
  json: z.boolean().default(false).describe("Output as JSON for automation"),
});

export type RecipeShowArgs = z.infer<typeof recipeShowArgsSchema>;

/**
 * Handler for 'recipe-show' command
 */
async function showHandler(args: RecipeShowArgs): Promise<void> {
  const cliConsole = new Console();

  logger.info("Showing recipe", { name: args.name });

  try {
    const recipe = getRecipe(args.name);

    if (args.json) {
      console.log(formatRecipeDetailsJson(recipe));
    } else {
      cliConsole.header("🍳 Recipe Preview\n");
      console.log(formatRecipeDetails(recipe));
    }

    logger.info("Recipe show complete", { name: args.name });
  } catch (error) {
    if (error instanceof RecipeNotFoundError) {
      handleRecipeNotFound(error, cliConsole);
    }
    throw error;
  }
}

// Note: Command configuration is now built via createRecipeCommand() at the bottom of the file

// ============================================================================
// recipe-apply
// ============================================================================

/**
 * Schema for 'recipe-apply' command arguments
 */
export const recipeApplyArgsSchema = baseCommandArgsSchema.extend({
  name: z.string().describe("Recipe name or path to apply"),
  ci: z.boolean().default(false).describe("CI mode - skip all confirmations"),
  plan: z.boolean().default(false).describe("Show deployment plan without applying"),
  json: z.boolean().default(false).describe("Output as JSON for automation"),
});

export type RecipeApplyArgs = z.infer<typeof recipeApplyArgsSchema>;

/**
 * Writes recipe config to a temporary file for deployment
 */
function writeTempConfig(config: Record<string, unknown>): string {
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `recipe-config-${Date.now()}.yml`);
  const yamlContent = stringify(config, { lineWidth: 120 });

  try {
    fs.writeFileSync(tempFile, yamlContent, "utf-8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new RecipeLoadError(tempFile, `Failed to write temporary config: ${message}`);
  }

  return tempFile;
}

/**
 * Cleans up temporary config file
 */
function cleanupTempConfig(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    logger.warn("Failed to cleanup temp config", {
      path: filePath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Formats diff preview for recipe apply
 */
function formatRecipeApplyPreview(recipeName: string, totalChanges: number): string {
  if (totalChanges === 0) {
    return "✅ No changes detected - recipe configuration already matches remote";
  }

  return [
    `📊 Recipe Apply Preview: ${recipeName}`,
    "╭─────────────────────────────────────────────────────────╮",
    `│ 🔄 ${totalChanges} changes will be applied to your Saleor instance │`,
    "╰─────────────────────────────────────────────────────────╯",
  ].join("\n");
}

/**
 * Context for recipe apply operation
 */
interface ApplyContext {
  args: RecipeApplyArgs;
  cliConsole: Console;
  recipe: Recipe;
  configurator: ReturnType<typeof createConfigurator>;
  summary: DiffSummary;
}

/**
 * Outputs no-changes result in JSON or human-readable format
 */
function outputNoChanges(ctx: Pick<ApplyContext, "args" | "cliConsole" | "recipe">): void {
  if (ctx.args.json) {
    outputJson({
      status: "no_changes",
      recipe: ctx.recipe.metadata.name,
      message: "Recipe configuration already matches remote",
    });
  } else {
    ctx.cliConsole.success("✅ No changes detected - recipe configuration already matches remote");
  }
}

/**
 * Outputs plan mode result in JSON or human-readable format
 */
function outputPlanMode(
  ctx: Pick<ApplyContext, "args" | "cliConsole" | "recipe" | "summary">
): void {
  if (ctx.args.json) {
    outputJson({
      status: "plan",
      recipe: ctx.recipe.metadata.name,
      changes: createChangeCounts(ctx.summary),
      results: ctx.summary.results,
    });
  } else {
    ctx.cliConsole.muted("\n📋 Plan mode: No changes will be applied");
  }
}

/**
 * Outputs success result in JSON or human-readable format
 */
function outputSuccess(
  ctx: Pick<ApplyContext, "args" | "cliConsole" | "recipe" | "summary">
): void {
  if (ctx.args.json) {
    outputJson({
      status: "success",
      recipe: ctx.recipe.metadata.name,
      changes: createChangeCounts(ctx.summary),
    });
  } else {
    ctx.cliConsole.success(`\n✅ Recipe "${ctx.recipe.metadata.name}" applied successfully!`);
    ctx.cliConsole.hint(`Run '${COMMAND_NAME} diff' to verify the configuration`);
  }
}

/**
 * Outputs error result in JSON or human-readable format
 */
function outputError(args: RecipeApplyArgs, cliConsole: Console, error: unknown): void {
  const message = getErrorMessage(error);
  if (args.json) {
    outputJson({ status: "error", message });
  } else {
    cliConsole.error(`Recipe apply failed: ${message}`);
  }
}

/**
 * Displays diff preview for recipe apply
 */
function displayDiffPreview(ctx: Pick<ApplyContext, "recipe" | "summary">): void {
  console.log(`\n${formatRecipeApplyPreview(ctx.recipe.metadata.name, ctx.summary.totalChanges)}`);
  const diffFormatter = new DeployDiffFormatter();
  console.log(`\n${diffFormatter.format(ctx.summary)}`);
}

/**
 * Confirms deployment with user (unless CI mode)
 */
async function confirmDeployment(
  ctx: Pick<ApplyContext, "args" | "cliConsole" | "recipe" | "summary">
): Promise<boolean> {
  if (ctx.args.ci || ctx.args.json) {
    return true;
  }

  const shouldProceed = await confirmAction(
    `Apply recipe "${ctx.recipe.metadata.name}" with ${ctx.summary.totalChanges} changes?`,
    "This will modify your Saleor instance.",
    true
  );

  if (!shouldProceed) {
    ctx.cliConsole.cancelled("Recipe apply cancelled by user");
  }

  return shouldProceed;
}

/**
 * Handler for 'recipe-apply' command
 */
async function applyHandler(args: RecipeApplyArgs): Promise<void> {
  const cliConsole = new Console();
  cliConsole.setOptions({ quiet: args.quiet || args.json });

  let tempConfigPath: string | null = null;

  try {
    if (!args.json) {
      cliConsole.header("🍳 Recipe Apply\n");
    }
    logger.info("Applying recipe", { name: args.name });

    // Load recipe
    const spinner = args.json ? null : ora("Loading recipe...").start();
    const recipe = loadRecipeConfig(args.name);
    spinner?.succeed(`Loaded recipe: ${recipe.metadata.name}`);

    if (!args.json) {
      cliConsole.muted(`Recipe requires Saleor ${recipe.metadata.saleorVersion}`);
    }

    // Setup configurator with temp config
    tempConfigPath = writeTempConfig(recipe.config);
    logger.debug("Wrote temp config", { path: tempConfigPath });
    const configurator = createConfigurator({ ...args, config: tempConfigPath });

    // Analyze differences
    const diffSpinner = args.json ? null : ora("Analyzing configuration differences...").start();
    const { summary } = await configurator.diff({ skipMedia: false });
    diffSpinner?.succeed(`Found ${summary.totalChanges} changes`);

    const ctx = { args, cliConsole, recipe, configurator, summary };

    // Handle no changes
    if (summary.totalChanges === 0) {
      outputNoChanges(ctx);
      process.exit(0);
    }

    // Display diff preview
    if (!args.json) {
      displayDiffPreview(ctx);
    }

    // Handle plan mode
    if (args.plan) {
      outputPlanMode(ctx);
      process.exit(summary.totalChanges > 0 ? 1 : 0);
    }

    // Confirm and deploy
    if (!(await confirmDeployment(ctx))) {
      process.exit(0);
    }

    const deploySpinner = args.json ? null : ora("Applying recipe configuration...").start();
    try {
      await configurator.push();
      deploySpinner?.succeed("Recipe applied successfully!");
      outputSuccess(ctx);
      logger.info("Recipe apply complete", {
        name: recipe.metadata.name,
        changes: summary.totalChanges,
      });
      process.exit(0);
    } catch (error) {
      deploySpinner?.fail("Deployment failed");
      throw error;
    }
  } catch (error) {
    logger.error("Recipe apply failed", { error });
    outputError(args, cliConsole, error);
    process.exit(1);
  } finally {
    if (tempConfigPath) {
      cleanupTempConfig(tempConfigPath);
    }
  }
}

// Note: Command configuration is now built via createRecipeCommand() at the bottom of the file

// ============================================================================
// recipe-export
// ============================================================================

/**
 * Schema for 'recipe-export' command arguments
 */
export const recipeExportArgsSchema = z.object({
  name: z.string().describe("Recipe name to export"),
  output: z.string().optional().describe("Output file path (defaults to <recipe-name>.yml)"),
  json: z.boolean().default(false).describe("Output as JSON for automation"),
});

export type RecipeExportArgs = z.infer<typeof recipeExportArgsSchema>;

/**
 * Handler for 'recipe-export' command
 */
async function exportHandler(args: RecipeExportArgs): Promise<void> {
  const cliConsole = new Console();

  logger.info("Exporting recipe", { name: args.name });

  try {
    const { path: outputPath, recipe } = exportRecipe(args.name, args.output);

    if (args.json) {
      outputJson({ status: "success", recipe: recipe.metadata.name, outputPath });
    } else {
      cliConsole.header("🍳 Recipe Export\n");
      cliConsole.success(`Exported recipe "${recipe.metadata.name}" to ${outputPath}`);
      console.log("");
      cliConsole.hint("Next steps:");
      console.log(`  1. Edit ${outputPath} to customize the configuration`);
      console.log(`  2. Apply the customized recipe:`);
      console.log(`     ${COMMAND_NAME} recipe apply ${outputPath} --url <URL> --token <TOKEN>`);
    }

    logger.info("Recipe export complete", { name: recipe.metadata.name, path: outputPath });
  } catch (error) {
    if (error instanceof RecipeNotFoundError) {
      handleRecipeNotFound(error, cliConsole);
    }
    throw error;
  }
}

// ============================================================================
// Recipe command with subcommands
// ============================================================================

/**
 * Handles errors from subcommand handlers
 */
function handleSubcommandError(error: unknown): never {
  cliConsole.error(error);
  process.exit(1);
}

/**
 * Creates the list subcommand
 */
function createListSubcommand() {
  const cmd = new Command("list")
    .description("List available configuration recipes")
    .option("--category <category>", "Filter recipes by category")
    .option("--json", "Output as JSON for automation");

  cmd.action(async (options: { category?: string; json?: boolean }) => {
    try {
      const result = recipeListArgsSchema.safeParse(options);
      if (!result.success) {
        throw ZodValidationError.fromZodError(result.error, "Invalid arguments");
      }
      await listHandler(result.data);
    } catch (error) {
      handleSubcommandError(error);
    }
  });

  return cmd;
}

/**
 * Creates the show subcommand
 */
function createShowSubcommand() {
  const cmd = new Command("show")
    .description("Preview a recipe's configuration")
    .argument("<name>", "Recipe name to preview")
    .option("--json", "Output as JSON for automation");

  cmd.action(async (name: string, options: { json?: boolean }) => {
    try {
      const result = recipeShowArgsSchema.safeParse({ name, ...options });
      if (!result.success) {
        throw ZodValidationError.fromZodError(result.error, "Invalid arguments");
      }
      await showHandler(result.data);
    } catch (error) {
      handleSubcommandError(error);
    }
  });

  return cmd;
}

/**
 * Creates the apply subcommand
 */
function createApplySubcommand() {
  const cmd = new Command("apply")
    .description("Apply a recipe configuration to your Saleor instance")
    .argument("<name>", "Recipe name or path to apply")
    .requiredOption("--url <url>", "Saleor instance URL")
    .requiredOption("--token <token>", "Saleor API token")
    .option("--quiet", "Suppress output")
    .option("--ci", "CI mode - skip all confirmations")
    .option("--plan", "Show deployment plan without applying")
    .option("--json", "Output as JSON for automation");

  cmd.action(async (name: string, options: Record<string, unknown>) => {
    try {
      const result = recipeApplyArgsSchema.safeParse({ name, ...options });
      if (!result.success) {
        throw ZodValidationError.fromZodError(result.error, "Invalid arguments");
      }
      await applyHandler(result.data);
    } catch (error) {
      handleSubcommandError(error);
    }
  });

  return cmd;
}

/**
 * Creates the export subcommand
 */
function createExportSubcommand() {
  const cmd = new Command("export")
    .description("Export a recipe to a local file for customization")
    .argument("<name>", "Recipe name to export")
    .option("--output <output>", "Output file path (defaults to <recipe-name>.yml)")
    .option("--json", "Output as JSON for automation");

  cmd.action(async (name: string, options: { output?: string; json?: boolean }) => {
    try {
      const result = recipeExportArgsSchema.safeParse({ name, ...options });
      if (!result.success) {
        throw ZodValidationError.fromZodError(result.error, "Invalid arguments");
      }
      await exportHandler(result.data);
    } catch (error) {
      handleSubcommandError(error);
    }
  });

  return cmd;
}

/**
 * Creates the main recipe command with all subcommands
 */
export function createRecipeCommand() {
  const recipeCommand = new Command("recipe")
    .description("Manage configuration recipes for your Saleor instance")
    .addCommand(createListSubcommand())
    .addCommand(createShowSubcommand())
    .addCommand(createApplySubcommand())
    .addCommand(createExportSubcommand());

  // Add help examples
  recipeCommand.addHelpText(
    "after",
    `
Examples:
  ${COMMAND_NAME} recipe list                              # List all available recipes
  ${COMMAND_NAME} recipe list --category multi-region      # Filter by category
  ${COMMAND_NAME} recipe show multi-region                 # Preview a recipe
  ${COMMAND_NAME} recipe apply multi-region --url <URL> --token <TOKEN>  # Apply a recipe
  ${COMMAND_NAME} recipe export multi-region               # Export for customization
`
  );

  return recipeCommand;
}
