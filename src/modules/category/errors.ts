import { BaseError } from "../../lib/errors/shared";

/**
 * Base error class for category-related errors
 */
export class CategoryError extends BaseError {
  constructor(message: string, recoverySuggestions?: string[]) {
    super(message, "CATEGORY_ERROR", recoverySuggestions);
  }
}

/**
 * Error thrown when a category is not found
 */
export class CategoryNotFoundError extends BaseError {
  constructor(categoryName: string) {
    super(`Category "${categoryName}" not found`, "CATEGORY_NOT_FOUND_ERROR");
  }
}

/**
 * Error thrown when category creation fails
 */
export class CategoryCreationError extends BaseError {
  constructor(message: string, _categoryName?: string) {
    super(message, "CATEGORY_CREATION_ERROR");
  }
}

/**
 * Error thrown when category update fails
 */
export class CategoryUpdateError extends BaseError {
  constructor(message: string, _categoryId?: string) {
    super(message, "CATEGORY_UPDATE_ERROR");
  }
}
