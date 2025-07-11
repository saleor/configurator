import { BaseError } from "../../lib/errors/shared";

/**
 * Base error class for shop-related errors
 */
export class ShopError extends BaseError {}

/**
 * Error thrown when shop settings update fails
 */
export class ShopSettingsUpdateError extends ShopError {
  constructor(message: string) {
    super(message, "SHOP_SETTINGS_UPDATE_ERROR");
  }
}

/**
 * Error thrown when shop configuration is invalid
 */
export class ShopConfigurationError extends ShopError {
  constructor(message: string) {
    super(message, "SHOP_CONFIGURATION_ERROR");
  }
}
