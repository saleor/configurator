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
import { ZodValidationError } from "../lib/errors/zod";
import { logger } from "../lib/logger";
import { COMMAND_NAME } from "../meta";
import { RecipeLoadError, RecipeNotFoundError } from "../modules/recipe/errors";
import { loadManifest, loadRecipe } from "../modules/recipe/recipe-repository";
import {
  exportRecipe,
  formatRecipeDetails,
  formatRecipeDetailsJson,
  formatRecipeList,
  formatRecipeListJson,
  listRecipes,
  loadRecipeConfig,
} from "../modules/recipe/recipe-service";
import { recipeCategorySchema } from "../modules/recipe/schema";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function handleRecipeNotFound(error: RecipeNotFoundError, console: Console): never {
  console.error(error.message);
  try {
    const manifest = loadManifest();
    if (manifest.recipes.length > 0) {
      process.stdout.write("\nAvailable recipes:\n");
      for (const recipe of manifest.recipes) {
        process.stdout.write(`  - ${recipe.name}\n`);
      }
    }
  } catch {
    // Ignore manifest load errors
  }
  process.stdout.write("\nUse 'configurator recipe list' to see all recipes\n");
  process.exit(1);
}

function handleSubcommandError(error: unknown): never {
  cliConsole.error(error);
  process.exit(1);
}

// ============================================================================
// List subcommand
// ============================================================================

export const recipeListArgsSchema = z.object({
  category: recipeCategorySchema.optional(),
  json: z.boolean().default(false),
});

async function listHandler(args: z.infer<typeof recipeListArgsSchema>): Promise<void> {
  const console = new Console();
  const recipes = listRecipes({ category: args.category });

  if (args.json) {
    process.stdout.write(`${formatRecipeListJson(recipes)}\n`);
  } else {
    console.header("🍳 Recipe Browser\n");
    process.stdout.write(`${formatRecipeList(recipes)}\n`);
  }
}

// ============================================================================
// Show subcommand
// ============================================================================

export const recipeShowArgsSchema = z.object({
  name: z.string(),
  json: z.boolean().default(false),
});

async function showHandler(args: z.infer<typeof recipeShowArgsSchema>): Promise<void> {
  const console = new Console();

  try {
    const recipe = loadRecipe(args.name);

    if (args.json) {
      process.stdout.write(`${formatRecipeDetailsJson(recipe)}\n`);
    } else {
      console.header("🍳 Recipe Preview\n");
      process.stdout.write(`${formatRecipeDetails(recipe)}\n`);
    }
  } catch (error) {
    if (error instanceof RecipeNotFoundError) {
      handleRecipeNotFound(error, console);
    }
    throw error;
  }
}

// ============================================================================
// Apply subcommand
// ============================================================================

export const recipeApplyArgsSchema = baseCommandArgsSchema.extend({
  name: z.string(),
  ci: z.boolean().default(false),
  plan: z.boolean().default(false),
  json: z.boolean().default(false),
});

interface ChangeSummary {
  total: number;
  creates: number;
  updates: number;
  deletes: number;
}

function writeTempConfig(config: Record<string, unknown>): string {
  const tempFile = path.join(os.tmpdir(), `recipe-config-${Date.now()}.yml`);
  try {
    fs.writeFileSync(tempFile, stringify(config, { lineWidth: 120 }), "utf-8");
  } catch (error) {
    throw new RecipeLoadError(
      tempFile,
      `Failed to write temporary config: ${getErrorMessage(error)}`
    );
  }
  return tempFile;
}

function cleanupTempConfig(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // Ignore cleanup errors
  }
}

function toChangeSummary(summary: {
  totalChanges: number;
  creates: number;
  updates: number;
  deletes: number;
}): ChangeSummary {
  return {
    total: summary.totalChanges,
    creates: summary.creates,
    updates: summary.updates,
    deletes: summary.deletes,
  };
}

