import { BaseError } from "../../lib/errors/shared";

/**
 * Base error class for product type-related errors
 */
export class ProductTypeError extends BaseError {}

/**
 * Error thrown when a product type is not found
 */
export class ProductTypeNotFoundError extends ProductTypeError {
  constructor(productTypeName: string) {
    super(`Product type "${productTypeName}" not found`, "PRODUCT_TYPE_NOT_FOUND_ERROR");
  }
}

/**
 * Error thrown when product type creation fails
 */
export class ProductTypeCreationError extends ProductTypeError {
  constructor(
    message: string,
    public readonly productTypeName?: string
  ) {
    super(message, "PRODUCT_TYPE_CREATION_ERROR");
  }
}

/**
 * Error thrown when product type update fails
 */
export class ProductTypeUpdateError extends ProductTypeError {
  constructor(
    message: string,
    public readonly productTypeId?: string
  ) {
    super(message, "PRODUCT_TYPE_UPDATE_ERROR");
  }
}

/**
 * Error thrown when attribute assignment fails
 */
export class ProductTypeAttributeError extends ProductTypeError {
  constructor(
    message: string,
    public readonly productTypeId: string
  ) {
    super(message, "PRODUCT_TYPE_ATTRIBUTE_ERROR");
  }
}

/**
 * Error thrown when product type attribute validation fails
 */
export class ProductTypeAttributeValidationError extends ProductTypeError {
  constructor(
    message: string,
    public readonly productTypeName: string,
    public readonly attributeName: string
  ) {
    super(message, "PRODUCT_TYPE_ATTRIBUTE_VALIDATION_ERROR");
  }
}
