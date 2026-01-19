import * as fs from "node:fs";
import * as path from "node:path";
import chalk from "chalk";
import { stringify } from "yaml";
import { logger } from "../../lib/logger";
import type { SaleorConfig } from "../config/schema/schema";
import { RecipeLoadError } from "./errors";
import { loadManifest, loadRecipe, loadRecipeFromFile } from "./recipe-repository";
import type { EntitySummary, Recipe, RecipeCategory, RecipeManifestEntry } from "./schema";

/**
 * Options for listing recipes
 */
export interface ListRecipesOptions {
  category?: RecipeCategory;
}

/**
 * Lists available recipes with optional category filtering
 */
export function listRecipes(options: ListRecipesOptions = {}): RecipeManifestEntry[] {
  logger.debug("Listing recipes", { category: options.category });

  const manifest = loadManifest();
  const recipes = options.category
    ? manifest.recipes.filter((recipe) => recipe.category === options.category)
    : manifest.recipes;

  logger.debug("Listed recipes", { count: recipes.length });
  return recipes;
}

/**
 * Formats entity summary for display
 */
function formatEntitySummary(entitySummary: EntitySummary): string {
  const parts = Object.entries(entitySummary)
    .filter(([, value]) => value !== undefined && value > 0)
    .map(([key, value]) => `${value} ${key}`);

  return parts.length > 0 ? parts.join(", ") : "No entities";
}

/**
 * Groups recipes by category for display
 */
function groupByCategory(
  recipes: RecipeManifestEntry[]
): Map<RecipeCategory, RecipeManifestEntry[]> {
  const groups = new Map<RecipeCategory, RecipeManifestEntry[]>();
  for (const recipe of recipes) {
    const existing = groups.get(recipe.category);
    if (existing) {
      existing.push(recipe);
    } else {
      groups.set(recipe.category, [recipe]);
    }
  }
  return groups;
}

/**
 * Formats a single recipe entry for list display
 */
function formatRecipeEntry(recipe: RecipeManifestEntry): string[] {
  const entityInfo = formatEntitySummary(recipe.entitySummary);
  return [
    `  ${chalk.green(recipe.name.padEnd(20))} ${recipe.description}`,
    chalk.gray(`                      Entities: ${entityInfo}`),
    chalk.gray(`                      Saleor: ${recipe.saleorVersion}`),
  ];
}

/**
 * Formats a category section with its recipes
 */
function formatCategorySection(
  category: RecipeCategory,
  recipes: RecipeManifestEntry[] | undefined
): string[] {
  if (!recipes || recipes.length === 0) return [];
  return [chalk.cyan(category.toUpperCase()), ...recipes.flatMap(formatRecipeEntry), ""];
}

/**
 * Formats the recipe list for human-readable output
 */
export function formatRecipeList(recipes: RecipeManifestEntry[]): string {
  if (recipes.length === 0) {
    return "No recipes found.";
  }

  const groupedRecipes = groupByCategory(recipes);
  const categoryOrder: RecipeCategory[] = [
    "multi-region",
    "digital",
    "fulfillment",
    "shipping",
    "general",
  ];

  const lines = [
    chalk.bold("Available Recipes"),
    "",
    ...categoryOrder.flatMap((category) =>
      formatCategorySection(category, groupedRecipes.get(category))
    ),
    chalk.dim("Use 'configurator recipe show <name>' to preview a recipe"),
  ];

  return lines.join("\n");
}

/**
 * Formats recipe list as JSON for automation
 */
export function formatRecipeListJson(recipes: RecipeManifestEntry[]): string {
  return JSON.stringify(
    {
      recipes,
      total: recipes.length,
    },
    null,
    2
  );
}

/**
 * Gets a recipe by name
 */
export function getRecipe(name: string): Recipe {
  logger.debug("Getting recipe", { name });
  const recipe = loadRecipe(name);
  logger.debug("Got recipe", { name: recipe.metadata.name });
  return recipe;
}

/**
 * Resolves recipe source - returns whether it's a built-in name or file path
 */
export function resolveRecipeSource(nameOrPath: string): {
  type: "builtin" | "file";
  value: string;
} {
  // If it looks like a file path (contains / or \ or ends with .yml/.yaml)
  if (
    nameOrPath.includes("/") ||
    nameOrPath.includes("\\") ||
    nameOrPath.endsWith(".yml") ||
    nameOrPath.endsWith(".yaml")
  ) {
    return { type: "file", value: nameOrPath };
  }

  return { type: "builtin", value: nameOrPath };
}

