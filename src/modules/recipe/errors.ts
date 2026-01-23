import { BaseError } from "../../lib/errors/shared";

/**
 * Error thrown when a recipe is not found
 */
export class RecipeNotFoundError extends BaseError {
  constructor(recipeName: string, availableRecipes?: string[]) {
    const suggestions = availableRecipes?.length
      ? [
          `Available recipes: ${availableRecipes.join(", ")}`,
          "Use 'configurator recipe list' to see all recipes",
        ]
      : ["Use 'configurator recipe list' to see all recipes"];

    super(`Recipe "${recipeName}" not found`, "RECIPE_NOT_FOUND_ERROR", suggestions);
  }
}

/**
 * Error thrown when a recipe fails validation
 */
export class RecipeValidationError extends BaseError {
  constructor(message: string, details?: string[]) {
    const suggestions = details?.length
      ? details
      : ["Check the recipe YAML format matches the expected schema"];

    super(message, "RECIPE_VALIDATION_ERROR", suggestions);
  }
}

/**
 * Error thrown when a recipe file cannot be loaded
 */
export class RecipeLoadError extends BaseError {
  constructor(filePath: string, cause?: string) {
    const message = cause
      ? `Failed to load recipe from "${filePath}": ${cause}`
      : `Failed to load recipe from "${filePath}"`;

    super(message, "RECIPE_LOAD_ERROR", [
      "Ensure the file exists and is readable",
      "Check the YAML syntax is valid",
    ]);
  }
}

/**
 * Error thrown when the recipe manifest cannot be loaded
 */
export class ManifestLoadError extends BaseError {
  constructor(cause?: string) {
    const message = cause
      ? `Failed to load recipe manifest: ${cause}`
      : "Failed to load recipe manifest";

    super(message, "MANIFEST_LOAD_ERROR", [
      "Ensure the package is installed correctly",
      "Try reinstalling @saleor/configurator",
    ]);
  }
}
