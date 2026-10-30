import { BaseError } from "../../lib/errors/shared";

/**
 * Base error class for product-related errors
 */
export class ProductError extends BaseError {
  constructor(message: string, entityIdentifierOrCode?: string, recoverySuggestions?: string[]) {
    // Support both patterns: (message, entityIdentifier) and (message, code, recoverySuggestions)
    if (recoverySuggestions !== undefined) {
      // Full BaseError pattern: (message, code, recoverySuggestions)
      super(message, entityIdentifierOrCode || "PRODUCT_ERROR", recoverySuggestions);
    } else {
      // ServiceErrorWrapper pattern: (message, entityIdentifier)
      super(message, "PRODUCT_ERROR");
    }
  }
}
