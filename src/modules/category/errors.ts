import { BaseError } from "../../lib/errors/shared";

/**
 * Base error class for category-related errors
 */
export class CategoryError extends BaseError {
  constructor(message: string, entityIdentifier?: string);
  constructor(message: string, code?: string, recoverySuggestions?: string[]);
  constructor(message: string, codeOrEntityIdentifier?: string, recoverySuggestions?: string[]) {
    if (recoverySuggestions) {
      // Old signature: (message, code, recoverySuggestions)
      super(message, codeOrEntityIdentifier || "CATEGORY_ERROR", recoverySuggestions);
    } else {
      // New signature: (message, entityIdentifier?)
      super(message, "CATEGORY_ERROR");
    }
  }
}

/**
 * Error thrown when a category is not found
 */
export class CategoryNotFoundError extends CategoryError {
  constructor(categoryName: string) {
    super(`Category "${categoryName}" not found`, "CATEGORY_NOT_FOUND_ERROR");
  }
}

/**
 * Error thrown when category creation fails
 */
export class CategoryCreationError extends BaseError {
  constructor(message: string, _entityIdentifier?: string) {
    super(message, "CATEGORY_CREATION_ERROR");
  }
}

/**
 * Error thrown when category update fails
 */
export class CategoryUpdateError extends CategoryError {
  constructor(
    message: string,
    public readonly categoryId: string
  ) {
    super(message, "CATEGORY_UPDATE_ERROR");
  }
}
