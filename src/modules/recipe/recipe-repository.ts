import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseAllDocuments } from "yaml";
import { ZodValidationError } from "../../lib/errors/zod";
import { logger } from "../../lib/logger";
import { checkConfiguration, summarizeUnknownKeys } from "../config/check-configuration";
import type { SaleorConfig } from "../config/schema/schema";
import {
  ManifestLoadError,
  RecipeLoadError,
  RecipeNotFoundError,
  RecipeValidationError,
} from "./errors";
import {
  type Recipe,
  type RecipeManifest,
  type RecipeMetadata,
  recipeManifestSchema,
  recipeMetadataSchema,
} from "./schema";

interface ParsedRecipeYaml {
  metadata: unknown;
  config: unknown;
}

const MANIFEST_FILE = "manifest.json";

/**
 * Finds the bundled recipes directory: the nearest `recipes/` holding a manifest,
 * searching upward from `startDir`. The bundle keeps it next to its chunks in
 * `dist/`; running from source finds `src/recipes`.
 */
export function findRecipesDir(startDir: string): string {
  let dir = path.resolve(startDir);
  while (true) {
    const candidate = path.join(dir, "recipes");
    if (existsSync(path.join(candidate, MANIFEST_FILE))) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new ManifestLoadError(`no recipes/${MANIFEST_FILE} found above ${startDir}`);
    }
    dir = parent;
  }
}

/**
 * Gets the path to the recipes directory in the package.
 */
export function getRecipesDir(): string {
  return findRecipesDir(path.dirname(fileURLToPath(import.meta.url)));
}

/**
 * Parses a multi-document YAML recipe file.
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

function loadRecipeFile(filePath: string): ParsedRecipeYaml {
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

function validateRecipeContent(
  parsed: ParsedRecipeYaml,
  sourceDescription: string
): { metadata: RecipeMetadata; config: SaleorConfig } {
  const metadataResult = recipeMetadataSchema.safeParse(parsed.metadata);
  if (!metadataResult.success) {
    throw new RecipeValidationError(
      `Invalid recipe metadata in "${sourceDescription}"`,
      metadataResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
    );
  }

  const configResult = checkConfiguration(parsed.config);
  if (!configResult.success) {
    throw new RecipeValidationError(
      `Invalid recipe configuration in "${sourceDescription}"`,
      configResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
    );
  }
  for (const warning of summarizeUnknownKeys(configResult.unknownKeys)) {
    logger.warn(`${sourceDescription}: ${warning.message}`);
  }

  return {
    metadata: metadataResult.data,
    config: configResult.data,
  };
}

export function loadManifest(): RecipeManifest {
  const recipesDir = getRecipesDir();
  const manifestPath = path.join(recipesDir, MANIFEST_FILE);

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
  const validated = validateRecipeContent(parsed, entry.file);

  const expectedName = path.basename(entry.file, path.extname(entry.file));
  if (validated.metadata.name !== expectedName) {
    throw new RecipeValidationError(
      `Metadata name "${validated.metadata.name}" does not match filename "${entry.file}"`
    );
  }

  return validated;
}

export function loadRecipeFromFile(filePath: string): Recipe {
  const parsed = loadRecipeFile(filePath);
  return validateRecipeContent(parsed, filePath);
}
