import { BaseError } from "../../lib/errors/shared";

class ShippingZoneError extends BaseError {
  constructor(message: string, details?: string[]) {
    super(message, "SHIPPING_ZONE_ERROR", details);
  }
}

export class ShippingZoneValidationError extends ShippingZoneError {
  constructor(message: string, field?: string) {
    super(
      `Shipping zone validation failed: ${message}`,
      field ? [`Check the '${field}' field in your configuration`] : undefined
    );
  }
}

export class ShippingZoneOperationError extends ShippingZoneError {
  constructor(operation: string, zoneName: string, reason: string) {
    super(`Failed to ${operation} shipping zone '${zoneName}': ${reason}`, [
      `Review your permissions for ${operation} operations`,
      `Verify the shipping zone '${zoneName}' configuration`,
    ]);
  }
}

class ShippingMethodError extends ShippingZoneError {}

export class ShippingMethodValidationError extends ShippingMethodError {
  constructor(message: string, field?: string) {
    super(
      `Shipping method validation failed: ${message}`,
      field ? [`Check the '${field}' field in your shipping method configuration`] : undefined
    );
  }
}
