import { BaseError } from "../../lib/errors/shared";

/**
 * Base error class for page type-related errors
 */
export class PageTypeError extends BaseError {}

/**
 * Error thrown when a page type is not found
 */
export class PageTypeNotFoundError extends PageTypeError {
  constructor(pageTypeName: string) {
    super(`Page type "${pageTypeName}" not found`, "PAGE_TYPE_NOT_FOUND_ERROR");
  }
}

/**
 * Error thrown when page type creation fails
 */
export class PageTypeCreationError extends PageTypeError {
  constructor(
    message: string,
    public readonly pageTypeName: string
  ) {
    super(message, "PAGE_TYPE_CREATION_ERROR");
  }
}

/**
 * Error thrown when page type update fails
 */
export class PageTypeUpdateError extends PageTypeError {
  constructor(
    message: string,
    public readonly pageTypeId: string
  ) {
    super(message, "PAGE_TYPE_UPDATE_ERROR");
  }
}