function writeJsonOutput(data: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

function showDiffPreview(recipeName: string, totalChanges: number, formattedDiff: string): void {
  process.stdout.write(`\n📊 Recipe Apply Preview: ${recipeName}\n`);
  process.stdout.write("╭─────────────────────────────────────────────────────────╮\n");
  process.stdout.write(`│ 🔄 ${totalChanges} changes will be applied to your Saleor instance │\n`);
  process.stdout.write("╰─────────────────────────────────────────────────────────╯\n\n");
  process.stdout.write(`${formattedDiff}\n`);
}

async function applyHandler(args: z.infer<typeof recipeApplyArgsSchema>): Promise<void> {
  const console = new Console();
  console.setOptions({ quiet: args.quiet || args.json });
  let tempConfigPath: string | null = null;

  try {
    if (!args.json) console.header("🍳 Recipe Apply\n");
    logger.info("Applying recipe", { name: args.name });

    const spinner = args.json ? null : ora("Loading recipe...").start();
    const recipe = loadRecipeConfig(args.name);
    spinner?.succeed(`Loaded recipe: ${recipe.metadata.name}`);
    if (!args.json) console.muted(`Recipe requires Saleor ${recipe.metadata.saleorVersion}`);

    tempConfigPath = writeTempConfig(recipe.config);
    const configurator = createConfigurator({ ...args, config: tempConfigPath });

    const diffSpinner = args.json ? null : ora("Analyzing configuration differences...").start();
    const { summary } = await configurator.diff({ skipMedia: false });
    diffSpinner?.succeed(`Found ${summary.totalChanges} changes`);

    if (summary.totalChanges === 0) {
      if (args.json) {
        writeJsonOutput({
          status: "no_changes",
          recipe: recipe.metadata.name,
          message: "Recipe configuration already matches remote",
        });
      } else {
        console.success("✅ No changes detected - recipe configuration already matches remote");
      }
      return;
    }

    if (!args.json)
      showDiffPreview(
        recipe.metadata.name,
        summary.totalChanges,
        new DeployDiffFormatter().format(summary)
      );

    if (args.plan) {
      if (args.json) {
        writeJsonOutput({
          status: "plan",
          recipe: recipe.metadata.name,
          changes: toChangeSummary(summary),
          results: summary.results,
        });
      } else {
        console.muted("\n📋 Plan mode: No changes will be applied");
      }
      process.exit(summary.totalChanges > 0 ? 1 : 0);
    }

    if (!args.ci && !args.json) {
      const shouldProceed = await confirmAction(
        `Apply recipe "${recipe.metadata.name}" with ${summary.totalChanges} changes?`,
        "This will modify your Saleor instance.",
        true
      );
      if (!shouldProceed) {
        console.cancelled("Recipe apply cancelled by user");
        return;
      }
    }

    const deploySpinner = args.json ? null : ora("Applying recipe configuration...").start();
    try {
      await configurator.push();
      deploySpinner?.succeed("Recipe applied successfully!");
      if (args.json) {
        writeJsonOutput({
          status: "success",
          recipe: recipe.metadata.name,
          changes: toChangeSummary(summary),
        });
      } else {
        console.success(`\n✅ Recipe "${recipe.metadata.name}" applied successfully!`);
        console.hint(`Run '${COMMAND_NAME} diff' to verify the configuration`);
      }
    } catch (error) {
      deploySpinner?.fail("Deployment failed");
      throw error;
    }
  } catch (error) {
    logger.error("Recipe apply failed", { error });
    if (args.json) {
      writeJsonOutput({ status: "error", message: getErrorMessage(error) });
    } else {
      console.error(`Recipe apply failed: ${getErrorMessage(error)}`);
    }
    process.exit(1);
  } finally {
    if (tempConfigPath) cleanupTempConfig(tempConfigPath);
  }
}

// ============================================================================
// Export subcommand
// ============================================================================

export const recipeExportArgsSchema = z.object({
  name: z.string(),
  output: z.string().optional(),
  json: z.boolean().default(false),
});

async function exportHandler(args: z.infer<typeof recipeExportArgsSchema>): Promise<void> {
  const console = new Console();

  try {
    const { path: outputPath, recipe } = exportRecipe(args.name, args.output);

    if (args.json) {
      process.stdout.write(
        JSON.stringify({ status: "success", recipe: recipe.metadata.name, outputPath }, null, 2) +
          "\n"
      );
    } else {
      console.header("🍳 Recipe Export\n");
      console.success(`Exported recipe "${recipe.metadata.name}" to ${outputPath}`);
      process.stdout.write("\n");
      console.hint("Next steps:");
      process.stdout.write(`  1. Edit ${outputPath} to customize the configuration\n`);
      process.stdout.write(`  2. Apply the customized recipe:\n`);
      process.stdout.write(
        `     ${COMMAND_NAME} recipe apply ${outputPath} --url <URL> --token <TOKEN>\n`
      );
    }
  } catch (error) {
    if (error instanceof RecipeNotFoundError) {
      handleRecipeNotFound(error, console);
    }
    throw error;
  }
}

// ============================================================================
// Command builder
// ============================================================================

export function createRecipeCommand() {
  const cmd = new Command("recipe").description(
    "Manage configuration recipes for your Saleor instance"
  );

  cmd.addCommand(
    new Command("list")
      .description("List available configuration recipes")
      .option("--category <category>", "Filter recipes by category")
      .option("--json", "Output as JSON")
      .action(async (options) => {
        try {
          const result = recipeListArgsSchema.safeParse(options);
          if (!result.success)
            throw ZodValidationError.fromZodError(result.error, "Invalid arguments");
          await listHandler(result.data);
        } catch (error) {
          handleSubcommandError(error);
        }
      })
  );

  cmd.addCommand(
    new Command("show")
      .description("Preview a recipe's configuration")
      .argument("<name>", "Recipe name")
      .option("--json", "Output as JSON")
      .action(async (name, options) => {
        try {
          const result = recipeShowArgsSchema.safeParse({ name, ...options });
          if (!result.success)
            throw ZodValidationError.fromZodError(result.error, "Invalid arguments");
          await showHandler(result.data);
        } catch (error) {
          handleSubcommandError(error);
        }
      })
  );

  cmd.addCommand(
    new Command("apply")
      .description("Apply a recipe configuration to your Saleor instance")
      .argument("<name>", "Recipe name or path")
      .requiredOption("--url <url>", "Saleor instance URL")
      .requiredOption("--token <token>", "Saleor API token")
      .option("--quiet", "Suppress output")
      .option("--ci", "CI mode - skip confirmations")
      .option("--plan", "Show plan without applying")
      .option("--json", "Output as JSON")
      .action(async (name, options) => {
        try {
          const result = recipeApplyArgsSchema.safeParse({ name, ...options });
          if (!result.success)
            throw ZodValidationError.fromZodError(result.error, "Invalid arguments");
          await applyHandler(result.data);
        } catch (error) {
          handleSubcommandError(error);
        }
      })
  );

  cmd.addCommand(
    new Command("export")
      .description("Export a recipe to a local file for customization")
      .argument("<name>", "Recipe name")
      .option("--output <output>", "Output file path")
      .option("--json", "Output as JSON")
      .action(async (name, options) => {
        try {
          const result = recipeExportArgsSchema.safeParse({ name, ...options });
          if (!result.success)
            throw ZodValidationError.fromZodError(result.error, "Invalid arguments");
          await exportHandler(result.data);
        } catch (error) {
          handleSubcommandError(error);
        }
      })
  );

  cmd.addHelpText(
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

  return cmd;
}