/**
 * Loads recipe config based on source type
 */
export function loadRecipeConfig(nameOrPath: string): Recipe {
  const source = resolveRecipeSource(nameOrPath);
  logger.debug("Loading recipe config", { source: source.type, value: source.value });

  const recipe =
    source.type === "file" ? loadRecipeFromFile(source.value) : loadRecipe(source.value);

  logger.debug("Loaded recipe config", { name: recipe.metadata.name });
  return recipe;
}

/**
 * Formats recipe header section
 */
function formatRecipeHeader(metadata: Recipe["metadata"]): string[] {
  return [
    chalk.bold(`Recipe: ${metadata.name}`),
    "",
    chalk.cyan("Description"),
    `  ${metadata.description}`,
    "",
  ];
}

/**
 * Formats recipe metadata section
 */
function formatRecipeMetadata(metadata: Recipe["metadata"]): string[] {
  return [
    `${chalk.dim("Category:")} ${metadata.category}`,
    `${chalk.dim("Version:")} ${metadata.version}`,
    `${chalk.dim("Saleor Version:")} ${metadata.saleorVersion}`,
    `${chalk.dim("Documentation:")} ${metadata.docsUrl}`,
    "",
    chalk.cyan("Use Case"),
    `  ${metadata.useCase.trim()}`,
    "",
  ];
}

/**
 * Formats prerequisites section
 */
function formatPrerequisites(prerequisites: string[]): string[] {
  if (prerequisites.length === 0) return [];
  return [chalk.cyan("Prerequisites"), ...prerequisites.map((prereq) => `  - ${prereq}`), ""];
}

/**
 * Formats entities section
 */
function formatEntitiesSection(entitySummary: EntitySummary): string[] {
  const entries = Object.entries(entitySummary)
    .filter(([, value]) => value !== undefined && value > 0)
    .map(([key, value]) => `  - ${value} ${key}`);

  if (entries.length === 0) return [];
  return [chalk.cyan("Entities Included"), ...entries, ""];
}

/**
 * Formats customization hints section
 */
function formatHintsSection(hints: string[]): string[] {
  if (hints.length === 0) return [];
  return [chalk.cyan("Customization Hints"), ...hints.map((hint) => `  - ${hint}`), ""];
}

/**
 * Formats examples section
 */
function formatExamplesSection(examples: { before: string; after: string } | undefined): string[] {
  if (!examples) return [];
  const formatBlock = (text: string) =>
    chalk.gray(
      text
        .trim()
        .split("\n")
        .map((l) => `  ${l}`)
        .join("\n")
    );
  return [
    chalk.cyan("Example: Before"),
    formatBlock(examples.before),
    "",
    chalk.cyan("Example: After"),
    formatBlock(examples.after),
    "",
  ];
}

/**
 * Formats recipe details for human-readable output
 */
export function formatRecipeDetails(recipe: Recipe): string {
  const { metadata } = recipe;

  const lines: string[] = [
    ...formatRecipeHeader(metadata),
    ...formatRecipeMetadata(metadata),
    ...formatPrerequisites(metadata.prerequisites),
    ...formatEntitiesSection(metadata.entitySummary),
    ...formatHintsSection(metadata.customizationHints),
    chalk.cyan("Configuration Preview"),
    chalk.dim("─".repeat(60)),
    formatConfigPreview(recipe.config),
    chalk.dim("─".repeat(60)),
    "",
    ...formatExamplesSection(metadata.examples),
    chalk.dim(`Use 'configurator recipe apply ${metadata.name}' to deploy this recipe`),
    chalk.dim(`Use 'configurator recipe export ${metadata.name}' to customize locally`),
  ];

  return lines.join("\n");
}

/**
 * Formats configuration as YAML preview with syntax highlighting
 */
export function formatConfigPreview(config: SaleorConfig): string {
  if (Object.keys(config).length === 0) {
    return chalk.gray("# Empty configuration");
  }

  const yamlContent = stringify(config, {
    lineWidth: 80,
    singleQuote: true,
  });

  // Apply simple syntax highlighting to YAML
  return yamlContent
    .split("\n")
    .map((line) => {
      // Highlight keys (text before colon)
      if (line.includes(":") && !line.trim().startsWith("-")) {
        const colonIndex = line.indexOf(":");
        const key = line.substring(0, colonIndex);
        const value = line.substring(colonIndex);
        return chalk.cyan(key) + chalk.dim(":") + chalk.white(value.substring(1));
      }
      // Highlight list items
      if (line.trim().startsWith("-")) {
        return chalk.yellow(line);
      }
      return line;
    })
    .join("\n");
}

