import { BaseError } from "../../lib/errors/shared";

/**
 * Base error class for page type-related errors
 */
class PageTypeError extends BaseError {}

/**
 * Error thrown when page type attribute operations fail
 */
export class PageTypeAttributeError extends PageTypeError {
  constructor(
    message: string,
    public readonly pageTypeName: string,
    public readonly operation: string
  ) {
    super(message, "PAGE_TYPE_ATTRIBUTE_ERROR");
  }
}

/**
 * Error thrown when page type attribute validation fails
 */
export class PageTypeAttributeValidationError extends PageTypeError {
  constructor(
    message: string,
    public readonly pageTypeName: string,
    public readonly attributeName: string
  ) {
    super(message, "PAGE_TYPE_ATTRIBUTE_VALIDATION_ERROR");
  }
}
