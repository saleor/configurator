import { BaseError } from "../../lib/errors/shared";

/**
 * Base error class for shop-related errors
 */
class ShopError extends BaseError {}

/**
 * Error thrown when shop settings update fails
 */
export class ShopSettingsUpdateError extends ShopError {
  constructor(message: string) {
    super(message, "SHOP_SETTINGS_UPDATE_ERROR");
  }
}