/**
 * Formats recipe details as JSON for automation
 */
export function formatRecipeDetailsJson(recipe: Recipe): string {
  return JSON.stringify(recipe, null, 2);
}

/**
 * Determines the output path for recipe export
 */
export function determineOutputPath(recipeName: string, specifiedPath?: string): string {
  if (specifiedPath) {
    // If it's a directory, append the recipe filename
    if (fs.existsSync(specifiedPath) && fs.statSync(specifiedPath).isDirectory()) {
      return path.join(specifiedPath, `${recipeName}.yml`);
    }
    return specifiedPath;
  }

  // Default: use recipe name in current directory
  return `${recipeName}.yml`;
}

/**
 * Exports a recipe to a local file for customization
 */
export function exportRecipe(
  nameOrPath: string,
  outputPath?: string
): { path: string; recipe: Recipe } {
  logger.debug("Exporting recipe", { nameOrPath, outputPath });

  const recipe = loadRecipeConfig(nameOrPath);
  const finalPath = determineOutputPath(recipe.metadata.name, outputPath);

  // Format as multi-document YAML (metadata + config)
  const metadataYaml = stringify(recipe.metadata, { lineWidth: 120 });
  const configYaml = stringify(recipe.config, { lineWidth: 120 });

  const content = `---\n${metadataYaml}---\n${configYaml}`;

  try {
    fs.writeFileSync(finalPath, content, "utf-8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new RecipeLoadError(finalPath, `Failed to write recipe file: ${message}`);
  }

  logger.debug("Exported recipe", { name: recipe.metadata.name, path: finalPath });
  return { path: finalPath, recipe };
}

/**
 * Parses a version string into major.minor format
 */
function parseVersion(version: string): string | null {
  const match = version.match(/^(\d+\.\d+)/);
  return match ? match[1] : null;
}

/**
 * Compares two version strings (major.minor format)
 * @returns negative if a < b, 0 if equal, positive if a > b
 */
function compareVersions(a: string, b: string): number {
  const [aMajor, aMinor] = a.split(".").map(Number);
  const [bMajor, bMinor] = b.split(".").map(Number);
  return aMajor !== bMajor ? aMajor - bMajor : aMinor - bMinor;
}

/**
 * Checks if comparison satisfies the operator
 */
function satisfiesOperator(cmp: number, operator: string): boolean {
  const checks: Record<string, (n: number) => boolean> = {
    ">=": (n) => n >= 0,
    ">": (n) => n > 0,
    "<=": (n) => n <= 0,
    "<": (n) => n < 0,
    "=": (n) => n === 0,
  };

  const check = checks[operator];
  if (!check) {
    logger.warn("Unknown version operator, treating as compatible", { operator });
    return true;
  }

  return check(cmp);
}

/**
 * Validates Saleor version compatibility
 * @returns true if compatible, false otherwise with reason
 */
export function validateSaleorVersion(
  recipeVersion: string,
  instanceVersion: string
): { compatible: boolean; reason?: string } {
  const match = recipeVersion.match(/^(>=?|<=?|=)?(\d+\.\d+)/);
  if (!match) {
    logger.debug("Could not parse recipe version constraint, treating as compatible", {
      recipeVersion,
    });
    return { compatible: true };
  }

  const operator = match[1] || ">=";
  const requiredVersion = match[2];
  const instanceMajorMinor = parseVersion(instanceVersion);

  if (!instanceMajorMinor) {
    logger.debug("Could not parse instance version, treating as compatible", {
      instanceVersion,
    });
    return { compatible: true };
  }

  const cmp = compareVersions(instanceMajorMinor, requiredVersion);

  if (!satisfiesOperator(cmp, operator)) {
    const exactWord = operator === "=" ? "exactly " : "";
    return {
      compatible: false,
      reason: `Recipe requires ${exactWord}Saleor ${recipeVersion}, but instance is ${instanceVersion}`,
    };
  }

  return { compatible: true };
}
