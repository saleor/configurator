import { BaseError } from "../../lib/errors/shared";

/**
 * Base error class for product-related errors
 */
export class ProductError extends BaseError {}

/**
 * Error thrown when a product is not found
 */
export class ProductNotFoundError extends ProductError {
  constructor(productName: string) {
    super(`Product "${productName}" not found`, "PRODUCT_NOT_FOUND_ERROR");
  }
}

/**
 * Error thrown when product creation fails
 */
export class ProductCreationError extends ProductError {
  constructor(message: string, public readonly productName: string) {
    super(message, "PRODUCT_CREATION_ERROR");
  }
}

/**
 * Error thrown when product update fails
 */
export class ProductUpdateError extends ProductError {
  constructor(message: string, public readonly productId: string) {
    super(message, "PRODUCT_UPDATE_ERROR");
  }
}

/**
 * Error thrown when product variant operation fails
 */
export class ProductVariantError extends ProductError {
  constructor(message: string, public readonly variantSku?: string) {
    super(message, "PRODUCT_VARIANT_ERROR");
  }
}