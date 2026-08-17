import { BaseError } from "../../lib/errors/shared";

export class CustomerTypeError extends BaseError {
  constructor(message: string, recoverySuggestions?: string[]) {
    super(message, "CUSTOMER_TYPE_ERROR", recoverySuggestions);
  }
}

export class CustomerTypeValidationError extends CustomerTypeError {
  constructor(message: string) {
    super(`Customer type validation failed: ${message}`);
  }
}

export class CustomerTypeOperationError extends CustomerTypeError {
  constructor(operation: string, customerTypeName: string, reason: string) {
    super(`Failed to ${operation} customer type '${customerTypeName}': ${reason}`);
  }
}
