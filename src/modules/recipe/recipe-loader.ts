import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseAllDocuments } from "yaml";
import { RecipeLoadError } from "./errors";

/**
 * Gets the path to the recipes directory in the package.
 * In ESM, we navigate from the current module to find the recipes directory.
 */
export function getRecipesDir(): string {
  // import.meta.url gives us the current module's URL
  // Navigate up from dist/modules/recipe/ to dist/recipes/
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const distDir = path.resolve(moduleDir, "..", "..");
  return path.join(distDir, "recipes");
}

/**
 * Result of parsing a multi-document YAML recipe file
 */
export interface ParsedRecipeYaml {
  /** First document: recipe metadata */
  metadata: unknown;
  /** Second document: configuration content */
  config: unknown;
}

/**
 * Parses a multi-document YAML recipe file.
 * Recipe files contain two YAML documents separated by `---`:
 * 1. Metadata document
 * 2. Configuration document (same format as config.yml)
 */
export function parseRecipeYaml(content: string, filePath: string): ParsedRecipeYaml {
  const documents = parseAllDocuments(content);

  if (documents.length !== 2) {
    throw new RecipeLoadError(
      filePath,
      `Expected 2 YAML documents (metadata and config), found ${documents.length}`
    );
  }

  const [metadataDoc, configDoc] = documents;

  // Check for YAML parsing errors
  if (metadataDoc.errors.length > 0) {
    throw new RecipeLoadError(
      filePath,
      `Invalid metadata YAML: ${metadataDoc.errors.map((e) => e.message).join(", ")}`
    );
  }

  if (configDoc.errors.length > 0) {
    throw new RecipeLoadError(
      filePath,
      `Invalid config YAML: ${configDoc.errors.map((e) => e.message).join(", ")}`
    );
  }

  return {
    metadata: metadataDoc.toJSON(),
    config: configDoc.toJSON(),
  };
}

/**
 * Loads and parses a recipe YAML file from the given path.
 */
export function loadRecipeFile(filePath: string): ParsedRecipeYaml {
  try {
    const content = readFileSync(filePath, "utf-8");
    return parseRecipeYaml(content, filePath);
  } catch (error) {
    if (error instanceof RecipeLoadError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new RecipeLoadError(filePath, message);
  }
}
