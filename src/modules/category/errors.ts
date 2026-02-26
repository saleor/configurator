import { BaseError } from "../../lib/errors/shared";

export class CategoryError extends BaseError {
  constructor(message: string, recoverySuggestions?: string[]) {
    super(message, "CATEGORY_ERROR", recoverySuggestions);
  }
}

export class CategoryFetchError extends BaseError {
  constructor(message: string, _slug?: string) {
    super(message, "CATEGORY_FETCH_ERROR");
  }
}

export class CategoryNotFoundError extends BaseError {
  constructor(categoryName: string) {
    super(`Category "${categoryName}" not found`, "CATEGORY_NOT_FOUND_ERROR");
  }
}

export class CategoryCreationError extends BaseError {
  constructor(message: string, _categoryName?: string) {
    super(message, "CATEGORY_CREATION_ERROR");
  }
}

export class CategoryUpdateError extends BaseError {
  constructor(message: string, _categoryId?: string) {
    super(message, "CATEGORY_UPDATE_ERROR");
  }
}
