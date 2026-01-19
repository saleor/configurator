import { readFileSync } from "node:fs";
import path from "node:path";
import { ZodValidationError } from "../../lib/errors/zod";
import { configSchema } from "../config/schema/schema";
import { ManifestLoadError, RecipeNotFoundError, RecipeValidationError } from "./errors";
import { getRecipesDir, loadRecipeFile } from "./recipe-loader";
import {
  type Recipe,
  type RecipeManifest,
  recipeManifestSchema,
  recipeMetadataSchema,
} from "./schema";

/**
 * Loads the recipe manifest from the recipes directory.
 * The manifest contains metadata for all available recipes.
 */
export function loadManifest(): RecipeManifest {
  const recipesDir = getRecipesDir();
  const manifestPath = path.join(recipesDir, "manifest.json");

  try {
    const content = readFileSync(manifestPath, "utf-8");
    const json = JSON.parse(content);

    const result = recipeManifestSchema.safeParse(json);
    if (!result.success) {
      throw ZodValidationError.fromZodError(result.error, "Invalid recipe manifest");
    }

    return result.data;
  } catch (error) {
    if (error instanceof ManifestLoadError) {
      throw error;
    }
    if (error instanceof ZodValidationError) {
      throw new ManifestLoadError(error.message);
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new ManifestLoadError(message);
  }
}

/**
 * Loads a full recipe by name from the recipes directory.
 * Validates both metadata and config against their respective schemas.
 */
export function loadRecipe(recipeName: string): Recipe {
  const manifest = loadManifest();

  const entry = manifest.recipes.find((r) => r.name === recipeName);
  if (!entry) {
    const availableRecipes = manifest.recipes.map((r) => r.name);
    throw new RecipeNotFoundError(recipeName, availableRecipes);
  }

  const recipesDir = getRecipesDir();
  const recipePath = path.join(recipesDir, entry.file);

  const parsed = loadRecipeFile(recipePath);

  // Validate metadata
  const metadataResult = recipeMetadataSchema.safeParse(parsed.metadata);
  if (!metadataResult.success) {
    throw new RecipeValidationError(
      `Invalid recipe metadata in "${entry.file}"`,
      metadataResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
    );
  }

  // Validate config against configSchema (FR-006 explicit validation)
  const configResult = configSchema.safeParse(parsed.config);
  if (!configResult.success) {
    throw new RecipeValidationError(
      `Invalid recipe configuration in "${entry.file}"`,
      configResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
    );
  }

  // Verify metadata name matches filename (supports both .yml and .yaml)
  const expectedName = path.basename(entry.file, path.extname(entry.file));
  if (metadataResult.data.name !== expectedName) {
    throw new RecipeValidationError(
      `Metadata name "${metadataResult.data.name}" does not match filename "${entry.file}"`
    );
  }

  return {
    metadata: metadataResult.data,
    config: configResult.data,
  };
}

/**
 * Loads a recipe from a local file path (for custom/exported recipes).
 * Validates both metadata and config against their respective schemas.
 */
export function loadRecipeFromFile(filePath: string): Recipe {
  const parsed = loadRecipeFile(filePath);

  // Validate metadata
  const metadataResult = recipeMetadataSchema.safeParse(parsed.metadata);
  if (!metadataResult.success) {
    throw new RecipeValidationError(
      `Invalid recipe metadata in "${filePath}"`,
      metadataResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
    );
  }

  // Validate config against configSchema (FR-006 explicit validation)
  const configResult = configSchema.safeParse(parsed.config);
  if (!configResult.success) {
    throw new RecipeValidationError(
      `Invalid recipe configuration in "${filePath}"`,
      configResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
    );
  }

  return {
    metadata: metadataResult.data,
    config: configResult.data,
  };
}
