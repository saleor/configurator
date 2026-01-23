import * as fs from "node:fs";
import * as path from "node:path";
import chalk from "chalk";
import { stringify } from "yaml";
import { logger } from "../../lib/logger";
import type { SaleorConfig } from "../config/schema/schema";
import { RecipeLoadError } from "./errors";
import { loadManifest, loadRecipe, loadRecipeFromFile } from "./recipe-repository";
import type { EntitySummary, Recipe, RecipeCategory, RecipeManifestEntry } from "./schema";

export interface ListRecipesOptions {
  category?: RecipeCategory;
}

export function listRecipes(options: ListRecipesOptions = {}): RecipeManifestEntry[] {
  logger.debug("Listing recipes", { category: options.category });
  const manifest = loadManifest();
  return options.category
    ? manifest.recipes.filter((r) => r.category === options.category)
    : manifest.recipes;
}

function formatEntitySummary(entitySummary: EntitySummary): string {
  const parts = Object.entries(entitySummary)
    .filter(([, value]) => value !== undefined && value > 0)
    .map(([key, value]) => `${value} ${key}`);
  return parts.length > 0 ? parts.join(", ") : "No entities";
}

export function formatRecipeList(recipes: RecipeManifestEntry[]): string {
  if (recipes.length === 0) return "No recipes found.";

  const groups = new Map<RecipeCategory, RecipeManifestEntry[]>();
  for (const recipe of recipes) {
    const existing = groups.get(recipe.category);
    if (existing) existing.push(recipe);
    else groups.set(recipe.category, [recipe]);
  }

  const categoryOrder: RecipeCategory[] = [
    "multi-region",
    "digital",
    "fulfillment",
    "shipping",
    "general",
  ];

  const lines = [chalk.bold("Available Recipes"), ""];
  for (const category of categoryOrder) {
    const categoryRecipes = groups.get(category);
    if (!categoryRecipes?.length) continue;

    lines.push(chalk.cyan(category.toUpperCase()));
    for (const recipe of categoryRecipes) {
      lines.push(
        `  ${chalk.green(recipe.name.padEnd(20))} ${recipe.description}`,
        chalk.gray(`                      Entities: ${formatEntitySummary(recipe.entitySummary)}`),
        chalk.gray(`                      Saleor: ${recipe.saleorVersion}`)
      );
    }
    lines.push("");
  }

  lines.push(chalk.dim("Use 'configurator recipe show <name>' to preview a recipe"));
  return lines.join("\n");
}

export function formatRecipeListJson(recipes: RecipeManifestEntry[]): string {
  return JSON.stringify({ recipes, total: recipes.length }, null, 2);
}

export function resolveRecipeSource(nameOrPath: string): {
  type: "builtin" | "file";
  value: string;
} {
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

export function loadRecipeConfig(nameOrPath: string): Recipe {
  const source = resolveRecipeSource(nameOrPath);
  logger.debug("Loading recipe config", source);
  return source.type === "file" ? loadRecipeFromFile(source.value) : loadRecipe(source.value);
}

export function formatRecipeDetails(recipe: Recipe): string {
  const { metadata } = recipe;

  const lines: string[] = [
    chalk.bold(`Recipe: ${metadata.name}`),
    "",
    chalk.cyan("Description"),
    `  ${metadata.description}`,
    "",
    `${chalk.dim("Category:")} ${metadata.category}`,
    `${chalk.dim("Saleor Version:")} ${metadata.saleorVersion}`,
    `${chalk.dim("Documentation:")} ${metadata.docsUrl}`,
    "",
    chalk.cyan("Use Case"),
    `  ${metadata.useCase.trim()}`,
    "",
  ];

  if (metadata.prerequisites.length > 0) {
    lines.push(chalk.cyan("Prerequisites"), ...metadata.prerequisites.map((p) => `  - ${p}`), "");
  }

  const entityEntries = Object.entries(metadata.entitySummary)
    .filter(([, v]) => v !== undefined && v > 0)
    .map(([k, v]) => `  - ${v} ${k}`);
  if (entityEntries.length > 0) {
    lines.push(chalk.cyan("Entities Included"), ...entityEntries, "");
  }

  if (metadata.customizationHints.length > 0) {
    lines.push(
      chalk.cyan("Customization Hints"),
      ...metadata.customizationHints.map((h) => `  - ${h}`),
      ""
    );
  }

  lines.push(
    chalk.cyan("Configuration Preview"),
    chalk.dim("─".repeat(60)),
    formatConfigPreview(recipe.config),
    chalk.dim("─".repeat(60)),
    ""
  );

  if (metadata.examples) {
    const formatBlock = (text: string) =>
      chalk.gray(
        text
          .trim()
          .split("\n")
          .map((l) => `  ${l}`)
          .join("\n")
      );
    lines.push(
      chalk.cyan("Example: Before"),
      formatBlock(metadata.examples.before),
      "",
      chalk.cyan("Example: After"),
      formatBlock(metadata.examples.after),
      ""
    );
  }

  lines.push(
    chalk.dim(`Use 'configurator recipe apply ${metadata.name}' to deploy this recipe`),
    chalk.dim(`Use 'configurator recipe export ${metadata.name}' to customize locally`)
  );

  return lines.join("\n");
}

export function formatConfigPreview(config: SaleorConfig): string {
  if (Object.keys(config).length === 0) return chalk.gray("# Empty configuration");

  const yamlContent = stringify(config, { lineWidth: 80, singleQuote: true });

  return yamlContent
    .split("\n")
    .map((line) => {
      if (line.includes(":") && !line.trim().startsWith("-")) {
        const colonIndex = line.indexOf(":");
        return (
          chalk.cyan(line.substring(0, colonIndex)) +
          chalk.dim(":") +
          chalk.white(line.substring(colonIndex + 1))
        );
      }
      if (line.trim().startsWith("-")) return chalk.yellow(line);
      return line;
    })
    .join("\n");
}

export function formatRecipeDetailsJson(recipe: Recipe): string {
  return JSON.stringify(recipe, null, 2);
}

export function determineOutputPath(recipeName: string, specifiedPath?: string): string {
  if (specifiedPath) {
    if (fs.existsSync(specifiedPath) && fs.statSync(specifiedPath).isDirectory()) {
      return path.join(specifiedPath, `${recipeName}.yml`);
    }
    return specifiedPath;
  }
  return `${recipeName}.yml`;
}

export function exportRecipe(
  nameOrPath: string,
  outputPath?: string
): { path: string; recipe: Recipe } {
  logger.debug("Exporting recipe", { nameOrPath, outputPath });

  const recipe = loadRecipeConfig(nameOrPath);
  const finalPath = determineOutputPath(recipe.metadata.name, outputPath);

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
