import { BaseError } from "../../lib/errors/shared";

export class ShippingZoneError extends BaseError {
  constructor(message: string, recoverySuggestions?: string[]) {
    super(message, "SHIPPING_ZONE_ERROR", recoverySuggestions);
  }
}

export class ShippingZoneNotFoundError extends ShippingZoneError {
  constructor(identifier: string) {
    super(`Shipping zone not found: ${identifier}`);
  }
}

export class ShippingZoneValidationError extends ShippingZoneError {
  constructor(message: string, field?: string) {
    super(`Shipping zone validation failed: ${message}${field ? ` (field: ${field})` : ""}`);
  }
}

export class ShippingZoneOperationError extends ShippingZoneError {
  constructor(operation: string, zoneName: string, reason: string) {
    super(`Failed to ${operation} shipping zone '${zoneName}': ${reason}`);
  }
}

export class ShippingMethodError extends ShippingZoneError {}

export class ShippingMethodValidationError extends ShippingMethodError {
  constructor(message: string, field?: string) {
    super(`Shipping method validation failed: ${message}${field ? ` (field: ${field})` : ""}`);
  }
}
