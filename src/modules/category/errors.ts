import { BaseError } from "../../lib/errors/shared";

export class CategoryError extends BaseError {
  constructor(message: string, recoverySuggestions?: string[]) {
    super(message, "CATEGORY_ERROR", recoverySuggestions);
  }
}

export class CategoryFetchError extends BaseError {
  constructor(message: string) {
    super(message, "CATEGORY_FETCH_ERROR");
  }
}

export class CategoryCreationError extends BaseError {
  constructor(message: string) {
    super(message, "CATEGORY_CREATION_ERROR");
  }
}
